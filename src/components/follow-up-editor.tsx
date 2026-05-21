"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";

import { useAuthContext } from "@/components/auth-provider";
import {
  ACTIVITY_FREQUENCIES,
  ACTIVITY_PRIORITIES,
  ACTIVITY_STATUSES,
  DOCUMENT_STATUS_OPTIONS,
  PROJECT_COLUMNS,
} from "@/lib/constants";
import { canEditRole } from "@/lib/domain";
import {
  downloadFollowUpZip,
  replaceFollowUpActivities,
  replaceFollowUpDocuments,
  replaceFollowUpProjects,
  updateFollowUpHeader,
  updateFollowUpStatus,
} from "@/lib/follow-ups";
import { downloadFollowUpPresentation } from "@/lib/pptx";
import type {
  FollowUp,
  FollowUpActivity,
  FollowUpBundle,
  FollowUpDocument,
  FollowUpProject,
  ProjectColumnKey,
  Role,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type DraftProject = {
  id: string;
  name: string;
  tasks: Record<ProjectColumnKey, Array<{ id: string; content: string }>>;
};

type SaveState = "idle" | "saving" | "saved" | "error";

export function FollowUpEditor({
  initialBundle,
  role,
}: {
  initialBundle: FollowUpBundle;
  role: Role;
}) {
  const { profile } = useAuthContext();
  const editable = canEditRole(role);
  const [followUp, setFollowUp] = useState(initialBundle.followUp);
  const [meta, setMeta] = useState({
    title: initialBundle.followUp.title,
    organizationalUnit: initialBundle.followUp.organizational_unit,
    responsibleName: initialBundle.followUp.responsible_name,
    reportDate: initialBundle.followUp.report_date,
  });
  const [documents, setDocuments] = useState(initialBundle.documents);
  const [activities, setActivities] = useState(initialBundle.activities);
  const [projects, setProjects] = useState(() => toDraftProjects(initialBundle.projects));
  const [archivePending, setArchivePending] = useState(false);
  const [pptxPending, setPptxPending] = useState(false);
  const [zipPending, setZipPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const headerState = useAutosave(meta, editable, async (payload) => {
    if (!profile) {
      throw new Error("No hay perfil activo.");
    }

    const updated = await updateFollowUpHeader(initialBundle.followUp.id, profile.id, payload);
    setFollowUp(updated);
  });

  const documentsState = useAutosave(documents, editable, async (payload) => {
    if (!profile) {
      throw new Error("No hay perfil activo.");
    }

    await replaceFollowUpDocuments(initialBundle.followUp.id, profile.id, payload);
  });

  const activitiesState = useAutosave(activities, editable, async (payload) => {
    if (!profile) {
      throw new Error("No hay perfil activo.");
    }

    await replaceFollowUpActivities(initialBundle.followUp.id, profile.id, payload);
  });

  const projectsState = useAutosave(projects, editable, async (payload) => {
    if (!profile) {
      throw new Error("No hay perfil activo.");
    }

    await replaceFollowUpProjects(initialBundle.followUp.id, profile.id, payload);
  });

  const projectSummary = useMemo(
    () =>
      projects.reduce(
        (sum, project) =>
          sum + PROJECT_COLUMNS.reduce((acc, column) => acc + project.tasks[column.key].length, 0),
        0,
      ),
    [projects],
  );

  async function handleArchive() {
    if (!editable || !profile) {
      return;
    }

    setArchivePending(true);
    setActionError(null);

    try {
      const nextStatus = followUp.status === "archived" ? "active" : "archived";
      const updated = await updateFollowUpStatus(initialBundle.followUp.id, profile.id, nextStatus);
      setFollowUp(updated);
    } catch (archiveError) {
      setActionError(archiveError instanceof Error ? archiveError.message : "No se pudo actualizar el estado.");
    } finally {
      setArchivePending(false);
    }
  }

  async function handleExportPptx() {
    setPptxPending(true);
    setActionError(null);

    try {
      await downloadFollowUpPresentation(buildBundle(followUp, documents, activities, projects));
    } catch (exportError) {
      setActionError(exportError instanceof Error ? exportError.message : "No se pudo generar el PPTX.");
    } finally {
      setPptxPending(false);
    }
  }

  async function handleExportZip() {
    setZipPending(true);
    setActionError(null);

    try {
      await downloadFollowUpZip(buildBundle(followUp, documents, activities, projects));
    } catch (exportError) {
      setActionError(exportError instanceof Error ? exportError.message : "No se pudo generar el ZIP.");
    } finally {
      setZipPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.55fr_0.85fr]">
        <div className="rounded-[2rem] border border-[var(--line)] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Cabecera</p>
              <h3 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[var(--ink)]">{meta.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                La informacion general se guarda automaticamente. La fecha define el corte del reporte y el responsable visible forma parte del seguimiento.
              </p>
            </div>
            <SavePill state={headerState} />
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <Field label="Titulo">
              <input
                value={meta.title}
                onChange={(event) => setMeta((current) => ({ ...current, title: event.target.value }))}
                className="field"
                disabled={!editable}
              />
            </Field>
            <Field label="Unidad organizativa">
              <input
                value={meta.organizationalUnit}
                onChange={(event) =>
                  setMeta((current) => ({ ...current, organizationalUnit: event.target.value }))
                }
                className="field"
                disabled={!editable}
              />
            </Field>
            <Field label="Responsable visible">
              <input
                value={meta.responsibleName}
                onChange={(event) =>
                  setMeta((current) => ({ ...current, responsibleName: event.target.value }))
                }
                className="field"
                disabled={!editable}
              />
            </Field>
            <Field label="Fecha de reporte">
              <input
                type="date"
                value={meta.reportDate}
                onChange={(event) => setMeta((current) => ({ ...current, reportDate: event.target.value }))}
                className="field"
                disabled={!editable}
              />
            </Field>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-[var(--line)] bg-[var(--shell)] p-8 text-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/50">Estado</p>
          <h3 className="mt-4 text-3xl font-semibold tracking-[-0.05em]">
            {followUp.status === "archived" ? "Archivado" : "Activo"}
          </h3>
          <div className="mt-8 space-y-4 text-sm text-white/70">
            <p>{documents.length} documentos con progreso maestro</p>
            <p>{activities.length} actividades operativas</p>
            <p>{projects.length} tableros y {projectSummary} tareas</p>
          </div>
          <div className="mt-8 grid gap-3">
            <button
              type="button"
              onClick={handleExportPptx}
              disabled={pptxPending}
              className="rounded-full bg-white px-5 py-3 text-center text-sm font-semibold uppercase tracking-[0.18em] text-[var(--shell)] transition hover:bg-white/90 disabled:opacity-60"
            >
              {pptxPending ? "Generando PPTX..." : "Exportar PPTX"}
            </button>
            <button
              type="button"
              onClick={handleExportZip}
              disabled={zipPending}
              className="rounded-full border border-white/[0.14] px-5 py-3 text-center text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white/[0.08] disabled:opacity-60"
            >
              {zipPending ? "Generando ZIP..." : "Backup ZIP"}
            </button>
            {editable ? (
              <button
                type="button"
                onClick={handleArchive}
                disabled={archivePending}
                className="rounded-full border border-white/[0.14] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white/[0.08] disabled:opacity-60"
              >
                {archivePending
                  ? "Actualizando..."
                  : followUp.status === "archived"
                    ? "Reactivar"
                    : "Archivar"}
              </button>
            ) : null}
          </div>
          {actionError ? <p className="mt-4 text-sm text-rose-200">{actionError}</p> : null}
        </aside>
      </section>

      <EditableDocumentsSection
        editable={editable}
        documents={documents}
        onChange={setDocuments}
        saveState={documentsState}
      />
      <EditableActivitiesSection
        editable={editable}
        activities={activities}
        onChange={setActivities}
        saveState={activitiesState}
      />
      <ProjectsSection editable={editable} projects={projects} onChange={setProjects} saveState={projectsState} />
    </div>
  );
}

function EditableDocumentsSection({
  documents,
  editable,
  onChange,
  saveState,
}: {
  documents: FollowUpDocument[];
  editable: boolean;
  onChange: React.Dispatch<React.SetStateAction<FollowUpDocument[]>>;
  saveState: SaveState;
}) {
  return (
    <section className="rounded-[2rem] border border-[var(--line)] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <SectionHeader
        title="Estado de elaboracion de documentos"
        description="El avance se calcula automaticamente a partir del estatus maestro."
        saveState={saveState}
        action={
          editable ? (
            <button
              type="button"
              onClick={() =>
                onChange((current) => [
                  ...current,
                  {
                    id: crypto.randomUUID(),
                    follow_up_id: "",
                    name: "Nuevo documento",
                    status_code: DOCUMENT_STATUS_OPTIONS[0].code,
                    status_label: DOCUMENT_STATUS_OPTIONS[0].label,
                    progress_percent: DOCUMENT_STATUS_OPTIONS[0].progress,
                    notes: "",
                    sort_order: current.length,
                  },
                ])
              }
              className="action-button"
            >
              Agregar documento
            </button>
          ) : null
        }
      />
      <div className="mt-8 space-y-4">
        {documents.map((document, index) => (
          <div key={document.id} className="grid gap-4 rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-2)] p-5 lg:grid-cols-[1.7fr_1.4fr_0.9fr_1.8fr_auto]">
            <input
              value={document.name}
              disabled={!editable}
              onChange={(event) =>
                onChange((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, name: event.target.value } : item,
                  ),
                )
              }
              className="field"
            />
            <select
              value={document.status_code}
              disabled={!editable}
              onChange={(event) =>
                onChange((current) =>
                  current.map((item, itemIndex) => {
                    if (itemIndex !== index) {
                      return item;
                    }
                    const status =
                      DOCUMENT_STATUS_OPTIONS.find((entry) => entry.code === event.target.value) ??
                      DOCUMENT_STATUS_OPTIONS[0];
                    return {
                      ...item,
                      status_code: status.code,
                      status_label: status.label,
                      progress_percent: status.progress,
                    };
                  }),
                )
              }
              className="field"
            >
              {DOCUMENT_STATUS_OPTIONS.map((status) => (
                <option key={status.code} value={status.code}>
                  {status.label}
                </option>
              ))}
            </select>
            <div className="rounded-[1.25rem] border border-[var(--line)] bg-white px-4 py-4 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Avance</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--ink)]">{document.progress_percent}%</p>
            </div>
            <textarea
              value={document.notes}
              disabled={!editable}
              onChange={(event) =>
                onChange((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, notes: event.target.value } : item,
                  ),
                )
              }
              className="field min-h-28 resize-y"
              placeholder="Observaciones"
            />
            {editable ? (
              <button
                type="button"
                onClick={() => onChange((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                className="rounded-full border border-[var(--line)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)] transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
              >
                Quitar
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function EditableActivitiesSection({
  activities,
  editable,
  onChange,
  saveState,
}: {
  activities: FollowUpActivity[];
  editable: boolean;
  onChange: React.Dispatch<React.SetStateAction<FollowUpActivity[]>>;
  saveState: SaveState;
}) {
  return (
    <section className="rounded-[2rem] border border-[var(--line)] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <SectionHeader
        title="Matriz de actividades operativas"
        description="Prioridad y estado quedan persistidos para todo el equipo."
        saveState={saveState}
        action={
          editable ? (
            <button
              type="button"
              onClick={() =>
                onChange((current) => [
                  ...current,
                  {
                    id: crypto.randomUUID(),
                    follow_up_id: "",
                    name: "Nueva actividad",
                    frequency: "Diaria",
                    priority: "Media",
                    status: "Pendiente",
                    notes: "",
                    sort_order: current.length,
                  },
                ])
              }
              className="action-button"
            >
              Agregar actividad
            </button>
          ) : null
        }
      />
      <div className="mt-8 space-y-4">
        {activities.map((activity, index) => (
          <div key={activity.id} className="grid gap-4 rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-2)] p-5 lg:grid-cols-[1.5fr_0.8fr_0.8fr_0.9fr_1.7fr_auto]">
            <input
              value={activity.name}
              disabled={!editable}
              onChange={(event) =>
                onChange((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, name: event.target.value } : item,
                  ),
                )
              }
              className="field"
            />
            <select
              value={activity.frequency}
              disabled={!editable}
              onChange={(event) =>
                onChange((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, frequency: event.target.value as FollowUpActivity["frequency"] }
                      : item,
                  ),
                )
              }
              className="field"
            >
              {ACTIVITY_FREQUENCIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              value={activity.priority}
              disabled={!editable}
              onChange={(event) =>
                onChange((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, priority: event.target.value as FollowUpActivity["priority"] }
                      : item,
                  ),
                )
              }
              className="field"
            >
              {ACTIVITY_PRIORITIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              value={activity.status}
              disabled={!editable}
              onChange={(event) =>
                onChange((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, status: event.target.value as FollowUpActivity["status"] }
                      : item,
                  ),
                )
              }
              className="field"
            >
              {ACTIVITY_STATUSES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <textarea
              value={activity.notes}
              disabled={!editable}
              onChange={(event) =>
                onChange((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, notes: event.target.value } : item,
                  ),
                )
              }
              className="field min-h-28 resize-y"
            />
            {editable ? (
              <button
                type="button"
                onClick={() => onChange((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                className="rounded-full border border-[var(--line)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)] transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
              >
                Quitar
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function ProjectsSection({
  editable,
  projects,
  onChange,
  saveState,
}: {
  editable: boolean;
  projects: DraftProject[];
  onChange: React.Dispatch<React.SetStateAction<DraftProject[]>>;
  saveState: SaveState;
}) {
  const draggedRef = useRef<{
    projectId: string;
    column: ProjectColumnKey;
    taskIndex: number;
  } | null>(null);

  return (
    <section className="rounded-[2rem] border border-[var(--line)] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <SectionHeader
        title="Tableros de proyecto"
        description="Cada proyecto conserva tareas por columna con reordenamiento por arrastre."
        saveState={saveState}
        action={
          editable ? (
            <button
              type="button"
              onClick={() =>
                onChange((current) => [
                  ...current,
                  {
                    id: crypto.randomUUID(),
                    name: "Proyecto nuevo",
                    tasks: {
                      todo: [],
                      doing: [],
                      done: [],
                    },
                  },
                ])
              }
              className="action-button"
            >
              Agregar proyecto
            </button>
          ) : null
        }
      />

      <div className="mt-8 space-y-6">
        {projects.map((project) => (
          <div key={project.id} className="rounded-[1.7rem] border border-[var(--line)] bg-[var(--surface-2)] p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <input
                value={project.name}
                disabled={!editable}
                onChange={(event) =>
                  onChange((current) =>
                    current.map((item) => (item.id === project.id ? { ...item, name: event.target.value } : item)),
                  )
                }
                className="field max-w-xl"
              />
              {editable ? (
                <button
                  type="button"
                  onClick={() => onChange((current) => current.filter((item) => item.id !== project.id))}
                  className="rounded-full border border-[var(--line)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)] transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                >
                  Quitar proyecto
                </button>
              ) : null}
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-3">
              {PROJECT_COLUMNS.map((column) => (
                <div
                  key={column.key}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    const dragged = draggedRef.current;
                    if (!dragged || dragged.projectId !== project.id) {
                      return;
                    }

                    onChange((current) =>
                      current.map((item) => {
                        if (item.id !== project.id) {
                          return item;
                        }

                        const originTasks = [...item.tasks[dragged.column]];
                        const [moved] = originTasks.splice(dragged.taskIndex, 1);
                        const destinationTasks =
                          dragged.column === column.key
                            ? [...originTasks, moved]
                            : [...item.tasks[column.key], moved];

                        return {
                          ...item,
                          tasks: {
                            ...item.tasks,
                            [dragged.column]: dragged.column === column.key ? destinationTasks : originTasks,
                            [column.key]: destinationTasks,
                          },
                        };
                      }),
                    );
                    draggedRef.current = null;
                  }}
                  className="rounded-[1.4rem] border border-[var(--line)] bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                      {column.label}
                    </p>
                    <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      {project.tasks[column.key].length}
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {project.tasks[column.key].map((task, taskIndex) => (
                      <div
                        key={task.id}
                        draggable={editable}
                        onDragStart={() => {
                          draggedRef.current = { projectId: project.id, column: column.key, taskIndex };
                        }}
                        className={cn(
                          "rounded-[1.2rem] border border-[var(--line)] bg-[var(--surface)] p-4",
                          editable ? "cursor-move" : "",
                        )}
                      >
                        <textarea
                          value={task.content}
                          disabled={!editable}
                          onChange={(event) =>
                            onChange((current) =>
                              current.map((item) =>
                                item.id === project.id
                                  ? {
                                      ...item,
                                      tasks: {
                                        ...item.tasks,
                                        [column.key]: item.tasks[column.key].map((columnTask, columnIndex) =>
                                          columnIndex === taskIndex
                                            ? { ...columnTask, content: event.target.value }
                                            : columnTask,
                                        ),
                                      },
                                    }
                                  : item,
                              ),
                            )
                          }
                          className="min-h-24 w-full resize-y bg-transparent text-sm leading-6 text-[var(--ink)] outline-none"
                        />
                        {editable ? (
                          <div className="mt-3 flex justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                onChange((current) =>
                                  current.map((item) =>
                                    item.id === project.id
                                      ? {
                                          ...item,
                                          tasks: {
                                            ...item.tasks,
                                            [column.key]: item.tasks[column.key].filter(
                                              (_, columnIndex) => columnIndex !== taskIndex,
                                            ),
                                          },
                                        }
                                      : item,
                                  ),
                                )
                              }
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
                      onClick={() =>
                        onChange((current) =>
                          current.map((item) =>
                            item.id === project.id
                              ? {
                                  ...item,
                                  tasks: {
                                    ...item.tasks,
                                    [column.key]: [
                                      ...item.tasks[column.key],
                                      { id: crypto.randomUUID(), content: "Nueva tarea" },
                                    ],
                                  },
                                }
                              : item,
                          ),
                        )
                      }
                      className="mt-4 w-full rounded-full border border-dashed border-[var(--line-strong)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)] transition hover:bg-[var(--surface-2)]"
                    >
                      Agregar tarea
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
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

function SectionHeader({
  title,
  description,
  saveState,
  action,
}: {
  title: string;
  description: string;
  saveState: SaveState;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-6">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Modulo</p>
        <h3 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[var(--ink)]">{title}</h3>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        <SavePill state={saveState} />
        {action}
      </div>
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

function useAutosave<T>(value: T, enabled: boolean, onSave: (payload: T) => Promise<void>) {
  const [state, setState] = useState<SaveState>("idle");
  const firstRun = useRef(true);
  const saveRef = useRef<(payload: T) => Promise<void>>(async () => {});

  saveRef.current = async (payload: T) => {
    try {
      setState("saving");
      await onSave(payload);
      setState("saved");
    } catch {
      setState("error");
    }
  };

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (firstRun.current) {
      firstRun.current = false;
      return;
    }

    setState((current) => (current === "saving" ? current : "idle"));
    const timer = window.setTimeout(() => {
      startTransition(() => {
        void saveRef.current(value);
      });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [enabled, value]);

  return state;
}

function toDraftProjects(projects: FollowUpProject[]): DraftProject[] {
  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    tasks: {
      todo: project.tasks
        .filter((task) => task.column_key === "todo")
        .map((task) => ({ id: task.id, content: task.content })),
      doing: project.tasks
        .filter((task) => task.column_key === "doing")
        .map((task) => ({ id: task.id, content: task.content })),
      done: project.tasks
        .filter((task) => task.column_key === "done")
        .map((task) => ({ id: task.id, content: task.content })),
    },
  }));
}

function buildBundle(
  followUp: FollowUp,
  documents: FollowUpDocument[],
  activities: FollowUpActivity[],
  projects: DraftProject[],
): FollowUpBundle {
  return {
    followUp,
    documents: documents.map((document, index) => ({
      ...document,
      follow_up_id: followUp.id,
      sort_order: index,
    })),
    activities: activities.map((activity, index) => ({
      ...activity,
      follow_up_id: followUp.id,
      sort_order: index,
    })),
    projects: projects.map((project, projectIndex) => ({
      id: project.id,
      follow_up_id: followUp.id,
      name: project.name,
      sort_order: projectIndex,
      tasks: PROJECT_COLUMNS.flatMap((column) =>
        project.tasks[column.key].map((task, taskIndex) => ({
          id: task.id,
          project_id: project.id,
          column_key: column.key,
          content: task.content,
          sort_order: taskIndex,
        })),
      ),
    })),
  };
}
