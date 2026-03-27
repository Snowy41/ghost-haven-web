import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiter
const attempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 3; // max registration attempts
const RATE_WINDOW = 300_000; // per 5 minutes

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(`register:${clientIp}`)) {
      return new Response(JSON.stringify({ error: "Too many attempts. Try again in a few minutes." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "300" },
      });
    }

    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const invite_key = typeof body.invite_key === "string" ? body.invite_key.trim() : "";

    if (!email || !password || !username || !invite_key) {
      return new Response(JSON.stringify({ error: "Email, password, username, and invite_key required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (email.length > 255 || password.length > 128 || password.length < 6) {
      return new Response(JSON.stringify({ error: "Invalid input: password must be 6-128 chars" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_-]+$/.test(username)) {
      return new Response(JSON.stringify({ error: "Username must be 3-20 chars, alphanumeric with dashes/underscores" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (invite_key.length > 50) {
      return new Response(JSON.stringify({ error: "Invalid invite key" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check invite key
    const { data: keyData } = await supabaseAdmin
      .from("invite_keys")
      .select("id")
      .eq("key", invite_key)
      .eq("is_used", false)
      .single();

    if (!keyData) {
      return new Response(JSON.stringify({ error: "Invalid or already used invite key" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
    });

    if (authError) {
      return new Response(JSON.stringify({ error: "Registration failed. Check your details and try again." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark invite key as used
    await supabaseAdmin.rpc("validate_and_use_invite_key", {
      p_key: invite_key,
      p_user_id: authData.user.id,
    });

    return new Response(JSON.stringify({
      success: true,
      user_id: authData.user.id,
      message: "Account created successfully",
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
