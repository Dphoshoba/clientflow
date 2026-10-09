"use client";

import { useEffect, useState } from "react";
import { Activity, CheckCircle2, FileUp, MessageSquareText, RefreshCw, Settings2 } from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import { EmptyState, ErrorState, PageHeading, Skeleton, Surface } from "@/components/ui/primitives";

type Log = { id: string; action: string; details: string; createdAt: string; user: { name: string | null; email: string } | null };
const icons: Record<string, typeof Activity> = { DELIVERABLE_APPROVED: CheckCircle2, VERSION_UPLOADED: FileUp, CHANGES_REQUESTED: MessageSquareText, STATUS_CHANGED: Settings2 };

export default function ActivityPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() {
    try { setLogs(await apiFetch<Log[]>("/api/activity-log")); setError(""); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Activity could not be loaded."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let active = true;
    apiFetch<Log[]>("/api/activity-log")
      .then((result) => { if (active) { setLogs(result); setError(""); } })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "Activity could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <><PageHeading eyebrow="Workspace" title="Activity" description="A recent record of decisions and changes." action={<button onClick={() => { setLoading(true); setError(""); void load(); }} aria-label="Refresh activity" title="Refresh activity" className="grid size-9 place-items-center rounded-md border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)]"><RefreshCw size={15} /></button>} />
    {error ? <Surface><ErrorState message={error} retry={() => { setLoading(true); setError(""); void load(); }} /></Surface> : loading ? <Surface className="divide-y divide-[var(--line)] px-4">{[1, 2, 3, 4].map((item) => <div className="flex items-center gap-3 py-4" key={item}><Skeleton className="size-8 rounded-full" /><div className="flex-1"><Skeleton className="h-3 w-48" /><Skeleton className="mt-2 h-3 w-32" /></div></div>)}</Surface> : logs.length === 0 ? <Surface><EmptyState title="No activity recorded yet" detail="Uploads, comments, status changes, and approvals will appear here." /></Surface> : <Surface className="divide-y divide-[var(--line)]">{logs.map((log) => { const Icon = icons[log.action] ?? Activity; return <div key={log.id} className="flex gap-3 px-4 py-4"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--background)] text-[var(--muted)]"><Icon size={15} /></span><div className="min-w-0 flex-1"><p className="text-xs font-medium">{log.details}</p><p className="mt-1 text-[10px] text-[var(--muted)]">{log.user?.name ?? log.user?.email ?? "Client"} <span className="px-1">·</span> {new Date(log.createdAt).toLocaleString()}</p></div><span className="hidden shrink-0 text-[9px] font-semibold uppercase text-[var(--muted)] sm:block">{log.action.replaceAll("_", " ")}</span></div>; })}</Surface>}
  </>;
}