# ADR-002-F5-CALIDAD-PLATAFORMA — ACTIVACIÓN DE SKILLS Y TESTS

**Estado:** ADOPTADO  
**Fecha:** 2026-10-04  
**Autor:** ARQUITECTO_HUMANO  
**Contexto de Decisión:** ARCHITEX OS V-36 / F5.1  
**Linaje Causal:** Deriva de C1 (`fe48761c3a9ace1ad55a401a3a9fcd0289339aa12e40c30ca4d8382c5c0b1b01`) como detonador formal de transición evolutiva C1 → C2.

---

## 1. Problema

El Contexto Canónico certificado en C1 (v1.1.0, 21 dimensiones implementadas) carece de una representación canónica estructurada para:
1. El catálogo de habilidades operativas de los agentes y desarrolladores (`skills` — Dimensión 18).
2. El catálogo de suites y aserciones de prueba que garantizan la integridad de la plataforma (`tests` — Dimensión 20).

Ambas dimensiones permanecían explícitamente en estado `NO_IMPLEMENTADO` (`value: null`). Sin esta especificación canónica, los agentes que consumen las proyecciones (`ARCHITEX_STATE.json`, `.antigravity/context.md`, `CLAUDE.md`) no disponen de una guía formal sobre las habilidades del repositorio ni sobre la infraestructura de pruebas que valida cada contrato arquitectónico.

---

## 2. Contexto

La auditoría conceptual de Fase 5 evaluó las 4 dimensiones pendientes del sistema:
- Dimensión 18: `skills`
- Dimensión 20: `tests`
- Dimensión 21: `production`
- Dimensión 22: `maintenance`

Se determinó que activar las 4 dimensiones de forma monolítica introducía un riesgo innecesario de acoplamiento entre la calidad de plataforma (`skills` + `tests`) y el ciclo de vida operacional en runtime (`production` + `maintenance`). Por ello, se acordó la partición modular en dos subfases verificables:
- **F5.1:** Calidad de Plataforma (`skills` + `tests`).
- **F5.2:** Operación y Despliegue (`production` + `maintenance`).

---

## 3. Decisión

Se aprueba formalmente la adopción de **ADR-002-F5-CALIDAD-PLATAFORMA** para autorizar la transición evolutiva de C1 a C2 mediante la activación exclusiva de:
- **Dimensión 18: `skills`** (catálogo canónico descriptivo de habilidades del repositorio).
- **Dimensión 20: `tests`** (catálogo canónico de suites, aserciones y propósitos de verificación).

### 3.1. Alcance Autorizado
- Implementación de `datosProyecto.catalogoHabilidades` en el estado del proyecto.
- Implementación de `datosProyecto.catalogoSuitesPrueba` en el estado del proyecto.
- Extensión del normalizador canónico (`rsc/normalizadorContexto.mjs`) con los extractores puros `extraerHabilidades` y `extraerPruebas`.
- Extensión del generador de proyecciones físicas (`rsc/generadorProyecciones.mjs`) para renderizar las secciones 18 y 20 cuando su status sea `IMPLEMENTADO`.
- Construcción y certificación determinista de C2 (v1.2.0, SemVer MINOR, `lineageDepth: 2`, `parentContentHash: contentHash(C1)`).
- Creación de la suite de pruebas evolutivas `rsc/pruebasF51Evolucion.mjs`.

### 3.2. Exclusiones Explícitas (Innegociables)
- **Dimensión 21 (`production`):** Permanece estrictamente en `{ status: "NO_IMPLEMENTADO", value: null }` hasta F5.2.
- **Dimensión 22 (`maintenance`):** Permanece estrictamente en `{ status: "NO_IMPLEMENTADO", value: null }` hasta F5.2.
- **Nodo C3 y ADR-003:** Quedan reservados para fases posteriores.
- **Interfaz de Usuario (UI):** Prohibida cualquier modificación de `index.html`, CSS, JavaScript frontend o vistas operativas. F5.1 es 100% de infraestructura RSC.
- **Contrato de Esquema Protegido:** `ContextoCanonicoArchitex.schema.json` (SHA-256 `3c27af4b...`) es inmutable y no debe modificarse.
- **Inmutabilidad Retrospectiva:** C0 (`f1ac370d...`) y C1 (`fe48761c...`) permanecen criptográficamente intactos.

