import { useState, useEffect } from "react";
import { Upload, Image, Trash2, Plus, GripVertical } from "lucide-react";
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

const FIXED_SLOTS: MediaSlot[] = [
  { label: "Homepage Hero Image", settingsKey: "hero_image", storagePath: "preview/hero.png", description: "Main hero section preview image" },
];

const DashboardMedia = () => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [carouselCount, setCarouselCount] = useState(0);

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
      const val = data.value as Record<string, string>;
      setPreviews(val);
      // Count carousel slots
      let count = 0;
      while (val[`carousel_${count}`]) count++;
      // Also count legacy showcase slots as carousel
      if (count === 0) {
        if (val.showcase_1) count++;
        if (val.showcase_2) count++;
      }
      setCarouselCount(count);
    }
  };

  const allSlots: MediaSlot[] = [
    ...FIXED_SLOTS,
    // Legacy showcase slots (if they exist in data)
    ...(previews.showcase_1 && !Object.keys(previews).some(k => k.startsWith("carousel_"))
      ? [
          { label: "Showcase 1 (Legacy)", settingsKey: "showcase_1", storagePath: "preview/showcase-1.png", description: "Legacy showcase — will be replaced by carousel" },
          ...(previews.showcase_2 ? [{ label: "Showcase 2 (Legacy)", settingsKey: "showcase_2", storagePath: "preview/showcase-2.png", description: "Legacy showcase" }] : []),
        ]
      : []),
    // Carousel slots
    ...Array.from({ length: carouselCount }, (_, i) => ({
      label: `Carousel Image ${i + 1}`,
      settingsKey: `carousel_${i}`,
      storagePath: `preview/carousel-${i}.png`,
      description: `Showcase carousel slide ${i + 1}`,
    })),
  ];

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

      // Re-index carousel slots if it's a carousel item
      if (slot.settingsKey.startsWith("carousel_")) {
        const remaining: string[] = [];
        let i = 0;
        while (newPreviews[`carousel_${i}`] !== undefined || i <= carouselCount) {
          if (newPreviews[`carousel_${i}`] && `carousel_${i}` !== slot.settingsKey) {
            remaining.push(newPreviews[`carousel_${i}`]);
          }
          delete newPreviews[`carousel_${i}`];
          i++;
        }
        remaining.forEach((url, idx) => {
          newPreviews[`carousel_${idx}`] = url;
        });
        setCarouselCount(remaining.length);
      }

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

  const addCarouselSlot = () => {
    setCarouselCount((c) => c + 1);
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
          Upload preview images for the homepage hero and download page carousel.
        </p>
        <div className="space-y-4">
          {allSlots.map((slot) => (
            <div key={slot.settingsKey} className="p-4 rounded-lg bg-secondary/30 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  {slot.settingsKey.startsWith("carousel_") && (
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">{slot.label}</p>
                    <p className="text-xs text-muted-foreground">{slot.description}</p>
                  </div>
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

          {/* Add carousel slide button */}
          <Button variant="outline" size="sm" className="w-full text-xs" onClick={addCarouselSlot}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Carousel Slide
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardMedia;
