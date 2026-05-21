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
