"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AppShell } from "@/components/app-shell";
import { SetupNotice } from "@/components/setup-notice";
import { useAuthContext } from "@/components/auth-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function WorkspaceGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { blocked, isConfigured, loading, profile, session, setup } = useAuthContext();

  useEffect(() => {
    if (loading || !isConfigured) {
      return;
    }

    if (!session || blocked || !profile) {
      if (session && blocked) {
        void createSupabaseBrowserClient().auth.signOut();
      }

      router.replace("/login?blocked=1");
    }
  }, [blocked, isConfigured, loading, profile, router, session]);

  if (!isConfigured) {
    return <SetupNotice state={setup} />;
  }

  if (loading || !session || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface)] px-6">
        <div className="rounded-[2rem] border border-[var(--line)] bg-white px-8 py-10 text-center shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
            Cargando
          </p>
          <p className="mt-4 text-sm text-[var(--muted)]">
            Validando sesion y perfil de acceso.
          </p>
        </div>
      </div>
    );
  }

  return <AppShell profile={profile}>{children}</AppShell>;
}
