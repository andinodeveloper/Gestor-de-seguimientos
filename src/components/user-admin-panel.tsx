"use client";

import { startTransition, useState } from "react";

import { useAuthContext } from "@/components/auth-provider";
import { ROLE_OPTIONS } from "@/lib/constants";
import { createManagedUser, updateProfile } from "@/lib/follow-ups";
import type { Profile, Role } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

type NewUserState = {
  email: string;
  fullName: string;
  role: Role;
  password: string;
};

export function UserAdminPanel({ initialProfiles }: { initialProfiles: Profile[] }) {
  const { profile } = useAuthContext();
  const [profiles, setProfiles] = useState(initialProfiles);
  const [draft, setDraft] = useState<NewUserState>({
    email: "",
    fullName: "",
    role: "viewer",
    password: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) {
      return;
    }

    setIsPending(true);
    setMessage(null);
    setError(null);

    try {
      const nextProfile = await createManagedUser({
        email: draft.email,
        fullName: draft.fullName,
        role: draft.role,
        password: draft.password || undefined,
        redirectTo: buildLoginRedirectUrl(),
      });

      setProfiles((current) => [nextProfile, ...current]);
      setDraft({
        email: "",
        fullName: "",
        role: "viewer",
        password: "",
      });
      setMessage("Usuario creado correctamente.");
      setIsPending(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear el usuario.");
      setIsPending(false);
    }
  }

  async function persistProfile(id: string, changes: Partial<Profile>) {
    if (!profile) {
      return;
    }

    setMessage(null);
    setError(null);

    try {
      const updated = await updateProfile(id, profile.id, {
        full_name: changes.full_name,
        role: changes.role,
        is_active: changes.is_active,
      });
      setProfiles((current) => current.map((entry) => (entry.id === id ? updated : entry)));
      setMessage("Usuario actualizado.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo actualizar el usuario.");
    }
  }

  return (
    <div className="page-stack">
      <section className="creation-grid">
        <div className="section-panel">
          <div>
            <p className="section-eyebrow">Alta</p>
            <h3 className="section-title">Crear o invitar usuario</h3>
            <p className="section-note">
              Si defines contrasena, el usuario queda creado de inmediato. Si la dejas vacia, la app intentara enviar una invitacion segura.
            </p>
          </div>
          <form onSubmit={handleCreate} className="page-stack" style={{ marginTop: "1rem" }}>
            <div className="editor-form-grid">
              <Field label="Correo">
                <input
                  value={draft.email}
                  onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
                  className="field"
                  type="email"
                  required
                />
              </Field>
              <Field label="Nombre completo">
                <input
                  value={draft.fullName}
                  onChange={(event) => setDraft((current) => ({ ...current, fullName: event.target.value }))}
                  className="field"
                  required
                />
              </Field>
              <Field label="Rol">
                <select
                  value={draft.role}
                  onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value as Role }))}
                  className="field"
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Contrasena temporal">
                <input
                  value={draft.password}
                  onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))}
                  className="field"
                  placeholder="Opcional"
                />
              </Field>
            </div>
            <div className="module-footer">
              <button type="submit" disabled={isPending} className="action-button disabled:opacity-60">
                {isPending ? "Guardando..." : "Crear usuario"}
              </button>
            </div>
          </form>
        </div>

        <aside className="editor-side-card editor-side-card-contrast">
          <p className="section-eyebrow">Roles</p>
          <div className="editor-note-grid" style={{ marginTop: "1rem" }}>
            {ROLE_OPTIONS.map((option) => (
              <div key={option.value} className="meta-tile">
                <strong>{option.label}</strong>
                <span>{option.note}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>

      {message ? <div className="alert-box alert-box-success">{message}</div> : null}
      {error ? <div className="alert-box alert-box-error">{error}</div> : null}

      <section className="section-panel">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Control</p>
            <h3 className="section-title">Usuarios registrados</h3>
          </div>
          <div className="module-meta">
            <span>{profiles.length} usuarios</span>
          </div>
        </div>

        <div className="table-shell" style={{ marginTop: "1rem", overflowX: "auto" }}>
          <div className="table-header">
            <span>Usuario</span>
            <span>Nombre</span>
            <span>Rol</span>
            <span>Activo</span>
            <span>Actualizado</span>
          </div>
          <div>
            {profiles.map((entry) => (
              <EditableUserRow
                key={entry.id}
                profile={entry}
                onSave={(changes) => {
                  startTransition(() => {
                    void persistProfile(entry.id, changes);
                  });
                }}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function EditableUserRow({
  profile,
  onSave,
}: {
  profile: Profile;
  onSave: (changes: Partial<Profile>) => void;
}) {
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [role, setRole] = useState<Role>(profile.role);
  const [isActive, setIsActive] = useState(profile.is_active);

  return (
    <div className="table-row">
      <div className="text-sm text-[var(--ink)]">{profile.email}</div>
      <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="field field-compact text-sm" />
      <select value={role} onChange={(event) => setRole(event.target.value as Role)} className="field field-compact text-sm">
        {ROLE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <label className="status-inline self-center text-sm text-[var(--ink)]">
        <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
        {isActive ? "Si" : "No"}
      </label>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-[var(--muted)]">{formatDateTime(profile.updated_at)}</span>
        <button type="button" onClick={() => onSave({ full_name: fullName, role, is_active: isActive })} className="ghost-button">
          Guardar
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="page-stack" style={{ gap: "0.5rem" }}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function buildLoginRedirectUrl() {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.pathname = url.pathname.replace(/\/admin\/usuarios\/?$/, "/login/");
  return url.toString();
}
