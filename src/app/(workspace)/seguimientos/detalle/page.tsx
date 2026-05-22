"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

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

    const recordId = id;
    const recordType = type;

    async function load() {
      try {
        let data = null;
        if (recordType === "document") {
          data = await getDocument(recordId);
        } else if (recordType === "activity") {
          data = await getActivity(recordId);
        } else if (recordType === "project") {
          data = await getProject(recordId);
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

    void load();
    return () => {
      ignore = true;
    };
  }, [id, type]);

  if (error) {
    return (
      <div className="page-stack">
        <Link href="/seguimientos" className="back-link">
          Volver al hub
        </Link>
        <div className="alert-box alert-box-error">{error}</div>
      </div>
    );
  }

  if (isLoading || !profile) {
    return (
      <div className="page-stack">
        <div className="section-panel loading-panel">
          <p className="section-eyebrow">Cargando detalle</p>
          <p className="section-note">Preparando el registro para edicion y consulta.</p>
        </div>
      </div>
    );
  }

  const typeLabel = type === "document" ? "Documento" : type === "activity" ? "Actividad" : "Proyecto";

  return (
    <div className="page-stack">
      <div className="section-panel">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Detalle de registro</p>
            <h1 className="section-title">{typeLabel}</h1>
            <p className="section-note">
              Ajusta el contenido del registro, revisa su estado y conserva la trazabilidad sin salir del flujo operativo.
            </p>
          </div>
          <Link
            href={type === "document" ? "/seguimientos#documents" : type === "activity" ? "/seguimientos#activities" : "/seguimientos#projects"}
            className="ghost-button"
          >
            Volver al listado
          </Link>
        </div>
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
        <div className="page-stack">
          <div className="section-panel loading-panel">
            <p className="section-eyebrow">Cargando detalle</p>
            <p className="section-note">Preparando el visor del registro.</p>
          </div>
        </div>
      }
    >
      <DetalleContent />
    </Suspense>
  );
}
