import { useEffect, useState, useCallback } from "react";
import { Award, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface BadgeRow {
  id: string;
  user_id: string;
  badge_name: string;
  badge_icon: string;
  badge_color: string;
  created_at: string;
  username?: string;
}

const BADGE_COLORS = [
  { value: "purple", label: "Purple", cls: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { value: "red", label: "Red", cls: "bg-red-500/20 text-red-400 border-red-500/30" },
  { value: "green", label: "Green", cls: "bg-green-500/20 text-green-400 border-green-500/30" },
  { value: "blue", label: "Blue", cls: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { value: "yellow", label: "Yellow", cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  { value: "orange", label: "Orange", cls: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  { value: "pink", label: "Pink", cls: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
  { value: "cyan", label: "Cyan", cls: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  { value: "emerald", label: "Emerald", cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
];

const BADGE_ICONS = ["award", "star", "zap", "flame", "heart", "gem", "trophy", "target", "sword", "shield", "medal", "sparkles"];

const DashboardBadges = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [targetUsername, setTargetUsername] = useState("");
  const [badgeName, setBadgeName] = useState("");
  const [badgeIcon, setBadgeIcon] = useState("award");
  const [badgeColor, setBadgeColor] = useState("purple");

  const fetchBadges = useCallback(async () => {
    const { data } = await supabase
      .from("user_badges")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (!data) { setBadges([]); return; }

    const userIds = [...new Set(data.map((b: any) => b.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, username").in("user_id", userIds);
    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.username]));

    setBadges(data.map((b: any) => ({ ...b, username: profileMap.get(b.user_id) || "Unknown" })));
  }, []);

  useEffect(() => { fetchBadges(); }, [fetchBadges]);

  const assignBadge = async () => {
    if (!user || !targetUsername.trim() || !badgeName.trim()) {
      toast({ title: "Fill all fields", variant: "destructive" });
      return;
    }

    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("username", targetUsername.trim())
      .single();

    if (!targetProfile) {
      toast({ title: "User not found", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("user_badges").insert({
      user_id: targetProfile.user_id,
      badge_name: badgeName.trim(),
      badge_icon: badgeIcon,
      badge_color: badgeColor,
      assigned_by: user.id,
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message.includes("duplicate") ? "User already has this badge" : error.message, variant: "destructive" });
    } else {
      toast({ title: `Badge "${badgeName}" assigned to ${targetUsername}` });
      setTargetUsername("");
      setBadgeName("");
      fetchBadges();
    }
  };

  const removeBadge = async (id: string) => {
    const { error } = await supabase.from("user_badges").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Badge removed" });
      fetchBadges();
    }
  };

  const getColorCls = (color: string) => BADGE_COLORS.find((c) => c.value === color)?.cls || BADGE_COLORS[0].cls;

  return (
    <Card className="glass border-border/30">
      <CardHeader>
        <CardTitle className="font-display text-xl flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" /> Badge Management ({badges.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Assign badge form */}
        <div className="p-4 rounded-lg bg-secondary/30 space-y-3">
          <p className="text-sm font-medium text-foreground">Assign New Badge</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              placeholder="Username"
              value={targetUsername}
              onChange={(e) => setTargetUsername(e.target.value)}
              className="bg-secondary border-border"
            />
            <Input
              placeholder="Badge name (e.g. Beta Tester)"
              value={badgeName}
              onChange={(e) => setBadgeName(e.target.value)}
              className="bg-secondary border-border"
            />
            <Select value={badgeIcon} onValueChange={setBadgeIcon}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BADGE_ICONS.map((icon) => (
                  <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={badgeColor} onValueChange={setBadgeColor}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BADGE_COLORS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={assignBadge} className="gradient-hades">
            <Plus className="h-3.5 w-3.5 mr-1" /> Assign Badge
          </Button>
        </div>

        {/* Existing badges */}
        <div className="space-y-2">
          {badges.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={getColorCls(b.badge_color)}>
                  <Award className="h-3 w-3 mr-1" />
                  {b.badge_name}
                </Badge>
                <span className="text-sm text-muted-foreground">→ {b.username}</span>
              </div>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeBadge(b.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          {badges.length === 0 && <p className="text-center text-muted-foreground py-8">No badges assigned yet.</p>}
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardBadges;
