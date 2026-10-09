import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Compass, Home, PlusCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/browse", label: "Explore", icon: Compass, exact: false },
  { to: "/provider", label: "Provide", icon: PlusCircle, exact: false },
  { to: "/profile", label: "Profile", icon: User, exact: false },
] as const;

const BARE = ["/welcome", "/login"];

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const bare = BARE.includes(path);
  const detail = path.startsWith("/listing/");
  if (bare) return <>{children}</>;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-[1100] hidden border-b bg-background/85 backdrop-blur md:block">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-6">
          <Link to="/" className="font-display text-2xl font-extrabold text-primary">padosi</Link>
          <nav className="flex gap-1">
            {TABS.map((t) => (
              <Link key={t.to} to={t.to} activeOptions={{ exact: t.exact }} className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground" activeProps={{ className: "bg-primary-soft text-primary" }}>
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className={cn("mx-auto max-w-6xl px-4 pt-4 md:px-6 md:pb-12", detail ? "pb-28" : "pb-24")}>{children}</main>
      {!detail && (
        <nav className="fixed inset-x-0 bottom-0 z-[1100] border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          <div className="grid grid-cols-4">
            {TABS.map((t) => (
              <Link key={t.to} to={t.to} activeOptions={{ exact: t.exact }} className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground" activeProps={{ className: "text-primary" }}>
                <t.icon className="h-6 w-6" />
                {t.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
