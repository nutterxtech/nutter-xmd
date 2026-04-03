import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TerminalSquare, Shield, Bot, Users, Activity, Zap, LogOut,
  CheckCircle, XCircle, Loader2, Lock, Eye, EyeOff, Trash2,
  ChevronDown, ChevronRight, Phone, Mail, Settings, Wifi, WifiOff,
  AlertTriangle, Ban,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const ADMIN_TOKEN_KEY = "admin_token";

type AdminUser = {
  id: number;
  userId: string;
  name: string;
  status: string;
  isActive: boolean;
  phoneNumber: string | null;
  prefix: string;
  mode: string;
  createdAt: string;
  updatedAt: string;
  // Clerk
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  // Settings
  autoReply: boolean;
  autoReplyMessage: string | null;
  antiCall: boolean;
  antiLink: boolean;
  antiSpam: boolean;
  antiSticker: boolean;
  antiTag: boolean;
  antiBadWord: boolean;
  badWords: string | null;
  welcomeMessage: boolean;
  goodbyeMessage: boolean;
  autoRead: boolean;
  typingStatus: boolean;
  alwaysOnline: boolean;
  autoViewStatus: boolean;
  autoLikeStatus: boolean;
};

type AdminStats = {
  totalUsers: number;
  totalBots: number;
  activeBots: number;
  onlineBots: number;
  suspendedBots: number;
};

async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

function WaStatusBadge({ status }: { status: string }) {
  if (status === "online") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded border bg-green-500/10 text-green-400 border-green-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        ONLINE
      </span>
    );
  }
  if (status === "connecting") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded border bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
        CONNECTING
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded border bg-muted/40 text-muted-foreground border-border/50">
      <WifiOff className="w-3 h-3" />
      OFFLINE
    </span>
  );
}

