# F3 — Ciclo de Vida, Linaje y Evolución Controlada

## Intent
Activar el linaje causal F3 sobre RSC-2, RSC-4, RSC-5 y RSC-6, con suite y C0, sin tocar gobernanza ni archivos protegidos.

## Scope
Dentro: `rsc/normalizadorContexto.mjs`, `rsc/verificadorContexto.mjs`, `rsc/regeneradorProyecciones.mjs`, `rsc/harnessContexto.mjs`, `rsc/pruebasF3Evolucion.mjs`, `rsc/c0-genesis-f3.json`, este documento y pruebas F3 añadidas a las suites RSC.
Fuera: `index.html`, `GobernanzaAgente.gs`, `Codigo.gs`, `ConfiguracionBase.gs`, `appsscript.json`, `ContextoCanonicoArchitex.schema.json`, commit, push, deploy, watchers, red, auto-sync.

## Checklist
- [x] PASO 0: inspección + hashes + regresión base 113/113 PASS (umbral documentado 115 no coincidía con la suma real).
- [x] PASO 1: RSC-2 ciclo/linaje/procedencia → 37/37.
- [x] PASO 2: RSC-4 PARENT_DECLARED_ONLY / PARENT_VERIFIED → 39/39.
- [x] PASO 3: RSC-5 Floor Guard → 22/22.
- [x] PASO 4: RSC-6 muestra linaje → 40/40.
- [x] PASO 5: suite F3 → 34/34.
- [x] PASO 6: C0 en `rsc/c0-genesis-f3.json`.
- [x] PASO 7: regresión global.
- [x] PASO 8: documentación con OBS-F3-01..03.
- [x] PASO 9: auditoría final. Checkpoint humano, sin commit.

## Evidence

### PASO 0 (antes de editar)
Hashes protegidos:
- `index.html` → `39513077F47C5C290B1AB89E1A36BE484027A4D88662BD890A11B8962E50027E`
- `GobernanzaAgente.gs` → `57237AADEF9BAAFF99377562B6413ACC8123AAA661FC6D361BF3A85B852FCF00`
- `Codigo.gs` → `A5BE44F57C77606B7BD86B4386D22380F158D8680832B9F4F89770BB21D2AEDC`
- `ConfiguracionBase.gs` → `A0429BD12D5040147ABC97F15CB5288ECF5A6EC23C6BA73028C115B6BCDC7CB1`
- `appsscript.json` → `43E2158705F39445395CC584DB20F111535CC2FF19C1F16DAFBB87779182128E`
- `ContextoCanonicoArchitex.schema.json` → `3C27AF4B04ACEBB83200B217BF218E0EAEA176E277321C542E8EEC18E24A5F38`

Regresión base: RSC-2 22 + RSC-3 14 + RSC-4 29 + RSC-5 14 + RSC-6 34 = **113/113 PASS**.

### Observaciones normativas (auditadas)

#### OBS-F3-01 — C0 no es el nacimiento histórico de ARCHITEX
Denominación formal:

```text
GÉNESIS DE LA CADENA DE LINAJE CAUSAL F3
DE ARCHITEX OS V-36
```

La preexistencia F0–F2.2-F queda reconocida. C0 es el primer nodo criptográficamente encadenado de F3. El hash previo `111790fff85e83c1a7bdd79310456dbfd3430eb6c06528df7db65c9c4692fdb8` no es el hash de C0.

#### OBS-F3-02 — Errores de linaje son diagnósticos, no estados
Los estados de verificación siguen siendo solo:

```text
VALIDO | DESACTUALIZADO | INVALIDO | INCOMPLETO | NO_VERIFICABLE
```

Los diagnósticos de linaje (`PARENT_MISMATCH`, `DEPTH_INCONSISTENT`, `ORPHAN_SNAPSHOT`, `FLOOR_VIOLATION`, `VOLATILE_TIMESTAMP`) aparecen como `diagnosticoLinaje` / `diagnostico` bajo `estadoContexto = INVALIDO` cuando corresponde. No se inventaron estados nuevos.

