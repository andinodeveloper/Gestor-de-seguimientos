import type {
  ActivityFrequency,
  ActivityPriority,
  ActivityStatus,
  DocumentStatus,
  ProjectColumnKey,
  Role,
} from "@/lib/types";

export const APP_NAME = "Gestor de Seguimientos";

export const ROLE_OPTIONS: Array<{ value: Role; label: string; note: string }> = [
  { value: "admin", label: "Administrador", note: "Control total sobre contenido y usuarios." },
  { value: "editor", label: "Editor", note: "Puede crear y editar solo los registros que le pertenecen." },
  { value: "viewer", label: "Viewer", note: "Solo puede consultar y exportar informacion." },
];

export const DOCUMENT_STATUS_OPTIONS: DocumentStatus[] = [
  { code: "0.1", label: "0.1. IDENTIFICACION O SOLICITUD FORMAL", progress: 0 },
  { code: "0.2", label: "0.2. REVISION Y VALIDACION DEL REQUERIMIENTO", progress: 4 },
  { code: "0.3", label: "0.3. ASIGNACION A ANALISTA RESPONSABLE", progress: 7 },
  { code: "0.4", label: "0.4. PRIORIZACION Y CALENDARIZACION", progress: 10 },
  { code: "1.1", label: "1.1. CONTACTO INICIAL CON AREA", progress: 13 },
  { code: "1.2", label: "1.2. REVISION NORMATIVA Y DOCUMENTAL", progress: 17 },
  { code: "1.3", label: "1.3. LEVANTAMIENTO DE INFORMACION", progress: 25 },
  { code: "1.4", label: "1.4. ANALISIS Y ESTRUCTURA DOCUMENTAL", progress: 30 },
  { code: "2.1", label: "2.1. CREACION DE ESTRUCTURA BASE", progress: 35 },
  { code: "2.2", label: "2.2. REDACCION DE CONTENIDO PRINCIPAL", progress: 45 },
  { code: "2.3", label: "2.3. REDACCION DE ANEXOS Y TABLAS", progress: 50 },
  { code: "2.4", label: "2.4. REVISION INTERNA DEL ANALISTA", progress: 55 },
  { code: "2.5", label: "2.5. PREVALIDACION CON LIDER", progress: 60 },
  { code: "3.1", label: "3.1. REVISION POR AREAS INVOLUCRADAS", progress: 65 },
  { code: "3.2", label: "3.2. AJUSTES E INCORPORACION DE COMENTARIOS", progress: 70 },
  { code: "3.3", label: "3.3. VALIDACION POR REVISORES FORMALES", progress: 75 },
  { code: "3.4", label: "3.4. VALIDACION POR AREA DE PROCESOS", progress: 80 },
  { code: "4.1", label: "4.1. APROBACION DEL DOCUMENTO", progress: 85 },
  { code: "4.2", label: "4.2. REGISTRO Y CODIFICACION DEFINITIVA", progress: 90 },
  { code: "4.3", label: "4.3. PUBLICACION Y NOTIFICACION OFICIAL", progress: 95 },
  { code: "5.1", label: "5.1. ARCHIVO DEL EXPEDIENTE", progress: 97 },
  { code: "5.2", label: "5.2. ACTUALIZACION DE MATRIZ MAESTRA", progress: 99 },
  { code: "5.3", label: "5.3. CIERRE Y SEGUIMIENTO", progress: 100 },
];

export const ACTIVITY_FREQUENCIES: ActivityFrequency[] = ["Diaria", "Semanal", "Quincenal", "Mensual"];

export const ACTIVITY_PRIORITIES: ActivityPriority[] = ["Baja", "Media", "Alta", "Critica"];

export const ACTIVITY_STATUSES: ActivityStatus[] = ["Pendiente", "En Proceso", "Completado"];

export const PROJECT_COLUMNS: Array<{ key: ProjectColumnKey; label: string; tone: string }> = [
  { key: "todo", label: "Pendientes", tone: "slate" },
  { key: "doing", label: "En ejecucion", tone: "emerald" },
  { key: "done", label: "Finalizados", tone: "stone" },
];
