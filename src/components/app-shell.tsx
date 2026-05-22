"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { SignOutButton } from "@/components/sign-out-button";
import { APP_NAME, ROLE_OPTIONS } from "@/lib/constants";
import { isAdminRole } from "@/lib/domain";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

const links = [
  {
    href: "/dashboard",
    label: "Dashboard",
    shortLabel: "DB",
    note: "Indicadores, actividad reciente y focos operativos.",
  },
  {
    href: "/seguimientos",
    label: "Registros",
    shortLabel: "RG",
    note: "Documentos, actividades y proyectos con filtros rapidos.",
  },
];

const SIDEBAR_STORAGE_KEY = "gs-sidebar-collapsed";

export function AppShell({
  children,
  profile,
}: {
  children: ReactNode;
  profile: Profile;
}) {
  const currentPath = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const roleLabel = ROLE_OPTIONS.find((option) => option.value === profile.role)?.label ?? profile.role;
  const canCreate = profile.role !== "viewer";
  const heading =
    currentPath.startsWith("/admin")
      ? "Usuarios"
      : currentPath.startsWith("/dashboard")
        ? "Dashboard"
        : currentPath.startsWith("/seguimientos/detalle")
          ? "Detalle"
          : currentPath.startsWith("/seguimientos/nuevo")
            ? "Nuevo registro"
            : "Registros";
  const headingSummary =
    currentPath.startsWith("/admin")
      ? "Gestion de accesos, roles, estado activo y altas controladas."
      : currentPath.startsWith("/dashboard")
        ? "Lectura ejecutiva del flujo operativo con foco en avance, actividad y cierres."
        : currentPath.startsWith("/seguimientos/detalle")
          ? "Edicion detallada del registro con persistencia inmediata y control por rol."
          : currentPath.startsWith("/seguimientos/nuevo")
            ? "Alta guiada de registros para iniciar seguimiento sin pasos innecesarios."
            : "Hub unificado para consultar, filtrar y abrir cualquier registro del sistema.";

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored === "1") {
      setSidebarCollapsed(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  return (
    <div className="app-shell-root">
      <div className={cn("app-shell-grid", sidebarCollapsed ? "app-shell-grid-collapsed" : "")}>
        <aside className={cn("shell-sidebar", sidebarCollapsed ? "shell-sidebar-collapsed" : "")}>
          <div className="shell-sidebar-status">
            {!sidebarCollapsed ? <span className="shell-status-pill">Sistema activo</span> : null}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((current) => !current)}
              className="shell-toggle"
              aria-label={sidebarCollapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
              aria-pressed={sidebarCollapsed}
              title={sidebarCollapsed ? "Expandir" : "Colapsar"}
            >
              <span>{sidebarCollapsed ? ">>" : "<<"}</span>
            </button>
          </div>

          <div className="shell-brand">
            <div className="shell-brand-grid">
              <div className="shell-brand-mark" aria-hidden="true">
                GS
              </div>
              {!sidebarCollapsed ? (
                <div className="shell-brand-copy">
                  <p className="shell-kicker">Control operativo</p>
                  <h1 className="shell-title">{APP_NAME}</h1>
                  <p className="shell-description">
                    Seguimiento interno para documentos, operacion recurrente y proyectos tipo kanban.
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <nav className="shell-nav">
            {links.map((link) => {
              const active = currentPath === link.href || currentPath.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn("shell-nav-link", active ? "shell-nav-link-active" : "", sidebarCollapsed ? "shell-nav-link-collapsed" : "")}
                  aria-label={link.label}
                  aria-current={active ? "page" : undefined}
                  title={link.label}
                >
                  <span className="shell-nav-link-mark">{link.shortLabel}</span>
                  {!sidebarCollapsed ? (
                    <span className="shell-nav-copy">
                      <span className="shell-nav-label">{link.label}</span>
                      <span className="shell-nav-note">{link.note}</span>
                    </span>
                  ) : null}
                </Link>
              );
            })}

            {isAdminRole(profile.role) ? (
              <Link
                href="/admin/usuarios"
                className={cn(
                  "shell-nav-link",
                  currentPath.startsWith("/admin/usuarios") ? "shell-nav-link-active" : "",
                  sidebarCollapsed ? "shell-nav-link-collapsed" : "",
                )}
                aria-label="Usuarios"
                aria-current={currentPath.startsWith("/admin/usuarios") ? "page" : undefined}
                title="Usuarios"
              >
                <span className="shell-nav-link-mark">US</span>
                {!sidebarCollapsed ? (
                  <span className="shell-nav-copy">
                    <span className="shell-nav-label">Usuarios</span>
                    <span className="shell-nav-note">Altas, permisos y perfiles activos del workspace.</span>
                  </span>
                ) : null}
              </Link>
            ) : null}
          </nav>

          {!sidebarCollapsed && canCreate ? (
            <Link href="/seguimientos/nuevo" className="shell-quick-link">
              <div className="shell-quick-link-copy">
                <p className="shell-kicker">Accion rapida</p>
                <p className="shell-profile-name">Crear registro</p>
                <p className="shell-description">Alta directa de documento, actividad o proyecto.</p>
              </div>
              <span className="action-button">Nuevo registro</span>
            </Link>
          ) : null}

          <div className={cn("shell-profile", sidebarCollapsed ? "shell-profile-collapsed" : "")}>
            {!sidebarCollapsed ? (
              <>
                <p className="shell-profile-kicker">Sesion</p>
                <div>
                  <p className="shell-profile-name">{profile.full_name || profile.email}</p>
                  <p className="shell-profile-email">{profile.email}</p>
                </div>
              </>
            ) : (
              <div className="shell-profile-avatar" aria-hidden="true">
                {(profile.full_name || profile.email).slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="shell-profile-footer">
              {!sidebarCollapsed ? <span className="shell-role-pill">{roleLabel}</span> : null}
              <SignOutButton compact={sidebarCollapsed} />
            </div>
          </div>
        </aside>

        <div className="shell-main">
          <header className="shell-header">
            <div className="shell-header-stack">
              <p className="shell-kicker shell-kicker-muted">Workspace</p>
              <h2 className="shell-header-title">{heading}</h2>
              <p className="shell-header-summary">{headingSummary}</p>
            </div>
            <div className="shell-header-meta">
              {canCreate ? (
                <Link href="/seguimientos/nuevo" className="mini-button">
                  Nuevo registro
                </Link>
              ) : null}
              <span className="shell-meta-pill">{roleLabel}</span>
            </div>
          </header>

          <main className="shell-content">
            <div className="shell-content-inner">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
