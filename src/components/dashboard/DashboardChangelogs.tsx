import { useEffect, useState } from "react";
import { FileText, Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Changelog {
  id: string;
  title: string;
  content: string;
  version: string | null;
  published: boolean;
  created_at: string;
}

const DashboardChangelogs = () => {
  const { user } = useAuth();
  const [changelogs, setChangelogs] = useState<Changelog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [version, setVersion] = useState("");
  const [published, setPublished] = useState(false);

  const fetchChangelogs = async () => {
    const { data } = await supabase
      .from("changelogs")
      .select("*")
      .order("created_at", { ascending: false });
    setChangelogs((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchChangelogs(); }, []);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setVersion("");
    setPublished(false);
    setEditingId(null);
  };

  const openEdit = (cl: Changelog) => {
    setEditingId(cl.id);
    setTitle(cl.title);
    setContent(cl.content);
    setVersion(cl.version || "");
    setPublished(cl.published);
    setDialogOpen(true);
  };

  const openNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content required");
      return;
    }

    const payload = {
      title: title.trim(),
      content: content.trim(),
      version: version.trim() || null,
      published,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      const { error } = await supabase
        .from("changelogs")
        .update(payload as any)
        .eq("id", editingId);
      if (error) { toast.error("Failed to update"); return; }
      toast.success("Changelog updated");
    } else {
      const { error } = await supabase
        .from("changelogs")
        .insert({ ...payload, created_by: user!.id } as any);
      if (error) { toast.error("Failed to create"); return; }
      toast.success("Changelog created");
    }

    setDialogOpen(false);
    resetForm();
    fetchChangelogs();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("changelogs").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Changelog deleted");
    fetchChangelogs();
  };

  const togglePublish = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("changelogs")
      .update({ published: !current, updated_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) { toast.error("Failed to update"); return; }
    fetchChangelogs();
  };

  if (loading) return null;

  return (
    <Card className="glass border-border/30">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display text-xl flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" /> Changelogs
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gradient-hades gap-1.5" onClick={openNew}>
              <Plus className="h-4 w-4" /> New Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="glass border-border/30 max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">{editingId ? "Edit" : "New"} Changelog</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Update title" className="bg-secondary border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label>Version (optional)</Label>
                  <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="v1.2.0" className="bg-secondary border-border" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Content</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Describe the changes..."
                  rows={8}
                  className="bg-secondary border-border resize-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={published} onCheckedChange={setPublished} />
                <Label>Published</Label>
              </div>
              <Button className="w-full gradient-hades" onClick={handleSave}>
                {editingId ? "Update" : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {changelogs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No changelogs yet</p>
        ) : (
          <div className="space-y-3">
            {changelogs.map((cl) => (
              <div key={cl.id} className="flex items-start justify-between p-4 rounded-lg bg-secondary/30 gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground text-sm">{cl.title}</span>
                    {cl.version && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">{cl.version}</span>
                    )}
                    {cl.published ? (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">Published</span>
                    ) : (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Draft</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{cl.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(cl.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => togglePublish(cl.id, cl.published)}>
                    {cl.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(cl)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(cl.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardChangelogs;
