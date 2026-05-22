"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuthContext } from "@/components/auth-provider";
import { createDocument, createActivity, createProject } from "@/lib/follow-ups";
import Link from "next/link";

export default function NewRecordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuthContext();

  const presetType = useMemo(() => {
    const raw = searchParams.get("type");
    return raw === "document" || raw === "activity" || raw === "project" ? raw : null;
  }, [searchParams]);

  const [type, setType] = useState<"document" | "activity" | "project">(presetType ?? "document");
  const [title, setTitle] = useState("");
  const [organizationalUnit, setOrganizationalUnit] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (presetType) {
      setType(presetType);
    }
  }, [presetType]);

  if (profile?.role === "viewer") {
    return (
      <div className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-900">
        No tienes permisos para crear registros.
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    
    setIsSubmitting(true);
    setError(null);

    const selectedType = presetType ?? type;
    
    try {
      let createdId = "";
      if (selectedType === "document") {
        const doc = await createDocument({ title, organizationalUnit, ownerId: profile.id });
        createdId = doc.id;
      } else if (selectedType === "activity") {
        const act = await createActivity({ title, organizationalUnit, ownerId: profile.id });
        createdId = act.id;
      } else if (selectedType === "project") {
        const proj = await createProject({ title, organizationalUnit, ownerId: profile.id });
        createdId = proj.id;
      }
      
      router.push(`/seguimientos/detalle?type=${selectedType}&id=${createdId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear registro.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Link href="/seguimientos" className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--accent)]">
          &larr; Volver
        </Link>
      </div>
      <div className="rounded-[2rem] border border-[var(--line)] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Creacion</p>
        <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-[var(--ink)]">
          {presetType === "document"
            ? "Nuevo Documento"
            : presetType === "activity"
              ? "Nueva Actividad"
              : presetType === "project"
                ? "Nuevo Proyecto"
                : "Nuevo Registro"}
        </h2>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          Selecciona el tipo de registro y proporciona la informacion inicial. El responsable directo sera tu usuario.
        </p>
        
        {error && <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div>}
        
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {!presetType ? (
            <div className="space-y-2">
              <label className="label">Tipo de Registro</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "document" | "activity" | "project")}
                className="field"
                disabled={isSubmitting}
              >
                <option value="document">Documento</option>
                <option value="activity">Actividad Operativa</option>
                <option value="project">Proyecto / Kanban</option>
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="label">Tipo de Registro</label>
              <div className="field flex items-center justify-between">
                <span>
                  {presetType === "document"
                    ? "Documento"
                    : presetType === "activity"
                      ? "Actividad Operativa"
                      : "Proyecto / Kanban"}
                </span>
                <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                  Fijado
                </span>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <label className="label">Titulo descriptivo</label>
            <input
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="field"
              placeholder="Ej. Manual de Procedimientos"
              disabled={isSubmitting}
            />
          </div>
          
          <div className="space-y-2">
            <label className="label">Unidad Organizativa (Opcional)</label>
            <input
              type="text"
              value={organizationalUnit}
              onChange={(e) => setOrganizationalUnit(e.target.value)}
              className="field"
              placeholder="Ej. Departamento de Calidad"
              disabled={isSubmitting}
            />
          </div>
          
          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="action-button disabled:opacity-50"
            >
              {isSubmitting
                ? "Creando..."
                : presetType === "document"
                  ? "Crear documento"
                  : presetType === "activity"
                    ? "Crear actividad"
                    : presetType === "project"
                      ? "Crear proyecto"
                      : "Crear registro"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
