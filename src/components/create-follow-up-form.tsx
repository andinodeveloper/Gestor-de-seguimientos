"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuthContext } from "@/components/auth-provider";
import {
  buildDefaultFollowUpTitle,
  createFollowUpRecord,
  followUpDetailHref,
} from "@/lib/follow-ups";

type Props = {
  canEdit: boolean;
};

export function CreateFollowUpForm({ canEdit }: Props) {
  const router = useRouter();
  const { profile } = useAuthContext();
  const [title, setTitle] = useState(buildDefaultFollowUpTitle());
  const [organizationalUnit, setOrganizationalUnit] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canEdit || !profile) {
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      const followUp = await createFollowUpRecord({
        title,
        organizationalUnit,
        responsibleName,
        reportDate,
        ownerId: profile.id,
      });

      startTransition(() => {
        router.replace(followUpDetailHref(followUp.id));
      });
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear el seguimiento.");
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-2 lg:col-span-2">
        <label className="label">Titulo del seguimiento</label>
        <input value={title} onChange={(event) => setTitle(event.target.value)} className="field" required />
      </div>
      <div className="space-y-2">
        <label className="label">Unidad organizativa</label>
        <input
          value={organizationalUnit}
          onChange={(event) => setOrganizationalUnit(event.target.value)}
          className="field"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="label">Responsable visible</label>
        <input
          value={responsibleName}
          onChange={(event) => setResponsibleName(event.target.value)}
          className="field"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="label">Fecha del reporte</label>
        <input
          type="date"
          value={reportDate}
          onChange={(event) => setReportDate(event.target.value)}
          className="field"
          required
        />
      </div>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={!canEdit || isPending}
          className="w-full rounded-full bg-[var(--accent)] px-5 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[var(--accent-strong)] disabled:opacity-60"
        >
          {isPending ? "Creando..." : "Crear seguimiento"}
        </button>
      </div>
      {error ? <p className="text-sm text-rose-700 lg:col-span-2">{error}</p> : null}
    </form>
  );
}
