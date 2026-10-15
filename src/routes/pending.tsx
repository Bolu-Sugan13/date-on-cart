import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { toast } from "sonner";
import { EmptyState, PageHeader } from "@/components/AppShell";
import { inr, updatePayment, useStore } from "@/lib/store";
import { syncPending } from "@/lib/sync";

export const Route = createFileRoute("/pending")({
  head: () => ({
    meta: [
      { title: "Pending Payments — Date Café" },
      { name: "description", content: "Unpaid bills and the total amount still owed." },
      { property: "og:title", content: "Pending Payments — Date Café" },
      { property: "og:description", content: "Unpaid bills and the total amount still owed." },
    ],
  }),
  component: PendingPage,
});

function PendingPage() {
  const sales = useStore((s) => s.sales);
  const pending = sales.filter((s) => s.paymentStatus === "Pending");
  const total = pending.reduce((a, s) => a + s.total, 0);
  return (
    <div>
      <PageHeader title="Pending Payments" />
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-card p-4 shadow-soft"><div className="text-xs font-bold text-muted-foreground">PENDING BILLS</div><div className="font-display text-3xl text-warning">{pending.length}</div></div>
        <div className="rounded-3xl bg-card p-4 shadow-soft"><div className="text-xs font-bold text-muted-foreground">AMOUNT OWED</div><div className="font-display text-3xl text-warning">{inr(total)}</div></div>
      </div>
      {pending.length === 0 ? (
        <EmptyState icon="✓" title="No pending payments" text="Every bill has been paid." />
      ) : (
        <div className="space-y-3">
          {pending.map((s) => (
            <div key={s.id} className="rounded-3xl bg-card p-4 shadow-soft">
              <div className="flex justify-between gap-2">
                <div>
                  <div className="font-bold">Bill #{s.billNumber}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(s.createdAt), "dd MMM yyyy, hh:mm a")} · {s.service}{s.paymentMethod ? ` · ${s.paymentMethod}` : ""}</div>
                </div>
                <div className="font-display text-xl">{inr(s.total)}</div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{s.items.map((l) => `${l.name}${l.size ? ` (${l.size})` : ""} × ${l.qty}`).join(", ")}</p>
              <button onClick={() => { updatePayment(s.id, { paymentStatus: "Paid" }); toast.success(`Bill #${s.billNumber} marked Paid`); void syncPending(); }} className="press mt-3 w-full rounded-xl bg-success py-2.5 font-bold text-success-foreground">Mark as Paid</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
