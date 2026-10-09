"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, Clock3, Copy, ExternalLink, FileText, MessageSquareText, Send, Upload, UsersRound } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/client-api";
import { EmptyState, ErrorState, PageHeading, Skeleton, StatusBadge, Surface } from "@/components/ui/primitives";

type Comment = { id: string; content: string; isInternal: boolean; userId: string | null; contactEmail: string | null; createdAt: string };
type Version = { id: string; versionNumber: number; fileName: string; fileUrl: string; contentType: string | null; createdAt: string; comments: Comment[]; decisions: { id: string; decision: string; decidedByEmail: string; note: string | null; createdAt: string }[] };
type Deliverable = { id: string; name: string; status: string; updatedAt: string; project: { id: string; name: string; client: { id: string; name: string; contacts: { id: string; name: string; email: string }[] } }; versions: Version[] };

export default function DeliverableDetailPage() {
  return <Suspense fallback={<div className="min-h-64 animate-pulse rounded-md border border-[var(--line)] bg-[var(--surface)]" />}><DeliverableDetailContent /></Suspense>;
}

function DeliverableDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [deliverable, setDeliverable] = useState<Deliverable | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ApiError | Error | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [internal, setInternal] = useState(true);
  const [actionError, setActionError] = useState("");
  const [selectedContact, setSelectedContact] = useState("");
  const [portalUrl, setPortalUrl] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await apiFetch<Deliverable>(`/api/deliverables/${id}`);
      setDeliverable(result);
      setSelectedVersionId((current) => current || result.versions[0]?.id || "");
      setSelectedContact((current) => current || result.project.client.contacts[0]?.id || "");
    } catch (caught) { setLoadError(caught instanceof Error ? caught : new Error("Deliverable could not be loaded.")); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let active = true;
    apiFetch<Deliverable>(`/api/deliverables/${id}`)
      .then((result) => {
        if (!active) return;
        setDeliverable(result);
        setSelectedVersionId((current) => current || result.versions[0]?.id || "");
        setSelectedContact((current) => current || result.project.client.contacts[0]?.id || "");
        setLoadError(null);
      })
      .catch((caught: unknown) => { if (active) setLoadError(caught instanceof Error ? caught : new Error("Deliverable could not be loaded.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const version = useMemo(() => deliverable?.versions.find((item) => item.id === selectedVersionId) ?? deliverable?.versions[0], [deliverable, selectedVersionId]);
  const previewable = version?.contentType?.startsWith("image/") ?? false;

  async function uploadFile(file: File | undefined) {
    if (!file || !deliverable) return;
    setBusy(true);
    setActionError("");
    try {
      const signed = await apiFetch<{ uploadUrl: string; fileKey: string }>(`/api/deliverables/${id}/upload-url`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName: file.name, contentType: file.type || "application/octet-stream" }) });
      const uploadResponse = await fetch(signed.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
      if (!uploadResponse.ok) throw new Error("File upload failed. Check the storage CORS settings and try again.");
      await apiFetch(`/api/deliverables/${id}/version`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileKey: signed.fileKey, fileName: file.name, contentType: file.type || "application/octet-stream" }) });
      setSelectedVersionId("");
      await load();
    } catch (caught) { setActionError(caught instanceof Error ? caught.message : "File could not be uploaded."); }
    finally { setBusy(false); }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) return;
    setBusy(true);
    setActionError("");
    try {
      await apiFetch(`/api/deliverables/${id}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: message, isInternal: internal }) });
      setMessage("");
      await load();
    } catch (caught) { setActionError(caught instanceof Error ? caught.message : "Comment could not be added."); }
    finally { setBusy(false); }
  }

  async function changeStatus(status: string) {
    setBusy(true);
    setActionError("");
    try { await apiFetch(`/api/deliverables/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); await load(); }
    catch (caught) { setActionError(caught instanceof Error ? caught.message : "Status could not be changed."); }
    finally { setBusy(false); }
  }

  async function createPortalLink() {
    if (!deliverable || !selectedContact) return;
    setBusy(true);
    setActionError("");
    try {
      const result = await apiFetch<{ portalUrl: string }>("/api/portal/generate-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientContactId: selectedContact, projectId: deliverable.project.id }) });
      setPortalUrl(result.portalUrl);
      setLinkCopied(false);
    } catch (caught) { setActionError(caught instanceof Error ? caught.message : "Review link could not be created."); }
    finally { setBusy(false); }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(portalUrl);
    setLinkCopied(true);
  }

  if (loading) return <div className="space-y-5"><Skeleton className="h-7 w-48" /><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]"><Skeleton className="h-[420px]" /><Skeleton className="h-[300px]" /></div></div>;
  if (loadError) {
    const status = loadError instanceof ApiError ? loadError.status : 0;
    const text = status === 401 ? "Your sign-in session has expired. Sign in again to continue." : status === 403 ? "Your account does not have access to this deliverable." : status === 404 ? "This deliverable may have been removed." : loadError.message;
    return <Surface><ErrorState message={text} retry={() => status === 401 ? router.push("/login") : (setLoading(true), void load())} /></Surface>;
  }
  if (!deliverable) return null;

  return <>
    <Link href={`/projects/${deliverable.project.id}`} className="mb-5 inline-flex items-center gap-2 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"><ArrowLeft size={15} />{deliverable.project.name}</Link>
    <PageHeading eyebrow={deliverable.project.client.name} title={deliverable.name} description={`Updated ${new Date(deliverable.updatedAt).toLocaleDateString()}`} action={<StatusBadge status={deliverable.status} />} />
    {actionError && <div role="alert" className="mb-4 rounded-md border border-[#e7c7bd] bg-[#fff0ec] px-3 py-2 text-xs text-[#873d2d] dark:border-[#573a34] dark:bg-[#3a2825] dark:text-[#f0b7a8]">{actionError}</div>}

    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <Surface>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3"><div className="flex items-center gap-2"><FileText size={16} className="text-[var(--muted)]" /><span className="text-xs font-semibold">{version ? `Version ${version.versionNumber}` : "No version uploaded"}</span>{version && <span className="text-[10px] text-[var(--muted)]">· {version.fileName}</span>}</div>{version && <a href={version.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#27685f] hover:underline dark:text-[#88c5a5]">Open file <ExternalLink size={13} /></a>}</div>
          <div className="grid min-h-[300px] place-items-center bg-[#f0f3ef] p-4 dark:bg-[#18201d] sm:min-h-[420px]">{version ? previewable ? <Image src={version.fileUrl} alt={version.fileName} width={1200} height={900} unoptimized className="max-h-[65vh] w-auto max-w-full object-contain" /> : <div className="text-center"><span className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--surface)] text-[var(--muted)]"><FileText size={22} /></span><p className="mt-3 text-sm font-medium">Preview unavailable</p><p className="mt-1 max-w-xs text-xs text-[var(--muted)]">Open the file in a new tab to review this format.</p><a href={version.fileUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-8 items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-xs font-semibold"><ExternalLink size={13} />Open file</a></div> : <EmptyState title="No file uploaded" detail="Upload the first version to start review and comments." />}</div>
          {deliverable.versions.length > 1 && <div className="flex items-center gap-2 overflow-x-auto border-t border-[var(--line)] px-4 py-3">{[...deliverable.versions].reverse().map((item) => <button key={item.id} onClick={() => setSelectedVersionId(item.id)} className={`shrink-0 rounded border px-2.5 py-1.5 text-[10px] font-semibold ${version?.id === item.id ? "border-[#93b2a0] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--line)] text-[var(--muted)]"}`}>V{item.versionNumber}<span className="ml-1.5 font-normal">{new Date(item.createdAt).toLocaleDateString()}</span></button>)}</div>}
        </Surface>

        <Surface>
          <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3"><h3 className="flex items-center gap-2 text-sm font-semibold"><MessageSquareText size={16} />Feedback</h3><span className="text-[10px] text-[var(--muted)]">{version?.comments.length ?? 0} comments</span></div>
          <div className="max-h-[330px] divide-y divide-[var(--line)] overflow-y-auto">{!version || version.comments.length === 0 ? <EmptyState title="No feedback on this version" detail="Leave a team note or share the review link with your client." /> : version.comments.map((comment) => <div key={comment.id} className="px-4 py-3"><div className="flex items-center gap-2"><span className="grid size-6 place-items-center rounded-full bg-[var(--background)] text-[10px] font-semibold">{comment.isInternal ? "T" : "C"}</span><span className="text-xs font-semibold">{comment.isInternal ? "Team note" : comment.contactEmail ?? "Client"}</span>{comment.isInternal && <span className="rounded bg-[#f5efdc] px-1.5 py-0.5 text-[9px] font-semibold text-[#806122] dark:bg-[#443a27] dark:text-[#e6cf9e]">Internal</span>}<span className="ml-auto text-[10px] text-[var(--muted)]">{new Date(comment.createdAt).toLocaleString()}</span></div><p className="ml-8 mt-1.5 whitespace-pre-wrap text-xs leading-5 text-[var(--muted)]">{comment.content}</p></div>)}</div>
          <form onSubmit={submitComment} className="border-t border-[var(--line)] p-4"><div className="mb-3 flex items-center gap-1 rounded-md border border-[var(--line)] p-1"><button type="button" onClick={() => setInternal(true)} className={`flex h-7 items-center gap-1.5 rounded px-2 text-[10px] font-semibold ${internal ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--muted)]"}`}><UsersRound size={13} />Internal</button><button type="button" onClick={() => setInternal(false)} className={`flex h-7 items-center gap-1.5 rounded px-2 text-[10px] font-semibold ${!internal ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--muted)]"}`}><MessageSquareText size={13} />Client-visible</button></div><div className="flex items-end gap-2"><textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={5000} rows={2} placeholder={internal ? "Add an internal note…" : "Add a client-visible comment…"} className="min-h-10 flex-1 resize-y rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs outline-none focus:border-[#72988a]" /><button disabled={!message.trim() || busy || !version} aria-label="Send comment" title="Send comment" className="grid size-9 shrink-0 place-items-center rounded-md bg-[#27685f] text-white disabled:opacity-45"><Send size={15} /></button></div></form>
        </Surface>
      </div>

      <div className="space-y-4">
        <Surface className="p-4"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Review status</h3><Clock3 size={16} className="text-[var(--muted)]" /></div><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{deliverable.status === "IN_REVIEW" ? "Your client has the latest version for review." : deliverable.status === "CHANGES_REQUESTED" ? "Your client requested changes. Update the work, then send a new version for review." : deliverable.status === "APPROVED" ? "This version has been approved by the client." : deliverable.status === "DELIVERED" ? "This approved work has been marked delivered." : "Upload a version before sending this item for review."}</p><div className="mt-4 space-y-2">{deliverable.status === "DRAFT" && <button disabled={busy || !version} onClick={() => void changeStatus("IN_REVIEW")} className="h-9 w-full rounded-md bg-[#27685f] text-xs font-semibold text-white disabled:opacity-50">Send for review</button>}{deliverable.status === "CHANGES_REQUESTED" && <button disabled={busy || !version} onClick={() => void changeStatus("IN_REVIEW")} className="h-9 w-full rounded-md bg-[#27685f] text-xs font-semibold text-white disabled:opacity-50">Resubmit for review</button>}{deliverable.status === "APPROVED" && <button disabled={busy} onClick={() => void changeStatus("DELIVERED")} className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-[var(--line)] text-xs font-semibold disabled:opacity-50"><CheckCircle2 size={15} />Mark as delivered</button>}</div></Surface>

        <Surface className="p-4"><h3 className="text-sm font-semibold">Versions</h3>{deliverable.versions.length ? <div className="mt-3 space-y-3">{[...deliverable.versions].reverse().map((item) => <button key={item.id} onClick={() => setSelectedVersionId(item.id)} className={`flex w-full items-start gap-3 text-left ${version?.id === item.id ? "text-[var(--foreground)]" : "text-[var(--muted)]"}`}><span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-[9px] font-semibold ${version?.id === item.id ? "border-[#8eac9a] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--line)]"}`}>V{item.versionNumber}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{item.fileName}</span><span className="mt-1 block text-[10px]">{new Date(item.createdAt).toLocaleString()}</span></span></button>)}</div> : <p className="mt-2 text-xs text-[var(--muted)]">No versions uploaded yet.</p>}<label className="mt-4 flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-[var(--line)] text-xs font-semibold hover:bg-[var(--background)]">{busy ? "Working…" : <><Upload size={14} />Upload a new version</>}<input type="file" className="sr-only" disabled={busy} onChange={(event) => { void uploadFile(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} /></label></Surface>

        <Surface className="p-4"><h3 className="text-sm font-semibold">Client review link</h3><p className="mt-1 text-[11px] leading-5 text-[var(--muted)]">Share a private 14-day link with a project contact.</p>{deliverable.project.client.contacts.length ? <><select aria-label="Select client reviewer" value={selectedContact} onChange={(event) => setSelectedContact(event.target.value)} className="mt-3 h-9 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 text-xs">{deliverable.project.client.contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name} · {contact.email}</option>)}</select><button disabled={busy || !selectedContact} onClick={() => void createPortalLink()} className="mt-2 h-9 w-full rounded-md border border-[var(--line)] text-xs font-semibold disabled:opacity-50">{busy ? "Creating link…" : "Create review link"}</button>{portalUrl && <div className="mt-3 rounded-md bg-[var(--background)] p-2.5"><p className="break-all text-[10px] leading-4 text-[var(--muted)]">{portalUrl}</p><button onClick={() => void copyLink()} className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#27685f] dark:text-[#88c5a5]"><Copy size={12} />{linkCopied ? "Copied" : "Copy link"}</button></div>}</> : <p className="mt-3 rounded-md bg-[var(--background)] p-3 text-[11px] leading-5 text-[var(--muted)]">Add a client contact to this project’s client before you create a review link.</p>}</Surface>
      </div>
    </div>
  </>;
}