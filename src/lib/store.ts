import { useSyncExternalStore } from "react";

export const DEFAULT_CATEGORIES = ["Coffee", "Matcha", "Coconut Cloud", "Hojicha", "Ube", "Desserts"];
export type Category = string;
export type CategoryRec = { id: string; name: string; description: string; archived: boolean; createdAt: string; updatedAt: string };

export type Size = { id: string; name: string; price: number };
export type Item = {
  id: string;
  category: Category;
  name: string;
  description: string;
  hasSizes: boolean;
  enabled: boolean;
  sizes: Size[]; // when hasSizes=false, exactly one size with name ""
  createdAt: string;
  updatedAt: string;
};
export type Service = "Dine In" | "Take Away";
export type PaymentMethod = "Cash" | "UPI" | "Card" | "Other";
export type PaymentStatus = "Paid" | "Pending" | "Other";
export type SyncStatus = "SYNCED" | "PENDING" | "FAILED";
export type SaleLine = {
  itemId: string;
  category: string; // snapshot
  name: string; // snapshot
  size: string; // snapshot
  qty: number;
  price: number; // snapshot
  subtotal: number;
};
export type Sale = {
  id: string;
  billNumber: number;
  createdAt: string;
  updatedAt: string;
  service: Service;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod | undefined;
  paymentNote?: string | undefined;
  paymentUpdatedAt?: string | undefined;
  total: number;
  syncStatus: SyncStatus;
  syncError?: string | undefined;
  lastSyncedAt?: string | undefined;
  items: SaleLine[];
};
export type Settings = { businessName: string; nextBill: number; spreadsheetId: string };
export type State = { categories: CategoryRec[]; items: Item[]; sales: Sale[]; settings: Settings };

const KEY = "dessert-cart:v1";
const EMPTY: State = {
  categories: [],
  items: [],
  sales: [],
  settings: { businessName: "Date — Desserts & Coffee", nextBill: 1001, spreadsheetId: "" },
};

let state: State = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

// Upgrade records saved by the earlier version of the app.
function migrate(p: State): State {
  const items = (p.items ?? []).map((i) => ({
    ...i,
    category: i.category || "Desserts",
    description: i.description ?? "",
  })) as Item[];
  const sales = (p.sales ?? []).map((raw) => {
    const s = raw as Sale & { payment?: string };
    if (s.paymentStatus) return { ...s, updatedAt: s.updatedAt ?? s.createdAt };
    const { payment, ...rest } = s;
    return {
      ...rest,
      updatedAt: s.createdAt,
      paymentStatus: "Paid" as const,
      paymentMethod: payment as PaymentMethod | undefined,
      items: s.items.map((l) => ({ ...l, category: l.category ?? "" })),
    };
  });
  const now = new Date().toISOString();
  let categories = p.categories ?? [];
  if (!categories.length)
    categories = DEFAULT_CATEGORIES.map((name, n) => ({ id: "c" + n, name, description: "", archived: false, createdAt: now, updatedAt: now }));
  for (const it of items)
    if (!categories.some((c) => c.name === it.category))
      categories = [...categories, { id: uid(), name: it.category, description: "", archived: false, createdAt: now, updatedAt: now }];
  return { ...EMPTY, ...p, categories, items, sales, settings: { ...EMPTY.settings, ...p.settings } };
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    state = migrate(raw ? (JSON.parse(raw) as State) : EMPTY);
  } catch {
    state = migrate(EMPTY);
  }
}

function set(next: State) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full */
  }
  listeners.forEach((l) => l());
}

export function getState() {
  load();
  return state;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getState()),
    () => selector(EMPTY),
  );
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// Items
export function saveItem(item: Omit<Item, "createdAt" | "updatedAt"> & { createdAt?: string | undefined }) {
  const s = getState();
  const now = new Date().toISOString();
  const exists = s.items.some((i) => i.id === item.id);
  const full: Item = { ...item, createdAt: item.createdAt ?? now, updatedAt: now };
  set({
    ...s,
    items: exists ? s.items.map((i) => (i.id === item.id ? full : i)) : [...s.items, full],
  });
}
export function deleteItem(id: string) {
  const s = getState();
  set({ ...s, items: s.items.filter((i) => i.id !== id) });
}
export function toggleItem(id: string) {
  const s = getState();
  set({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, enabled: !i.enabled } : i)) });
}

