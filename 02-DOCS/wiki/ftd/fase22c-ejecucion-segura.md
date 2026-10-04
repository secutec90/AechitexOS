# Fase 2.2-C — Ejecución segura en el servidor

## Intent
Hacer que una herramienta del agente solo cambie el proyecto remoto después de una validación nueva, y que la aprobación humana quede atada a un identificador de un solo uso.

## Scope
Dentro: `GobernanzaAgente.gs`, el puente en `Codigo.gs` y las pruebas de la fase 2.2-C.
Fuera: `index.html`, `index.html.recuperado-v49`, despliegue, commit y la constitución.

## Checklist
- [x] `aplicarHerramientaAgenteAutorizada` valida, ejecuta, audita y usa un solo candado. Prueba: `node gobernanza/pruebasFase22EjecucionSegura.mjs` → `RESULTADO: PASA`, incluida `CONCURRENCIA → AUDITORÍA CONSISTENTE`.
- [x] `APROBAR` sin `idDecision`, reutilizado, con otros argumentos o con otro proyecto queda denegado. Prueba: las cuatro rutas MEDIO y las equivalentes ALTO devolvieron `DENEGADA`.
- [x] La simulación no escribe proyecto ni auditoría. Prueba: `SIMULACIÓN → SIN MUTACIÓN REAL`.
- [x] `node gobernanza/pruebasFase21Gobernanza.mjs` sigue en `RESULTADO: PASA`.

## Evidence
2026-10-03: las dos baterías terminaron en `RESULTADO: PASA`. El navegador de `index.html.recuperado-v49` sigue llamando a `ejecutarHerramientaAgente` y no a `aplicarHerramientaAgenteAutorizada`. Por eso la fase queda bloqueada hasta una autorización de cambio de interfaz.

## Next
Esperar autorización para el cambio mínimo de `index.html.recuperado-v49`: enviar `idDecision` y pintar el resultado del servidor, sin que el navegador escriba el proyecto.
