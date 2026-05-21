"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { useAuthContext } from "@/components/auth-provider";
import { FollowUpEditor } from "@/components/follow-up-editor";
import { getFollowUpBundle } from "@/lib/follow-ups";
import type { FollowUpBundle } from "@/lib/types";

function FollowUpDetailContent() {
  const searchParams = useSearchParams();
  const { profile } = useAuthContext();
  const followUpId = searchParams.get("id") ?? "";
  const [bundle, setBundle] = useState<FollowUpBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    if (!followUpId) {
      setBundle(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    void getFollowUpBundle(followUpId)
      .then((nextBundle) => {
        if (!ignore) {
          setBundle(nextBundle);
          setIsLoading(false);
        }
      })
      .catch((loadError) => {
        if (!ignore) {
          setBundle(null);
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el seguimiento.");
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [followUpId]);

  if (!followUpId) {
    return (
      <div className="rounded-[2rem] border border-dashed border-[var(--line-strong)] bg-white/60 px-8 py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Sin identificador</p>
        <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
          Abre un seguimiento desde el listado principal.
        </h3>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-900">
        {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-[2rem] border border-[var(--line)] bg-white px-8 py-16 text-center shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Cargando</p>
        <p className="mt-4 text-sm text-[var(--muted)]">Consultando detalles del seguimiento.</p>
      </div>
    );
  }

  if (!bundle || !profile) {
    return (
      <div className="rounded-[2rem] border border-dashed border-[var(--line-strong)] bg-white/60 px-8 py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">No encontrado</p>
        <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
          El seguimiento solicitado no existe o ya no esta disponible.
        </h3>
      </div>
    );
  }

  return <FollowUpEditor initialBundle={bundle} role={profile.role} />;
}

export default function FollowUpDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-[2rem] border border-[var(--line)] bg-white px-8 py-16 text-center shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Cargando</p>
          <p className="mt-4 text-sm text-[var(--muted)]">Preparando el detalle del seguimiento.</p>
        </div>
      }
    >
      <FollowUpDetailContent />
    </Suspense>
  );
}
