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


def make_table(doc, headers, rows):
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = 'Table Grid'
    for i, h in enumerate(headers):
        table.rows[0].cells[i].text = h

    if not rows:
        rows = [["Sin registros"] + [""] * (len(headers) - 1)]

    for row in rows:
        cells = table.add_row().cells
        for i in range(len(headers)):
            cells[i].text = str(row[i]) if i < len(row) else ""
    return table


def insert_table_after_paragraph(doc, paragraph, headers, rows):
    table = make_table(doc, headers, rows)
    try:
        paragraph._p.addnext(table._tbl)
    except Exception:
        # fallback: keep table at end if Word structure is unusual
        pass
    # add spacing paragraph after each inserted table
    doc.add_paragraph('')
    return table


def place_table_or_append(doc, marker, title, headers, rows):
    p = find_marker_paragraph(doc, marker)
    if p is not None:
        p.text = title
        insert_table_after_paragraph(doc, p, headers, rows)
    else:
        doc.add_heading(title, level=2)
        make_table(doc, headers, rows)


def place_grouped_commitments(doc, marker, rows):
    headers = ["COMPROMISOS", "COMPONENTE", "RESPONSABLE", "FECHA/COMENTARIOS", "OBSERVACIONES"]
    groups = ["EDU", "Interventoría", "Contratista"]

    p = find_marker_paragraph(doc, marker)
    anchor = p
    if p is not None:
        p.text = "Compromisos, comentarios y observaciones"
    else:
        doc.add_heading("Compromisos, comentarios y observaciones", level=2)
        anchor = doc.paragraphs[-1]

    current_anchor = anchor
    for g in groups:
        sub = [r for r in rows if (r.get("responsable") or r.get("actor") or "").strip().lower() == g.lower()]
        if not sub:
            continue

        doc.add_paragraph('')
        # heading paragraph
        hp = doc.add_paragraph(f"Compromisos {g}:")
        try:
            current_anchor._p.addnext(hp._p)
        except Exception:
            pass

        data = []
        for r in sub:
            fc = "\n".join([x for x in [r.get("fechaLimite", ""), r.get("estado", "")] if x])
            data.append([
                r.get("compromiso", ""),
                r.get("componente", ""),
                r.get("responsable", "") or r.get("actor", ""),
                fc,
                r.get("observacion", ""),
            ])

        t = insert_table_after_paragraph(doc, hp, headers, data)
        current_anchor = hp


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

    # 1) Asistentes al inicio en formato tabla por entidad
    place_table_or_append(doc, "{{asistentes_sif}}", "Por la SIF", ["NOMBRE", "CARGO"], det("sif"))
    place_table_or_append(doc, "{{asistentes_edu}}", "Por la EDU", ["NOMBRE", "CARGO"], det("edu"))
    place_table_or_append(doc, "{{asistentes_interventoria}}", "Por la Interventoría", ["NOMBRE", "CARGO"], det("interventoria"))
    place_table_or_append(doc, "{{asistentes_contratista}}", "Por la empresa contratista", ["NOMBRE", "CARGO"], det("contratista"))

    rows = payload.get("rows", [])

    # 2) Tabla de actividades general
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
    headers_actividad = ["ACTOR", "COMPROMISO", "COMPONENTE", "RESPONSABLE", "FECHA", "ESTADO", "OBSERVACIÓN"]
    place_table_or_append(doc, "{{tabla_actividades}}", "Tabla de actividades", headers_actividad, data_rows)

    # 3) Compromisos por entidad (formato solicitado)
    place_grouped_commitments(doc, "{{tabla_compromisos}}", rows)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(out_path))


if __name__ == "__main__":
    main()
