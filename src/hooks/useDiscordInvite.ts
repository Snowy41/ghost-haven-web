import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_INVITE = "https://discord.gg/hades";

export const useDiscordInvite = () => {
  const [url, setUrl] = useState<string>(DEFAULT_INVITE);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "discord_invite_url")
      .maybeSingle()
      .then(({ data }) => {
        const v = data?.value as { url?: string } | null;
        if (v && typeof v.url === "string" && v.url.trim()) setUrl(v.url.trim());
      });
  }, []);

  return url;
};

export const DEFAULT_DISCORD_INVITE = DEFAULT_INVITE;
