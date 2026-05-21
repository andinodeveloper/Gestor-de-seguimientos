import { DOCUMENT_STATUS_OPTIONS, PROJECT_COLUMNS } from "@/lib/constants";
import type { FollowUpBundle, ProjectColumnKey } from "@/lib/types";
import { downloadFileName } from "@/lib/utils";

type PptxShapeType = {
  rect: string;
};

type PptxSlide = {
  background: { color: string };
  addShape: (shapeType: string, options: Record<string, unknown>) => void;
  addTable: (rows: unknown[], options: Record<string, unknown>) => void;
  addText: (text: string, options: Record<string, unknown>) => void;
};

type PptxInstance = {
  ShapeType: PptxShapeType;
  author: string;
  company: string;
  defineSlideMaster: (options: Record<string, unknown>) => void;
  layout: string;
  subject: string;
  title: string;
  addSlide: (options?: Record<string, unknown>) => PptxSlide;
  writeFile: (options: { fileName: string }) => Promise<void>;
};

type PptxConstructor = new () => PptxInstance;

declare global {
  interface Window {
    PptxGenJS?: PptxConstructor;
    __pptxGenJsPromise?: Promise<PptxConstructor>;
  }
}

export async function downloadFollowUpPresentation(bundle: FollowUpBundle) {
  const PptxGenJS = await loadPptxConstructor();
  const pptx = new PptxGenJS();
  const themeGreen = "0B6B49";
  const themeInk = "102117";

  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "OpenAI Codex";
  pptx.company = "Super Selectos";
  pptx.subject = bundle.followUp.title;
  pptx.title = `Seguimiento - ${bundle.followUp.title}`;

  const defineMaster = (titleText: string) => {
    pptx.defineSlideMaster({
      title: titleText,
      background: { color: "F7F6F2" },
      objects: [
        { rect: { x: 0, y: 0, w: 13.33, h: 0.18, fill: { color: themeGreen } } },
        {
          text: {
            text: titleText,
            options: { x: 0.6, y: 0.35, w: 9, h: 0.4, color: themeInk, bold: true, fontSize: 22 },
          },
        },
        { rect: { x: 0, y: 7.28, w: 13.33, h: 0.22, fill: { color: "E7E4DA" } } },
        {
          text: {
            text: `${bundle.followUp.organizational_unit} | ${bundle.followUp.report_date}`,
            options: { x: 0.6, y: 7.3, w: 6.4, fontSize: 9, color: "52615A" },
          },
        },
        {
          text: {
            text: "Pag. {{slide_number}}",
            options: { x: 11.2, y: 7.3, w: 1.2, align: "right", fontSize: 9, color: "52615A" },
          },
        },
      ],
    });
  };

  defineMaster("Estado de documentos");
  defineMaster("Actividades operativas");
  defineMaster("Avance de proyectos");
  defineMaster("Complementos");

  const cover = pptx.addSlide();
  cover.background = { color: "F0EFE9" };
  cover.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 7.5, fill: { color: "F0EFE9" } });
  cover.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.22, fill: { color: themeGreen } });
  cover.addText("GESTOR DE SEGUIMIENTOS", {
    x: 0.6,
    y: 1.1,
    w: 4.5,
    fontFace: "Aptos Display",
    fontSize: 14,
    bold: true,
    color: themeGreen,
  });
  cover.addText(bundle.followUp.title.toUpperCase(), {
    x: 0.6,
    y: 2.0,
    w: 7,
    h: 1.2,
    fontFace: "Aptos Display",
    fontSize: 28,
    bold: true,
    color: themeInk,
    breakLine: false,
  });
  cover.addText(bundle.followUp.organizational_unit, {
    x: 0.6,
    y: 3.35,
    w: 6.2,
    fontSize: 16,
    color: "52615A",
  });
  cover.addText(`Responsable: ${bundle.followUp.responsible_name}`, {
    x: 0.6,
    y: 4.2,
    w: 5.4,
    fontSize: 12,
    color: themeInk,
  });
  cover.addText(bundle.followUp.report_date, {
    x: 0.6,
    y: 4.55,
    w: 3,
    fontSize: 12,
    color: "52615A",
  });
  cover.addShape(pptx.ShapeType.rect, {
    x: 8.3,
    y: 1.2,
    w: 4.2,
    h: 4.8,
    fill: { color: "0E2018" },
    line: { color: "0E2018" },
  });
  cover.addText("Operacion compartida\ncon historial, responsables y trazabilidad.", {
    x: 8.8,
    y: 2.2,
    w: 3.2,
    h: 1.6,
    fontSize: 20,
    bold: true,
    color: "FFFFFF",
  });

  const docsSlide = pptx.addSlide({ masterName: "Estado de documentos" });
  docsSlide.addTable(
    [
      [
        { text: "Documento", options: headerOptions(themeGreen) },
        { text: "Estado", options: headerOptions(themeGreen) },
        { text: "Avance", options: headerOptions(themeGreen) },
        { text: "Observaciones", options: headerOptions(themeGreen) },
      ],
      ...bundle.documents.map((document, index) => {
        const fill = index % 2 === 0 ? "FFFFFF" : "F5F4EF";
        return [
          { text: document.name, options: rowOptions(fill) },
          { text: document.status_label, options: rowOptions(fill) },
          { text: `${document.progress_percent}%`, options: rowOptions(fill, true) },
          { text: document.notes || "-", options: rowOptions(fill) },
        ];
      }),
    ],
    tableOptions(),
  );

  const activitySlide = pptx.addSlide({ masterName: "Actividades operativas" });
  activitySlide.addTable(
    [
      [
        { text: "Actividad", options: headerOptions(themeGreen) },
        { text: "Frecuencia", options: headerOptions(themeGreen) },
        { text: "Prioridad", options: headerOptions(themeGreen) },
        { text: "Estado", options: headerOptions(themeGreen) },
        { text: "Observaciones", options: headerOptions(themeGreen) },
      ],
      ...bundle.activities.map((activity, index) => {
        const fill = index % 2 === 0 ? "FFFFFF" : "F5F4EF";
        return [
          { text: activity.name, options: rowOptions(fill) },
          { text: activity.frequency, options: rowOptions(fill) },
          { text: activity.priority, options: rowOptions(fill) },
          { text: activity.status, options: rowOptions(fill) },
          { text: activity.notes || "-", options: rowOptions(fill) },
        ];
      }),
    ],
    tableOptions(),
  );

  bundle.projects.forEach((project) => {
    const projectSlide = pptx.addSlide({ masterName: "Avance de proyectos" });
    projectSlide.addText(project.name.toUpperCase(), {
      x: 0.6,
      y: 0.95,
      w: 8,
      fontSize: 16,
      bold: true,
      color: themeInk,
    });

    PROJECT_COLUMNS.forEach((column, index) => {
      const x = 0.6 + index * 4.2;
      const tasks = project.tasks.filter((task) => task.column_key === column.key);
      projectSlide.addShape(pptx.ShapeType.rect, {
        x,
        y: 1.4,
        w: 3.8,
        h: 0.36,
        fill: { color: columnColor(column.key) },
        line: { color: columnColor(column.key) },
      });
      projectSlide.addText(column.label.toUpperCase(), {
        x: x + 0.1,
        y: 1.44,
        w: 3.4,
        h: 0.2,
        align: "center",
        fontSize: 9,
        bold: true,
        color: "FFFFFF",
      });
      if (tasks.length === 0) {
        projectSlide.addText("Sin tareas", {
          x: x + 0.15,
          y: 1.95,
          w: 3.1,
          fontSize: 10,
          color: "7A867E",
          italic: true,
        });
      } else {
        projectSlide.addTable(
          tasks.map((task, taskIndex) => [
            {
              text: `${taskIndex + 1}. ${task.content}`,
              options: {
                fill: { color: "FFFFFF" },
                fontSize: 9,
                margin: 0.08,
                border: { pt: 0.4, color: "D7D4CC" },
              },
            },
          ]),
          {
            x,
            y: 1.84,
            w: 3.8,
            border: { pt: 0, color: "FFFFFF" },
          },
        );
      }
    });
  });

  const complementSlide = pptx.addSlide({ masterName: "Complementos" });
  complementSlide.addText("Estado general del seguimiento", {
    x: 0.6,
    y: 1.0,
    w: 6,
    fontSize: 18,
    bold: true,
    color: themeInk,
  });
  complementSlide.addText(
    [
      `Documentos activos: ${bundle.documents.length}`,
      `Actividades registradas: ${bundle.activities.length}`,
      `Proyectos abiertos: ${bundle.projects.length}`,
      `Ultima actualizacion: ${bundle.followUp.updated_at}`,
    ].join("\n"),
    {
      x: 0.6,
      y: 1.55,
      w: 5.8,
      h: 2.8,
      fontSize: 13,
      color: "33423A",
      breakLine: false,
    },
  );
  complementSlide.addText("Estatus maestros de documentos", {
    x: 7.1,
    y: 1.0,
    w: 5,
    fontSize: 14,
    bold: true,
    color: themeGreen,
  });
  complementSlide.addTable(
    [
      [
        { text: "Codigo", options: headerOptions(themeGreen) },
        { text: "Avance", options: headerOptions(themeGreen) },
      ],
      ...DOCUMENT_STATUS_OPTIONS.slice(0, 8).map((status, index) => {
        const fill = index % 2 === 0 ? "FFFFFF" : "F5F4EF";
        return [
          { text: status.code, options: rowOptions(fill) },
          { text: `${status.progress}%`, options: rowOptions(fill, true) },
        ];
      }),
    ],
    {
      ...tableOptions(),
      x: 7.1,
      y: 1.45,
      w: 4.2,
    },
  );

  await pptx.writeFile({ fileName: downloadFileName(bundle.followUp.title, "pptx") });
}

