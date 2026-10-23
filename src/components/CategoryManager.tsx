import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteCategory, normName, saveCategory, setCategoryArchived, useStore, type Category } from "@/lib/store";
import { cn } from "@/lib/utils";

export function CategoryManager() {
  const categories = useStore((s) => s.categories);
  const items = useStore((s) => s.items);
  const sales = useStore((s) => s.sales);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [del, setDel] = useState<Category | null>(null);

  const categoryInUse = (catName: string) => {
    const hasItems = items.some((i) => i.category === catName);
    const hasSales = sales.some((s) => s.items.some((i) => i.category === catName));
    return hasItems || hasSales;
  };

  const handleAdd = () => {
    const err = saveCategory({ name, description: desc });
    if (err) {
      toast.error(err);
      return;
    }
    toast.success("Category created");
    setName("");
    setDesc("");
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setOpen(true)}
          className="press text-xs font-bold text-muted-foreground underline hover:text-foreground"
        >
          Manage Categories
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold">Manage Categories</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="rounded-2xl bg-secondary p-3 space-y-2">
              <p className="text-xs font-bold text-muted-foreground">Add New Category</p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                placeholder="Category name"
                className="w-full rounded-xl bg-card px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                maxLength={100}
                placeholder="Description (optional)"
                className="w-full rounded-xl bg-card px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={handleAdd}
                className="press w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow-soft"
              >
                + Add Category
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground">Existing Categories</p>
              {categories.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    "flex items-center justify-between rounded-2xl bg-card p-3 shadow-soft",
                    c.archived && "opacity-50"
                  )}
                >
                  <div>
                    <p className="font-extrabold text-sm">{c.name} {c.archived && "(Archived)"}</p>
                    {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {c.archived ? (
                      <button
                        onClick={() => {
                          setCategoryArchived(c.id, false);
                          toast.success("Category unarchived");
                        }}
                        className="text-xs font-bold text-primary"
                      >
                        Unarchive
                      </button>
                    ) : (
                      <button
                        onClick={() => setDel(c)}
                        className="text-destructive p-1"
                        aria-label="Delete category"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>
              {del && categoryInUse(del.name) ? `Archive ${del.name}?` : `Delete ${del?.name}?`}
            </DialogTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              {del && categoryInUse(del.name)
                ? "This category has items or past sales, so it can't be deleted. Archive it instead — it will be hidden from New Bill but your records stay safe."
                : "This category is empty and will be removed permanently."}
            </p>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 pt-4">
            <button
              onClick={() => setDel(null)}
              className="press rounded-xl bg-secondary py-3 text-sm font-bold"
            >
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
