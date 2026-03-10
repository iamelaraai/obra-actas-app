# Generador de Actas de Obra (teach-friendly)

Aplicación interactiva en **Streamlit** para convertir la hoja de compromisos en una sección de acta y generar un borrador de acta completa en 1 clic.

## Qué hace (v3)

### 1) Compromisos desde Excel
- Lee Excel de compromisos (EDU / Contratista / Interventoría)
- Normaliza datos a tabla única
- Permite editar estados y observaciones
- Agrega semáforo por estado (🟢🟡🔴)
- Exporta a:
  - CSV normalizado
  - Markdown
  - Word (.docx)

### 2) Transcripción y resumen
- Recibe transcripción pegada por el usuario
- Genera prompt maestro listo para Claude/Codex/ChatGPT
- Exporta el prompt a `.txt`

### 3) Acta completa (1 clic)
- Formulario de metadatos (proyecto, fecha, hora, etc.)
- Integra resumen ejecutivo + decisiones
- Inserta automáticamente sección de compromisos
- Descarga acta completa en `.md` o `.docx`

## Instalación

```bash
cd obra_actas_app
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Ejecutar

```bash
streamlit run app.py
```

## Flujo semanal recomendado

1. Cargar Excel de compromisos (Tab 1)
2. Revisar/editar estados y observaciones
3. Pegar transcripción y generar resumen (Tab 2)
4. Completar metadatos y descargar acta completa (Tab 3)

## Próximos pasos (v4)

- Cargar plantilla oficial `.docx` y mapear campos
- Alertas de vencidos por fecha
- Historial de actas con versionado
