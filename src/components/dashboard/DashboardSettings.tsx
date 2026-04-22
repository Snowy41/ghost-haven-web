import { useEffect, useState } from "react";
import { Settings, Activity, FlaskConical } from "lucide-react";
import { FaDiscord } from "react-icons/fa";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DEFAULT_DISCORD_INVITE } from "@/hooks/useDiscordInvite";

const DashboardSettings = () => {
  const [realtimeStats, setRealtimeStats] = useState(false);
  const [betaDays, setBetaDays] = useState(30);
  const [discordUrl, setDiscordUrl] = useState(DEFAULT_DISCORD_INVITE);
  const [savingDiscord, setSavingDiscord] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("site_settings").select("value").eq("key", "realtime_stats").maybeSingle(),
      supabase.from("site_settings").select("value").eq("key", "beta_duration_days").maybeSingle(),
      supabase.from("site_settings").select("value").eq("key", "discord_invite_url").maybeSingle(),
    ]).then(([statsRes, betaRes, discordRes]) => {
      if (statsRes.data?.value && typeof statsRes.data.value === "object" && "enabled" in statsRes.data.value) {
        setRealtimeStats((statsRes.data.value as any).enabled === true);
      }
      if (betaRes.data?.value && typeof betaRes.data.value === "object" && "days" in betaRes.data.value) {
        setBetaDays((betaRes.data.value as any).days);
      }
      if (discordRes.data?.value && typeof discordRes.data.value === "object" && "url" in discordRes.data.value) {
        const u = (discordRes.data.value as any).url;
        if (typeof u === "string" && u.trim()) setDiscordUrl(u);
      }
      setLoading(false);
    });
  }, []);

  const saveDiscordUrl = async () => {
    const trimmed = discordUrl.trim();
    if (!/^https?:\/\/(discord\.gg|discord\.com|discordapp\.com)\//i.test(trimmed)) {
      toast.error("Must be a valid Discord invite URL");
      return;
    }
    setSavingDiscord(true);
    const { error } = await supabase
      .from("site_settings")
      .upsert(
        { key: "discord_invite_url", value: { url: trimmed } as any, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    setSavingDiscord(false);
    if (error) toast.error("Failed to update Discord URL");
    else toast.success("Discord invite link updated");
  };

  const toggleRealtimeStats = async (enabled: boolean) => {
    setRealtimeStats(enabled);
    const { error } = await supabase
      .from("site_settings")
      .update({ value: { enabled } as any, updated_at: new Date().toISOString() })
      .eq("key", "realtime_stats");

    if (error) {
      setRealtimeStats(!enabled);
      toast.error("Failed to update setting");
    } else {
      toast.success(`Realtime stats ${enabled ? "enabled" : "disabled"}`);
    }
  };

  if (loading) return null;

  return (
    <Card className="glass border-border/30">
      <CardHeader>
        <CardTitle className="font-display text-xl flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" /> Site Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-primary" />
            <div>
              <Label className="text-foreground font-medium">Realtime Homepage Stats</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Replace static homepage numbers with live database stats that update in realtime.
              </p>
            </div>
          </div>
          <Switch checked={realtimeStats} onCheckedChange={toggleRealtimeStats} />
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
          <div className="flex items-center gap-3">
            <FlaskConical className="h-5 w-5 text-primary" />
            <div>
              <Label className="text-foreground font-medium">Beta Tester Duration</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                How many days beta testers get unlimited subscription access when assigned the beta role.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={365}
              value={betaDays}
              onChange={(e) => setBetaDays(Number(e.target.value))}
              className="w-20 h-9 text-sm bg-secondary border-border"
            />
            <span className="text-xs text-muted-foreground">days</span>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const { error } = await supabase
                  .from("site_settings")
                  .update({ value: { days: betaDays } as any, updated_at: new Date().toISOString() })
                  .eq("key", "beta_duration_days");
                if (error) toast.error("Failed to update");
                else toast.success(`Beta duration set to ${betaDays} days`);
              }}
            >
              Save
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <FaDiscord className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <Label className="text-foreground font-medium">Discord Invite Link</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Used by the footer "Discord Support" button across the site.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="url"
              value={discordUrl}
              onChange={(e) => setDiscordUrl(e.target.value)}
              placeholder="https://discord.gg/your-invite"
              className="w-72 h-9 text-sm bg-secondary border-border"
            />
            <Button size="sm" variant="outline" disabled={savingDiscord} onClick={saveDiscordUrl}>
              Save
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardSettings;
