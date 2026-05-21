import type { SetupState } from "@/lib/types";

export function SetupNotice({ state }: { state: SetupState }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-10">
      <div className="w-full rounded-[2rem] border border-[var(--line)] bg-[var(--panel)] p-10 shadow-[0_30px_80px_rgba(0,0,0,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
          Configuracion pendiente
        </p>
        <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-[-0.05em] text-[var(--ink)]">
          El proyecto ya esta estructurado, pero faltan credenciales de Supabase para ejecutarlo.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
          Completa las variables en <code className="rounded bg-black/5 px-2 py-1">.env.local</code> usando
          como base <code className="rounded bg-black/5 px-2 py-1">.env.example</code>. La aplicacion usa
          autenticacion cliente-side con Supabase y despliegue estatico en GitHub Pages, por lo que solo se
          necesitan las variables publicas para compilar y ejecutar el frontend.
        </p>
        <div className="mt-8 rounded-3xl border border-dashed border-[var(--line-strong)] bg-[var(--surface-2)] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
            Variables faltantes
          </p>
          <ul className="mt-4 space-y-3 text-sm text-[var(--ink)]">
            {state.missing.map((item) => (
              <li key={item} className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3">
                <span>{item}</span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-800">
                  Requerida
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
