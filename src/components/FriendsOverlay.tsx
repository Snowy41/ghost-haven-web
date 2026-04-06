import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, X, UserPlus, Check, XIcon, MessageCircle, ExternalLink,
  Send, ArrowLeft, Bell, ChevronRight, Gamepad2, Sword
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface FriendPresence {
  status: "website" | "launcher" | "client" | "offline";
  server_ip?: string;
  activity?: string;
}

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
    user_id: string;
  };
  presence?: FriendPresence;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

interface GameInvite {
  id: string;
  sender_id: string;
  receiver_id: string;
  server_ip: string | null;
  message: string | null;
  status: string;
  created_at: string;
  sender?: { username: string; avatar_url: string | null };
}

const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const HEARTBEAT_INTERVAL = 60 * 1000; // 1 minute

const statusColors: Record<string, string> = {
  website: "bg-emerald-400",
  launcher: "bg-blue-400",
  client: "bg-amber-400",
  offline: "bg-muted-foreground/40",
};

const statusLabels: Record<string, string> = {
  website: "On Website",
  launcher: "In Launcher",
  client: "In Game",
  offline: "Offline",
};

const FriendsOverlay = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"friends" | "requests" | "add">("friends");
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingReceived, setPendingReceived] = useState<Friendship[]>([]);
  const [pendingSent, setPendingSent] = useState<Friendship[]>([]);
  const [searchUsername, setSearchUsername] = useState("");
  const [loading, setLoading] = useState(false);

  // Messaging state
  const [activeChatFriend, setActiveChatFriend] = useState<Friendship | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Game invites
  const [gameInvites, setGameInvites] = useState<GameInvite[]>([]);

  const totalUnread = Array.from(unreadCounts.values()).reduce((s, c) => s + c, 0);
  const pendingCount = pendingReceived.length;
  const inviteCount = gameInvites.length;
  const totalNotifications = pendingCount + totalUnread + inviteCount;

  // ─── Website heartbeat ──────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const sendHeartbeat = async () => {
      const { data: existing } = await supabase
        .from("user_presence")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("user_presence")
          .update({
            status: "website",
            last_seen: new Date().toISOString(),
            server_ip: null,
            activity: null,
          })
          .eq("user_id", user.id);
      } else {
        await supabase.from("user_presence").insert({
          user_id: user.id,
          status: "website",
          last_seen: new Date().toISOString(),
        });
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    return () => clearInterval(interval);
  }, [user]);

  const fetchFriendships = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (!data) return;

    const friendUserIds = data.map((f) =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );

    const [profilesRes, presenceRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", friendUserIds),
      supabase
        .from("user_presence")
        .select("user_id, status, last_seen, server_ip, activity")
        .in("user_id", friendUserIds),
    ]);

    const profileMap = new Map(profilesRes.data?.map((p) => [p.user_id, p]) || []);
    const presenceMap = new Map(
      (presenceRes.data || []).map((p: any) => [p.user_id, p])
    );

    const withProfiles = data.map((f) => {
      const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
      const presence = presenceMap.get(friendId);
      const isOnline = presence && new Date(presence.last_seen).getTime() > Date.now() - PRESENCE_TIMEOUT;

      return {
        ...f,
        profile: profileMap.get(friendId),
        presence: isOnline
          ? { status: presence.status, server_ip: presence.server_ip, activity: presence.activity }
          : { status: "offline" as const },
      };
    });

    // Sort: online first, then alphabetical
    const accepted = withProfiles.filter((f) => f.status === "accepted");
    accepted.sort((a, b) => {
      const aOnline = a.presence?.status !== "offline" ? 0 : 1;
      const bOnline = b.presence?.status !== "offline" ? 0 : 1;
      if (aOnline !== bOnline) return aOnline - bOnline;
      return (a.profile?.username || "").localeCompare(b.profile?.username || "");
    });

    setFriends(accepted);
    setPendingReceived(
      withProfiles.filter((f) => f.status === "pending" && f.addressee_id === user.id)
    );
    setPendingSent(
      withProfiles.filter((f) => f.status === "pending" && f.requester_id === user.id)
    );
  }, [user]);

  const fetchUnreadCounts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("messages")
      .select("sender_id")
      .eq("receiver_id", user.id)
      .eq("read", false);

    if (!data) return;
    const counts = new Map<string, number>();
    data.forEach((m) => {
      counts.set(m.sender_id, (counts.get(m.sender_id) || 0) + 1);
    });
    setUnreadCounts(counts);
  }, [user]);

  const fetchGameInvites = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("game_invites")
      .select("*")
      .eq("receiver_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!data) { setGameInvites([]); return; }

    const senderIds = data.map((i: any) => i.sender_id);
    let profiles: any[] = [];
    if (senderIds.length > 0) {
      const { data: p } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", senderIds);
      profiles = p || [];
    }
    const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));

    setGameInvites(
      data.map((i: any) => ({
        ...i,
        sender: profileMap.get(i.sender_id) || { username: "Unknown", avatar_url: null },
      }))
    );
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchFriendships();
      fetchUnreadCounts();
      fetchGameInvites();
    }
  }, [user, fetchFriendships, fetchUnreadCounts, fetchGameInvites]);

  useEffect(() => {
    if (user && open) {
      fetchFriendships();
      fetchUnreadCounts();
      fetchGameInvites();
    }
  }, [user, open, fetchFriendships, fetchUnreadCounts, fetchGameInvites]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("friends-realtime-v2")
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => {
        fetchFriendships();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as Message;
        if (activeChatFriend) {
          const friendId = activeChatFriend.profile?.user_id;
          if (msg.sender_id === friendId || msg.sender_id === user.id) {
            setMessages((prev) => [...prev, msg]);
            if (msg.sender_id === friendId && msg.receiver_id === user.id) {
              supabase.from("messages").update({ read: true }).eq("id", msg.id).then();
            }
          } else {
            fetchUnreadCounts();
          }
        } else {
          fetchUnreadCounts();
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" }, () => {
        fetchFriendships();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "game_invites" }, () => {
        fetchGameInvites();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeChatFriend, fetchFriendships, fetchUnreadCounts, fetchGameInvites]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openChat = async (friendship: Friendship) => {
    if (!user || !friendship.profile) return;
    setActiveChatFriend(friendship);
    const friendId = friendship.profile.user_id;

    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`
      )
      .order("created_at", { ascending: true })
      .limit(100);

    setMessages(data || []);

    await supabase
      .from("messages")
      .update({ read: true })
      .eq("sender_id", friendId)
      .eq("receiver_id", user.id)
      .eq("read", false);

    setUnreadCounts((prev) => {
      const next = new Map(prev);
      next.delete(friendId);
      return next;
    });
  };

  const sendMessage = async () => {
    if (!user || !activeChatFriend?.profile || !messageInput.trim()) return;
    setSendingMessage(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: activeChatFriend.profile.user_id,
      content: messageInput.trim(),
    });
    if (error) {
      toast({ title: "Failed to send", variant: "destructive" });
    }
    setMessageInput("");
    setSendingMessage(false);
  };

  const handleAddFriend = async () => {
    if (!user || !searchUsername.trim()) return;
    setLoading(true);

    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("user_id, username")
      .ilike("username", searchUsername.trim())
      .maybeSingle();

    if (!targetProfile) {
      toast({ title: "User not found", variant: "destructive" });
      setLoading(false);
      return;
    }

    if (targetProfile.user_id === user.id) {
      toast({ title: "Can't add yourself", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data: existing } = await supabase
      .from("friendships")
      .select("id")
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${targetProfile.user_id}),and(requester_id.eq.${targetProfile.user_id},addressee_id.eq.${user.id})`
      )
      .maybeSingle();

    if (existing) {
      toast({ title: "Friend request already exists", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: targetProfile.user_id,
      status: "pending",
    });

    if (error) {
      toast({ title: "Failed to send request", variant: "destructive" });
    } else {
      toast({ title: `Request sent to ${targetProfile.username}` });
      setSearchUsername("");
      fetchFriendships();
    }
    setLoading(false);
  };

  const handleAccept = async (id: string) => {
    await supabase
      .from("friendships")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", id);
    fetchFriendships();
  };

  const handleReject = async (id: string) => {
    await supabase.from("friendships").delete().eq("id", id);
    fetchFriendships();
  };

  const handleInviteToPlay = async (friendUserId: string) => {
    if (!user) return;
    const { error } = await supabase.from("game_invites").insert({
      sender_id: user.id,
      receiver_id: friendUserId,
      status: "pending",
    });
    if (error) {
      toast({ title: "Failed to send invite", variant: "destructive" });
    } else {
      toast({ title: "Game invite sent!" });
    }
  };

  const handleRespondInvite = async (inviteId: string, response: "accepted" | "declined") => {
    await supabase
      .from("game_invites")
      .update({ status: response, updated_at: new Date().toISOString() })
      .eq("id", inviteId);
    fetchGameInvites();
    toast({ title: response === "accepted" ? "Invite accepted!" : "Invite declined" });
  };

  if (!user) return null;

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => {
          setOpen(!open);
          if (open) setActiveChatFriend(null);
        }}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full gradient-hades glow-orange flex items-center justify-center shadow-2xl"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="h-6 w-6 text-primary-foreground" />
            </motion.div>
          ) : (
            <motion.div key="users" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <Users className="h-6 w-6 text-primary-foreground" />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {totalNotifications > 0 && !open && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 rounded-full bg-destructive text-primary-foreground text-xs flex items-center justify-center font-bold shadow-lg"
            >
              {totalNotifications > 9 ? "9+" : totalNotifications}
            </motion.span>
          )}
        </AnimatePresence>

        {totalNotifications > 0 && !open && (
          <span className="absolute inset-0 rounded-full animate-ping bg-primary/30 pointer-events-none" />
        )}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-6 z-50 w-80 max-h-[520px] rounded-2xl glass border border-border/50 shadow-2xl flex flex-col overflow-hidden"
          >
            <AnimatePresence mode="wait">
              {activeChatFriend ? (
                <ChatView
                  key="chat"
                  friend={activeChatFriend}
                  messages={messages}
                  messageInput={messageInput}
                  setMessageInput={setMessageInput}
                  onSend={sendMessage}
                  sendingMessage={sendingMessage}
                  onBack={() => setActiveChatFriend(null)}
                  currentUserId={user.id}
                  messagesEndRef={messagesEndRef}
                />
              ) : (
                <motion.div
                  key="list"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col h-full"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b border-border/30">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <h3 className="font-display text-sm font-bold tracking-wide text-foreground">
                        Friends
                      </h3>
                      <span className="text-xs text-muted-foreground">({friends.length})</span>
                    </div>
                    <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-border/30">
                    {(["friends", "requests", "add"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`flex-1 py-2.5 text-xs font-medium capitalize transition-all relative ${
                          tab === t
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t === "requests" && (pendingCount + inviteCount) > 0 && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-1.5 right-3 h-4 min-w-[1rem] px-0.5 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-bold"
                          >
                            {pendingCount + inviteCount}
                          </motion.span>
                        )}
                        {t === "friends" && totalUnread > 0 && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-1.5 right-3 h-4 min-w-[1rem] px-0.5 rounded-full bg-destructive text-[10px] text-primary-foreground flex items-center justify-center font-bold"
                          >
                            {totalUnread}
                          </motion.span>
                        )}
                        {t}
                        {tab === t && (
                          <motion.div
                            layoutId="tab-indicator"
                            className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary"
                          />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-1.5 max-h-[340px]">
                    {tab === "friends" && (
                      <>
                        {friends.length === 0 ? (
                          <div className="text-center py-12">
                            <Users className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
                            <p className="text-xs text-muted-foreground">No friends yet</p>
                            <button
                              onClick={() => setTab("add")}
                              className="text-xs text-primary hover:underline mt-1"
                            >
                              Add your first friend
                            </button>
                          </div>
                        ) : (
                          friends.map((f, i) => (
                            <motion.div
                              key={f.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.03 }}
                            >
                              <FriendRow
                                friendship={f}
                                onRemove={() => handleReject(f.id)}
                                onMessage={() => openChat(f)}
                                onInvite={() => handleInviteToPlay(f.profile?.user_id || "")}
                                unreadCount={unreadCounts.get(f.profile?.user_id || "") || 0}
                              />
                            </motion.div>
                          ))
                        )}
                      </>
                    )}

                    {tab === "requests" && (
                      <>
                        {/* Game invites */}
                        {gameInvites.length > 0 && (
                          <div className="space-y-1.5 mb-3">
                            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider px-1 flex items-center gap-1">
                              <Gamepad2 className="h-3 w-3" /> Game Invites
                            </p>
                            {gameInvites.map((inv, i) => (
                              <motion.div
                                key={inv.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20"
                              >
                                <Avatar className="h-8 w-8 ring-2 ring-amber-500/30">
                                  <AvatarImage src={inv.sender?.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs bg-amber-500/20 text-amber-400">
                                    {inv.sender?.username?.[0]?.toUpperCase() || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium truncate block">
                                    {inv.sender?.username}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {inv.server_ip ? `Server: ${inv.server_ip}` : "Wants to play!"}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleRespondInvite(inv.id, "accepted")}
                                  className="h-7 w-7 rounded-full bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleRespondInvite(inv.id, "declined")}
                                  className="h-7 w-7 rounded-full bg-destructive/20 text-destructive hover:bg-destructive hover:text-primary-foreground flex items-center justify-center transition-colors"
                                >
                                  <XIcon className="h-3.5 w-3.5" />
                                </button>
                              </motion.div>
                            ))}
                          </div>
                        )}

                        {/* Friend requests received */}
                        {pendingReceived.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider px-1">
                              Received
                            </p>
                            {pendingReceived.map((f, i) => (
                              <motion.div
                                key={f.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                              >
                                <Avatar className="h-8 w-8 ring-2 ring-primary/30">
                                  <AvatarImage src={f.profile?.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs bg-primary/20 text-primary">
                                    {f.profile?.username?.[0]?.toUpperCase() || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="flex-1 text-sm font-medium truncate">
                                  {f.profile?.username || "Unknown"}
                                </span>
                                <button
                                  onClick={() => handleAccept(f.id)}
                                  className="h-7 w-7 rounded-full bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleReject(f.id)}
                                  className="h-7 w-7 rounded-full bg-destructive/20 text-destructive hover:bg-destructive hover:text-primary-foreground flex items-center justify-center transition-colors"
                                >
                                  <XIcon className="h-3.5 w-3.5" />
                                </button>
                              </motion.div>
                            ))}
                          </div>
                        )}

                        {/* Friend requests sent */}
                        {pendingSent.length > 0 && (
                          <div className="space-y-1.5 mt-3">
                            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider px-1">
                              Sent
                            </p>
                            {pendingSent.map((f) => (
                              <div key={f.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/20">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={f.profile?.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                                    {f.profile?.username?.[0]?.toUpperCase() || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="flex-1 text-sm font-medium truncate text-muted-foreground">
                                  {f.profile?.username || "Unknown"}
                                </span>
                                <span className="text-[10px] text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
                                  Pending
                                </span>
                                <button
                                  onClick={() => handleReject(f.id)}
                                  className="h-6 w-6 rounded-full hover:bg-destructive/20 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                                >
                                  <XIcon className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {pendingReceived.length === 0 && pendingSent.length === 0 && gameInvites.length === 0 && (
                          <div className="text-center py-12">
                            <Bell className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
                            <p className="text-xs text-muted-foreground">No pending requests</p>
                          </div>
                        )}
                      </>
                    )}

                    {tab === "add" && (
                      <div className="space-y-3 py-4">
                        <div className="text-center mb-2">
                          <UserPlus className="h-8 w-8 mx-auto text-primary/40 mb-2" />
                          <p className="text-xs text-muted-foreground">Enter a username to send a friend request</p>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            value={searchUsername}
                            onChange={(e) => setSearchUsername(e.target.value)}
                            placeholder="Username..."
                            className="text-sm h-9 bg-secondary/50 border-border/50 focus:border-primary/50"
                            onKeyDown={(e) => e.key === "Enter" && handleAddFriend()}
                          />
                          <Button
                            size="sm"
                            onClick={handleAddFriend}
                            disabled={loading || !searchUsername.trim()}
                            className="gradient-hades h-9 px-3"
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/* ── Friend Row ──────────────────────────────────────────────── */
const FriendRow = ({
  friendship,
  onRemove,
  onMessage,
  onInvite,
  unreadCount,
}: {
  friendship: Friendship;
  onRemove: () => void;
  onMessage: () => void;
  onInvite: () => void;
  unreadCount: number;
}) => {
  const profile = friendship.profile;
  const presence = friendship.presence || { status: "offline" };
  const isOnline = presence.status !== "offline";

  return (
    <div
      className="flex items-center gap-2 p-2 rounded-xl hover:bg-secondary/40 transition-all group cursor-pointer"
      onClick={onMessage}
    >
      <div className="relative">
        <Avatar className="h-9 w-9">
          <AvatarImage src={profile?.avatar_url || undefined} />
          <AvatarFallback className="text-xs bg-primary/20 text-primary">
            {profile?.username?.[0]?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        {/* Presence dot */}
        <span
          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${statusColors[presence.status]} ${isOnline ? "animate-pulse" : ""}`}
          title={statusLabels[presence.status]}
        />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate block">
          {profile?.username || "Unknown"}
        </span>
        <span className="text-[10px] text-muted-foreground truncate block">
          {presence.status === "client" && presence.server_ip
            ? `Playing on ${presence.server_ip}`
            : presence.activity
            ? presence.activity
            : statusLabels[presence.status]}
        </span>
      </div>
      {unreadCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="h-5 min-w-[1.25rem] px-1 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-bold"
        >
          {unreadCount}
        </motion.span>
      )}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        {isOnline && (
          <button
            onClick={onInvite}
            className="h-7 w-7 rounded-full hover:bg-amber-500/20 flex items-center justify-center text-muted-foreground hover:text-amber-400 transition-colors"
            title="Invite to play"
          >
            <Sword className="h-3 w-3" />
          </button>
        )}
        <Link
          to={`/user/${profile?.username}`}
          className="h-7 w-7 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
        </Link>
        <button
          onClick={onRemove}
          className="h-7 w-7 rounded-full hover:bg-destructive/20 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
          title="Remove friend"
        >
          <XIcon className="h-3 w-3" />
        </button>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
    </div>
  );
};

/* ── Chat View ───────────────────────────────────────────────── */
const ChatView = ({
  friend,
  messages,
  messageInput,
  setMessageInput,
  onSend,
  sendingMessage,
  onBack,
  currentUserId,
  messagesEndRef,
}: {
  friend: Friendship;
  messages: Message[];
  messageInput: string;
  setMessageInput: (v: string) => void;
  onSend: () => void;
  sendingMessage: boolean;
  onBack: () => void;
  currentUserId: string;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}) => {
  const profile = friend.profile;
  const presence = friend.presence || { status: "offline" };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full max-h-[520px]"
    >
      {/* Chat header */}
      <div className="flex items-center gap-2 p-3 border-b border-border/30">
        <button
          onClick={onBack}
          className="h-7 w-7 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="relative">
          <Avatar className="h-7 w-7">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
              {profile?.username?.[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${statusColors[presence.status]}`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <Link
            to={`/user/${profile?.username}`}
            className="font-display text-sm font-semibold truncate hover:text-primary transition-colors block"
          >
            {profile?.username || "Unknown"}
          </Link>
          <span className="text-[10px] text-muted-foreground">
            {statusLabels[presence.status]}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
            <p className="text-xs text-muted-foreground">
              No messages yet. Say hello!
            </p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMine = msg.sender_id === currentUserId;
            const showTimestamp =
              i === 0 ||
              new Date(msg.created_at).getTime() - new Date(messages[i - 1].created_at).getTime() > 300000;

            return (
              <div key={msg.id}>
                {showTimestamp && (
                  <p className="text-[10px] text-muted-foreground/50 text-center my-2">
                    {formatMessageTime(msg.created_at)}
                  </p>
                )}
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.15 }}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                      isMine
                        ? "gradient-hades text-primary-foreground rounded-br-md"
                        : "bg-secondary/60 text-foreground rounded-bl-md"
                    }`}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border/30">
        <div className="flex gap-2">
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Type a message..."
            className="text-sm h-9 bg-secondary/50 border-border/50 focus:border-primary/50"
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && onSend()}
            disabled={sendingMessage}
          />
          <Button
            size="sm"
            onClick={onSend}
            disabled={sendingMessage || !messageInput.trim()}
            className="gradient-hades h-9 w-9 p-0 flex-shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

function formatMessageTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);

  if (days === 0) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (days === 1) {
    return "Yesterday " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else {
    return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
}

export default FriendsOverlay;
