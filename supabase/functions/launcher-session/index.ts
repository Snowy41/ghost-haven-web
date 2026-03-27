import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-session-token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { action, config_id } = await req.json().catch(() => ({ action: undefined, config_id: undefined }));

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ─── ACTION: create ──────────────────────────────────────────────
    // Called by the launcher/injector (authenticated user).
    // Returns a session token that can be handed to the DLL.
    if (action === "create") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return json({ error: "Unauthorized" }, 401);
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) return json({ error: "Invalid session" }, 401);

      // Check banned
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("banned_at")
        .eq("user_id", user.id)
        .single();

      if (profile?.banned_at) {
        return json({ error: "Account banned" }, 403);
      }

      // Revoke any existing session tokens for this user
      await supabaseAdmin
        .from("session_tokens")
        .update({ revoked: true })
        .eq("user_id", user.id)
        .eq("revoked", false);

      // Create new token (24h expiry)
      const token = crypto.randomUUID();
      const { error: insertError } = await supabaseAdmin
        .from("session_tokens")
        .insert({
          user_id: user.id,
          token,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });

      if (insertError) {
        return json({ error: "Failed to create session" }, 500);
      }

      return json({ token, expires_in: 86400 });
    }

    // ── Helper: validate session token ───────────────────────────────
    const validateSessionToken = async () => {
      const sessionToken = req.headers.get("X-Session-Token");
      if (!sessionToken) return { error: "Missing session token", status: 401 };

      const { data: tokenRow, error: tokenError } = await supabaseAdmin
        .from("session_tokens")
        .select("user_id, expires_at, revoked")
        .eq("token", sessionToken)
        .single();

      if (tokenError || !tokenRow) return { error: "Invalid session token", status: 401 };
      if (tokenRow.revoked) return { error: "Session token revoked", status: 401 };
      if (new Date(tokenRow.expires_at) < new Date()) return { error: "Session token expired", status: 401 };

      return { userId: tokenRow.user_id, token: sessionToken };
    };

    // ─── ACTION: connect ─────────────────────────────────────────────
    // Called by the DLL with X-Session-Token header.
    // Returns full user profile data (same shape as launcher-profile).
    // Does NOT expose internal fields like file_path.
    if (action === "connect") {
      const validation = await validateSessionToken();
      if ("error" in validation) return json({ error: validation.error }, validation.status);
      const { userId, token: sessionToken } = validation;

      // Fetch profile
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select(
          "user_id, username, avatar_url, description, hades_coins, created_at, banned_at"
        )
        .eq("user_id", userId)
        .single();

      if (!profile) return json({ error: "Profile not found" }, 404);
      if (profile.banned_at) {
        await supabaseAdmin
          .from("session_tokens")
          .update({ revoked: true })
          .eq("token", sessionToken);
        return json({ error: "Account banned", banned_at: profile.banned_at }, 403);
      }

      // Fetch roles, subscription, configs, badges in parallel
      const [rolesRes, subRes, purchasesRes, ownConfigsRes, badgesRes] =
        await Promise.all([
          supabaseAdmin.from("user_roles").select("role, created_at").eq("user_id", userId),
          supabaseAdmin
            .from("subscriptions")
            .select("status, current_period_end")
            .eq("user_id", userId)
            .eq("status", "active")
            .maybeSingle(),
          supabaseAdmin
            .from("config_purchases")
            .select("config_id")
            .eq("user_id", userId),
          supabaseAdmin
            .from("configs")
            .select("id, name, description, category, is_official, downloads, rating")
            .eq("user_id", userId),
          supabaseAdmin
            .from("user_badges")
            .select("badge_name, badge_icon, badge_color")
            .eq("user_id", userId),
        ]);

      const roles = (rolesRes.data || []).map((r: any) => r.role);
      const isStaff = roles.includes("owner") || roles.includes("admin");
      const isBeta = roles.includes("beta");

      let subscription: any;
      if (isStaff) {
        subscription = { active: true, unlimited: true };
      } else if (isBeta) {
        const betaRole = (rolesRes.data || []).find((r: any) => r.role === "beta");
        const { data: betaSetting } = await supabaseAdmin
          .from("site_settings").select("value").eq("key", "beta_duration_days").single();
        const betaDays = (betaSetting?.value as any)?.days ?? 30;
        const assignedAt = new Date(betaRole?.created_at || Date.now()).getTime();
        const expiresAt = new Date(assignedAt + betaDays * 24 * 60 * 60 * 1000);
        const isActive = expiresAt > new Date();
        subscription = { active: isActive, beta: true, expires: expiresAt.toISOString() };
      } else if (subRes.data) {
        subscription = { active: true, expires: subRes.data.current_period_end };
      } else {
        subscription = { active: false };
      }

      // Merge own + purchased configs (without file_path)
      const purchasedIds = (purchasesRes.data || []).map(
        (p: any) => p.config_id
      );
      const ownConfigs = ownConfigsRes.data || [];

      let purchasedConfigs: any[] = [];
      if (purchasedIds.length > 0) {
        const { data } = await supabaseAdmin
          .from("configs")
          .select("id, name, description, category, is_official, downloads, rating")
          .in("id", purchasedIds);
        purchasedConfigs = data || [];
      }

      const allConfigs = new Map();
      for (const c of [...ownConfigs, ...purchasedConfigs]) {
        allConfigs.set(c.id, c);
      }

      return json({
        profile: {
          user_id: profile.user_id,
          username: profile.username,
          avatar_url: profile.avatar_url,
          description: profile.description,
          hades_coins: profile.hades_coins,
          created_at: profile.created_at,
        },
        roles,
        subscription,
        configs: Array.from(allConfigs.values()),
        badges: badgesRes.data || [],
      });
    }

    // ─── ACTION: download_config ─────────────────────────────────────
    // Called by the DLL to download a config via session token.
    // Returns a signed URL for the config file.
    if (action === "download_config") {
      const validation = await validateSessionToken();
      if ("error" in validation) return json({ error: validation.error }, validation.status);
      const { userId } = validation;

      if (!config_id || typeof config_id !== "string") {
        return json({ error: "config_id required" }, 400);
      }

      // Validate UUID format
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!UUID_REGEX.test(config_id)) {
        return json({ error: "Invalid config_id" }, 400);
      }

      // Check ownership or purchase
      const [configRes, purchaseRes] = await Promise.all([
        supabaseAdmin.from("configs").select("id, user_id, file_path, name").eq("id", config_id).single(),
        supabaseAdmin.from("config_purchases").select("id").eq("user_id", userId).eq("config_id", config_id).maybeSingle(),
      ]);

      const config = configRes.data;
      if (!config) return json({ error: "Config not found" }, 404);

      const isOwner = config.user_id === userId;
      if (!purchaseRes.data && !isOwner) {
        return json({ error: "Not purchased" }, 403);
      }

      if (!config.file_path) {
        return json({ error: "No file available" }, 404);
      }

      const { data: signedData, error: signedError } = await supabaseAdmin.storage
        .from("configs")
        .createSignedUrl(config.file_path, 300);

      if (signedError || !signedData?.signedUrl) {
        return json({ error: "File download failed" }, 500);
      }

      return json({ url: signedData.signedUrl, filename: config.name });
    }

    // ─── ACTION: revoke ──────────────────────────────────────────────
    // Called by the launcher to invalidate the session (e.g. on logout).
    if (action === "revoke") {
      const sessionToken = req.headers.get("X-Session-Token");
      if (!sessionToken) return json({ error: "Missing session token" }, 400);

      await supabaseAdmin
        .from("session_tokens")
        .update({ revoked: true })
        .eq("token", sessionToken);

      return json({ success: true });
    }

    // ─── ACTION: refresh ─────────────────────────────────────────────
    // Called by the DLL to extend the session by another 24h.
    if (action === "refresh") {
      const validation = await validateSessionToken();
      if ("error" in validation) return json({ error: validation.error }, validation.status);

      const sessionToken = req.headers.get("X-Session-Token")!;
      await supabaseAdmin
        .from("session_tokens")
        .update({ expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() })
        .eq("token", sessionToken);

      return json({ success: true, expires_in: 86400 });
    }

    return json({ error: "Invalid action. Use: create, connect, download_config, refresh, revoke" }, 400);
  } catch (_err) {
    return json({ error: "Internal server error" }, 500);
  }
});