#### OBS-F3-03 — PARENT_DECLARED_ONLY vs PARENT_VERIFIED
- Snapshot aislado con padre declarado: `PARENT_DECLARED_ONLY` (no afirma causalidad demostrada).
- Verificación relacional con `opts.contextoPadre` confiable: `PARENT_VERIFIED`.
- Génesis (`parentContentHash = null`, `lineageDepth = 0`): `GENESIS`.

### Comportamiento implementado

#### RSC-2 (`normalizarContextoArchitex`)
Extracción condicional desde `estadoProyecto`:

| Campo origen | Dimensión | Catálogo / reglas |
| --- | --- | --- |
| `estadoCicloVida` | `state` | `CANONICAL` \| `SUPERSEDED` \| `DEPRECATED` |
| `registroProcedencia` | `provenance` | `sourceType` ∈ {`SYSTEM_GENESIS`,`HUMAN_UI`,`AGENT_GOVERNED`,`SYSTEM_MIGRATION`}; `timestamp` ISO UTC estático; **nunca** `new Date()` |
| `linajeCausal` | `integrity` | `parentContentHash` null⇔depth 0; hex 64⇔depth≥1 |

Ausente o inválido → `NO_IMPLEMENTADO`. No muta la entrada. Determinista. Sin red.

#### RSC-4 (`verificarContextoRsc4`)
Opciones nuevas: `opts.contextoPadre`, `opts.parentHashEsperado`.
Ciclo de vida (`lifecycle`) ≠ verificación (`estadoContexto`). `CANONICAL` no implica `VALIDO`.

#### RSC-5 (`validarAutorizacion` / solicitud)
Campos de autorización: `proposedContextVersion`, `minimumVersionFloor`, `parentContentHash`, `rationale`.
Floor Guard: `proposed < floor` → `ABORTED` + `FLOOR_VIOLATION`. El piso no puede quedar por debajo de la `contextVersion` actual. Flujo autorización → staging → RSC-4 → reemplazo intacto.

#### RSC-6 (`evaluarHarnessContexto` / CLI)
Muestra `contextVersion`, `lineageDepth`, `parentContentHash`, `parentStatus`.
`exit 0` ⇔ `estadoContexto === VALIDO` && `aptoParaConsumo === true`.

### C0
Archivo: `rsc/c0-genesis-f3.json`
- Derivado del contenido semántico de `ARCHITEX_STATE.json` (via reconstrucción a `estadoProyecto`) + campos F3 normativos.
- `contentHash` C0: `f1ac370dcaf885050882b2a2ddd6da142c93567f8e054b4534a36a76db33d70e`
- `parentStatus`: `GENESIS`
- Dimensiones 10, 12, 18, 20, 21, 22: `NO_IMPLEMENTADO`
- `schemaVersion`: `1.0.0` · `projectVersion`: `V-36` · `contextVersion`: `1.0.0`

### Regresión global (PASO 7)
```text
RSC-2: PASS (37/37)
RSC-3: PASS (14/14)
RSC-4: PASS (39/39)
RSC-5: PASS (22/22)
RSC-6: PASS (40/40)
F3:    PASS (34/34)

REGRESIÓN HISTÓRICA BASE (PASO 0): 113/113
PRUEBAS F3 (suite dedicada): 34/34
EXTENSIONES F3 EN SUITES RSC: 39 aserciones nuevas dentro de RSC-2/4/5/6
TOTAL ACTUAL: 186/186
```

### Auditoría final
```text
NO RED
NO WATCHERS
NO AUTO-SYNC
NO GOVERNANCE INVASION
NO MUTATION DURING VERIFICATION
NO SCHEMA CHANGE
NO PROTECTED FILE CHANGE
NO DESTRUCTIVE CHANGE
```

Hashes protegidos posteriores = idénticos a PASO 0.

## Next
Checkpoint humano. Esperar autorización explícita para COMMIT / PUSH / DEPLOY. No ampliar F3.
