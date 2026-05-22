"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuthContext } from "@/components/auth-provider";
import { LoginForm } from "@/components/login-form";
import { SetupNotice } from "@/components/setup-notice";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { blocked, isConfigured, loading, profile, session, setup } = useAuthContext();

  useEffect(() => {
    if (!isConfigured || loading) {
      return;
    }

    if (session && profile && !blocked) {
      router.replace("/dashboard");
      return;
    }

    if (session && blocked) {
      void createSupabaseBrowserClient().auth.signOut();
    }
  }, [blocked, isConfigured, loading, profile, router, session]);

  if (!isConfigured) {
    return <SetupNotice state={setup} />;
  }

  return (
    <div className="mx-auto grid min-h-screen max-w-[1880px] grid-cols-1 xl:grid-cols-[1.08fr_0.92fr]">
      <section className="relative overflow-hidden bg-[var(--shell)] px-8 py-12 text-white md:px-14 xl:px-20 xl:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.12),transparent_24%),linear-gradient(160deg,#071224_0%,#0f1b32_68%,#071224_100%)]" />
        <div className="relative flex h-full flex-col justify-between gap-10">
          <div className="page-stack">
            <div>
              <p className="shell-kicker">Plataforma interna</p>
              <h1 className="mt-6 max-w-4xl text-[clamp(3rem,7vw,6.3rem)] font-semibold leading-[0.92] tracking-[-0.08em]">
                Seguimiento operativo con lectura clara, filtros rapidos y control por rol.
              </h1>
              <p className="mt-6 max-w-2xl text-[0.98rem] leading-8 text-white/72">
                Centraliza documentos, actividades y proyectos en un workspace pensado para revisar carga, detectar movimiento y editar sin friccion.
              </p>
            </div>

            <div className="stat-ribbon">
              <div className="stat-pill border-white/10 bg-white/[0.08] text-white">
                <span className="text-white/60">Roles</span>
                <strong>Admin / Editor / Viewer</strong>
              </div>
              <div className="stat-pill border-white/10 bg-white/[0.08] text-white">
                <span className="text-white/60">Modulos</span>
                <strong>3 frentes operativos</strong>
              </div>
              <div className="stat-pill border-white/10 bg-white/[0.08] text-white">
                <span className="text-white/60">Persistencia</span>
                <strong>Supabase</strong>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Trazabilidad", "Cada registro conserva responsable, fecha de actualizacion y estado global."],
              ["Operacion diaria", "El dashboard sintetiza focos, avances y cierres sin sacrificar densidad util."],
              ["Edicion directa", "Los cambios se aplican desde detalle con una estructura mas clara para trabajo continuo."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-[1.35rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur">
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-3 text-sm leading-7 text-white/[0.66]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex items-center px-6 py-12 md:px-12 xl:px-16">
        <div className="w-full rounded-[1.9rem] border border-[var(--line)] bg-[var(--panel)] p-8 shadow-[var(--shadow-strong)] md:p-10">
          <p className="section-eyebrow">Acceso</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-[var(--ink)]">Entrar al workspace</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
            Inicia sesion con tus credenciales para consultar o administrar el seguimiento operativo segun tu rol.
          </p>
          {searchParams.get("blocked") === "1" ? (
            <div className="alert-box alert-box-warning" style={{ marginTop: "1rem" }}>
              Tu usuario no esta activo o no tiene perfil habilitado. Solicita revision a un administrador.
            </div>
          ) : null}
          <div style={{ marginTop: "1.5rem" }}>
            <LoginForm />
          </div>
        </div>
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--surface)] px-6">
          <div className="section-panel text-center">
            <p className="section-eyebrow">Cargando</p>
            <p className="section-note">Preparando el acceso al sistema.</p>
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
