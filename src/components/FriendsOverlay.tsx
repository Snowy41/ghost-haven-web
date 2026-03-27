import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, X, UserPlus, Check, XIcon, MessageCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

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
}

const FriendsOverlay = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"friends" | "requests" | "add">("friends");
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingReceived, setPendingReceived] = useState<Friendship[]>([]);
  const [pendingSent, setPendingSent] = useState<Friendship[]>([]);
  const [searchUsername, setSearchUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchFriendships = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (!data) return;

    // Get all unique friend user IDs
    const friendUserIds = data.map((f) =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );

    // Fetch profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username, avatar_url")
      .in("user_id", friendUserIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

    const withProfiles = data.map((f) => ({
      ...f,
      profile: profileMap.get(
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      ),
    }));

    setFriends(withProfiles.filter((f) => f.status === "accepted"));
    setPendingReceived(
      withProfiles.filter((f) => f.status === "pending" && f.addressee_id === user.id)
    );
    setPendingSent(
      withProfiles.filter((f) => f.status === "pending" && f.requester_id === user.id)
    );
  };

  useEffect(() => {
    if (user && open) fetchFriendships();
  }, [user, open]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("friendships-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships" },
        () => {
          fetchFriendships();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleAddFriend = async () => {
    if (!user || !searchUsername.trim()) return;
    setLoading(true);

    // Find user by username
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

    // Check if friendship already exists
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
      toast({ title: `Friend request sent to ${targetProfile.username}` });
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

  if (!user) return null;

  const pendingCount = pendingReceived.length;

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full gradient-hades glow-orange flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
        whileTap={{ scale: 0.95 }}
      >
        <Users className="h-6 w-6 text-white" />
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center font-bold">
            {pendingCount}
          </span>
        )}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-6 z-50 w-80 max-h-[480px] rounded-2xl glass border border-border/50 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <h3 className="font-display text-sm font-bold tracking-wide text-foreground">
                Friends
              </h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border/30">
              {(["friends", "requests", "add"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 text-xs font-medium capitalize transition-colors relative ${
                    tab === t
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "requests" && pendingCount > 0 && (
                    <span className="absolute top-1 right-2 h-2 w-2 rounded-full bg-primary" />
                  )}
                  {t}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {tab === "friends" && (
                <>
                  {friends.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      No friends yet. Add some!
                    </p>
                  ) : (
                    friends.map((f) => (
                      <FriendRow
                        key={f.id}
                        friendship={f}
                        onRemove={() => handleReject(f.id)}
                      />
                    ))
                  )}
                </>
              )}

              {tab === "requests" && (
                <>
                  {pendingReceived.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium px-1">Received</p>
                      {pendingReceived.map((f) => (
                        <div key={f.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
                          <Avatar className="h-8 w-8">
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
                            className="h-7 w-7 rounded-full bg-primary/20 text-primary hover:bg-primary/30 flex items-center justify-center"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleReject(f.id)}
                            className="h-7 w-7 rounded-full bg-destructive/20 text-destructive hover:bg-destructive/30 flex items-center justify-center"
                          >
                            <XIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {pendingSent.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <p className="text-xs text-muted-foreground font-medium px-1">Sent</p>
                      {pendingSent.map((f) => (
                        <div key={f.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={f.profile?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs bg-primary/20 text-primary">
                              {f.profile?.username?.[0]?.toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="flex-1 text-sm font-medium truncate">
                            {f.profile?.username || "Unknown"}
                          </span>
                          <span className="text-xs text-muted-foreground">Pending</span>
                          <button
                            onClick={() => handleReject(f.id)}
                            className="h-7 w-7 rounded-full bg-destructive/20 text-destructive hover:bg-destructive/30 flex items-center justify-center"
                          >
                            <XIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {pendingReceived.length === 0 && pendingSent.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">No pending requests</p>
                  )}
                </>
              )}

              {tab === "add" && (
                <div className="space-y-3 py-2">
                  <p className="text-xs text-muted-foreground">Enter a username to send a friend request.</p>
                  <div className="flex gap-2">
                    <Input
                      value={searchUsername}
                      onChange={(e) => setSearchUsername(e.target.value)}
                      placeholder="Username..."
                      className="text-sm h-9 bg-secondary/50 border-border/50"
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
    </>
  );
};

const FriendRow = ({
  friendship,
  onRemove,
}: {
  friendship: Friendship;
  onRemove: () => void;
}) => {
  const profile = friendship.profile;

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/30 transition-colors group">
      <Avatar className="h-8 w-8">
        <AvatarImage src={profile?.avatar_url || undefined} />
        <AvatarFallback className="text-xs bg-primary/20 text-primary">
          {profile?.username?.[0]?.toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>
      <span className="flex-1 text-sm font-medium truncate">
        {profile?.username || "Unknown"}
      </span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link
          to={`/user/${profile?.username}`}
          className="h-7 w-7 rounded-full bg-secondary/50 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="h-3 w-3" />
        </Link>
        <button
          onClick={onRemove}
          className="h-7 w-7 rounded-full bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center text-destructive"
          title="Remove friend"
        >
          <XIcon className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};

export default FriendsOverlay;
