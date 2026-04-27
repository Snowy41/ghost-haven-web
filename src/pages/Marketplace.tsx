import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import ConfigCard from "@/components/marketplace/ConfigCard";
import UploadConfigDialog from "@/components/marketplace/UploadConfigDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const CATEGORIES = ["All", "PvP", "Bypass", "Movement", "HvH", "Utility"];

interface ConfigRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  is_official: boolean;
  has_file: boolean;
  downloads: number;
  rating: number;
  rating_count: number;
  created_at: string;
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const Marketplace = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [configs, setConfigs] = useState<(ConfigRow & { author_name: string })[]>([]);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchConfigs = useCallback(async () => {
    const { data: configsData } = await supabase
      .from("configs")
      .select("id, user_id, name, description, category, price, is_official, downloads, rating, rating_count, created_at")
      .order("created_at", { ascending: false });

    if (!configsData) { setConfigs([]); setLoading(false); return; }

    const userIds = [...new Set(configsData.map((c) => c.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.username]));

    setConfigs(
      configsData.map((c) => ({
        ...c,
        has_file: true,
        author_name: profileMap.get(c.user_id) || "Unknown",
      }))
    );
    setLoading(false);
  }, []);

  const fetchPurchases = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("config_purchases")
      .select("config_id")
      .eq("user_id", user.id);
    setPurchasedIds(new Set((data || []).map((p) => p.config_id)));
  }, [user]);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);
  useEffect(() => { fetchPurchases(); }, [fetchPurchases]);

  const handleRefresh = () => { fetchConfigs(); fetchPurchases(); };

  const filtered = configs.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.author_name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "All" || c.category === category;
    return matchSearch && matchCategory;
  });

  return (
    <div className="min-h-screen bg-background relative">
      <SEOHead
        title="Minecraft Cheat Configs — Marketplace"
        description="Browse and download cheat configs for the Hades Minecraft hack client. PvP configs, bypass presets, movement hacks, and utility setups shared by the community."
        path="/marketplace"
      />
      <Navbar />

      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 right-1/3 w-[450px] h-[450px] rounded-full bg-primary/3 blur-[160px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[350px] h-[350px] rounded-full bg-accent/3 blur-[130px]" />
      </div>

      <main className="pt-24 relative z-10">
        <motion.div variants={stagger} initial="hidden" animate="show">
          {/* Header */}
          <section className="py-12 text-center">
            <div className="container mx-auto px-4">
              <motion.div variants={fadeUp}>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border-primary/20 text-xs font-display text-primary mb-6">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  Community Marketplace
                </div>
                <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4">
                  Config <span className="gradient-hades-text">Marketplace</span>
                </h1>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  Browse, download, and share configs. Official configs are free.
                </p>
                {user && <UploadConfigDialog onUploaded={handleRefresh} />}
              </motion.div>
            </div>
          </section>

          {/* Filters */}
          <motion.section variants={fadeUp} className="pb-8">
            <div className="container mx-auto px-4">
              <div className="flex flex-col sm:flex-row gap-4 max-w-3xl mx-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search configs..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 glass border-border/50"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {CATEGORIES.map((cat) => (
                    <Button
                      key={cat}
                      size="sm"
                      variant={category === cat ? "default" : "outline"}
                      className={category === cat ? "gradient-hades font-semibold" : "border-border/50 hover:border-primary/30"}
                      onClick={() => setCategory(cat)}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>

          {/* Grid */}
          <section className="pb-24">
            <div className="container mx-auto px-4">
              {loading ? (
                <div className="flex justify-center py-20">
                  <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <motion.div variants={fadeUp} className="text-center py-20 text-muted-foreground">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="text-lg">No configs found</p>
                  <p className="text-sm mt-1">Be the first to upload one!</p>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                  {filtered.map((config, i) => (
                    <motion.div
                      key={config.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <ConfigCard
                        config={config}
                        isPurchased={purchasedIds.has(config.id)}
                        onPurchased={handleRefresh}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default Marketplace;
