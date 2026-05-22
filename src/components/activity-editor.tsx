"use client";

import { startTransition, useEffect, useRef, useState } from "react";

import { useAuthContext } from "@/components/auth-provider";
import { ACTIVITY_FREQUENCIES, ACTIVITY_PRIORITIES, ACTIVITY_STATUSES } from "@/lib/constants";
import { canEditOwnedRecord } from "@/lib/domain";
import { updateActivity } from "@/lib/follow-ups";
import type { ActivityFrequency, ActivityPriority, ActivityStatus, ActivityTracking, Role } from "@/lib/types";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "saving" | "saved" | "error";

export function ActivityEditor({
  activity,
  role,
}: {
  activity: ActivityTracking;
  role: Role;
}) {
  const { profile } = useAuthContext();
  const editable = canEditOwnedRecord(role, profile?.id, activity.owner_id);

  const [data, setData] = useState(activity);
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
          const updated = await updateActivity(activity.id, profile.id, data);
          setData(updated);
          setSaveState("saved");
        } catch {
          setSaveState("error");
        }
      });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [data, editable, profile, activity.id]);

  async function handleToggleStatus() {
    if (!editable || !profile) return;
    setSaveState("saving");
    try {
      const nextStatus = data.status === "archived" ? "active" : "archived";
      const updated = await updateActivity(activity.id, profile.id, { ...data, status: nextStatus });
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
              <p className="section-eyebrow">Actividad</p>
              <h2 className="section-title">{data.title}</h2>
              <p className="section-note">Gestiona frecuencia, prioridad, estado operativo y observaciones en un formato mas claro y denso.</p>
            </div>
            <SavePill state={saveState} />
          </div>

          <div className="editor-kpi-grid" style={{ marginTop: "1rem" }}>
            <div className="editor-kpi">
              <span className="editor-kpi-label">Frecuencia</span>
              <strong>{data.frequency}</strong>
            </div>
            <div className="editor-kpi">
              <span className="editor-kpi-label">Prioridad</span>
              <strong>{data.priority}</strong>
            </div>
            <div className="editor-kpi">
              <span className="editor-kpi-label">Estado</span>
              <strong>{data.activity_status}</strong>
            </div>
          </div>

          <div className="editor-form-grid" style={{ marginTop: "1rem" }}>
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
            <Field label="Frecuencia">
              <select
                value={data.frequency}
                onChange={(e) => setData((c) => ({ ...c, frequency: e.target.value as ActivityFrequency }))}
                className="field"
                disabled={!editable}
              >
                {ACTIVITY_FREQUENCIES.map((freq) => (
                  <option key={freq} value={freq}>
                    {freq}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Prioridad">
              <select
                value={data.priority}
                onChange={(e) => setData((c) => ({ ...c, priority: e.target.value as ActivityPriority }))}
                className="field"
                disabled={!editable}
              >
                {ACTIVITY_PRIORITIES.map((prio) => (
                  <option key={prio} value={prio}>
                    {prio}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Estado operativo">
              <select
                value={data.activity_status}
                onChange={(e) => setData((c) => ({ ...c, activity_status: e.target.value as ActivityStatus }))}
                className="field"
                disabled={!editable}
              >
                {ACTIVITY_STATUSES.map((stat) => (
                  <option key={stat} value={stat}>
                    {stat}
                  </option>
                ))}
              </select>
            </Field>
            <div className="meta-tile">
              <strong>{data.status === "archived" ? "Archivado" : "Activo"}</strong>
              <span>Estado general del registro dentro del sistema.</span>
            </div>
          </div>

          <div style={{ marginTop: "1rem" }}>
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

        <aside className="editor-side-card editor-side-card-contrast">
          <p className="section-eyebrow">Seguimiento</p>
          <h3 className="section-title">{data.activity_status}</h3>
          <div className="editor-note-grid" style={{ marginTop: "1rem" }}>
            <div className="meta-tile">
              <strong>{data.owner_id === profile?.id ? "Tu usuario" : "Otro usuario"}</strong>
              <span>Responsable asignado</span>
            </div>
            <div className="meta-tile">
              <strong>{new Date(data.updated_at).toLocaleDateString()}</strong>
              <span>Ultima actualizacion registrada</span>
            </div>
          </div>
          <p className="section-note" style={{ marginTop: "1rem" }}>
            Usa prioridad y estado para diferenciar rapido lo urgente de lo recurrente.
          </p>
          {editable ? (
            <div style={{ marginTop: "1rem" }}>
              <button type="button" onClick={handleToggleStatus} className="ghost-button">
                {data.status === "archived" ? "Reactivar actividad" : "Archivar actividad"}
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
