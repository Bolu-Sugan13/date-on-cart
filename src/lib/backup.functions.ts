import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import type { State } from "./store";
import { discountTypeSchema, validateSaleAmounts } from "./billing-validation";

const saleSchema = z.object({
  id: z.string(), billNumber: z.number().int(), createdAt: z.string(), updatedAt: z.string(),
  customerName: z.string().max(80).optional(), subtotal: z.number().finite().nonnegative(),
  discountType: discountTypeSchema, discountValue: z.number().finite(), discountAmount: z.number().finite(), total: z.number().finite(),
  items: z.array(z.object({ qty: z.number(), price: z.number(), subtotal: z.number() }).passthrough()).min(1),
}).passthrough();
const stateSchema = z.object({ categories: z.array(z.object({ id: z.string() }).passthrough()), items: z.array(z.object({ id: z.string() }).passthrough()), sales: z.array(saleSchema), settings: z.object({ businessName: z.string(), nextBill: z.number().int(), spreadsheetId: z.string() }) });

export const readBackup = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from("billing_backups").select("state,revision").eq("user_id", context.userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { state: data.state as unknown as State, revision: data.revision } : null;
});

export const saveBackup = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ state: stateSchema, revision: z.number().int().nonnegative() }).parse(input))
  .handler(async ({ data, context }) => {
    data.state.sales.forEach(validateSaleAmounts);
    const row = { user_id: context.userId, state: data.state as unknown as Json, revision: data.revision + 1, updated_at: new Date().toISOString() };
    const result = data.revision === 0
      ? await context.supabase.from("billing_backups").insert(row).select("revision").single()
      : await context.supabase.from("billing_backups").update(row).eq("user_id", context.userId).eq("revision", data.revision).select("revision").maybeSingle();
    if (result.error) throw new Error(result.error.message);
    if (!result.data) throw new Error("Another device has newer records. Your device copy is safe; reload online records before continuing.");
    return { revision: result.data.revision };
  });