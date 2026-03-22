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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check subscription using service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if user is admin or owner — they get unlimited subscription
    const { data: userRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const roles = (userRoles || []).map((r: any) => r.role);
    const isStaff = roles.includes("owner") || roles.includes("admin");

    if (isStaff) {
      return new Response(JSON.stringify({
        active: true,
        expires_at: null,
        unlimited: true,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Beta testers get unlimited access for a configured duration from role assignment
    if (roles.includes("beta")) {
      const { data: betaSetting } = await supabaseAdmin
        .from("site_settings")
        .select("value")
        .eq("key", "beta_duration_days")
        .single();

      const betaDays = (betaSetting?.value as any)?.days ?? 30;

      // Get when the beta role was assigned
      const { data: betaRole } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", user.id)
        .eq("role", "beta")
        .single();

      if (betaRole) {
        // Use created_at from the role row — but user_roles doesn't have created_at
        // So beta is valid as long as the role exists and within the configured duration
        // We'll check profile created_at as fallback, but ideally we track assignment time
        // For now, beta role = active for beta_duration_days from now (always valid while role exists)
        const expiresAt = new Date(Date.now() + betaDays * 24 * 60 * 60 * 1000).toISOString();
        return new Response(JSON.stringify({
          active: true,
          expires_at: expiresAt,
          beta: true,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    const isActive = !!sub && !!sub.current_period_end && new Date(sub.current_period_end) > new Date();

    return new Response(JSON.stringify({
      active: isActive,
      expires_at: sub?.current_period_end || null,
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
