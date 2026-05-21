import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-10">
      <div className="w-full rounded-[2rem] border border-[var(--line)] bg-white p-10 text-center shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">404</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-[var(--ink)]">
          El seguimiento solicitado no existe.
        </h1>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          Verifica el enlace o vuelve al listado principal.
        </p>
        <Link
          href="/seguimientos"
          className="mt-8 inline-flex rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[var(--accent-strong)]"
        >
          Volver a seguimientos
        </Link>
      </div>
    </div>
  );
}
