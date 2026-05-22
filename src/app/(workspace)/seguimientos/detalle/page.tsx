"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuthContext } from "@/components/auth-provider";
import { ActivityEditor } from "@/components/activity-editor";
import { DocumentEditor } from "@/components/document-editor";
import { ProjectEditor } from "@/components/project-editor";
import { getActivity, getDocument, getProject } from "@/lib/follow-ups";
import type { ActivityTracking, DocumentTracking, ProjectTracking } from "@/lib/types";

function DetalleContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type");
  const id = searchParams.get("id");
  const { profile } = useAuthContext();
  
  const [record, setRecord] = useState<DocumentTracking | ActivityTracking | ProjectTracking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    setIsLoading(true);
    
    if (!id || !type) {
      if (!ignore) {
        setError("Faltan parametros (type o id).");
        setIsLoading(false);
      }
      return;
    }

    async function load() {
      try {
        let data = null;
        if (type === "document") {
          data = await getDocument(id as string);
        } else if (type === "activity") {
          data = await getActivity(id as string);
        } else if (type === "project") {
          data = await getProject(id as string);
        }
        
        if (!ignore) {
          if (data) {
            setRecord(data);
          } else {
            setError("Registro no encontrado.");
          }
          setIsLoading(false);
        }
      } catch (err) {
         if (!ignore) {
            setError(err instanceof Error ? err.message : "Error al cargar registro");
            setIsLoading(false);
         }
      }
    }
    load();
    return () => { ignore = true; };
  }, [id, type]);

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/seguimientos" className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--accent)]">
          &larr; Volver
        </Link>
        <div className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-900">
          {error}
        </div>
      </div>
    );
  }

  if (isLoading || !profile) {
    return (
      <div className="rounded-[2rem] border border-[var(--line)] bg-white px-8 py-16 text-center shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Cargando</p>
        <p className="mt-4 text-sm text-[var(--muted)]">Cargando registro...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={type === "document" ? "/seguimientos#documents" : type === "activity" ? "/seguimientos#activities" : "/seguimientos#projects"}
          className="text-sm font-semibold uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--accent)]"
        >
          &larr; Volver al listado
        </Link>
      </div>
      {type === "document" && <DocumentEditor document={record as DocumentTracking} role={profile.role} />}
      {type === "activity" && <ActivityEditor activity={record as ActivityTracking} role={profile.role} />}
      {type === "project" && <ProjectEditor project={record as ProjectTracking} role={profile.role} />}
    </div>
  );
}

export default function DetallePage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-[2rem] border border-[var(--line)] bg-white px-8 py-16 text-center shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Cargando</p>
          <p className="mt-4 text-sm text-[var(--muted)]">Preparando visor...</p>
        </div>
      }
    >
      <DetalleContent />
    </Suspense>
  );
}
