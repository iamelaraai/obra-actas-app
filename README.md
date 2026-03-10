# Generador de Actas de Obra (teach-friendly)

Aplicación interactiva en **Streamlit** para convertir la hoja de compromisos en una sección de acta lista para Word/PDF, y preparar resumen desde transcripciones.

## Qué hace (v2)

### 1) Compromisos desde Excel
- Lee Excel de compromisos (estructura por actor: EDU / Contratista / Interventoría)
- Normaliza los datos a tabla única
- Permite editar estados y observaciones
- Genera texto de sección de acta
- Exporta a:
  - CSV normalizado
  - Markdown
  - Word (.docx)

### 2) Transcripción y resumen
- Recibe transcripción pegada por el usuario
- Genera un **prompt maestro** listo para Claude/Codex/ChatGPT
- Exporta el prompt a `.txt`

## Instalación

```bash
cd obra_actas_app
python3 -m venv .venv
source .venv/bin/activate  # mac/linux
pip install -r requirements.txt
```

## Ejecutar

```bash
streamlit run app.py
```

## Flujo semanal recomendado

1. Cargar Excel de compromisos
2. Seleccionar pestaña del comité (ej. Acta 19)
3. Revisar estados y observaciones
4. Descargar Word de sección de compromisos
5. Pegar en la plantilla oficial del acta
6. Pegar transcripción en Tab 2 y generar resumen con IA

## Enseñable en 30 min

A tu hermano solo le enseñas:
- subir archivo
- revisar tabla
- descargar Word
- pegar transcripción y usar prompt

Sin código para operar día a día.

## Roadmap

- v3: acta completa desde plantilla oficial .docx
- semáforo de compromisos vencidos
- integración opcional de transcripción automática
