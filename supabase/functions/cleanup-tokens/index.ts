import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cleanup-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require shared secret — only the cron job knows this value
    const expectedSecret = Deno.env.get("CLEANUP_SECRET");
    const providedSecret = req.headers.get("X-Cleanup-Secret");

    if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Clean up expired/used download tokens
    await supabaseAdmin.rpc("cleanup_download_tokens");

    // Clean up expired/revoked session tokens
    await supabaseAdmin.rpc("cleanup_session_tokens");

    // Clean up old rate-limit log entries
    await supabaseAdmin.rpc("cleanup_rate_limit_log");

    return new Response(JSON.stringify({ success: true, cleaned_at: new Date().toISOString() }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_err) {
    return new Response(JSON.stringify({ error: "Cleanup failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
