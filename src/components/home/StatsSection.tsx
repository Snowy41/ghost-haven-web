import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const staticStats = [
  { key: "users", value: "15K+", label: "Active Users" },
  { key: "uptime", value: "99.9%", label: "Uptime" },
  { key: "configs", value: "500+", label: "Configs" },
  { key: "detections", value: "0", label: "Detections" },
];

const StatsSection = () => {
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const [liveStats, setLiveStats] = useState({ users: 0, configs: 0, downloads: 0, subs: 0 });

  const fetchLiveStats = async () => {
    const [usersRes, configsRes, subsRes] = await Promise.all([
      supabase.from("profiles").select("user_id", { count: "exact", head: true }),
      supabase.from("configs").select("downloads"),
      supabase.from("subscriptions").select("status", { count: "exact", head: true }).eq("status", "active"),
    ]);
    const configs = configsRes.data || [];
    setLiveStats({
      users: usersRes.count || 0,
      configs: configs.length,
      downloads: configs.reduce((s, c) => s + (c.downloads || 0), 0),
      subs: subsRes.count || 0,
    });
  };

  useEffect(() => {
    // Check if realtime stats are enabled
    supabase.from("site_settings").select("value").eq("key", "realtime_stats").single().then(({ data }) => {
      const enabled = data?.value && typeof data.value === "object" && "enabled" in data.value && (data.value as any).enabled === true;
      setRealtimeEnabled(!!enabled);
      if (enabled) fetchLiveStats();
    });
  }, []);

  useEffect(() => {
    if (!realtimeEnabled) return;

    const channel = supabase
      .channel("homepage-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchLiveStats())
      .on("postgres_changes", { event: "*", schema: "public", table: "configs" }, () => fetchLiveStats())
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, () => fetchLiveStats())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [realtimeEnabled]);

  const displayStats = realtimeEnabled
    ? [
        { key: "users", value: liveStats.users.toLocaleString(), label: "Active Users" },
        { key: "uptime", value: "99.9%", label: "Uptime" },
        { key: "configs", value: liveStats.configs.toLocaleString(), label: "Configs" },
        { key: "detections", value: "0", label: "Detections" },
      ]
    : staticStats;

  return (
    <section className="py-16 border-y border-border/20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {displayStats.map((stat, i) => (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="text-center"
            >
              <div className="font-display text-3xl sm:text-4xl font-bold gradient-hades-text mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
