export type Role = "admin" | "editor" | "viewer";

export type RecordStatus = "active" | "archived";

export type ActivityFrequency = "Diaria" | "Semanal" | "Quincenal" | "Mensual";

export type ActivityPriority = "Baja" | "Media" | "Alta" | "Critica";

export type ActivityStatus = "Pendiente" | "En Proceso" | "Completado";

export type ProjectColumnKey = "todo" | "doing" | "done";

export type RecordKind = "document" | "activity" | "project";

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

export type BaseRecord = {
  id: string;
  title: string;
  organizational_unit: string;
  owner_id: string;
  status: RecordStatus;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
};

export type DocumentTracking = BaseRecord & {
  status_code: string;
  status_label: string;
  progress_percent: number;
  notes: string;
};

export type ActivityTracking = BaseRecord & {
  frequency: ActivityFrequency;
  priority: ActivityPriority;
  activity_status: ActivityStatus;
  notes: string;
};

export type ProjectTracking = BaseRecord & {
  tasks: ProjectTask[];
};

export type ProjectTask = {
  id: string;
  project_id: string;
  column_key: ProjectColumnKey;
  content: string;
  sort_order: number;
};

export type OperationalSnapshot = {
  documents: DocumentTracking[];
  activities: ActivityTracking[];
  projects: ProjectTracking[];
};

export type DashboardMetric = {
  id: string;
  label: string;
  value: number;
  note: string;
};

export type DashboardHighlight = {
  id: string;
  kind: RecordKind;
  title: string;
  owner_id: string;
  organizational_unit: string;
  status: string;
  progress: number;
  updated_at: string;
  href: string;
};

export type DashboardOutcome = {
  id: string;
  label: string;
  value: number;
  note: string;
};

export type DashboardScopeState = {
  mode: "mine" | "global";
  ownerId: string | null;
};

export type DashboardSummary = {
  metrics: DashboardMetric[];
  highlights: DashboardHighlight[];
  outcomes: DashboardOutcome[];
  totals: {
    documents: number;
    activities: number;
    projects: number;
    archived: number;
    recent: number;
  };
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

export type SetupState = {
  isConfigured: boolean;
  missing: string[];
};
