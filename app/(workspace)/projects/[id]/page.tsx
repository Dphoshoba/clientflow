"use client";

import Link from "next/link";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, FilePlus2, Plus, UploadCloud } from "lucide-react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/client-api";
import { EmptyState, ErrorState, PageHeading, Skeleton, StatusBadge, Surface } from "@/components/ui/primitives";

type Project = {
  id: string;
  name: string;
  updatedAt: string;
  client: { id: string; name: string };
  deliverables: { id: string; name: string; status: string; updatedAt: string; versions: { versionNumber: number; fileName: string }[] }[];
};

export default function ProjectDetailPage() {
  return <Suspense fallback={<div className="h-48 animate-pulse rounded-md border border-[var(--line)] bg-[var(--surface)]" />}><ProjectDetailContent /></Suspense>;
}

function ProjectDetailContent() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try { setProject(await apiFetch<Project>(`/api/projects/${id}`)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Project could not be loaded."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let active = true;
    apiFetch<Project>(`/api/projects/${id}`)
      .then((result) => { if (active) { setProject(result); setError(""); } })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "Project could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  async function createDeliverable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const name = String(new FormData(event.currentTarget).get("name") ?? "");
    try {
      await apiFetch("/api/deliverables", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: id, name }) });
      setAdding(false);
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Deliverable could not be created."); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-56" /><Skeleton className="h-44" /></div>;
  if (error && !project) return <Surface><ErrorState message={error} retry={() => void load()} /></Surface>;
  if (!project) return <Surface><EmptyState title="Project not found" detail="This project may have been removed or you may not have access." /></Surface>;

  return <>
    <Link href="/projects" className="mb-5 inline-flex items-center gap-2 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"><ArrowLeft size={15} />All projects</Link>
    <PageHeading eyebrow={project.client.name} title={project.name} description={`${project.deliverables.length} deliverables`} action={<button onClick={() => setAdding(true)} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#27685f] px-3 text-xs font-semibold text-white hover:bg-[#1e574f]"><Plus size={15} />Add deliverable</button>} />
    {error && <p role="alert" className="mb-4 text-xs text-red-700 dark:text-red-300">{error}</p>}
    {project.deliverables.length === 0 ? <Surface><EmptyState title="No deliverables yet" detail="Add the first item you want the client to review." action={<button onClick={() => setAdding(true)} className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--line)] px-3 text-xs font-semibold"><FilePlus2 size={15} />Add deliverable</button>} /></Surface> : <Surface><div className="divide-y divide-[var(--line)]">{project.deliverables.map((item) => <Link key={item.id} href={`/deliverables/${item.id}`} className="flex flex-col gap-3 px-4 py-4 transition hover:bg-[var(--background)] sm:flex-row sm:items-center"><span className="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--background)] text-[var(--muted)]"><UploadCloud size={17} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.name}</p><p className="mt-1 truncate text-xs text-[var(--muted)]">{item.versions[0] ? `V${item.versions[0].versionNumber} · ${item.versions[0].fileName}` : "No file uploaded"}</p></div><StatusBadge status={item.status} /><span className="text-[10px] text-[var(--muted)]">Updated {new Date(item.updatedAt).toLocaleDateString()}</span></Link>)}</div></Surface>}
    {adding && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><section role="dialog" aria-modal="true" aria-labelledby="deliverable-dialog-title" className="w-full max-w-sm rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-xl"><h3 id="deliverable-dialog-title" className="text-base font-semibold">Add deliverable</h3><p className="mt-1 text-xs text-[var(--muted)]">Name the file or work item your client will review.</p><form onSubmit={createDeliverable} className="mt-5 space-y-4"><input name="name" required maxLength={160} placeholder="e.g. Homepage design" className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[#72988a]" /><div className="flex justify-end gap-2"><button type="button" onClick={() => setAdding(false)} className="h-9 rounded-md border border-[var(--line)] px-3 text-xs">Cancel</button><button disabled={saving} className="h-9 rounded-md bg-[#27685f] px-3 text-xs font-semibold text-white disabled:opacity-60">{saving ? "Adding…" : "Add item"}</button></div></form></section></div>}
  </>;
}