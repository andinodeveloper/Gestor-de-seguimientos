import JSZip from "jszip";

import { DOCUMENT_STATUS_OPTIONS } from "@/lib/constants";
import { normalizeString } from "@/lib/domain";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  ActivityTracking,
  DocumentTracking,
  Profile,
  ProjectTracking,
  Role,
} from "@/lib/types";
import { downloadBlob, downloadFileName } from "@/lib/utils";

export type ListFilters = {
  query?: string;
  archived?: "active" | "archived" | "all";
};

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

  const search = normalizeString(filters.query);
  if (search) {
    query = query.or(`title.ilike.%${search}%,organizational_unit.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

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

  if (error) throw new Error(error.message);
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
  if (error) throw new Error(error.message);
  await recordAuditEvent({ actorId, entityType: "document", entityId: id, action: "updated" });
  return data as DocumentTracking;
}

export async function getDocument(id: string) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.from("documents").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
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

  const search = normalizeString(filters.query);
  if (search) {
    query = query.or(`title.ilike.%${search}%,organizational_unit.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
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

  if (error) throw new Error(error.message);
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
  if (error) throw new Error(error.message);
  await recordAuditEvent({ actorId, entityType: "activity", entityId: id, action: "updated" });
  return data as ActivityTracking;
}

export async function getActivity(id: string) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.from("activities").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
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

  const search = normalizeString(filters.query);
  if (search) {
    query = query.or(`title.ilike.%${search}%,organizational_unit.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

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

  if (error) throw new Error(error.message);
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
    if (error) throw new Error(error.message);
  }

  if (payload.tasks) {
    const { error: deleteError } = await supabase.from("project_tasks").delete().eq("project_id", id);
    if (deleteError) throw new Error(deleteError.message);
    
    if (payload.tasks.length > 0) {
      const taskRows = payload.tasks.map((task, index) => ({
        id: task.id,
        project_id: id,
        column_key: task.column_key,
        content: task.content,
        sort_order: index,
      }));
      const { error: insertError } = await supabase.from("project_tasks").insert(taskRows);
      if (insertError) throw new Error(insertError.message);
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
  
  if (error) throw new Error(error.message);
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

export async function listProfiles() {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
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
