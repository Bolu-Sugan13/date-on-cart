import { format } from "date-fns";
import { appendSaleRows } from "./sheets.functions";
import { getState, updateSaleSync, type Sale } from "./store";

function toRows(s: Sale) {
  const d = new Date(s.createdAt);
  return s.items.map((l) => [
    s.billNumber, format(d, "dd/MM/yy"), format(d, "hh:mm a"), s.service, s.payment,
    l.name, l.size || "-", l.qty, l.price, l.subtotal, s.total,
  ]);
}

let running = false;
export async function syncPending(): Promise<{ synced: number; failed: number; skipped?: string }> {
  if (running) return { synced: 0, failed: 0 };
  const { sales, settings } = getState();
  const pending = sales.filter((s) => s.syncStatus !== "SYNCED").reverse();
  if (!pending.length) return { synced: 0, failed: 0 };
  if (!settings.spreadsheetId) return { synced: 0, failed: 0, skipped: "Add a spreadsheet in Settings" };
  if (typeof navigator !== "undefined" && !navigator.onLine) return { synced: 0, failed: 0, skipped: "Offline" };
  running = true;
  let synced = 0, failed = 0;
  try {
    for (const s of pending) {
      try {
        await appendSaleRows({ data: { spreadsheetId: settings.spreadsheetId, rows: toRows(s) } });
        updateSaleSync(s.id, "SYNCED");
        synced++;
      } catch (e) {
        updateSaleSync(s.id, "FAILED", e instanceof Error ? e.message : String(e));
        failed++;
      }
    }
  } finally {
    running = false;
  }
  return { synced, failed };
}
