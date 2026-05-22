"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuthContext } from "@/components/auth-provider";
import { SetupNotice } from "@/components/setup-notice";

export default function HomePage() {
  const router = useRouter();
  const { blocked, isConfigured, loading, profile, session, setup } = useAuthContext();

  useEffect(() => {
    if (!isConfigured || loading) {
      return;
    }

    router.replace(session && profile && !blocked ? "/dashboard" : "/login");
  }, [blocked, isConfigured, loading, profile, router, session]);

  if (!isConfigured) {
    return <SetupNotice state={setup} />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface)] px-6">
      <div className="rounded-[2rem] border border-[var(--line)] bg-white px-8 py-10 text-center shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
          Redireccionando
        </p>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Preparando la ruta inicial de la aplicacion.
        </p>
      </div>
    </div>
  );
}
