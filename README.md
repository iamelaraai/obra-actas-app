# Generador de Actas de Obra (teach-friendly)

Aplicación interactiva en **Streamlit** para convertir la hoja de compromisos en una sección de acta lista para Word/PDF.

## Qué hace

- Lee un Excel de compromisos (estructura por actor: EDU / Contratista / Interventoría)
- Normaliza los datos a tabla única
- Permite editar estados y observaciones
- Genera texto de sección de acta
- Exporta a:
  - CSV normalizado
  - Markdown
  - Word (.docx)

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

## Flujo recomendado semanal

1. Cargar el Excel de compromisos
2. Seleccionar pestaña del comité (ej. Acta 19)
3. Revisar estados y observaciones
4. Descargar Word de sección de compromisos
5. Pegar en la plantilla oficial del acta

## Enseñable en 30 min

A tu hermano solo le enseñas:
- subir archivo
- revisar tabla
- descargar Word

Sin código para operar día a día.

## Próxima mejora

- Integrar transcripción de reunión (Whisper / Otter / Teams)
- Botón de “resumen ejecutivo” automático
- Generación del acta completa desde plantilla .docx
