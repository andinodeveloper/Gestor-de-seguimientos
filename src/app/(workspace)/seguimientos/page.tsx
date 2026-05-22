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
  const totalRecords = snapshot ? snapshot.documents.length + snapshot.activities.length + snapshot.projects.length : 0;
  const tabs = [
    {
      id: "documents" as const,
      label: "Documentos",
      total: activeTotals.documents,
      note: "Control documental y avance por etapa.",
    },
    {
      id: "activities" as const,
      label: "Actividades",
      total: activeTotals.activities,
      note: "Seguimiento recurrente con prioridad y estado.",
    },
    {
      id: "projects" as const,
      label: "Proyectos",
      total: activeTotals.projects,
      note: "Tableros kanban y carga por tareas.",
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
          <p className="section-note">Preparando el workspace operativo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="records-topbar">
        <div className="records-topbar-copy">
          <p className="section-eyebrow">Hub de registros</p>
          <h1 className="records-page-title">Consulta transversal por tipo, estado y contexto</h1>
          <p className="section-note">
            Navega entre modulos sin perder contexto, filtra por estado y abre el registro correcto desde una superficie unica.
          </p>
        </div>
        <div className="records-topbar-stats">
          <SummaryMini label="Documentos" value={activeTotals.documents} />
          <SummaryMini label="Actividades" value={activeTotals.activities} />
          <SummaryMini label="Proyectos" value={activeTotals.projects} />
          <SummaryMini label="Total" value={totalRecords} />
        </div>
      </section>

      <section className="records-switcher" aria-label="Tipos de registro">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            type="button"
            className={cn("records-tab", activeTab === tab.id ? "records-tab-active" : "")}
            onClick={() => handleTabChange(tab.id)}
            aria-pressed={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
          >
            <span className="records-tab-label">{tab.label}</span>
            <span className="records-tab-count">{tab.total}</span>
            <span className="records-tab-note">{tab.note}</span>
          </button>
        ))}
      </section>

      <div className="module-stack">
        <div id="panel-documents" hidden={activeTab !== "documents"}>
          <RecordsModule
            id="documents"
            title="Documentos"
            createLabel="Nuevo documento"
            createHref="/seguimientos/nuevo?type=document"
            canCreate={canCreate}
            total={snapshot.documents.length}
            items={snapshot.documents}
            getSearchText={(item) => [item.title, item.organizational_unit, item.status_label].join(" ")}
            getHref={(item) => `/seguimientos/detalle?type=document&id=${item.id}`}
            renderStatus={(item) => (
              <div className="record-status-block">
                <strong>{item.status_label}</strong>
                <span>{item.progress_percent}%</span>
              </div>
            )}
            renderSummary={(items) => (
              <>
                <SummaryMini label="Activos" value={items.filter((item) => item.status === "active").length} />
                <SummaryMini label="Avance alto" value={items.filter((item) => item.progress_percent >= 85).length} />
              </>
            )}
          />
        </div>

        <div id="panel-activities" hidden={activeTab !== "activities"}>
          <RecordsModule
            id="activities"
            title="Actividades"
            createLabel="Nueva actividad"
            createHref="/seguimientos/nuevo?type=activity"
            canCreate={canCreate}
            total={snapshot.activities.length}
            items={snapshot.activities}
            getSearchText={(item) => [item.title, item.organizational_unit, item.activity_status, item.priority].join(" ")}
            getHref={(item) => `/seguimientos/detalle?type=activity&id=${item.id}`}
            renderStatus={(item) => (
              <div className="record-status-block">
                <strong>{item.activity_status}</strong>
                <span>{item.priority}</span>
              </div>
            )}
            renderSummary={(items) => (
              <>
                <SummaryMini label="En proceso" value={items.filter((item) => item.activity_status === "En Proceso").length} />
                <SummaryMini label="Completadas" value={items.filter((item) => item.activity_status === "Completado").length} />
              </>
            )}
          />
        </div>

        <div id="panel-projects" hidden={activeTab !== "projects"}>
          <RecordsModule
            id="projects"
            title="Proyectos"
            createLabel="Nuevo proyecto"
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
                  <strong>{progress}%</strong>
                  <span>{total === 0 ? "Sin tareas" : `${done}/${total}`}</span>
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
                  <SummaryMini label="Tareas" value={totalTasks} />
                  <SummaryMini label="Cerrados" value={completedBoards} />
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

  const visibleItems = showAll ? filtered : filtered.slice(0, 6);

  useEffect(() => {
    setShowAll(false);
  }, [query, archived]);

  return (
    <section id={id} className="module-panel module-panel-compact">
      <div className="module-head module-head-compact">
        <div className="module-title-block">
          <h2 className="section-title">{title}</h2>
          <div className="module-meta">
            <span>{filtered.length} visibles</span>
            <span>{total} totales</span>
          </div>
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

      <div className="records-filterbar">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="field field-compact"
          placeholder={`Buscar en ${title.toLowerCase()}`}
          aria-label={`Buscar en ${title.toLowerCase()}`}
        />
        <div className="segmented-control" aria-label={`Filtro por estado para ${title.toLowerCase()}`}>
          <button
            type="button"
            className={cn("segmented-button", archived === "active" ? "segmented-button-active" : "")}
            onClick={() => setArchived("active")}
          >
            Activos
          </button>
          <button
            type="button"
            className={cn("segmented-button", archived === "archived" ? "segmented-button-active" : "")}
            onClick={() => setArchived("archived")}
          >
            Archivados
          </button>
          <button
            type="button"
            className={cn("segmented-button", archived === "all" ? "segmented-button-active" : "")}
            onClick={() => setArchived("all")}
          >
            Todos
          </button>
        </div>
        <div className="summary-mini">
          <span>Filtro actual</span>
          <strong>{archived === "active" ? "Activos" : archived === "archived" ? "Archivados" : "Todos"}</strong>
        </div>
      </div>

      <div className="record-list">
        {visibleItems.length === 0 ? (
          <div className="empty-strip">No hay registros para esta combinacion de filtros.</div>
        ) : (
          visibleItems.map((item) => (
            <article key={item.id} className="record-row">
              <div className="record-main">
                <div>
                  <p className="record-title">{item.title}</p>
                  <p className="record-meta">
                    {item.organizational_unit || "Sin unidad"} - {formatDate(item.updated_at)}
                  </p>
                </div>
                {renderStatus(item)}
              </div>
              <div className="record-actions">
                <span className={cn("record-state-pill", item.status === "archived" ? "record-state-pill-archived" : "")}>
                  {item.status === "archived" ? "Archivado" : "Activo"}
                </span>
                <Link href={getHref(item)} className="text-link">
                  Abrir detalle
                </Link>
              </div>
            </article>
          ))
        )}
      </div>

      {filtered.length > 6 ? (
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
