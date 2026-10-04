# ARCHITEX OS V-36

# RSC-2 — ESPECIFICACIÓN Y IMPLEMENTACIÓN DEL NORMALIZADOR DE CONTEXTO CANÓNICO

## Contexto Canónico + Normalizador (`normalizarContextoArchitex`)

---

## 1. RESUMEN EJECUTIVO

* **Fase:** RSC-2 (Contexto Canónico + Normalizador).
* **Ecosistema:** ARCHITEX OS V-36.
* **Componente:** `rsc/normalizadorContexto.mjs`.
* **Esquema:** `02-DOCS/wiki/ftd/ContextoCanonicoArchitex.schema.json`.
* **Pruebas:** `rsc/pruebasRsc2Normalizador.mjs`.
* **Objetivo:** Transformar deterministamente el estado de la aplicación (`estadoProyecto`) en la estructura unificada intermedia `ContextoCanonicoArchitex` sin mutaciones, sin dependencias externas, sin llamadas de red y con estricto respeto a la gobernanza.

---

## 2. ARQUITECTURA DE DERIVACIÓN (REGLA FUNDAMENTAL)

La fuente única primaria de verdad de la sesión sigue siendo `estadoProyecto`. El contexto canónico es estrictamente una **derivación unidireccional de sólo lectura**:

```text
       estadoProyecto  (Fuente de Verdad Primaria)
             ↓
normalizarContextoArchitex()  (Función Pura, Aislada, Determinista)
             ↓
  ContextoCanonicoArchitex  (Derivación Canónica)
```

### Principios de Aislamiento
1. **Unidireccionalidad:** Nunca ocurre `ContextoCanonicoArchitex → estadoProyecto` durante RSC-2.
2. **Función Pura:** `normalizarContextoArchitex(estadoProyecto, opciones)` no produce efectos colaterales (sin mutación del argumento de entrada, sin escrituras en `localStorage`, sin interacción con Google Sheets ni llamadas DOM).
3. **Cero Dependencia de Red / Sin DeepSeek:** No utiliza `fetch`, APIs externas ni realiza llamadas al modelo de lenguaje. La normalización es 100% algorítmica y local.
4. **Separación Contexto vs. Gobernanza:** El contexto describe el sistema arquitectónico bajo diseño; no gobierna agentes ni expone permisos, tokens de decisión (`idDecision`) o el catálogo de herramientas de backend (`HERRAMIENTAS_AGENTES`).

---

## 3. ESQUEMA DE METADATOS Y CONTROL DE INTEGRIDAD

El objeto normalizado contiene encabezados formales para asegurar compatibilidad y trazabilidad:

```typescript
{
  schemaVersion: "1.0.0",           // Versión fija del contrato de esquema
  contextVersion: "1.0.0",          // Versión de mutación arquitectónica confirmada
  projectVersion: "V-36",           // Versión declarada de ARCHITEX OS
  generatedAt: "2026-10-04T...",   // Timestamp ISO-8601 de generación física
  projectId: string | null,        // Identificador del proyecto (ej: "proyecto_edu_01")
  tenantId: string | null,         // Identificador del tenant o null si ausente
  source: "ARCHITEX_OS_V36",       // Origen inmutable de emisión
  contentHash: string,             // Hash SHA-256 de 64 caracteres hexadecimales
  ...dimensiones                   // Las 25 dimensiones arquitectónicas
}
```

### Determinismo del `contentHash`
Para evitar discrepancias artificiales entre ejecuciones a distintas horas:
* El `contentHash` se calcula sobre un payload semántico canónico donde todas las claves de objetos están ordenadas alfabéticamente recursivamente.
* **`generatedAt` está estrictamente excluido del cálculo del `contentHash`**.
* Mismo contenido arquitectónico a diferente hora de generación produce **exactamente el mismo `contentHash`**.

---

## 4. ESTADO DE LAS 25 DIMENSIONES ARQUITECTÓNICAS

Conforme a la regla de **No-Invención**, cualquier dimensión no persistida en `estadoProyecto` se normaliza como:

```json
{
  "status": "NO_IMPLEMENTADO",
  "value": null
}
```

No se crean listas vacías (`[]`) ni objetos ficticios que sugieran la existencia de datos ausentes.

