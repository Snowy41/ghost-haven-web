import { useState } from "react";
import { Upload, FileDown, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface FileSlot {
  label: string;
  storagePath: string;
  description: string;
  accept: string;
}

const FILE_SLOTS: FileSlot[] = [
  { label: "Injector (injector.exe)", storagePath: "client/injector.exe", description: "Beta injector executable", accept: ".exe" },
  { label: "Client DLL (hades.dll)", storagePath: "client/hades.dll", description: "Premium client DLL", accept: ".dll" },
  { label: "Client JAR (hades.jar)", storagePath: "client/hades.jar", description: "Production JAR — served to all subscribers", accept: ".jar" },
  { label: "Dev Client JAR (hades-dev.jar)", storagePath: "client/hades-dev.jar", description: "Development branch JAR — moderator+ only", accept: ".jar" },
];

const DashboardFiles = () => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  const handleUpload = async (slot: FileSlot, file: File) => {
    setUploading((p) => ({ ...p, [slot.storagePath]: true }));
    try {
      const { error } = await supabase.storage
        .from("configs")
        .upload(slot.storagePath, file, { upsert: true });
      if (error) throw error;
      toast({ title: "Uploaded!", description: `${slot.label} replaced successfully.` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading((p) => ({ ...p, [slot.storagePath]: false }));
    }
  };

  return (
    <Card className="glass border-border/30">
      <CardHeader>
        <CardTitle className="font-display text-xl flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" /> Client File Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-6">
          Upload or replace client files. These are served to users via the launcher endpoints.
        </p>
        <div className="space-y-4">
          {FILE_SLOTS.map((slot) => (
            <div key={slot.storagePath} className="p-4 rounded-lg bg-secondary/30 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{slot.label}</p>
                <p className="text-xs text-muted-foreground">{slot.description}</p>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">configs/{slot.storagePath}</p>
              </div>
              <label className="flex-shrink-0">
                <input
                  type="file"
                  accept={slot.accept}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(slot, f);
                    e.target.value = "";
                  }}
                  disabled={uploading[slot.storagePath]}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer text-xs"
                  disabled={uploading[slot.storagePath]}
                  asChild
                >
                  <span>
                    {uploading[slot.storagePath] ? "Uploading..." : "Replace File"}
                    <Upload className="ml-1.5 h-3.5 w-3.5" />
                  </span>
                </Button>
              </label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardFiles;
