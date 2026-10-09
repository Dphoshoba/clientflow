"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { Activity, BriefcaseBusiness, CircleHelp, Command, LayoutDashboard, LogOut, Menu, Moon, Settings2, Sun, X } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: BriefcaseBusiness },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return <nav className="space-y-1" aria-label="Main navigation">{navItems.map(({ href, label, icon: Icon }) => {
    const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
    return <Link key={href} href={href} onClick={onNavigate} title={label} className={`group flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors md:justify-center md:px-0 xl:justify-start xl:px-3 ${active ? "bg-[var(--accent-soft)] font-semibold text-[var(--accent)]" : "text-[var(--muted)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"}`}><Icon size={18} strokeWidth={1.8} /><span className="md:hidden xl:inline">{label}</span>{active && <span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-[var(--accent)] xl:block" />}</Link>;
  })}</nav>;
}

function PageTitle() {
  const pathname = usePathname();
  return navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label ?? "Workspace";
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <Link href="/dashboard" className={`flex h-12 items-center gap-3 px-5 md:justify-center md:px-0 xl:justify-start xl:px-5 ${compact ? "justify-center" : ""}`} aria-label="ClientFlow home"><span className="grid size-8 shrink-0 place-items-center rounded-md bg-[#27685f] text-white"><Command size={17} strokeWidth={2.2} /></span><span className="text-[15px] font-bold text-[var(--foreground)] md:hidden xl:inline">ClientFlow</span></Link>;
}

function ThemeButton() {
  useEffect(() => {
    const shouldUseDark = localStorage.getItem("clientflow-theme") === "dark";
    document.documentElement.classList.toggle("dark", shouldUseDark);
  }, []);
  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("clientflow-theme", next ? "dark" : "light");
  }
  return <button onClick={toggle} className="grid size-9 place-items-center rounded-md text-[var(--muted)] hover:bg-black/[0.05] dark:hover:bg-white/[0.07]" aria-label="Toggle color theme" title="Toggle color theme"><Sun size={17} className="hidden dark:block" /><Moon size={17} className="block dark:hidden" /></button>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  return <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[68px] border-r border-[var(--line)] bg-[var(--surface)] md:flex md:flex-col xl:w-[236px]">
      <div className="flex h-[68px] items-center border-b border-[var(--line)]"><Brand /></div>
      <div className="flex-1 px-3 py-6 xl:px-4"><p className="mb-3 hidden px-3 text-[10px] font-semibold uppercase text-[var(--muted)] xl:block">Workspace</p><Suspense fallback={<div className="h-[120px]" />}><Navigation /></Suspense><div className="mt-8 border-t border-[var(--line)] pt-5"><p className="mb-3 hidden px-3 text-[10px] font-semibold uppercase text-[var(--muted)] xl:block">Manage</p><Link href="/activity" className="flex h-10 items-center gap-3 rounded-md px-3 text-sm text-[var(--muted)] hover:bg-black/[0.04] md:justify-center md:px-0 xl:justify-start xl:px-3" title="Activity"><Activity size={18} strokeWidth={1.8} /><span className="md:hidden xl:inline">Activity</span></Link></div></div>
      <div className="border-t border-[var(--line)] p-3 xl:p-4"><button className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm text-[var(--muted)] hover:bg-black/[0.04] md:justify-center md:px-0 xl:justify-start xl:px-3" title="Help"><CircleHelp size={18} strokeWidth={1.8} /><span className="md:hidden xl:inline">Help</span></button><button onClick={() => signOut({ callbackUrl: "/login" })} className="mt-1 flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm text-[var(--muted)] hover:bg-black/[0.04] md:justify-center md:px-0 xl:justify-start xl:px-3" title="Sign out"><LogOut size={18} strokeWidth={1.8} /><span className="md:hidden xl:inline">Sign out</span></button></div>
    </aside>
    {drawerOpen && <div className="fixed inset-0 z-50 md:hidden"><button aria-label="Close navigation" onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-black/40" /><aside className="absolute inset-y-0 left-0 w-[280px] border-r border-[var(--line)] bg-[var(--surface)] p-4 shadow-xl"><div className="mb-7 flex items-center justify-between"><Brand compact /><button onClick={() => setDrawerOpen(false)} aria-label="Close menu" className="grid size-9 place-items-center rounded-md text-[var(--muted)]"><X size={18} /></button></div><Suspense fallback={<div className="h-[120px]" />}><Navigation onNavigate={() => setDrawerOpen(false)} /></Suspense><button onClick={() => signOut({ callbackUrl: "/login" })} className="mt-8 flex h-10 w-full items-center gap-3 px-3 text-sm text-[var(--muted)]"><LogOut size={18} />Sign out</button></aside></div>}
    <div className="md:pl-[68px] xl:pl-[236px]"><header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-[var(--line)] bg-[var(--surface)]/95 px-4 backdrop-blur sm:px-6"><div className="flex items-center gap-3"><button onClick={() => setDrawerOpen(true)} className="grid size-9 place-items-center rounded-md text-[var(--muted)] hover:bg-black/[0.05] md:hidden" aria-label="Open navigation"><Menu size={19} /></button><div className="hidden items-center gap-2 text-sm text-[var(--muted)] sm:flex"><span>ClientFlow</span><span>/</span><span className="font-medium text-[var(--foreground)]"><Suspense fallback="Workspace"><PageTitle /></Suspense></span></div><h1 className="text-sm font-semibold sm:hidden"><Suspense fallback="Workspace"><PageTitle /></Suspense></h1></div><div className="flex items-center gap-2"><ThemeButton /><span className="hidden h-6 w-px bg-[var(--line)] sm:block" /><div className="hidden items-center gap-2 sm:flex"><span className="grid size-8 place-items-center rounded-full bg-[#dfece4] text-xs font-semibold text-[#285c49] dark:bg-[#29453a] dark:text-[#c0ead0]">CF</span><span className="max-w-32 truncate text-xs text-[var(--muted)]">Agency workspace</span></div></div></header><main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8">{children}</main></div>
  </div>;
}