import { createFileRoute, Link } from "@tanstack/react-router";
import { format, isSameDay, isSameMonth } from "date-fns";
import { Plus, ShoppingBag, Utensils } from "lucide-react";
import { useState } from "react";
import { EmptyState, PaymentBadge, SyncBadge } from "@/components/AppShell";
import { SaleDetail } from "@/components/SaleDetail";
import { inr, useStore, type Sale } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Date Café" },
      { name: "description", content: "Today's sales, orders and recent transactions for your dessert cart." },
      { property: "og:title", content: "Dashboard — Date Café" },
      { property: "og:description", content: "Today's sales, orders and recent transactions for your dessert cart." },
    ],
  }),
  component: Home,
});

function Home() {
  const sales = useStore((s) => s.sales);
  const name = useStore((s) => s.settings.businessName);
  const [open, setOpen] = useState<Sale | null>(null);
  const now = new Date();
  const today = sales.filter((s) => isSameDay(new Date(s.createdAt), now));
  const month = sales.filter((s) => isSameMonth(new Date(s.createdAt), now));
  const tTotal = today.reduce((a, s) => a + s.total, 0);
  const mTotal = month.reduce((a, s) => a + s.total, 0);
  const pend = sales.filter((s) => s.paymentStatus === "Pending");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-muted-foreground">{format(now, "EEEE, d MMMM yyyy")}</p>
        <h1 className="text-3xl font-black tracking-tight">{name}</h1>
        <p className="text-muted-foreground">Digital Billing & Sales</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="col-span-2 md:col-span-1 rounded-3xl bg-foreground text-background p-5 shadow-lift">
          <div className="text-xs font-bold opacity-70">TODAY'S SALES</div>
          <div className="text-4xl font-black mt-1">{inr(tTotal)}</div>
        </div>
        <Stat label="TODAY'S ORDERS" value={String(today.length)} />
        <Stat label="AVERAGE ORDER" value={inr(today.length ? Math.round(tTotal / today.length) : 0)} />
      </div>

      <Link
        to="/bill"
        className="press flex items-center justify-center gap-2 rounded-3xl bg-primary py-5 text-lg font-extrabold text-primary-foreground shadow-lift hover:brightness-105"
      >
        <Plus className="size-6" /> NEW BILL
      </Link>

      {pend.length > 0 && (
        <Link to="/records" search={{ view: "pending" }} className="press flex items-center justify-between rounded-3xl bg-warning/20 p-5 shadow-soft">
          <div>
            <div className="text-xs font-bold text-warning-foreground">PENDING PAYMENTS</div>
            <div className="text-2xl font-black">{inr(pend.reduce((a, s) => a + s.total, 0))}</div>
          </div>
          <span className="text-sm font-bold">{pend.length} bill{pend.length > 1 ? "s" : ""} →</span>
        </Link>
      )}

      <section className="rounded-3xl bg-secondary p-5">
        <div className="text-xs font-bold text-cocoa">CURRENT MONTH · {format(now, "MMMM").toUpperCase()}</div>
        <div className="mt-2 flex gap-8">
          <div><div className="text-2xl font-black">{inr(mTotal)}</div><div className="text-xs text-muted-foreground">Total Sales</div></div>
          <div><div className="text-2xl font-black">{month.length}</div><div className="text-xs text-muted-foreground">Total Orders</div></div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-extrabold text-lg">Recent Transactions</h2>
          {sales.length > 0 && <Link to="/records" className="text-sm font-bold text-primary">View all</Link>}
        </div>
        {sales.length === 0 ? (
          <EmptyState icon="🧁" title="No sales recorded yet" text="Your completed sales will appear here." />
        ) : (
          <div className="space-y-2">
            {sales.slice(0, 6).map((s) => <SaleRow key={s.id} sale={s} onClick={() => setOpen(s)} />)}
          </div>
        )}
      </section>
      <SaleDetail sale={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-card p-5 shadow-soft">
      <div className="text-xs font-bold text-muted-foreground">{label}</div>
      <div className="text-2xl font-black mt-1">{value}</div>
    </div>
  );
}

export function SaleRow({ sale, onClick }: { sale: Sale; onClick: () => void }) {
  return (
    <button onClick={onClick} className="press w-full flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft text-left hover:shadow-lift">
      <div className="grid size-11 place-items-center rounded-xl bg-secondary text-cocoa">
        {sale.service === "Dine In" ? <Utensils className="size-5" /> : <ShoppingBag className="size-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold flex items-center gap-2">#{sale.billNumber} <PaymentBadge status={sale.paymentStatus} /> <SyncBadge status={sale.syncStatus} /></div>
        <div className="text-xs text-muted-foreground">
          {customerLabel(sale)} · {format(new Date(sale.createdAt), "d MMM, hh:mm a")} · {sale.service}{sale.paymentMethod ? ` · ${sale.paymentMethod}` : ""}
        </div>
      </div>
      <div className="text-lg font-black">{inr(sale.total)}</div>
    </button>
  );
}
