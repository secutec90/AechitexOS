# ARCHITEX OS V-36

# RSC-6 — ESPECIFICACIÓN Y HARNESS CLI DE CONTEXTO

## Integración del RSC-Harness y Punto de Entrada Unificado para Agentes Externos

---

## 1. RESUMEN EJECUTIVO

* **Fase:** RSC-6 (Integración del RSC-Harness).
* **Ecosistema:** ARCHITEX OS V-36.
* **Módulo CLI Wrapper:** `rsc/harnessContexto.mjs`.
* **Suite de Pruebas:** `rsc/pruebasRsc6Harness.mjs`.
* **Especificación:** `02-DOCS/wiki/ftd/RSC-6_ESPECIFICACION_Y_HARNESS.md`.
* **Naturaleza del Componente:** **Thin CLI Wrapper** sobre RSC-4 (`rsc/verificadorContexto.mjs`).
* **Objetivo:** Proveer un punto de entrada unificado y determinista para consultar, certificar e inspeccionar la validez del contexto de ARCHITEX OS V-36 antes de su consumo por agentes de IA externos (Antigravity, Cursor, Claude) o ingenieros humanos.

> [!IMPORTANT]
> **MECANISMO COOPERATIVO DE CERTIFICACIÓN:** El RSC-Harness **NO** es un firewall a nivel de sistema operativo ni puede bloquear físicamente llamadas de lectura a bajo nivel (`fs.readFile`, `view_file`). Es un protocolo de **certificación cooperativa y gobernada** que dictamina formalmente si el contexto proyectado es `aptoParaConsumo === true` (Código de salida `0`) o `false` (Código de salida `1`).

---

## 2. ARQUITECTURA DE INTEGRACIÓN Y FRONTERAS

El RSC-Harness se sitúa en la capa externa de consulta, preservando la separación estricta:

```text
========================================================================
                      CAPA DE FUENTE DE VERDAD
========================================================================
                           estadoProyecto
                                 ↓
========================================================================
                      CAPA CANÓNICA (RSC-2)
========================================================================
                    normalizarContextoArchitex()
                                 ↓
                     ContextoCanonicoArchitex
                                 ↓
========================================================================
                    CAPA DE PROYECCIONES (RSC-3)
========================================================================
      ARCHITEX_STATE.json | .cursorrules | CLAUDE.md | .antigravity/ | skills/
                                 ↓
========================================================================
                    CAPA DE VERIFICACIÓN (RSC-4)
========================================================================
               verificarContextoRsc4() / verificarTextoProyeccion()
                                 ↑
========================================================================
               CAPA RSC-6: THIN CLI WRAPPER (RSC-HARNESS)
========================================================================
                       rsc/harnessContexto.mjs
       [verificar]       [inspeccionar]       [solicitar-regeneracion]
            ↓                   ↓                        ↓
       Exit Code 0/1       Exit Code 0/1           Exit Code 0/1
     (Humano o --json)   (Humano o --json)       (Plantilla RSC-5)
            ↓                   ↓                        ↓
========================================================================
                    CONSUMIDORES EXTERNOS Y AGENTES
========================================================================
                 Antigravity | Cursor | Claude | Desarrollador
```

### Reglas Arquitectónicas Innegociables
1. **Thin Wrapper sin Duplicación:** `harnessContexto.mjs` no implementa algoritmos de hashing SHA-256, no parsea esquemas JSON Schema de forma independiente, no implementa regex de detección de secretos ni realiza comparaciones estructurales por cuenta propia. Delega el 100% de esta lógica a `verificadorContexto.mjs` (RSC-4).
2. **Cero Auto-Sync y Cero Watchers:** No existen demonios de fondo, escuchadores de cambios de archivos ni sincronización automática.
3. **`solicitar-regeneracion` es de Solo Lectura:** El comando no ejecuta regeneración ni reemplaza archivos en disco. Únicamente prepara la estructura formal de solicitud para autorización humana explícita.
4. **Cero Gobernanza y Cero Ejecución:** El Harness no otorga permisos de ejecución, no modifica `GobernanzaAgente.gs`, no emite tokens `idDecision` y no interactúa con herramientas de Google Apps Script.

---

## 3. ESPECIFICACIÓN DE COMANDOS CLI

