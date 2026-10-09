"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, CircleCheck, Clock3, Download, FileText, LoaderCircle, MessageSquareText, Send } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/client-api";
import { StatusBadge } from "@/components/ui/primitives";

type PortalComment = { id: string; content: string; contactEmail: string | null; createdAt: string };
type PortalVersion = { id: string; versionNumber: number; fileName: string; fileUrl: string; contentType: string | null; comments: PortalComment[]; decisions: { decision: string; decidedByEmail: string; note: string | null; createdAt: string }[] };
type PortalDeliverable = { id: string; name: string; status: string; versions: PortalVersion[] };
type PortalContext = {
  valid: true;
  expiresAt: string;
  client: { name: string; contactName: string };
  organization: { name: string; logoUrl: string | null; primaryColor: string };
  project: { id: string; name: string };
  deliverables: { id: string; name: string; status: string; currentVersion: { versionNumber: number } | null }[];
};

export default function PortalReviewPage() {
  return <Suspense fallback={<div className="grid min-h-screen place-items-center text-sm text-[#64716b]">Opening your review…</div>}><PortalReviewContent /></Suspense>;
}

function PortalReviewContent() {
  const { token } = useParams<{ token: string }>();
  const [context, setContext] = useState<PortalContext | null>(null);
  const [deliverables, setDeliverables] = useState<PortalDeliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [portalContext, reviewItems] = await Promise.all([
        apiFetch<PortalContext>(`/api/portal/verify?token=${encodeURIComponent(token)}`),
        apiFetch<PortalDeliverable[]>(`/api/portal/deliverables?token=${encodeURIComponent(token)}`),
      ]);
      setContext(portalContext);
      setDeliverables(reviewItems);
      setExpired(false);
      setInvalid(false);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        setExpired(caught.code === "UNAUTHORIZED" ? false : true);
        setInvalid(caught.code !== "UNAUTHORIZED" && caught.code !== undefined);
        if (caught.code === "INVALID_TOKEN") { setExpired(false); setInvalid(true); }
      } else if (caught instanceof ApiError && caught.status === 403) setInvalid(true);
      else setError(caught instanceof Error ? caught.message : "Review link could not be checked.");
    } finally { setLoading(false); }
  }
  useEffect(() => {
    let active = true;
    Promise.all([
      apiFetch<PortalContext>(`/api/portal/verify?token=${encodeURIComponent(token)}`),
      apiFetch<PortalDeliverable[]>(`/api/portal/deliverables?token=${encodeURIComponent(token)}`),
    ])
      .then(([portalContext, reviewItems]) => {
        if (!active) return;
        setContext(portalContext);
        setDeliverables(reviewItems);
        setExpired(false);
        setInvalid(false);
        setError("");
      })
      .catch((caught: unknown) => {
        if (!active) return;
        if (caught instanceof ApiError && caught.status === 401 && caught.code === "TOKEN_EXPIRED") setExpired(true);
        else if (caught instanceof ApiError && (caught.code === "INVALID_TOKEN" || caught.status === 403)) setInvalid(true);
        else setError(caught instanceof Error ? caught.message : "Review link could not be checked.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const accent = context?.organization.primaryColor ?? "#27685f";
  if (loading) return <PortalFrame accent={accent}><div className="flex flex-col items-center py-24"><LoaderCircle className="animate-spin" size={26} style={{ color: accent }} /><p className="mt-4 text-sm text-[#64716b]">Opening your review…</p></div></PortalFrame>;
  if (expired || invalid) return <PortalFrame accent={accent}><div className="mx-auto max-w-md py-24 text-center"><span className="mx-auto grid size-12 place-items-center rounded-full bg-[#fff2e8] text-[#a15d38]"><AlertTriangle size={22} /></span><h1 className="mt-5 text-xl font-semibold text-[#202c29]">{expired ? "This review link has expired" : "This review link is not available"}</h1><p className="mt-2 text-sm leading-6 text-[#64716b]">{expired ? "For your security, review links expire after 14 days. Contact your agency to request a fresh link." : "The link may be incomplete or access may have been removed. Contact your agency for help."}</p></div></PortalFrame>;
  if (error || !context) return <PortalFrame accent={accent}><div className="mx-auto max-w-md py-24 text-center"><h1 className="text-lg font-semibold">We couldn’t load the review</h1><p className="mt-2 text-sm text-[#64716b]">{error}</p><button onClick={() => void load()} className="mt-5 h-9 rounded-md border border-[#dce3dd] px-4 text-xs font-semibold">Try again</button></div></PortalFrame>;

  const pendingCount = deliverables.filter((item) => item.status === "IN_REVIEW").length;
  return <PortalFrame accent={accent}>
    <header className="border-b border-[#dce3dd] bg-white"><div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-7">
      <div className="flex min-w-0 items-center gap-3">{context.organization.logoUrl ? <Image src={context.organization.logoUrl} alt="" width={36} height={36} unoptimized className="size-9 rounded object-contain" /> : <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#edf2ee] text-sm font-bold" style={{ color: accent }}>{context.organization.name.slice(0, 1).toUpperCase()}</span>}<div className="min-w-0"><p className="truncate text-xs font-semibold text-[#25322d]">{context.organization.name}</p><p className="text-[10px] text-[#79847f]">Client review portal</p></div></div>
      <div className="hidden items-center gap-2 text-[11px] text-[#68756e] sm:flex"><Clock3 size={14} /> Link valid until {new Date(context.expiresAt).toLocaleDateString()}</div>
    </div></header>
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-7 sm:pt-10">
      <div className="mb-7 flex flex-col justify-between gap-4 border-b border-[#dce3dd] pb-6 sm:flex-row sm:items-end"><div><p className="text-[10px] font-semibold uppercase tracking-normal text-[#748078]">{context.client.name} <span className="px-1">/</span> {context.project.name}</p><h1 className="mt-2 text-[22px] font-semibold text-[#202c29]">Review deliverables</h1><p className="mt-1 text-xs text-[#68756e]">{pendingCount ? `${pendingCount} item${pendingCount === 1 ? "" : "s"} waiting for your review` : "Your project feedback and approvals"}</p></div><span className="inline-flex h-7 w-fit items-center gap-1.5 rounded bg-[#e9f2ec] px-2.5 text-[10px] font-semibold text-[#3b654a]"><CircleCheck size={13} /> Review access verified</span></div>
      {deliverables.length === 0 ? <div className="rounded-md border border-[#dce3dd] bg-white px-5 py-16 text-center"><FileText size={25} className="mx-auto text-[#849189]" /><h2 className="mt-4 text-sm font-semibold text-[#25322d]">Nothing to review yet</h2><p className="mt-1 text-xs text-[#748078]">Your agency will add work to this project when it’s ready.</p></div> : <div className="space-y-5">{deliverables.map((item) => <ReviewCard key={item.id} token={token} item={item} accent={accent} onUpdated={() => void load()} />)}</div>}
      <p className="mt-8 text-center text-[10px] leading-5 text-[#8a948e]">This private review link is intended for {context.client.name}. Do not forward it.</p>
    </main>
  </PortalFrame>;
}

function PortalFrame({ children, accent }: { children: React.ReactNode; accent: string }) {
  return <div className="min-h-screen bg-[#f4f6f2]" style={{ "--portal-accent": accent } as React.CSSProperties}><div className="min-h-[3px] bg-[var(--portal-accent)]" />{children}</div>;
}

function ReviewCard({ item, token, accent, onUpdated }: { item: PortalDeliverable; token: string; accent: string; onUpdated: () => void }) {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const version = item.versions[0];
  const isImage = version?.contentType?.startsWith("image/") ?? false;
  const canReview = item.status === "IN_REVIEW" && Boolean(version);

  async function submitApproval() {
    setBusy(true); setError("");
    try { await apiFetch("/api/portal/approve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, deliverableId: item.id }) }); onUpdated(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Approval could not be recorded."); }
    finally { setBusy(false); }
  }

  async function submitChanges(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!version || !comment.trim()) return;
    setBusy(true); setError("");
    try { await apiFetch("/api/portal/comments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, versionId: version.id, content: comment }) }); setComment(""); onUpdated(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Feedback could not be sent."); }
    finally { setBusy(false); }
  }

  return <article className="overflow-hidden rounded-md border border-[#dce3dd] bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8ece8] px-4 py-3 sm:px-5"><div><h2 className="text-sm font-semibold text-[#25322d]">{item.name}</h2><p className="mt-0.5 text-[10px] text-[#78847d]">{version ? `Version ${version.versionNumber} · ${version.fileName}` : "No file attached"}</p></div><StatusBadge status={item.status} /></div>
    <div className="grid min-h-[220px] place-items-center bg-[#f0f3ef] p-4 sm:min-h-[320px]">{version ? isImage ? <Image src={version.fileUrl} alt={version.fileName} width={1200} height={900} unoptimized className="max-h-[55vh] w-auto max-w-full object-contain" /> : <div className="py-10 text-center"><span className="mx-auto grid size-11 place-items-center rounded-full bg-white text-[#78847d]"><FileText size={20} /></span><p className="mt-3 text-xs font-medium text-[#25322d]">Preview isn’t available for this file</p><p className="mt-1 text-[10px] text-[#78847d]">Download the file to view it.</p><a href={version.fileUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex h-8 items-center gap-2 rounded border border-[#dce3dd] bg-white px-3 text-[10px] font-semibold text-[#34453b]"><Download size={13} />Open file</a></div> : <p className="text-xs text-[#78847d]">No review file is available.</p>}</div>
    <div className="px-4 py-4 sm:px-5">{version && <div className="mb-4">{version.decisions[0] && <div className="mb-3 flex items-center gap-2 rounded bg-[#eef6ef] px-3 py-2 text-[11px] text-[#386348]"><CheckCircle2 size={15} />Approved by {version.decisions[0].decidedByEmail} on {new Date(version.decisions[0].createdAt).toLocaleDateString()}</div>}
      <div className="space-y-3">{version.comments.length === 0 ? <p className="py-2 text-center text-[11px] text-[#87918b]">No feedback yet on this version.</p> : version.comments.map((entry) => <div key={entry.id} className="rounded bg-[#f7f8f6] px-3 py-2.5"><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-semibold text-[#48564e]">{entry.contactEmail ?? "Agency"}</span><time className="text-[9px] text-[#88938c]">{new Date(entry.createdAt).toLocaleDateString()}</time></div><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[#4d5a52]">{entry.content}</p></div>)}</div></div>}
      {error && <p role="alert" className="mb-3 rounded bg-[#fff0ec] px-3 py-2 text-[11px] text-[#873d2d]">{error}</p>}
      {canReview ? <div className="border-t border-[#e8ece8] pt-4"><p className="mb-3 text-[10px] font-semibold uppercase text-[#78847d]">Your decision</p><div className="grid gap-2 sm:grid-cols-2"><button disabled={busy} onClick={() => void submitApproval()} className="inline-flex h-10 items-center justify-center gap-2 rounded-md text-xs font-semibold text-white disabled:opacity-50" style={{ backgroundColor: accent }}>{busy ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}Approve this version</button><form onSubmit={submitChanges} className="contents"><button type="button" onClick={() => document.getElementById(`feedback-${item.id}`)?.focus()} disabled={busy} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cbd5ce] bg-white text-xs font-semibold text-[#34453b] disabled:opacity-50"><MessageSquareText size={15} />Request changes</button></form></div><form onSubmit={submitChanges} className="mt-3 flex flex-col gap-2 sm:flex-row"><textarea id={`feedback-${item.id}`} value={comment} onChange={(event) => setComment(event.target.value)} maxLength={5000} rows={2} placeholder="Share feedback or describe the changes you need…" className="min-h-10 flex-1 resize-y rounded-md border border-[#dce3dd] bg-white px-3 py-2 text-xs text-[#25322d] outline-none focus:border-[#91aa99]" /><button disabled={busy || !comment.trim()} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-[#cbd5ce] px-3 text-xs font-semibold text-[#34453b] disabled:opacity-45"><Send size={14} />Send feedback</button></form><p className="mt-2 text-[9px] leading-4 text-[#89948d]">Submitting feedback moves this deliverable to “Changes requested”.</p></div> : <div className="flex items-center gap-2 border-t border-[#e8ece8] pt-4 text-xs text-[#64716b]">{item.status === "APPROVED" || item.status === "DELIVERED" ? <><CheckCircle2 size={16} className="text-[#43815b]" />This version has been approved.</> : item.status === "CHANGES_REQUESTED" ? <><MessageSquareText size={16} />Your requested changes are with the agency.</> : <><Clock3 size={16} />This item is not currently awaiting approval.</>}</div>}
    </div>
  </article>;
}