"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { useAuthContext } from "@/components/auth-provider";
import { FollowUpList } from "@/components/follow-up-list";
import { listFollowUps, type ListFilters } from "@/lib/follow-ups";
import type { FollowUpListItem } from "@/lib/types";

function FollowUpsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuthContext();
  const [items, setItems] = useState<FollowUpListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const query = searchParams.get("q") ?? "";
  const dateFrom = searchParams.get("from") ?? "";
  const dateTo = searchParams.get("to") ?? "";
  const archivedValue =
    searchParams.get("archived") === "archived" || searchParams.get("archived") === "all"
      ? (searchParams.get("archived") as "archived" | "all")
      : "active";

  const filters: ListFilters = {
    query,
    dateFrom,
    dateTo,
    archived: archivedValue,
  };

  useEffect(() => {
    let ignore = false;

    setIsLoading(true);
    setError(null);

    void listFollowUps({
      query,
      dateFrom,
      dateTo,
      archived: archivedValue,
    })
      .then((nextItems) => {
        if (!ignore) {
          setItems(nextItems);
          setIsLoading(false);
        }
      })
      .catch((loadError) => {
        if (!ignore) {
          setItems([]);
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la lista.");
          setIsLoading(false);
        }
      });
 
    return () => {
      ignore = true;
    };
  }, [archivedValue, dateFrom, dateTo, query]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    const query = String(formData.get("q") ?? "").trim();
    const from = String(formData.get("from") ?? "").trim();
    const to = String(formData.get("to") ?? "").trim();
    const archived = String(formData.get("archived") ?? "active").trim();

    if (query) {
      params.set("q", query);
    }

    if (from) {
      params.set("from", from);
    }

    if (to) {
      params.set("to", to);
    }

    if (archived && archived !== "active") {
      params.set("archived", archived);
    }

    router.replace(`/seguimientos${params.size > 0 ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-[2rem] border border-[var(--line)] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Listado maestro</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-[var(--ink)]">
            Seguimientos activos y archivados
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            Filtra por texto, fecha o estado. Todos los usuarios activos pueden consultar el historial y exportar la informacion.
          </p>
        </div>
        <div className="rounded-[2rem] border border-[var(--line)] bg-[var(--shell)] p-8 text-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/50">Acciones</p>
          <h3 className="mt-4 text-3xl font-semibold tracking-[-0.05em]">
            {profile?.role === "viewer" ? "Consulta disponible" : "Edicion habilitada"}
          </h3>
          <p className="mt-4 text-sm leading-7 text-white/[0.68]">
            {profile?.role === "viewer"
              ? "Puedes abrir cualquier seguimiento y exportar su contenido."
              : "Crea nuevos seguimientos y administra los existentes desde esta misma vista."}
          </p>
          {profile?.role !== "viewer" ? (
            <Link
              href="/seguimientos/nuevo"
              className="mt-8 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--shell)] transition hover:bg-white/90"
            >
              Nuevo seguimiento
            </Link>
          ) : null}
        </div>
      </section>

      <section className="rounded-[2rem] border border-[var(--line)] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-[1.6fr_0.9fr_0.9fr_0.8fr_auto]">
          <input
            className="field"
            name="q"
            defaultValue={filters.query ?? ""}
            placeholder="Buscar por titulo, unidad o responsable"
          />
          <input className="field" type="date" name="from" defaultValue={filters.dateFrom ?? ""} />
          <input className="field" type="date" name="to" defaultValue={filters.dateTo ?? ""} />
          <select className="field" name="archived" defaultValue={filters.archived ?? "active"}>
            <option value="active">Solo activos</option>
            <option value="archived">Solo archivados</option>
            <option value="all">Todos</option>
          </select>
          <button
            type="submit"
            className="rounded-full bg-[var(--accent)] px-5 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[var(--accent-strong)]"
          >
            Filtrar
          </button>
        </form>
      </section>

      {error ? (
        <div className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-[2rem] border border-[var(--line)] bg-white px-8 py-16 text-center shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Cargando</p>
          <p className="mt-4 text-sm text-[var(--muted)]">Consultando seguimientos en Supabase.</p>
        </div>
      ) : (
        <FollowUpList items={items} role={profile?.role ?? "viewer"} />
      )}
    </div>
  );
}

export default function FollowUpsPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-[2rem] border border-[var(--line)] bg-white px-8 py-16 text-center shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Cargando</p>
          <p className="mt-4 text-sm text-[var(--muted)]">Preparando filtros y listado.</p>
        </div>
      }
    >
      <FollowUpsPageContent />
    </Suspense>
  );
}
