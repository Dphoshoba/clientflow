"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { BriefcaseBusiness, Check, Grid2X2, List, Plus, Search, X } from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import { EmptyState, ErrorState, PageHeading, Skeleton, StatusBadge, Surface } from "@/components/ui/primitives";

type Client = { id: string; name: string; contacts: { id: string; name: string; email: string }[] };
type Project = { id: string; name: string; updatedAt: string; client: { id: string; name: string }; deliverables: { id: string; name: string; status: string }[] };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [listView, setListView] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [projectData, clientData] = await Promise.all([apiFetch<Project[]>("/api/projects"), apiFetch<Client[]>("/api/clients")]);
      setProjects(projectData);
      setClients(clientData);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Try again in a moment."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let active = true;
    Promise.all([apiFetch<Project[]>("/api/projects"), apiFetch<Client[]>("/api/clients")])
      .then(([projectData, clientData]) => { if (active) { setProjects(projectData); setClients(clientData); setError(""); } })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "Try again in a moment."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => projects.filter((project) => `${project.name} ${project.client.name}`.toLowerCase().includes(search.toLowerCase())), [projects, search]);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    const form = new FormData(event.currentTarget);
    const projectName = String(form.get("projectName") ?? "").trim();
    const existingClientId = String(form.get("clientId") ?? "");
    const newClientName = String(form.get("newClientName") ?? "").trim();
    const contactName = String(form.get("contactName") ?? "").trim();
    const contactEmail = String(form.get("contactEmail") ?? "").trim();
    try {
      if (Boolean(contactName) !== Boolean(contactEmail)) throw new Error("Enter both reviewer name and email, or leave both blank.");
      let clientId = existingClientId;
      if (newClientName) {
        const client = await apiFetch<{ id: string }>("/api/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newClientName, ...(contactName && contactEmail ? { contactName, contactEmail } : {}) }) });
        clientId = client.id;
      } else if (existingClientId && contactName && contactEmail) {
        await apiFetch(`/api/clients/${existingClientId}/contacts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: contactName, email: contactEmail }) });
      }
      if (!clientId) throw new Error("Choose or add a client first.");
      await apiFetch<Project>("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: projectName, clientId }) });
      setCreateOpen(false);
      await load();
    } catch (caught) { setFormError(caught instanceof Error ? caught.message : "Project could not be created."); }
    finally { setSaving(false); }
  }

  return <>
    <PageHeading eyebrow="Work" title="Projects" description={`${projects.length} ${projects.length === 1 ? "active project" : "active projects"}`} action={<button onClick={() => setCreateOpen(true)} className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#27685f] px-3 text-xs font-semibold text-white hover:bg-[#1e574f]"><Plus size={15} />New project</button>} />
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="relative block w-full sm:max-w-sm"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects or clients" className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] pl-9 pr-3 text-xs outline-none focus:border-[#72988a]" /></label><div className="flex items-center gap-1 self-end rounded-md border border-[var(--line)] bg-[var(--surface)] p-1"><button onClick={() => setListView(false)} className={`grid size-7 place-items-center rounded ${!listView ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--muted)]"}`} aria-label="Grid view" title="Grid view"><Grid2X2 size={15} /></button><button onClick={() => setListView(true)} className={`grid size-7 place-items-center rounded ${listView ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--muted)]"}`} aria-label="List view" title="List view"><List size={15} /></button></div></div>
    {error ? <Surface><ErrorState message={error} retry={() => void load()} /></Surface> : loading ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <Surface key={item} className="h-40 p-4"><Skeleton className="h-4 w-36" /><Skeleton className="mt-3 h-3 w-24" /><Skeleton className="mt-8 h-3 w-full" /></Surface>)}</div> : filtered.length === 0 ? <Surface><EmptyState title={search ? "No matching projects" : "Start with a client project"} detail={search ? "Try a different project or client name." : "Create a workspace for client work, then add deliverables for review."} action={!search && <button onClick={() => setCreateOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#27685f] px-3 text-xs font-semibold text-white"><Plus size={14} />Create first project</button>} /></Surface> : <div className={listView ? "divide-y divide-[var(--line)] rounded-md border border-[var(--line)] bg-[var(--surface)]" : "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"}>{filtered.map((project) => <ProjectTile key={project.id} project={project} listView={listView} />)}</div>}
    {createOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><section role="dialog" aria-modal="true" aria-labelledby="project-dialog-title" className="w-full max-w-md rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-xl"><div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase text-[var(--muted)]">New work</p><h3 id="project-dialog-title" className="mt-1 text-base font-semibold">Create a project</h3></div><button onClick={() => setCreateOpen(false)} aria-label="Close dialog" className="grid size-8 place-items-center rounded text-[var(--muted)] hover:bg-[var(--background)]"><X size={17} /></button></div><form onSubmit={createProject} className="mt-5 space-y-4"><label className="block text-xs font-medium">Project name<input name="projectName" required maxLength={120} placeholder="Website redesign" className="mt-1.5 h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[#72988a]" /></label><label className="block text-xs font-medium">Existing client<select name="clientId" disabled={clients.length === 0} className="mt-1.5 h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[#72988a]"><option value="">{clients.length ? "Select a client" : "No clients yet"}</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label><div className="flex items-center gap-3"><span className="h-px flex-1 bg-[var(--line)]" /><span className="text-[10px] uppercase text-[var(--muted)]">or add one</span><span className="h-px flex-1 bg-[var(--line)]" /></div><label className="block text-xs font-medium">New client<input name="newClientName" maxLength={120} placeholder="Client company" className="mt-1.5 h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[#72988a]" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-medium">Reviewer name<input name="contactName" maxLength={120} placeholder="Optional" className="mt-1.5 h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[#72988a]" /></label><label className="block text-xs font-medium">Reviewer email<input name="contactEmail" type="email" maxLength={254} placeholder="Optional" className="mt-1.5 h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[#72988a]" /></label></div>{formError && <p role="alert" className="text-xs text-red-700 dark:text-red-300">{formError}</p>}<button disabled={saving} className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#27685f] text-xs font-semibold text-white disabled:opacity-60">{saving ? "Creating…" : <><Check size={15} />Create project</>}</button></form></section></div>}
  </>;
}

function ProjectTile({ project, listView }: { project: Project; listView: boolean }) {
  const counts = project.deliverables.reduce<Record<string, number>>((result, item) => { result[item.status] = (result[item.status] ?? 0) + 1; return result; }, {});
  return <Link href={`/projects/${project.id}`} className={listView ? "flex flex-col gap-3 px-4 py-3 transition hover:bg-[var(--background)] sm:flex-row sm:items-center sm:justify-between" : "group rounded-md border border-[var(--line)] bg-[var(--surface)] p-4 transition hover:-translate-y-0.5 hover:border-[#a6bdae] hover:shadow-sm"}>
    <div className="flex min-w-0 items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#e7efea] text-[#376856] dark:bg-[#2a3b33] dark:text-[#bdd9c7]"><BriefcaseBusiness size={17} /></span><div className="min-w-0"><h3 className="truncate text-sm font-semibold">{project.name}</h3><p className="mt-1 truncate text-xs text-[var(--muted)]">{project.client.name}</p></div></div>
    <div className={`flex items-center gap-2 ${listView ? "pl-12 sm:pl-0" : "mt-5 border-t border-[var(--line)] pt-3"}`}><span className="text-[11px] text-[var(--muted)]">{project.deliverables.length} deliverables</span><span className="h-3 w-px bg-[var(--line)]" />{Object.entries(counts).slice(0, 2).map(([status]) => <StatusBadge key={status} status={status} />)}<span className="ml-auto text-[10px] text-[var(--muted)]">Updated {new Date(project.updatedAt).toLocaleDateString()}</span></div>
  </Link>;
}