import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProfileBadges from "@/components/profile/ProfileBadges";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PublicProfile {
  username: string;
  avatar_url: string | null;
  description: string | null;
  created_at: string;
  user_id: string;
  banner_url: string | null;
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const UserProfile = () => {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("username, avatar_url, description, created_at, user_id, banner_url")
        .eq("username", username)
        .single();

      if (!profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(profileData as unknown as PublicProfile);

      const [rolesRes, configsRes, subRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", profileData.user_id),
        supabase.from("configs").select("id, name, category, downloads, rating, is_official").eq("user_id", profileData.user_id).order("created_at", { ascending: false }),
        supabase.from("subscriptions").select("status, current_period_end").eq("user_id", profileData.user_id).eq("status", "active").maybeSingle(),
      ]);

      setRoles((rolesRes.data || []).map((r) => r.role));
      setConfigs(configsRes.data || []);
      setHasSubscription(!!subRes.data && new Date(subRes.data.current_period_end!) > new Date());
      setLoading(false);
    };

    fetchProfile();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-16 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">User Not Found</h1>
            <p className="text-muted-foreground">No user with that username exists.</p>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <Navbar />

      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-32 right-1/4 w-[400px] h-[400px] rounded-full bg-primary/3 blur-[150px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] rounded-full bg-accent/3 blur-[120px]" />
      </div>

      <main className="container relative z-10 mx-auto px-4 pt-24 pb-16 max-w-4xl">
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
          {/* Profile Header with Banner */}
          <motion.div variants={fadeUp}>
            <Card className="glass border-border/30 overflow-hidden p-0">
              {/* Banner */}
              <div className="relative h-36 sm:h-44 w-full overflow-hidden">
                {profile.banner_url ? (
                  <img
                    src={profile.banner_url}
                    alt={`${profile.username}'s banner`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full gradient-hades opacity-20" />
                )}
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent" />
              </div>
              <CardContent className="px-8 pb-8 -mt-14 relative z-10">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <Avatar className="h-24 w-24 border-4 border-background ring-2 ring-primary/30">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-2xl font-display">
                      {profile.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-center sm:text-left space-y-3">
                    <h1 className="text-3xl font-display font-bold gradient-hades-text">{profile.username}</h1>
                    <ProfileBadges roles={roles} createdAt={profile.created_at} hasSubscription={hasSubscription} userId={profile.user_id} />
                    {profile.description && (
                      <p className="text-muted-foreground text-sm">{profile.description}</p>
                    )}
                    <p className="text-muted-foreground text-xs flex items-center gap-1.5 justify-center sm:justify-start">
                      <Calendar className="h-3 w-3" />
                      Member since {new Date(profile.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* User's Public Configs */}
          {configs.length > 0 && (
            <motion.div variants={fadeUp}>
              <Card className="glass border-border/30">
                <CardHeader>
                  <CardTitle className="font-display text-xl flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Configs
                    <span className="text-sm font-normal text-muted-foreground">({configs.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {configs.map((config, i) => (
                      <motion.div
                        key={config.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">{config.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {config.category} · {config.downloads} downloads · ★ {Number(config.rating).toFixed(1)}
                          </p>
                        </div>
                        {config.is_official && (
                          <span className="text-[10px] font-display font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            Official
                          </span>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {configs.length === 0 && (
            <motion.div variants={fadeUp}>
              <Card className="glass border-border/30">
                <CardContent className="py-12 text-center">
                  <Package className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">This user hasn't shared any configs yet.</p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default UserProfile;
