import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import AnimatedCounter from "@/components/AnimatedCounter";

const staticStats = [
  { key: "users", value: "15000", label: "Active Users", suffix: "+" },
  { key: "uptime", value: "99.9", label: "Uptime", suffix: "%" },
  { key: "configs", value: "500", label: "Configs", suffix: "+" },
  { key: "detections", value: "0", label: "Detections", suffix: "" },
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
        { key: "users", value: String(liveStats.users), label: "Active Users", suffix: "" },
        { key: "uptime", value: "99.9", label: "Uptime", suffix: "%" },
        { key: "configs", value: String(liveStats.configs), label: "Configs", suffix: "" },
        { key: "detections", value: "0", label: "Detections", suffix: "" },
      ]
    : staticStats;

  return (
    <section className="py-20 border-y border-border/20 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-primary/3 blur-[100px]" />
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-accent/3 blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {displayStats.map((stat, i) => (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className="text-center group"
            >
              <div className="font-display text-4xl sm:text-5xl font-bold gradient-hades-text mb-2 transition-transform duration-300 group-hover:scale-110">
                <AnimatedCounter end={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-sm text-muted-foreground font-medium tracking-wide uppercase">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
