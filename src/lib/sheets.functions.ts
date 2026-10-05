import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";
const HEADER = [
  "Bill Number", "Date", "Time", "Service Type", "Payment Method",
  "Item Name", "Size", "Quantity", "Item Price", "Subtotal", "Total",
];

export const getSheetsStatus = createServerFn({ method: "GET" }).handler(async () => {
  return { connected: Boolean(process.env["LOVABLE_API_KEY"] && process.env["GOOGLE_SHEETS_API_KEY"]) };
});

const rowSchema = z.array(z.union([z.string(), z.number()])).max(11);

export const appendSaleRows = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      spreadsheetId: z.string().min(10).max(200).regex(/^[A-Za-z0-9_-]+$/),
      rows: z.array(rowSchema).min(1).max(500),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const lov = process.env["LOVABLE_API_KEY"];
    const key = process.env["GOOGLE_SHEETS_API_KEY"];
    if (!lov || !key) throw new Error("Google Sheets is not connected");
    const headers = {
      Authorization: `Bearer ${lov}`,
      "X-Connection-Api-Key": key,
      "Content-Type": "application/json",
    };
    const base = `${GATEWAY_URL}/spreadsheets/${data.spreadsheetId}/values`;

    const head = await fetch(`${base}/A1:K1`, { headers });
    if (!head.ok) throw new Error(`Sheets error [${head.status}]: ${await head.text()}`);
    const headJson = (await head.json()) as { values?: unknown[][] };
    const rows = headJson.values?.length ? data.rows : [HEADER, ...data.rows];

    const res = await fetch(`${base}/A:K:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
      method: "POST",
      headers,
      body: JSON.stringify({ values: rows }),
    });
    if (!res.ok) throw new Error(`Sheets error [${res.status}]: ${await res.text()}`);
    return { ok: true };
  });
