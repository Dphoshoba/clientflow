"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, CircleCheck, Clock3, RotateCw, TriangleAlert } from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import { EmptyState, ErrorState, PageHeading, Skeleton, StatusBadge, Surface } from "@/components/ui/primitives";

type InboxItem = {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
  project: { id: string; name: string; client: { name: string } };
  versions: { versionNumber: number }[];
};
type InboxData = { waitingOnClient: InboxItem[]; needsTeamAction: InboxItem[]; approvedThisWeek: InboxItem[] };

function Queue({ title, subtitle, items, emptyText }: { title: string; subtitle: string; items: InboxItem[]; emptyText: string }) {
  return <Surface><div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3"><div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-0.5 text-[11px] text-[var(--muted)]">{subtitle}</p></div><span className="grid size-7 place-items-center rounded-full bg-[var(--background)] text-xs font-semibold">{items.length}</span></div>
    {items.length === 0 ? <EmptyState title={emptyText} detail="When work changes status, it will appear here." /> : <div className="divide-y divide-[var(--line)]">{items.slice(0, 5).map((item) => <Link href={`/deliverables/${item.id}`} key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-[var(--background)]"><div className="min-w-0"><p className="truncate text-sm font-medium">{item.name}</p><p className="mt-1 truncate text-xs text-[var(--muted)]">{item.project.client.name} <span className="px-1">/</span> {item.project.name} <span className="px-1">/</span> V{item.versions[0]?.versionNumber ?? 0}</p></div><div className="flex shrink-0 items-center gap-3"><StatusBadge status={item.status} /><ArrowRight size={15} className="text-[var(--muted)]" /></div></Link>)}</div>}
  </Surface>;
}

export default function DashboardPage() {
  const [data, setData] = useState<InboxData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    try { setData(await apiFetch<InboxData>("/api/dashboard/inbox")); setError(""); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Try again in a moment."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    apiFetch<InboxData>("/api/dashboard/inbox")
      .then((result) => { if (active) { setData(result); setError(""); } })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "Try again in a moment."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const metrics = data ? [
    { label: "Waiting on client", count: data.waitingOnClient.length, hint: "Reviews in progress", icon: Clock3, tone: "text-[#597b7f]", href: "#waiting" },
    { label: "Needs team action", count: data.needsTeamAction.length, hint: "Feedback to address", icon: TriangleAlert, tone: "text-[#a87927]", href: "#team" },
    { label: "Approved this week", count: data.approvedThisWeek.length, hint: "Sign-offs recorded", icon: CircleCheck, tone: "text-[#43815b]", href: "/activity" },
  ] : [];

  return <>
    <PageHeading eyebrow="Your agency" title="Approval overview" description="Keep every client review moving, without chasing through threads." action={<button onClick={() => { setLoading(true); setError(""); void load(); }} aria-label="Refresh overview" title="Refresh overview" className="grid size-9 place-items-center rounded-md border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--background)]"><RotateCw size={16} /></button>} />
    {error ? <Surface><ErrorState message={error} retry={() => { setLoading(true); setError(""); void load(); }} /></Surface> : <>
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">{loading ? [1, 2, 3].map((item) => <Surface key={item} className="p-4"><Skeleton className="h-3 w-28" /><Skeleton className="mt-3 h-7 w-12" /><Skeleton className="mt-2 h-3 w-24" /></Surface>) : metrics.map(({ label, count, hint, icon: Icon, tone, href }) => <Link href={href} key={label} className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-4 transition hover:border-[#9cb9a6]"><div className="flex items-center justify-between"><p className="text-xs font-medium text-[var(--muted)]">{label}</p><Icon size={17} className={tone} /></div><p className="mt-3 text-2xl font-semibold tabular-nums">{count}</p><p className="mt-1 text-[11px] text-[var(--muted)]">{hint}</p></Link>)}</div>
      {loading ? <div className="grid gap-4 lg:grid-cols-2"><div className="h-64 animate-pulse rounded-md border border-[var(--line)] bg-[var(--surface)]" /><div className="h-64 animate-pulse rounded-md border border-[var(--line)] bg-[var(--surface)]" /></div> : <div className="grid gap-4 lg:grid-cols-2"><div id="waiting"><Queue title="Waiting on client" subtitle="Currently with your client" items={data?.waitingOnClient ?? []} emptyText="Nothing waiting for review" /></div><div id="team"><Queue title="Needs your team" subtitle="Changes requested by clients" items={data?.needsTeamAction ?? []} emptyText="No changes requested" /></div></div>}
      {!loading && data && data.waitingOnClient.length + data.needsTeamAction.length > 0 && <Link href="/projects" className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#27685f] hover:underline dark:text-[#88c5a5]">Open projects <ArrowUpRight size={14} /></Link>}
    </>}
  </>;
}