La interfaz de línea de comandos se invoca mediante Node.js:

```bash
node rsc/harnessContexto.mjs [comando] [opciones]
```

### 3.1. `verificar` (Comando por Defecto)
Evalúa el conjunto de proyecciones activas contra el esquema canónico y las cabeceras de sincronización:
* **Entrada:** Opcionalmente `--tenantId <id>`, `--projectId <id>`, `--json`.
* **Comportamiento:**
  * Lee `ARCHITEX_STATE.json` y valida su integridad y ausencia de secretos con RSC-4.
  * Audita los archivos derivados (`.antigravity/context.md`, `.cursorrules`, `CLAUDE.md`, `skills/`).
  * Valida coherencia de `tenantId` y `projectId`.
* **Salida:**
  * Si es válido y completo: Código de salida `0`.
  * Si es desactualizado, inválido, incompleto o no verificable: Código de salida `1`.

### 3.2. `inspeccionar`
Proporciona una vista diagnóstica detallada de las proyecciones activas:
* **Entrada:** `--json` (opcional).
* **Comportamiento:** Muestra la descomposición de cada archivo proyectado, su presencia física en el sistema de archivos, el hash detectado y si está alineado con la representación canónica activa.
* **Salida:** Mismo criterio de código de salida (`0` si apto, `1` si no apto).

### 3.3. `solicitar-regeneracion`
Prepara una solicitud formal de autorización para regenerar las proyecciones:
* **Entrada:** `--json` (opcional).
* **Comportamiento:**
  * Inspecciona el estado de desalineación o desactualización del contexto.
  * Si se pasa el contexto canónico actual, delega en `prepararRegeneracion()` y `crearSolicitudAutorizacion()` de RSC-5 para emitir la estructura que el humano debe visar.
  * Emite advertencia explícita de que **ningún archivo es modificado automáticamente**.
* **Salida:** Código de salida según la validez del estado evaluado (`0` si estaba apto, `1` si requería regeneración).

---

## 4. BANDERAS Y FORMATOS DE SALIDA

### 4.1. Salida Humana (Predeterminada)
Diseñada para terminales interactivas con encabezados y tabla de archivos:
```text
========================================================================
 ARCHITEX OS V-36 — RSC-HARNESS (CERTIFICACIÓN DE CONTEXTO)
========================================================================
Comando:          VERIFICAR
Fecha/Hora:       2026-10-04T21:00:00.000Z
Estado Contexto:  VALIDO
Apto p/ Consumo:  SÍ (EXIT 0)
Project ID:       architex_os_v36
Tenant ID:        no
Content Hash:     a7f5b82c...
------------------------------------------------------------------------
Diagnóstico:      Proyección estructurada verificada.
Acción:           El contexto es canónico y consistente. El agente puede operar en modo sólo lectura.
------------------------------------------------------------------------
Archivos Auditados:
  [OK]           ARCHITEX_STATE.json
  [OK]           .antigravity/context.md
  [OK]           .cursorrules
  [OK]           CLAUDE.md
  [OK]           skills/architex-context/SKILL.md
  [OK]           skills/lockservice-concurrency/SKILL.md
========================================================================
```

### 4.2. Salida Estructurada (`--json`)
Diseñada para agentes automatizados y scripts:
```json
{
  "comando": "verificar",
  "timestamp": "2026-10-04T21:00:00.000Z",
  "estadoContexto": "VALIDO",
  "aptoParaConsumo": true,
  "identidad": {
    "tenantId": "no",
    "projectId": "architex_os_v36",
    "contentHash": "a7f5b82c..."
  },
  "archivosAuditados": [
    {
      "ruta": "ARCHITEX_STATE.json",
      "existe": true,
      "hashDeclarado": "a7f5b82c...",
      "coincideConCanonica": true
    },
    {
      "ruta": ".cursorrules",
      "existe": true,
      "hashDeclarado": "a7f5b82c...",
      "coincideConCanonica": true
    }
  ],
  "mensaje": "Proyección estructurada verificada.",
  "accionRequerida": "El contexto es canónico y consistente. El agente puede operar en modo sólo lectura."
}
```

---

## 5. MATRIZ DE SEMÁNTICA MULTI-TENANT Y PROYECTO

