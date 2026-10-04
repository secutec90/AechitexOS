# ARCHITEX OS V-36

# RSC-4 — ESPECIFICACIÓN Y IMPLEMENTACIÓN DE CONSUMO SEGURO Y VERIFICACIÓN

## Capa de Consumo y Verificación de Proyecciones (`verificarContextoRsc4`)

---

## 1. RESUMEN EJECUTIVO

* **Fase:** RSC-4 (Consumo Seguro y Verificación del Contexto).
* **Ecosistema:** ARCHITEX OS V-36.
* **Módulo Verificador:** `rsc/verificadorContexto.mjs`.
* **Suite de Pruebas:** `rsc/pruebasRsc4Verificacion.mjs`.
* **Objetivo:** Proveer una API pura, determinista y síncrona que permita a cualquier consumidor (humano, agente o script) inspeccionar y certificar la validez, integridad, actualidad y coherencia de las proyecciones RSC-3 y del contexto canónico sin modificar el estado primario, sin ejecutar herramientas ni invadir la gobernanza.

---

## 2. ARQUITECTURA DE CONSUMO Y VERIFICACIÓN

Se respeta rigurosamente la frontera unidireccional del sistema:

```text
┌────────────────────────────────────────┐
│             estadoProyecto             │  ← ÚNICA FUENTE DE VERDAD
└───────────────────┬────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────┐
│     normalizarContextoArchitex()       │  ← NORMALIZADOR CANÓNICO (RSC-2)
└───────────────────┬────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────┐
│        ContextoCanonicoArchitex        │  ← REPRESENTACIÓN INTERMEDIA OFICIAL
└───────────────────┬────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────┐
│       generarProyeccionesRsc3()        │  ← PROYECCIONES FÍSICAS (RSC-3)
│   (ARCHITEX_STATE, .cursorrules, etc.) │
└───────────────────┬────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────┐
│        verificarContextoRsc4()         │  ← CONSUMO SEGURO Y VERIFICACIÓN (RSC-4)
└───────────────────┬────────────────────┘
                    │
                    ▼
        Dictamen de Estado:
 [ VALIDO | DESACTUALIZADO | INVALIDO | INCOMPLETO | NO_VERIFICABLE ]
```

### Reglas Innegociables
1. **No-Mutación y No-Sobrescritura:** RSC-4 nunca regenera archivos automáticamente ni sobreescribe proyecciones si detecta `DESACTUALIZADO` o `INVALIDO`. Solo detecta y reporta.
2. **Cero Lectura Directa de `estadoProyecto` para Reparar:** Si una proyección está incompleta o alterada, RSC-4 no intenta leer `estadoProyecto` para completarla.
3. **Cero Gobernanza:** RSC-4 no otorga autorizaciones, no valida herramientas de agentes ni genera tokens `idDecision`.
4. **Cero Red / Cero DeepSeek:** Función 100% algorítmica y determinista en memoria local.

---

## 3. LOS 5 ESTADOS DE CLASIFICACIÓN CONTEXTUAL

| Estado | Significado Técnico | Criterio de Activación |
|---|---|---|
| `VALIDO` | Contexto canónico íntegro y verificado | Estructura completa, 25 dimensiones válidas, hash semántico coincide exactamente, versiones compatibles y multi-tenant coherente. |
| `DESACTUALIZADO` | Proyección válida pero obsoleta | El hash declarado coincide con el contenido de la proyección, pero difiere del hash canónico actual del proyecto tras una mutación. |
| `INVALIDO` | Violación de integridad o seguridad | Manipulación manual del contenido sin coincidencia de hash, secretos sin redactar, invasión de gobernanza, estados corruptos o tenant incorrecto. |
| `INCOMPLETO` | Estructura parcial o trunca | Ausencia de cabeceras raíz obligatorias o ausencia de alguna de las 25 dimensiones canónicas requeridas. |
| `NO_VERIFICABLE` | Formato ilegible o no procesable | Cadena no parseable como JSON, archivo vacío o estructura de datos no compatible. |

---

## 4. RECOMPUTACIÓN CRIPTOGRÁFICA DEL `CONTENTHASH`

La verificación de integridad no confía ciegamente en el campo `contentHash` declarado en `ARCHITEX_STATE.json`. Para certificar la autenticidad:
1. Extrae el payload semántico compuesto exclusivamente por:
   - `schemaVersion`
   - `contextVersion`
   - `projectVersion`
   - `projectId`
   - `tenantId`
   - `source`
   - `dimensions`
