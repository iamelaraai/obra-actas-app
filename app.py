import io
import re
from datetime import datetime

import pandas as pd
import streamlit as st
from docx import Document

st.set_page_config(page_title="Actas de Obra - Generador", page_icon="📋", layout="wide")

ESTADOS = ["Cumplido", "En proceso", "No cumplido", "Cumplido parcialmente", "Pendiente por definir"]


def clean_text(v):
    if pd.isna(v):
        return ""
    return re.sub(r"\s+", " ", str(v)).strip()


def parse_fecha_estado(raw: str):
    txt = clean_text(raw)
    if not txt:
        return "", "", txt

    lines = [x.strip() for x in re.split(r"\n|\r", txt) if x.strip()]
    fecha, estado = "", ""

    if lines:
        m = re.search(r"\b(\d{1,2}/\d{1,2}/\d{2,4})\b", lines[0])
        if m:
            fecha = m.group(1)

    lowered = txt.lower()
    for e in ESTADOS:
        if e.lower() in lowered:
            estado = e
            break

    return fecha, estado, txt


def extract_block(df: pd.DataFrame, actor: str, c_comp: int, c_compo: int, c_resp: int, c_fc: int, c_obs: int):
    rows = []
    for _, row in df.iterrows():
        compromiso = clean_text(row.iloc[c_comp]) if c_comp < len(row) else ""
        componente = clean_text(row.iloc[c_compo]) if c_compo < len(row) else ""
        responsable = clean_text(row.iloc[c_resp]) if c_resp < len(row) else ""
        fecha_raw = clean_text(row.iloc[c_fc]) if c_fc < len(row) else ""
        observ = clean_text(row.iloc[c_obs]) if c_obs < len(row) else ""

        if not compromiso:
            continue

        fecha_limite, estado, fecha_comentarios = parse_fecha_estado(fecha_raw)

        rows.append(
            {
                "Actor": actor,
                "Compromiso": compromiso,
                "Componente": componente,
                "Responsable": responsable,
                "Fecha límite": fecha_limite,
                "Estado": estado,
                "Fecha/Comentarios (raw)": fecha_comentarios,
                "Observación seguimiento": observ,
            }
        )
    return rows


def parse_sheet(df: pd.DataFrame, acta_no: str, fecha_comite: str):
    blocks = []
    blocks += extract_block(df, "EDU", 1, 2, 3, 4, 5)
    blocks += extract_block(df, "Contratista", 7, 8, 9, 10, 11)
    blocks += extract_block(df, "Interventoría", 13, 14, 15, 16, 17)

    out = pd.DataFrame(blocks)
    if out.empty:
        return out

    out.insert(0, "Acta No", acta_no)
    out.insert(1, "Fecha comité", fecha_comite)
    out.insert(2, "ID compromiso", [f"A{acta_no}-{a[:3].upper()}-{str(i+1).zfill(3)}" for i, a in enumerate(out["Actor"].tolist())])
    return out


def build_summary(df: pd.DataFrame):
    total = len(df)
    by_estado = df["Estado"].fillna("").value_counts(dropna=False).to_dict()
    by_actor = df["Actor"].value_counts(dropna=False).to_dict()

    lines = [f"Total compromisos: {total}", "\nPor actor:"]
    for k, v in by_actor.items():
        lines.append(f"- {k}: {v}")

    lines.append("\nPor estado:")
    for k, v in by_estado.items():
        kk = k if k else "(sin estado)"
        lines.append(f"- {kk}: {v}")

    return "\n".join(lines)


def build_acta_text(df: pd.DataFrame):
    parts = ["## Compromisos, comentarios y observaciones\n"]
    for actor in ["EDU", "Contratista", "Interventoría"]:
        sub = df[df["Actor"] == actor]
        if sub.empty:
            continue
        parts.append(f"### {actor}")
        for _, r in sub.iterrows():
            estado = r.get("Estado", "") or "Sin estado"
            fecha = r.get("Fecha límite", "") or "Sin fecha"
            parts.append(
                f"- **{r['Compromiso']}** ({r['Componente']}) — Responsable: {r['Responsable']}. "
                f"Estado: {estado}. Fecha: {fecha}. Observación: {r.get('Observación seguimiento','') or 'N/A'}."
            )
        parts.append("")
    return "\n".join(parts)


def to_docx(texto: str):
    doc = Document()
    for line in texto.split("\n"):
        if line.startswith("## "):
            doc.add_heading(line.replace("## ", ""), level=1)
        elif line.startswith("### "):
            doc.add_heading(line.replace("### ", ""), level=2)
        elif line.startswith("- "):
            doc.add_paragraph(line[2:], style="List Bullet")
        elif line.strip() == "":
            doc.add_paragraph("")
        else:
            doc.add_paragraph(line)

    bio = io.BytesIO()
    doc.save(bio)
    bio.seek(0)
    return bio


