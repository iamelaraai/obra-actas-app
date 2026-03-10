"use client";

import { useMemo, useState } from "react";
import asistentesData from "../lib/asistentes_maestro.json";

type Asistente = { entidad: "SIF" | "EDU" | "Interventoría" | "Contratista"; nombre: string; cargo: string };

type Row = {
  actaNo: string;
  fechaComite: string;
  actor: "EDU" | "Contratista" | "Interventoría";
  compromiso: string;
  componente: string;
  responsable: string;
  fechaLimite: string;
  estado: string;
  notasRapidas: string;
  observacion: string;
};

const ESTADOS = ["Cumplido", "En proceso", "No cumplido", "Cumplido parcialmente", "Pendiente por definir"];
const ESTILOS = ["Interventoría formal", "Ejecutivo corto", "Operativo campo", "Neutro estándar"] as const;

function generarObs(estado: string, actor: string, compromiso: string, notas: string, estilo: string) {
  const e = estado.toLowerCase();
  if (estilo === "Ejecutivo corto") return `Compromiso ${e || "pendiente"} por ${actor}. ${notas}`.trim();
  if (estilo === "Operativo campo") return `${actor} reporta ${e || "estado pendiente"} del compromiso: ${compromiso}. Nota: ${notas || "sin detalle"}.`;
  if (estilo === "Neutro estándar") return `${actor} informa ${e || "estado pendiente"} sobre: ${compromiso}. ${notas ? `Detalle: ${notas}.` : ""}`;
  return `Desde ${actor} se informa ${e || "estado pendiente"} del compromiso: ${compromiso}. ${notas ? `Se reporta: ${notas}.` : ""}`;
}

function buildTranscriptPrompt(contexto: string, transcript: string) {
  return `Eres asistente de interventoría de obra. Redacta sección de acta en español formal y técnico.

Contexto del proyecto:
${contexto}

Transcripción de reunión:
${transcript}

Devuelve SOLO con esta estructura:
1) Decisiones tomadas
2) Avances reportados
3) Riesgos y atrasos críticos
4) Compromisos nuevos (tabla en markdown con: compromiso, responsable, fecha límite, componente)
5) Observaciones de cierre`;
}

