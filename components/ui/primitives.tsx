import type { ReactNode } from "react";

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div>{eyebrow && <p className="mb-1 text-[10px] font-semibold uppercase text-[var(--muted)]">{eyebrow}</p>}<h2 className="text-xl font-semibold tracking-normal">{title}</h2>{description && <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>}</div>{action}</div>;
}

export function Surface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-md border border-[var(--line)] bg-[var(--surface)] ${className}`}>{children}</section>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-[#e4e9e4] dark:bg-[#2d3934] ${className}`} />;
}

const statusStyles: Record<string, string> = {
  DRAFT: "bg-[#edf0ed] text-[#56625b] dark:bg-[#34403a] dark:text-[#c0ccc4]",
  IN_REVIEW: "bg-[#e2edf1] text-[#345e6a] dark:bg-[#263c42] dark:text-[#b7d5dc]",
  CHANGES_REQUESTED: "bg-[#f7eddb] text-[#806122] dark:bg-[#443a27] dark:text-[#e6cf9e]",
  APPROVED: "bg-[#e2f0e4] text-[#326044] dark:bg-[#293e31] dark:text-[#b9dfc4]",
  DELIVERED: "bg-[#e7e8f1] text-[#515778] dark:bg-[#34364a] dark:text-[#c6c8e2]",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex min-h-6 items-center rounded px-2 text-[10px] font-semibold uppercase ${statusStyles[status] ?? statusStyles.DRAFT}`}>{status.replaceAll("_", " ")}</span>;
}

export function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="flex min-h-48 flex-col items-center justify-center px-5 py-10 text-center"><span className="grid size-10 place-items-center rounded-full bg-[var(--background)] text-[var(--muted)]">∅</span><h3 className="mt-3 text-sm font-semibold">{title}</h3><p className="mt-1 max-w-sm text-xs leading-5 text-[var(--muted)]">{detail}</p>{action && <div className="mt-4">{action}</div>}</div>;
}

export function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return <div role="alert" className="flex min-h-48 flex-col items-center justify-center px-5 py-10 text-center"><p className="text-sm font-semibold">Could not load this view</p><p className="mt-1 max-w-sm text-xs leading-5 text-[var(--muted)]">{message}</p><button onClick={retry} className="mt-4 rounded-md border border-[var(--line)] px-3 py-2 text-xs font-semibold hover:bg-[var(--background)]">Try again</button></div>;
}