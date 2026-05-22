"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuthContext } from "@/components/auth-provider";
import { getOperationalSnapshot, getProjectProgress } from "@/lib/follow-ups";
import type {
  ActivityTracking,
  DocumentTracking,
  OperationalSnapshot,
  ProjectTracking,
} from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

type ArchiveFilter = "active" | "archived" | "all";
type RecordTab = "documents" | "activities" | "projects";

const RECORD_TAB_IDS = new Set<RecordTab>(["documents", "activities", "projects"]);

export default function RecordsHubPage() {
  const { profile } = useAuthContext();
  const [snapshot, setSnapshot] = useState<OperationalSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<RecordTab>("documents");

  useEffect(() => {
    let ignore = false;
    setIsLoading(true);
    setError(null);

    void getOperationalSnapshot()
      .then((data) => {
        if (!ignore) {
          setSnapshot(data);
          setIsLoading(false);
        }
      })
      .catch((loadError) => {
        if (!ignore) {
          setSnapshot(null);
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el hub de registros.");
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncTabWithHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (RECORD_TAB_IDS.has(hash as RecordTab)) {
        setActiveTab(hash as RecordTab);
      }
    };

    syncTabWithHash();
    window.addEventListener("hashchange", syncTabWithHash);

    return () => {
      window.removeEventListener("hashchange", syncTabWithHash);
    };
  }, []);

  const activeTotals = useMemo(() => {
    if (!snapshot) {
      return { documents: 0, activities: 0, projects: 0 };
    }

    return {
      documents: snapshot.documents.filter((item) => item.status === "active").length,
      activities: snapshot.activities.filter((item) => item.status === "active").length,
      projects: snapshot.projects.filter((item) => item.status === "active").length,
    };
  }, [snapshot]);

  const canCreate = profile?.role !== "viewer";
  const tabs = [
    {
      id: "documents" as const,
      label: "Documentos",
      note: "Control documental y avance por fase.",
      total: activeTotals.documents,
    },
    {
      id: "activities" as const,
      label: "Actividades",
      note: "Operacion diaria con prioridad y frecuencia.",
      total: activeTotals.activities,
    },
    {
      id: "projects" as const,
      label: "Proyectos",
      note: "Tableros kanban con progreso derivado.",
      total: activeTotals.projects,
    },
  ];

  function handleTabChange(tab: RecordTab) {
    setActiveTab(tab);

    if (typeof window !== "undefined" && window.location.hash !== `#${tab}`) {
      window.history.replaceState(null, "", `#${tab}`);
    }
  }

  if (error) {
    return (
      <div className="page-stack">
        <div className="alert-box alert-box-error">{error}</div>
      </div>
    );
  }

  if (isLoading || !snapshot) {
    return (
      <div className="page-stack">
        <div className="section-panel loading-panel">
          <p className="section-eyebrow">Cargando registros</p>
          <p className="section-note">Preparando documentos, actividades y proyectos independientes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="hero-grid">
        <div className="hero-panel">
          <div className="hero-copy">
            <p className="hero-eyebrow">Registros operativos</p>
            <h1 className="hero-title">Un solo workspace para documentos, actividades y kanban</h1>
            <p className="hero-body">
              Cada modulo conserva su propio filtro, su propia accion de creacion y su propio ritmo de trabajo.
            </p>
          </div>
          <div className="hero-rails">
            <div className="stat-ribbon">
              <StatPill label="Documentos activos" value={activeTotals.documents} />
              <StatPill label="Actividades activas" value={activeTotals.activities} />
              <StatPill label="Proyectos activos" value={activeTotals.projects} />
            </div>
            <div className="meta-grid">
              <div className="meta-tile">
                <strong>{snapshot.documents.length + snapshot.activities.length + snapshot.projects.length}</strong>
                <span>Registros visibles en este workspace</span>
              </div>
              <div className="meta-tile">
                <strong>{profile?.role === "viewer" ? "Consulta" : "Operacion"}</strong>
                <span>{profile?.role === "viewer" ? "Sin acciones de alta" : "Creacion desde cada modulo"}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-panel section-panel-contrast">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Secciones</p>
            <h2 className="section-title">Registros por tipo</h2>
          </div>
          <p className="section-note">Cambia entre modulos sin salir del listado principal.</p>
        </div>

        <div className="records-tablist" role="tablist" aria-label="Secciones de registros">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              className={cn("records-tab", activeTab === tab.id ? "records-tab-active" : "")}
              onClick={() => handleTabChange(tab.id)}
            >
              <span className="records-tab-label">{tab.label}</span>
              <strong className="records-tab-count">{tab.total}</strong>
              <span className="records-tab-note">{tab.note}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="module-stack records-tab-panels">
        <div
          id="panel-documents"
          role="tabpanel"
          aria-labelledby="tab-documents"
          hidden={activeTab !== "documents"}
          className={cn("records-tab-panel", activeTab !== "documents" ? "records-tab-panel-hidden" : "")}
        >
          <RecordsModule
            id="documents"
            title="Documentos"
            note="Estado documental, avance de fases y observaciones de control."
            createLabel="Crear documento"
            createHref="/seguimientos/nuevo?type=document"
            canCreate={canCreate}
            total={snapshot.documents.length}
            items={snapshot.documents}
            getSearchText={(item) => [item.title, item.organizational_unit, item.status_label].join(" ")}
            getHref={(item) => `/seguimientos/detalle?type=document&id=${item.id}`}
            renderStatus={(item) => (
              <div className="record-status-block">
                <strong>{item.status_label}</strong>
                <span>{item.progress_percent}% de avance</span>
              </div>
            )}
            renderSummary={(items) => {
              const active = items.filter((item) => item.status === "active").length;
              const highProgress = items.filter((item) => item.progress_percent >= 85).length;
              return (
                <>
                  <SummaryMini label="Activos" value={active} />
                  <SummaryMini label="Avance alto" value={highProgress} />
                </>
              );
            }}
          />
        </div>

        <div
          id="panel-activities"
          role="tabpanel"
          aria-labelledby="tab-activities"
          hidden={activeTab !== "activities"}
          className={cn("records-tab-panel", activeTab !== "activities" ? "records-tab-panel-hidden" : "")}
        >
          <RecordsModule
            id="activities"
            title="Actividades"
            note="Seguimiento operativo con frecuencia, prioridad y estado de ejecucion."
            createLabel="Crear actividad"
            createHref="/seguimientos/nuevo?type=activity"
            canCreate={canCreate}
            total={snapshot.activities.length}
            items={snapshot.activities}
            getSearchText={(item) => [item.title, item.organizational_unit, item.activity_status, item.priority].join(" ")}
            getHref={(item) => `/seguimientos/detalle?type=activity&id=${item.id}`}
            renderStatus={(item) => (
              <div className="record-status-block">
                <strong>{item.activity_status}</strong>
                <span>
                  {item.frequency} - {item.priority}
                </span>
              </div>
            )}
            renderSummary={(items) => {
              const completed = items.filter((item) => item.activity_status === "Completado").length;
              const inProcess = items.filter((item) => item.activity_status === "En Proceso").length;
              return (
                <>
                  <SummaryMini label="En proceso" value={inProcess} />
                  <SummaryMini label="Completadas" value={completed} />
                </>
              );
            }}
          />
        </div>

        <div
          id="panel-projects"
          role="tabpanel"
          aria-labelledby="tab-projects"
          hidden={activeTab !== "projects"}
          className={cn("records-tab-panel", activeTab !== "projects" ? "records-tab-panel-hidden" : "")}
        >
          <RecordsModule
            id="projects"
            title="Proyectos / Kanban"
            note="Tableros con tareas, progreso derivado y cierre por columna."
            createLabel="Crear proyecto"
            createHref="/seguimientos/nuevo?type=project"
            canCreate={canCreate}
            total={snapshot.projects.length}
            items={snapshot.projects}
            getSearchText={(item) => [item.title, item.organizational_unit].join(" ")}
            getHref={(item) => `/seguimientos/detalle?type=project&id=${item.id}`}
            renderStatus={(item) => {
              const { done, total, progress } = getProjectProgress(item);
              return (
                <div className="record-status-block">
                  <strong>{progress}% de avance</strong>
                  <span>{total === 0 ? "Sin tareas" : `${done}/${total} tareas finalizadas`}</span>
                </div>
              );
            }}
            renderSummary={(items) => {
              const totalTasks = items.reduce((acc, item) => acc + item.tasks.length, 0);
              const completedBoards = items.filter((item) => {
                const { done, total } = getProjectProgress(item);
                return total > 0 && done === total;
              }).length;
              return (
                <>
                  <SummaryMini label="Tareas totales" value={totalTasks} />
                  <SummaryMini label="Tableros cerrados" value={completedBoards} />
                </>
              );
            }}
          />
        </div>
      </div>
    </div>
  );
}

function RecordsModule<T extends DocumentTracking | ActivityTracking | ProjectTracking>({
  id,
  title,
  note,
  items,
  total,
  canCreate,
  createHref,
  createLabel,
  getSearchText,
  getHref,
  renderStatus,
  renderSummary,
}: {
  id: string;
  title: string;
  note: string;
  items: T[];
  total: number;
  canCreate: boolean | undefined;
  createHref: string;
  createLabel: string;
  getSearchText: (item: T) => string;
  getHref: (item: T) => string;
  renderStatus: (item: T) => ReactNode;
  renderSummary: (items: T[]) => ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [archived, setArchived] = useState<ArchiveFilter>("active");
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesArchive =
        archived === "all" ? true : archived === "archived" ? item.status === "archived" : item.status === "active";

      const matchesQuery = normalized ? getSearchText(item).toLowerCase().includes(normalized) : true;

      return matchesArchive && matchesQuery;
    });
  }, [archived, getSearchText, items, query]);

  const visibleItems = showAll ? filtered : filtered.slice(0, 5);

  useEffect(() => {
    setShowAll(false);
  }, [query, archived]);

  return (
    <section id={id} className="module-panel">
      <div className="module-head">
        <div className="module-headline">
          <div>
            <p className="section-eyebrow">{title}</p>
            <h2 className="section-title">{title}</h2>
          </div>
          <p className="section-note">{note}</p>
        </div>
        <div className="module-actions">
          <div className="compact-grid">{renderSummary(items)}</div>
          {canCreate ? (
            <Link href={createHref} className="mini-button">
              {createLabel}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="module-toolbar">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="field field-compact"
          placeholder={`Buscar en ${title.toLowerCase()}`}
        />
        <select
          value={archived}
          onChange={(event) => setArchived(event.target.value as ArchiveFilter)}
          className="field field-compact"
        >
          <option value="active">Solo activos</option>
          <option value="archived">Solo archivados</option>
          <option value="all">Todos</option>
        </select>
        <div className="module-meta">
          <span>{filtered.length} visibles</span>
          <span>{total} totales</span>
        </div>
      </div>

      <div className="record-list">
        {visibleItems.length === 0 ? (
          <div className="empty-strip">No hay registros que coincidan con este filtro.</div>
        ) : (
          visibleItems.map((item) => (
            <article key={item.id} className="record-row">
              <div className="record-main">
                <div>
                  <p className="record-title">{item.title}</p>
                  <p className="record-meta">
                    {item.organizational_unit || "Sin unidad"} - Actualizado {formatDate(item.updated_at)}
                  </p>
                </div>
                {renderStatus(item)}
              </div>
              <div className="record-actions">
                <span className={cn("record-state-pill", item.status === "archived" ? "record-state-pill-archived" : "")}>
                  {item.status === "archived" ? "Archivado" : "Activo"}
                </span>
                <Link href={getHref(item)} className="text-link">
                  Abrir
                </Link>
              </div>
            </article>
          ))
        )}
      </div>

      {filtered.length > 5 ? (
        <div className="module-footer">
          <button type="button" className="ghost-button" onClick={() => setShowAll((current) => !current)}>
            {showAll ? "Mostrar menos" : "Ver mas"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function SummaryMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="summary-mini">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-pill">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
