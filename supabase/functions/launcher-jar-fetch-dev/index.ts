import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkMinRole } from "../_shared/check-role.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-key",
};

const CLIENT_KEY = Deno.env.get("DLL_CLIENT_KEY") || "";
const DEV_JAR_PATH = "client/hades-dev.jar";

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
      // Dev branch: requires moderator or higher (moderator/admin/owner)
      const role = await checkMinRole(supabaseAdmin, user.id, "moderator");
      if (!role.allowed) {
        return new Response(
          JSON.stringify({ error: "Dev branch access requires moderator role or higher" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabaseAdmin.rpc("cleanup_download_tokens");

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

      return new Response(JSON.stringify({ token: downloadToken, branch: "dev" }), {
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

      // Re-verify role on download too (defense in depth)
      const role = await checkMinRole(supabaseAdmin, user.id, "moderator");
      if (!role.allowed) {
        return new Response(
          JSON.stringify({ error: "Dev branch access requires moderator role or higher" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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
        .createSignedUrl(DEV_JAR_PATH, 300);

      if (signedError || !signedData?.signedUrl) {
        return new Response(JSON.stringify({ error: "Dev JAR file not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ url: signedData.signedUrl, branch: "dev" }), {
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
