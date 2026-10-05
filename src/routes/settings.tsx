import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { getSheetsStatus } from "@/lib/sheets.functions";
import { updateSettings, useStore } from "@/lib/store";
import { syncPending } from "@/lib/sync";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Dessert Cart" },
      { name: "description", content: "Business name, spreadsheet connection and sync status." },
      { property: "og:title", content: "Settings — Dessert Cart" },
      { property: "og:description", content: "Business name, spreadsheet connection and sync status." },
    ],
  }),
  component: SettingsPage,
});

function extractId(v: string) {
  const m = v.match(/\/d\/([A-Za-z0-9_-]+)/);
  return (m ? m[1] : v).trim();
}

function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const sales = useStore((s) => s.sales);
  const statusFn = useServerFn(getSheetsStatus);
  const { data } = useQuery({ queryKey: ["sheets-status"], queryFn: () => statusFn() });
  const [name, setName] = useState(settings.businessName);
  const [sheet, setSheet] = useState(settings.spreadsheetId);
  const [busy, setBusy] = useState(false);

  const pending = sales.filter((s) => s.syncStatus === "PENDING").length;
  const failed = sales.filter((s) => s.syncStatus === "FAILED").length;
  const synced = sales.length - pending - failed;
  const connected = !!data?.connected && !!settings.spreadsheetId;

  const syncNow = async () => {
    setBusy(true);
    const r = await syncPending();
    setBusy(false);
    if (r.skipped) toast.error(r.skipped);
    else if (r.failed) toast.error(`${r.failed} failed to sync — will retry`);
    else if (r.synced) toast.success(`${r.synced} sale(s) synced`);
    else toast("Everything is already synced");
  };

  const card = "rounded-3xl bg-card p-5 shadow-soft space-y-3";
  const input = "w-full rounded-xl bg-secondary px-4 py-3 font-semibold outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-4 max-w-2xl">
      <PageHeader title="Settings" />

      <section className={card}>
        <label className="text-sm font-bold">Business Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => { if (name.trim()) { updateSettings({ businessName: name.trim() }); toast.success("Saved"); } }} className={input} maxLength={40} />
      </section>

      <section className={card}>
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold">Spreadsheet Connection</h2>
          <span className={cn("rounded-full px-3 py-1 text-xs font-bold", connected ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
            {connected ? "Connected" : "Not Connected"}
          </span>
        </div>
        {!data?.connected && <p className="text-sm text-muted-foreground">Google Sheets access hasn't been linked to this app yet.</p>}
        <label className="text-sm font-bold">Google Sheet link</label>
        <input value={sheet} onChange={(e) => setSheet(e.target.value)} placeholder="Paste your Google Sheet link" className={input} />
        <button onClick={() => { updateSettings({ spreadsheetId: extractId(sheet) }); setSheet(extractId(sheet)); toast.success("Spreadsheet saved"); }} className="press rounded-xl bg-secondary px-4 py-2.5 font-bold">
          Save spreadsheet
        </button>
        <p className="text-xs text-muted-foreground">Each sold item becomes one row on the first tab. Headers are added automatically.</p>
      </section>

      <section className={card}>
        <h2 className="font-extrabold">Sync Status</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-success/10 p-3"><div className="text-2xl font-black text-success">{synced}</div><div className="text-xs font-bold">SYNCED</div></div>
          <div className="rounded-2xl bg-secondary p-3"><div className="text-2xl font-black text-cocoa">{pending}</div><div className="text-xs font-bold">PENDING</div></div>
          <div className="rounded-2xl bg-destructive/10 p-3"><div className="text-2xl font-black text-destructive">{failed}</div><div className="text-xs font-bold">FAILED</div></div>
        </div>
        <button onClick={syncNow} disabled={busy} className="press flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-extrabold text-primary-foreground shadow-lift disabled:opacity-60">
          <RefreshCw className={cn("size-5", busy && "animate-spin")} /> SYNC NOW
        </button>
      </section>

      <section className={card}>
        <h2 className="font-extrabold">Data</h2>
        <div className="flex justify-between text-sm"><span>Total Transactions</span><b>{sales.length}</b></div>
        <div className="flex justify-between text-sm"><span>Stored Records (items sold)</span><b>{sales.reduce((a, s) => a + s.items.length, 0)}</b></div>
        <p className="text-xs text-muted-foreground">Records are saved on this device first and never deleted automatically.</p>
      </section>
    </div>
  );
}
