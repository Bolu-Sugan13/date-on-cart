import { createFileRoute } from "@tanstack/react-router";
import { endOfDay, format, isWithinInterval, startOfDay, startOfMonth, startOfWeek, subDays, subMonths, endOfMonth } from "date-fns";
import { ChevronLeft, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { EmptyState, PageHeader, PaymentBadge, SyncBadge } from "@/components/AppShell";
import { SaleDetail } from "@/components/SaleDetail";
import { inr, useStore, type Sale } from "@/lib/store";
import { cn } from "@/lib/utils";
import { SaleRow } from "./index";

export const Route = createFileRoute("/records")({
  validateSearch: z.object({ bill: z.number().optional(), view: z.enum(["pending"]).optional() }),
  head: () => ({
    meta: [
      { title: "Sales Records — Date Café" },
      { name: "description", content: "Search, filter and review every sale, grouped by month." },
      { property: "og:title", content: "Sales Records — Date Café" },
      { property: "og:description", content: "Search, filter and review every sale, grouped by month." },
    ],
  }),
  component: Records,
});

const PERIODS = ["All", "Today", "Yesterday", "This Week", "This Month", "Last Month", "Custom"] as const;
const TYPES = ["Dine In", "Take Away", "Paid", "Pending", "Other"] as const;

function range(p: (typeof PERIODS)[number], from: string, to: string): [Date, Date] | null {
  const n = new Date();
  switch (p) {
    case "Today": return [startOfDay(n), endOfDay(n)];
    case "Yesterday": { const y = subDays(n, 1); return [startOfDay(y), endOfDay(y)]; }
    case "This Week": return [startOfWeek(n, { weekStartsOn: 1 }), endOfDay(n)];
    case "This Month": return [startOfMonth(n), endOfDay(n)];
    case "Last Month": { const m = subMonths(n, 1); return [startOfMonth(m), endOfMonth(m)]; }
    case "Custom": return from && to ? [startOfDay(new Date(from)), endOfDay(new Date(to))] : null;
    default: return null;
  }
}

function Records() {
  const sales = useStore((s) => s.sales);
  const { bill, view: sv } = Route.useSearch();
  const [view, setView] = useState<"list" | "months">("list");
  const [month, setMonth] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("All");
  const [types, setTypes] = useState<string[]>(sv === "pending" ? ["Pending"] : []);
  const [cat, setCat] = useState<string>("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [open, setOpen] = useState<Sale | null>(null);

  useEffect(() => {
    if (bill) setOpen(sales.find((s) => s.billNumber === bill) ?? null);
  }, [bill, sales]);

  const months = useMemo(() => {
    const m = new Map<string, Sale[]>();
    sales.forEach((s) => { const k = format(new Date(s.createdAt), "yyyy-MM"); m.set(k, [...(m.get(k) ?? []), s]); });
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [sales]);

  const catNames = useStore((st) => st.categories).map((c) => c.name);
  const filtered = useMemo(() => {
    const r = range(period, from, to);
    const term = q.trim().toLowerCase();
    return sales.filter((s) => {
      const d = new Date(s.createdAt);
      if (month && format(d, "yyyy-MM") !== month) return false;
      if (r && !isWithinInterval(d, { start: r[0], end: r[1] })) return false;
      const svc: string[] = types.filter((t) => t === "Dine In" || t === "Take Away");
      const pay = types.filter((t) => !(svc as string[]).includes(t));
      if (svc.length && !(svc as string[]).includes(s.service)) return false;
      if (pay.length && !pay.includes(s.paymentStatus)) return false;
      if (cat !== "All" && !s.items.some((l) => l.category === cat)) return false;
      if (term && !String(s.billNumber).includes(term) && !s.items.some((l) => l.name.toLowerCase().includes(term))) return false;
      return true;
    });
  }, [sales, period, from, to, q, types, month, cat]);

  const fTotal = filtered.reduce((a, s) => a + s.total, 0);
  const pend = filtered.filter((s) => s.paymentStatus === "Pending");
  const pTotal = pend.reduce((a, s) => a + s.total, 0);
  const chip = (on: boolean) => cn("press shrink-0 rounded-full px-3.5 py-2 text-sm font-bold", on ? "bg-foreground text-background" : "bg-card text-muted-foreground shadow-soft");

  if (sales.length === 0)
    return (<><PageHeader title="Records" /><EmptyState icon="📒" title="No sales recorded yet." text="Your completed sales will appear here." /></>);

  return (
    <div>
      <PageHeader title={month ? format(new Date(month + "-01"), "MMMM yyyy") : "Records"} subtitle={`${sales.length} transactions stored`}
        action={month ? <button onClick={() => setMonth(null)} className="press flex items-center gap-1 rounded-xl bg-card px-3 py-2 font-bold shadow-soft"><ChevronLeft className="size-4" /> Back</button> : undefined} />

      {!month && (
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-secondary p-1 max-w-xs">
          {(["list", "months"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={cn("press rounded-xl py-2 font-bold", view === v ? "bg-card shadow-soft" : "text-muted-foreground")}>
              {v === "list" ? "All Sales" : "By Month"}
            </button>
          ))}
        </div>
      )}

      {view === "months" && !month ? (
        <div className="grid gap-3 md:grid-cols-2">
          {months.map(([k, list]) => {
            const t = list.reduce((a, s) => a + s.total, 0);
            return (
              <button key={k} onClick={() => setMonth(k)} className="press rounded-3xl bg-card p-5 text-left shadow-soft hover:shadow-lift">
                <div className="text-xs font-bold text-muted-foreground">{format(new Date(k + "-01"), "MMMM yyyy").toUpperCase()}</div>
                <div className="text-3xl font-black mt-1">{inr(t)}</div>
                <div className="text-sm text-muted-foreground">{list.length} orders · Avg {inr(Math.round(t / list.length))}</div>
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div className="relative mb-3">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search bill number or item..." className="w-full rounded-2xl bg-card py-3.5 pl-12 pr-4 font-semibold shadow-soft outline-none focus:ring-2 focus:ring-ring" />
          </div>
          {!month && (
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
              {PERIODS.map((p) => <button key={p} onClick={() => setPeriod(p)} className={chip(period === p)}>{p}</button>)}
            </div>
          )}
          {period === "Custom" && !month && (
            <div className="flex gap-2 my-2">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="flex-1 rounded-xl bg-card px-3 py-2 shadow-soft" />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="flex-1 rounded-xl bg-card px-3 py-2 shadow-soft" />
            </div>
          )}
          <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4">
            {TYPES.map((t) => (
              <button key={t} onClick={() => setTypes(types.includes(t) ? types.filter((x) => x !== t) : [...types, t])} className={cn("press shrink-0 rounded-full border-2 px-3 py-1.5 text-xs font-bold", types.includes(t) ? "border-primary bg-primary/10" : "border-border text-muted-foreground")}>{t}</button>
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4">
            {["All", ...catNames].map((c) => (
              <button key={c} onClick={() => setCat(c)} className={cn("press shrink-0 rounded-full border-2 px-3 py-1.5 text-xs font-bold", cat === c ? "border-primary bg-primary/10" : "border-border text-muted-foreground")}>{c === "All" ? "All Categories" : c}</button>
            ))}
          </div>

          <div className="mb-3 flex justify-between rounded-2xl bg-secondary px-4 py-3 text-sm">
            <span><b>{filtered.length}</b> transactions</span><span className="font-black">{inr(fTotal)}</span>
          </div>
          {pend.length > 0 && (
            <div className="mb-3 flex justify-between rounded-2xl bg-warning/20 px-4 py-3 text-sm">
              <span><b>{pend.length}</b> pending payment{pend.length === 1 ? "" : "s"}</span><span className="font-black">{inr(pTotal)}</span>
            </div>
          )}

          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">No records match these filters.</p>
          ) : (
            <>
              <div className="space-y-2 md:hidden">{filtered.map((s) => <SaleRow key={s.id} sale={s} onClick={() => setOpen(s)} />)}</div>
              <div className="hidden md:block overflow-hidden rounded-3xl bg-card shadow-soft">
                <table className="w-full text-sm">
                  <thead className="bg-secondary text-left text-xs text-cocoa">
                    <tr>{["Bill No", "Date", "Time", "Service", "Payment Status", "Sync", "Total"].map((h) => <th key={h} className={cn("px-4 py-3 font-bold", h === "Total" && "text-right")}>{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.map((s) => {
                      const d = new Date(s.createdAt);
                      return (
                        <tr key={s.id} onClick={() => setOpen(s)} className="cursor-pointer hover:bg-secondary/50">
                          <td className="px-4 py-3 font-bold">#{s.billNumber}</td>
                          <td className="px-4 py-3">{format(d, "d MMM yyyy")}</td>
                          <td className="px-4 py-3">{format(d, "hh:mm a")}</td>
                          <td className="px-4 py-3">{s.service}</td>
                          <td className="px-4 py-3"><PaymentBadge status={s.paymentStatus} /></td>
                          <td className="px-4 py-3"><SyncBadge status={s.syncStatus} /></td>
                          <td className="px-4 py-3 text-right font-black">{inr(s.total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
      <SaleDetail sale={open} onClose={() => setOpen(null)} />
    </div>
  );
}
