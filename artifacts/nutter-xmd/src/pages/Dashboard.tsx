import { useState } from "react";
import {
  useGetMyBot,
  useUpdateMyBot,
  useGetBotQR,
  useGetBotPairCode,
  useDisconnectBot,
  getGetMyBotQueryKey,
  getGetBotQRQueryKey,
} from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Wifi, WifiOff, QrCode, Smartphone, RefreshCw, Loader2,
  Shield, Globe, Lock, Phone, MessageSquare, BellOff, Link2Off,
  UserCheck, EyeOff, Activity, Radio, Clock, Users, LogOut,
  Save, AlertTriangle, Hash, Settings2, Sticker, Tag, Swords,
  ThumbsUp, Heart, Sparkles, X, Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type FeatureToggle = {
  key: string;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  category: string;
  note?: string;
};

const FEATURE_TOGGLES: FeatureToggle[] = [
  // Protection
  { key: "antiCall",    label: "Anti Call",    description: "Reject incoming voice/video calls and notify the caller", icon: BellOff,   category: "Protection" },
  { key: "antiLink",    label: "Anti Link",    description: "Delete messages containing links in groups (bot must be admin)", icon: Link2Off,  category: "Protection", note: "Requires bot to be group admin" },
  { key: "antiSticker", label: "Anti Sticker", description: "Auto-delete sticker messages in groups", icon: Sticker,   category: "Protection", note: "Requires bot to be group admin" },
  { key: "antiTag",     label: "Anti Tag",     description: "Delete mass-mention messages (5+ people tagged at once)", icon: Tag,       category: "Protection", note: "Requires bot to be group admin" },
  { key: "antiBadWord", label: "Anti Bad Word", description: "Delete message + kick the sender for using bad words", icon: Swords,    category: "Protection", note: "Requires bot to be group admin" },
  { key: "antiSpam",    label: "Anti Spam",    description: "Automatically detect and remove spam messages", icon: Shield,    category: "Protection" },
  // Group
  { key: "welcomeMessage", label: "Welcome Message", description: "Greet new members with their profile picture and a caption", icon: UserCheck, category: "Group" },
  { key: "goodbyeMessage", label: "Goodbye Message",  description: "Send a farewell message when members leave", icon: LogOut,    category: "Group" },
  // Automation
  { key: "autoReply",      label: "Auto Reply",       description: "Auto-respond to every DM with a custom message", icon: MessageSquare, category: "Automation" },
  { key: "autoRead",       label: "Auto Read",        description: "Automatically mark all incoming messages as read", icon: EyeOff,     category: "Automation" },
  // Presence
  { key: "typingStatus",   label: "Typing Indicator", description: "Show typing animation while the bot processes commands", icon: Clock,    category: "Presence" },
  { key: "alwaysOnline",   label: "Always Online",    description: "Keep the bot's WhatsApp status as online at all times", icon: Activity, category: "Presence" },
  { key: "autoViewStatus", label: "Auto View Status", description: "Automatically view all contacts' status updates", icon: Radio,    category: "Presence" },
  { key: "autoLikeStatus", label: "Auto Like Status", description: "Automatically react ❤️ to every contact's status update", icon: Heart,    category: "Presence" },
];

