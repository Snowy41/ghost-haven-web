import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";

interface ChangelogEntry {
  id: string;
  title: string;
  content: string;
  version: string | null;
  created_at: string;
}

const Changelog = () => {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("changelogs")
      .select("id, title, content, version, created_at")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setEntries((data as any[]) || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div className="text-center space-y-2">
            <h1 className="font-display text-4xl font-bold gradient-hades-text">Changelog</h1>
            <p className="text-muted-foreground">Latest updates and improvements</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No changelogs yet</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

              <div className="space-y-6">
                {entries.map((entry, i) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative pl-10"
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-2.5 top-5 w-3 h-3 rounded-full bg-primary border-2 border-background" />

                    <Card className="glass border-border/30">
                      <CardContent className="p-5 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-display font-bold text-foreground">{entry.title}</h2>
                          {entry.version && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">
                              <Tag className="h-3 w-3" />
                              {entry.version}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                        </p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{entry.content}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default Changelog;
