import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DISCORD_API = "https://discord.com/api/v10";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const DISCORD_CLIENT_ID = Deno.env.get("DISCORD_CLIENT_ID");
  const DISCORD_CLIENT_SECRET = Deno.env.get("DISCORD_CLIENT_SECRET");

  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    return new Response(JSON.stringify({ error: "Discord OAuth not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Step 1: Initial redirect - start OAuth flow
  const code = url.searchParams.get("code");

  if (!code) {
    // Require auth: verify the user's JWT to get their real user_id
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id; // Use verified user id, ignore query param
    const rawRedirect = url.searchParams.get("redirect") || "/";
    // Only allow relative URLs to prevent open redirect
    const redirect = rawRedirect.startsWith("/") ? rawRedirect : "/";

    // Build the Discord authorization URL
    const functionUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/discord-oauth`;
    const state = btoa(JSON.stringify({ user_id: userId, redirect }));
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(functionUrl)}&response_type=code&scope=identify&state=${encodeURIComponent(state)}`;

    return new Response(null, {
      status: 302,
      headers: { Location: discordAuthUrl },
    });
  }

  // Step 2: Callback - exchange code for token and get user info
  try {
    const stateParam = url.searchParams.get("state");
    if (!stateParam) throw new Error("Missing state");

    const { user_id, redirect } = JSON.parse(atob(stateParam));
    if (!user_id) throw new Error("Missing user_id in state");

    // Validate redirect from state as well
    const safeRedirect = (typeof redirect === "string" && redirect.startsWith("/")) ? redirect : "/profile";

    const functionUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/discord-oauth`;

    // Exchange code for access token
    const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: functionUrl,
      }),
    });

    if (!tokenRes.ok) throw new Error("Failed to exchange code for token");
    const tokenData = await tokenRes.json();

    // Get Discord user info
    const userRes = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) throw new Error("Failed to get Discord user");
    const discordUser = await userRes.json();

    // Store in profiles using service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        discord_id: discordUser.id,
        discord_username: discordUser.username,
        discord_avatar: discordUser.avatar,
      })
      .eq("user_id", user_id);

    if (error) throw new Error("Failed to save Discord info");

    // Redirect back to profile page with success
    return new Response(null, {
      status: 302,
      headers: { Location: `${safeRedirect}?discord=linked` },
    });
  } catch (err) {
    console.error("Discord OAuth error:", err);
    const stateParam = url.searchParams.get("state");
    let redirect = "/profile";
    try {
      if (stateParam) {
        const parsed = JSON.parse(atob(stateParam));
        const r = parsed.redirect;
        redirect = (typeof r === "string" && r.startsWith("/")) ? r : "/profile";
      }
    } catch {}

    return new Response(null, {
      status: 302,
      headers: { Location: `${redirect}?discord=error` },
    });
  }
});