---

## 4. Especificación Canónica de las Dimensiones

### 4.1. Dimensión 18 — `skills`
Representa exclusivamente información descriptiva de capacidades técnicas.
- **Propiedad origen:** `datosProyecto.catalogoHabilidades`.
- **Estructura normalizada:**
  ```json
  {
    "totalSkills": 3,
    "skillsCatalog": [
      {
        "id": "SKL-01",
        "name": "Contexto Canónico y Proyecciones",
        "description": "Interpretación y consumo de ARCHITEX_STATE.json y Markdown canónico",
        "targetAgents": ["Cursor", "Antigravity", "Claude"],
        "rulesetRef": "skills/architex-context/SKILL.md"
      },
      {
        "id": "SKL-02",
        "name": "Concurrencia Atómica con LockService",
        "description": "Patrón tryLock(10000)/finally releaseLock para escrituras concurrentes en Google Sheets (ADR-001)",
        "targetAgents": ["Developer", "Human Architect"],
        "rulesetRef": "skills/lockservice-concurrency/SKILL.md"
      },
      {
        "id": "SKL-03",
        "name": "Accesibilidad Nativa Web Speech API",
        "description": "Locución por voz client-side y navegación accesible WCAG 2.1 AA",
        "targetAgents": ["Frontend Agent"],
        "rulesetRef": "ADR-003"
      }
    ]
  }
  ```
- **Frontera de Seguridad:** Queda estrictamente prohibido incluir comandos ejecutables, tokens, contraseñas, secretos, instrucciones de mutación o permisos de gobernanza (`HERRAMIENTAS_AGENTES`). `skills` describe capacidades; no ejecuta herramientas.

### 4.2. Dimensión 20 — `tests`
Representa exclusivamente el catálogo descriptivo de aseguramiento de calidad del repositorio, derivado de la realidad comprobada de las suites de prueba.
- **Propiedad origen:** `datosProyecto.catalogoSuitesPrueba`.
- **Estructura normalizada:**
  ```json
  {
    "testFramework": "Node.js Pure Assertions Harness",
    "testStrategy": "Aislamiento determinista, no-mutación, pruebas adversariales de linaje y verificación de staging (RSC-2 a RSC-6)",
    "totalSuites": 8,
    "suites": [
      { "id": "T-RSC2", "name": "Normalizador Canónico", "command": "node rsc/pruebasRsc2Normalizador.mjs", "assertions": 51, "purpose": "Normalización determinista, saneamiento de secretos y no-invención" },
      { "id": "T-RSC3", "name": "Generador de Proyecciones Físicas", "command": "node rsc/pruebasRsc3Proyecciones.mjs", "assertions": 19, "purpose": "Generación pura de JSON, Markdown y skills" },
      { "id": "T-RSC4", "name": "Verificador Canónico", "command": "node rsc/pruebasRsc4Verificacion.mjs", "assertions": 39, "purpose": "Certificación de integridad, detección de tampering y validación de linaje" },
      { "id": "T-RSC5", "name": "Regenerador Staging", "command": "node rsc/pruebasRsc5Regeneracion.mjs", "assertions": 22, "purpose": "Autorización explícita, generación en staging y reemplazo atómico" },
      { "id": "T-RSC6", "name": "CLI Harness", "command": "node rsc/pruebasRsc6Harness.mjs", "assertions": 40, "purpose": "Consumo cooperativo y diagnóstico CLI" },
      { "id": "T-F3", "name": "Evolución y Linaje C0", "command": "node rsc/pruebasF3Evolucion.mjs", "assertions": 34, "purpose": "Génesis y Floor Guard F3" },
      { "id": "T-F4", "name": "Evolución C0 -> C1", "command": "node rsc/pruebasF4Evolucion.mjs", "assertions": 35, "purpose": "Linaje C0->C1 y activación de users y requirements" },
      { "id": "T-F51", "name": "Evolución C1 -> C2", "command": "node rsc/pruebasF51Evolucion.mjs", "assertions": 48, "purpose": "Linaje C1->C2 y activación de skills y tests" }
    ]
  }
  ```