function headerOptions(color: string) {
  return {
    fill: { color },
    color: "FFFFFF",
    bold: true,
    fontSize: 9,
    align: "center" as const,
    margin: 0.08,
  };
}

function rowOptions(fill: string, emphasize = false) {
  return {
    fill: { color: fill },
    color: "15211A",
    fontSize: 8.5,
    bold: emphasize,
    margin: 0.08,
    border: { pt: 0.4, color: "D7D4CC" },
  };
}

function tableOptions() {
  return {
    x: 0.6,
    y: 1.25,
    w: 12.1,
    border: { pt: 0.4, color: "D7D4CC" },
    autoPage: true,
    autoPageRepeatHeader: true,
    autoPageHeaderRows: 1,
    newSlideStartY: 1.25,
  };
}

function columnColor(columnKey: ProjectColumnKey) {
  if (columnKey === "doing") {
    return "0B6B49";
  }

  if (columnKey === "done") {
    return "25352D";
  }

  return "5D6C66";
}

async function loadPptxConstructor() {
  if (window.PptxGenJS) {
    return window.PptxGenJS;
  }

  if (!window.__pptxGenJsPromise) {
    window.__pptxGenJsPromise = new Promise<PptxConstructor>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-pptxgenjs="true"]');
      if (existing) {
        existing.addEventListener("load", () => {
          if (window.PptxGenJS) {
            resolve(window.PptxGenJS);
            return;
          }

          reject(new Error("PptxGenJS no quedo disponible despues de cargar el script."));
        });
        existing.addEventListener("error", () => {
          reject(new Error("No se pudo cargar la libreria de PPTX."));
        });
        return;
      }

      const script = document.createElement("script");
      script.async = true;
      script.dataset.pptxgenjs = "true";
      script.src = "https://cdn.jsdelivr.net/npm/pptxgenjs@4.0.1/dist/pptxgen.bundle.js";
      script.onload = () => {
        if (window.PptxGenJS) {
          resolve(window.PptxGenJS);
          return;
        }

        reject(new Error("PptxGenJS no quedo disponible despues de cargar el script."));
      };
      script.onerror = () => {
        reject(new Error("No se pudo cargar la libreria de PPTX."));
      };
      document.head.append(script);
    });
  }

  return window.__pptxGenJsPromise;
}
