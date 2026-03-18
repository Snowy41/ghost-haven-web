import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Coins, Clock, ArrowUpRight, ArrowDownRight, Package } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AvatarUpload from "@/components/profile/AvatarUpload";
import UserConfigsList from "@/components/profile/UserConfigsList";
import ProfileBadges from "@/components/profile/ProfileBadges";
import DiscordLink from "@/components/profile/DiscordLink";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
}

const usernameSchema = z.string()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be less than 20 characters")
  .regex(/^[a-zA-Z0-9_-]+$/, "Only letters, numbers, dashes and underscores allowed");

const descriptionSchema = z.string().max(200, "Description must be under 200 characters").optional();

const Profile = () => {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [description, setDescription] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [hasSubscription, setHasSubscription] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setDescription(profile.description || "");
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    // Fetch transactions, roles, subscription in parallel
    Promise.all([
      supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase.from("subscriptions").select("status, current_period_end").eq("user_id", user.id).eq("status", "active").maybeSingle(),
    ]).then(([txRes, rolesRes, subRes]) => {
      if (txRes.data) setTransactions(txRes.data);
      setRoles((rolesRes.data || []).map((r) => r.role));
      setHasSubscription(!!subRes.data && new Date(subRes.data.current_period_end!) > new Date());
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    const trimmedDesc = description.trim();

    const descValidation = descriptionSchema.safeParse(trimmedDesc);
    if (!descValidation.success) {
      toast({ title: "Invalid description", description: descValidation.error.errors[0].message, variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ description: trimmedDesc || null } as any)
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
    } else {
      toast({ title: "Updated", description: "Profile saved." });
      await refreshProfile();
      setEditing(false);
    }
  };

  const typeConfig: Record<string, { label: string; color: string; icon: typeof ArrowUpRight }> = {
    purchase: { label: "Purchase", color: "text-green-400", icon: ArrowDownRight },
    withdrawal: { label: "Withdrawal", color: "text-red-400", icon: ArrowUpRight },
    config_buy: { label: "Config Bought", color: "text-red-400", icon: ArrowUpRight },
    config_sale: { label: "Config Sale", color: "text-green-400", icon: ArrowDownRight },
    subscription: { label: "Subscription", color: "text-red-400", icon: ArrowUpRight },
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          {/* Profile Header */}
          <Card className="glass border-border/30">
            <CardContent className="p-8">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <AvatarUpload />
                <div className="flex-1 text-center sm:text-left space-y-3">
                  {editing ? (
                    <div className="space-y-3">
                      <h1 className="text-3xl font-display font-bold gradient-hades-text">{profile.username}</h1>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="bg-secondary border-border resize-none"
                        placeholder="Tell others about yourself... (max 200 chars)"
                        maxLength={200}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSave} className="gradient-hades">Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDescription(profile.description || ""); }}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 justify-center sm:justify-start">
                        <h1 className="text-3xl font-display font-bold gradient-hades-text">{profile.username}</h1>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground">
                          Edit
                        </Button>
                      </div>
                      <ProfileBadges roles={roles} createdAt={profile.created_at || ""} hasSubscription={hasSubscription} userId={user?.id} />
                      {profile.description && (
                        <p className="text-muted-foreground text-sm">{profile.description}</p>
                      )}
                    </>
                  )}
                  <p className="text-muted-foreground text-xs">
                    Member since {new Date(profile.created_at || "").toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="glass border-border/30">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Coins className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hades Coins</p>
                  <p className="text-2xl font-display font-bold text-foreground">{profile.hades_coins}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass border-border/30">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <ArrowDownRight className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Earned</p>
                  <p className="text-2xl font-display font-bold text-foreground">
                    {transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass border-border/30">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <ArrowUpRight className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <p className="text-2xl font-display font-bold text-foreground">
                    {Math.abs(transactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0))}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* User's Configs */}
          <Card className="glass border-border/30">
            <CardHeader>
              <CardTitle className="font-display text-xl flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                My Configs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UserConfigsList />
            </CardContent>
          </Card>

          {/* Transaction History */}
          <Card className="glass border-border/30">
            <CardHeader>
              <CardTitle className="font-display text-xl flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Transaction History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Coins className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No transactions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => {
                    const config = typeConfig[tx.type] || { label: tx.type, color: "text-foreground", icon: ArrowUpRight };
                    const Icon = config.icon;
                    return (
                      <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Icon className={`h-4 w-4 ${config.color}`} />
                          <div>
                            <p className="text-sm font-medium text-foreground">{config.label}</p>
                            {tx.description && <p className="text-xs text-muted-foreground">{tx.description}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${tx.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                            {tx.amount > 0 ? "+" : ""}{tx.amount}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
