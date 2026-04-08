import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const DISCORD_ICON = (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
  </svg>
);

const DiscordLinkPrompt = () => {
  const { user, profile } = useAuth();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    // Safe to read sessionStorage in initializer
    return false;
  });

  const discordLinked = !!(profile as any)?.discord_id;

  // Check sessionStorage dismissal in effect, not during render
  useEffect(() => {
    if (user && typeof window !== "undefined") {
      const key = `discord_prompt_dismissed_${user.id}`;
      if (sessionStorage.getItem(key)) setDismissed(true);
    }
  }, [user]);

  if (!user || !profile || discordLinked || dismissed) return null;

  const handleLink = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const redirect = encodeURIComponent(window.location.pathname);
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/discord-oauth?redirect=${redirect}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data?.url) {
      window.location.href = data.url;
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (user) sessionStorage.setItem(`discord_prompt_dismissed_${user.id}`, "1");
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="glass border border-[#5865F2]/30 rounded-xl p-5 shadow-lg shadow-[#5865F2]/10">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-[#5865F2]/10 text-[#5865F2] shrink-0">
            {DISCORD_ICON}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Link your Discord</p>
            <p className="text-xs text-muted-foreground">
              Connect your Discord account to unlock community features and stay synced.
            </p>
            <Button
              size="sm"
              onClick={handleLink}
              className="bg-[#5865F2] hover:bg-[#4752C4] text-white gap-1.5 mt-1"
            >
              {DISCORD_ICON}
              Connect Discord
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscordLinkPrompt;
