# ARCHITEX OS V-36

# RSC-3 — ESPECIFICACIÓN Y IMPLEMENTACIÓN DE PROYECCIONES FÍSICAS

## Proyecciones Físicas del Contexto Canónico (`generarProyeccionesRsc3`)

---

## 1. RESUMEN EJECUTIVO

* **Fase:** RSC-3 (Proyecciones Físicas del Contexto Canónico).
* **Ecosistema:** ARCHITEX OS V-36.
* **Módulo Generador:** `rsc/generadorProyecciones.mjs`.
* **Script de Materialización:** `rsc/ejecutarProyecciones.mjs`.
* **Suite de Pruebas:** `rsc/pruebasRsc3Proyecciones.mjs`.
* **Objetivo:** Materializar representaciones físicas especializadas del `ContextoCanonicoArchitex` en el sistema de archivos sin convertirlas en nuevas fuentes de verdad, garantizando trazabilidad por `contentHash`, inmutabilidad, no-invención y exclusión total de gobernanza y secretos.

---

## 2. ARQUITECTURA DE FLUJO Y DERIVACIÓN

Se mantiene con absoluto rigor la jerarquía arquitectónica de ARCHITEX OS:

```text
┌────────────────────────────────────────┐
│             estadoProyecto             │  ← ÚNICA FUENTE DE VERDAD PRIMARIA
└───────────────────┬────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────┐
│     normalizarContextoArchitex()       │  ← TRANSFORMACIÓN PURA (RSC-2)
└───────────────────┬────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────┐
│        ContextoCanonicoArchitex        │  ← REPRESENTACIÓN INTERMEDIA OFICIAL
└───────────────────┬────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────┐
│        generarProyeccionesRsc3()       │  ← GENERADOR DERIVADO (RSC-3)
└───────────────────┬────────────────────┘
                    │
      ┌─────────────┼─────────────┬─────────────┐
      ▼             ▼             ▼             ▼
ARCHITEX_STATE  .antigravity  .cursorrules  CLAUDE.md & skills/
```

### Reglas de Aislamiento y Derivación
1. **Consumo Exclusivo:** El generador `generarProyeccionesRsc3(contextoCanonico)` sólo acepta como entrada un objeto `ContextoCanonicoArchitex`. En ningún momento lee ni consulta directamente `estadoProyecto`.
2. **Inmutabilidad de Proyecciones Existentes:** Las proyecciones no reaccionan automáticamente a cambios en `estadoProyecto`; una mutación directa sobre el estado crudo sin re-ejecución del ciclo normalizador-proyector deja intactas las proyecciones (comprobado en la Prueba Especial de Fuente Única).
3. **No-Invención:** Ninguna proyección rellena dimensiones faltantes. Si una dimensión es `NO_IMPLEMENTADO`, se proyecta como tal explícitamente (`value: null`).
4. **Cero Gobernanza y Cero Ejecución:** Ninguna proyección incluye el catálogo `HERRAMIENTAS_AGENTES`, tokens de decisión `idDecision`, validaciones de servidor ni autorizaciones ejecutables.

---

## 3. CATÁLOGO DE PROYECCIONES FÍSICAS MATERIALIZADAS

| # | Proyección | Ruta en Repositorio | Audiencia / Consumidor | Rol |
|---|---|---|---|---|
| 1 | `ARCHITEX_STATE.json` | `ARCHITEX_STATE.json` | Herramientas estructuradas, parsers, validadores | Proyección JSON de máxima fidelidad al contexto canónico. |
| 2 | Contexto Antigravity | `.antigravity/context.md` | Antigravity OS / Agentes de Espacio de Trabajo | Documento Markdown exhaustivo con las 25 dimensiones. |
| 3 | Reglas de Cursor | `.cursorrules` | IDE Cursor / Composer | Restricciones arquitectónicas innegociables ($0 USD, LockService, es-MX). |
| 4 | Contexto Claude | `CLAUDE.md` | Claude Code / Anthropic Agents | Contexto arquitectónico sintetizado y mapa de conocimiento del repositorio. |
| 5 | Skills de Proyecto | `skills/` | Agentes con soporte de Skills (Antigravity/Cursor) | Habilidades específicas no ejecutables derivadas del contexto. |

---

## 4. DETALLE DE PROYECCIONES GENERADAS

### 4.1. `ARCHITEX_STATE.json`
* Estructura: Encabezados canónicos (`schemaVersion`, `contextVersion`, `projectVersion`, `generatedAt`, `projectId`, `tenantId`, `source`, `contentHash`) y un mapa `dimensions` con las 25 dimensiones.
* Integridad: Porta el `contentHash` SHA-256 de 64 caracteres calculado en RSC-2.
* Limpieza: Totalmente libre de secretos, funciones ejecutables o estructuras de gobernanza.

