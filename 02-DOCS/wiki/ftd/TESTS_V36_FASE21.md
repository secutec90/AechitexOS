# TESTS V-36 — Fase 2.1

Ejecutado con `node gobernanza/pruebasFase21Gobernanza.mjs`.

| Prueba | Esperado | Obtenido | Resultado |
| --- | --- | --- | --- |
| Bajo | EJECUTADA | EJECUTADA | PASA |
| Medio | APROBACIÓN HUMANA | APROBACIÓN HUMANA | PASA |
| Alto | APROBACIÓN HUMANA | APROBACIÓN HUMANA | PASA |
| Crítico | BLOQUEADA | BLOQUEADA | PASA |
| Desconocida | DENEGADA | DENEGADA | PASA |
| Argumentos inválidos | DENEGADA | DENEGADA | PASA |
| Bypass | DENEGADA | DENEGADA | PASA |
| Manipulación frontend | DENEGADA POR BACKEND | DENEGADA POR BACKEND | PASA |
| Simulación | SIN MUTACIÓN REAL | SIN MUTACIÓN REAL | PASA |
| Concurrencia | AUDITORÍA CONSISTENTE | AUDITORÍA CONSISTENTE | PASA |
| Fuente única | UNA | UNA | PASA |

Regresión de interfaz: `index.html` tiene 23 vistas `id="vista-"` y sí contiene `catalogoSecciones`.

Fallos de gobernanza: ninguno.
