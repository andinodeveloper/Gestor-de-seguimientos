"use client";

import { startTransition, useEffect, useRef, useState } from "react";

import { useAuthContext } from "@/components/auth-provider";
import { DOCUMENT_STATUS_OPTIONS } from "@/lib/constants";
import { canEditOwnedRecord } from "@/lib/domain";
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
  const editable = canEditOwnedRecord(role, profile?.id, document.owner_id);

  const [data, setData] = useState(document);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const firstRun = useRef(true);
  const skipAutosaveRef = useRef(false);
  const latestDataRef = useRef(document);
  const pendingSaveRef = useRef(false);
  const saveInFlightRef = useRef(false);

  useEffect(() => {
    latestDataRef.current = data;
  }, [data]);

  useEffect(() => {
    skipAutosaveRef.current = true;
    latestDataRef.current = document;
    setData(document);
  }, [document]);

  useEffect(() => {
    if (!editable || !profile) return;
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }

    setSaveState((current) => (current === "saving" ? current : "idle"));
    const timer = window.setTimeout(() => {
      startTransition(async () => {
        pendingSaveRef.current = true;
        if (saveInFlightRef.current) {
          return;
        }

        while (pendingSaveRef.current) {
          pendingSaveRef.current = false;
          saveInFlightRef.current = true;

          try {
            setSaveState("saving");
            const snapshot = latestDataRef.current;
            const updated = await updateDocument(document.id, profile.id, snapshot);
            const hasPendingChanges = pendingSaveRef.current || latestDataRef.current !== snapshot;

            if (!hasPendingChanges) {
              skipAutosaveRef.current = true;
              latestDataRef.current = updated;
              setData(updated);
              setSaveState("saved");
            }
          } catch {
            if (!pendingSaveRef.current) {
              setSaveState("error");
            }
          } finally {
            saveInFlightRef.current = false;
          }
        }
      });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [data, editable, profile, document.id]);

  async function handleToggleStatus() {
    if (!editable || !profile) return;
    pendingSaveRef.current = false;
    setSaveState("saving");
    try {
      const nextStatus = data.status === "archived" ? "active" : "archived";
      const updated = await updateDocument(document.id, profile.id, { ...data, status: nextStatus });
      skipAutosaveRef.current = true;
      latestDataRef.current = updated;
      setData(updated);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  return (
    <div className="page-stack">
      <section className="editor-layout">
        <div className="editor-main-card">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">Documento</p>
              <h2 className="section-title">{data.title}</h2>
              <p className="section-note">Actualiza titulo, area, etapa maestra y observaciones desde una sola vista.</p>
            </div>
            <SavePill state={saveState} />
          </div>

          <div className="editor-kpi-grid" style={{ marginTop: "1rem" }}>
            <div className="editor-kpi">
              <span className="editor-kpi-label">Avance</span>
              <strong>{data.progress_percent}%</strong>
            </div>
            <div className="editor-kpi">
              <span className="editor-kpi-label">Codigo de etapa</span>
              <strong>{data.status_code}</strong>
            </div>
            <div className="editor-kpi">
              <span className="editor-kpi-label">Estado</span>
              <strong>{data.status === "archived" ? "Archivado" : "Activo"}</strong>
            </div>
          </div>

          <div className="editor-form-grid" style={{ marginTop: "1rem" }}>
            <Field label="Titulo">
              <input
                value={data.title}
                onChange={(e) => setData((current) => ({ ...current, title: e.target.value }))}
                className="field"
                disabled={!editable}
              />
            </Field>
            <Field label="Unidad organizativa">
              <input
                value={data.organizational_unit}
                onChange={(e) => setData((current) => ({ ...current, organizational_unit: e.target.value }))}
                className="field"
                disabled={!editable}
              />
            </Field>
            <Field label="Estado maestro">
              <select
                value={data.status_code}
                onChange={(e) => setData((current) => ({ ...current, status_code: e.target.value }))}
                className="field"
                disabled={!editable}
              >
                {DOCUMENT_STATUS_OPTIONS.map((status) => (
                  <option key={status.code} value={status.code}>
                    {status.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="meta-tile">
              <strong>{data.status_label}</strong>
              <span>Descripcion actual de la etapa seleccionada.</span>
            </div>
          </div>

          <div style={{ marginTop: "1rem" }}>
            <Field label="Observaciones">
              <textarea
                value={data.notes}
                onChange={(e) => setData((current) => ({ ...current, notes: e.target.value }))}
                className="field min-h-32 resize-y"
                disabled={!editable}
              />
            </Field>
          </div>
        </div>

        <aside className="editor-side-card editor-side-card-contrast">
          <p className="section-eyebrow">Estado general</p>
          <h3 className="section-title">{data.status === "archived" ? "Registro archivado" : "Registro en seguimiento"}</h3>
          <div className="editor-note-grid" style={{ marginTop: "1rem" }}>
            <div className="meta-tile">
              <strong>{data.owner_id === profile?.id ? "Tu usuario" : "Otro usuario"}</strong>
              <span>Responsable directo del registro</span>
            </div>
            <div className="meta-tile">
              <strong>{new Date(data.updated_at).toLocaleDateString()}</strong>
              <span>Ultima actualizacion registrada</span>
            </div>
          </div>
          <p className="section-note" style={{ marginTop: "1rem" }}>
            Los cambios se guardan automaticamente cuando tienes permisos sobre el registro.
          </p>
          {editable ? (
            <div style={{ marginTop: "1rem" }}>
              <button
                type="button"
                onClick={handleToggleStatus}
                className={cn("ghost-button", data.status === "archived" ? "" : "")}
              >
                {data.status === "archived" ? "Reactivar registro" : "Archivar registro"}
              </button>
            </div>
          ) : null}
        </aside>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="page-stack" style={{ gap: "0.5rem" }}>
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

  return (
    <span className={cn("rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]", tone)}>
      {label}
    </span>
  );
}
