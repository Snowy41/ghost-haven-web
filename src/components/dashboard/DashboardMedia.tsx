import { useState, useEffect } from "react";
import { Upload, Image, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface MediaSlot {
  label: string;
  settingsKey: string;
  storagePath: string;
  description: string;
}

const MEDIA_SLOTS: MediaSlot[] = [
  { label: "Homepage Hero Image", settingsKey: "hero_image", storagePath: "preview/hero.png", description: "Main hero section preview image" },
  { label: "Download Showcase 1", settingsKey: "showcase_1", storagePath: "preview/showcase-1.png", description: "First showcase image on the download page" },
  { label: "Download Showcase 2", settingsKey: "showcase_2", storagePath: "preview/showcase-2.png", description: "Second showcase image on the download page" },
];

const DashboardMedia = () => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPreviews();
  }, []);

  const fetchPreviews = async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("key, value")
      .eq("key", "preview_images")
      .maybeSingle();

    if (data?.value && typeof data.value === "object") {
      setPreviews(data.value as Record<string, string>);
    }
  };

  const handleUpload = async (slot: MediaSlot, file: File) => {
    setUploading((p) => ({ ...p, [slot.settingsKey]: true }));
    try {
      const { error: uploadError } = await supabase.storage
        .from("website-assets")
        .upload(slot.storagePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("website-assets")
        .getPublicUrl(slot.storagePath);

      const imageUrl = urlData.publicUrl + "?t=" + Date.now();

      // Update site_settings
      const newPreviews = { ...previews, [slot.settingsKey]: imageUrl };
      const { error: settingsError } = await supabase
        .from("site_settings")
        .upsert(
          { key: "preview_images", value: newPreviews as any, updated_by: (await supabase.auth.getUser()).data.user?.id },
          { onConflict: "key" }
        );
      if (settingsError) throw settingsError;

      setPreviews(newPreviews);
      toast({ title: "Uploaded!", description: `${slot.label} updated successfully.` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading((p) => ({ ...p, [slot.settingsKey]: false }));
    }
  };

  const handleRemove = async (slot: MediaSlot) => {
    try {
      await supabase.storage.from("website-assets").remove([slot.storagePath]);
      const newPreviews = { ...previews };
      delete newPreviews[slot.settingsKey];
      await supabase
        .from("site_settings")
        .upsert(
          { key: "preview_images", value: newPreviews as any, updated_by: (await supabase.auth.getUser()).data.user?.id },
          { onConflict: "key" }
        );
      setPreviews(newPreviews);
      toast({ title: "Removed", description: `${slot.label} removed.` });
    } catch (err: any) {
      toast({ title: "Remove failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Card className="glass border-border/30">
      <CardHeader>
        <CardTitle className="font-display text-xl flex items-center gap-2">
          <Image className="h-5 w-5 text-primary" /> Website Media
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-6">
          Upload preview images for the homepage hero and download page showcases.
        </p>
        <div className="space-y-4">
          {MEDIA_SLOTS.map((slot) => (
            <div key={slot.settingsKey} className="p-4 rounded-lg bg-secondary/30 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{slot.label}</p>
                  <p className="text-xs text-muted-foreground">{slot.description}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {previews[slot.settingsKey] && (
                    <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => handleRemove(slot)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <label>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUpload(slot, f);
                        e.target.value = "";
                      }}
                      disabled={uploading[slot.settingsKey]}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer text-xs"
                      disabled={uploading[slot.settingsKey]}
                      asChild
                    >
                      <span>
                        {uploading[slot.settingsKey] ? "Uploading..." : previews[slot.settingsKey] ? "Replace" : "Upload"}
                        <Upload className="ml-1.5 h-3.5 w-3.5" />
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
              {previews[slot.settingsKey] && (
                <div className="rounded-md overflow-hidden border border-border/20">
                  <img
                    src={previews[slot.settingsKey]}
                    alt={slot.label}
                    className="w-full h-32 object-cover"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardMedia;