### 4.2. `.antigravity/context.md`
* Encabezado descriptivo con el `Context Hash`, versiones y metadatos.
* 25 secciones numeradas para cada dimensión canónica.
* Las 9 dimensiones sin soporte persistido en el estado del proyecto (`users`, `requirements`, `skills`, `tests`, `production`, `maintenance`, `state`, `provenance`, `integrity`) se documentan explícitamente con `*Estado:* NO_IMPLEMENTADO`.

### 4.3. `.cursorrules`
* Contiene directrices arquitectónicas para Cursor:
  - Política de costo $0 USD (sin servidores de pago ni cloud externa).
  - Concurrencia atómica obligatoria con `LockService` en Google Sheets (ADR-001).
  - Nomenclatura en español estricto (`es-MX`).
  - Terminal objetivo compatible con Windows PowerShell y CMD.
  - Frontera inviolable entre contexto descriptivo y gobernanza operativa.

### 4.4. `CLAUDE.md`
* Contexto esencial para Claude sin abrumar el prompt:
  - Resumen arquitectónico y reglas no negociables.
  - Stack tecnológico (Runtime, Persistencia, UI de 23 vistas).
  - Mapa de conocimiento hacia `02-DOCS/wiki/index.md`, `constitution.md`, `ARCHITEX_STATE.json` y `.antigravity/context.md`.
  - Resumen de 16 dimensiones implementadas y 9 dimensiones no implementadas.

### 4.5. `skills/` (Habilidades Específicas Justificadas)
1. `skills/architex-context/SKILL.md`:
   - Enseña al agente cómo interpretar `ARCHITEX_STATE.json` y el `contentHash`.
   - Instruye el respeto incondicional al marcador `NO_IMPLEMENTADO`.
2. `skills/lockservice-concurrency/SKILL.md`:
   - Documenta el patrón técnico de código obligatorio para transacciones atómicas con `LockService` (ADR-001) en Google Apps Script.

---

## 5. TRAZABILIDAD POR CONTENT HASH

Todas las proyecciones físicas emitidas comparten exactamente el mismo identificador semántico:
* **Context Hash:** Hash SHA-256 de 64 caracteres hexadecimales generado por el normalizador canónico sobre el contenido arquitectónico ordenado.
* **Independencia de `generatedAt`:** El timestamp de generación física no altera el hash canónico semántico.

---

## 6. RESULTADOS DE LA SUITE DE PRUEBAS RSC-3

Ejecutada mediante `node rsc/pruebasRsc3Proyecciones.mjs`:

| # | Prueba | Verificación Real | Resultado |
|---|---|---|---|
| 1 | TEST 1 | Mismo contexto produce idénticas proyecciones serializadas | PASS |
| 2 | TEST 2 | `generatedAt` diferente no altera `contentHash` en proyecciones | PASS |
| 3 | TEST 3 | Las 25 dimensiones aparecen en JSON y Markdown | PASS |
| 4 | TEST 4 | 9 dimensiones `NO_IMPLEMENTADO` permanecen explícitas (`value: null`) | PASS |
| 5 | TEST 5 | Exclusión absoluta de claves `sk-*`, `Bearer` y contraseñas | PASS |
| 6 | TEST 6 | Catálogos de gobernanza y tokens de decisión excluidos | PASS |
| 7 | TEST 7 | `tenantId` y `projectId` se conservan en las proyecciones | PASS |
| 8 | TEST 8 | Dos tenants distintos generan proyecciones y hashes diferentes | PASS |
| 9 | TEST 9 | Cero llamadas a `fetch` o red durante la proyección | PASS |
| 10 | TEST 10 | Inmutabilidad del objeto `ContextoCanonicoArchitex` recibido | PASS |
| 11 | TEST 11 | La función exige `ContextoCanonicoArchitex` y no lee `estadoProyecto` | PASS |
| 12 | TEST 12 | `contentHash` de `ARCHITEX_STATE.json` coincide con el contexto canónico | PASS |
| 13 | PRUEBA ESPECIAL | Modificar `estadoProyecto` no altera las proyecciones ya emitidas | PASS |
| 14 | TEST FÍSICO | Escritura aislada y existencia de todos los archivos en disco | PASS |

**Resultado consolidado:** 14/14 pruebas superadas (100% de éxito).

---

## 7. CRITERIO DE TRANSICIÓN

RSC-3 queda formalmente implementada, aislada, validada y documentada.
* Cero dependencias externas instaladas.
* Archivos del núcleo protegidos intactos (`index.html`, `GobernanzaAgente.gs`, `Codigo.gs`, `ConfiguracionBase.gs`, `appsscript.json`).
* Se respetó la prohibición de deploy, commit y push.
* Queda terminantemente prohibido avanzar a RSC-4 o F3 sin instrucción humana expresa.
