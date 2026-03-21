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
    const { action } = await req.json().catch(() => ({ action: undefined }));

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

    // ─── ACTION: connect ─────────────────────────────────────────────
    // Called by the DLL with X-Session-Token header.
    // Returns full user profile data (same shape as launcher-profile).
    if (action === "connect") {
      const sessionToken = req.headers.get("X-Session-Token");
      if (!sessionToken) {
        return json({ error: "Missing session token" }, 401);
      }

      // Validate token
      const { data: tokenRow, error: tokenError } = await supabaseAdmin
        .from("session_tokens")
        .select("user_id, expires_at, revoked")
        .eq("token", sessionToken)
        .single();

      if (tokenError || !tokenRow) {
        return json({ error: "Invalid session token" }, 401);
      }

      if (tokenRow.revoked) {
        return json({ error: "Session token revoked" }, 401);
      }

      if (new Date(tokenRow.expires_at) < new Date()) {
        return json({ error: "Session token expired" }, 401);
      }

      const userId = tokenRow.user_id;

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
        // Revoke token on ban
        await supabaseAdmin
          .from("session_tokens")
          .update({ revoked: true })
          .eq("token", sessionToken);
        return json({ error: "Account banned", banned_at: profile.banned_at }, 403);
      }

      // Fetch roles, subscription, configs, badges in parallel
      const [rolesRes, subRes, purchasesRes, ownConfigsRes, badgesRes] =
        await Promise.all([
          supabaseAdmin.from("user_roles").select("role").eq("user_id", userId),
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
            .select(
              "id, name, description, category, file_path, is_official, downloads, rating"
            )
            .eq("user_id", userId),
          supabaseAdmin
            .from("user_badges")
            .select("badge_name, badge_icon, badge_color")
            .eq("user_id", userId),
        ]);

      const roles = (rolesRes.data || []).map((r: any) => r.role);
      const isStaff = roles.includes("owner") || roles.includes("admin");

      const subscription = isStaff
        ? { active: true, unlimited: true }
        : subRes.data
          ? { active: true, expires: subRes.data.current_period_end }
          : { active: false };

      // Merge own + purchased configs
      const purchasedIds = (purchasesRes.data || []).map(
        (p: any) => p.config_id
      );
      const ownConfigs = ownConfigsRes.data || [];

      let purchasedConfigs: any[] = [];
      if (purchasedIds.length > 0) {
        const { data } = await supabaseAdmin
          .from("configs")
          .select(
            "id, name, description, category, file_path, is_official, downloads, rating"
          )
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

    return json({ error: "Invalid action. Use: create, connect, revoke" }, 400);
  } catch (_err) {
    return json({ error: "Internal server error" }, 500);
  }
});
