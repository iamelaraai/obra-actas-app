import { NextResponse } from "next/server";
import JSZip from "jszip";

export const runtime = "nodejs";

type Row = {
  actor?: string;
  compromiso?: string;
  componente?: string;
  responsable?: string;
  fechaLimite?: string;
  estado?: string;
  observacion?: string;
};

type Asis = { nombre: string; cargo?: string };

function esc(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function toWordInline(text: string) {
  const safe = esc(text || "");
  return safe.replace(/\n/g, "</w:t><w:br/><w:t>");
}

function tableAsPlain(headers: string[], rows: string[][], title: string) {
  const head = headers.join(" | ");
  const body = (rows.length ? rows : [["Sin registros", ...Array(Math.max(headers.length - 1, 0)).fill("")]])
    .map((r) => r.map((x) => x || "").join(" | "))
    .join("\n");
  return `${title}\n${head}\n${body}`;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const template = form.get("template") as File | null;
    const payloadRaw = form.get("payload") as string | null;

    if (!template || !payloadRaw) {
      return NextResponse.json({ error: "Missing template or payload" }, { status: 400 });
    }

    const payload = JSON.parse(payloadRaw) as {
      meta: Record<string, string>;
      asistentes: {
        sif: string[];
        edu: string[];
        interventoria: string[];
        contratista: string[];
        sif_det?: Asis[];
        edu_det?: Asis[];
        interventoria_det?: Asis[];
        contratista_det?: Asis[];
      };
      resumenReunion: string;
      rows: Row[];
    };

    const zip = await JSZip.loadAsync(await template.arrayBuffer());
    const docXmlFile = zip.file("word/document.xml");
    if (!docXmlFile) return NextResponse.json({ error: "Template invalid: missing document.xml" }, { status: 400 });

    let xml = await docXmlFile.async("string");

    const totalAsist =
      (payload.asistentes.sif?.length || 0) +
      (payload.asistentes.edu?.length || 0) +
      (payload.asistentes.interventoria?.length || 0) +
      (payload.asistentes.contratista?.length || 0);

    const det = {
      sif: payload.asistentes.sif_det || (payload.asistentes.sif || []).map((n) => ({ nombre: n, cargo: "" })),
      edu: payload.asistentes.edu_det || (payload.asistentes.edu || []).map((n) => ({ nombre: n, cargo: "" })),
      int: payload.asistentes.interventoria_det || (payload.asistentes.interventoria || []).map((n) => ({ nombre: n, cargo: "" })),
      con: payload.asistentes.contratista_det || (payload.asistentes.contratista || []).map((n) => ({ nombre: n, cargo: "" })),
    };

    const rowsActividad = (payload.rows || []).map((r) => [
      r.actor || "",
      r.compromiso || "",
      r.componente || "",
      r.responsable || r.actor || "",
      r.fechaLimite || "",
      r.estado || "",
      r.observacion || "",
    ]);

    const headersActividad = ["ACTOR", "COMPROMISO", "COMPONENTE", "RESPONSABLE", "FECHA", "ESTADO", "OBSERVACIÓN"];

    const map: Record<string, string> = {
      "{{objeto_proyecto}}": payload.meta.objeto_proyecto || "",
      "{{acta_no}}": payload.meta.acta_no || "",
      "{{fecha_larga}}": payload.meta.fecha_larga || "",
      "{{lugar}}": payload.meta.lugar || "",
      "{{hora_inicio}}": payload.meta.hora_inicio || "",
      "{{hora_fin}}": payload.meta.hora_fin || "",
      "{{asistentes_total}}": String(totalAsist),
      "{{resumen_comite_tecnico}}": payload.resumenReunion || "",
      "{{asistentes_sif}}": tableAsPlain(["NOMBRE", "CARGO"], det.sif.map((a) => [a.nombre || "", a.cargo || ""]), "ASISTENTES SIF"),
      "{{asistentes_edu}}": tableAsPlain(["NOMBRE", "CARGO"], det.edu.map((a) => [a.nombre || "", a.cargo || ""]), "ASISTENTES EDU"),
      "{{asistentes_interventoria}}": tableAsPlain(["NOMBRE", "CARGO"], det.int.map((a) => [a.nombre || "", a.cargo || ""]), "ASISTENTES INTERVENTORÍA"),
      "{{asistentes_contratista}}": tableAsPlain(["NOMBRE", "CARGO"], det.con.map((a) => [a.nombre || "", a.cargo || ""]), "ASISTENTES CONTRATISTA"),
      "{{tabla_actividades}}": tableAsPlain(headersActividad, rowsActividad, "TABLA ACTIVIDADES"),
      "{{tabla_compromisos}}": tableAsPlain(headersActividad, rowsActividad, "TABLA COMPROMISOS"),
    };

    for (const [k, v] of Object.entries(map)) {
      xml = xml.split(k).join(toWordInline(v));
    }

    zip.file("word/document.xml", xml);
    const out = await zip.generateAsync({ type: "nodebuffer" });

    return new NextResponse(out, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="acta_generada.docx"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "Docx generation failed", detail: String(e) }, { status: 500 });
  }
}
