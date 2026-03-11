import json
import sys
from pathlib import Path
from docx import Document


def iter_paragraphs(doc):
    for p in doc.paragraphs:
        yield p
    for t in doc.tables:
        for r in t.rows:
            for c in r.cells:
                for p in c.paragraphs:
                    yield p


def replace_all_text(doc, mapping):
    for p in iter_paragraphs(doc):
        txt = p.text or ""
        new_txt = txt
        for k, v in mapping.items():
            if k in new_txt:
                new_txt = new_txt.replace(k, str(v))
        if new_txt != txt:
            p.text = new_txt


def find_marker_paragraph(doc, marker):
    for p in doc.paragraphs:
        if marker in (p.text or ""):
            return p
    for t in doc.tables:
        for r in t.rows:
            for c in r.cells:
                for p in c.paragraphs:
                    if marker in (p.text or ""):
                        return p
    return None


def insert_table_after(doc, paragraph, headers, rows):
    parent = paragraph._parent

    # Some parents (cells/body) behave differently; use safest insertion path.
    try:
        table = parent.add_table(rows=1, cols=len(headers))
    except Exception:
        table = doc.add_table(rows=1, cols=len(headers))

    for i, h in enumerate(headers):
        table.rows[0].cells[i].text = h

    if not rows:
        rows = [["Sin registros"] + [""] * (len(headers) - 1)]

    for row in rows:
        cells = table.add_row().cells
        for i in range(len(headers)):
            cells[i].text = str(row[i]) if i < len(row) else ""

    return table


def place_table_or_append(doc, marker, title, headers, rows):
    p = find_marker_paragraph(doc, marker)
    if p is not None:
        p.text = title
        insert_table_after(doc, p, headers, rows)
    else:
        doc.add_heading(title, level=2)
        t = doc.add_table(rows=1, cols=len(headers))
        for i, h in enumerate(headers):
            t.rows[0].cells[i].text = h
        if not rows:
            rows = [["Sin registros"] + [""] * (len(headers) - 1)]
        for row in rows:
            cells = t.add_row().cells
            for i in range(len(headers)):
                cells[i].text = str(row[i]) if i < len(row) else ""


def main():
    if len(sys.argv) != 4:
        print("Usage: generate_acta_docx.py <template.docx> <payload.json> <output.docx>")
        sys.exit(1)

    template_path = Path(sys.argv[1])
    payload_path = Path(sys.argv[2])
    out_path = Path(sys.argv[3])

    payload = json.loads(payload_path.read_text(encoding="utf-8"))

    doc = Document(str(template_path))

    asistentes = payload.get("asistentes", {})
    total_asist = sum(len(asistentes.get(k, [])) for k in ["sif", "edu", "interventoria", "contratista"])

    mapping = {
        "{{objeto_proyecto}}": payload.get("meta", {}).get("objeto_proyecto", ""),
        "{{acta_no}}": payload.get("meta", {}).get("acta_no", ""),
        "{{fecha_larga}}": payload.get("meta", {}).get("fecha_larga", ""),
        "{{lugar}}": payload.get("meta", {}).get("lugar", ""),
        "{{hora_inicio}}": payload.get("meta", {}).get("hora_inicio", ""),
        "{{hora_fin}}": payload.get("meta", {}).get("hora_fin", ""),
        "{{asistentes_total}}": str(total_asist),
        "{{resumen_comite_tecnico}}": payload.get("resumenReunion", ""),
    }

    replace_all_text(doc, mapping)

    def det(key):
        arr = asistentes.get(f"{key}_det")
        if arr:
            return [[x.get("nombre", ""), x.get("cargo", "")] for x in arr]
        return [[n, ""] for n in asistentes.get(key, [])]

    place_table_or_append(doc, "{{asistentes_sif}}", "Asistentes SIF", ["NOMBRE", "CARGO"], det("sif"))
    place_table_or_append(doc, "{{asistentes_edu}}", "Asistentes EDU", ["NOMBRE", "CARGO"], det("edu"))
    place_table_or_append(doc, "{{asistentes_interventoria}}", "Asistentes Interventoría", ["NOMBRE", "CARGO"], det("interventoria"))
    place_table_or_append(doc, "{{asistentes_contratista}}", "Asistentes Contratista", ["NOMBRE", "CARGO"], det("contratista"))

    rows = payload.get("rows", [])
    data_rows = [
        [
            r.get("actor", ""),
            r.get("compromiso", ""),
            r.get("componente", ""),
            r.get("responsable", "") or r.get("actor", ""),
            r.get("fechaLimite", ""),
            r.get("estado", ""),
            r.get("observacion", ""),
        ]
        for r in rows
    ]

    headers = ["ACTOR", "COMPROMISO", "COMPONENTE", "RESPONSABLE", "FECHA", "ESTADO", "OBSERVACIÓN"]
    place_table_or_append(doc, "{{tabla_actividades}}", "Tabla de actividades", headers, data_rows)
    place_table_or_append(doc, "{{tabla_compromisos}}", "Tabla de compromisos", headers, data_rows)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(out_path))


if __name__ == "__main__":
    main()
