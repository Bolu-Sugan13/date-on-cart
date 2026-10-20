import { z } from "zod";

export const discountTypeSchema = z.enum(["None", "Fixed", "Percentage"]);
export function calculateDiscount(subtotal: number, type: z.infer<typeof discountTypeSchema>, value: number):
  { ok: true; discountAmount: number; total: number } | { ok: false; error: string } {
  const round = (n: number) => Math.round(n * 100) / 100;
  if (!Number.isFinite(subtotal) || subtotal < 0) return { ok: false, error: "Invalid subtotal" };
  if (type === "None") return { ok: true, discountAmount: 0, total: round(subtotal) };
  if (!Number.isFinite(value) || value < 0) return { ok: false, error: "Discount can't be negative" };
  if (type === "Percentage" && value > 100) return { ok: false, error: "Percentage can't be more than 100%" };
  const amount = round(type === "Fixed" ? value : subtotal * value / 100);
  if (amount > subtotal) return { ok: false, error: "Discount can't be more than the subtotal" };
  return { ok: true, discountAmount: amount, total: round(subtotal - amount) };
}

export function validateSaleAmounts(s: { subtotal: number; discountType: z.infer<typeof discountTypeSchema>; discountValue: number; discountAmount: number; total: number; items: { qty: number; price: number; subtotal: number }[] }) {
  for (const line of s.items) {
    if (!Number.isInteger(line.qty) || line.qty < 1 || !Number.isFinite(line.price) || line.price < 0 || Math.abs(line.qty * line.price - line.subtotal) > .01) throw new Error("Invalid line amount");
  }
  if (Math.abs(s.items.reduce((a, l) => a + l.subtotal, 0) - s.subtotal) > .01) throw new Error("Subtotal doesn't match the items");
  const result = calculateDiscount(s.subtotal, s.discountType, s.discountValue);
  if (!result.ok) throw new Error(result.error);
  if (Math.abs(result.discountAmount - s.discountAmount) > .01 || Math.abs(result.total - s.total) > .01) throw new Error("Invalid discount or final total");
}