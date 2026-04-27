import { useEffect, useState, useCallback } from "react";
import { Users, Ban, Shield, Crown, Star, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UserRow {
  user_id: string;
  username: string;
  hades_coins: number;
  created_at: string;
  banned_at: string | null;
}

interface RoleRow {
  user_id: string;
  role: string;
}

const DashboardUsers = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);

  const fetchData = useCallback(async () => {
    const [usersRes, privateRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("user_id, username, hades_coins, created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("profiles_private").select("user_id, banned_at"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const banMap = new Map<string, string | null>(
      ((privateRes.data as any[]) || []).map((p) => [p.user_id, p.banned_at])
    );
    const merged: UserRow[] = ((usersRes.data as any[]) || []).map((u) => ({
      user_id: u.user_id,
      username: u.username,
      hades_coins: u.hades_coins,
      created_at: u.created_at,
      banned_at: banMap.get(u.user_id) ?? null,
    }));
    setUsers(merged);
    setRoles((rolesRes.data as RoleRow[]) || []);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getUserRoles = (userId: string) => roles.filter((r) => r.user_id === userId).map((r) => r.role);

  const toggleBan = async (userId: string, isBanned: boolean) => {
    const { error } = await supabase
      .from("profiles_private")
      .update({ banned_at: isBanned ? null : new Date().toISOString() } as any)
      .eq("user_id", userId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: isBanned ? "User unbanned" : "User banned" });
      fetchData();
    }
  };

  const assignRole = async (userId: string, role: string) => {
    const userRoles = getUserRoles(userId);

    // Owner and admin are mutually exclusive — owner is higher
    if (role === "owner" && userRoles.includes("admin")) {
      // Remove admin first, then assign owner
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin" as any);
    } else if (role === "admin" && userRoles.includes("owner")) {
      toast({ title: "Cannot assign Admin to an Owner", description: "Remove Owner role first.", variant: "destructive" });
      return;
    } else if (role === "owner" || role === "admin") {
      // Check no conflict
    }

    const existing = userRoles.includes(role);
    if (existing) {
      toast({ title: "Role already assigned", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Role '${role}' assigned` });
      fetchData();
    }
  };

  const removeRole = async (userId: string, role: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Role '${role}' removed` });
      fetchData();
    }
  };

  const roleIcons: Record<string, typeof Crown> = {
    owner: Crown,
    admin: Shield,
    moderator: Star,
    beta: Shield,
  };

  return (
    <Card className="glass border-border/30">
      <CardHeader>
        <CardTitle className="font-display text-xl flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" /> Users ({users.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {users.map((u) => {
            const userRoles = getUserRoles(u.user_id);
            const isBanned = !!u.banned_at;
            return (
              <div key={u.user_id} className={`p-4 rounded-lg bg-secondary/30 space-y-3 ${isBanned ? "opacity-60 border border-destructive/30" : ""}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{u.username}</p>
                      {isBanned && <Badge variant="destructive" className="text-xs">Banned</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(u.created_at).toLocaleDateString()} · {u.hades_coins} coins
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={isBanned ? "outline" : "destructive"}
                    onClick={() => toggleBan(u.user_id, isBanned)}
                    className="text-xs"
                  >
                    {isBanned ? <><UserX className="h-3.5 w-3.5 mr-1" /> Unban</> : <><Ban className="h-3.5 w-3.5 mr-1" /> Ban</>}
                  </Button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {userRoles.map((role) => {
                    const Icon = roleIcons[role];
                    return (
                      <Badge key={role} variant="outline" className="text-xs cursor-pointer hover:bg-destructive/20" onClick={() => removeRole(u.user_id, role)}>
                        {Icon && <Icon className="h-3 w-3 mr-1" />}
                        {role} ×
                      </Badge>
                    );
                  })}
                  <Select onValueChange={(val) => assignRole(u.user_id, val)}>
                    <SelectTrigger className="h-7 w-32 text-xs bg-secondary border-border">
                      <SelectValue placeholder="+ Add role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="beta">Beta Tester</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardUsers;