export default function Home() {
  const [tab, setTab] = useState<"t1" | "t2" | "t3">("t1");
  const [autoObs, setAutoObs] = useState(false);
  const [estilo, setEstilo] = useState<(typeof ESTILOS)[number]>("Interventoría formal");
  const todayISO = new Date().toISOString().slice(0, 10);

  const [rows, setRows] = useState<Row[]>([
    {
      actaNo: "19",
      fechaComite: todayISO,
      actor: "EDU",
      compromiso: "",
      componente: "Técnico",
      responsable: "",
      fechaLimite: "",
      estado: "En proceso",
      notasRapidas: "",
      observacion: ""
    }
  ]);

  const [contexto, setContexto] = useState("Proyecto: Parque Primavera Norte. Documento: acta de comité de obra.");
  const [transcript, setTranscript] = useState("");
  const [audioTranscripcionUrl, setAudioTranscripcionUrl] = useState("");
  const [excelTemplateName, setExcelTemplateName] = useState<string>("");
  const [wordTemplateName, setWordTemplateName] = useState<string>("");
  const [officialTemplate, setOfficialTemplate] = useState<File | null>(null);
  const [exportingOfficial, setExportingOfficial] = useState(false);

  const [proyecto, setProyecto] = useState("Parque Primavera Norte");
  const [actaNo, setActaNo] = useState("19");
  const [fecha, setFecha] = useState(todayISO);
  const [lugar, setLugar] = useState("Campamento de obra");
  const [horaInicio, setHoraInicio] = useState("09:30 AM");
  const [horaFin, setHoraFin] = useState("11:30 AM");
  const [resumenEjecutivo, setResumenEjecutivo] = useState("");
  const [resumenReunion, setResumenReunion] = useState("");

  const asistentesCatalogo = asistentesData as Asistente[];
  const [selSIF, setSelSIF] = useState<string[]>([]);
  const [selEDU, setSelEDU] = useState<string[]>([]);
  const [selINT, setSelINT] = useState<string[]>([]);
  const [selCON, setSelCON] = useState<string[]>([]);

  const update = (idx: number, key: keyof Row, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      if (autoObs && ["estado", "notasRapidas", "compromiso", "actor"].includes(key)) {
        const r = next[idx];
        if (r.compromiso && r.estado && r.notasRapidas) {
          next[idx].observacion = generarObs(r.estado, r.actor, r.compromiso, r.notasRapidas, estilo);
        }
      }
      return next;
    });
  };

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      {
        actaNo: prev[0]?.actaNo || "",
        fechaComite: prev[0]?.fechaComite || "",
        actor: "EDU",
        compromiso: "",
        componente: "Técnico",
        responsable: "",
        fechaLimite: "",
        estado: "En proceso",
        notasRapidas: "",
        observacion: ""
      }
    ]);

  const csv = useMemo(() => {
    const headers = Object.keys(rows[0] || {}).join(",");
    const lines = rows.map((r) => Object.values(r).map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","));
    return [headers, ...lines].join("\n");
  }, [rows]);

  const prompt = useMemo(() => buildTranscriptPrompt(contexto, transcript), [contexto, transcript]);

  const namesByEntidad = (entidad: Asistente["entidad"]) =>
    asistentesCatalogo.filter((a) => a.entidad === entidad).map((a) => a.nombre);

  const asistentesTotal = selSIF.length + selEDU.length + selINT.length + selCON.length;

  const actaMd = useMemo(() => {
    const compromisos = rows
      .filter((r) => r.compromiso.trim())
      .map(
        (r) =>
          `- **${r.compromiso}** (${r.componente}) — Responsable: ${r.responsable || r.actor}. Estado: ${r.estado}. Fecha: ${r.fechaLimite || "Sin fecha"}. Observación: ${r.observacion || "N/A"}.`
      )
      .join("\n");

    return `# Acta de Comité de Obra No. ${actaNo}
**Proyecto:** ${proyecto}
**Fecha:** ${fecha}
**Lugar:** ${lugar}
**Hora inicio:** ${horaInicio}
**Hora fin:** ${horaFin}
**Asistentes:** ${asistentesTotal}

## Asistentes
- **SIF:** ${selSIF.join(", ") || "(sin selección)"}
- **EDU:** ${selEDU.join(", ") || "(sin selección)"}
- **Interventoría:** ${selINT.join(", ") || "(sin selección)"}
- **Contratista:** ${selCON.join(", ") || "(sin selección)"}

## 1) Resumen ejecutivo
${resumenEjecutivo || "(Completar)"}

## 2) Decisiones y temas relevantes
${resumenReunion || "(Pegar aquí resumen de reunión)"}

## 3) Compromisos, comentarios y observaciones
${compromisos || "(Sin compromisos cargados)"}`;
  }, [rows, actaNo, proyecto, fecha, lugar, horaInicio, horaFin, resumenEjecutivo, resumenReunion, asistentesTotal, selSIF, selEDU, selINT, selCON]);

  const exportOfficialExcel = async () => {
    if (!officialTemplate) {
      alert("Primero carga la plantilla oficial (.xlsx)");
      return;
    }
    setExportingOfficial(true);
    try {
      const payload = rows
        .filter((r) => r.compromiso.trim())
        .map((r) => ({
          actor: r.actor,
          responsable: r.responsable || r.actor,
          compromiso: r.compromiso,
          componente: r.componente,
          fechaLimite: r.fechaLimite,
          estado: r.estado,
          observacion: r.observacion,
        }));

      const fd = new FormData();
      fd.append("template", officialTemplate);
      fd.append("rows", JSON.stringify(payload));
      fd.append("sheetName", `Acta ${actaNo || "19"}`);

      const res = await fetch("/api/export-official", { method: "POST", body: fd });
      if (!res.ok) throw new Error("No se pudo generar el Excel oficial");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `compromisos_acta_${actaNo || "hoy"}_formato_oficial.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Error exportando formato oficial");
    } finally {
      setExportingOfficial(false);
    }
  };

  return (
    <div className="wrap">
      <h1 className="title">📋 Obra Actas — Web</h1>
      <p className="small">Validación web: edición estable + transcripción + acta completa (MVP).</p>
      <div className="row" style={{ marginBottom: 10 }}>
        <span className="pill">Next.js</span>
        <span className="pill">Vercel-ready</span>
        <span className="pill">MVP</span>
      </div>

      <div className="card row">
        <button className="btn" onClick={() => setTab("t1")}>1) Compromisos</button>
        <button className="btn secondary" onClick={() => setTab("t2")}>2) Transcripción</button>
        <button className="btn secondary" onClick={() => setTab("t3")}>3) Acta completa</button>
      </div>

      {tab === "t1" && (
        <>
          <div className="card row">
            <label>
              <input type="checkbox" checked={autoObs} onChange={(e) => setAutoObs(e.target.checked)} /> Autocompletar observaciones
            </label>
            <select value={estilo} onChange={(e) => setEstilo(e.target.value as (typeof ESTILOS)[number])} className="input" disabled={!autoObs}>
              {ESTILOS.map((e) => (
                <option key={e}>{e}</option>
              ))}
            </select>
            <button className="btn" onClick={addRow}>+ Agregar fila</button>
          </div>

          <div className="card" style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Acta</th><th>Fecha</th><th>Actor</th><th>Compromiso</th><th>Componente</th><th>Responsable</th><th>Fecha límite</th><th>Estado</th><th>Notas rápidas</th><th>Observación</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td><input className="input" value={r.actaNo} onChange={(e) => update(i, "actaNo", e.target.value)} /></td>
                    <td><input type="date" className="input" value={r.fechaComite} onChange={(e) => update(i, "fechaComite", e.target.value)} /></td>
                    <td>
                      <select className="input" value={r.actor} onChange={(e) => update(i, "actor", e.target.value)}>
                        <option>EDU</option><option>Contratista</option><option>Interventoría</option>
                      </select>
                    </td>
                    <td><textarea className="input" value={r.compromiso} onChange={(e) => update(i, "compromiso", e.target.value)} /></td>
                    <td><input className="input" value={r.componente} onChange={(e) => update(i, "componente", e.target.value)} /></td>
                    <td>
                      <select className="input" value={r.responsable} onChange={(e) => update(i, "responsable", e.target.value)}>
                        <option value="">(vacío)</option>
                        <option value="EDU">EDU</option>
                        <option value="Interventoría">Interventoría</option>
                        <option value="Contratista">Contratista</option>
                      </select>
                    </td>
                    <td><input type="date" className="input" value={r.fechaLimite} onChange={(e) => update(i, "fechaLimite", e.target.value)} /></td>
                    <td>
                      <select className="input" value={r.estado} onChange={(e) => update(i, "estado", e.target.value)}>
                        {ESTADOS.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td><input className="input" value={r.notasRapidas} onChange={(e) => update(i, "notasRapidas", e.target.value)} /></td>
                    <td><textarea className="input" value={r.observacion} onChange={(e) => update(i, "observacion", e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card row">
            <a className="btn secondary" href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`} download="compromisos_web.csv">
              Descargar CSV
            </a>
            <input
              type="file"
              className="input"
              accept=".xlsx"
              onChange={(e) => setOfficialTemplate(e.target.files?.[0] || null)}
            />
            <button className="btn" onClick={exportOfficialExcel} disabled={exportingOfficial || !officialTemplate}>
              {exportingOfficial ? "Generando..." : "Descargar Excel formato oficial"}
            </button>
          </div>
        </>
      )}

      {tab === "t2" && (
        <div className="card">
          <h3>Transcripción y resumen (prompt maestro)</h3>
          <p className="small">Pega transcript de reunión y úsalo en Claude/Codex/ChatGPT.</p>

          <div className="row" style={{ marginBottom: 8 }}>
            <input
              className="input"
              style={{ minWidth: 320 }}
              placeholder="Link de transcripción/audio"
              value={audioTranscripcionUrl}
              onChange={(e) => setAudioTranscripcionUrl(e.target.value)}
            />
            {audioTranscripcionUrl && (
              <a className="btn ghost" href={audioTranscripcionUrl} target="_blank" rel="noreferrer">
                Ir a transcripción/audio
              </a>
            )}
          </div>

          <div className="row" style={{ marginBottom: 8 }}>
            <label className="small">Plantilla Excel actividades: </label>
            <input
              type="file"
              className="input"
              accept=".xlsx,.xlsm"
              onChange={(e) => setExcelTemplateName(e.target.files?.[0]?.name || "")}
            />
            {excelTemplateName && <span className="small">Cargada: {excelTemplateName}</span>}
          </div>

          <div className="row" style={{ marginBottom: 8 }}>
            <label className="small">Plantilla Word acta final: </label>
            <input
              type="file"
              className="input"
              accept=".docx"
              onChange={(e) => setWordTemplateName(e.target.files?.[0]?.name || "")}
            />
            {wordTemplateName && <span className="small">Cargada: {wordTemplateName}</span>}
          </div>

          <textarea className="input" style={{ width: "100%", minHeight: 80 }} value={contexto} onChange={(e) => setContexto(e.target.value)} />
          <textarea className="input" style={{ width: "100%", minHeight: 180, marginTop: 8 }} placeholder="Pega aquí la transcripción..." value={transcript} onChange={(e) => setTranscript(e.target.value)} />
          <textarea className="input" style={{ width: "100%", minHeight: 220, marginTop: 8 }} value={prompt} readOnly />
          <a className="btn secondary" href={`data:text/plain;charset=utf-8,${encodeURIComponent(prompt)}`} download="prompt_resumen_acta.txt">
            Descargar prompt
          </a>
        </div>
      )}

      {tab === "t3" && (
        <div className="card">
          <h3>Acta completa (MVP)</h3>
          <div className="row">
            <input className="input" placeholder="Proyecto" value={proyecto} onChange={(e) => setProyecto(e.target.value)} />
            <input className="input" placeholder="No. Acta" value={actaNo} onChange={(e) => setActaNo(e.target.value)} />
            <input type="date" className="input" placeholder="Fecha" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            <input className="input" placeholder="Lugar" value={lugar} onChange={(e) => setLugar(e.target.value)} />
            <input className="input" placeholder="Hora inicio" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
            <input className="input" placeholder="Hora fin" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} />
          </div>

          <div className="card" style={{ marginTop: 8 }}>
            <h4 style={{ marginTop: 0 }}>Asistentes (multiselección pre-cargada)</h4>
            <p className="small">Tip: mantén presionado Ctrl/Cmd para seleccionar múltiples nombres.</p>
            <div className="row">
              <div>
                <label className="small">SIF</label><br />
                <select multiple className="input" style={{ minWidth: 260, minHeight: 120 }} value={selSIF} onChange={(e) => setSelSIF(Array.from(e.target.selectedOptions).map(o => o.value))}>
                  {namesByEntidad("SIF").map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="small">EDU</label><br />
                <select multiple className="input" style={{ minWidth: 260, minHeight: 120 }} value={selEDU} onChange={(e) => setSelEDU(Array.from(e.target.selectedOptions).map(o => o.value))}>
                  {namesByEntidad("EDU").map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="small">Interventoría</label><br />
                <select multiple className="input" style={{ minWidth: 260, minHeight: 120 }} value={selINT} onChange={(e) => setSelINT(Array.from(e.target.selectedOptions).map(o => o.value))}>
                  {namesByEntidad("Interventoría").map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="small">Contratista</label><br />
                <select multiple className="input" style={{ minWidth: 260, minHeight: 120 }} value={selCON} onChange={(e) => setSelCON(Array.from(e.target.selectedOptions).map(o => o.value))}>
                  {namesByEntidad("Contratista").map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="row small" style={{ marginTop: 8 }}>
            <span>Excel actividades: {excelTemplateName || "(no cargada aún)"}</span>
            <span>Word acta final: {wordTemplateName || "(no cargada aún)"}</span>
          </div>
          <textarea className="input" style={{ width: "100%", minHeight: 90, marginTop: 8 }} placeholder="Resumen ejecutivo" value={resumenEjecutivo} onChange={(e) => setResumenEjecutivo(e.target.value)} />
          <textarea className="input" style={{ width: "100%", minHeight: 140, marginTop: 8 }} placeholder="Decisiones/avances/riesgos" value={resumenReunion} onChange={(e) => setResumenReunion(e.target.value)} />
          <textarea className="input" style={{ width: "100%", minHeight: 260, marginTop: 8 }} value={actaMd} readOnly />
          <a className="btn secondary" href={`data:text/markdown;charset=utf-8,${encodeURIComponent(actaMd)}`} download={`acta_${actaNo || "hoy"}.md`}>
            Descargar Acta (.md)
          </a>
        </div>
      )}
    </div>
  );
}
