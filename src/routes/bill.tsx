import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Minus, Plus, Search, ShoppingBag, Trash2, Utensils } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState, PageHeader } from "@/components/AppShell";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusPicker } from "@/components/SaleDetail";
import { createSale, inr, useStore, type Category, type Item, type PaymentMethod, type PaymentStatus, type Sale, type SaleLine, type Service, type Size } from "@/lib/store";
import { syncPending } from "@/lib/sync";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bill")({
  head: () => ({
    meta: [
      { title: "New Bill — Date Café" },
      { name: "description", content: "Create a new bill quickly from your phone." },
      { property: "og:title", content: "New Bill — Date Café" },
      { property: "og:description", content: "Create a new bill quickly from your phone." },
    ],
  }),
  component: BillPage,
});

type Line = SaleLine & { key: string };

function BillPage() {
  const items = useStore((s) => s.items).filter((i) => i.enabled);
  const [q, setQ] = useState("");
  const [picking, setPicking] = useState<Item | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [service, setService] = useState<Service>("Take Away");
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [note, setNote] = useState("");
  const [cat, setCat] = useState<Category | "All">("All");
  const [review, setReview] = useState(false);
  const [done, setDone] = useState<Sale | null>(null);
  const navigate = useNavigate();

  const allCats = useStore((st) => st.categories);
  const cats = useMemo(() => allCats.filter((c) => !c.archived).map((c) => c.name), [allCats]);
  const filtered = useMemo(() => items.filter((i) => cats.includes(i.category) && (cat === "All" || i.category === cat) && i.name.toLowerCase().includes(q.toLowerCase())), [items, q, cat, cats]);
  const total = lines.reduce((a, l) => a + l.subtotal, 0);
  const count = lines.reduce((a, l) => a + l.qty, 0);

  const addLine = (item: Item, size: Size, qty: number) => {
    const key = item.id + ":" + size.id;
    setLines((prev) => {
      const ex = prev.find((l) => l.key === key);
      if (ex) return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + qty, subtotal: (l.qty + qty) * l.price } : l));
      return [...prev, { key, itemId: item.id, category: item.category, name: item.name, size: size.name, qty, price: size.price, subtotal: qty * size.price }];
    });
    toast.success(`${item.name}${size.name ? ` (${size.name})` : ""} × ${qty} added`, { duration: 1200 });
  };
  const changeQty = (key: string, d: number) =>
    setLines((prev) => prev.flatMap((l) => (l.key !== key ? [l] : l.qty + d <= 0 ? [] : [{ ...l, qty: l.qty + d, subtotal: (l.qty + d) * l.price }])));

  const save = async (): Promise<void> => {
    if (!lines.length) return;
    if (!status) { toast.error("Choose a payment status"); return; }
    if (status === "Other" && !note.trim()) { toast.error("Enter a payment note"); return; }
    const sale = createSale({ service, paymentStatus: status, paymentMethod: payment ?? undefined, paymentNote: note.trim() || undefined, items: lines.map(({ key: _k, ...l }) => l) });
    setReview(false);
    setDone(sale);
    setLines([]);
    setPayment(null);
    setStatus(null);
    setNote("");
    void syncPending();
  };

  if (done)
    return (
      <div className="min-h-[70vh] grid place-items-center">
        <div className="text-center max-w-sm w-full">
          <div className="animate-pop mx-auto grid size-24 place-items-center rounded-full bg-success text-success-foreground shadow-lift">
            <Check className="size-12" strokeWidth={3} />
          </div>
          <h1 className="mt-6 text-2xl font-black">SALE SAVED</h1>
          <p className="mt-1 text-muted-foreground">Bill #{done.billNumber} saved as <b>{done.paymentStatus}</b>.</p>
          <div className="mt-2 text-3xl font-black">{inr(done.total)}</div>
          <div className="mt-8 grid gap-2">
            <button onClick={() => setDone(null)} className="press rounded-2xl bg-primary py-4 font-extrabold text-primary-foreground shadow-lift">New Bill</button>
            <button onClick={() => navigate({ to: "/records", search: { bill: done.billNumber } })} className="press rounded-2xl bg-secondary py-4 font-bold">View Record</button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="md:grid md:grid-cols-[1fr_20rem] md:gap-6">
      <div>
        <PageHeader title="New Bill" subtitle="Tap a dessert to add it" />
        {items.length === 0 ? (
          <EmptyState icon="🍨" title="No desserts available." text="Add desserts from the Items section first."
            action={<Link to="/items" className="press rounded-2xl bg-primary px-5 py-3 font-bold text-primary-foreground">Go to Items</Link>} />
        ) : (
          <>
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search item..." className="w-full rounded-2xl bg-card py-4 pl-12 pr-4 font-semibold shadow-soft outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4">
              {["All", ...cats].map((c) => {
                const n = c === "All" ? items.length : items.filter((i) => i.category === c).length;
                return (
                  <button key={c} onClick={() => setCat(c)} className={cn("press shrink-0 rounded-full px-4 py-2 text-sm font-bold", cat === c ? "bg-foreground text-background" : "bg-card text-muted-foreground shadow-soft")}>
                    {c} <span className="opacity-60">{n}</span>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((it) => {
                const prices = it.sizes.map((s) => s.price);
                const min = Math.min(...prices), max = Math.max(...prices);
                return (
                  <button key={it.id} onClick={() => setPicking(it)} className="press rounded-3xl bg-card p-4 text-left shadow-soft hover:shadow-lift min-h-32 flex flex-col">
                    <div className="font-bold leading-tight">{it.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{it.hasSizes ? it.sizes.map((s) => s.name).join(" · ") : "Single price"}</div>
                    <div className="mt-auto pt-3 flex items-end justify-between">
                      <span className="text-lg font-black">{min === max ? inr(min) : `${inr(min)}+`}</span>
                      <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground"><Plus className="size-5" /></span>
                    </div>
                  </button>
                );
              })}
              {filtered.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">{q ? `No item matches "${q}"` : "No items in this category yet"}</p>}
            </div>
          </>
        )}
      </div>

      {/* Desktop order panel */}
      <aside className="hidden md:block">
        <div className="sticky top-8 rounded-3xl bg-card p-5 shadow-soft">
          <OrderBody lines={lines} total={total} changeQty={changeQty} />
          <button disabled={!lines.length} onClick={() => setReview(true)} className="press mt-4 w-full rounded-2xl bg-primary py-4 font-extrabold text-primary-foreground shadow-lift disabled:opacity-40">Review Order</button>
        </div>
      </aside>

      {/* Mobile sticky order bar */}
      {lines.length > 0 && (
        <button onClick={() => setReview(true)} className="md:hidden press fixed inset-x-3 bottom-24 z-30 flex items-center justify-between rounded-2xl bg-foreground px-5 py-4 text-background shadow-lift animate-fade-up">
          <span className="text-left">
            <span className="block text-xs opacity-70">CURRENT ORDER · {count} item{count > 1 ? "s" : ""}</span>
            <span className="text-xl font-black">{inr(total)}</span>
          </span>
          <span className="rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground">View Order</span>
        </button>
      )}

      <PickDialog item={picking} onClose={() => setPicking(null)} onAdd={addLine} />

      <Dialog open={review} onOpenChange={setReview}>
        <DialogContent className="rounded-3xl max-w-md max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-xl font-extrabold">Order Summary</DialogTitle></DialogHeader>
          <OrderBody lines={lines} total={total} changeQty={changeQty} hideTitle />
          <div className="text-xs font-bold text-muted-foreground">SERVICE TYPE</div>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1">
            {(["Dine In", "Take Away"] as Service[]).map((s) => (
              <button key={s} onClick={() => setService(s)} className={cn("press flex items-center justify-center gap-2 rounded-xl py-3 font-bold", service === s ? "bg-card shadow-soft" : "text-muted-foreground")}>
                {s === "Dine In" ? <Utensils className="size-4" /> : <ShoppingBag className="size-4" />} {s}
              </button>
            ))}
          </div>
          <div className="text-xs font-bold text-muted-foreground">PAYMENT STATUS</div>
          <StatusPicker value={status} onChange={setStatus} />
          {status === "Other" && (
            <>
              <label className="text-xs font-bold text-muted-foreground">PAYMENT NOTE *</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={2} placeholder="Describe the payment situation..." className="w-full rounded-xl bg-secondary px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </>
          )}
          <div className="text-xs font-bold text-muted-foreground">PAYMENT METHOD (OPTIONAL)</div>
          <div className="grid grid-cols-4 gap-2">
            {(["Cash", "UPI", "Card", "Other"] as PaymentMethod[]).map((p) => (
              <button key={p} onClick={() => setPayment(payment === p ? null : p)} className={cn("press rounded-xl py-3 font-bold border-2", payment === p ? "border-primary bg-primary/10 text-foreground" : "border-transparent bg-secondary text-muted-foreground")}>{p}</button>
            ))}
          </div>
          <div className="flex justify-between rounded-2xl bg-secondary p-4 text-sm">
            <span>Service <b className="block text-base">{service}</b></span>
            <span className="text-right">Payment <b className="block text-base">{status ?? "—"}</b></span>
          </div>
          <button onClick={save} disabled={!lines.length} className="press w-full rounded-2xl bg-primary py-4 text-lg font-black text-primary-foreground shadow-lift disabled:opacity-40">
            SAVE RECORD · {inr(total)}
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrderBody({ lines, total, changeQty, hideTitle }: { lines: Line[]; total: number; changeQty: (k: string, d: number) => void; hideTitle?: boolean }) {
  return (
    <div>
      {!hideTitle && <div className="text-xs font-bold text-muted-foreground mb-2">CURRENT ORDER</div>}
      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No items yet</p>
      ) : (
        <div className="divide-y">
          {lines.map((l) => (
            <div key={l.key} className="py-3 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{l.name}</div>
                <div className="text-xs text-muted-foreground">{l.size ? `${l.size} · ` : ""}{inr(l.price)} each</div>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-secondary p-1">
                <button onClick={() => changeQty(l.key, -1)} className="press grid size-7 place-items-center rounded-full bg-card" aria-label="Decrease">
                  {l.qty === 1 ? <Trash2 className="size-3.5 text-destructive" /> : <Minus className="size-3.5" />}
                </button>
                <span key={l.qty} className="w-6 text-center font-black animate-pop">{l.qty}</span>
                <button onClick={() => changeQty(l.key, 1)} className="press grid size-7 place-items-center rounded-full bg-card" aria-label="Increase"><Plus className="size-3.5" /></button>
              </div>
              <div className="w-16 text-right font-black">{inr(l.subtotal)}</div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 flex justify-between border-t-2 border-dashed pt-3 text-xl font-black">
        <span>TOTAL</span><span>{inr(total)}</span>
      </div>
    </div>
  );
}

function PickDialog({ item, onClose, onAdd }: { item: Item | null; onClose: () => void; onAdd: (i: Item, s: Size, q: number) => void }) {
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-3xl max-w-sm">
        {item && <PickBody key={item.id} item={item} onDone={(s, q) => { onAdd(item, s, q); onClose(); }} />}
      </DialogContent>
    </Dialog>
  );
}

function PickBody({ item, onDone }: { item: Item; onDone: (s: Size, q: number) => void }) {
  const [size, setSize] = useState<Size | null>(item.hasSizes && item.sizes.length > 1 ? null : (item.sizes[0] ?? null));
  const [qty, setQty] = useState(1);
  return (
    <>
      <DialogHeader><DialogTitle className="text-xl font-extrabold">{item.name}</DialogTitle></DialogHeader>
      {item.hasSizes && (
        <>
          <div className="text-xs font-bold text-muted-foreground">SELECT SIZE</div>
          <div className="grid gap-2">
            {item.sizes.map((s) => (
              <button key={s.id} onClick={() => setSize(s)} className={cn("press flex justify-between rounded-2xl border-2 px-4 py-3.5", size?.id === s.id ? "border-primary bg-primary/10" : "border-transparent bg-secondary")}>
                <span className="font-bold">{s.name}</span><span className="font-black">{inr(s.price)}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {size && (
        <>
          <div className="text-xs font-bold text-muted-foreground">QUANTITY</div>
          <div className="flex items-center justify-center gap-6">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="press grid size-14 place-items-center rounded-full bg-secondary"><Minus /></button>
            <span key={qty} className="w-12 text-center text-4xl font-black animate-pop">{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="press grid size-14 place-items-center rounded-full bg-secondary"><Plus /></button>
          </div>
        </>
      )}
      <button disabled={!size} onClick={() => size && onDone(size, qty)} className="press w-full rounded-2xl bg-primary py-4 font-extrabold text-primary-foreground shadow-lift disabled:opacity-40">
        {size ? `Add to Bill · ${inr(size.price * qty)}` : "Select a size"}
      </button>
    </>
  );
}
