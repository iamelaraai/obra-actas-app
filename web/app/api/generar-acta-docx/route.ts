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

function tableCell(text: string, bold = false) {
  return `<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr><w:p><w:r>${bold ? "<w:rPr><w:b/></w:rPr>" : ""}<w:t>${esc(text || "")}</w:t></w:r></w:p></w:tc>`;
}

function buildTableXml(headers: string[], rows: string[][]) {
  const borders = `<w:tblBorders>
    <w:top w:val="single" w:sz="8" w:space="0" w:color="auto"/>
    <w:left w:val="single" w:sz="8" w:space="0" w:color="auto"/>
    <w:bottom w:val="single" w:sz="8" w:space="0" w:color="auto"/>
    <w:right w:val="single" w:sz="8" w:space="0" w:color="auto"/>
    <w:insideH w:val="single" w:sz="6" w:space="0" w:color="auto"/>
    <w:insideV w:val="single" w:sz="6" w:space="0" w:color="auto"/>
  </w:tblBorders>`;

  const headRow = `<w:tr>${headers.map((h) => tableCell(h, true)).join("")}</w:tr>`;
  const bodyRows = (rows.length ? rows : [["Sin registros", ...Array(Math.max(headers.length - 1, 0)).fill("")]])
    .map((r) => `<w:tr>${headers.map((_, i) => tableCell(r[i] || "")).join("")}</w:tr>`)
    .join("");

  return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/>${borders}</w:tblPr><w:tblGrid>${headers
    .map(() => `<w:gridCol w:w="2400"/>`)
    .join("")}</w:tblGrid>${headRow}${bodyRows}</w:tbl>`;
}

function replaceParagraphWithXml(xml: string, marker: string, replacementXml: string) {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`<w:p[\\s\\S]*?${escaped}[\\s\\S]*?<\\/w:p>`, "g");
  return xml.replace(regex, replacementXml);
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

    const map: Record<string, string> = {
      "{{objeto_proyecto}}": payload.meta.objeto_proyecto || "",
      "{{acta_no}}": payload.meta.acta_no || "",
      "{{fecha_larga}}": payload.meta.fecha_larga || "",
      "{{lugar}}": payload.meta.lugar || "",
      "{{hora_inicio}}": payload.meta.hora_inicio || "",
      "{{hora_fin}}": payload.meta.hora_fin || "",
      "{{asistentes_total}}": String(totalAsist),
      "{{resumen_comite_tecnico}}": payload.resumenReunion || "",
    };

    for (const [k, v] of Object.entries(map)) {
      xml = xml.split(k).join(toWordInline(v));
    }

    const det = {
      sif: payload.asistentes.sif_det || (payload.asistentes.sif || []).map((n) => ({ nombre: n, cargo: "" })),
      edu: payload.asistentes.edu_det || (payload.asistentes.edu || []).map((n) => ({ nombre: n, cargo: "" })),
      int: payload.asistentes.interventoria_det || (payload.asistentes.interventoria || []).map((n) => ({ nombre: n, cargo: "" })),
      con: payload.asistentes.contratista_det || (payload.asistentes.contratista || []).map((n) => ({ nombre: n, cargo: "" })),
    };

    xml = replaceParagraphWithXml(
      xml,
      "{{asistentes_sif}}",
      buildTableXml(["NOMBRE", "CARGO"], det.sif.map((a) => [a.nombre || "", a.cargo || ""]))
    );
    xml = replaceParagraphWithXml(
      xml,
      "{{asistentes_edu}}",
      buildTableXml(["NOMBRE", "CARGO"], det.edu.map((a) => [a.nombre || "", a.cargo || ""]))
    );
    xml = replaceParagraphWithXml(
      xml,
      "{{asistentes_interventoria}}",
      buildTableXml(["NOMBRE", "CARGO"], det.int.map((a) => [a.nombre || "", a.cargo || ""]))
    );
    xml = replaceParagraphWithXml(
      xml,
      "{{asistentes_contratista}}",
      buildTableXml(["NOMBRE", "CARGO"], det.con.map((a) => [a.nombre || "", a.cargo || ""]))
    );

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
    xml = replaceParagraphWithXml(xml, "{{tabla_actividades}}", buildTableXml(headersActividad, rowsActividad));
    xml = replaceParagraphWithXml(xml, "{{tabla_compromisos}}", buildTableXml(headersActividad, rowsActividad));

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
