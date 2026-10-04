# Fase 2.1 — Fuente única de gobernanza

## Intent
Dejar el catálogo, el riesgo y la decisión de ejecutar en un solo módulo que Apps Script despliega. El navegador puede mostrar el resultado; no puede rebajar un riesgo ni habilitar una herramienta apagada.

## Scope
Dentro: `GobernanzaAgente.gs` como único catálogo, puerta pública sin reglas internas, rechazo de overrides del cliente, pruebas de las diez rutas, constatación de `LockService` en proyectos y auditoría.
Fuera: ratificar la constitución sin aprobación humana, cambiar `ANYONE` / `USER_DEPLOYING`, pasar el entorno a producción, borrar el JSON de ejemplo, Fase 3, y rehacer `index.html`.

## Checklist
- [x] Constitución: si no hay ratificación previa, el estado sigue pendiente. Prueba: `constitution.md` conserva `pending_ratification`.
- [x] Un solo `HERRAMIENTAS_AGENTES`, ausente en `index.html`. Prueba: el script imprimió `Fuente única → UNA`.
- [x] Diez rutas con el estado pedido. Prueba: `RESULTADO: PASA` de `node gobernanza/pruebasFase21Gobernanza.mjs`.
- [x] Simulación sin escrituras de proyecto, historial ni ADR. Prueba: `Simulación → SIN MUTACIÓN REAL`.
- [x] LockService ya presente en guardar proyecto y en auditoría. Prueba: `Concurrencia → AUDITORÍA CONSISTENTE`.

## Evidence
`node gobernanza/pruebasFase21Gobernanza.mjs` terminó en `RESULTADO: PASA` (Bajo EJECUTADA, Medio y Alto APROBACIÓN HUMANA, Crítico BLOQUEADA, Desconocida y argumentos y bypass DENEGADA, manipulación DENEGADA POR BACKEND, simulación SIN MUTACIÓN REAL, concurrencia AUDITORÍA CONSISTENTE, fuente única UNA).
La misma salida dijo `REGRESION vistas 0 catalogoUi false lineasHtml 861`. `index.html` no se reescribió.

## Next
Recuperar el `index.html` de las 23 vistas desde el historial de Drive antes de cualquier `clasp push`.
