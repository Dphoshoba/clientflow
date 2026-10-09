"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleAlert, LoaderCircle } from "lucide-react";

function VerifyLink() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState(false);
  const token = params.get("token");

  useEffect(() => {
    if (!token) {
      router.replace("/login?error=expired");
      return;
    }
    let active = true;
    signIn("magic-link", { token, redirect: false, callbackUrl: "/dashboard" })
      .then((result) => {
        if (!active) return;
        if (result?.ok) router.replace("/dashboard");
        else setError(true);
      })
      .catch(() => active && setError(true));
    return () => { active = false; };
  }, [router, token]);

  if (error) return <div role="alert" className="flex max-w-sm flex-col items-center text-center"><CircleAlert size={28} className="text-[#a44938]" /><h1 className="mt-4 text-lg font-semibold">This link can’t be used</h1><p className="mt-2 text-sm text-[var(--muted)]">It may have expired or already been used. Request another sign-in link.</p><a href="/login?error=expired" className="mt-5 text-sm font-semibold text-[#27685f] dark:text-[#88c5a5]">Back to sign in</a></div>;
  return <div className="flex flex-col items-center text-center"><LoaderCircle size={28} className="animate-spin text-[#27685f] dark:text-[#88c5a5]" /><p className="mt-4 text-sm font-medium">Verifying your sign-in link…</p></div>;
}

export default function VerifyPage() {
  return <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5 text-[var(--foreground)]"><Suspense fallback={<LoaderCircle size={28} className="animate-spin" />}><VerifyLink /></Suspense></main>;
}