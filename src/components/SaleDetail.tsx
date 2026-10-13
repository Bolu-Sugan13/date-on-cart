import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { inr, updatePayment, useStore, type PaymentStatus, type Sale } from "@/lib/store";
import { syncPending } from "@/lib/sync";
import { cn } from "@/lib/utils";
import { PaymentBadge, SyncBadge } from "./AppShell";

export function SaleDetail({ sale, onClose }: { sale: Sale | null; onClose: () => void }) {
  // always read the latest copy so status changes show immediately
  const live = useStore((s) => (sale ? s.sales.find((x) => x.id === sale.id) ?? sale : null));
  return (
    <Dialog open={!!sale} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-3xl max-w-md max-h-[92vh] overflow-y-auto">
        {live && <Body key={live.id} sale={live} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function Body({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<PaymentStatus>(sale.paymentStatus);
  const [note, setNote] = useState(sale.paymentNote ?? "");

  const apply = (s: PaymentStatus, n?: string) => {
    if (s === "Other" && !n?.trim()) { toast.error("Enter a payment note"); return; }
    updatePayment(sale.id, { paymentStatus: s, paymentNote: n?.trim() });
    toast.success(`Bill #${sale.billNumber} marked ${s}`);
    setEditing(false);
    void syncPending();
  };

  const rows: [string, string][] = [
    ["Date", format(new Date(sale.createdAt), "d MMMM yyyy")],
    ["Time", format(new Date(sale.createdAt), "hh:mm a")],
    ["Service", sale.service],
    ["Payment Method", sale.paymentMethod ?? "—"],
  ];
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl font-extrabold flex flex-wrap items-center gap-2">
          Bill #{sale.billNumber} <PaymentBadge status={sale.paymentStatus} /> <SyncBadge status={sale.syncStatus} />
        </DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="rounded-xl bg-secondary p-3">
            <div className="text-xs text-muted-foreground">{k}</div>
            <div className="font-semibold">{v}</div>
          </div>
        ))}
      </div>
      {sale.paymentNote && sale.paymentStatus === "Other" && (
        <div className="rounded-xl bg-cocoa/10 p-3 text-sm"><div className="text-xs text-muted-foreground">Payment Note</div>{sale.paymentNote}</div>
      )}
      {sale.paymentUpdatedAt && (
        <p className="text-xs text-muted-foreground">Payment status updated {format(new Date(sale.paymentUpdatedAt), "d MMM yyyy, hh:mm a")}</p>
      )}
      <div className="text-xs font-bold text-muted-foreground mt-2">ITEMS</div>
      <div className="divide-y">
        {sale.items.map((l, i) => (
          <div key={i} className="flex justify-between py-2">
            <div>
              <div className="font-semibold">{l.name}</div>
              <div className="text-xs text-muted-foreground">
                {l.category ? `${l.category} · ` : ""}{l.size ? `${l.size} · ` : ""}× {l.qty} @ {inr(l.price)}
              </div>
            </div>
            <div className="font-bold">{inr(l.subtotal)}</div>
          </div>
        ))}
      </div>
      <div className="flex justify-between border-t pt-3 text-lg font-extrabold">
        <span>TOTAL</span>
        <span>{inr(sale.total)}</span>
      </div>
      {sale.syncError && sale.syncStatus === "FAILED" && (
        <p className="text-xs text-destructive break-words">{sale.syncError.slice(0, 200)}</p>
      )}

      {editing ? (
        <div className="space-y-2 rounded-2xl bg-secondary p-3">
          <div className="text-xs font-bold text-muted-foreground">CHANGE PAYMENT STATUS</div>
          <StatusPicker value={status} onChange={setStatus} />
          {status === "Other" && (
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={2} placeholder="Describe the payment situation..." className="w-full rounded-xl bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setEditing(false)} className="press rounded-xl bg-card py-2.5 font-bold">Cancel</button>
            <button onClick={() => apply(status, note)} className="press rounded-xl bg-primary py-2.5 font-bold text-primary-foreground">Save</button>
          </div>
        </div>
      ) : (
        <div className="grid gap-2">
          {sale.paymentStatus !== "Paid" && (
            <button onClick={() => apply("Paid")} className="press w-full rounded-2xl bg-success py-3.5 font-extrabold text-success-foreground shadow-lift">Mark as Paid</button>
          )}
          <button onClick={() => setEditing(true)} className="press w-full rounded-2xl bg-secondary py-3 font-bold">Change Payment Status</button>
        </div>
      )}
      <button onClick={onClose} className="press w-full rounded-2xl bg-foreground text-background py-3 font-bold">Close</button>
    </>
  );
}

export function StatusPicker({ value, onChange }: { value: PaymentStatus | null; onChange: (s: PaymentStatus) => void }) {
  const tone: Record<PaymentStatus, string> = {
    Paid: "border-success bg-success/15 text-success",
    Pending: "border-warning bg-warning/20 text-warning-foreground",
    Other: "border-cocoa bg-cocoa/15 text-cocoa",
  };
  return (
    <div className="grid grid-cols-3 gap-2">
      {(["Paid", "Pending", "Other"] as PaymentStatus[]).map((p) => (
        <button key={p} onClick={() => onChange(p)} className={cn("press rounded-xl border-2 py-3 font-bold", value === p ? tone[p] : "border-transparent bg-card text-muted-foreground")}>{p}</button>
      ))}
    </div>
  );
}
