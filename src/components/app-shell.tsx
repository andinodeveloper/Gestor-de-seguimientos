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
  { href: "/dashboard", label: "Dashboard", shortLabel: "D" },
  { href: "/seguimientos", label: "Registros", shortLabel: "R" },
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
          <div className="shell-sidebar-top">
            <button
              type="button"
              onClick={() => setSidebarCollapsed((current) => !current)}
              className="shell-toggle"
              aria-label={sidebarCollapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
              aria-pressed={sidebarCollapsed}
              title={sidebarCollapsed ? "Expandir" : "Colapsar"}
            >
              <span>{sidebarCollapsed ? "»" : "«"}</span>
            </button>
          </div>

          <div className="shell-brand">
            <p className="shell-kicker">Operacion</p>
            <h1 className="shell-title">{sidebarCollapsed ? "GS" : APP_NAME}</h1>
            {!sidebarCollapsed ? <p className="shell-description">Documentos, actividades y kanban.</p> : null}
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
                  title={link.label}
                >
                  <span className="shell-nav-link-mark">{sidebarCollapsed ? link.shortLabel : link.label}</span>
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
                title="Usuarios"
              >
                <span className="shell-nav-link-mark">{sidebarCollapsed ? "U" : "Usuarios"}</span>
              </Link>
            ) : null}
          </nav>

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
            <div>
              <p className="shell-kicker shell-kicker-muted">Workspace</p>
              <h2 className="shell-header-title">{heading}</h2>
            </div>
            <div className="shell-header-meta">
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
