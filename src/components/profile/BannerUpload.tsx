import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Check, X, Move } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface BannerUploadProps {
  bannerUrl: string | null;
  bannerPosition: string;
  canUpload: boolean;
  onBannerChange: (url: string, position: string) => void;
}

const BannerUpload = ({ bannerUrl, bannerPosition, canUpload, onBannerChange }: BannerUploadProps) => {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Position editor state
  const [editing, setEditing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [posY, setPosY] = useState(50); // percentage 0-100
  const [dragging, setDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartPos, setDragStartPos] = useState(50);
  const editorRef = useRef<HTMLDivElement>(null);

  // Parse existing position when entering edit for repositioning
  useEffect(() => {
    const match = bannerPosition.match(/\d+%\s+(\d+)%/);
    if (match) setPosY(parseInt(match[1]));
  }, [bannerPosition]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file", description: "Please select a JPEG, PNG, or WebP image.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Banner must be under 5MB.", variant: "destructive" });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setPreviewFile(file);
    setPosY(50);
    setEditing(true);
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    setDragStartY(e.clientY);
    setDragStartPos(posY);
  }, [posY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !editorRef.current) return;
    const rect = editorRef.current.getBoundingClientRect();
    const deltaY = e.clientY - dragStartY;
    const deltaPercent = (deltaY / rect.height) * 100;
    // Invert: dragging down means showing higher part of image
    const newPos = Math.max(0, Math.min(100, dragStartPos - deltaPercent));
    setPosY(newPos);
  }, [dragging, dragStartY, dragStartPos]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  // Touch support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setDragging(true);
    setDragStartY(e.touches[0].clientY);
    setDragStartPos(posY);
  }, [posY]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging || !editorRef.current) return;
    const rect = editorRef.current.getBoundingClientRect();
    const deltaY = e.touches[0].clientY - dragStartY;
    const deltaPercent = (deltaY / rect.height) * 100;
    const newPos = Math.max(0, Math.min(100, dragStartPos - deltaPercent));
    setPosY(newPos);
  }, [dragging, dragStartY, dragStartPos]);

  const handleConfirm = async () => {
    if (!user) return;
    setUploading(true);

    try {
      let finalUrl = bannerUrl;
      const position = `50% ${Math.round(posY)}%`;

      // Upload new file if there is one
      if (previewFile) {
        const ext = previewFile.name.split(".").pop();
        const filePath = `${user.id}/banner.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, previewFile, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);

        finalUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ banner_url: finalUrl, banner_position: position } as any)
        .eq("user_id", user.id);
      if (updateError) throw updateError;

      onBannerChange(finalUrl || "", position);
      await refreshProfile();
      toast({ title: "Banner updated!" });
      handleCancel();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewFile(null);
  };

  const handleRepositionClick = () => {
    if (bannerUrl) {
      setPreviewUrl(null);
      setPreviewFile(null);
      setEditing(true);
    }
  };

  if (!canUpload) return null;

  // Position editor overlay
  if (editing) {
    const displayUrl = previewUrl || bannerUrl;
    return (
      <div className="absolute inset-0 z-30">
        <div
          ref={editorRef}
          className="relative w-full h-full cursor-grab active:cursor-grabbing select-none overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
        >
          {displayUrl && (
            <img
              src={displayUrl}
              alt="Banner preview"
              className="w-full h-full object-cover pointer-events-none"
              style={{ objectPosition: `50% ${posY}%` }}
              draggable={false}
            />
          )}
          {/* Drag hint */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-background/70 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-2 text-sm text-foreground border border-border/50">
              <Move className="h-4 w-4" />
              Drag to reposition
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="absolute bottom-3 right-3 flex gap-2 z-40">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            className="bg-background/80 backdrop-blur-sm border-border/50"
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={uploading}
            className="gradient-hades"
          >
            {uploading ? (
              <div className="h-4 w-4 border-2 border-foreground border-t-transparent rounded-full animate-spin mr-1" />
            ) : (
              <Check className="h-4 w-4 mr-1" />
            )}
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="absolute top-3 right-3 z-20 flex gap-2">
        {bannerUrl && (
          <button
            onClick={handleRepositionClick}
            className="p-2 rounded-lg bg-background/60 backdrop-blur-sm border border-border/50 hover:bg-background/80 transition-colors text-muted-foreground hover:text-foreground"
            title="Reposition banner"
          >
            <Move className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="p-2 rounded-lg bg-background/60 backdrop-blur-sm border border-border/50 hover:bg-background/80 transition-colors text-muted-foreground hover:text-foreground"
          title="Upload banner"
        >
          {uploading ? (
            <div className="h-4 w-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading}
      />
    </>
  );
};

export default BannerUpload;
