import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if banned
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("user_id, username, avatar_url, description, hades_coins, created_at, banned_at")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.banned_at) {
      return new Response(JSON.stringify({ error: "Account banned", banned_at: profile.banned_at }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch roles, subscription, configs, and badges in parallel
    const [rolesRes, subRes, purchasesRes, ownConfigsRes, badgesRes] = await Promise.all([
      supabaseAdmin.from("user_roles").select("role").eq("user_id", user.id),
      supabaseAdmin.from("subscriptions").select("status, current_period_end").eq("user_id", user.id).eq("status", "active").maybeSingle(),
      supabaseAdmin.from("config_purchases").select("config_id").eq("user_id", user.id),
      supabaseAdmin.from("configs").select("id, name, description, category, file_path, is_official, downloads, rating").eq("user_id", user.id),
      supabaseAdmin.from("user_badges").select("badge_name, badge_icon, badge_color").eq("user_id", user.id),
    ]);

    const roles = (rolesRes.data || []).map((r: any) => r.role);
    const isStaff = roles.includes("owner") || roles.includes("admin");

    // Subscription: staff get unlimited
    const subscription = isStaff
      ? { active: true, unlimited: true }
      : subRes.data
        ? { active: true, expires: subRes.data.current_period_end }
        : { active: false };

    // Merge own + purchased configs
    const purchasedIds = (purchasesRes.data || []).map((p: any) => p.config_id);
    const ownConfigs = ownConfigsRes.data || [];

    let purchasedConfigs: any[] = [];
    if (purchasedIds.length > 0) {
      const { data } = await supabaseAdmin
        .from("configs")
        .select("id, name, description, category, file_path, is_official, downloads, rating")
        .in("id", purchasedIds);
      purchasedConfigs = data || [];
    }

    const allConfigs = new Map();
    for (const c of [...ownConfigs, ...purchasedConfigs]) {
      allConfigs.set(c.id, c);
    }

    return new Response(JSON.stringify({
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
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
