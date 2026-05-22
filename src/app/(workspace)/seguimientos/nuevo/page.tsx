"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuthContext } from "@/components/auth-provider";
import { createActivity, createDocument, createProject } from "@/lib/follow-ups";
import { cn } from "@/lib/utils";

const typeOptions = [
  {
    value: "document" as const,
    title: "Documento",
    note: "Seguimiento por etapa maestra y porcentaje de avance.",
  },
  {
    value: "activity" as const,
    title: "Actividad",
    note: "Operacion recurrente con prioridad, frecuencia y estado.",
  },
  {
    value: "project" as const,
    title: "Proyecto",
    note: "Tablero kanban con tareas y columnas de ejecucion.",
  },
];

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
    return <div className="alert-box alert-box-error">No tienes permisos para crear registros.</div>;
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

  const selectedType = presetType ?? type;
  const selectedLabel = typeOptions.find((option) => option.value === selectedType)?.title ?? "Registro";

  return (
    <div className="page-stack">
      <Link href="/seguimientos" className="back-link">
        Volver al hub
      </Link>

      <div className="creation-grid">
        <section className="section-panel">
          <div>
            <p className="section-eyebrow">Alta guiada</p>
            <h1 className="section-title">Crear un nuevo registro operativo</h1>
            <p className="section-note">
              Define el tipo correcto, agrega el nombre inicial y asigna la unidad correspondiente. El responsable inicial sera tu usuario.
            </p>
          </div>

          {!presetType ? (
            <div className="selection-grid" style={{ marginTop: "1rem" }}>
              {typeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value)}
                  className={cn("selection-card", type === option.value ? "selection-card-active" : "")}
                  aria-pressed={type === option.value}
                >
                  <p className="selection-card-title">{option.title}</p>
                  <p className="selection-card-note">{option.note}</p>
                </button>
              ))}
            </div>
          ) : null}

          {error ? <div className="alert-box alert-box-error" style={{ marginTop: "1rem" }}>{error}</div> : null}

          <form onSubmit={handleSubmit} className="page-stack" style={{ marginTop: "1rem" }}>
            {presetType ? (
              <div className="meta-tile">
                <strong>{selectedLabel}</strong>
                <span>Tipo fijado desde el flujo anterior.</span>
              </div>
            ) : null}

            <div className="editor-form-grid">
              <div className="page-stack">
                <label className="label">Titulo descriptivo</label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="field"
                  placeholder="Ej. Actualizacion del procedimiento de compras"
                  disabled={isSubmitting}
                />
              </div>

              <div className="page-stack">
                <label className="label">Unidad organizativa</label>
                <input
                  type="text"
                  value={organizationalUnit}
                  onChange={(e) => setOrganizationalUnit(e.target.value)}
                  className="field"
                  placeholder="Ej. Departamento de Calidad"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="module-footer">
              <button type="submit" disabled={isSubmitting || !title.trim()} className="action-button disabled:opacity-50">
                {isSubmitting ? "Creando..." : `Crear ${selectedLabel.toLowerCase()}`}
              </button>
            </div>
          </form>
        </section>

        <aside className="editor-side-card editor-side-card-contrast">
          <p className="section-eyebrow">Parametros iniciales</p>
          <div className="editor-note-grid" style={{ marginTop: "1rem" }}>
            <div className="editor-kpi">
              <span className="editor-kpi-label">Tipo</span>
              <strong>{selectedLabel}</strong>
            </div>
            <div className="editor-kpi">
              <span className="editor-kpi-label">Responsable</span>
              <strong>{profile?.full_name || profile?.email || "Tu usuario"}</strong>
            </div>
            <div className="editor-kpi">
              <span className="editor-kpi-label">Estado inicial</span>
              <strong>Activo</strong>
            </div>
          </div>
          <p className="section-note" style={{ marginTop: "1rem" }}>
            Despues de crear el registro podras completar notas, cambiar estados y profundizar el seguimiento desde la vista de detalle.
          </p>
        </aside>
      </div>
    </div>
  );
}