const CATEGORIES = ["Protection", "Group", "Automation", "Presence"];

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: bot, isLoading, isError: botError } = useGetMyBot();
  const { data: qrData, isLoading: qrLoading, refetch: refetchQR } = useGetBotQR({
    query: { enabled: false, queryKey: getGetBotQRQueryKey() },
  });

  const updateBot = useUpdateMyBot();
  const getBotPairCode = useGetBotPairCode();
  const disconnectBot = useDisconnectBot();

  const [pairPhone, setPairPhone] = useState("");
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [showPairInput, setShowPairInput] = useState(false);
  const [autoReplyMsg, setAutoReplyMsg] = useState("");
  const [prefixInput, setPrefixInput] = useState("");
  const [newBadWord, setNewBadWord] = useState("");

  const handleToggleFeature = (key: string, value: boolean) => {
    updateBot.mutate(
      { data: { [key]: value } as any },
      {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetMyBotQueryKey() }),
        onError: () => toast({ title: "Failed to update setting", variant: "destructive" }),
      }
    );
  };

  const handleToggleMode = (mode: "private" | "public") => {
    updateBot.mutate(
      { data: { mode } },
      {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetMyBotQueryKey() }),
        onError: () => toast({ title: "Failed to update mode", variant: "destructive" }),
      }
    );
  };

  const handleAddBadWord = () => {
    const word = newBadWord.trim().toLowerCase();
    if (!word) return;
    const existing = (bot?.badWords ?? "").split(",").map((w: string) => w.trim()).filter((w: string) => w.length > 0);
    if (existing.includes(word)) {
      toast({ title: `"${word}" is already in the list`, variant: "destructive" });
      return;
    }
    existing.push(word);
    updateBot.mutate(
      { data: { badWords: existing.join(",") } as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMyBotQueryKey() });
          setNewBadWord("");
          toast({ title: `Added "${word}" to bad words list` });
        },
        onError: () => toast({ title: "Failed to add word", variant: "destructive" }),
      }
    );
  };

  const handleRemoveBadWord = (word: string) => {
    const existing = (bot?.badWords ?? "").split(",").map((w: string) => w.trim()).filter((w: string) => w.length > 0);
    const updated = existing.filter(w => w !== word);
    updateBot.mutate(
      { data: { badWords: updated.join(",") } as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMyBotQueryKey() });
          toast({ title: `Removed "${word}"` });
        },
        onError: () => toast({ title: "Failed to remove word", variant: "destructive" }),
      }
    );
  };

  const handleGenerateQR = async () => { await refetchQR(); };

  const handleRequestPairCode = () => {
    if (!pairPhone.trim()) return;
    getBotPairCode.mutate(
      { data: { phoneNumber: pairPhone } },
      {
        onSuccess: (data) => {
          setPairCode(data.code);
          queryClient.invalidateQueries({ queryKey: getGetMyBotQueryKey() });
          toast({ title: "Pairing code generated", description: "Enter this code in WhatsApp" });
        },
        onError: () => toast({ title: "Failed to generate code", variant: "destructive" }),
      }
    );
  };

  const handleDisconnect = () => {
    disconnectBot.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMyBotQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetBotQRQueryKey() });
        setPairCode(null);
        setPairPhone("");
        toast({ title: "Bot disconnected" });
      },
      onError: () => toast({ title: "Error disconnecting", variant: "destructive" }),
    });
  };

  const handleSaveAutoReply = () => {
    updateBot.mutate(
      { data: { autoReplyMessage: autoReplyMsg } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMyBotQueryKey() });
          toast({ title: "Auto-reply message saved" });
        },
        onError: () => toast({ title: "Failed to save", variant: "destructive" }),
      }
    );
  };

  const handleSavePrefix = () => {
    const val = prefixInput.trim();
    if (!val || val.length > 5) {
      toast({ title: "Prefix must be 1–5 characters", variant: "destructive" });
      return;
    }
    updateBot.mutate(
      { data: { prefix: val } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMyBotQueryKey() });
          setPrefixInput("");
          toast({ title: `Prefix updated to "${val}"` });
        },
        onError: () => toast({ title: "Failed to save prefix", variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-xl bg-muted/30" />
        <Skeleton className="h-96 w-full rounded-xl bg-muted/30" />
      </div>
    );
  }

  if (botError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-destructive/50 bg-destructive/10">
          <WifiOff className="w-7 h-7 text-destructive" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-destructive mb-1">Cannot reach server</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            The backend is unavailable right now. This usually means the server is restarting — wait 30 seconds and try again.
          </p>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: getGetMyBotQueryKey() })}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/60 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  const isOnline = bot?.status === "online";
  const isConnecting = bot?.status === "connecting";
  const isSuspended = bot && !bot.isActive;
  const badWordsList = (bot?.badWords ?? "").split(",").map((w: string) => w.trim()).filter((w: string) => w.length > 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl mx-auto">
      {/* Hero / Status Banner */}
      <div className="relative rounded-xl border border-border/50 bg-card/80 overflow-hidden p-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 shrink-0 ${
            isOnline ? "border-primary bg-primary/10" :
            isConnecting ? "border-yellow-400 bg-yellow-400/10" :
            "border-border bg-secondary/30"
          }`}>
            {isOnline ? (
              <Wifi className="w-7 h-7 text-primary" />
            ) : isConnecting ? (
              <Loader2 className="w-7 h-7 text-yellow-400 animate-spin" />
            ) : (
              <WifiOff className="w-7 h-7 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold font-mono glow-text">{bot?.name ?? "My Bot"}</h1>
              <span className={`text-xs px-2 py-0.5 rounded border font-mono flex items-center gap-1.5 ${
                isOnline ? "bg-primary/20 text-primary border-primary/30" :
                isConnecting ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                isSuspended ? "bg-destructive/20 text-destructive border-destructive/30" :
                "bg-muted/50 text-muted-foreground border-border"
              }`}>
                {isOnline && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                {isConnecting && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />}
                {isOnline ? "ONLINE" : isConnecting ? "CONNECTING" : isSuspended ? "SUSPENDED" : "OFFLINE"}
              </span>
            </div>

            {bot?.phoneNumber ? (
              <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                <Phone className="w-3.5 h-3.5" />
                <span className="font-mono">{bot.phoneNumber}</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">Not connected to WhatsApp</p>
            )}

            {isSuspended && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-destructive">
                <AlertTriangle className="w-3.5 h-3.5" />
                Your bot has been suspended by an admin.
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded font-mono border ${
              bot?.mode === "private"
                ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
            }`}>
              {bot?.mode === "private" ? (
                <><Lock className="w-3 h-3 inline mr-1" />PRIVATE</>
              ) : (
                <><Globe className="w-3 h-3 inline mr-1" />PUBLIC</>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="status">
        <TabsList className="w-full grid grid-cols-2 bg-secondary/50">
          <TabsTrigger value="status" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Wifi className="w-4 h-4 mr-2" />
            Status
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Shield className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* ─── STATUS TAB ─── */}
        <TabsContent value="status" className="mt-4 space-y-4">
          {isOnline ? (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/30 rounded-lg">
                  <Wifi className="w-6 h-6 text-primary shrink-0" />
                  <div>
                    <p className="font-medium text-primary">WhatsApp Connected</p>
                    <p className="text-sm text-muted-foreground">{bot?.phoneNumber}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={handleDisconnect}
                  disabled={disconnectBot.isPending}
                  data-testid="button-disconnect"
                >
                  {disconnectBot.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <WifiOff className="w-4 h-4 mr-2" />}
                  Disconnect WhatsApp
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-primary" />
                    Scan QR Code
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">Open WhatsApp → Linked Devices → Link a Device, then scan this code.</p>
                  <div className="flex items-center justify-center h-52 bg-secondary/30 border border-border/50 rounded-lg">
                    {qrLoading ? (
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    ) : qrData?.qrCode ? (
                      <img
                        src={qrData.qrCode.startsWith("data:") ? qrData.qrCode : `data:image/png;base64,${qrData.qrCode}`}
                        alt="WhatsApp QR Code"
                        className="w-44 h-44 object-contain"
                        data-testid="img-qr-code"
                      />
                    ) : (
                      <div className="text-center px-6">
                        <QrCode className="w-14 h-14 text-muted-foreground/20 mb-3 mx-auto" />
                        <p className="text-sm text-muted-foreground">Click the button below to generate your QR code</p>
                      </div>
                    )}
                  </div>
                  <Button
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={handleGenerateQR}
                    disabled={qrLoading}
                    data-testid="button-generate-qr"
                  >
                    {qrLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                    {qrData ? "Refresh QR Code" : "Generate QR Code"}
                  </Button>
                </CardContent>
              </Card>

              <div className="flex items-center gap-4 text-muted-foreground text-xs">
                <div className="flex-1 h-px bg-border/50" />
                <span>OR use a pairing code</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>

              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-primary" />
                    Phone Pairing Code
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Enter your WhatsApp number with country code (e.g. 254712345678). Then open WhatsApp → Settings → Linked Devices → Link a Device → <strong className="text-foreground">Link with phone number</strong>, and enter the code shown.
                  </p>

                  {!showPairInput ? (
                    <Button
                      variant="outline"
                      className="w-full border-border/50 hover:border-primary/50 hover:bg-primary/5"
                      onClick={() => setShowPairInput(true)}
                      data-testid="button-use-pairing"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Enter Phone Number
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          data-testid="input-phone-number"
                          placeholder="+254712345678"
                          value={pairPhone}
                          onChange={(e) => setPairPhone(e.target.value)}
                          className="font-mono bg-secondary/50 border-border/50 focus:border-primary/50"
                        />
                        <Button
                          onClick={handleRequestPairCode}
                          disabled={getBotPairCode.isPending || !pairPhone.trim()}
                          data-testid="button-get-pair-code"
                          className="shrink-0"
                        >
                          {getBotPairCode.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Get Code"}
                        </Button>
                      </div>

                      {pairCode && (
                        <div className="flex items-center justify-center p-4 bg-primary/10 border border-primary/30 rounded-lg">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">Your Pairing Code</p>
                            <p className="text-3xl font-bold font-mono text-primary tracking-widest" data-testid="text-pair-code">
                              {pairCode}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">Enter this in WhatsApp</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ─── SETTINGS TAB ─── */}
        <TabsContent value="settings" className="mt-4 space-y-6">

          {/* Bot Configuration */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                Bot Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-primary" />
                  Command Prefix
                </Label>
                <p className="text-xs text-muted-foreground">
                  The character(s) before commands (e.g. <code className="bg-secondary/70 px-1 rounded text-primary">{bot?.prefix ?? "!"}</code>ping). Max 5 characters.
                </p>
                <div className="flex gap-2 items-center">
                  <div className="relative w-28">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">
                      Current:
                    </span>
                    <div className="h-9 pl-[4.5rem] pr-3 flex items-center bg-secondary/50 border border-border/50 rounded-md">
                      <span className="font-mono text-primary font-bold text-base">{bot?.prefix ?? "!"}</span>
                    </div>
                  </div>
                  <Input
                    data-testid="input-prefix"
                    placeholder="New prefix"
                    value={prefixInput}
                    onChange={(e) => setPrefixInput(e.target.value.slice(0, 5))}
                    maxLength={5}
                    className="font-mono bg-secondary/50 border-border/50 focus:border-primary/50 w-32"
                  />
                  <Button
                    size="sm"
                    onClick={handleSavePrefix}
                    disabled={updateBot.isPending || !prefixInput.trim()}
                    data-testid="button-save-prefix"
                    className="shrink-0"
                  >
                    {updateBot.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                    Save
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mode selection */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Bot Mode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <button
                  data-testid="button-mode-public"
                  onClick={() => handleToggleMode("public")}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    bot?.mode === "public"
                      ? "border-primary bg-primary/10"
                      : "border-border/50 hover:border-border bg-secondary/20"
                  }`}
                >
                  <Globe className={`w-5 h-5 mb-2 ${bot?.mode === "public" ? "text-primary" : "text-muted-foreground"}`} />
                  <p className={`font-medium text-sm ${bot?.mode === "public" ? "text-primary" : ""}`}>Public</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Everyone can use commands</p>
                </button>
                <button
                  data-testid="button-mode-private"
                  onClick={() => handleToggleMode("private")}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    bot?.mode === "private"
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-border/50 hover:border-border bg-secondary/20"
                  }`}
                >
                  <Lock className={`w-5 h-5 mb-2 ${bot?.mode === "private" ? "text-blue-400" : "text-muted-foreground"}`} />
                  <p className={`font-medium text-sm ${bot?.mode === "private" ? "text-blue-400" : ""}`}>Private</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Only owner can use commands</p>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Feature Toggles by category */}
          {CATEGORIES.map((category) => {
            const features = FEATURE_TOGGLES.filter((f) => f.category === category);
            return (
              <Card key={category} className="bg-card/50 border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    {category === "Protection" && <Shield className="w-3.5 h-3.5" />}
                    {category === "Group" && <Users className="w-3.5 h-3.5" />}
                    {category === "Automation" && <Sparkles className="w-3.5 h-3.5" />}
                    {category === "Presence" && <Activity className="w-3.5 h-3.5" />}
                    {category}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {features.map((feature) => {
                    const Icon = feature.icon;
                    const value = bot ? (bot as any)[feature.key] as boolean : false;
                    return (
                      <div key={feature.key} className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${value ? "bg-primary/20" : "bg-secondary/50"}`}>
                            <Icon className={`w-4 h-4 ${value ? "text-primary" : "text-muted-foreground"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="text-sm font-medium">{feature.label}</p>
                                <p className="text-xs text-muted-foreground">{feature.description}</p>
                                {feature.note && (
                                  <p className="text-xs text-amber-500/80 mt-0.5 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    {feature.note}
                                  </p>
                                )}
                              </div>
                              <Switch
                                data-testid={`switch-${feature.key}`}
                                checked={value}
                                onCheckedChange={(checked) => handleToggleFeature(feature.key, checked)}
                                disabled={updateBot.isPending}
                              />
                            </div>

                            {/* Auto-Reply message input */}
                            {feature.key === "autoReply" && value && (
                              <div className="mt-3 space-y-2">
                                <Input
                                  data-testid="input-auto-reply-message"
                                  placeholder="e.g. Hi! I'm busy, I'll reply soon..."
                                  defaultValue={bot?.autoReplyMessage ?? ""}
                                  onChange={(e) => setAutoReplyMsg(e.target.value)}
                                  className="bg-secondary/50 border-border/50 focus:border-primary/50 text-sm"
                                />
                                <Button size="sm" variant="outline" onClick={handleSaveAutoReply} disabled={updateBot.isPending}>
                                  <Save className="w-3.5 h-3.5 mr-1.5" />
                                  Save Message
                                </Button>
                              </div>
                            )}

                            {/* Bad words management */}
                            {feature.key === "antiBadWord" && value && (
                              <div className="mt-3 space-y-3">
                                <div className="flex gap-2">
                                  <Input
                                    data-testid="input-bad-word"
                                    placeholder="Add a bad word..."
                                    value={newBadWord}
                                    onChange={(e) => setNewBadWord(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleAddBadWord()}
                                    className="bg-secondary/50 border-border/50 focus:border-primary/50 text-sm"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={handleAddBadWord}
                                    disabled={updateBot.isPending || !newBadWord.trim()}
                                    data-testid="button-add-bad-word"
                                    className="shrink-0"
                                  >
                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                    Add
                                  </Button>
                                </div>
                                {badWordsList.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {badWordsList.map((word) => (
                                      <Badge
                                        key={word}
                                        variant="secondary"
                                        className="flex items-center gap-1 text-xs bg-destructive/10 text-destructive border-destructive/20 border"
                                      >
                                        {word}
                                        <button
                                          onClick={() => handleRemoveBadWord(word)}
                                          className="ml-0.5 hover:text-destructive/70 transition-colors"
                                          data-testid={`remove-bad-word-${word}`}
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground">
                                    No bad words added yet. Any user who sends a word from this list will be deleted and kicked.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
