"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

import { SignOutButton } from "@/components/sign-out-button";
import { APP_NAME, ROLE_OPTIONS } from "@/lib/constants";
import { isAdminRole } from "@/lib/domain";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/seguimientos", label: "Registros" },
];

export function AppShell({
  children,
  profile,
}: {
  children: ReactNode;
  profile: Profile;
}) {
  const currentPath = usePathname();
  const roleLabel = ROLE_OPTIONS.find((option) => option.value === profile.role)?.label ?? profile.role;
  const heading =
    currentPath.startsWith("/admin")
      ? "Administracion de usuarios"
      : currentPath.startsWith("/dashboard")
        ? "Dashboard operativo"
        : currentPath.startsWith("/seguimientos/detalle")
          ? "Detalle de registro"
          : currentPath.startsWith("/seguimientos/nuevo")
            ? "Alta independiente"
            : "Registros operativos";

  return (
    <div className="app-shell-root">
      <div className="app-shell-grid">
        <aside className="shell-sidebar">
          <div className="shell-brand">
            <p className="shell-kicker">Operacion</p>
            <h1 className="shell-title">{APP_NAME}</h1>
            <p className="shell-description">
              Workspace sobrio para coordinar documentos, actividades y kanban sin perder densidad operativa.
            </p>
          </div>

          <nav className="shell-nav">
            {links.map((link) => {
              const active = currentPath === link.href || currentPath.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn("shell-nav-link", active ? "shell-nav-link-active" : "")}
                >
                  {link.label}
                </Link>
              );
            })}

            {isAdminRole(profile.role) ? (
              <Link
                href="/admin/usuarios"
                className={cn(
                  "shell-nav-link",
                  currentPath.startsWith("/admin/usuarios") ? "shell-nav-link-active" : "",
                )}
              >
                Usuarios
              </Link>
            ) : null}
          </nav>

          <div className="shell-profile">
            <p className="shell-profile-kicker">Sesion activa</p>
            <div>
              <p className="shell-profile-name">{profile.full_name || profile.email}</p>
              <p className="shell-profile-email">{profile.email}</p>
            </div>
            <div className="shell-profile-footer">
              <span className="shell-role-pill">{roleLabel}</span>
              <SignOutButton />
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
              <span className="shell-meta-pill">Roles: admin, editor y viewer</span>
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
