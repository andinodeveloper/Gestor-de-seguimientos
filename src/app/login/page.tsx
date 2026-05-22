"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

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
    <div className="mx-auto grid min-h-screen max-w-[1800px] grid-cols-1 xl:grid-cols-[1.08fr_0.92fr]">
      <section className="relative overflow-hidden bg-[var(--shell)] px-8 py-12 text-white md:px-14 xl:px-20 xl:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(180,255,219,0.18),transparent_30%),linear-gradient(160deg,#121916_0%,#19251f_68%,#121916_100%)]" />
        <div className="relative flex h-full flex-col justify-between gap-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/50">Plataforma interna</p>
            <h1 className="mt-6 max-w-3xl text-[clamp(3rem,7vw,6.5rem)] font-semibold tracking-[-0.08em] leading-[0.92]">
              Registros operativos con responsables directos y control por rol.
            </h1>
            <p className="mt-6 max-w-2xl text-[0.98rem] leading-8 text-white/72">
              Un workspace de seguimiento sobrio y legible para concentrar avance documental, operacion diaria y proyectos tipo kanban con persistencia real.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Usuarios", "Autenticacion por correo con perfiles activos e inactivos."],
              ["Persistencia", "Documentos, actividades y proyectos guardados en base real."],
              ["Exportes", "PPTX y backup ZIP generados desde el estado persistido."],
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
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Acceso</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-[var(--ink)]">Iniciar sesion</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
            Usa tus credenciales para entrar al workspace compartido de registros.
          </p>
          {searchParams.get("blocked") === "1" ? (
            <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Tu usuario no esta activo o no tiene perfil habilitado. Solicita revision a un administrador.
            </p>
          ) : null}
          <div className="mt-8">
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
          <div className="rounded-[2rem] border border-[var(--line)] bg-white px-8 py-10 text-center shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
              Cargando
            </p>
            <p className="mt-4 text-sm text-[var(--muted)]">
              Preparando el acceso al sistema.
            </p>
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
