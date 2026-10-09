"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { Check, CircleAlert, Palette, Save } from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import { ErrorState, PageHeading, Skeleton, Surface } from "@/components/ui/primitives";

type Settings = { id: string; name: string; slug: string; logoUrl: string | null; primaryColor: string };

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [draft, setDraft] = useState({ name: "", logoUrl: "", primaryColor: "#27685f" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const value = await apiFetch<Settings>("/api/org/settings");
      setSettings(value);
      setDraft({ name: value.name, logoUrl: value.logoUrl ?? "", primaryColor: value.primaryColor });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Settings could not be loaded."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let active = true;
    apiFetch<Settings>("/api/org/settings")
      .then((value) => {
        if (!active) return;
        setSettings(value);
        setDraft({ name: value.name, logoUrl: value.logoUrl ?? "", primaryColor: value.primaryColor });
        setError("");
      })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "Settings could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setSaved(false);
    try {
      const value = await apiFetch<Settings>("/api/org/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: draft.name, logoUrl: draft.logoUrl || null, primaryColor: draft.primaryColor }) });
      setSettings(value); setSaved(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Branding could not be saved."); }
    finally { setSaving(false); }
  }

  return <>
    <PageHeading eyebrow="Workspace" title="Settings" description="Update the identity clients see when they review your work." />
    {loading ? <Surface className="max-w-2xl p-5"><Skeleton className="h-4 w-32" /><Skeleton className="mt-4 h-10 w-full" /><Skeleton className="mt-4 h-10 w-full" /></Surface> : error && !settings ? <Surface><ErrorState message={error} retry={() => void load()} /></Surface> : settings && <div className="grid max-w-4xl gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <Surface className="p-5"><div className="flex items-center gap-2"><Palette size={17} className="text-[var(--muted)]" /><h3 className="text-sm font-semibold">Portal branding</h3></div><p className="mt-1 text-xs text-[var(--muted)]">Changes appear on client review links for this workspace.</p>
        <form onSubmit={save} className="mt-5 space-y-4"><label className="block text-xs font-medium">Workspace name<input required maxLength={120} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-1.5 h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[#72988a]" /></label><label className="block text-xs font-medium">Logo URL <span className="font-normal text-[var(--muted)]">(optional)</span><input type="url" maxLength={2048} value={draft.logoUrl} onChange={(event) => setDraft({ ...draft, logoUrl: event.target.value })} placeholder="https://…" className="mt-1.5 h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[#72988a]" /></label><label className="block text-xs font-medium">Primary color<div className="mt-1.5 flex h-10 items-center gap-3 rounded-md border border-[var(--line)] px-2"><input type="color" value={draft.primaryColor} onChange={(event) => setDraft({ ...draft, primaryColor: event.target.value })} aria-label="Primary color" className="size-7 cursor-pointer rounded border-0 bg-transparent p-0" /><span className="font-mono text-xs text-[var(--muted)]">{draft.primaryColor.toUpperCase()}</span><span className="ml-auto size-6 rounded" style={{ backgroundColor: draft.primaryColor }} /></div></label>
          {error && <p role="alert" className="flex items-center gap-2 text-xs text-red-700 dark:text-red-300"><CircleAlert size={15} />{error}</p>}
          <div className="flex items-center gap-3"><button disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#27685f] px-3 text-xs font-semibold text-white disabled:opacity-50"><Save size={14} />{saving ? "Saving…" : "Save changes"}</button>{saved && <span className="inline-flex items-center gap-1 text-xs text-[#43815b]"><Check size={14} />Saved</span>}</div>
        </form>
      </Surface>
      <Surface className="h-fit p-5"><p className="text-[10px] font-semibold uppercase text-[var(--muted)]">Portal preview</p><div className="mt-4 rounded-md border border-[var(--line)] bg-[#f4f6f2] p-3"><div className="flex items-center gap-2 border-b border-[#dce3dd] pb-3">{draft.logoUrl ? <Image src={draft.logoUrl} alt="" width={28} height={28} unoptimized className="size-7 rounded object-contain" /> : <span className="grid size-7 place-items-center rounded bg-white text-xs font-semibold" style={{ color: draft.primaryColor }}>{draft.name.slice(0, 1) || "A"}</span>}<span className="truncate text-[10px] font-semibold text-[#29362f]">{draft.name || "Your agency"}</span></div><div className="py-5"><div className="h-2 w-24 rounded bg-[#cfd8d0]" /><div className="mt-2 h-2 w-32 rounded bg-[#e0e6e0]" /><div className="mt-4 h-16 rounded bg-white" /><div className="mt-3 h-7 rounded" style={{ backgroundColor: draft.primaryColor }} /></div></div><p className="mt-3 text-[10px] leading-4 text-[var(--muted)]">Workspace slug: <span className="font-mono">{settings.slug}</span></p></Surface>
    </div>}
  </>;
}