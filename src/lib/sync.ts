import { format } from "date-fns";
import { upsertSaleRows, writeMonthlySummary } from "./sheets.functions";
import { getState, updateSaleSync, type Sale } from "./store";

const stamp = (iso?: string) => (iso ? format(new Date(iso), "dd/MM/yyyy hh:mm a") : "");

function toRows(s: Sale) {
  const d = new Date(s.createdAt);
  const synced = stamp(new Date().toISOString());
  return s.items.map((l) => [
    s.billNumber, format(d, "dd/MM/yyyy"), format(d, "hh:mm a"), l.category || "-", l.name, l.size || "-",
    l.qty, l.price, l.subtotal, s.total, s.service, s.paymentStatus, s.paymentMethod ?? "",
    s.paymentNote ?? "", stamp(s.paymentUpdatedAt), synced,
  ]);
}

function summaryRows(sales: Sale[]) {
  const m = new Map<string, { t: number; n: number; paid: number; pend: number; pn: number }>();
  for (const s of sales) {
    const k = format(new Date(s.createdAt), "yyyy-MM");
    const r = m.get(k) ?? { t: 0, n: 0, paid: 0, pend: 0, pn: 0 };
    r.t += s.total; r.n++;
    if (s.paymentStatus === "Paid") r.paid += s.total;
    if (s.paymentStatus === "Pending") { r.pend += s.total; r.pn++; }
    m.set(k, r);
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, r]) => [format(new Date(k + "-01"), "MMMM yyyy"), r.t, r.n, r.paid, r.pend, r.pn]);
}

let running = false;
export async function syncPending(): Promise<{ synced: number; failed: number; skipped?: string }> {
  if (running) return { synced: 0, failed: 0 };
  const { sales, settings } = getState();
  const pending = sales.filter((s) => s.syncStatus !== "SYNCED" && s.items.length).reverse();
  if (!pending.length) return { synced: 0, failed: 0 };
  if (!settings.spreadsheetId) return { synced: 0, failed: 0, skipped: "Add a spreadsheet in Settings" };
  if (typeof navigator !== "undefined" && !navigator.onLine) return { synced: 0, failed: 0, skipped: "Offline" };
  running = true;
  let synced = 0, failed = 0;
  try {
    for (const s of pending) {
      try {
        await upsertSaleRows({ data: { spreadsheetId: settings.spreadsheetId, billNumber: s.billNumber, rows: toRows(s) } });
        updateSaleSync(s.id, "SYNCED");
        synced++;
      } catch (e) {
        updateSaleSync(s.id, "FAILED", e instanceof Error ? e.message : String(e));
        failed++;
      }
    }
    if (synced) {
      try {
        await writeMonthlySummary({ data: { spreadsheetId: settings.spreadsheetId, rows: summaryRows(getState().sales) } });
      } catch { /* summary is optional */ }
    }
  } finally {
    running = false;
  }
  return { synced, failed };
}
