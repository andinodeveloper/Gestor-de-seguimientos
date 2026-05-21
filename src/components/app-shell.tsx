"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

import { APP_NAME, ROLE_OPTIONS } from "@/lib/constants";
import { isAdminRole } from "@/lib/domain";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/sign-out-button";

const links = [
  { href: "/seguimientos", label: "Seguimientos" },
  { href: "/seguimientos/nuevo", label: "Nuevo" },
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

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--ink)]">
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="relative overflow-hidden border-b border-[var(--line)] bg-[var(--shell)] px-6 py-8 text-white xl:border-b-0 xl:border-r">
          <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top_left,rgba(180,255,219,0.2),transparent_58%)]" />
          <div className="relative flex h-full flex-col">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/50">Operacion</p>
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.06em]">{APP_NAME}</h1>
              <p className="mt-3 max-w-[16rem] text-sm leading-7 text-white/70">
                Plataforma interna para control de documentos, actividades y proyectos con seguimiento persistente.
              </p>
            </div>

            <nav className="mt-10 space-y-2">
              {links.map((link) => {
                const active =
                  link.href === "/seguimientos"
                    ? currentPath === "/seguimientos" || currentPath.startsWith("/seguimientos/detalle")
                    : currentPath.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "block rounded-2xl px-4 py-3 text-sm font-medium transition",
                      active
                        ? "bg-white text-[#102117]"
                        : "text-white/70 hover:bg-white/[0.08] hover:text-white",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
              {isAdminRole(profile.role) ? (
                <Link
                  href="/admin/usuarios"
                  className={cn(
                    "block rounded-2xl px-4 py-3 text-sm font-medium transition",
                    currentPath.startsWith("/admin/usuarios")
                      ? "bg-white text-[var(--shell)]"
                      : "text-white/70 hover:bg-white/[0.08] hover:text-white",
                  )}
                >
                  Usuarios
                </Link>
              ) : null}
            </nav>

            <div className="mt-auto rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">Sesion activa</p>
              <p className="mt-4 text-lg font-semibold">{profile.full_name || profile.email}</p>
              <p className="mt-1 text-sm text-white/60">{profile.email}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="rounded-full border border-white/[0.14] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                  {roleLabel}
                </span>
                <SignOutButton />
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="border-b border-[var(--line)] bg-white/80 px-6 py-5 backdrop-blur">
            <div className="flex items-center justify-between gap-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                  Workspace
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.05em]">
                  {currentPath.startsWith("/admin") ? "Administracion de usuarios" : "Seguimientos compartidos"}
                </h2>
              </div>
              <div className="hidden rounded-full border border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-xs font-medium text-[var(--muted)] md:block">
                Roles: admin, editor y viewer
              </div>
            </div>
          </header>
          <main className="flex-1 px-6 py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
