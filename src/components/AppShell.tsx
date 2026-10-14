import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Plus, ScrollText, Cake, Settings, Clock } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import { syncPending } from "@/lib/sync";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/records", label: "Records", icon: ScrollText },
  { to: "/bill", label: "New Bill", icon: Plus, main: true },
  { to: "/items", label: "Items", icon: Cake },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const run = async () => {
      const r = await syncPending();
      if (r.synced) toast.success(`${r.synced} sale(s) synced to spreadsheet`);
    };
    void run();
    window.addEventListener("online", run);
    return () => window.removeEventListener("online", run);
  }, []);

  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 bg-sidebar text-sidebar-foreground p-4 gap-1">
        <div className="px-3 py-4 mb-4">
          <div className="flex items-center gap-3"><img src="/icon-192.png" alt="Date" width={44} height={44} className="rounded-full" /><div><div className="font-display text-xl font-bold">Date</div><div className="text-xs opacity-70">Desserts & Coffee · White Town</div></div></div>
        </div>
        {[NAV[0], NAV[2], NAV[1], { to: "/pending", label: "Pending Payments", icon: Clock } as const, NAV[3], NAV[4]].map((n) => {
          const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
          const Icon = n.icon;
          return (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "press flex items-center gap-3 rounded-xl px-3 py-3 font-semibold",
                "main" in n && n.main
                  ? "bg-sidebar-primary text-sidebar-primary-foreground my-2 shadow-lift"
                  : active
                    ? "bg-sidebar-accent"
                    : "opacity-80 hover:bg-sidebar-accent",
              )}
            >
              <Icon className="size-5" /> {n.label}
            </Link>
          );
        })}
      </aside>

      <main className="flex-1 md:ml-60 pb-28 md:pb-10">
        <div key={path} className="mx-auto max-w-5xl px-4 pt-5 md:px-8 md:pt-8 animate-fade-up">
          {children}
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t shadow-soft pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 items-end">
          {NAV.map((n) => {
            const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
            const Icon = n.icon;
            if ("main" in n && n.main)
              return (
                <Link key={n.to} to={n.to} className="flex flex-col items-center -mt-6 pb-2">
                  <span className="press grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lift ring-4 ring-background">
                    <Icon className="size-7" />
                  </span>
                  <span className="text-[11px] font-bold mt-1 text-primary">New Bill</span>
                </Link>
              );
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" /> {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="rounded-3xl bg-card shadow-soft p-10 text-center flex flex-col items-center">
      <div className="grid size-20 place-items-center rounded-full bg-secondary text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-5">{text}</p>
      {action}
    </div>
  );
}

export function SyncBadge({ status }: { status: "SYNCED" | "PENDING" | "FAILED" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide",
        status === "SYNCED" && "bg-success/15 text-success",
        status === "PENDING" && "bg-secondary text-cocoa",
        status === "FAILED" && "bg-destructive/15 text-destructive",
      )}
    >
      {status}
    </span>
  );
}

export function PaymentBadge({ status }: { status: "Paid" | "Pending" | "Other" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
        status === "Paid" && "bg-success/15 text-success",
        status === "Pending" && "bg-warning/20 text-warning-foreground",
        status === "Other" && "bg-cocoa/15 text-cocoa",
      )}
    >
      {status}
    </span>
  );
}
