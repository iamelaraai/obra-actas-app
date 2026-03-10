# Template mapping — Acta oficial v1

Archivo base: `template_acta_oficial_v1.docx`
Origen: ACTA_18_Comité_03-03-2026_Parque_Primavera_Norte_V0

## Placeholders implementados

- `{{objeto_proyecto}}`
- `{{acta_no}}`
- `{{fecha_larga}}`
- `{{lugar}}`
- `{{hora_inicio}}`
- `{{hora_fin}}`
- `{{asistentes_total}}`

## Campos pendientes para autollenado avanzado (v2)

1. Tabla de asistentes por entidad (SIF, EDU, Interventoría, Contratista)
2. Bloque de avances físicos/financieros
3. Actividades ejecutadas/proyectadas (desde excel de actividades)
4. Compromisos, comentarios y observaciones (desde tabla normalizada)

## Recomendación técnica

- Mantener esta plantilla como "canon" institucional.
- Para v2/v3, usar un motor de plantillas de docx con soporte de bloques repetidos (ej. docxtpl/Jinja) o un servicio Python que manipule tablas del docx por índice.
- Evitar cambios manuales en estructura de tablas después de fijar el mapeo, para no romper índices de llenado.
