import { Archive, ArchiveRestore, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { categoryInUse, deleteCategory, saveCategory, setCategoryArchived, useStore, type CategoryRec } from "@/lib/store";
import { cn } from "@/lib/utils";
export function CategoryManager() {
  const cats = useStore((s) => s.categories);
  const items = useStore((s) => s.items);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"active" | "archived">("active");
  const [edit, setEdit] = useState<CategoryRec | "new" | null>(null);
  const [del, setDel] = useState<CategoryRec | null>(null);
  const shown = cats.filter((c) => (view === "archived") === c.archived);
  return (
    <>
      <div className="mb-4 flex gap-2">
        <button onClick={() => setEdit("new")} className="press flex items-center gap-1.5 rounded-2xl border bg-card px-4 py-2.5 text-sm font-bold">
          <Plus className="size-4" /> Add Category
        </button>
        <button onClick={() => setOpen(true)} className="press flex items-center gap-1.5 rounded-2xl border bg-card px-4 py-2.5 text-sm font-bold">
          <Tags className="size-4" /> Manage Categories
        </button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto rounded-3xl">
          <DialogHeader><DialogTitle className="font-display text-2xl">Categories</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1">
            {(["active", "archived"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={cn("rounded-xl py-2 text-sm font-bold capitalize", view === v ? "bg-card shadow-soft" : "text-muted-foreground")}>
                {v} ({cats.filter((c) => (v === "archived") === c.archived).length})
              </button>
            ))}
          </div>
          {shown.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No {view} categories.</p>}
          <div className="space-y-2">
            {shown.map((c) => (
              <div key={c.id} className="flex items-center gap-2 rounded-2xl border p-3">
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{c.name} <span className="text-xs font-semibold text-muted-foreground">· {items.filter((i) => i.category === c.name).length} items</span></div>
                  {c.description && <div className="truncate text-xs text-muted-foreground">{c.description}</div>}
                </div>
                <button aria-label="Edit" onClick={() => setEdit(c)} className="press rounded-lg p-2 hover:bg-secondary"><Pencil className="size-4" /></button>
                <button aria-label={c.archived ? "Restore" : "Archive"} onClick={() => { setCategoryArchived(c.id, !c.archived); toast.success(c.archived ? "Category restored" : "Category archived"); }} className="press rounded-lg p-2 hover:bg-secondary">
                  {c.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                </button>
                <button aria-label="Delete" onClick={() => setDel(c)} className="press rounded-lg p-2 text-destructive hover:bg-destructive/10"><Trash2 className="size-4" /></button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-md rounded-3xl">
          {edit && <CatForm key={edit === "new" ? "new" : edit.id} cat={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Delete {del?.name}?</DialogTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              {del && categoryInUse(del.name)
                ? "This category has items or past sales, so it can't be deleted. Archive it instead — it will be hidden from New Bill but your records stay safe."
                : "This category is empty and will be removed permanently."}
            </p>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 pt-4">
            <button onClick={() => setDel(null)} className="press rounded-xl bg-secondary py-3 text-sm font-bold">
              Cancel
            </button>
            {del && categoryInUse(del.name) ? (
              <button
                onClick={() => {
                  setCategoryArchived(del.id, true);
                  toast.success("Category archived");
                  setDel(null);
                }}
                className="press rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"
              >
                Archive
              </button>
            ) : (
              <button
                onClick={() => {
                  if (del) {
                    deleteCategory(del.id);
                    toast.success("Category deleted");
                    setDel(null);
                  }
                }}
                className="press rounded-xl bg-destructive py-3 text-sm font-bold text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CatForm({ cat, onClose }: { cat: CategoryRec | null; onClose: () => void }) {
  const [name, setName] = useState(cat?.name ?? "");
  const [desc, setDesc] = useState(cat?.description ?? "");
  const input = "w-full rounded-xl bg-secondary px-4 py-3 font-semibold outline-none focus:ring-2 focus:ring-ring";
  const save = () => {
    const err = saveCategory({ id: cat?.id, name, description: desc });
    if (err) { toast.error(err); return; }
    toast.success(cat ? "Category updated" : "Category added");
    onClose();
  };
  return (
    <>
      <DialogHeader><DialogTitle className="font-display text-2xl">{cat ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
      <label className="text-sm font-bold">Category Name</label>
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className={input} placeholder="e.g. Iced Tea" />
      <label className="text-sm font-bold">Description <span className="font-normal text-muted-foreground">(optional)</span></label>
      <textarea value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={150} rows={2} className={input} />
      <div className="grid grid-cols-2 gap-2 pt-2">
        <button onClick={onClose} className="press rounded-xl bg-secondary py-3 font-bold">Cancel</button>
        <button onClick={save} className="press rounded-xl bg-primary py-3 font-bold text-primary-foreground">Save Category</button>
      </div>
    </>
  );
}