2. **Excluye estrictamente `generatedAt`** (metadata volátil que no forma parte de la identidad arquitectónica).
3. Aplica ordenamiento alfabético recursivo de claves mediante `ordenarClaves()`.
4. Calcula el hash SHA-256 de 64 caracteres.
5. Si `hashCalculado !== contentHashDeclarado`, clasifica de inmediato como `INVALIDO`.

---

## 5. API DE VERIFICACIÓN (MÓDULO `rsc/verificadorContexto.mjs`)

### 5.1. `verificarContextoRsc4(proyeccionOContexto, opciones = {})`
Verifica proyecciones JSON estructuradas (`ARCHITEX_STATE.json` o `ContextoCanonicoArchitex`).
* **Parámetros Opcionales:**
  - `tenantIdEsperado`: Certifica aislamiento multi-tenant.
  - `projectIdEsperado`: Valida pertenencia al proyecto correcto.
  - `schemaVersionEsperada` / `projectVersionEsperada`: Control estricto de evolución.
  - `contextoActual`: Permite comparar contra el estado más reciente y detectar `DESACTUALIZADO`.

### 5.2. `verificarTextoProyeccion(nombreArchivo, contenidoTexto, hashEsperado, opciones = {})`
Verifica la alineación de archivos Markdown y de reglas (`.antigravity/context.md`, `.cursorrules`, `CLAUDE.md`, `skills/`):
- Comprueba que porte el `Context Hash: <64-char-hex>`.
- Comprueba que coincida con el hash canónico del proyecto.
- Inspecciona y descarta la presencia de secretos o gobernanza no autorizada.

### 5.3. `verificarConjuntoProyecciones(mapaProyecciones, opciones = {})`
Verifica de forma atómica y conjunta todo el ecosistema de proyecciones físicas para certificar sincronía total.

---

## 6. PRUEBAS DE ATAQUE CONCEPTUAL (ESCENARIOS A - J)

En `rsc/pruebasRsc4Verificacion.mjs` se validaron los siguientes vectores de manipulación y fallo:

| Vector de Ataque | Acción Simulada | Detección RSC-4 | Estado Resultante |
|---|---|---|---|
| **A** | Alteración manual de `tenantId` | Detección de discrepancia de hash | `INVALIDO` |
| **B** | Alteración manual de `projectId` | Detección de discrepancia de hash | `INVALIDO` |
| **C** | Falsificación de `contentHash` | Desajuste entre hash declarado y calculado | `INVALIDO` |
| **D** | Alteración de `generatedAt` | Metadata volátil ignorada por el hash | `VALIDO` |
| **E** | Inyección de propiedad desconocida | Detección de propiedad raíz no autorizada | `INVALIDO` |
| **F** | Corrupción de estado en una dimensión | `status` desconocido o `value` no nulo | `INVALIDO` |
| **G** | Eliminación de una dimensión (24/25) | Detección de dimensión canónica ausente | `INCOMPLETO` |
| **H** | Inyección de credencial `sk-*` | Filtro de seguridad por regex | `INVALIDO` |
| **I** | Inyección de `HERRAMIENTAS_AGENTES` | Detección de invasión de gobernanza | `INVALIDO` |
| **J** | Inyección de token `idDecision` | Detección de invasión de gobernanza | `INVALIDO` |

---

## 7. RESULTADOS DE LA SUITE DE PRUEBAS

* **Tests Obligatorios (TEST 1 a TEST 15):** 15/15 superados (100%).
* **Escenarios de Ataque (A a J):** 10/10 superados (100%).
* **Verificación de Repositorio Físico Actual:** 4/4 archivos en disco validados exitosamente (`ARCHITEX_STATE.json`, `.antigravity/context.md`, `.cursorrules`, `CLAUDE.md`).
* **Total aserciones:** 29/29 PASS.

---

## 8. CRITERIO DE TRANSICIÓN

RSC-4 se encuentra implementada, aislada y validada.
* Cero dependencias añadidas.
* Archivos del núcleo protegidos intactos (`index.html`, `GobernanzaAgente.gs`, `Codigo.gs`, `ConfiguracionBase.gs`, `appsscript.json`).
* Prohibición absoluta de auto-sincronización, watchers, auto-deploy, commit y push.
* Queda terminantemente prohibido avanzar a RSC-5 o F3 sin autorización humana expresa.
