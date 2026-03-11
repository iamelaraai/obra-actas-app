import { NextResponse } from "next/server";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const runtime = "nodejs";

export async function POST(req: Request) {
  let tempDir = "";
  try {
    const form = await req.formData();
    const template = form.get("template") as File | null;
    const payloadRaw = form.get("payload") as string | null;

    if (!template || !payloadRaw) {
      return NextResponse.json({ error: "Missing template or payload" }, { status: 400 });
    }

    tempDir = await mkdtemp(path.join(tmpdir(), "acta-docx-"));
    const templatePath = path.join(tempDir, "template.docx");
    const payloadPath = path.join(tempDir, "payload.json");
    const outputPath = path.join(tempDir, "acta_generada.docx");

    await writeFile(templatePath, Buffer.from(await template.arrayBuffer()));
    await writeFile(payloadPath, payloadRaw, "utf-8");

    const scriptPath = path.resolve(process.cwd(), "..", "scripts", "generate_acta_docx.py");

    await execFileAsync("python3", [scriptPath, templatePath, payloadPath, outputPath]);

    const out = await readFile(outputPath);
    return new NextResponse(out, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="acta_generada.docx"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "Docx generation failed", detail: String(e) }, { status: 500 });
  } finally {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
