"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { useAuthContext } from "@/components/auth-provider";
import {
  listDocuments,
  listActivities,
  listProjects,
  type ListFilters,
} from "@/lib/follow-ups";
import type { ActivityTracking, DocumentTracking, ProjectTracking } from "@/lib/types";
import { cn } from "@/lib/utils";

type TabKey = "documents" | "activities" | "projects";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuthContext();
  
  const currentTab = (searchParams.get("tab") as TabKey) || "documents";
  const query = searchParams.get("q") ?? "";
  const archivedValue =
    searchParams.get("archived") === "archived" || searchParams.get("archived") === "all"
      ? (searchParams.get("archived") as "archived" | "all")
      : "active";

  const [documents, setDocuments] = useState<DocumentTracking[]>([]);
  const [activities, setActivities] = useState<ActivityTracking[]>([]);
  const [projects, setProjects] = useState<ProjectTracking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const filters: ListFilters = {
    query,
    archived: archivedValue,
  };

  useEffect(() => {
    let ignore = false;
    setIsLoading(true);
    setError(null);

    const fetchCurrentTab = async () => {
      try {
        if (currentTab === "documents") {
          const res = await listDocuments(filters);
          if (!ignore) setDocuments(res);
        } else if (currentTab === "activities") {
          const res = await listActivities(filters);
          if (!ignore) setActivities(res);
        } else if (currentTab === "projects") {
          const res = await listProjects(filters);
          if (!ignore) setProjects(res);
        }
        if (!ignore) setIsLoading(false);
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Error al cargar la lista.");
          setIsLoading(false);
        }
      }
    };

    void fetchCurrentTab();

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab, query, archivedValue]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    params.set("tab", currentTab);
    
    const q = String(formData.get("q") ?? "").trim();
    const archived = String(formData.get("archived") ?? "active").trim();

    if (q) params.set("q", q);
    if (archived && archived !== "active") params.set("archived", archived);

    router.replace(`/seguimientos?${params.toString()}`);
  }

  function handleTabChange(tab: TabKey) {
    const params = new URLSearchParams();
    params.set("tab", tab);
    if (query) params.set("q", query);
    if (archivedValue !== "active") params.set("archived", archivedValue);
    router.push(`/seguimientos?${params.toString()}`);
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-[2rem] border border-[var(--line)] bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">Listado maestro</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-[var(--ink)]">
            Registros Operativos
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            Gestiona documentos, actividades y proyectos de forma independiente.
          </p>
        </div>
        <div className="rounded-[2rem] border border-[var(--line)] bg-[var(--shell)] p-8 text-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/50">Acciones</p>
          <h3 className="mt-4 text-3xl font-semibold tracking-[-0.05em]">
            {profile?.role === "viewer" ? "Consulta disponible" : profile?.role === "admin" ? "Control global" : "Edicion por responsable"}
          </h3>
          <p className="mt-4 text-sm leading-7 text-white/[0.68]">
            {profile?.role === "viewer"
              ? "Puedes abrir cualquier registro y consultar su contenido."
              : profile?.role === "admin"
                ? "Puedes crear registros y editar cualquier documento, actividad o proyecto del sistema."
                : "Puedes crear registros y editar solo aquellos de los que eres responsable directo."}
          </p>
          {profile?.role !== "viewer" ? (
            <Link
              href="/seguimientos/nuevo"
              className="mt-8 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#102117] transition hover:bg-white/90"
            >
              Nuevo registro
            </Link>
          ) : null}
        </div>
      </section>

      <section className="rounded-[2rem] border border-[var(--line)] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="mb-6 flex space-x-2 border-b border-[var(--line)] pb-4">
          <button
            onClick={() => handleTabChange("documents")}
            className={cn("px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] transition-colors rounded-full", currentTab === "documents" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:bg-[var(--surface-2)]")}
          >
            Documentos
          </button>
          <button
            onClick={() => handleTabChange("activities")}
            className={cn("px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] transition-colors rounded-full", currentTab === "activities" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:bg-[var(--surface-2)]")}
          >
            Actividades
          </button>
          <button
            onClick={() => handleTabChange("projects")}
            className={cn("px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] transition-colors rounded-full", currentTab === "projects" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:bg-[var(--surface-2)]")}
          >
            Proyectos
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-[1.6fr_0.9fr_auto]">
          <input
            className="field"
            name="q"
            defaultValue={filters.query ?? ""}
            placeholder="Buscar por titulo o unidad"
          />
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
          <p className="mt-4 text-sm text-[var(--muted)]">Consultando registros...</p>
        </div>
      ) : (
        <div className="rounded-[2rem] border border-[var(--line)] bg-white overflow-hidden shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--surface)] text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">
              <tr>
                <th className="px-6 py-4 font-semibold">Titulo</th>
                <th className="px-6 py-4 font-semibold">Unidad</th>
                <th className="px-6 py-4 font-semibold">Estado</th>
                <th className="px-6 py-4 font-semibold text-right">Accion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {currentTab === "documents" && documents.map((doc) => (
                <tr key={doc.id} className="transition-colors hover:bg-[var(--surface-2)]">
                  <td className="px-6 py-4 font-medium text-[var(--ink)]">{doc.title}</td>
                  <td className="px-6 py-4 text-[var(--muted)]">{doc.organizational_unit || "-"}</td>
                  <td className="px-6 py-4 text-[var(--muted)]">{doc.status_label} ({doc.progress_percent}%)</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/seguimientos/detalle?type=document&id=${doc.id}`} className="font-semibold uppercase tracking-[0.1em] text-[var(--accent)] hover:underline">Abrir</Link>
                  </td>
                </tr>
              ))}
              {currentTab === "activities" && activities.map((act) => (
                <tr key={act.id} className="transition-colors hover:bg-[var(--surface-2)]">
                  <td className="px-6 py-4 font-medium text-[var(--ink)]">{act.title}</td>
                  <td className="px-6 py-4 text-[var(--muted)]">{act.organizational_unit || "-"}</td>
                  <td className="px-6 py-4 text-[var(--muted)]">{act.activity_status}</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/seguimientos/detalle?type=activity&id=${act.id}`} className="font-semibold uppercase tracking-[0.1em] text-[var(--accent)] hover:underline">Abrir</Link>
                  </td>
                </tr>
              ))}
              {currentTab === "projects" && projects.map((proj) => (
                <tr key={proj.id} className="transition-colors hover:bg-[var(--surface-2)]">
                  <td className="px-6 py-4 font-medium text-[var(--ink)]">{proj.title}</td>
                  <td className="px-6 py-4 text-[var(--muted)]">{proj.organizational_unit || "-"}</td>
                  <td className="px-6 py-4 text-[var(--muted)]">{proj.tasks.length} Tareas</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/seguimientos/detalle?type=project&id=${proj.id}`} className="font-semibold uppercase tracking-[0.1em] text-[var(--accent)] hover:underline">Abrir</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-[2rem] border border-[var(--line)] bg-white px-8 py-16 text-center shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Cargando</p>
          <p className="mt-4 text-sm text-[var(--muted)]">Preparando dashboard...</p>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
