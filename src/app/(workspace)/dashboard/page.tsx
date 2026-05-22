"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { useAuthContext } from "@/components/auth-provider";
import {
  buildDashboardSummary,
  getOperationalSnapshot,
  getProjectProgress,
  listProfiles,
} from "@/lib/follow-ups";
import type {
  DashboardHighlight,
  DashboardMetric,
  DashboardOutcome,
  OperationalSnapshot,
  Profile,
} from "@/lib/types";
import { cn, formatDate, formatDateTime } from "@/lib/utils";

export default function DashboardPage() {
  const { profile } = useAuthContext();
  const [snapshot, setSnapshot] = useState<OperationalSnapshot | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [ownerId, setOwnerId] = useState("");
  const deferredOwnerId = useDeferredValue(ownerId);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isEditor = profile?.role === "editor";
  const isGlobalScope = !isEditor;

  useEffect(() => {
    if (!profile) return;

    let ignore = false;
    setIsLoading(true);
    setError(null);

    const selectedOwnerId = isEditor ? profile.id : deferredOwnerId || undefined;

    void Promise.all([
      getOperationalSnapshot({ ownerId: selectedOwnerId }),
      isGlobalScope ? listProfiles({ activeOnly: true, roles: ["admin", "editor"] }) : Promise.resolve([]),
    ])
      .then(([nextSnapshot, nextProfiles]) => {
        if (ignore) return;
        setSnapshot(nextSnapshot);
        setProfiles(nextProfiles);
        setIsLoading(false);
      })
      .catch((loadError) => {
        if (ignore) return;
        setSnapshot(null);
        setProfiles([]);
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el dashboard.");
        setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [deferredOwnerId, isEditor, isGlobalScope, profile]);

  const summary = useMemo(() => (snapshot ? buildDashboardSummary(snapshot) : null), [snapshot]);

  const filterOptions = useMemo(() => {
    return profiles
      .map((entry) => ({
        id: entry.id,
        label: entry.full_name?.trim() || entry.email,
        meta: entry.email,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [profiles]);

  const ownerLabels = useMemo(() => {
    return new Map(filterOptions.map((entry) => [entry.id, `${entry.label} · ${entry.meta}`]));
  }, [filterOptions]);

  if (!profile) {
    return (
      <LoadingState
        title="Validando acceso"
        body="Preparando el dashboard operativo."
      />
    );
  }

  if (error) {
    return (
      <div className="page-stack">
        <AlertBox tone="error">{error}</AlertBox>
      </div>
    );
  }

  if (isLoading || !summary || !snapshot) {
    return (
      <LoadingState
        title="Cargando dashboard"
        body="Consolidando indicadores, hitos y resultados."
      />
    );
  }

  const projectsClosed = snapshot.projects.filter((project) => {
    const { total, done } = getProjectProgress(project);
    return total > 0 && done === total;
  }).length;

  return (
    <div className="page-stack">
      <section className="hero-grid">
        <div className="hero-panel hero-panel-strong">
          <div className="hero-copy">
            <p className="hero-eyebrow">Dashboard operativo</p>
            <h1 className="hero-title">
              {isEditor ? "Resumen de tus registros activos" : "Panorama general del sistema"}
            </h1>
            <p className="hero-body">
              {isEditor
                ? "Consulta movimiento reciente, puntos de avance y resultados de los registros bajo tu responsabilidad directa."
                : "Supervisa documentos, actividades y proyectos con un filtro inmediato por responsable para revisar carga, avance y cierres."}
            </p>
          </div>
          <div className="hero-rails">
            <div className="stat-ribbon">
              <StatPill label="Registros totales" value={summary.totals.documents + summary.totals.activities + summary.totals.projects} />
              <StatPill label="Actualizados" value={summary.totals.recent} />
              <StatPill label="Archivados" value={summary.totals.archived} />
            </div>
            <div className="hero-actions">
              <Link href="/seguimientos" className="mini-button mini-button-contrast">
                Abrir registros
              </Link>
              {!isEditor ? (
                <div className="hero-filter-block">
                  <label className="label">Coordinador / responsable</label>
                  <select className="field field-compact" value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
                    <option value="">Todos</option>
                    {filterOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="meta-line">
                    {ownerId ? `Filtro activo: ${ownerLabels.get(ownerId) ?? "Responsable seleccionado"}` : "Vista global sin filtro."}
                  </p>
                </div>
              ) : (
                <div className="hero-filter-block">
                  <label className="label">Alcance</label>
                  <div className="meta-tile">
                    <strong>{profile.full_name || profile.email}</strong>
                    <span>Solo tus registros</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="metrics-band">
        {summary.metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </section>

      <section className="workspace-grid">
        <div className="workspace-primary">
          <section className="section-panel">
            <div className="section-heading">
              <div>
                <p className="section-eyebrow">Hitos principales</p>
                <h2 className="section-title">Registros destacados por avance y estado</h2>
              </div>
              <p className="section-note">Se priorizan los movimientos con mejor progreso y actividad reciente.</p>
            </div>

            <div className="highlight-list">
              {summary.highlights.map((highlight) => (
                <HighlightRow
                  key={`${highlight.kind}-${highlight.id}`}
                  highlight={highlight}
                  ownerLabel={ownerLabels.get(highlight.owner_id)}
                />
              ))}
            </div>
          </section>

          <section className="section-panel">
            <div className="section-heading">
              <div>
                <p className="section-eyebrow">Flujo reciente</p>
                <h2 className="section-title">Ultimas actualizaciones del sistema</h2>
              </div>
              <p className="section-note">Cronologia corta para detectar actividad reciente sin salir del dashboard.</p>
            </div>
            <div className="timeline-list">
              {buildRecentTimeline(snapshot)
                .slice(0, 6)
                .map((entry) => (
                  <Link key={`${entry.kind}-${entry.id}`} href={entry.href} className="timeline-row">
                    <div className="timeline-badge">{entry.kind === "document" ? "DOC" : entry.kind === "activity" ? "ACT" : "KAN"}</div>
                    <div className="timeline-copy">
                      <p className="timeline-title">{entry.title}</p>
                      <p className="timeline-meta">
                        {entry.status}
                        {entry.organizational_unit ? ` · ${entry.organizational_unit}` : ""}
                      </p>
                    </div>
                    <span className="timeline-time">{formatDateTime(entry.updated_at)}</span>
                  </Link>
                ))}
            </div>
          </section>
        </div>

        <aside className="workspace-secondary">
          <section className="section-panel section-panel-contrast">
            <div className="section-heading">
              <div>
                <p className="section-eyebrow">Resultados</p>
                <h2 className="section-title">Cierres y entregables</h2>
              </div>
            </div>
            <div className="outcomes-list">
              {summary.outcomes.map((outcome) => (
                <OutcomeCard key={outcome.id} outcome={outcome} />
              ))}
            </div>
          </section>

          <section className="section-panel">
            <div className="section-heading">
              <div>
                <p className="section-eyebrow">Distribucion</p>
                <h2 className="section-title">Carga por modulo</h2>
              </div>
            </div>
            <div className="stack-summary">
              <ProgressLine label="Documentos" value={summary.totals.documents} total={summary.totals.documents + summary.totals.activities + summary.totals.projects} />
              <ProgressLine label="Actividades" value={summary.totals.activities} total={summary.totals.documents + summary.totals.activities + summary.totals.projects} />
              <ProgressLine label="Proyectos" value={summary.totals.projects} total={summary.totals.documents + summary.totals.activities + summary.totals.projects} />
            </div>
            <div className="divider" />
            <div className="stack-summary compact-grid">
              <SummaryMini label="Documentos > 85%" value={summary.outcomes[0]?.value ?? 0} />
              <SummaryMini label="Actividades completadas" value={summary.outcomes[1]?.value ?? 0} />
              <SummaryMini label="Proyectos cerrados" value={projectsClosed} />
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function MetricCard({ metric }: { metric: DashboardMetric }) {
  return (
    <article className="metric-card">
      <p className="metric-label">{metric.label}</p>
      <p className="metric-value">{metric.value}</p>
      <p className="metric-note">{metric.note}</p>
    </article>
  );
}

function HighlightRow({
  highlight,
  ownerLabel,
}: {
  highlight: DashboardHighlight;
  ownerLabel?: string;
}) {
  return (
    <Link href={highlight.href} className="highlight-row">
      <div className="highlight-kind">
        {highlight.kind === "document" ? "Documento" : highlight.kind === "activity" ? "Actividad" : "Proyecto"}
      </div>
      <div className="highlight-copy">
        <div className="highlight-topline">
          <p className="highlight-title">{highlight.title}</p>
          <span className="highlight-score">{highlight.progress}%</span>
        </div>
        <p className="highlight-meta">
          {highlight.status}
          {highlight.organizational_unit ? ` · ${highlight.organizational_unit}` : ""}
          {ownerLabel ? ` · ${ownerLabel}` : ""}
        </p>
      </div>
      <span className="highlight-date">{formatDate(highlight.updated_at)}</span>
    </Link>
  );
}

function OutcomeCard({ outcome }: { outcome: DashboardOutcome }) {
  return (
    <article className="outcome-card">
      <p className="outcome-value">{outcome.value}</p>
      <p className="outcome-title">{outcome.label}</p>
      <p className="outcome-note">{outcome.note}</p>
    </article>
  );
}

function ProgressLine({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const width = total === 0 ? 0 : Math.round((value / total) * 100);

  return (
    <div className="progress-line">
      <div className="progress-copy">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="progress-track">
        <span className="progress-fill" style={{ width: `${width}%` }} />
      </div>
    </div>
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

function AlertBox({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "error";
}) {
  return (
    <div className={cn("alert-box", tone === "error" ? "alert-box-error" : "")}>
      {children}
    </div>
  );
}

function LoadingState({ title, body }: { title: string; body: string }) {
  return (
    <div className="page-stack">
      <div className="section-panel loading-panel">
        <p className="section-eyebrow">{title}</p>
        <p className="section-note">{body}</p>
      </div>
    </div>
  );
}

function buildRecentTimeline(snapshot: OperationalSnapshot) {
  return [
    ...snapshot.documents.map((item) => ({
      id: item.id,
      kind: "document" as const,
      title: item.title,
      status: item.status_label,
      organizational_unit: item.organizational_unit,
      updated_at: item.updated_at,
      href: `/seguimientos/detalle?type=document&id=${item.id}`,
    })),
    ...snapshot.activities.map((item) => ({
      id: item.id,
      kind: "activity" as const,
      title: item.title,
      status: item.activity_status,
      organizational_unit: item.organizational_unit,
      updated_at: item.updated_at,
      href: `/seguimientos/detalle?type=activity&id=${item.id}`,
    })),
    ...snapshot.projects.map((item) => {
      const { done, total } = getProjectProgress(item);
      return {
        id: item.id,
        kind: "project" as const,
        title: item.title,
        status: total === 0 ? "Sin tareas" : `${done}/${total} tareas finalizadas`,
        organizational_unit: item.organizational_unit,
        updated_at: item.updated_at,
        href: `/seguimientos/detalle?type=project&id=${item.id}`,
      };
    }),
  ].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
}