La regla de coincidencia `validarCoincidenciaTenant()` resuelve la coexistencia de proyectos monotenant históricos de V-36 con futuros despliegues multi-tenant:

| Tenant Proyectado | Tenant Esperado | Diagnóstico | `aptoParaConsumo` | Código Salida | Razón |
|---|---|---|---|---|---|
| `"no"` | `"no"` | `VALIDO` | `true` | `0` | Coincidencia monotenant histórica exacta. |
| `"no"` | `null` | `VALIDO` | `true` | `0` | Equivalencia monotenant reconocida formalmente. |
| `null` | `"no"` | `VALIDO` | `true` | `0` | Equivalencia monotenant reconocida formalmente. |
| `null` | `null` | `VALIDO` | `true` | `0` | Coincidencia monotenant estándar. |
| `"no"` | `"tenant_corp_1"` | `INVALIDO` | `false` | `1` | Discrepancia: se esperaba multi-tenant específico. |
| `"tenant_corp_1"` | `"no"` | `INVALIDO` | `false` | `1` | Discrepancia: el proyecto está aislado para un tenant. |
| `"tenant_corp_1"` | `"tenant_corp_1"` | `VALIDO` | `true` | `0` | Coincidencia multi-tenant exacta. |
| Ausente (faltante) | Cualquiera | `INCOMPLETO` | `false` | `1` | Estructura incompleta de proyección. |
| Mismatch `projectId` | Cualquier id | `INVALIDO` | `false` | `1` | Violación de identidad del proyecto. |

---

## 6. PROTOCOLO DE CERTIFICACIÓN COOPERATIVA PARA AGENTES

Los diferentes agentes de desarrollo (Antigravity, Cursor, Claude) interactúan con el Harness bajo un protocolo cooperativo:

```text
PASO 1: Invocación Previa
   El agente o entorno ejecuta:
   node rsc/harnessContexto.mjs verificar --json

PASO 2: Evaluación del Resultado
   - Si exitCode === 0 && aptoParaConsumo === true:
       -> Proceder a leer y confiar en el contexto proyectado.
   - Si exitCode !== 0 || aptoParaConsumo === false:
       -> Suspender asunciones sobre el estado del proyecto.
       -> Reportar el estado al usuario humano (DESACTUALIZADO, INVALIDO, etc.).
       -> Sugerir ejecutar node rsc/harnessContexto.mjs solicitar-regeneracion.
```

---

## 7. SUITE DE VALIDACIÓN AUTOMATIZADA (`rsc/pruebasRsc6Harness.mjs`)

La suite de validación comprende 28 aserciones rigurosas que prueban:
1. Exportación y estructura de `COMANDOS_HARNESS`.
2. Semántica de equivalencia monotenant (`null`, `"no"`).
3. Rechazo de tenants no autorizados (`tenant_corp_A` vs monotenant).
4. Reacción ante repositorio sin `ARCHITEX_STATE.json` (`INCOMPLETO`, exit 1).
5. Certificación exitosa de las proyecciones activas del repositorio (`VALIDO`, exit 0, todos los archivos `[OK]`).
6. Detección de proyecciones desactualizadas (manipulación de hashes, exit 1).
7. Detección de proyecciones con secretos detectados (exit 1).
8. Detección de proyecciones con archivos faltantes (`INCOMPLETO`, exit 1).
9. Mismatch explícito de `projectId` (exit 1).
10. Invocación CLI con formato `--json` válido y estructurado.
11. Verificación del comando `solicitar-regeneracion` (emisión de diagnóstico sin mutación de archivos).
12. Comportamiento ante errores de I/O y permisos (`NO_VERIFICABLE`).

---

## 8. INVARIANTES CONSOLIDADAS

1. **Invarianza de la Fuente de Verdad:** `estadoProyecto` jamás es modificado por RSC-6.
2. **Invarianza de RSC-1 a RSC-5:** Los módulos anteriores permanecen 100% intactos sin duplicación de responsabilidades.
3. **Invarianza de Cero Modificación no Autorizada:** `solicitar-regeneracion` jamás realiza escrituras directas sobre el repositorio.
4. **Invarianza de Código de Salida Binario:** Únicamente el estado plenamente certificado y coherente retorna `0`. Cualquier anomalía o degradación retorna `1`.
