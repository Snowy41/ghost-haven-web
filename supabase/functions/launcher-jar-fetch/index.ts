import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkAccess } from "../_shared/check-access.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-key",
};

const CLIENT_KEY = Deno.env.get("DLL_CLIENT_KEY") || "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientKey = req.headers.get("X-Client-Key");
    if (clientKey !== CLIENT_KEY) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, token } = body;

    if (action === "request_token") {
      // Centralized access check (staff + beta + subscription)
      const access = await checkAccess(supabaseAdmin, user.id);
      if (!access.allowed) {
        return new Response(JSON.stringify({ error: access.reason || "No active subscription" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Cleanup expired tokens first
      await supabaseAdmin.rpc("cleanup_download_tokens");

      // Generate one-time token
      const downloadToken = crypto.randomUUID();
      const { error: insertError } = await supabaseAdmin
        .from("download_tokens")
        .insert({ user_id: user.id, token: downloadToken });

      if (insertError) {
        return new Response(JSON.stringify({ error: "Token generation failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ token: downloadToken }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "download") {
      if (!token || typeof token !== "string") {
        return new Response(JSON.stringify({ error: "Token required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: tokenRow } = await supabaseAdmin
        .from("download_tokens")
        .select("*")
        .eq("token", token)
        .eq("user_id", user.id)
        .eq("used", false)
        .single();

      if (!tokenRow) {
        return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tokenAge = Date.now() - new Date(tokenRow.created_at).getTime();
      if (tokenAge > 60_000) {
        await supabaseAdmin
          .from("download_tokens")
          .update({ used: true })
          .eq("id", tokenRow.id);

        return new Response(JSON.stringify({ error: "Token expired" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin
        .from("download_tokens")
        .update({ used: true })
        .eq("id", tokenRow.id);

      const { data: signedData, error: signedError } = await supabaseAdmin.storage
        .from("configs")
        .createSignedUrl("client/hades.jar", 300);

      if (signedError || !signedData?.signedUrl) {
        return new Response(JSON.stringify({ error: "JAR file not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ url: signedData.signedUrl }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
