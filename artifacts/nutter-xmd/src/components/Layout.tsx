import { Link } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { TerminalSquare, LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { signOut } = useClerk();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-8 h-14 border-b border-border/50 bg-card/80 backdrop-blur-md">
        <Link href="/dashboard" className="flex items-center gap-2 text-primary">
          <TerminalSquare className="w-5 h-5" />
          <span className="font-bold tracking-wider text-sm glow-text">NUTTER-XMD</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
              {user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || "U"}
            </div>
            <span className="text-muted-foreground">{user?.firstName || user?.primaryEmailAddress?.emailAddress}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 px-3"
            onClick={() => signOut()}
          >
            <LogOut className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 py-6 md:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
