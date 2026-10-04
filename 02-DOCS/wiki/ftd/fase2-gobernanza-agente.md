# Fase 2 — Gobernanza del agente

## Intent
Interponer una capa determinista entre el tool calling de DeepSeek y las mutaciones del proyecto: catálogo único, riesgo, argumentos, aprobación humana, simulación sin efectos y auditoría. DeepSeek propone; ARCHITEX decide si algo se ejecuta.

## Scope
Dentro: catálogo `HERRAMIENTAS_AGENTES`, validador único, modal de aprobación, modo `🔎 SIMULAR MISIÓN`, hoja `_ARCHITEX_ACCIONES_AGENTE` con LockService, pruebas de las diez rutas y el informe de cierre.

Fuera: Fase 3 (Radar evolucionado, contradicciones, contexto canónico, hash de historial, modularización). No se toca el proxy de la Fase 1 (`ServicioIA`, `PropertiesService`, `ARCHITEX_DEEPSEEK_API_KEY`, `ejecutarLlamadaDeepSeekBackend`). No se reescribe el piloto de la sección 13.

Aislamiento: este directorio no es un repositorio git, así que no hay rama ni worktree. El trabajo queda en el árbol actual.

## Checklist
- [ ] Catálogo único congelado, con las seis herramientas reales más consulta de solo lectura y las críticas bloqueadas. Prueba: el script de gobernanza lista el catálogo y falla si el objeto se puede reasignar.
- [ ] Validador único delante de `ejecutarHerramientaAgente`. Prueba: las diez rutas del script devuelven el estado esperado.
- [ ] Modal con acción, efecto, proyecto, argumentos, cambios, riesgo y motivo. Prueba: el HTML contiene esos bloques y los tres botones; crítico no muestra aprobar.
- [ ] Simulación sin mutación. Prueba: un mutador de contador no se invoca cuando el modo es simulación.
- [ ] Auditoría en `Codigo.gs` con LockService y redacción de secretos. Prueba: la función y la pestaña existen; un texto con `sk-` queda redactado en el núcleo.
- [ ] Fase 1 intacta. Prueba: `index.html` no llama a `api.deepseek.com`; `Codigo.gs` conserva el proxy.
- [ ] Sintaxis del script de `index.html`. Prueba: `node --check` sobre el bloque `<script>`.

## Evidence
Pendiente de la ejecución del script de pruebas.

## Next
Insertar el núcleo en `index.html`, enganchar la misión y ejecutar las pruebas.
