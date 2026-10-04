# Fase 2.2-D — Conexión del frontend con la ejecución segura

## Intent
Hacer que la candidata pida la ejecución a `aplicarHerramientaAgenteAutorizada` y deje de cambiar el proyecto en el navegador.

## Scope
Dentro: `index.html.recuperado-v49` y la prueba de este flujo.
Fuera: `index.html`, `Codigo.gs`, `GobernanzaAgente.gs`, despliegue, commit y la constitución.

## Checklist
- [x] La misión llama a `aplicarHerramientaAgenteAutorizada` y conserva `idDecision`. Prueba: `MEDIO → EJECUTADA` y `BYPASS DE LA MISIÓN → CERRADO`.
- [x] La misión no llama a `ejecutarHerramientaAgente` ni asigna `estadoProyecto`. Prueba: el mismo resultado `CERRADO`.
- [x] `index.html` conserva 861 líneas y el hash `43C22B7D…`. Prueba: `INDEX VIVO → INTACTO`.
- [x] La fase 2.1 sigue en `RESULTADO: PASA`.

## Evidence
Antes: candidata 432509 bytes, hash `B9FBBF90C28F71B883D35EFAC643C7EA0FF22583A260692EDFD2657A7EFA6649`, 2026-10-03 21:37:35. `index.html` 25514 bytes, 861 líneas, hash `43C22B7D76E877969E8D4E787C5CB0ACB9817819C206AEE29A31DB06DA83D888`.
Después: `node gobernanza/pruebasFase22dConexionFrontend.mjs` y `node gobernanza/pruebasFase21Gobernanza.mjs` terminaron en `RESULTADO: PASA`. El hash vivo no cambió.

## Next
Esperar autorización para sustituir el `index.html` vivo. Esta fase no lo reemplaza.