// Sales
export function createSale(
  data: Pick<Sale, "service" | "paymentStatus" | "paymentMethod" | "paymentNote" | "items">,
): Sale {
  const s = getState();
  const now = new Date().toISOString();
  const sale: Sale = {
    id: uid(),
    billNumber: s.settings.nextBill,
    createdAt: now,
    updatedAt: now,
    service: data.service,
    paymentStatus: data.paymentStatus,
    paymentMethod: data.paymentMethod,
    paymentNote: data.paymentStatus === "Other" ? data.paymentNote : undefined,
    items: data.items,
    total: data.items.reduce((a, l) => a + l.subtotal, 0),
    syncStatus: "PENDING",
  };
  set({
    ...s,
    sales: [sale, ...s.sales],
    settings: { ...s.settings, nextBill: s.settings.nextBill + 1 },
  });
  return sale;
}

/** Change only the payment details of an existing sale; items, amount and date stay the same. */
export function updatePayment(
  id: string,
  patch: { paymentStatus: PaymentStatus; paymentMethod?: PaymentMethod | undefined; paymentNote?: string | undefined },
) {
  const s = getState();
  const now = new Date().toISOString();
  set({
    ...s,
    sales: s.sales.map((x) =>
      x.id === id
        ? {
            ...x,
            paymentStatus: patch.paymentStatus,
            paymentMethod: patch.paymentMethod ?? x.paymentMethod,
            paymentNote: patch.paymentStatus === "Other" ? patch.paymentNote : x.paymentNote,
            paymentUpdatedAt: now,
            updatedAt: now,
            syncStatus: "PENDING",
          }
        : x,
    ),
  });
}

export function updateSaleSync(id: string, syncStatus: SyncStatus, syncError?: string) {
  const s = getState();
  const now = new Date().toISOString();
  set({
    ...s,
    sales: s.sales.map((x) =>
      x.id === id ? { ...x, syncStatus, syncError, lastSyncedAt: syncStatus === "SYNCED" ? now : x.lastSyncedAt } : x,
    ),
  });
}
export function updateSettings(patch: Partial<Settings>) {
  const s = getState();
  set({ ...s, settings: { ...s.settings, ...patch } });
}

export const inr = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

// Categories
export const normName = (n: string) => n.trim().replace(/\s+/g, " ");
export function saveCategory(c: { id?: string | undefined; name: string; description: string }): string | null {
  const s = getState();
  const name = normName(c.name);
  if (!name) return "Enter a category name";
  if (s.categories.some((x) => x.id !== c.id && x.name.toLowerCase() === name.toLowerCase())) return "A category with this name already exists";
  const now = new Date().toISOString();
  const old = s.categories.find((x) => x.id === c.id);
  if (old) {
    set({
      ...s,
      categories: s.categories.map((x) => (x.id === c.id ? { ...x, name, description: c.description.trim(), updatedAt: now } : x)),
      items: s.items.map((i) => (i.category === old.name ? { ...i, category: name } : i)),
    });
  } else {
    set({ ...s, categories: [...s.categories, { id: uid(), name, description: c.description.trim(), archived: false, createdAt: now, updatedAt: now }] });
  }
  return null;
}
export function setCategoryArchived(id: string, archived: boolean) {
  const s = getState();
  set({ ...s, categories: s.categories.map((x) => (x.id === id ? { ...x, archived, updatedAt: new Date().toISOString() } : x)) });
}
export function categoryInUse(name: string) {
  const s = getState();
  return s.items.some((i) => i.category === name) || s.sales.some((x) => x.items.some((l) => l.category === name));
}
export function deleteCategory(id: string) {
  const s = getState();
  set({ ...s, categories: s.categories.filter((x) => x.id !== id) });
}
