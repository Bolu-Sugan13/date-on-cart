import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { inr, type Sale } from "@/lib/store";
import { SyncBadge } from "./AppShell";

export function SaleDetail({ sale, onClose }: { sale: Sale | null; onClose: () => void }) {
  return (
    <Dialog open={!!sale} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-3xl max-w-md">
        {sale && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
                Transaction #{sale.billNumber} <SyncBadge status={sale.syncStatus} />
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Date", format(new Date(sale.createdAt), "d MMMM yyyy")],
                ["Time", format(new Date(sale.createdAt), "hh:mm a")],
                ["Service", sale.service],
                ["Payment", sale.payment],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-secondary p-3">
                  <div className="text-xs text-muted-foreground">{k}</div>
                  <div className="font-semibold">{v}</div>
                </div>
              ))}
            </div>
            <div className="text-xs font-bold text-muted-foreground mt-2">ITEMS</div>
            <div className="divide-y">
              {sale.items.map((l, i) => (
                <div key={i} className="flex justify-between py-2">
                  <div>
                    <div className="font-semibold">{l.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {l.size ? `${l.size} · ` : ""}× {l.qty} @ {inr(l.price)}
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
            <button onClick={onClose} className="press w-full rounded-2xl bg-foreground text-background py-3 font-bold">
              Close
            </button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
