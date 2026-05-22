import JSZip from "jszip";

import { DOCUMENT_STATUS_OPTIONS } from "@/lib/constants";
import { normalizeString } from "@/lib/domain";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  ActivityTracking,
  DashboardHighlight,
  DashboardSummary,
  DocumentTracking,
  OperationalSnapshot,
  Profile,
  ProjectTracking,
  Role,
} from "@/lib/types";
import { downloadBlob, downloadFileName } from "@/lib/utils";

export type ListFilters = {
  query?: string;
  archived?: "active" | "archived" | "all";
  ownerId?: string;
};

export type ProfileFilters = {
  query?: string;
  roles?: Role[];
  activeOnly?: boolean;
  ids?: string[];
};

function getSupabaseErrorMessage(message: string) {
  if (
    message.includes("schema cache") &&
    (message.includes("public.documents") ||
      message.includes("public.activities") ||
      message.includes("public.projects") ||
      message.includes("public.project_tasks"))
  ) {
    return "El proyecto Supabase actual no tiene cargado el esquema operativo esperado. Ejecuta la migracion o el schema.sql actualizado.";
  }

  return message;
}

// -- DOCUMENTS --

export async function listDocuments(filters: ListFilters = {}) {
  const supabase = createSupabaseBrowserClient();
  let query = supabase
    .from("documents")
    .select("*")
    .order("updated_at", { ascending: false });

  if (filters.archived === "archived") {
    query = query.eq("status", "archived");
  } else if (filters.archived !== "all") {
    query = query.eq("status", "active");
  }

  if (filters.ownerId) {
    query = query.eq("owner_id", filters.ownerId);
  }

  const search = normalizeString(filters.query);
  if (search) {
    query = query.or(`title.ilike.%${search}%,organizational_unit.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(getSupabaseErrorMessage(error.message));

  return (data ?? []).map((doc: DocumentTracking) => {
    const status = DOCUMENT_STATUS_OPTIONS.find((item) => item.code === doc.status_code);
    return {
      ...doc,
      status_label: status?.label ?? doc.status_label,
      progress_percent: status?.progress ?? doc.progress_percent,
    };
  }) as DocumentTracking[];
}

export async function createDocument(input: {
  title: string;
  organizationalUnit: string;
  ownerId: string;
}) {
  const supabase = createSupabaseBrowserClient();
  const defaultStatus = DOCUMENT_STATUS_OPTIONS[0];
  const { data, error } = await supabase
    .from("documents")
    .insert({
      title: normalizeString(input.title) || "Nuevo Documento",
      organizational_unit: normalizeString(input.organizationalUnit),
      owner_id: input.ownerId,
      updated_by: input.ownerId,
      status_code: defaultStatus.code,
      status_label: defaultStatus.label,
      progress_percent: defaultStatus.progress,
    })
    .select("*")
    .single();

  if (error) throw new Error(getSupabaseErrorMessage(error.message));
  await recordAuditEvent({ actorId: input.ownerId, entityType: "document", entityId: data.id, action: "created" });
  return data as DocumentTracking;
}

export async function updateDocument(id: string, actorId: string, payload: Partial<DocumentTracking>) {
  const supabase = createSupabaseBrowserClient();
  const updates = { updated_by: actorId } as Record<string, unknown>;
  
  if (payload.title !== undefined) updates.title = normalizeString(payload.title);
  if (payload.organizational_unit !== undefined) updates.organizational_unit = normalizeString(payload.organizational_unit);
  if (payload.status !== undefined) updates.status = payload.status;
  if (payload.status_code !== undefined) {
    const statusOpt = DOCUMENT_STATUS_OPTIONS.find((item) => item.code === payload.status_code);
    updates.status_code = payload.status_code;
    if (statusOpt) {
      updates.status_label = statusOpt.label;
      updates.progress_percent = statusOpt.progress;
    }
  }
  if (payload.notes !== undefined) updates.notes = payload.notes;

  const { data, error } = await supabase.from("documents").update(updates).eq("id", id).select("*").single();
  if (error) throw new Error(getSupabaseErrorMessage(error.message));
  await recordAuditEvent({ actorId, entityType: "document", entityId: id, action: "updated" });
  return data as DocumentTracking;
}

export async function getDocument(id: string) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.from("documents").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(getSupabaseErrorMessage(error.message));
  if (!data) return null;
  const status = DOCUMENT_STATUS_OPTIONS.find((item) => item.code === data.status_code);
  return {
    ...data,
    status_label: status?.label ?? data.status_label,
    progress_percent: status?.progress ?? data.progress_percent,
  } as DocumentTracking;
}

// -- ACTIVITIES --

export async function listActivities(filters: ListFilters = {}) {
  const supabase = createSupabaseBrowserClient();
  let query = supabase
    .from("activities")
    .select("*")
    .order("updated_at", { ascending: false });

  if (filters.archived === "archived") {
    query = query.eq("status", "archived");
  } else if (filters.archived !== "all") {
    query = query.eq("status", "active");
  }

  if (filters.ownerId) {
    query = query.eq("owner_id", filters.ownerId);
  }

  const search = normalizeString(filters.query);
  if (search) {
    query = query.or(`title.ilike.%${search}%,organizational_unit.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(getSupabaseErrorMessage(error.message));
  return (data ?? []) as ActivityTracking[];
}

export async function createActivity(input: {
  title: string;
  organizationalUnit: string;
  ownerId: string;
}) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("activities")
    .insert({
      title: normalizeString(input.title) || "Nueva Actividad",
      organizational_unit: normalizeString(input.organizationalUnit),
      owner_id: input.ownerId,
      updated_by: input.ownerId,
      frequency: "Diaria",
      priority: "Media",
      activity_status: "Pendiente",
    })
    .select("*")
    .single();

  if (error) throw new Error(getSupabaseErrorMessage(error.message));
  await recordAuditEvent({ actorId: input.ownerId, entityType: "activity", entityId: data.id, action: "created" });
  return data as ActivityTracking;
}

export async function updateActivity(id: string, actorId: string, payload: Partial<ActivityTracking>) {
  const supabase = createSupabaseBrowserClient();
  const updates = { updated_by: actorId } as Record<string, unknown>;
  
  if (payload.title !== undefined) updates.title = normalizeString(payload.title);
  if (payload.organizational_unit !== undefined) updates.organizational_unit = normalizeString(payload.organizational_unit);
  if (payload.status !== undefined) updates.status = payload.status;
  if (payload.frequency !== undefined) updates.frequency = payload.frequency;
  if (payload.priority !== undefined) updates.priority = payload.priority;
  if (payload.activity_status !== undefined) updates.activity_status = payload.activity_status;
  if (payload.notes !== undefined) updates.notes = payload.notes;

  const { data, error } = await supabase.from("activities").update(updates).eq("id", id).select("*").single();
  if (error) throw new Error(getSupabaseErrorMessage(error.message));
  await recordAuditEvent({ actorId, entityType: "activity", entityId: id, action: "updated" });
  return data as ActivityTracking;
}

export async function getActivity(id: string) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.from("activities").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(getSupabaseErrorMessage(error.message));
  return data as ActivityTracking | null;
}