| # | Dimensión | Estado en V-36 | Mapeo desde `estadoProyecto` |
|---|---|---|---|
| 1 | `identity` | `IMPLEMENTADO` | `idProyecto`, `nombreProyecto`, `selectorTipoProyecto` |
| 2 | `problem` | `IMPLEMENTADO` | `campoProblema` |
| 3 | `objectives` | `IMPLEMENTADO` | `campoObjetivo` |
| 4 | `audience` | `IMPLEMENTADO` | `campoPublico` |
| 5 | `environment` | `IMPLEMENTADO` | `campoEntorno`, `campoDispositivos`, `campoManejoOffline` |
| 6 | `mvp` | `IMPLEMENTADO` | `campoMvp` |
| 7 | `future` | `IMPLEMENTADO` | `campoFuturo` |
| 8 | `constraints` | `IMPLEMENTADO` | `campoRestricciones`, Zero-Cost ($0 USD), LockService, Terminal Windows |
| 9 | `roles` | `IMPLEMENTADO` | `campoRoles` |
| 10 | `users` | `NO_IMPLEMENTADO` | `null` (Perfiles de usuario detallados no persistidos) |
| 11 | `entities` | `IMPLEMENTADO` | `campoEntidades`, `entidadesRegistradas` |
| 12 | `requirements` | `NO_IMPLEMENTADO` | `null` (Matriz formal de requisitos no persistida como entidad autónoma) |
| 13 | `data` | `IMPLEMENTADO` | Motor derivado de `selectorTipoProyecto`, resumen entidades |
| 14 | `design` | `IMPLEMENTADO` | `campoPantallas`, `campoNavegacion` |
| 15 | `architecture` | `IMPLEMENTADO` | Topología según `selectorTipoProyecto`, `componentesClaveEstado` |
| 16 | `technology` | `IMPLEMENTADO` | Ecosistema y runtime inferido deterministamente |
| 17 | `decisions` | `IMPLEMENTADO` | `decisionesRegistradas` (ADRs) |
| 18 | `skills` | `NO_IMPLEMENTADO` | `null` (No persistido en estado base) |
| 19 | `traceability` | `IMPLEMENTADO` | `elementosTrazabilidad` |
| 20 | `tests` | `NO_IMPLEMENTADO` | `null` (Estrategia formal de pruebas no persistida en estado) |
| 21 | `production` | `NO_IMPLEMENTADO` | `null` (Canales de despliegue no persistidos) |
| 22 | `maintenance` | `NO_IMPLEMENTADO` | `null` (Pautas operativas no persistidas) |
| 23 | `state` | `NO_IMPLEMENTADO` | `null` (Radar y Semáforo son computados al vuelo en UI) |
| 24 | `provenance` | `NO_IMPLEMENTADO` | `null` (Historial granular de procedencia por campo pendiente F6) |
| 25 | `integrity` | `NO_IMPLEMENTADO` | `null` (Cadena criptográfica de bloques pendiente F6) |

---

## 5. SANITIZACIÓN DE SECRETOS Y CREDENCIALES

La función `sanitizarTexto()` inspecciona y redacta patrones sensibles antes de introducirlos en cualquier dimensión del contexto canónico:
* Patrones de claves API de modelos (ej. `sk-...`).
* Encabezados de autorización `Bearer ...`.
* Contraseñas explícitas en texto plano (`password = ...`, `token = ...`).
* Las cadenas coincidentes son sustituidas por `[REDACTADO_POR_SEGURIDAD]`.

---

## 6. VALIDACIÓN Y PRUEBAS AISLADAS

La suite de pruebas `rsc/pruebasRsc2Normalizador.mjs` valida exhaustivamente los requisitos exigidos para RSC-2:

* **TEST 1 — No Mutación:** Verifica que `estadoProyecto` permanece byte a byte idéntico antes y después de la normalización.
* **TEST 2 — Determinismo & Independencia Temporal:** Ejecuciones sucesivas con timestamps distintos producen idéntico `contentHash`.
* **TEST 3 — Estado Vacío:** La llamada con `{}` no lanza errores y produce las 25 dimensiones en estado `NO_IMPLEMENTADO` con `value: null`.
* **TEST 4 — No Invención:** Verifica que dimensiones como `users`, `requirements`, `tests`, `production` y `skills` no se pueblan ficticiamente.
* **TEST 5 — Propiedades Desconocidas:** Campos infiltrados en `estadoProyecto` (ej. `campoInventadoXYZ`) son descartados y no ingresan al contexto canónico.
* **TEST 6 — Seguridad y Redacción:** Comprueba que claves `sk-*`, tokens `Bearer` y contraseñas son redactados automáticamente.
* **TEST 7 — Red & DeepSeek:** Garantiza cero llamadas a `fetch` y nula interacción con APIs de IA durante el ciclo de normalización.
* **TEST 8 — Gobernanza:** Asegura que `HERRAMIENTAS_AGENTES`, `idDecision` y permisos son totalmente excluidos del contexto generado.
* **TEST 9 — Validación Estructural:** Cumplimiento total de metadatos, versiones (`1.0.0`, `V-36`) y presencia obligatoria de las 25 dimensiones.

---

## 7. CRITERIO DE TRANSICIÓN

RSC-2 queda formalmente implementada, aislada y validada. No se modificó ningún archivo del núcleo de ARCHITEX OS ni de la gobernanza (`GobernanzaAgente.gs`, `Codigo.gs`, `index.html`, `ConfiguracionBase.gs`, `appsscript.json`).

**Queda prohibido iniciar RSC-3 o realizar despliegues/commits sin autorización humana explícita.**
