import { useState } from "react";
import { Link } from "react-router-dom";
import { Star, Download, BadgeCheck, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Config {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  is_official: boolean;
  downloads: number;
  rating: number;
  rating_count: number;
  user_id: string;
  has_file?: boolean;
  author_name?: string;
}

interface ConfigCardProps {
  config: Config;
  isPurchased: boolean;
  onPurchased: () => void;
}

const ConfigCard = ({ config, isPurchased, onPurchased }: ConfigCardProps) => {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const isOwner = user?.id === config.user_id;
  const canDownload = config.price === 0 || isPurchased || isOwner;

  const handlePurchase = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to purchase configs.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.rpc("purchase_config", { p_config_id: config.id });
      if (error) throw error;
      toast({ title: "Purchased!", description: `You now own "${config.name}".` });
      await refreshProfile();
      onPurchased();
    } catch (err: any) {
      toast({ title: "Purchase failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!config.has_file) return;

    // For free configs not yet "purchased", record the download
    if (config.price === 0 && !isPurchased && !isOwner) {
      try {
        await supabase.rpc("purchase_config", { p_config_id: config.id });
        onPurchased();
      } catch {
        // ignore if already purchased
      }
    }

    // Use signed-URL edge function instead of direct storage access
    const { data, error } = await supabase.functions.invoke("launcher-config-download", {
      body: { config_id: config.id },
    });
    if (error || !data?.url) {
      toast({ title: "Download failed", description: "Could not download config file.", variant: "destructive" });
      return;
    }
    const a = document.createElement("a");
    a.href = data.url;
    a.download = data.filename || "config";
    a.click();
  };

  return (
    <div className="glass rounded-xl p-5 flex flex-col hover:border-primary/30 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display text-sm font-semibold">{config.name}</h3>
            {config.is_official && <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />}
          </div>
          <p className="text-xs text-muted-foreground">
            by{" "}
            <Link to={`/user/${config.author_name}`} className="text-primary hover:underline">
              {config.author_name || "Unknown"}
            </Link>
          </p>
        </div>
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
          {config.category}
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-4 flex-1">{config.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 text-primary" />
            {Number(config.rating).toFixed(1)}
          </span>
          <span className="flex items-center gap-1">
            <Download className="h-3 w-3" />
            {config.downloads.toLocaleString()}
          </span>
        </div>
        {canDownload ? (
          <Button size="sm" className="gradient-hades text-xs" onClick={handleDownload} disabled={!config.file_path}>
            Download
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="text-xs" onClick={handlePurchase} disabled={loading}>
            <span className="flex items-center gap-1">
              <Coins className="h-3 w-3" />
              {config.price}
            </span>
          </Button>
        )}
      </div>
    </div>
  );
};

export default ConfigCard;
