# Plan V4 — Acta oficial autollenable (mantener logos + formato)

Fecha: 2026-03-09
Estado: En progreso

## Objetivo
Generar y usar una plantilla oficial `.docx` (con logos/estructura institucional) para descargar el acta con formato final, llenando automáticamente el mayor número de campos posible desde la app.

---

## Entregables

1. `template_acta_oficial.docx` (base editable con placeholders)
2. `template_mapping.md` (inventario de campos y reglas de llenado)
3. Módulo en app para:
   - cargar plantilla oficial
   - llenar campos básicos (encabezado)
   - llenar asistentes desde catálogo + selección
   - insertar compromisos en bloque oficial
   - descargar `.docx` final
4. `asistentes_maestro.csv` inicial (estructura)
5. Guía de uso `README` actualizada (flujo oficial)

---

## Fases de implementación

### Fase 0 — Evaluación de migración Next.js/Vercel (solicitado)
- [ ] Definir alcance de migración (solo frontend o frontend+backend).
- [ ] Diseñar arquitectura objetivo recomendada:
  - Frontend: Next.js (Vercel)
  - Backend de documentos: Python service (Render/Railway/Fly) para `.docx/.xlsx`
- [ ] Validar riesgos de migrar lógica de Word/Excel 100% a Node (complejidad alta).
- [ ] Entregar decisión técnica escrita: 
  - Opción A (híbrida): Next.js + API Python
  - Opción B (full Node): solo si se acepta menor robustez en formato Office
- [ ] Plan de transición por etapas sin frenar operación actual en Streamlit.


### Fase 1 — Plantilla y mapeo (alta prioridad)
- [ ] Crear copia de trabajo de la acta oficial como plantilla.
- [ ] Definir placeholders simples:
  - `{{acta_no}}`, `{{fecha}}`, `{{lugar}}`, `{{hora_inicio}}`, `{{hora_fin}}`, `{{asistentes_total}}`
- [ ] Mapear secciones por tablas/párrafos:
  - Asistentes por entidad
  - Compromisos por entidad
  - Comentarios/observaciones
- [ ] Documento `template_mapping.md` con rutas de llenado.

### Fase 2 — App (MVP oficial)
- [ ] Nuevo bloque/tab "Acta oficial" en Streamlit.
- [ ] Carga de plantilla `.docx`.
- [ ] Form de metadatos básicos.
- [ ] Generador de acta completa `.docx` preservando formato.
- [ ] Integrar compromisos capturados de Tab 0.

### Fase 3 — Asistentes desplegables
- [ ] Crear `asistentes_maestro.csv` con columnas:
  - entidad, nombre, cargo, activo
- [ ] UI: multiselect por entidad.
- [ ] Botón "agregar asistente nuevo".
- [ ] Relleno automático de tabla de asistentes en el acta.

### Fase 4 — Calidad y cierre
- [ ] Validaciones: campos obligatorios antes de exportar.
- [ ] Prueba con 2 actas reales (A18/A19).
- [ ] Corrección de desbordes de texto/tablas.
- [ ] README final con tutorial de 10 min.

---

## Reglas de diseño

- No romper estilos institucionales (logos, cabeceras, tabla)
- Cambios mínimos sobre plantilla oficial
- Priorizar estabilidad de edición sobre automatismos agresivos
- Cualquier autocompletado debe ser opcional

---

## Riesgos conocidos

1. Placeholders en Word dentro de runs fragmentados pueden no reemplazarse limpio.
2. Tablas con merges complejos requieren inserción por posición exacta.
3. Diferencias entre actas (variaciones de formato) pueden romper mapeo duro.

Mitigación:
- usar plantilla "canon" única
- mantener `template_mapping.md` versionado
- pruebas con muestras reales por versión

---

## Próximo paso al retomar

1. Crear `template_mapping.md` desde el documento oficial.
2. Implementar función `fill_official_docx(template, payload)`.
3. Integrar botón `Descargar acta oficial completa` en app.
