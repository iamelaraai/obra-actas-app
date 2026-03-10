import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export const runtime = "nodejs";

type Row = {
  actor?: string;
  responsable?: string;
  compromiso?: string;
  componente?: string;
  fechaLimite?: string;
  estado?: string;
  observacion?: string;
};

function keyFor(value?: string) {
  return (value || "").trim().toLowerCase();
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const template = form.get("template") as File | null;
    const rowsRaw = form.get("rows") as string | null;
    const sheetName = (form.get("sheetName") as string | null) || "Acta 19";

    if (!template || !rowsRaw) {
      return NextResponse.json({ error: "Missing template or rows" }, { status: 400 });
    }

    const rows: Row[] = JSON.parse(rowsRaw);
    const workbook = new ExcelJS.Workbook();
    const buffer = Buffer.from(await template.arrayBuffer());
    await workbook.xlsx.load(buffer);

    const ws = workbook.getWorksheet(sheetName) || workbook.worksheets[workbook.worksheets.length - 1];
    if (!ws) return NextResponse.json({ error: "No worksheet found" }, { status: 400 });

    // Clear target ranges
    for (let r = 4; r <= 220; r++) {
      for (const c of [2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18]) {
        ws.getCell(r, c).value = null;
      }
    }

    const baseCols: Record<string, number> = {
      edu: 2,
      contratista: 8,
      "interventoría": 14,
      interventoria: 14,
    };

    const nextRow: Record<number, number> = { 2: 4, 8: 4, 14: 4 };

    const fills: Record<string, ExcelJS.Fill> = {
      cumplido: { type: "pattern", pattern: "solid", fgColor: { argb: "FF92D050" } },
      "en proceso": { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } },
      "cumplido parcialmente": { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } },
      "pendiente por definir": { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } },
      "no cumplido": { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF0000" } },
    };

    for (const row of rows) {
      const kResp = keyFor(row.responsable);
      const kActor = keyFor(row.actor);
      const base = baseCols[kResp] || baseCols[kActor] || 2;
      const rr = nextRow[base]++;

      ws.getCell(rr, base).value = row.compromiso || "";
      ws.getCell(rr, base + 1).value = row.componente || "";
      ws.getCell(rr, base + 2).value = row.responsable || row.actor || "";

      const fc = [row.fechaLimite || "", row.estado || ""].filter(Boolean).join("\n");
      const fcCell = ws.getCell(rr, base + 3);
      fcCell.value = fc;
      const f = fills[keyFor(row.estado)];
      if (f) fcCell.fill = f;

      ws.getCell(rr, base + 4).value = row.observacion || "";
    }

    const out = await workbook.xlsx.writeBuffer();
    return new NextResponse(Buffer.from(out), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="compromisos_formato_oficial.xlsx"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "Export failed", detail: String(e) }, { status: 500 });
  }
}
