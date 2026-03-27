import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Coins, Clock, ArrowUpRight, ArrowDownRight, Package, Sparkles, TrendingUp } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AvatarUpload from "@/components/profile/AvatarUpload";
import BannerUpload from "@/components/profile/BannerUpload";
import UserConfigsList from "@/components/profile/UserConfigsList";
import ProfileBadges from "@/components/profile/ProfileBadges";
import DiscordLink from "@/components/profile/DiscordLink";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
}

const descriptionSchema = z.string().max(200, "Description must be under 200 characters").optional();

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const Profile = () => {
  const { user, profile, loading, refreshProfile, roles } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState("");
  const [hasSubscription, setHasSubscription] = useState(false);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  const canUploadBanner = roles.includes("owner") || roles.includes("admin") || roles.includes("moderator") || roles.includes("beta") || hasSubscription;

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (profile) {
      setDescription(profile.description || "");
      // Fetch banner_url separately since it's not in the Profile interface
      if (user) {
        supabase.from("profiles").select("banner_url").eq("user_id", user.id).single().then(({ data }) => {
          setBannerUrl((data as any)?.banner_url || null);
        });
      }
    }
  }, [profile, user]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("subscriptions").select("status, current_period_end").eq("user_id", user.id).eq("status", "active").maybeSingle(),
    ]).then(([txRes, subRes]) => {
      if (txRes.data) setTransactions(txRes.data);
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
    purchase: { label: "Purchase", color: "text-emerald-400", icon: ArrowDownRight },
    withdrawal: { label: "Withdrawal", color: "text-destructive", icon: ArrowUpRight },
    config_buy: { label: "Config Bought", color: "text-destructive", icon: ArrowUpRight },
    config_sale: { label: "Config Sale", color: "text-emerald-400", icon: ArrowDownRight },
    subscription: { label: "Subscription", color: "text-destructive", icon: ArrowUpRight },
  };

  const totalEarned = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalSpent = Math.abs(transactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <Navbar />

      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-32 right-1/4 w-[400px] h-[400px] rounded-full bg-primary/3 blur-[150px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-accent/3 blur-[120px]" />
      </div>

      <main className="container relative z-10 mx-auto px-4 pt-24 pb-16 max-w-4xl">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {/* Profile Header with Banner */}
          <motion.div variants={fadeUp}>
            <Card className="glass border-border/30 overflow-hidden">
              <BannerUpload bannerUrl={bannerUrl} canUpload={canUploadBanner} />
              <CardContent className="p-8 -mt-12 relative z-10">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="ring-4 ring-background rounded-full">
                    <AvatarUpload />
                  </div>
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
                          <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground text-xs">
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
          </motion.div>

          {/* Discord Link */}
          <motion.div variants={fadeUp}>
            <DiscordLink />
          </motion.div>

          {/* Stats */}
          <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="glass border-border/30 group hover:border-primary/30 transition-all duration-300 hover:glow-red">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Coins className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Hades Coins</p>
                  <p className="text-2xl font-display font-bold text-foreground">{profile.hades_coins}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass border-border/30 group hover:border-primary/30 transition-all duration-300 hover:glow-red">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Earned</p>
                  <p className="text-2xl font-display font-bold text-emerald-400">+{totalEarned}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass border-border/30 group hover:border-primary/30 transition-all duration-300 hover:glow-red">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <ArrowUpRight className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Spent</p>
                  <p className="text-2xl font-display font-bold text-destructive">-{totalSpent}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* User's Configs */}
          <motion.div variants={fadeUp}>
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
          </motion.div>

          {/* Transaction History */}
          <motion.div variants={fadeUp}>
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
                    <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p>No transactions yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((tx, i) => {
                      const config = typeConfig[tx.type] || { label: tx.type, color: "text-foreground", icon: ArrowUpRight };
                      const Icon = config.icon;
                      return (
                        <motion.div
                          key={tx.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg bg-secondary/50 ${config.color}`}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{config.label}</p>
                              {tx.description && <p className="text-xs text-muted-foreground">{tx.description}</p>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-semibold ${tx.amount > 0 ? "text-emerald-400" : "text-destructive"}`}>
                              {tx.amount > 0 ? "+" : ""}{tx.amount}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(tx.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
