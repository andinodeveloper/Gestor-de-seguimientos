"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";

import { useAuthContext } from "@/components/auth-provider";
import { PROJECT_COLUMNS } from "@/lib/constants";
import { canEditOwnedRecord } from "@/lib/domain";
import { updateProject } from "@/lib/follow-ups";
import type { ProjectColumnKey, ProjectTracking, Role } from "@/lib/types";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "saving" | "saved" | "error";

export function ProjectEditor({
  project,
  role,
}: {
  project: ProjectTracking;
  role: Role;
}) {
  const { profile } = useAuthContext();
  const editable = canEditOwnedRecord(role, profile?.id, project.owner_id);

  const [data, setData] = useState(project);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const firstRun = useRef(true);
  const draggedRef = useRef<{ column: ProjectColumnKey; taskIndex: number } | null>(null);

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
          const updated = await updateProject(project.id, profile.id, data);
          if (updated) {
            setData(updated);
            setSaveState("saved");
          }
        } catch {
          setSaveState("error");
        }
      });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [data, editable, profile, project.id]);

  async function handleToggleStatus() {
    if (!editable || !profile) return;
    setSaveState("saving");
    try {
      const nextStatus = data.status === "archived" ? "active" : "archived";
      const updated = await updateProject(project.id, profile.id, { ...data, status: nextStatus });
      if (updated) setData(updated);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  function getTasksByColumn(key: ProjectColumnKey) {
    return data.tasks.filter((task) => task.column_key === key).sort((a, b) => a.sort_order - b.sort_order);
  }

  const progressStats = useMemo(() => {
    const total = data.tasks.length;
    const done = data.tasks.filter((task) => task.column_key === "done").length;
    const doing = data.tasks.filter((task) => task.column_key === "doing").length;
    const progress = total === 0 ? 0 : Math.round((done / total) * 100);

    return { total, done, doing, progress };
  }, [data.tasks]);

  return (
    <div className="page-stack">
      <section className="editor-layout">
        <div className="editor-main-card">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">Proyecto / kanban</p>
              <h2 className="section-title">{data.title}</h2>
              <p className="section-note">Administra el tablero, reordena tareas y conserva una lectura clara del avance del proyecto.</p>
            </div>
            <SavePill state={saveState} />
          </div>

          <div className="editor-kpi-grid" style={{ marginTop: "1rem" }}>
            <div className="editor-kpi">
              <span className="editor-kpi-label">Avance</span>
              <strong>{progressStats.progress}%</strong>
            </div>
            <div className="editor-kpi">
              <span className="editor-kpi-label">En ejecucion</span>
              <strong>{progressStats.doing}</strong>
            </div>
            <div className="editor-kpi">
              <span className="editor-kpi-label">Tareas totales</span>
              <strong>{progressStats.total}</strong>
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
          </div>
        </div>

        <aside className="editor-side-card editor-side-card-contrast">
          <p className="section-eyebrow">Estado general</p>
          <h3 className="section-title">{data.status === "archived" ? "Tablero archivado" : "Tablero activo"}</h3>
          <div className="editor-note-grid" style={{ marginTop: "1rem" }}>
            <div className="meta-tile">
              <strong>{progressStats.done}</strong>
              <span>Tareas finalizadas</span>
            </div>
            <div className="meta-tile">
              <strong>{new Date(data.updated_at).toLocaleDateString()}</strong>
              <span>Ultima actualizacion registrada</span>
            </div>
          </div>
          <p className="section-note" style={{ marginTop: "1rem" }}>
            Arrastra tareas entre columnas para reflejar el estado real del proyecto.
          </p>
          {editable ? (
            <div style={{ marginTop: "1rem" }}>
              <button type="button" onClick={handleToggleStatus} className="ghost-button">
                {data.status === "archived" ? "Reactivar proyecto" : "Archivar proyecto"}
              </button>
            </div>
          ) : null}
        </aside>
      </section>

      <section className="section-panel">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Tablero</p>
            <h3 className="section-title">Flujo por columnas</h3>
            <p className="section-note">La interfaz prioriza lectura rapida, conteo visible y edicion directa del contenido.</p>
          </div>
        </div>

        <div className="editor-board-grid">
          {PROJECT_COLUMNS.map((column) => {
            const columnTasks = getTasksByColumn(column.key);
            return (
              <div
                key={column.key}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  const dragged = draggedRef.current;
                  if (!dragged) return;

                  setData((current) => {
                    const allTasks = [...current.tasks];
                    const originTasks = allTasks
                      .filter((task) => task.column_key === dragged.column)
                      .sort((a, b) => a.sort_order - b.sort_order);
                    const [moved] = originTasks.splice(dragged.taskIndex, 1);

                    if (!moved) return current;

                    const movedTask = { ...moved, column_key: column.key };

                    const destTasks = allTasks
                      .filter((task) => task.column_key === column.key && task.id !== moved.id)
                      .sort((a, b) => a.sort_order - b.sort_order);

                    if (dragged.column !== column.key) {
                      destTasks.push(movedTask);
                    } else {
                      originTasks.push(movedTask);
                    }

                    const newTasks = allTasks
                      .filter((task) => task.column_key !== dragged.column && task.column_key !== column.key)
                      .concat(originTasks.map((task, index) => ({ ...task, sort_order: index })))
                      .concat(
                        dragged.column !== column.key
                          ? destTasks.map((task, index) => ({ ...task, sort_order: index }))
                          : [],
                      );

                    return { ...current, tasks: newTasks };
                  });
                  draggedRef.current = null;
                }}
                className="editor-board-column"
              >
                <div className="editor-board-head">
                  <p className="label">{column.label}</p>
                  <span className="editor-board-count">{columnTasks.length}</span>
                </div>
                <div className="page-stack" style={{ marginTop: "1rem", gap: "0.75rem" }}>
                  {columnTasks.map((task, taskIndex) => (
                    <div
                      key={task.id}
                      draggable={editable}
                      onDragStart={() => {
                        draggedRef.current = { column: column.key, taskIndex };
                      }}
                      className={cn("editor-task-card", editable ? "cursor-move" : "")}
                    >
                      <textarea
                        value={task.content}
                        disabled={!editable}
                        onChange={(e) => {
                          setData((current) => ({
                            ...current,
                            tasks: current.tasks.map((currentTask) =>
                              currentTask.id === task.id ? { ...currentTask, content: e.target.value } : currentTask,
                            ),
                          }));
                        }}
                        className="editor-task-textarea"
                      />
                      {editable ? (
                        <div className="module-footer" style={{ marginTop: "0.75rem" }}>
                          <button
                            type="button"
                            onClick={() => {
                              setData((current) => ({
                                ...current,
                                tasks: current.tasks.filter((currentTask) => currentTask.id !== task.id),
                              }));
                            }}
                            className="text-link"
                          >
                            Eliminar
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
                {editable ? (
                  <button
                    type="button"
                    onClick={() => {
                      setData((current) => ({
                        ...current,
                        tasks: [
                          ...current.tasks,
                          {
                            id: crypto.randomUUID(),
                            project_id: current.id,
                            column_key: column.key,
                            content: "Nueva tarea",
                            sort_order: columnTasks.length,
                          },
                        ],
                      }));
                    }}
                    className="ghost-button"
                    style={{ marginTop: "1rem", width: "100%" }}
                  >
                    Agregar tarea
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
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
