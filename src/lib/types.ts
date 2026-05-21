export type Role = "admin" | "editor" | "viewer";

export type FollowUpStatus = "active" | "archived";

export type ActivityFrequency = "Diaria" | "Semanal" | "Quincenal" | "Mensual";

export type ActivityPriority = "Baja" | "Media" | "Alta" | "Critica";

export type ActivityStatus = "Pendiente" | "En Proceso" | "Completado";

export type ProjectColumnKey = "todo" | "doing" | "done";

export type DocumentStatus = {
  code: string;
  label: string;
  progress: number;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type FollowUp = {
  id: string;
  title: string;
  organizational_unit: string;
  responsible_name: string;
  report_date: string;
  owner_id: string;
  status: FollowUpStatus;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
};

export type FollowUpDocument = {
  id: string;
  follow_up_id: string;
  name: string;
  status_code: string;
  status_label: string;
  progress_percent: number;
  notes: string;
  sort_order: number;
};

export type FollowUpActivity = {
  id: string;
  follow_up_id: string;
  name: string;
  frequency: ActivityFrequency;
  priority: ActivityPriority;
  status: ActivityStatus;
  notes: string;
  sort_order: number;
};

export type FollowUpProject = {
  id: string;
  follow_up_id: string;
  name: string;
  sort_order: number;
  tasks: ProjectTask[];
};

export type ProjectTask = {
  id: string;
  project_id: string;
  column_key: ProjectColumnKey;
  content: string;
  sort_order: number;
};

export type AuditEvent = {
  id: string;
  actor_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  payload_json: Record<string, unknown> | null;
  created_at: string;
};

export type FollowUpBundle = {
  followUp: FollowUp;
  documents: FollowUpDocument[];
  activities: FollowUpActivity[];
  projects: FollowUpProject[];
};

export type FollowUpListItem = Pick<
  FollowUp,
  "id" | "title" | "organizational_unit" | "responsible_name" | "report_date" | "status" | "updated_at"
>;

export type SetupState = {
  isConfigured: boolean;
  missing: string[];
};
