"use client";

import { useAuthContext } from "@/components/auth-provider";
import { CreateFollowUpForm } from "@/components/create-follow-up-form";
import { canEditRole } from "@/lib/domain";

export default function NewFollowUpPage() {
  const { profile } = useAuthContext();
  const canEdit = profile ? canEditRole(profile.role) : false;

  return (
    <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[2rem] border border-[var(--line)] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Alta de seguimiento</p>
        <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-[var(--ink)]">Nuevo registro operativo</h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
          Cada seguimiento se almacena como entidad propia con fecha de corte, responsable visible y modulos persistentes para documentos, actividades y proyectos.
        </p>
        <div className="mt-8">
          <CreateFollowUpForm canEdit={canEdit} />
        </div>
      </section>

      <aside className="rounded-[2rem] border border-[var(--line)] bg-[var(--surface-2)] p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Recomendaciones</p>
        <div className="mt-6 space-y-4 text-sm leading-7 text-[var(--ink)]">
          <p>Usa un titulo entendible por negocio, no solo una fecha.</p>
          <p>La unidad organizativa facilita filtrado y exportes.</p>
          <p>El responsable visible no tiene que ser el creador tecnico.</p>
          <p>Despues de crear, podras completar documentos, actividades y tableros de proyecto.</p>
        </div>
      </aside>
    </div>
  );
}
