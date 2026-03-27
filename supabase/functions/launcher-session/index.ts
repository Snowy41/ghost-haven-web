import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkAccess } from "../_shared/check-access.ts";

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

      const { data: { user }, error: userError } = await supabase.auth.getUser();
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
    if (action === "connect") {
      const validation = await validateSessionToken();
      if ("error" in validation) return json({ error: validation.error }, validation.status);
      const { userId, token: sessionToken } = validation;

      // Fetch profile
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("user_id, username, avatar_url, description, hades_coins, created_at, banned_at")
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

      // Use centralized access check
      const access = await checkAccess(supabaseAdmin, userId);

      // Fetch configs, purchases, badges in parallel
      const [purchasesRes, ownConfigsRes, badgesRes] = await Promise.all([
        supabaseAdmin.from("config_purchases").select("config_id").eq("user_id", userId),
        supabaseAdmin.from("configs").select("id, name, description, category, is_official, downloads, rating").eq("user_id", userId),
        supabaseAdmin.from("user_badges").select("badge_name, badge_icon, badge_color").eq("user_id", userId),
      ]);

      // Merge own + purchased configs (without file_path)
      const purchasedIds = (purchasesRes.data || []).map((p: any) => p.config_id);
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
        roles: access.roles,
        subscription: access.subscription,
        configs: Array.from(allConfigs.values()),
        badges: badgesRes.data || [],
      });
    }

    // ─── ACTION: download_config ─────────────────────────────────────
    if (action === "download_config") {
      const validation = await validateSessionToken();
      if ("error" in validation) return json({ error: validation.error }, validation.status);
      const { userId } = validation;

      if (!config_id || typeof config_id !== "string") {
        return json({ error: "config_id required" }, 400);
      }

      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!UUID_REGEX.test(config_id)) {
        return json({ error: "Invalid config_id" }, 400);
      }

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
