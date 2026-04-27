import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DISCORD_API = "https://discord.com/api/v10";

// HMAC-sign the OAuth state to prevent tampering (user_id spoofing)
async function signState(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const sigHex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return sigHex;
}

async function verifyState(payload: string, signature: string, secret: string): Promise<boolean> {
  const expected = await signState(payload, secret);
  // Constant-time comparison
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const DISCORD_CLIENT_ID = Deno.env.get("DISCORD_CLIENT_ID");
  const DISCORD_CLIENT_SECRET = Deno.env.get("DISCORD_CLIENT_SECRET");
  const HMAC_SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // Reuse as HMAC key

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

    const userId = user.id;
    const rawRedirect = url.searchParams.get("redirect") || "/";
    const redirect = rawRedirect.startsWith("/") ? rawRedirect : "/";

    // Build signed state (prevents user_id spoofing on callback)
    const statePayload = JSON.stringify({ user_id: userId, redirect, ts: Date.now() });
    const stateB64 = btoa(statePayload);
    const sig = await signState(stateB64, HMAC_SECRET);
    const state = `${stateB64}.${sig}`;

    const functionUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/discord-oauth`;
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(functionUrl)}&response_type=code&scope=identify&state=${encodeURIComponent(state)}`;

    // Return URL as JSON so cross-origin fetch can read it (redirect: "manual" makes Location opaque)
    return new Response(JSON.stringify({ url: discordAuthUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Step 2: Callback - exchange code for token and get user info
  try {
    const stateParam = url.searchParams.get("state");
    if (!stateParam) throw new Error("Missing state");

    // Verify HMAC signature on state
    const dotIdx = stateParam.lastIndexOf(".");
    if (dotIdx === -1) throw new Error("Invalid state format");
    const stateB64 = stateParam.substring(0, dotIdx);
    const stateSig = stateParam.substring(dotIdx + 1);

    const valid = await verifyState(stateB64, stateSig, HMAC_SECRET);
    if (!valid) throw new Error("State signature verification failed");

    const { user_id, redirect, ts } = JSON.parse(atob(stateB64));
    if (!user_id) throw new Error("Missing user_id in state");

    // Reject states older than 10 minutes
    if (Date.now() - ts > 10 * 60 * 1000) throw new Error("State expired");

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

    const [pubRes, privRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .update({ discord_username: discordUser.username })
        .eq("user_id", user_id),
      supabaseAdmin
        .from("profiles_private")
        .upsert({
          user_id,
          discord_id: discordUser.id,
          discord_avatar: discordUser.avatar,
        }, { onConflict: "user_id" }),
    ]);

    if (pubRes.error || privRes.error) throw new Error("Failed to save Discord info");

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
        const dotIdx = stateParam.lastIndexOf(".");
        if (dotIdx > 0) {
          const parsed = JSON.parse(atob(stateParam.substring(0, dotIdx)));
          const r = parsed.redirect;
          redirect = (typeof r === "string" && r.startsWith("/")) ? r : "/profile";
        }
      }
    } catch {}

    return new Response(null, {
      status: 302,
      headers: { Location: `${redirect}?discord=error` },
    });
  }
});
