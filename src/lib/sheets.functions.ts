import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";
const SALES = "Sales";
const SUMMARY = "Monthly Summary";
const HEADER = [
  "Bill Number", "Transaction Date", "Transaction Time", "Category", "Item Name", "Size", "Quantity",
  "Unit Price", "Item Subtotal", "Order Total", "Service Type", "Payment Status", "Payment Method",
  "Payment Note", "Payment Status Updated At", "Last Synced At",
];
const SUMMARY_HEADER = [
  "Month", "Total Sales", "Number of Transactions", "Paid Amount", "Pending Amount", "Number of Pending Transactions",
];

export const getSheetsStatus = createServerFn({ method: "GET" }).handler(async () => {
  return { connected: Boolean(process.env["LOVABLE_API_KEY"] && process.env["GOOGLE_SHEETS_API_KEY"]) };
});

const cell = z.union([z.string().max(500), z.number()]);
const idSchema = z.string().min(10).max(200).regex(/^[A-Za-z0-9_-]+$/);

function client(spreadsheetId: string) {
  const lov = process.env["LOVABLE_API_KEY"];
  const key = process.env["GOOGLE_SHEETS_API_KEY"];
  if (!lov || !key) throw new Error("Google Sheets is not connected");
  const headers = { Authorization: `Bearer ${lov}`, "X-Connection-Api-Key": key, "Content-Type": "application/json" };
  const base = `${GATEWAY_URL}/spreadsheets/${spreadsheetId}`;
  const call = async <T = unknown>(path: string, init?: RequestInit): Promise<T> => {
    const res = await fetch(base + path, { ...init, headers });
    if (!res.ok) throw new Error(`Sheets error [${res.status}]: ${(await res.text()).slice(0, 300)}`);
    return (await res.json()) as T;
  };
  return call;
}
type Call = ReturnType<typeof client>;
const q = (name: string) => encodeURIComponent(`'${name}'`);

async function ensureSheet(call: Call, name: string, header: string[]) {
  const meta = await call<{ sheets: { properties: { title: string } }[] }>("?fields=sheets.properties.title");
  if (!meta.sheets.some((s) => s.properties.title === name)) {
    await call(":batchUpdate", { method: "POST", body: JSON.stringify({ requests: [{ addSheet: { properties: { title: name } } }] }) });
  }
  await call(`/values/${q(name)}!A1?valueInputOption=RAW`, { method: "PUT", body: JSON.stringify({ values: [header] }) });
}

/** Writes a sale's rows. Existing rows for that bill number are overwritten (never duplicated). */
export const upsertSaleRows = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      spreadsheetId: idSchema,
      billNumber: z.number().int(),
      rows: z.array(z.array(cell).max(16)).min(1).max(200),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const call = client(data.spreadsheetId);
    await ensureSheet(call, SALES, HEADER);
    const col = await call<{ values?: unknown[][] }>(`/values/${q(SALES)}!A:A`);
    const bill = String(data.billNumber);
    const existing: number[] = [];
    (col.values ?? []).forEach((r, i) => { if (i > 0 && String(r[0] ?? "") === bill) existing.push(i + 1); });

    const updates: { range: string; values: unknown[][] }[] = [];
    const extra: unknown[][] = [];
    data.rows.forEach((row, i) => {
      const at = existing[i];
      if (at) updates.push({ range: `'${SALES}'!A${at}:P${at}`, values: [row] });
      else extra.push(row);
    });
    // Blank leftover rows if the sale now has fewer lines.
    existing.slice(data.rows.length).forEach((at) => updates.push({ range: `'${SALES}'!A${at}:P${at}`, values: [Array(16).fill("")] }));

    if (updates.length)
      await call("/values:batchUpdate", { method: "POST", body: JSON.stringify({ valueInputOption: "USER_ENTERED", data: updates }) });
    if (extra.length)
      await call(`/values/${q(SALES)}!A:P:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
        method: "POST", body: JSON.stringify({ values: extra }),
      });
    return { ok: true };
  });

/** Replaces the Monthly Summary sheet with totals calculated from all records. */
export const writeMonthlySummary = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ spreadsheetId: idSchema, rows: z.array(z.array(cell).max(6)).max(240) }).parse(d),
  )
  .handler(async ({ data }) => {
    const call = client(data.spreadsheetId);
    await ensureSheet(call, SUMMARY, SUMMARY_HEADER);
    await call(`/values/${q(SUMMARY)}!A2:F:clear`, { method: "POST", body: "{}" });
    if (data.rows.length)
      await call(`/values/${q(SUMMARY)}!A2?valueInputOption=USER_ENTERED`, { method: "PUT", body: JSON.stringify({ values: data.rows }) });
    return { ok: true };
  });
