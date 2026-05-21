import {
  ACTIVITY_FREQUENCIES,
  ACTIVITY_PRIORITIES,
  ACTIVITY_STATUSES,
  DOCUMENT_STATUS_OPTIONS,
} from "@/lib/constants";
import type {
  ActivityFrequency,
  ActivityPriority,
  ActivityStatus,
  FollowUpActivity,
  FollowUpDocument,
  FollowUpProject,
  ProjectColumnKey,
  ProjectTask,
  Role,
} from "@/lib/types";

export function canEditRole(role: Role) {
  return role === "admin" || role === "editor";
}

export function isAdminRole(role: Role) {
  return role === "admin";
}

export function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeDate(value: unknown) {
  const raw = normalizeString(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : new Date().toISOString().slice(0, 10);
}

export function normalizeDocumentStatus(code: unknown) {
  const match = DOCUMENT_STATUS_OPTIONS.find((item) => item.code === normalizeString(code));
  return match ?? DOCUMENT_STATUS_OPTIONS[0];
}

export function normalizeActivityFrequency(value: unknown): ActivityFrequency {
  const match = ACTIVITY_FREQUENCIES.find((item) => item === value);
  return match ?? "Diaria";
}

export function normalizeActivityPriority(value: unknown): ActivityPriority {
  const match = ACTIVITY_PRIORITIES.find((item) => item === value);
  return match ?? "Media";
}

export function normalizeActivityStatus(value: unknown): ActivityStatus {
  const match = ACTIVITY_STATUSES.find((item) => item === value);
  return match ?? "Pendiente";
}

export function normalizeDocuments(payload: unknown, followUpId: string): FollowUpDocument[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map((item, index) => {
    const status = normalizeDocumentStatus((item as Record<string, unknown>)?.status_code);

    return {
      id: normalizeString((item as Record<string, unknown>)?.id) || crypto.randomUUID(),
      follow_up_id: followUpId,
      name: normalizeString((item as Record<string, unknown>)?.name) || "Nuevo documento",
      status_code: status.code,
      status_label: status.label,
      progress_percent: status.progress,
      notes: normalizeString((item as Record<string, unknown>)?.notes),
      sort_order: index,
    };
  });
}

export function normalizeActivities(payload: unknown, followUpId: string): FollowUpActivity[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map((item, index) => ({
    id: normalizeString((item as Record<string, unknown>)?.id) || crypto.randomUUID(),
    follow_up_id: followUpId,
    name: normalizeString((item as Record<string, unknown>)?.name) || "Nueva actividad",
    frequency: normalizeActivityFrequency((item as Record<string, unknown>)?.frequency),
    priority: normalizeActivityPriority((item as Record<string, unknown>)?.priority),
    status: normalizeActivityStatus((item as Record<string, unknown>)?.status),
    notes: normalizeString((item as Record<string, unknown>)?.notes),
    sort_order: index,
  }));
}

export function normalizeProjects(payload: unknown, followUpId: string): FollowUpProject[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map((project, projectIndex) => {
    const projectId = normalizeString((project as Record<string, unknown>)?.id) || crypto.randomUUID();
    const tasksByColumn = ((project as Record<string, unknown>)?.tasks ?? {}) as Record<
      ProjectColumnKey,
      unknown
    >;

    const tasks: ProjectTask[] = (["todo", "doing", "done"] as ProjectColumnKey[]).flatMap((columnKey) => {
      const columnItems = Array.isArray(tasksByColumn[columnKey]) ? tasksByColumn[columnKey] : [];
      return columnItems.map((task, taskIndex) => ({
        id: normalizeString((task as Record<string, unknown>)?.id) || crypto.randomUUID(),
        project_id: projectId,
        column_key: columnKey,
        content: normalizeString((task as Record<string, unknown>)?.content) || "Nueva tarea",
        sort_order: taskIndex,
      }));
    });

    return {
      id: projectId,
      follow_up_id: followUpId,
      name: normalizeString((project as Record<string, unknown>)?.name) || "Proyecto nuevo",
      sort_order: projectIndex,
      tasks,
    };
  });
}