def build_transcript_prompt(transcript: str, contexto: str):
    return f"""Eres asistente de interventoría de obra. Redacta sección de acta en español formal y técnico.

Contexto del proyecto:
{contexto}

Transcripción de reunión:
{transcript}

Devuelve SOLO con esta estructura:
1) Decisiones tomadas
2) Avances reportados
3) Riesgos y atrasos críticos
4) Compromisos nuevos (tabla en markdown con: compromiso, responsable, fecha límite, componente)
5) Observaciones de cierre
"""


st.title("📋 Generador de Actas de Obra (teach-friendly)")
st.caption("Excel → compromisos normalizados → sección de acta Word/PDF + apoyo de transcripción")

tab1, tab2 = st.tabs(["1) Compromisos desde Excel", "2) Transcripción y resumen (v2)"])

with tab1:
    with st.expander("Cómo usar (rápido)", expanded=True):
        st.markdown(
            """
1. Sube el Excel de compromisos.
2. Elige la pestaña (por ejemplo, `Acta 19`).
3. Revisa/edita estados y observaciones en la tabla.
4. Descarga:
   - Base normalizada (CSV)
   - Texto de acta (Markdown)
   - Word (.docx)
            """
        )

    archivo = st.file_uploader("Sube el Excel de compromisos", type=["xlsx", "xlsm", "xlsb"], key="excel")

    if archivo is not None:
        xls = pd.ExcelFile(archivo)
        sheet = st.selectbox("Pestaña", xls.sheet_names, index=max(len(xls.sheet_names) - 1, 0))

        c1, c2 = st.columns(2)
        with c1:
            acta_no = st.text_input("Acta No", value=re.sub(r"\D", "", sheet) or "")
        with c2:
            fecha_comite = st.text_input("Fecha comité", value=datetime.now().strftime("%d/%m/%Y"))

        raw = pd.read_excel(archivo, sheet_name=sheet, header=None)
        data = parse_sheet(raw, acta_no=acta_no or "", fecha_comite=fecha_comite)

        if data.empty:
            st.warning("No se detectaron compromisos con la estructura esperada en esta pestaña.")
        else:
            st.subheader("Tabla normalizada (editable)")
            editable = st.data_editor(
                data,
                use_container_width=True,
                num_rows="dynamic",
                column_config={"Estado": st.column_config.SelectboxColumn("Estado", options=[""] + ESTADOS)},
            )

            st.subheader("Resumen")
            st.text(build_summary(editable))

            texto_acta = build_acta_text(editable)

            st.subheader("Texto para acta")
            st.text_area("Sección de compromisos (copiar/pegar en Word)", value=texto_acta, height=300)

            c3, c4, c5 = st.columns(3)
            with c3:
                st.download_button(
                    "⬇️ Descargar CSV normalizado",
                    data=editable.to_csv(index=False).encode("utf-8"),
                    file_name=f"compromisos_acta_{acta_no or sheet}.csv",
                    mime="text/csv",
                )
            with c4:
                st.download_button(
                    "⬇️ Descargar Markdown",
                    data=texto_acta.encode("utf-8"),
                    file_name=f"seccion_compromisos_acta_{acta_no or sheet}.md",
                    mime="text/markdown",
                )
            with c5:
                st.download_button(
                    "⬇️ Descargar Word (.docx)",
                    data=to_docx(texto_acta),
                    file_name=f"seccion_compromisos_acta_{acta_no or sheet}.docx",
                    mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                )

with tab2:
    st.markdown("### Asistente para reuniones (sin API obligatoria)")
    st.caption("Pega transcripción y la app te arma un prompt maestro para usar en Claude/Codex/ChatGPT.")

    contexto = st.text_area(
        "Contexto del proyecto",
        value="Proyecto: Parque Primavera Norte. Documento: acta de comité de obra.",
        height=80,
    )
    transcript = st.text_area("Transcripción de reunión", height=240, placeholder="Pega aquí la transcripción...")

    if transcript.strip():
        prompt = build_transcript_prompt(transcript.strip(), contexto.strip())
        st.subheader("Prompt listo para IA")
        st.code(prompt, language="markdown")

        st.download_button(
            "⬇️ Descargar prompt (.txt)",
            data=prompt.encode("utf-8"),
            file_name="prompt_resumen_acta.txt",
            mime="text/plain",
        )

        st.info("Tip: usa este prompt en Claude/Codex y pega el resultado en el acta. Luego cruza compromisos nuevos con la tabla del Tab 1.")

st.divider()
st.caption("Próximo paso: v3 con generación de acta completa desde plantilla oficial (.docx).")
