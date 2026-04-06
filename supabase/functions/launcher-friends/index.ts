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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate session token
    const sessionToken = req.headers.get("X-Session-Token");
    if (!sessionToken) return json({ error: "Missing session token" }, 401);

    const { data: tokenRow } = await supabaseAdmin
      .from("session_tokens")
      .select("user_id, expires_at, revoked")
      .eq("token", sessionToken)
      .single();

    if (!tokenRow) return json({ error: "Invalid session token" }, 401);
    if (tokenRow.revoked) return json({ error: "Session revoked" }, 401);
    if (new Date(tokenRow.expires_at) < new Date()) return json({ error: "Session expired" }, 401);

    const userId = tokenRow.user_id;
    const body = await req.json().catch(() => ({}));
    const { action, username, friendship_id } = body;

    // ─── LIST: Get all accepted friends + presence ─────────────────
    if (action === "list") {
      const { data: friendships } = await supabaseAdmin
        .from("friendships")
        .select("*")
        .eq("status", "accepted")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

      if (!friendships || friendships.length === 0) {
        return json({ friends: [] });
      }

      const friendIds = friendships.map((f: any) =>
        f.requester_id === userId ? f.addressee_id : f.requester_id
      );

      const [profilesRes, presenceRes] = await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("user_id, username, avatar_url, description")
          .in("user_id", friendIds),
        supabaseAdmin
          .from("user_presence")
          .select("user_id, status, last_seen, server_ip, activity")
          .in("user_id", friendIds),
      ]);

      const presenceMap = new Map(
        (presenceRes.data || []).map((p: any) => [p.user_id, p])
      );

      return json({
        friends: (profilesRes.data || []).map((p: any) => {
          const presence = presenceMap.get(p.user_id);
          const isOnline =
            presence &&
            new Date(presence.last_seen).getTime() > Date.now() - 5 * 60 * 1000;
          return {
            user_id: p.user_id,
            username: p.username,
            avatar_url: p.avatar_url,
            description: p.description,
            presence: isOnline
              ? {
                  status: presence.status,
                  server_ip: presence.server_ip,
                  activity: presence.activity,
                }
              : { status: "offline" },
          };
        }),
      });
    }

    // ─── PENDING: Get pending requests ─────────────────────────────
    if (action === "pending") {
      const { data: received } = await supabaseAdmin
        .from("friendships")
        .select("id, requester_id, created_at")
        .eq("addressee_id", userId)
        .eq("status", "pending");

      const requesterIds = (received || []).map((r: any) => r.requester_id);
      let profiles: any[] = [];
      if (requesterIds.length > 0) {
        const { data } = await supabaseAdmin
          .from("profiles")
          .select("user_id, username, avatar_url")
          .in("user_id", requesterIds);
        profiles = data || [];
      }

      const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));

      return json({
        pending: (received || []).map((r: any) => ({
          friendship_id: r.id,
          created_at: r.created_at,
          from: profileMap.get(r.requester_id) || { username: "Unknown" },
        })),
      });
    }

    // ─── ADD: Send friend request by username ──────────────────────
    if (action === "add") {
      if (!username || typeof username !== "string") {
        return json({ error: "username required" }, 400);
      }

      const { data: target } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .ilike("username", username.trim())
        .maybeSingle();

      if (!target) return json({ error: "User not found" }, 404);
      if (target.user_id === userId) return json({ error: "Cannot add yourself" }, 400);

      const { data: existing } = await supabaseAdmin
        .from("friendships")
        .select("id, status")
        .or(
          `and(requester_id.eq.${userId},addressee_id.eq.${target.user_id}),and(requester_id.eq.${target.user_id},addressee_id.eq.${userId})`
        )
        .maybeSingle();

      if (existing) {
        return json({ error: `Already ${existing.status}` }, 409);
      }

      const { error } = await supabaseAdmin.from("friendships").insert({
        requester_id: userId,
        addressee_id: target.user_id,
        status: "pending",
      });

      if (error) return json({ error: "Failed to send request" }, 500);
      return json({ success: true });
    }

    // ─── ACCEPT: Accept a friend request ───────────────────────────
    if (action === "accept") {
      if (!friendship_id) return json({ error: "friendship_id required" }, 400);

      const { data: fr } = await supabaseAdmin
        .from("friendships")
        .select("addressee_id")
        .eq("id", friendship_id)
        .eq("status", "pending")
        .single();

      if (!fr || fr.addressee_id !== userId) {
        return json({ error: "Not authorized or not found" }, 403);
      }

      await supabaseAdmin
        .from("friendships")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", friendship_id);

      return json({ success: true });
    }

    // ─── REMOVE: Remove a friendship ───────────────────────────────
    if (action === "remove") {
      if (!friendship_id) return json({ error: "friendship_id required" }, 400);

      const { data: fr } = await supabaseAdmin
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("id", friendship_id)
        .single();

      if (!fr || (fr.requester_id !== userId && fr.addressee_id !== userId)) {
        return json({ error: "Not authorized" }, 403);
      }

      await supabaseAdmin.from("friendships").delete().eq("id", friendship_id);
      return json({ success: true });
    }

    // ─── HEARTBEAT: Update user presence ───────────────────────────
    if (action === "heartbeat") {
      const { status: presenceStatus, server_ip, activity } = body;
      const validStatuses = ["website", "launcher", "client"];
      const finalStatus = validStatuses.includes(presenceStatus) ? presenceStatus : "launcher";

      const { data: existing } = await supabaseAdmin
        .from("user_presence")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        await supabaseAdmin
          .from("user_presence")
          .update({
            status: finalStatus,
            last_seen: new Date().toISOString(),
            server_ip: server_ip || null,
            activity: activity || null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
      } else {
        await supabaseAdmin.from("user_presence").insert({
          user_id: userId,
          status: finalStatus,
          last_seen: new Date().toISOString(),
          server_ip: server_ip || null,
          activity: activity || null,
        });
      }

      return json({ success: true });
    }

    // ─── INVITE: Invite a friend to play ───────────────────────────
    if (action === "invite") {
      const { receiver_id, server_ip, message } = body;
      if (!receiver_id) return json({ error: "receiver_id required" }, 400);

      // Check they're actually friends
      const { data: friendship } = await supabaseAdmin
        .from("friendships")
        .select("id")
        .eq("status", "accepted")
        .or(
          `and(requester_id.eq.${userId},addressee_id.eq.${receiver_id}),and(requester_id.eq.${receiver_id},addressee_id.eq.${userId})`
        )
        .maybeSingle();

      if (!friendship) return json({ error: "Not friends" }, 403);

      const { error } = await supabaseAdmin.from("game_invites").insert({
        sender_id: userId,
        receiver_id,
        server_ip: server_ip || null,
        message: message || null,
        status: "pending",
      });

      if (error) return json({ error: "Failed to send invite" }, 500);
      return json({ success: true });
    }

    // ─── INVITES: List pending game invites ────────────────────────
    if (action === "invites") {
      const { data: invites } = await supabaseAdmin
        .from("game_invites")
        .select("*")
        .eq("receiver_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      const senderIds = (invites || []).map((i: any) => i.sender_id);
      let profiles: any[] = [];
      if (senderIds.length > 0) {
        const { data } = await supabaseAdmin
          .from("profiles")
          .select("user_id, username, avatar_url")
          .in("user_id", senderIds);
        profiles = data || [];
      }
      const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));

      return json({
        invites: (invites || []).map((i: any) => ({
          ...i,
          sender: profileMap.get(i.sender_id) || { username: "Unknown" },
        })),
      });
    }

    // ─── INVITE_RESPOND: Accept/decline an invite ──────────────────
    if (action === "invite_respond") {
      const { invite_id, response } = body;
      if (!invite_id || !["accepted", "declined"].includes(response)) {
        return json({ error: "invite_id and response (accepted/declined) required" }, 400);
      }

      const { data: invite } = await supabaseAdmin
        .from("game_invites")
        .select("receiver_id")
        .eq("id", invite_id)
        .eq("status", "pending")
        .single();

      if (!invite || invite.receiver_id !== userId) {
        return json({ error: "Not authorized" }, 403);
      }

      await supabaseAdmin
        .from("game_invites")
        .update({ status: response, updated_at: new Date().toISOString() })
        .eq("id", invite_id);

      return json({ success: true });
    }

    return json({ error: "Invalid action. Use: list, pending, add, accept, remove, heartbeat, invite, invites, invite_respond" }, 400);
  } catch (_err) {
    return json({ error: "Internal server error" }, 500);
  }
});
