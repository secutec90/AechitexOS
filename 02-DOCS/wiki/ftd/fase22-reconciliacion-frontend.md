# Fase 2.2 — Reconciliación del frontend

## Intent
Dejar una copia de trabajo, basada en la versión 49, con las 23 secciones intactas y con viaje, aprobación y simulación si el código original no aparece. `index.html` no se sustituye.

## Scope
Dentro: `index.html.recuperado-v49`, búsqueda de fragmentos y, solo si no existen, los tres componentes faltantes conectados al backend de la fase 2.1.
Fuera: `clasp push`, commit, despliegue, constitución, `appsscript.json` y el catálogo de `GobernanzaAgente.gs`.

## Checklist
- [x] Copia de la versión 49 con hash distinto del `index.html` de 861 líneas. Prueba: copia `06C1421A…` de 422 118 bytes; `index.html` sigue en `43C22B7D…` de 25 514 bytes.
- [x] Búsqueda de `viajeDidactico`, modal y simulación en el árbol. Prueba: no hay HTML con ese marcado; solo documentos y el puntuador.
- [x] La copia cierra `</html>`, conserva 23 vistas y no contiene el catálogo de gobernanza. Prueba: `auditarCandidata.mjs` imprimió 23 vistas, sintaxis VALIDA y `prohibidas: []`.
- [x] `node gobernanza/pruebasFase21Gobernanza.mjs` sigue en `RESULTADO: PASA`.

## Evidence
La candidata `index.html.recuperado-v49` quedó en 432 509 bytes y 7 636 líneas. El viaje, el modal y la simulación se reconstruyeron ahí. `index.html` no cambió de hash.

## Next
Revisión humana antes de sustituir `index.html`. No desplegar.
