"use client";

import { useMemo, useState } from "react";

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

export default function Home() {
  const [autoObs, setAutoObs] = useState(false);
  const [estilo, setEstilo] = useState<(typeof ESTILOS)[number]>("Interventoría formal");
  const [rows, setRows] = useState<Row[]>([
    {
      actaNo: "19",
      fechaComite: new Date().toLocaleDateString("es-CO"),
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

  return (
    <div className="wrap">
      <h1>Obra Actas — Web (Next.js/Vercel prototype)</h1>
      <p className="small">Objetivo: validar comportamiento en Vercel sin resets al editar/pegar.</p>

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
                <td><input className="input" value={r.fechaComite} onChange={(e) => update(i, "fechaComite", e.target.value)} /></td>
                <td>
                  <select className="input" value={r.actor} onChange={(e) => update(i, "actor", e.target.value)}>
                    <option>EDU</option><option>Contratista</option><option>Interventoría</option>
                  </select>
                </td>
                <td><textarea className="input" value={r.compromiso} onChange={(e) => update(i, "compromiso", e.target.value)} /></td>
                <td><input className="input" value={r.componente} onChange={(e) => update(i, "componente", e.target.value)} /></td>
                <td><input className="input" value={r.responsable} onChange={(e) => update(i, "responsable", e.target.value)} /></td>
                <td><input className="input" value={r.fechaLimite} onChange={(e) => update(i, "fechaLimite", e.target.value)} /></td>
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
        <a
          className="btn secondary"
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
          download="compromisos_web.csv"
        >
          Descargar CSV
        </a>
      </div>
    </div>
  );
}
