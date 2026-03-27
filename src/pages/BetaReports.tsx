import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bug, Plus, MessageSquare, Send, ChevronDown, ChevronUp } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const titleSchema = z.string().min(5, "Title must be at least 5 characters").max(100, "Title must be under 100 characters");
const descSchema = z.string().min(20, "Description must be at least 20 characters").max(2000, "Description must be under 2000 characters");
const replySchema = z.string().min(2, "Reply must be at least 2 characters").max(1000, "Reply must be under 1000 characters");

interface BugReport {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  profiles?: { username: string; avatar_url: string | null } | null;
}

interface Reply {
  id: string;
  report_id: string;
  user_id: string;
  message: string;
  is_admin_reply: boolean;
  created_at: string;
  profiles?: { username: string; avatar_url: string | null } | null;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  open: { label: "Open", variant: "destructive" },
  in_progress: { label: "In Progress", variant: "default" },
  resolved: { label: "Resolved", variant: "secondary" },
  closed: { label: "Closed", variant: "outline" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "text-muted-foreground" },
  medium: { label: "Medium", color: "text-accent" },
  high: { label: "High", color: "text-orange-400" },
  critical: { label: "Critical", color: "text-destructive" },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const BetaReports = () => {
  const { user, profile, loading, isOwnerOrAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [reports, setReports] = useState<BugReport[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [replyText, setReplyText] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  const fetchReports = async () => {
    let query = supabase
      .from("bug_reports")
      .select("*, profiles!bug_reports_user_id_fkey(username, avatar_url)")
      .order("created_at", { ascending: false });

    if (filter !== "all") query = query.eq("status", filter);

    const { data } = await query;
    if (data) {
      const reportsWithProfiles = await Promise.all(
        data.map(async (r: any) => {
          if (!r.profiles) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("username, avatar_url")
              .eq("user_id", r.user_id)
              .single();
            return { ...r, profiles: profileData };
          }
          return r;
        })
      );
      setReports(reportsWithProfiles);
    }
  };

  useEffect(() => {
    if (user) fetchReports();
  }, [user, filter]);

  const fetchReplies = async (reportId: string) => {
    const { data } = await supabase
      .from("bug_report_replies")
      .select("*")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true });

    if (data) {
      const repliesWithProfiles = await Promise.all(
        data.map(async (r: any) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("user_id", r.user_id)
            .single();
          return { ...r, profiles: profileData };
        })
      );
      setReplies((prev) => ({ ...prev, [reportId]: repliesWithProfiles }));
    }
  };

  const handleExpand = (reportId: string) => {
    if (expandedId === reportId) {
      setExpandedId(null);
    } else {
      setExpandedId(reportId);
      if (!replies[reportId]) fetchReplies(reportId);
    }
    setReplyText("");
  };

  const handleCreate = async () => {
    if (!user) return;
    const titleResult = titleSchema.safeParse(title.trim());
    if (!titleResult.success) {
      toast({ title: "Invalid title", description: titleResult.error.errors[0].message, variant: "destructive" });
      return;
    }
    const descResult = descSchema.safeParse(description.trim());
    if (!descResult.success) {
      toast({ title: "Invalid description", description: descResult.error.errors[0].message, variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("bug_reports").insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim(),
      priority,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to create report.", variant: "destructive" });
    } else {
      toast({ title: "Report created", description: "Thanks for your feedback!" });
      setTitle("");
      setDescription("");
      setPriority("medium");
      setShowCreate(false);
      fetchReports();
    }
    setSubmitting(false);
  };

  const handleReply = async (reportId: string) => {
    if (!user) return;
    const result = replySchema.safeParse(replyText.trim());
    if (!result.success) {
      toast({ title: "Invalid reply", description: result.error.errors[0].message, variant: "destructive" });
      return;
    }

    setReplySubmitting(true);
    const { error } = await supabase.from("bug_report_replies").insert({
      report_id: reportId,
      user_id: user.id,
      message: replyText.trim(),
      is_admin_reply: isOwnerOrAdmin,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to send reply.", variant: "destructive" });
    } else {
      setReplyText("");
      fetchReplies(reportId);
    }
    setReplySubmitting(false);
  };

  const handleStatusChange = async (reportId: string, newStatus: string) => {
    const { error } = await supabase
      .from("bug_reports")
      .update({ status: newStatus })
      .eq("id", reportId);
    if (!error) fetchReports();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <Navbar />

      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] rounded-full bg-destructive/3 blur-[150px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[300px] h-[300px] rounded-full bg-primary/3 blur-[120px]" />
      </div>

      <main className="container relative z-10 mx-auto px-4 pt-24 pb-16 max-w-4xl">
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
          {/* Header */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20">
                <Bug className="h-7 w-7 text-destructive" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">Beta Bug Reports</h1>
                <p className="text-sm text-muted-foreground">Help us improve by reporting issues</p>
              </div>
            </div>
            <Button onClick={() => setShowCreate(!showCreate)} className="gradient-hades font-semibold glow-red gap-2">
              <Plus className="h-4 w-4" /> New Report
            </Button>
          </motion.div>

          {/* Create Form */}
          {showCreate && (
            <motion.div variants={fadeUp}>
              <Card className="glass border-primary/20">
                <CardHeader>
                  <CardTitle className="font-display text-lg">Create Bug Report</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Brief title describing the bug..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={100}
                    className="bg-secondary/50 border-border"
                  />
                  <Textarea
                    placeholder="Describe the bug in detail. Include steps to reproduce, what you expected, and what actually happened..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={2000}
                    rows={5}
                    className="bg-secondary/50 border-border resize-none"
                  />
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Priority:</span>
                      <Select value={priority} onValueChange={setPriority}>
                        <SelectTrigger className="w-32 bg-secondary/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 ml-auto">
                      <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                      <Button onClick={handleCreate} disabled={submitting} className="gradient-hades">
                        {submitting ? "Submitting..." : "Submit Report"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Filter */}
          <motion.div variants={fadeUp} className="flex items-center gap-2 flex-wrap">
            {["all", "open", "in_progress", "resolved", "closed"].map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "outline"}
                onClick={() => setFilter(f)}
                className={filter === f ? "gradient-hades" : "hover:border-primary/30"}
              >
                {f === "all" ? "All" : (statusConfig[f]?.label || f)}
              </Button>
            ))}
          </motion.div>

          {/* Reports List */}
          {reports.length === 0 ? (
            <motion.div variants={fadeUp}>
              <Card className="glass border-border/30">
                <CardContent className="py-16 text-center">
                  <Bug className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                  <p className="text-muted-foreground">No bug reports yet. Be the first to report an issue!</p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {reports.map((report, idx) => {
                const status = statusConfig[report.status] || statusConfig.open;
                const prio = priorityConfig[report.priority] || priorityConfig.medium;
                const isExpanded = expandedId === report.id;
                const canReply = report.user_id === user?.id || isOwnerOrAdmin;

                return (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                  >
                    <Card className="glass border-border/30 hover:border-border/60 transition-all duration-200">
                      <CardContent className="p-4">
                        <div
                          className="flex items-start gap-3 cursor-pointer"
                          onClick={() => handleExpand(report.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="font-semibold text-foreground truncate">{report.title}</h3>
                              <Badge variant={status.variant}>{status.label}</Badge>
                              <span className={`text-xs font-medium ${prio.color}`}>{prio.label}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{report.profiles?.username || "Unknown"}</span>
                              <span>•</span>
                              <span>{new Date(report.created_at).toLocaleDateString()}</span>
                              {replies[report.id] && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3" />
                                    {replies[report.id].length}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                          )}
                        </div>

                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="mt-4 space-y-4"
                          >
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap border-t border-border/30 pt-4">
                              {report.description}
                            </p>

                            {isOwnerOrAdmin && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Set status:</span>
                                {["open", "in_progress", "resolved", "closed"].map((s) => (
                                  <Button
                                    key={s}
                                    size="sm"
                                    variant={report.status === s ? "default" : "outline"}
                                    className={`text-xs h-7 ${report.status === s ? "gradient-hades" : ""}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusChange(report.id, s);
                                    }}
                                  >
                                    {statusConfig[s]?.label || s}
                                  </Button>
                                ))}
                              </div>
                            )}

                            {/* Replies */}
                            <div className="space-y-2">
                              {(replies[report.id] || []).map((reply) => (
                                <div
                                  key={reply.id}
                                  className={`p-3 rounded-lg text-sm ${
                                    reply.is_admin_reply
                                      ? "bg-primary/5 border border-primary/20"
                                      : "bg-secondary/30"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`font-medium ${reply.is_admin_reply ? "text-primary" : "text-foreground"}`}>
                                      {reply.profiles?.username || "Unknown"}
                                    </span>
                                    {reply.is_admin_reply && (
                                      <Badge variant="default" className="text-xs h-5 gradient-hades">Staff</Badge>
                                    )}
                                    <span className="text-xs text-muted-foreground ml-auto">
                                      {new Date(reply.created_at).toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="text-muted-foreground whitespace-pre-wrap">{reply.message}</p>
                                </div>
                              ))}
                            </div>

                            {canReply && (
                              <div className="flex gap-2">
                                <Input
                                  placeholder={isOwnerOrAdmin ? "Reply as staff..." : "Add a reply..."}
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  maxLength={1000}
                                  className="bg-secondary/50 border-border"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault();
                                      handleReply(report.id);
                                    }
                                  }}
                                />
                                <Button
                                  size="icon"
                                  onClick={() => handleReply(report.id)}
                                  disabled={replySubmitting}
                                  className="gradient-hades shrink-0"
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default BetaReports;