function SettingPill({ label, on }: { label: string; on: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-mono ${
      on
        ? "bg-primary/10 text-primary border-primary/30"
        : "bg-muted/30 text-muted-foreground/50 border-border/30"
    }`}>
      {on ? <CheckCircle className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
      {label}
    </span>
  );
}

function UserRow({ user, onAction }: { user: AdminUser; onAction: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const activate = useMutation({
    mutationFn: () => adminFetch<AdminUser>(`/api/admin/bots/${user.id}/activate`, { method: "POST" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin"] }); toast({ title: "User activated" }); onAction(); },
    onError: () => toast({ title: "Failed to activate", variant: "destructive" }),
  });

  const suspend = useMutation({
    mutationFn: () => adminFetch<AdminUser>(`/api/admin/bots/${user.id}/deactivate`, { method: "POST" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin"] }); toast({ title: "User suspended" }); onAction(); },
    onError: () => toast({ title: "Failed to suspend", variant: "destructive" }),
  });

  const deleteUser = useMutation({
    mutationFn: () => adminFetch<void>(`/api/admin/bots/${user.id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin"] }); toast({ title: "User deleted" }); onAction(); },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "—";
  const joinDate = new Date(user.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const settings = [
    { label: "Anti-Call", on: user.antiCall },
    { label: "Anti-Link", on: user.antiLink },
    { label: "Anti-Spam", on: user.antiSpam },
    { label: "Anti-Sticker", on: user.antiSticker },
    { label: "Anti-Tag", on: user.antiTag },
    { label: "Anti-Bad Word", on: user.antiBadWord },
    { label: "Auto-Read", on: user.autoRead },
    { label: "Auto-Reply", on: user.autoReply },
    { label: "Welcome Msg", on: user.welcomeMessage },
    { label: "Goodbye Msg", on: user.goodbyeMessage },
    { label: "Typing Status", on: user.typingStatus },
    { label: "Always Online", on: user.alwaysOnline },
    { label: "View Status", on: user.autoViewStatus },
    { label: "Like Status", on: user.autoLikeStatus },
  ];

  return (
    <>
      <tr
        className="hover:bg-secondary/20 transition-colors cursor-pointer border-b border-border/30"
        onClick={() => setExpanded((p) => !p)}
        data-testid={`row-admin-user-${user.id}`}
      >
        {/* Expand toggle */}
        <td className="py-3 px-3 w-6">
          {expanded
            ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
        </td>

        {/* User identity */}
        <td className="py-3 px-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="font-medium text-sm truncate">{displayName}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
              <Mail className="w-3 h-3 shrink-0" />
              {user.email ?? <span className="italic opacity-50">no email</span>}
            </span>
          </div>
        </td>

        {/* Phone */}
        <td className="py-3 px-3 hidden md:table-cell">
          <div className="flex items-center gap-1.5 text-sm">
            <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
            {user.phoneNumber
              ? <span className="font-mono text-xs">{user.phoneNumber}</span>
              : <span className="text-xs text-muted-foreground/50 italic">not linked</span>}
          </div>
        </td>

        {/* WhatsApp status */}
        <td className="py-3 px-3">
          <WaStatusBadge status={user.status} />
        </td>

        {/* Account status */}
        <td className="py-3 px-3 hidden sm:table-cell">
          {user.isActive ? (
            <span className="flex items-center gap-1 text-xs text-primary">
              <CheckCircle className="w-3.5 h-3.5" /> Active
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-destructive">
              <Ban className="w-3.5 h-3.5" /> Suspended
            </span>
          )}
        </td>

        {/* Join date */}
        <td className="py-3 px-3 hidden lg:table-cell text-xs text-muted-foreground font-mono">
          {joinDate}
        </td>

        {/* Actions */}
        <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1.5">
            {user.isActive ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                onClick={() => suspend.mutate()}
                disabled={suspend.isPending}
                data-testid={`button-suspend-user-${user.id}`}
              >
                {suspend.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                <span className="ml-1 hidden sm:inline">Suspend</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => activate.mutate()}
                disabled={activate.isPending}
                data-testid={`button-activate-user-${user.id}`}
              >
                {activate.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                <span className="ml-1 hidden sm:inline">Activate</span>
              </Button>
            )}

            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => { deleteUser.mutate(); setConfirmDelete(false); }}
                  disabled={deleteUser.isPending}
                  data-testid={`button-confirm-delete-user-${user.id}`}
                >
                  {deleteUser.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmDelete(true)}
                data-testid={`button-delete-user-${user.id}`}
              >
                <Trash2 className="w-3 h-3" />
                <span className="ml-1 hidden sm:inline">Delete</span>
              </Button>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded settings row */}
      {expanded && (
        <tr className="bg-secondary/10 border-b border-border/30">
          <td colSpan={7} className="px-4 py-4">
            <div className="space-y-4">
              {/* Bot config strip */}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Settings className="w-3.5 h-3.5" />
                  <strong className="text-foreground">Prefix:</strong>
                  <code className="bg-secondary px-1.5 py-0.5 rounded font-mono text-primary">{user.prefix}</code>
                </span>
                <span className="flex items-center gap-1">
                  <strong className="text-foreground">Mode:</strong>
                  <Badge variant="outline" className="text-xs font-mono h-5 capitalize">
                    {user.mode}
                  </Badge>
                </span>
                <span className="flex items-center gap-1">
                  <strong className="text-foreground">Clerk ID:</strong>
                  <code className="bg-secondary px-1.5 py-0.5 rounded font-mono opacity-60">{user.userId.slice(0, 24)}…</code>
                </span>
                <span className="flex items-center gap-1">
                  <strong className="text-foreground">Updated:</strong>
                  {new Date(user.updatedAt).toLocaleString()}
                </span>
              </div>

              {/* Feature toggles */}
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Bot Settings</p>
                <div className="flex flex-wrap gap-1.5">
                  {settings.map((s) => <SettingPill key={s.label} label={s.label} on={s.on} />)}
                </div>
              </div>

              {/* Bad words list (if any) */}
              {user.antiBadWord && user.badWords && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wider">Blocked Words</p>
                  <div className="flex flex-wrap gap-1">
                    {user.badWords.split(",").filter(Boolean).map((w) => (
                      <span key={w} className="text-xs px-2 py-0.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-full font-mono">
                        {w.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Auto-reply message (if any) */}
              {user.autoReply && user.autoReplyMessage && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wider">Auto-Reply Message</p>
                  <p className="text-xs bg-secondary/50 border border-border/50 rounded p-2 italic">
                    "{user.autoReplyMessage}"
                  </p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function AdminDashboardContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["admin", "stats"],
    queryFn: () => adminFetch<AdminStats>("/api/admin/stats"),
    refetchInterval: 30_000,
  });

  const { data: users, isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["admin", "users"],
    queryFn: () => adminFetch<AdminUser[]>("/api/admin/users"),
    refetchInterval: 30_000,
  });

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    window.location.reload();
  };

  const filtered = (users ?? []).filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      u.phoneNumber?.includes(q) ||
      u.userId.toLowerCase().includes(q) ||
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight glow-text">Admin Control</h1>
          </div>
          <p className="text-muted-foreground text-sm">Full platform oversight — users, sessions, and settings.</p>
        </div>
        <Button
          variant="outline"
          className="border-destructive/30 text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
          data-testid="button-admin-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Total Users", value: stats?.totalUsers, icon: Users, color: "text-blue-400" },
          { label: "Total Bots", value: stats?.totalBots, icon: Bot, color: "text-muted-foreground" },
          { label: "Active", value: stats?.activeBots, icon: Activity, color: "text-primary" },
          { label: "Online", value: stats?.onlineBots, icon: Wifi, color: "text-green-400", pulse: true },
          { label: "Suspended", value: stats?.suspendedBots, icon: AlertTriangle, color: "text-yellow-400" },
        ].map(({ label, value, icon: Icon, color, pulse }) => (
          <Card key={label} className="bg-card border-border/50 relative overflow-hidden group hover:border-primary/30 transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary/50 transition-colors" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pl-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className={`h-4 w-4 ${color} ${pulse ? "animate-pulse" : ""}`} />
            </CardHeader>
            <CardContent className="pl-4">
              {statsLoading
                ? <Skeleton className="h-8 w-12 bg-muted/50" />
                : <div className="text-2xl font-bold font-mono">{value ?? 0}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users table */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              All Users
            </CardTitle>
            <div className="relative">
              <Input
                placeholder="Search by email, phone, name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-64 h-8 text-xs bg-secondary/50 border-border/50 focus:border-primary/50"
                data-testid="input-admin-search"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {usersLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 bg-muted/30" />)}
            </div>
          ) : !filtered.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{search ? "No users match your search." : "No users registered yet."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground text-xs bg-secondary/20">
                    <th className="w-6 py-2 px-3" />
                    <th className="text-left py-2 px-3">User / Email</th>
                    <th className="text-left py-2 px-3 hidden md:table-cell">Phone</th>
                    <th className="text-left py-2 px-3">WhatsApp</th>
                    <th className="text-left py-2 px-3 hidden sm:table-cell">Account</th>
                    <th className="text-left py-2 px-3 hidden lg:table-cell">Joined</th>
                    <th className="text-right py-2 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      onAction={() => queryClient.invalidateQueries({ queryKey: ["admin"] })}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground/40 font-mono pb-4">
        NUTTER-XMD Admin Panel — {filtered.length} user{filtered.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(ADMIN_TOKEN_KEY));
  const [form, setForm] = useState({ username: "", key: "" });
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);

  const searchParams = new URLSearchParams(window.location.search);
  const isAdminMode = searchParams.get("admin") === "nutterx=true";

  if (!isAdminMode) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Card className="bg-card border-border w-full max-w-sm mx-4">
          <CardContent className="pt-8 pb-8 text-center">
            <Lock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-muted-foreground">Access Restricted</h2>
            <p className="text-sm text-muted-foreground/60 mt-2">This page is not accessible.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleLogin = async () => {
    if (!form.username || !form.key) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.username, key: form.key }),
      });
      if (!res.ok) {
        toast({ title: "Invalid credentials", description: "Check your username and key.", variant: "destructive" });
        return;
      }
      const data = await res.json();
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      setToken(data.token);
      toast({ title: "Admin access granted" });
    } catch {
      toast({ title: "Login failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
        <Card className="bg-card border-border w-full max-w-sm mx-4 relative z-10">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TerminalSquare className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="font-mono glow-text">ADMIN ACCESS</CardTitle>
            <p className="text-xs text-muted-foreground">NUTTER-XMD Control Panel</p>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="admin-username">Username</Label>
              <Input
                id="admin-username"
                data-testid="input-admin-username"
                value={form.username}
                onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                placeholder="admin"
                className="font-mono bg-secondary/50 border-border/50 focus:border-primary/50"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-key">Access Key</Label>
              <div className="relative">
                <Input
                  id="admin-key"
                  data-testid="input-admin-key"
                  type={showKey ? "text" : "password"}
                  value={form.key}
                  onChange={(e) => setForm((p) => ({ ...p, key: e.target.value }))}
                  placeholder="••••••••"
                  className="font-mono bg-secondary/50 border-border/50 focus:border-primary/50 pr-10"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleLogin}
              disabled={loading || !form.username || !form.key}
              data-testid="button-admin-login"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
              Access Control Panel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
      <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-8">
        <AdminDashboardContent />
      </div>
    </div>
  );
}
