"use client";

import { startTransition, useEffect, useRef, useState } from "react";

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

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.55fr_0.85fr]">
        <div className="rounded-[2rem] border border-[var(--line)] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Proyecto / Kanban</p>
              <h3 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[var(--ink)]">{data.title}</h3>
            </div>
            <SavePill state={saveState} />
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
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

        <aside className="rounded-[2rem] border border-[var(--line)] bg-[var(--shell)] p-8 text-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/50">Estado General</p>
          <h3 className="mt-4 text-3xl font-semibold tracking-[-0.05em]">
            {data.status === "archived" ? "Archivado" : "Activo"}
          </h3>
          <div className="mt-8 space-y-4 text-sm text-white/70">
            <p>Responsable: {data.owner_id === profile?.id ? "Tu usuario" : "Otro usuario del sistema"}</p>
            <p>Total de tareas: {data.tasks.length}</p>
            <p>Ultima actualizacion: {new Date(data.updated_at).toLocaleDateString()}</p>
          </div>
          <div className="mt-8 grid gap-3">
            {editable ? (
              <button
                type="button"
                onClick={handleToggleStatus}
                className="rounded-full border border-white/[0.14] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white/[0.08] disabled:opacity-60"
              >
                {data.status === "archived" ? "Reactivar" : "Archivar"}
              </button>
            ) : null}
          </div>
        </aside>
      </section>

      <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--surface-2)] p-8 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="grid gap-6 xl:grid-cols-3">
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
                className="rounded-[1.4rem] border border-[var(--line)] bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                    {column.label}
                  </p>
                  <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    {columnTasks.length}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {columnTasks.map((task, taskIndex) => (
                    <div
                      key={task.id}
                      draggable={editable}
                      onDragStart={() => {
                        draggedRef.current = { column: column.key, taskIndex };
                      }}
                      className={cn(
                        "rounded-[1.2rem] border border-[var(--line)] bg-[var(--surface)] p-4",
                        editable ? "cursor-move" : "",
                      )}
                    >
                      <textarea
                        value={task.content}
                        disabled={!editable}
                        onChange={(e) => {
                          setData((current) => ({
                            ...current,
                            tasks: current.tasks.map((currentTask) =>
                              currentTask.id === task.id
                                ? { ...currentTask, content: e.target.value }
                                : currentTask,
                            ),
                          }));
                        }}
                        className="min-h-24 w-full resize-y bg-transparent text-sm leading-6 text-[var(--ink)] outline-none"
                      />
                      {editable ? (
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setData((current) => ({
                                ...current,
                                tasks: current.tasks.filter((currentTask) => currentTask.id !== task.id),
                              }));
                            }}
                            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)] transition hover:text-rose-700"
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
                    className="mt-4 w-full rounded-full border border-dashed border-[var(--line-strong)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)] transition hover:bg-[var(--surface-2)]"
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

  return (
    <span className={cn("rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]", tone)}>
      {label}
    </span>
  );
}