// -- PROJECTS --

export async function listProjects(filters: ListFilters = {}) {
  const supabase = createSupabaseBrowserClient();
  let query = supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });

  if (filters.archived === "archived") {
    query = query.eq("status", "archived");
  } else if (filters.archived !== "all") {
    query = query.eq("status", "active");
  }

  if (filters.ownerId) {
    query = query.eq("owner_id", filters.ownerId);
  }

  const search = normalizeString(filters.query);
  if (search) {
    query = query.or(`title.ilike.%${search}%,organizational_unit.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(getSupabaseErrorMessage(error.message));

  const projects = data ?? [];
  if (projects.length === 0) return [];

  const projectIds = projects.map((p: ProjectTracking) => p.id);
  const { data: tasks } = await supabase
    .from("project_tasks")
    .select("*")
    .in("project_id", projectIds)
    .order("sort_order", { ascending: true });

  return projects.map((project: ProjectTracking) => ({
    ...project,
    tasks: (tasks ?? []).filter((t: { project_id: string }) => t.project_id === project.id),
  })) as ProjectTracking[];
}

export async function createProject(input: {
  title: string;
  organizationalUnit: string;
  ownerId: string;
}) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      title: normalizeString(input.title) || "Nuevo Proyecto",
      organizational_unit: normalizeString(input.organizationalUnit),
      owner_id: input.ownerId,
      updated_by: input.ownerId,
    })
    .select("*")
    .single();

  if (error) throw new Error(getSupabaseErrorMessage(error.message));
  await recordAuditEvent({ actorId: input.ownerId, entityType: "project", entityId: data.id, action: "created" });
  return { ...data, tasks: [] } as ProjectTracking;
}

export async function updateProject(id: string, actorId: string, payload: Partial<ProjectTracking>) {
  const supabase = createSupabaseBrowserClient();
  
  if (payload.title !== undefined || payload.organizational_unit !== undefined || payload.status !== undefined) {
    const updates = { updated_by: actorId } as Record<string, unknown>;
    if (payload.title !== undefined) updates.title = normalizeString(payload.title);
    if (payload.organizational_unit !== undefined) updates.organizational_unit = normalizeString(payload.organizational_unit);
    if (payload.status !== undefined) updates.status = payload.status;
    
    const { error } = await supabase.from("projects").update(updates).eq("id", id);
    if (error) throw new Error(getSupabaseErrorMessage(error.message));
  }

  if (payload.tasks) {
    const { error: deleteError } = await supabase.from("project_tasks").delete().eq("project_id", id);
    if (deleteError) throw new Error(getSupabaseErrorMessage(deleteError.message));
    
    if (payload.tasks.length > 0) {
      const taskRows = payload.tasks.map((task, index) => ({
        id: task.id,
        project_id: id,
        column_key: task.column_key,
        content: task.content,
        sort_order: index,
      }));
      const { error: insertError } = await supabase.from("project_tasks").insert(taskRows);
      if (insertError) throw new Error(getSupabaseErrorMessage(insertError.message));
    }
  }

  await recordAuditEvent({ actorId, entityType: "project", entityId: id, action: "updated" });
  return getProject(id);
}

export async function getProject(id: string) {
  const supabase = createSupabaseBrowserClient();
  const [{ data: project, error }, { data: tasks }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).maybeSingle(),
    supabase.from("project_tasks").select("*").eq("project_id", id).order("sort_order", { ascending: true }),
  ]);
  
  if (error) throw new Error(getSupabaseErrorMessage(error.message));
  if (!project) return null;
  
  return {
    ...project,
    tasks: tasks ?? [],
  } as ProjectTracking;
}

// -- ZIP EXPORT (Simplified for singular records) --

export async function downloadRecordZip(record: { title: string }, type: string) {
  const zip = new JSZip();
  zip.file(`${type}.json`, JSON.stringify(record, null, 2));
  zip.file(
    "README.txt",
    [
      `Backup de ${type}`,
      `Titulo: ${record.title}`,
      "Este archivo puede utilizarse para respaldo operacional.",
    ].join("\n"),
  );

  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, downloadFileName(record.title, "zip"));
}

// -- PROFILES & UTILS --

export async function listProfiles(filters: ProfileFilters = {}) {
  const supabase = createSupabaseBrowserClient();
  let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });

  if (filters.activeOnly) {
    query = query.eq("is_active", true);
  }

  if (filters.ids && filters.ids.length > 0) {
    query = query.in("id", filters.ids);
  }

  if (filters.roles && filters.roles.length === 1) {
    query = query.eq("role", filters.roles[0]);
  } else if (filters.roles && filters.roles.length > 1) {
    query = query.in("role", filters.roles);
  }

  const search = normalizeString(filters.query);
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) throw new Error(getSupabaseErrorMessage(error.message));
  return (data ?? []) as Profile[];
}

export async function updateProfile(
  profileId: string,
  actorId: string,
  changes: Partial<Pick<Profile, "full_name" | "role" | "is_active">>,
) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: changes.full_name ?? null,
      role: changes.role as Role | undefined,
      is_active: changes.is_active ?? true,
    })
    .eq("id", profileId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  await recordAuditEvent({
    actorId,
    entityType: "profile",
    entityId: profileId,
    action: "user_updated",
    payload: { role: data.role, is_active: data.is_active },
  });

  return data as Profile;
}

export async function createManagedUser(input: {
  email: string;
  fullName: string;
  role: Role;
  password?: string;
  redirectTo?: string;
}) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.functions.invoke("admin-users", {
    body: input,
  });

  if (error) throw new Error(error.message);

  const profile = (data as { profile?: Profile; error?: string } | null)?.profile;
  if (!profile) {
    const message = (data as { error?: string } | null)?.error ?? "No se pudo crear el usuario.";
    throw new Error(message);
  }
  return profile;
}

export async function recordAuditEvent(input: {
  actorId: string;
  entityType: string;
  entityId: string;
  action: string;
  payload?: Record<string, unknown>;
}) {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("audit_events").insert({
    actor_id: input.actorId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    action: input.action,
    payload_json: input.payload ?? null,
  });
  if (error) throw new Error(error.message);
}

export function getProjectProgress(project: ProjectTracking) {
  const total = project.tasks.length;
  const done = project.tasks.filter((task) => task.column_key === "done").length;
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);

  return {
    done,
    total,
    progress,
  };
}

export async function getOperationalSnapshot(filters: Pick<ListFilters, "ownerId"> = {}) {
  const [documents, activities, projects] = await Promise.all([
    listDocuments({ archived: "all", ownerId: filters.ownerId }),
    listActivities({ archived: "all", ownerId: filters.ownerId }),
    listProjects({ archived: "all", ownerId: filters.ownerId }),
  ]);

  return {
    documents,
    activities,
    projects,
  } satisfies OperationalSnapshot;
}

export function buildDashboardSummary(snapshot: OperationalSnapshot) {
  const recentThreshold = Date.now() - 1000 * 60 * 60 * 24 * 7;
  const allRecords = [...snapshot.documents, ...snapshot.activities, ...snapshot.projects];

  const documentsActive = snapshot.documents.filter((item) => item.status === "active").length;
  const activitiesActive = snapshot.activities.filter((item) => item.status === "active").length;
  const projectsActive = snapshot.projects.filter((item) => item.status === "active").length;
  const archived = allRecords.filter((item) => item.status === "archived").length;
  const recent = allRecords.filter((item) => new Date(item.updated_at).getTime() >= recentThreshold).length;

  const metrics = [
    { id: "documents", label: "Documentos activos", value: documentsActive, note: "Control documental vigente" },
    { id: "activities", label: "Actividades activas", value: activitiesActive, note: "Operacion en seguimiento" },
    { id: "projects", label: "Proyectos activos", value: projectsActive, note: "Kanban con movimiento" },
    { id: "archived", label: "Archivados", value: archived, note: "Registros cerrados o pausados" },
    { id: "recent", label: "Actualizados esta semana", value: recent, note: "Movimiento reciente del sistema" },
  ];

  const documentHighlights = [...snapshot.documents]
    .sort((a, b) => getDocumentHighlightScore(b, recentThreshold) - getDocumentHighlightScore(a, recentThreshold))
    .slice(0, 2)
    .map((document) => ({
      id: document.id,
      kind: "document" as const,
      title: document.title,
      owner_id: document.owner_id,
      organizational_unit: document.organizational_unit,
      status: document.status_label,
      progress: document.progress_percent,
      updated_at: document.updated_at,
      href: `/seguimientos/detalle?type=document&id=${document.id}`,
    }));

  const activityHighlights = [...snapshot.activities]
    .sort((a, b) => getActivityHighlightScore(b, recentThreshold) - getActivityHighlightScore(a, recentThreshold))
    .slice(0, 2)
    .map((activity) => ({
      id: activity.id,
      kind: "activity" as const,
      title: activity.title,
      owner_id: activity.owner_id,
      organizational_unit: activity.organizational_unit,
      status: activity.activity_status,
      progress: getActivityProgress(activity.activity_status),
      updated_at: activity.updated_at,
      href: `/seguimientos/detalle?type=activity&id=${activity.id}`,
    }));

  const projectHighlights = [...snapshot.projects]
    .sort((a, b) => getProjectHighlightScore(b, recentThreshold) - getProjectHighlightScore(a, recentThreshold))
    .slice(0, 2)
    .map((project) => {
      const { done, total, progress } = getProjectProgress(project);
      return {
        id: project.id,
        kind: "project" as const,
        title: project.title,
        owner_id: project.owner_id,
        organizational_unit: project.organizational_unit,
        status: total === 0 ? "Sin tareas" : `${done}/${total} tareas cerradas`,
        progress,
        updated_at: project.updated_at,
        href: `/seguimientos/detalle?type=project&id=${project.id}`,
      };
    });

  const highlights = [...documentHighlights, ...activityHighlights, ...projectHighlights]
    .sort((a, b) => b.progress - a.progress || Date.parse(b.updated_at) - Date.parse(a.updated_at))
    .slice(0, 6) satisfies DashboardHighlight[];

  const outcomes = [
    {
      id: "documents-high-progress",
      label: "Documentos con avance alto",
      value: snapshot.documents.filter((item) => item.progress_percent >= 85).length,
      note: "Registros documentales en fase avanzada o de cierre",
    },
    {
      id: "activities-completed",
      label: "Actividades completadas",
      value: snapshot.activities.filter((item) => item.activity_status === "Completado").length,
      note: "Actividades operativas finalizadas",
    },
    {
      id: "projects-complete",
      label: "Proyectos con todas las tareas cerradas",
      value: snapshot.projects.filter((item) => {
        const { done, total } = getProjectProgress(item);
        return total > 0 && done === total;
      }).length,
      note: "Tableros sin pendientes abiertos",
    },
  ];

  return {
    metrics,
    highlights,
    outcomes,
    totals: {
      documents: snapshot.documents.length,
      activities: snapshot.activities.length,
      projects: snapshot.projects.length,
      archived,
      recent,
    },
  } satisfies DashboardSummary;
}

function getDocumentHighlightScore(document: DocumentTracking, recentThreshold: number) {
  return document.progress_percent + (new Date(document.updated_at).getTime() >= recentThreshold ? 12 : 0);
}

function getActivityHighlightScore(activity: ActivityTracking, recentThreshold: number) {
  return getActivityProgress(activity.activity_status) + (new Date(activity.updated_at).getTime() >= recentThreshold ? 12 : 0);
}

function getProjectHighlightScore(project: ProjectTracking, recentThreshold: number) {
  return getProjectProgress(project).progress + (new Date(project.updated_at).getTime() >= recentThreshold ? 12 : 0);
}

function getActivityProgress(status: ActivityTracking["activity_status"]) {
  if (status === "Completado") return 100;
  if (status === "En Proceso") return 58;
  return 18;
}
