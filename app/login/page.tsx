"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, CircleAlert, Command, Mail } from "lucide-react";

export default function LoginPage() {
  return <Suspense fallback={<div className="grid min-h-screen place-items-center text-sm text-[var(--muted)]">Loading sign in…</div>}><LoginForm /></Suspense>;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searchError = searchParams.get("error") ?? "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/signin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error?.message ?? "Sign-in request failed. Try again.");
      }
      setSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not send the sign-in link.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="grid min-h-screen bg-[var(--surface)] lg:grid-cols-[minmax(320px,0.9fr)_1.1fr]">
    <aside className="relative hidden overflow-hidden bg-[#174d43] px-10 py-9 text-white lg:flex lg:flex-col lg:justify-between xl:px-16"><div className="absolute -right-28 -top-24 size-[440px] rounded-full border border-white/10" /><div className="absolute -right-12 -top-10 size-[310px] rounded-full border border-white/10" />
      <div className="relative flex items-center gap-3"><span className="grid size-9 place-items-center rounded-md bg-[#d6eea8] text-[#174d43]"><Command size={18} /></span><span className="font-bold">ClientFlow</span></div>
      <div className="relative max-w-md pb-12"><p className="mb-4 text-xs font-semibold uppercase text-[#c1dda0]">Client review workspace</p><h1 className="text-[34px] font-semibold leading-[1.12]">Make every approval easy to find.</h1><p className="mt-4 max-w-sm text-sm leading-6 text-white/75">Keep the latest work, feedback, and sign-off together in one clear place.</p><div className="mt-10 flex items-center gap-3 border-t border-white/20 pt-5 text-xs text-white/75"><Check size={15} className="text-[#c1dda0]" /> A clear record for every version</div></div>
      <p className="relative text-[11px] text-white/50">Secure links expire after 15 minutes.</p>
    </aside>
    <section className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-10"><div className="w-full max-w-[380px]">
      <div className="mb-9 flex items-center gap-3 lg:hidden"><span className="grid size-9 place-items-center rounded-md bg-[#27685f] text-white"><Command size={18} /></span><span className="font-bold">ClientFlow</span></div>
      <p className="text-xs font-semibold uppercase text-[#27685f] dark:text-[#88c5a5]">Agency workspace</p><h2 className="mt-2 text-2xl font-semibold">Sign in with email</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">We’ll send you a one-time link. No password needed.</p>
      {(searchError === "expired" || searchError === "CredentialsSignin") && <div role="alert" className="mt-6 flex gap-2 rounded-md border border-[#ead6ae] bg-[#fff8e8] p-3 text-sm text-[#775a1c] dark:border-[#5a492b] dark:bg-[#362f21] dark:text-[#efd89f]"><CircleAlert size={17} className="mt-0.5 shrink-0" />This link has expired or was already used. Request a fresh one.</div>}
      {sent ? <div className="mt-8 rounded-lg border border-[var(--line)] bg-[var(--background)] p-5"><span className="grid size-9 place-items-center rounded-full bg-[#e1f0e5] text-[#27685f] dark:bg-[#29453a] dark:text-[#c0ead0]"><Mail size={18} /></span><h3 className="mt-4 text-sm font-semibold">Check your inbox</h3><p className="mt-1 break-words text-sm leading-6 text-[var(--muted)]">If <span className="font-medium text-[var(--foreground)]">{email}</span> is registered, a sign-in link is on its way.</p><button onClick={() => setSent(false)} className="mt-4 text-sm font-medium text-[#27685f] hover:underline dark:text-[#88c5a5]">Try another address</button></div> : <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <label htmlFor="email" className="block text-xs font-semibold">Work email</label><div className="relative"><Mail size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" /><input id="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@agency.com" className="h-11 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] pl-10 pr-3 text-sm outline-none focus:border-[#27685f] focus:ring-2 focus:ring-[#27685f]/15" /></div>
        {error && <p role="alert" className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300"><CircleAlert size={16} />{error}</p>}
        <button disabled={loading} className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#27685f] px-4 text-sm font-semibold text-white transition hover:bg-[#1e574f] disabled:cursor-wait disabled:opacity-60">{loading ? "Sending link…" : "Send sign-in link"}{!loading && <ArrowRight size={16} />}</button>
        <p className="pt-2 text-center text-xs leading-5 text-[var(--muted)]">For access to your workspace, use the email address invited by your agency.</p>
      </form>}
      <p className="mt-10 text-center text-[11px] text-[var(--muted)]">By continuing, you agree to your agency’s workspace terms.</p>
    </div></section>
  </main>;
}