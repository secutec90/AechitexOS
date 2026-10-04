# ARCHITEX OS V-36

# CIERRE FASE 2 — GOBERNANZA Y EJECUCIÓN SEGURA

## Estado

```text
FASE 2: CERRADA
```

## Subfases

| Fase | Resultado |
| :--- | :---: |
| 2.1 Fuente única de gobernanza | **PASS** |
| 2.2-C Ejecución segura backend | **PASS** |
| 2.2-D Conexión frontend | **PASS** |
| 2.2-E Validación integral | **PASS** |
| 2.2-F Sincronización de estado | **PASS** |

## Principio resultante

```text
DeepSeek razona.
ARCHITEX gobierna.
Backend ejecuta.
Frontend refleja.
```

## Seguridad

* **Catálogo único en backend:** La fuente de verdad inmutable reside exclusivamente en `GobernanzaAgente.gs` (`HERRAMIENTAS_AGENTES`).
* **Permisos no controlables desde cliente:** El navegador no puede sobreescribir riesgo, categorías ni políticas de ejecución.
* **Aprobación humana obligatoria:** Herramientas de riesgo `MEDIO` y `ALTO` exigen aprobación humana mediante modal explícito.
* **Token `idDecision` de un solo uso:** Generado en backend, no inventable por el navegador, con expiración y uso único estricto.
* **Concurrencia con `LockService`:** Toda mutación y auditoría se realiza bajo control de script lock (`LockService.getScriptLock()`) con espera de 15s.
* **Auditoría inmutable:** Cada solicitud (ejecutada, denegada, bloqueada o simulada) queda registrada con timestamp y modo.
* **Simulación estricta:** En `modoSimulacion: true`, no se ejecutan mutaciones ni en backend ni en frontend.
* **Protección contra bypass:** La función cliente `ejecutarHerramientaAgente()` fue neutralizada (`status: "sin_mutacion", mutacionReal: false`).
* **Aislamiento de credenciales:** Ninguna clave API, Bearer token ni endpoint directo de DeepSeek existe en el HTML; toda inferencia viaja por `ServicioIA` -> `google.script.run` -> Apps Script.

## Consistencia

```text
Servidor
=
estadoProyecto
=
DOM
=
localStorage
```

después de una mutación autorizada.

Se eliminó definitivamente el *Riesgo de Estado Obsoleto* gracias al contrato post-ejecución:
1. Backend persiste bajo `LockService`.
2. Backend retorna `EJECUTADA` + `proyectoActualizado`.
3. Frontend ejecuta `sincronizarEstadoDesdeServidor(proyectoActualizado)`.
4. El guardado manual posterior preserva el estado nuevo sin revertir al estado anterior.

## Recuperación

* **Versión V49 recuperada y promovida:** `index.html` (433,330 bytes, 7,643 líneas).
  - SHA-256: `39513077F47C5C290B1AB89E1A36BE484027A4D88662BD890A11B8962E50027E`
* **Respaldo del index anterior intacto:** `index.html.pre-v49-backup` (25,514 bytes, 861 líneas).
  - SHA-256: `43C22B7D76E877969E8D4E787C5CB0ACB9817819C206AEE29A31DB06DA83D888`

## Deploy

```text
NO REALIZADO
```

## Commit

```text
NO REALIZADO
```

## FASE 3

```text
NO INICIADA
```

## RSC-Harness

```text
NO INICIADO
```
