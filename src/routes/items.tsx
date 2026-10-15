import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState, PageHeader } from "@/components/AppShell";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { normName, saveCategory, deleteItem, inr, saveItem, toggleItem, uid, useStore, type Category, type Item } from "@/lib/store";
import { cn } from "@/lib/utils";
import { CategoryManager } from "@/components/CategoryManager";

export const Route = createFileRoute("/items")({
  head: () => ({
    meta: [
      { title: "Your Items — Date Café" },
      { name: "description", content: "Add and manage your desserts, sizes and prices." },
      { property: "og:title", content: "Your Items — Date Café" },
      { property: "og:description", content: "Add and manage your desserts, sizes and prices." },
    ],
  }),
  component: ItemsPage,
});

function ItemsPage() {
  const items = useStore((s) => s.items);
  const cats = useStore((s) => s.categories).filter((c) => !c.archived).map((c) => c.name);
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [del, setDel] = useState<Item | null>(null);
  const [cat, setCat] = useState<Category | "All">("All");
  const shown = cat === "All" ? items : items.filter((i) => i.category === cat);

  const addBtn = (
    <button onClick={() => setEditing("new")} className="press flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-3 font-bold text-primary-foreground shadow-soft">
      <Plus className="size-5" /> Add Item
    </button>
  );

  return (
    <div>
      <CategoryManager />
      <PageHeader title="Your Items" subtitle={`${items.length} item${items.length === 1 ? "" : "s"}`} action={items.length > 0 && addBtn} />
      {items.length === 0 ? (
        <EmptyState icon="🍮" title="No items added yet." text="Add your first item to start billing." action={addBtn} />
      ) : (
        <>
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4">
          {["All", ...cats].map((c) => (
            <button key={c} onClick={() => setCat(c)} className={cn("press shrink-0 rounded-full px-3.5 py-2 text-sm font-bold", cat === c ? "bg-foreground text-background" : "bg-card text-muted-foreground shadow-soft")}>
              {c} <span className="opacity-60">{c === "All" ? items.length : items.filter((i) => i.category === c).length}</span>
            </button>
          ))}
        </div>
        {shown.length === 0 && <p className="py-10 text-center text-muted-foreground">No items in {cat} yet.</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {shown.map((it) => (
            <div key={it.id} className={cn("rounded-3xl bg-card p-5 shadow-soft transition hover:shadow-lift", !it.enabled && "opacity-60")}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-extrabold">{it.name}</h3>
                  <p className="text-xs font-semibold text-muted-foreground">{it.category} · {it.enabled ? "Available for billing" : "Disabled"}</p>
                  {it.description && <p className="mt-1 text-sm text-muted-foreground">{it.description}</p>}
                </div>
                <Switch checked={it.enabled} onCheckedChange={() => toggleItem(it.id)} aria-label="Enable dessert" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {it.sizes.map((s) => (
                  <span key={s.id} className="rounded-xl bg-secondary px-3 py-1.5 text-sm">
                    {s.name && <span className="font-semibold">{s.name} · </span>}
                    <span className="font-black">{inr(s.price)}</span>
                  </span>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setEditing(it)} className="press flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-secondary py-2.5 text-sm font-bold">
                  <Pencil className="size-4" /> Edit
                </button>
                <button onClick={() => setDel(it)} className="press flex items-center justify-center gap-1.5 rounded-xl bg-destructive/10 px-4 py-2.5 text-sm font-bold text-destructive">
                  <Trash2 className="size-4" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      <ItemForm item={editing} onClose={() => setEditing(null)} />

      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {del?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Past sales records stay unchanged. Tip: disable it instead if you may sell it again.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (del) { deleteItem(del.id); toast.success("Item deleted"); } }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type Row = { id: string; name: string; price: string };

function ItemForm({ item, onClose }: { item: Item | "new" | null; onClose: () => void }) {
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-3xl max-w-md max-h-[90vh] overflow-y-auto">
        {item && <FormBody key={item === "new" ? "new" : item.id} item={item === "new" ? null : item} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function FormBody({ item, onClose }: { item: Item | null; onClose: () => void }) {
  const [name, setName] = useState(item?.name ?? "");
  const activeCats = useStore((s) => s.categories).filter((c) => !c.archived).map((c) => c.name);
  const [category, setCategory] = useState<Category>(item?.category ?? activeCats[0] ?? "");
  const [newCat, setNewCat] = useState("");
  const [description, setDescription] = useState(item?.description ?? "");
  const [hasSizes, setHasSizes] = useState(item?.hasSizes ?? false);
  const [single, setSingle] = useState(item && !item.hasSizes ? String(item.sizes[0]?.price ?? "") : "");
  const [rows, setRows] = useState<Row[]>(
    item?.hasSizes ? item.sizes.map((s) => ({ id: s.id, name: s.name, price: String(s.price) })) : [{ id: uid(), name: "", price: "" }],
  );

  const save = (): void => {
    const n = name.trim();
    if (!n) { toast.error("Enter an item name"); return; }
    if (!category) { toast.error("Choose a category"); return; }
    let sizes;
    if (hasSizes) {
      const valid = rows.filter((r) => r.name.trim() || r.price);
      if (!valid.length) { toast.error("Add at least one size"); return; }
      for (const r of valid) {
        if (!r.name.trim()) { toast.error("Every size needs a name"); return; }
        if (!(Number(r.price) > 0)) { toast.error(`Enter a price for ${r.name}`); return; }
      }
      sizes = valid.map((r) => ({ id: r.id, name: r.name.trim(), price: Number(r.price) }));
    } else {
      if (!(Number(single) > 0)) { toast.error("Enter a price"); return; }
      sizes = [{ id: item?.sizes[0]?.id ?? uid(), name: "", price: Number(single) }];
    }
    saveItem({ id: item?.id ?? uid(), category, description: description.trim(), name: n, hasSizes, enabled: item?.enabled ?? true, sizes, createdAt: item?.createdAt });
    toast.success(item ? "Item updated" : "Item added");
    onClose();
  };

  const input = "w-full rounded-xl bg-secondary px-4 py-3 font-semibold outline-none focus:ring-2 focus:ring-ring";

  return (
    <>
      <DialogHeader><DialogTitle className="text-xl font-extrabold">{item ? "Edit Item" : "Add Item"}</DialogTitle></DialogHeader>
      <label className="text-sm font-bold">Item Name</label>
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={input} placeholder="e.g. Chocolate Brownie" />

      <label className="text-sm font-bold">Category</label>
      <div className="grid grid-cols-3 gap-2">
        {activeCats.map((c) => (
          <button key={c} onClick={() => setCategory(c)} className={cn("press rounded-xl px-2 py-2.5 text-sm font-bold", category === c ? "bg-primary text-primary-foreground shadow-soft" : "bg-secondary text-muted-foreground")}>{c}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={newCat} onChange={(e) => setNewCat(e.target.value)} maxLength={40} className={input} placeholder="New category name" />
        <button onClick={() => { const err = saveCategory({ name: newCat, description: "" }); if (err) toast.error(err); else { setCategory(normName(newCat)); setNewCat(""); toast.success("Category added"); } }} className="press shrink-0 rounded-xl bg-secondary px-4 font-bold">+ Add</button>
      </div>
      <label className="text-sm font-bold">Description <span className="font-normal text-muted-foreground">(optional)</span></label>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={150} rows={2} className={input} placeholder="e.g. Rich chocolate with walnuts" />

      <div className="text-sm font-bold">Does this dessert have sizes?</div>
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1">
        {[true, false].map((v) => (
          <button key={String(v)} onClick={() => setHasSizes(v)} className={cn("press rounded-xl py-2.5 font-bold", hasSizes === v ? "bg-card shadow-soft text-foreground" : "text-muted-foreground")}>
            {v ? "Yes" : "No"}
          </button>
        ))}
      </div>

      {hasSizes ? (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_7rem_2rem] gap-2 text-xs font-bold text-muted-foreground px-1"><span>Size Name</span><span>Price</span></div>
          {rows.map((r, i) => (
            <div key={r.id} className="grid grid-cols-[1fr_7rem_2rem] gap-2 items-center">
              <input value={r.name} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className={input} placeholder="e.g. Regular" maxLength={30} />
              <input inputMode="decimal" value={r.price} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, price: e.target.value.replace(/[^\d.]/g, "") } : x)))} className={input} placeholder="₹" />
              <button onClick={() => setRows(rows.filter((_, j) => j !== i))} disabled={rows.length === 1} className="text-muted-foreground disabled:opacity-30" aria-label="Remove size"><X className="size-5" /></button>
            </div>
          ))}
          <button onClick={() => setRows([...rows, { id: uid(), name: "", price: "" }])} className="press w-full rounded-xl border-2 border-dashed border-primary/40 py-2.5 text-sm font-bold text-primary">
            + Add Size
          </button>
        </div>
      ) : (
        <>
          <label className="text-sm font-bold">Price</label>
          <input inputMode="decimal" value={single} onChange={(e) => setSingle(e.target.value.replace(/[^\d.]/g, ""))} className={input} placeholder="₹" />
        </>
      )}
      <button onClick={save} className="press w-full rounded-2xl bg-primary py-4 font-extrabold text-primary-foreground shadow-lift">Save Dessert</button>
    </>
  );
}