- **Regla de Realidad:** Los conteos y comandos corresponden exactamente a las suites físicas auditadas en el repositorio.

---

## 5. Estrategia Modular y Dependencia

Existe una fuerte cohesión técnica entre `skills` y `tests`:
- Cada `skill` canónica tiene su contraparte de validación formal en las suites de prueba (`tests`).
- `lockservice-concurrency` se valida en RSC-2/RSC-3/RSC-4.
- `architex-context` se valida en RSC-4/RSC-6.
- Al implementar ambas simultáneamente en F5.1, el sistema documenta tanto las directrices operativas como los mecanismos exactos que garantizan su cumplimiento, cerrando el ciclo de calidad de plataforma antes de abordar la infraestructura de despliegue en F5.2.

---

## 6. Principio ADD, NOT REPLACE

- Las 21 dimensiones ya activas en C1 permanecen idénticas en contenido semántico y comportamiento.
- Los nuevos extractores (`extraerHabilidades`, `extraerPruebas`) son aditivos y devuelven `null` con fallback a `NO_IMPLEMENTADO` cuando la entrada no contenga datos válidos o contenga arrays vacíos.
- Ninguna estructura existente se sobreescribe o sustituye.

---

## 7. Impacto SemVer y Metadatos de Linaje C2

- **Incremento de Versión:** SemVer `MINOR` (`1.2.0`), justificado por la adición retrocompatible de capacidades funcionales en el contexto canónico.
- **Floor Guard:** `1.2.0` se establece como piso infranqueable para C2.
- **Balance Canónico de C2:** Exactamente **23 IMPLEMENTADO / 2 NO_IMPLEMENTADO** (únicamente `production` y `maintenance` pendientes).
- **Linaje Causal:**
  - `parentContentHash`: `fe48761c3a9ace1ad55a401a3a9fcd0289339aa12e40c30ca4d8382c5c0b1b01` (contentHash real de C1).
  - `lineageDepth`: `2`.
  - `parentStatus`: `PARENT_VERIFIED`.
  - `triggerDecisionId`: `ADR-002-F5-CALIDAD-PLATAFORMA`.
  - `sourceType`: `HUMAN_UI`.
  - `author`: `ARQUITECTO_HUMANO`.
  - `lifecycle`: `CANONICAL`.

---

## 8. Criterios de Certificación y Rechazo

### Criterios de Aceptación (Promoción a C2):
1. Normalización determinista de C2 produciendo un `contentHash` real a partir del estado candidato.
2. `verificarContextoRsc4(c2, { contextoPadre: c1 })` resulta en `estado: VALIDO` y `parentStatus: PARENT_VERIFIED`.
3. Balance exacto de 23 dimensiones `IMPLEMENTADO` y 2 `NO_IMPLEMENTADO`.
4. Cero fugas de secretos o credenciales en `skills` y `tests`.
5. Cero llamadas de red durante normalización, verificación y ejecución de proyecciones.
6. Regresión base intacta (240/240 PASS) más todas las pruebas nuevas de F5.1.
7. C0, C1 y `ContextoCanonicoArchitex.schema.json` criptográficamente idénticos a sus referencias certificadas.

### Criterios de Rechazo Inmediato:
1. Discrepancia entre `c2.parentContentHash` y `c1.contentHash`.
2. `lineageDepth` diferente de 2.
3. Intento de modificar `ContextoCanonicoArchitex.schema.json`.
4. Alteración de pruebas previas para forzar su aprobación.
5. Inclusión de código ejecutable o tokens en `skills`.
6. Modificación de archivos de frontend/UI (`index.html`, etc.).
