# Obra Actas Web (Next.js)

Prototipo frontend para validar comportamiento en Vercel.

## Incluye

- Tabla editable de compromisos (sin reset agresivo)
- Toggle de autocompletado de observación
- Selector de estilo de redacción
- Exportación CSV local

> Nota: este prototipo NO reemplaza aún la lógica robusta de Word/Excel del app Python.

## Ejecutar local

```bash
cd web
npm install
npm run dev
```

## Build

```bash
npm run build
npm run start
```

## Deploy en Vercel

1. Importa este repo en Vercel.
2. Root Directory: `web`
3. Build Command: `npm run build`
4. Output: `.next` (auto)

## Siguiente paso (híbrido recomendado)

Conectar este frontend a un backend Python para:
- llenar plantilla Word oficial
- exportar Excel con formato institucional
- procesamiento de transcripciones
