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
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-[var(--line)] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Alta</p>
          <h3 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[var(--ink)]">Crear o invitar usuario</h3>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            Si ingresas contrasena, el usuario queda creado de inmediato. Si la dejas vacia, la app intentara enviar una invitacion con la funcion segura de Supabase.
          </p>
        </div>
        <form onSubmit={handleCreate} className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="label">Correo</label>
            <input
              value={draft.email}
              onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
              className="field"
              type="email"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="label">Nombre completo</label>
            <input
              value={draft.fullName}
              onChange={(event) => setDraft((current) => ({ ...current, fullName: event.target.value }))}
              className="field"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="label">Rol</label>
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
          </div>
          <div className="space-y-2">
            <label className="label">Contrasena temporal</label>
            <input
              value={draft.password}
              onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))}
              className="field"
              placeholder="Opcional"
            />
          </div>
          <div className="flex items-center justify-between gap-4 lg:col-span-2">
            <div className="text-sm text-[var(--muted)]">El rol puede modificarse despues desde la tabla.</div>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[var(--accent-strong)] disabled:opacity-60"
            >
              {isPending ? "Guardando..." : "Crear usuario"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-[2rem] border border-[var(--line)] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Control</p>
            <h3 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[var(--ink)]">Usuarios registrados</h3>
          </div>
          <div className="text-right text-sm text-[var(--muted)]">{profiles.length} usuarios</div>
        </div>

        {message ? <p className="mt-5 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-5 text-sm text-rose-700">{error}</p> : null}

        <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-[var(--line)]">
          <div className="grid grid-cols-[1.3fr_1.2fr_0.8fr_0.7fr_0.9fr] gap-4 border-b border-[var(--line)] bg-[var(--surface-2)] px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
            <span>Usuario</span>
            <span>Nombre</span>
            <span>Rol</span>
            <span>Activo</span>
            <span>Actualizado</span>
          </div>
          <div className="divide-y divide-[var(--line)]">
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
    <div className="grid grid-cols-[1.3fr_1.2fr_0.8fr_0.7fr_0.9fr] gap-4 px-5 py-4">
      <div className="self-center text-sm text-[var(--ink)]">{profile.email}</div>
      <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="field !px-4 !py-3 text-sm" />
      <select value={role} onChange={(event) => setRole(event.target.value as Role)} className="field !px-4 !py-3 text-sm">
        {ROLE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <label className="flex items-center justify-center gap-3 self-center text-sm text-[var(--ink)]">
        <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
        {isActive ? "Si" : "No"}
      </label>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-[var(--muted)]">{formatDateTime(profile.updated_at)}</span>
        <button
          type="button"
          onClick={() => onSave({ full_name: fullName, role, is_active: isActive })}
          className="rounded-full border border-[var(--line)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink)] transition hover:border-[var(--line-strong)] hover:bg-[var(--surface-2)]"
        >
          Guardar
        </button>
      </div>
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
