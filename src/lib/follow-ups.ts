import JSZip from "jszip";

import { DOCUMENT_STATUS_OPTIONS } from "@/lib/constants";
import {
  normalizeActivities,
  normalizeDate,
  normalizeDocuments,
  normalizeProjects,
  normalizeString,
} from "@/lib/domain";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  FollowUp,
  FollowUpActivity,
  FollowUpBundle,
  FollowUpDocument,
  FollowUpListItem,
  FollowUpProject,
  Profile,
  ProjectTask,
  Role,
} from "@/lib/types";
import { downloadBlob, downloadFileName } from "@/lib/utils";

export type ListFilters = {
  query?: string;
  dateFrom?: string;
  dateTo?: string;
  archived?: "active" | "archived" | "all";
};

export async function listFollowUps(filters: ListFilters = {}) {
  const supabase = createSupabaseBrowserClient();
  let query = supabase
    .from("follow_ups")
    .select("id,title,organizational_unit,responsible_name,report_date,status,updated_at")
    .order("report_date", { ascending: false })
    .order("updated_at", { ascending: false });

  if (filters.archived === "archived") {
    query = query.eq("status", "archived");
  } else if (filters.archived !== "all") {
    query = query.eq("status", "active");
  }

  const search = normalizeString(filters.query);
  if (search) {
    query = query.or(
      `title.ilike.%${search}%,organizational_unit.ilike.%${search}%,responsible_name.ilike.%${search}%`,
    );
  }

  if (filters.dateFrom) {
    query = query.gte("report_date", filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte("report_date", filters.dateTo);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as FollowUpListItem[];
}

export async function getFollowUpBundle(followUpId: string) {
  const supabase = createSupabaseBrowserClient();
  const [{ data: followUp, error: followUpError }, { data: documents }, { data: activities }, { data: projects }] =
    await Promise.all([
      supabase.from("follow_ups").select("*").eq("id", followUpId).maybeSingle(),
      supabase
        .from("follow_up_documents")
        .select("*")
        .eq("follow_up_id", followUpId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("follow_up_activities")
        .select("*")
        .eq("follow_up_id", followUpId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("follow_up_projects")
        .select("*")
        .eq("follow_up_id", followUpId)
        .order("sort_order", { ascending: true }),
    ]);

  if (followUpError) {
    throw new Error(followUpError.message);
  }

  if (!followUp) {
    return null;
  }

  const projectIds = ((projects ?? []) as Array<{ id: string }>).map((project) => project.id);
  const { data: tasks } =
    projectIds.length > 0
      ? await supabase.from("project_tasks").select("*").in("project_id", projectIds).order("sort_order", { ascending: true })
      : { data: [] };

  return {
    followUp: followUp as FollowUp,
    documents: ((documents ?? []) as FollowUpDocument[]).map((document) => {
      const status = DOCUMENT_STATUS_OPTIONS.find((item) => item.code === document.status_code);
      return {
        ...document,
        status_label: status?.label ?? document.status_label,
        progress_percent: status?.progress ?? document.progress_percent,
      };
    }),
    activities: (activities ?? []) as FollowUpActivity[],
    projects: mapProjects((projects ?? []) as Omit<FollowUpProject, "tasks">[], (tasks ?? []) as ProjectTask[]),
  } satisfies FollowUpBundle;
}

export function buildDefaultFollowUpTitle(date = new Date()) {
  return `Seguimiento ${new Intl.DateTimeFormat("es-SV", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date)}`;
}

export async function createFollowUpRecord(input: {
  title: string;
  organizationalUnit: string;
  responsibleName: string;
  reportDate: string;
  ownerId: string;
}) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("follow_ups")
    .insert({
      title: normalizeString(input.title) || buildDefaultFollowUpTitle(),
      organizational_unit: normalizeString(input.organizationalUnit),
      responsible_name: normalizeString(input.responsibleName),
      report_date: normalizeDate(input.reportDate),
      owner_id: input.ownerId,
      updated_by: input.ownerId,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const followUp = data as FollowUp;
  await recordAuditEvent({
    actorId: input.ownerId,
    entityType: "follow_up",
    entityId: followUp.id,
    action: "created",
    payload: {
      title: followUp.title,
    },
  });

  return followUp;
}

export function serializeFollowUpBundle(bundle: FollowUpBundle) {
  return {
    exportedAt: new Date().toISOString(),
    followUp: bundle.followUp,
    documents: bundle.documents,
    activities: bundle.activities,
    projects: bundle.projects.map((project) => ({
      id: project.id,
      follow_up_id: project.follow_up_id,
      name: project.name,
      sort_order: project.sort_order,
      tasks: {
        todo: project.tasks.filter((task) => task.column_key === "todo"),
        doing: project.tasks.filter((task) => task.column_key === "doing"),
        done: project.tasks.filter((task) => task.column_key === "done"),
      },
    })),
  };
}

export async function updateFollowUpHeader(
  followUpId: string,
  actorId: string,
  input: {
    title: string;
    organizationalUnit: string;
    responsibleName: string;
    reportDate: string;
  },
) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("follow_ups")
    .update({
      title: normalizeString(input.title),
      organizational_unit: normalizeString(input.organizationalUnit),
      responsible_name: normalizeString(input.responsibleName),
      report_date: normalizeDate(input.reportDate),
      updated_by: actorId,
    })
    .eq("id", followUpId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await recordAuditEvent({
    actorId,
    entityType: "follow_up",
    entityId: followUpId,
    action: "header_updated",
  });

  return data as FollowUp;
}

export async function replaceFollowUpDocuments(
  followUpId: string,
  actorId: string,
  payload: unknown,
) {
  const supabase = createSupabaseBrowserClient();
  const documents = normalizeDocuments(payload, followUpId);

  const { error: deleteError } = await supabase
    .from("follow_up_documents")
    .delete()
    .eq("follow_up_id", followUpId);
  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (documents.length > 0) {
    const { error: insertError } = await supabase.from("follow_up_documents").insert(documents);
    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  await touchFollowUp(followUpId, actorId);
  await recordAuditEvent({
    actorId,
    entityType: "follow_up",
    entityId: followUpId,
    action: "documents_updated",
    payload: { count: documents.length },
  });
}

export async function replaceFollowUpActivities(
  followUpId: string,
  actorId: string,
  payload: unknown,
) {
  const supabase = createSupabaseBrowserClient();
  const activities = normalizeActivities(payload, followUpId);

  const { error: deleteError } = await supabase
    .from("follow_up_activities")
    .delete()
    .eq("follow_up_id", followUpId);
  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (activities.length > 0) {
    const { error: insertError } = await supabase.from("follow_up_activities").insert(activities);
    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  await touchFollowUp(followUpId, actorId);
  await recordAuditEvent({
    actorId,
    entityType: "follow_up",
    entityId: followUpId,
    action: "activities_updated",
    payload: { count: activities.length },
  });
}

export async function replaceFollowUpProjects(
  followUpId: string,
  actorId: string,
  payload: unknown,
) {
  const supabase = createSupabaseBrowserClient();
  const projects = normalizeProjects(payload, followUpId);

  const { data: existingProjects, error: existingError } = await supabase
    .from("follow_up_projects")
    .select("id")
    .eq("follow_up_id", followUpId);
  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingProjectIds = ((existingProjects ?? []) as Array<{ id: string }>).map((project) => project.id);
  if (existingProjectIds.length > 0) {
    const { error: deleteTaskError } = await supabase
      .from("project_tasks")
      .delete()
      .in("project_id", existingProjectIds);
    if (deleteTaskError) {
      throw new Error(deleteTaskError.message);
    }
  }

  const { error: deleteProjectError } = await supabase
    .from("follow_up_projects")
    .delete()
    .eq("follow_up_id", followUpId);
  if (deleteProjectError) {
    throw new Error(deleteProjectError.message);
  }

  if (projects.length > 0) {
    const projectRows = projects.map((project) => ({
      id: project.id,
      follow_up_id: project.follow_up_id,
      name: project.name,
      sort_order: project.sort_order,
    }));
    const taskRows = projects.flatMap((project) => project.tasks);

    const { error: insertProjectError } = await supabase.from("follow_up_projects").insert(projectRows);
    if (insertProjectError) {
      throw new Error(insertProjectError.message);
    }

    if (taskRows.length > 0) {
      const { error: insertTaskError } = await supabase.from("project_tasks").insert(taskRows);
      if (insertTaskError) {
        throw new Error(insertTaskError.message);
      }
    }
  }

  await touchFollowUp(followUpId, actorId);
  await recordAuditEvent({
    actorId,
    entityType: "follow_up",
    entityId: followUpId,
    action: "projects_updated",
    payload: { count: projects.length },
  });
}

export async function updateFollowUpStatus(
  followUpId: string,
  actorId: string,
  status: FollowUp["status"],
) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("follow_ups")
    .update({
      status,
      updated_by: actorId,
    })
    .eq("id", followUpId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await recordAuditEvent({
    actorId,
    entityType: "follow_up",
    entityId: followUpId,
    action: status === "archived" ? "archived" : "reactivated",
  });

  return data as FollowUp;
}

export async function downloadFollowUpZip(bundle: FollowUpBundle) {
  const zip = new JSZip();
  zip.file("seguimiento.json", JSON.stringify(serializeFollowUpBundle(bundle), null, 2));
  zip.file(
    "README.txt",
    [
      "Backup de seguimiento",
      `Titulo: ${bundle.followUp.title}`,
      `Fecha: ${bundle.followUp.report_date}`,
      "Este archivo puede utilizarse para restauracion futura o respaldo operacional.",
    ].join("\n"),
  );

  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, downloadFileName(bundle.followUp.title, "zip"));
}

export async function listProfiles() {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

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

  if (error) {
    throw new Error(error.message);
  }

  await recordAuditEvent({
    actorId,
    entityType: "profile",
    entityId: profileId,
    action: "user_updated",
    payload: {
      role: data.role,
      is_active: data.is_active,
    },
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

  if (error) {
    throw new Error(error.message);
  }

  const profile = (data as { profile?: Profile; error?: string } | null)?.profile;
  if (!profile) {
    const message = (data as { error?: string } | null)?.error ?? "No se pudo crear el usuario.";
    throw new Error(message);
  }

  return profile;
}

export function followUpDetailHref(followUpId: string) {
  return `/seguimientos/detalle?id=${encodeURIComponent(followUpId)}`;
}

function mapProjects(projects: Omit<FollowUpProject, "tasks">[], tasks: ProjectTask[]): FollowUpProject[] {
  return projects.map((project) => ({
    ...project,
    tasks: tasks
      .filter((task) => task.project_id === project.id)
      .sort((left, right) => left.sort_order - right.sort_order),
  }));
}

async function touchFollowUp(followUpId: string, actorId: string) {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("follow_ups")
    .update({ updated_by: actorId })
    .eq("id", followUpId);

  if (error) {
    throw new Error(error.message);
  }
}

async function recordAuditEvent(input: {
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

  if (error) {
    throw new Error(error.message);
  }
}
