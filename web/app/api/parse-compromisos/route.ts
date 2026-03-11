import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export const runtime = "nodejs";

type OutRow = {
  actor: string;
  compromiso: string;
  componente: string;
  responsable: string;
  fechaLimite: string;
  estado: string;
  observacion: string;
};

function splitFechaEstado(v: string) {
  const txt = (v || "").trim();
  if (!txt) return { fechaLimite: "", estado: "" };
  const lines = txt.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  if (lines.length === 1) return { fechaLimite: lines[0], estado: "" };
  return { fechaLimite: lines[0], estado: lines.slice(1).join(" ") };
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(await file.arrayBuffer()));
    const ws = wb.worksheets[0];
    if (!ws) return NextResponse.json({ rows: [] });

    const rows: OutRow[] = [];

    // Try simple format first (headers in row 1)
    const header = ws.getRow(1).values as any[];
    const headerStr = header.map((x) => String(x || "").toLowerCase());
    const hasSimple = headerStr.some((h) => h.includes("compromiso")) && headerStr.some((h) => h.includes("responsable"));

    if (hasSimple) {
      const idx = (name: string) => headerStr.findIndex((h) => h.includes(name));
      const iActor = idx("actor");
      const iComp = idx("compromiso");
      const iCompo = idx("componente");
      const iResp = idx("responsable");
      const iFecha = idx("fecha límite") >= 0 ? idx("fecha límite") : idx("fecha");
      const iEstado = idx("estado");
      const iObs = idx("observ") >= 0 ? idx("observ") : -1;

      ws.eachRow((r, n) => {
        if (n === 1) return;
        const compromiso = String(r.getCell(iComp).value || "").trim();
        if (!compromiso) return;
        rows.push({
          actor: String(r.getCell(iActor).value || "").trim() || String(r.getCell(iResp).value || "").trim(),
          compromiso,
          componente: String(r.getCell(iCompo).value || "").trim(),
          responsable: String(r.getCell(iResp).value || "").trim(),
          fechaLimite: String(r.getCell(iFecha).value || "").trim(),
          estado: String(r.getCell(iEstado).value || "").trim(),
          observacion: iObs > 0 ? String(r.getCell(iObs).value || "").trim() : "",
        });
      });

      return NextResponse.json({ rows });
    }

    // Official template blocks: EDU B:F, CONTRATISTA H:L, INTERVENTORIA N:R
    const blocks = [
      { actor: "EDU", cComp: 2, cCompo: 3, cResp: 4, cFC: 5, cObs: 6 },
      { actor: "Contratista", cComp: 8, cCompo: 9, cResp: 10, cFC: 11, cObs: 12 },
      { actor: "Interventoría", cComp: 14, cCompo: 15, cResp: 16, cFC: 17, cObs: 18 },
    ];

    for (const b of blocks) {
      for (let r = 4; r <= Math.min(ws.rowCount, 260); r++) {
        const compromiso = String(ws.getCell(r, b.cComp).value || "").trim();
        if (!compromiso) continue;
        const componente = String(ws.getCell(r, b.cCompo).value || "").trim();
        const responsable = String(ws.getCell(r, b.cResp).value || "").trim() || b.actor;
        const fcRaw = String(ws.getCell(r, b.cFC).value || "").trim();
        const { fechaLimite, estado } = splitFechaEstado(fcRaw);
        const observacion = String(ws.getCell(r, b.cObs).value || "").trim();
        rows.push({ actor: b.actor, compromiso, componente, responsable, fechaLimite, estado, observacion });
      }
    }

    return NextResponse.json({ rows });
  } catch (e) {
    return NextResponse.json({ error: "Parse failed", detail: String(e) }, { status: 500 });
  }
}
