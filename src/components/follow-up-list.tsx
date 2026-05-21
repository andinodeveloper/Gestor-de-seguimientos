import Link from "next/link";

import { followUpDetailHref } from "@/lib/follow-ups";
import type { FollowUpListItem, Role } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils";

export function FollowUpList({
  items,
  role,
}: {
  items: FollowUpListItem[];
  role: Role;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-[2rem] border border-dashed border-[var(--line-strong)] bg-white/60 px-8 py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Sin resultados</p>
        <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
          No hay seguimientos para los filtros actuales.
        </h3>
        <p className="mt-3 text-sm text-[var(--muted)]">
          {role === "viewer"
            ? "Cuando un editor cree nuevos seguimientos, apareceran aqui."
            : "Puedes crear uno nuevo desde la vista de alta."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-[var(--line)] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <div className="grid grid-cols-[2.2fr_1.4fr_1.2fr_0.9fr_1.2fr] gap-4 border-b border-[var(--line)] px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
        <span>Titulo</span>
        <span>Unidad</span>
        <span>Responsable</span>
        <span>Fecha</span>
        <span>Actualizacion</span>
      </div>
      <div className="divide-y divide-[var(--line)]">
        {items.map((item) => (
          <Link
            key={item.id}
            href={followUpDetailHref(item.id)}
            className="grid grid-cols-[2.2fr_1.4fr_1.2fr_0.9fr_1.2fr] gap-4 px-6 py-5 transition hover:bg-[var(--surface-2)]"
          >
            <div>
              <p className="font-semibold text-[var(--ink)]">{item.title}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                {item.status === "archived" ? "Archivado" : "Activo"}
              </p>
            </div>
            <p className="text-sm text-[var(--ink)]">{item.organizational_unit}</p>
            <p className="text-sm text-[var(--ink)]">{item.responsible_name}</p>
            <p className="text-sm text-[var(--ink)]">{formatDate(item.report_date)}</p>
            <p className="text-sm text-[var(--muted)]">{formatDateTime(item.updated_at)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
