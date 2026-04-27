import { useEffect, useState, useCallback } from "react";
import { BarChart3, Users, Package, CreditCard, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Stats {
  totalUsers: number;
  totalConfigs: number;
  totalDownloads: number;
  activeSubs: number;
  totalKeys: number;
  usedKeys: number;
  bannedUsers: number;
}

const DashboardStats = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, totalConfigs: 0, totalDownloads: 0,
    activeSubs: 0, totalKeys: 0, usedKeys: 0, bannedUsers: 0,
  });

  const fetchStats = useCallback(async () => {
    const [usersRes, bannedRes, configsRes, subsRes, keysRes] = await Promise.all([
      supabase.from("profiles").select("user_id"),
      supabase.from("profiles_private").select("user_id").not("banned_at", "is", null),
      supabase.from("configs").select("downloads"),
      supabase.from("subscriptions").select("status").eq("status", "active"),
      supabase.from("invite_keys").select("is_used"),
    ]);

    const users = usersRes.data || [];
    const configs = configsRes.data || [];
    const keys = keysRes.data || [];

    setStats({
      totalUsers: users.length,
      bannedUsers: (bannedRes.data || []).length,
      totalConfigs: configs.length,
      totalDownloads: configs.reduce((sum, c) => sum + (c.downloads || 0), 0),
      activeSubs: (subsRes.data || []).length,
      totalKeys: keys.length,
      usedKeys: keys.filter((k) => k.is_used).length,
    });
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const statCards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, accent: "text-primary" },
    { label: "Banned Users", value: stats.bannedUsers, icon: Users, accent: "text-destructive" },
    { label: "Total Configs", value: stats.totalConfigs, icon: Package, accent: "text-primary" },
    { label: "Total Downloads", value: stats.totalDownloads, icon: TrendingUp, accent: "text-primary" },
    { label: "Active Subs", value: stats.activeSubs, icon: CreditCard, accent: "text-primary" },
    { label: "Keys Used", value: `${stats.usedKeys}/${stats.totalKeys}`, icon: BarChart3, accent: "text-primary" },
  ];

  return (
    <Card className="glass border-border/30">
      <CardHeader>
        <CardTitle className="font-display text-xl flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" /> Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {statCards.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="p-4 rounded-lg bg-secondary/30 space-y-1">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${s.accent}`} />
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
                <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardStats;
