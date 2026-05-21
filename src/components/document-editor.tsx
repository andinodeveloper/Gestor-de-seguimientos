"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useAuthContext } from "@/components/auth-provider";
import { DOCUMENT_STATUS_OPTIONS } from "@/lib/constants";
import { canEditRole } from "@/lib/domain";
import { updateDocument } from "@/lib/follow-ups";
import type { DocumentTracking, Role } from "@/lib/types";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "saving" | "saved" | "error";

export function DocumentEditor({
  document,
  role,
}: {
  document: DocumentTracking;
  role: Role;
}) {
  const { profile } = useAuthContext();
  const editable = canEditRole(role);
  
  const [data, setData] = useState(document);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const firstRun = useRef(true);

  useEffect(() => {
    if (!editable || !profile) return;
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }

    setSaveState((current) => (current === "saving" ? current : "idle"));
    const timer = window.setTimeout(() => {
      startTransition(async () => {
        try {
          setSaveState("saving");
          const updated = await updateDocument(document.id, profile.id, data);
          setData(updated);
          setSaveState("saved");
        } catch {
          setSaveState("error");
        }
      });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [data, editable, profile, document.id]);

  async function handleToggleStatus() {
    if (!editable || !profile) return;
    setSaveState("saving");
    try {
      const nextStatus = data.status === "archived" ? "active" : "archived";
      const updated = await updateDocument(document.id, profile.id, { ...data, status: nextStatus });
      setData(updated);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.55fr_0.85fr]">
        <div className="rounded-[2rem] border border-[var(--line)] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Documento</p>
              <h3 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[var(--ink)]">{data.title}</h3>
            </div>
            <SavePill state={saveState} />
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <Field label="Titulo">
              <input
                value={data.title}
                onChange={(e) => setData((c) => ({ ...c, title: e.target.value }))}
                className="field"
                disabled={!editable}
              />
            </Field>
            <Field label="Unidad organizativa">
              <input
                value={data.organizational_unit}
                onChange={(e) => setData((c) => ({ ...c, organizational_unit: e.target.value }))}
                className="field"
                disabled={!editable}
              />
            </Field>
            <Field label="Estado maestro">
              <select
                value={data.status_code}
                onChange={(e) => setData((c) => ({ ...c, status_code: e.target.value }))}
                className="field"
                disabled={!editable}
              >
                {DOCUMENT_STATUS_OPTIONS.map((status) => (
                  <option key={status.code} value={status.code}>{status.label}</option>
                ))}
              </select>
            </Field>
            <div className="flex flex-col justify-center items-center rounded-2xl bg-[var(--surface-2)] p-4 border border-[var(--line)]">
               <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Avance Calculado</p>
               <p className="mt-2 text-3xl font-semibold text-[var(--accent)]">{data.progress_percent}%</p>
            </div>
          </div>
          <div className="mt-6">
             <Field label="Observaciones">
                <textarea
                  value={data.notes}
                  onChange={(e) => setData((c) => ({ ...c, notes: e.target.value }))}
                  className="field min-h-32 resize-y"
                  disabled={!editable}
                />
             </Field>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-[var(--line)] bg-[var(--shell)] p-8 text-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/50">Estado General</p>
          <h3 className="mt-4 text-3xl font-semibold tracking-[-0.05em]">
            {data.status === "archived" ? "Archivado" : "Activo"}
          </h3>
          <div className="mt-8 space-y-4 text-sm text-white/70">
            <p>Última actualización: {new Date(data.updated_at).toLocaleDateString()}</p>
          </div>
          <div className="mt-8 grid gap-3">
            {editable && (
              <button
                type="button"
                onClick={handleToggleStatus}
                className="rounded-full border border-white/[0.14] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white/[0.08] disabled:opacity-60"
              >
                {data.status === "archived" ? "Reactivar" : "Archivar"}
              </button>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function SavePill({ state }: { state: SaveState }) {
  const tone =
    state === "error"
      ? "bg-rose-100 text-rose-700"
      : state === "saving"
        ? "bg-amber-100 text-amber-800"
        : state === "saved"
          ? "bg-emerald-100 text-emerald-800"
          : "bg-[var(--surface-2)] text-[var(--muted)]";

  const label =
    state === "error"
      ? "Error al guardar"
      : state === "saving"
        ? "Guardando"
        : state === "saved"
          ? "Guardado"
          : "Sin cambios";

  return <span className={cn("rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]", tone)}>{label}</span>;
}
