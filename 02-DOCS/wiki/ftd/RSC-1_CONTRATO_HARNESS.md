# ARCHITEX OS V-36

# RSC-1 — CONTRATO DEL RSC-HARNESS
## ARQUITECTURA DEL CONTEXTO CANÓNICO Y PROYECCIONES MULTI-AGENTE

---

## 1. OBJETIVO Y FUNDAMENTO

El **RSC-Harness** (Reproducible System Context Harness) de ARCHITEX OS es el subsistema encargado de transformar el estado formal de especificación arquitectónica en proyecciones operativas reproducibles y consistentes para agentes de inteligencia artificial (Antigravity, Cursor, Claude, etc.), garantizando que **ningún agente trabaje con una interpretación divergente o alucinada del proyecto**.

> ### PRINCIPIO FUNDAMENTAL
> **RSC-Harness NO es una segunda fuente de verdad.**
> La única fuente de verdad inmutable de la arquitectura técnica es **ARCHITEX OS** a través de su estado de proyecto gobernado.
>
> **ARCHITEX DEFINE EL CONTEXTO.**  
> **EL CONTEXTO CANÓNICO SE NORMALIZA UNA SOLA VEZ.**  
> **DEEPSEEK RAZONA SOBRE ESE CONTEXTO.**  
> **RSC PROYECTA ESE CONTEXTO PARA AGENTES EXTERNOS.**  
> **GOBERNANZA DECIDE QUÉ PUEDE HACER UN AGENTE.**  
> **EL BACKEND EJECUTA LAS MUTACIONES.**  
> **EL RSC NUNCA CONCEDE PERMISOS.**

---

## 2. FLUJO ARQUITECTÓNICO CANÓNICO

```text
                    ARCHITEX OS
                         │
                         ▼
                   estadoProyecto
                         │
                         ▼
            normalizarContextoArchitex()
                         │
                         ▼
              CONTEXTO CANÓNICO ARCHITEX
                         │
             ┌───────────┴───────────┐
             │                       │
             ▼                       ▼
      DeepSeek (Nativo)         RSC-Harness
      (Inferencia directa            │
       vía backend seguro)           │
                                     ▼
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
             .antigravity/      .cursorrules      CLAUDE.md
              context.md              │               │
                    │                 ▼               ▼
                    │           skills/*.md      skills/*.md
                    ▼
          ARCHITEX_STATE.json
```

---

## 3. SEPARACIÓN ESTRICTA DE AUTORIDADES

El sistema establece una frontera inquebrantable entre tres capas conceptuales:

```text
┌─────────────────────────────────────────────────────────────────┐
│ 1. CAPA DE CONTEXTO                                             │
│    ¿Qué es el proyecto?                                        │
│    Fuente: ContextoCanonicoArchitex                             │
│    Responsabilidad: Describir problemas, objetivos, topología,   │
│    entidades, decisiones (ADRs), restricciones y pruebas.       │
│    Autoridad: Informativa / Descriptiva.                        │
├─────────────────────────────────────────────────────────────────┤
│ 2. CAPA DE GOBERNANZA                                           │
│    ¿Qué tiene permitido hacer un agente?                        │
│    Fuente: GobernanzaAgente.gs (Backend de Apps Script)         │
│    Responsabilidad: Catálogo de herramientas, reglas de riesgo  │
│    (BAJO, MEDIO, ALTO, CRÍTICO), validación de esquemas,        │
│    tokens idDecision de uso único y bloqueo de bypass.          │
│    Autoridad: Normativa / Política.                             │
├─────────────────────────────────────────────────────────────────┤
│ 3. CAPA DE EJECUCIÓN                                            │
│    ¿Dónde se aplica una mutación real de datos?                 │
│    Fuente: Backend Serverless de ARCHITEX OS                    │
│    Responsabilidad: Transacciones atómicas bajo LockService     │
│    (15s), persistencia en Google Sheets, Drive y auditoría.     │
│    Autoridad: Ejecutiva / Mutacional.                           │
└─────────────────────────────────────────────────────────────────┘
```

### Reglas Innegociables de Autoridad:
1. **RSC NO concede permisos:** Ninguna instrucción dentro de `CLAUDE.md`, `.cursorrules` o `context.md` puede otorgar facultades de escritura o modificación sobre el proyecto ni sobre el código sin pasar por la gobernanza de ARCHITEX.
2. **RSC NO eleva privilegios:** Un agente no puede interpretar un skill como una autorización para eludir la aprobación humana en riesgos MEDIO o ALTO.
3. **RSC NO ejecuta mutaciones:** Los archivos RSC no escriben en la base de datos, no modifican `GobernanzaAgente.gs` y no persisten datos en el servidor.
4. **RSC NO es auditoría:** La evidencia histórica reside exclusivamente en el registro del backend `_ARCHITEX_ACCIONES_AGENTE`.

---

## 4. CONTEXTO CANÓNICO (`ContextoCanonicoArchitex`)

El **Contexto Canónico** es la estructura normalizada intermedia que representa la totalidad del entendimiento técnico del proyecto. Comprende 25 dimensiones, mapeadas de forma estricta contra las capacidades actuales de `estadoProyecto`:

| Dimensión | Campo Canónico | Estado en ARCHITEX OS V-36 | Fuente Real en `estadoProyecto` |
| :--- | :--- | :---: | :--- |
| **1. Identity** | `identity` | **IMPLEMENTADO** | `idProyecto`, `nombreProyecto`, `selectorTipoProyecto` |
| **2. Problem** | `problem` | **IMPLEMENTADO** | `campoProblema` |
| **3. Objectives** | `objectives` | **IMPLEMENTADO** | `campoObjetivo` |
| **4. Audience** | `audience` | **IMPLEMENTADO** | `campoPublico` |
| **5. Environment** | `environment` | **IMPLEMENTADO** | `campoEntorno`, `campoDispositivos`, `campoManejoOffline` |
| **6. MVP** | `mvp` | **IMPLEMENTADO** | `campoMvp` |
| **7. Future** | `future` | **IMPLEMENTADO** | `campoFuturo` |
| **8. Constraints** | `constraints` | **IMPLEMENTADO** | `campoRestricciones` |
| **9. Roles** | `roles` | **IMPLEMENTADO** | `campoRoles` |
| **10. Users** | `users` | *NO IMPLEMENTADO* | *(Deriva de roles; lista formal de usuarios no existe)* |
| **11. Entities** | `entities` | **IMPLEMENTADO** | `entidadesRegistradas` (array `{nombre, campos}`), `campoEntidades` |
| **12. Requirements**| `requirements` | *NO IMPLEMENTADO* | *(Parcial en campoFlujos y trazabilidad; no hay SRS estructurado)* |
| **13. Data** | `data` | **IMPLEMENTADO** | `entidadesRegistradas`, `campoEntidades`, esquemas Sheets |
| **14. Design** | `design` | **IMPLEMENTADO** | `campoPantallas`, `campoNavegacion` |
| **15. Architecture**| `architecture` | **IMPLEMENTADO** | `componentesClaveEstado`, `selectorTipoProyecto`, diagramas |
| **16. Technology** | `technology` | **IMPLEMENTADO** | `selectorTipoProyecto`, `campoEntorno` |
| **17. Decisions** | `decisions` | **IMPLEMENTADO** | `decisionesRegistradas` (ADRs: array `{titulo, problema, motivo...}`) |
| **18. Skills** | `skills` | *NO IMPLEMENTADO* | *(Catálogo visual en UI; no persistido en estadoProyecto)* |
| **19. Traceability**| `traceability` | **IMPLEMENTADO** | `elementosTrazabilidad` (array `{requisito, actor, destino, prueba}`) |
| **20. Tests** | `tests` | *NO IMPLEMENTADO* | *(Parcial en campo prueba de trazabilidad; suites dedicadas no existen)* |
| **21. Production** | `production` | *NO IMPLEMENTADO* | *(Generación de código existe en UI; config CI/CD no persistida)* |
| **22. Maintenance**| `maintenance` | *NO IMPLEMENTADO* | *(Sección didáctica en UI; parámetros de mantenimiento no persistidos)* |
| **23. State** | `state` | *NO IMPLEMENTADO* | *(Radar se calcula al vuelo; estado de completitud no persistido)* |
| **24. Provenance** | `provenance` | *NO IMPLEMENTADO* | *(Metadatos de guardado existen; procedencia granular por campo no)* |
| **25. Integrity** | `integrity` | *NO IMPLEMENTADO* | *(Hash criptográfico del contexto no existe aún en estadoProyecto)* |

---

## 5. NORMALIZADOR DE CONTEXTO

La función conceptual normalizadora se define con la siguiente firma y responsabilidades:

```typescript
function normalizarContextoArchitex(estadoProyecto: ObjetoEstado): ContextoCanonicoArchitex;
```

### Responsabilidades del Normalizador:
1. **Desacoplar la UI:** Eliminar banderas de interfaz de usuario, temporizadores, índices de pestañas activas y referencias a elementos del DOM.
2. **Estructurar listas:** Garantizar que `entidadesRegistradas`, `elementosTrazabilidad` y `decisionesRegistradas` sean colecciones ordenadas y sin duplicados.
3. **Consolidar textos:** Normalizar saltos de línea (`\r\n` a `\n`), eliminar espacios redundantes y sanitizar cadenas.
4. **Preservar restricciones inmutables:** Mantener las reglas técnicas innegociables (ej. costo cero, español obligatorio, LockService, terminal Windows).
5. **Inyectar metadatos de versión y procedencia:** Establecer el encabezado de control antes de proyectar.

---

## 6. MODELO DE VERSIONADO, PROCEDENCIA E INTEGRIDAD

### 6.1. Triángulo de Versionado
Para evitar colisiones entre el software, la especificación y el proyecto:
* **`schemaVersion`:** Versión de la especificación técnica del RSC (ej. `"1.0.0"`). Cambia únicamente cuando se modifica la estructura del esquema canónico.
* **`contextVersion`:** Versión del contexto concreto del proyecto (ej. `"4.0.12"`). Se incrementa en cada mutación arquitectónica significativa.
* **`projectVersion`:** Versión comercial o de entrega del software gobernado (ej. `"V-36"`).

### 6.2. Modelo de Procedencia (`provenance`)
Cada segmento o atributo principal del contexto canónico debe poder rastrear su origen mediante una taxonomía formal:
* `USER`: Ingresado manualmente por el usuario en formularios o entrevistas.
* `ARCHITEX`: Deducido por reglas canónicas del motor o plantillas base del sistema.
* `DEEPSEEK`: Generado por inferencia del modelo en misiones agénticas o del Arquitecto IA.
* `AGENT`: Modificado por agentes externos gobernados a través de herramientas autorizadas.
* `SYSTEM`: Generado automáticamente por el entorno (timestamps, IDs de sesión).
* `IMPORTED`: Restaurado desde respaldos JSON o sincronizado desde Google Sheets.

### 6.3. Integridad Criptográfica (`integrity`)
El contexto proyectado incluirá un bloque de verificación:
* `algorithm`: `"SHA-256"`.
* `hash`: Hash criptográfico computado sobre el payload serializado del `ContextoCanonicoArchitex`.
* `generatedAt`: Marca de tiempo ISO-8601.

Esto permite al RSC-Harness y a los agentes detectar de forma instantánea si los archivos proyectados en disco corresponden a la versión viva de ARCHITEX o si han quedado desincronizados.

---

## 7. CATÁLOGO DE PROYECCIONES RSC

El RSC-Harness produce **proyecciones especializadas**, cada una adaptada al formato de consumo óptimo de cada agente o herramienta, sin duplicar ni bifurcar la verdad:

```text
                               ContextoCanonicoArchitex
                                          │
            ┌───────────────────┬─────────┴─────────┬───────────────────┐
            ▼                   ▼                   ▼                   ▼
   ARCHITEX_STATE.json     context.md          .cursorrules         CLAUDE.md
   (Máquina / Auditoría)   (Antigravity IDE)   (Cursor IDE)         (Claude Code)
            │                   │                   │                   │
            └───────────────────┴─────────┬─────────┴───────────────────┘
                                          ▼
                                     skills/*.md
                                (Capacidades modulares)
```

### 7.1. `ARCHITEX_STATE.json`
* **Destinatario:** Herramientas automatizadas, validadores de CI/CD, CLI y el propio compilador.
* **Naturaleza:** JSON estricto, canónico y exhaustivo.
* **Contenido:** Esquema completo de las 25 dimensiones, versión, hash y trazabilidad.
* **Seguridad:** **PROHIBIDO almacenar secretos, claves API, credenciales o Bearer tokens.**

### 7.2. `.antigravity/context.md`
* **Destinatario:** Google Antigravity IDE (Agente nativo).
* **Naturaleza:** Markdown denso, estructurado con alertas GitHub-style (`> [!IMPORTANT]`, etc.), tablas y diagramas Mermaid.
* **Contenido:** Identidad del sistema, restricciones arquitectónicas críticas, decisiones de arquitectura (ADRs), stack seleccionado, mapa de archivos canónicos y reglas de gobernanza.

### 7.3. `.cursorrules`
* **Destinatario:** Cursor IDE.
* **Naturaleza:** Reglas de comportamiento breves, directivas de linting, restricciones de modificación (áreas protegidas) y estilo de código.
* **Contenido:** Instrucción estricta de nomenclatura en español, prohibición de omitir LockService, directrices de terminal Windows (`cd /d`) y políticas de no-alucinación.

### 7.4. `CLAUDE.md`
* **Destinatario:** Claude Code CLI / Anthropic Agents.
* **Naturaleza:** Manual de instrucciones operativas, directrices de arquitectura, flujos de pruebas y límites de actuación.
* **Contenido:** Identidad, stack, comandos frecuentes de construcción y verificación, y referencia a las restricciones innegociables.

### 7.5. `/skills/*.md`
* **Destinatario:** Todos los agentes compatibles con el estándar de skills modular.
* **Naturaleza:** Archivos especializados bajo demanda con YAML frontmatter (`name`, `description`).
* **Contenido:** Instrucciones profundas para tareas especializadas identificadas por la arquitectura (ej. `lockservice-sheets.md`, `esp32-mqtt.md`, `laravel-filament.md`, `seguridad-auditoria.md`).

---

## 8. ESTRATEGIA ADAPTATIVA POR STACK Y PRESERVACIÓN DE ARCHIVOS

### 8.1. Detección Inteligente del Stack
El RSC-Harness adapta las proyecciones al dominio del proyecto indicado en `selectorTipoProyecto`:
* **`web_appsscript`:** Genera directivas para `clasp`, V8, HtmlService, Sheets y LockService. Proyecta skills de Google Apps Script.
* **`web_laravel`:** Genera directivas para PHP 8.3+, migraciones, multi-tenant y FilamentPHP. Proyecta skills de base de datos relacional.
* **`iot_mqtt`:** Genera directivas para ESP32, FreeRTOS, Mosquitto broker QoS 1 y RTC DS3231. Proyecta skills de firmware y hardware.
* **`movil_apk`:** Genera directivas para Flutter/React Native, almacenamiento offline SQLite y sincronización background.
* **`hibrido`:** Genera directivas multidominio con puentes MQTT/HTTP.

### 8.2. Regla Inviolable: NO Sobrescritura de Manifiestos Nativos
RSC **nunca destruye ni sobreescribe** archivos canónicos del ecosistema anfitrión si ya existen en el repositorio:
```text
SI EXISTE package.json / composer.json / platformio.ini:
    1. LEER y ANALIZAR dependencias actuales.
    2. PRESERVAR contenido preexistente.
    3. INYECTAR o SUGERIR únicamente dependencias ausentes necesarias.
NUNCA:
    Sobrescribir ciegamente el archivo completo.
```

---

## 9. DESACOPLAMIENTO DEEPSEEK / RSC

Se define una separación arquitectónica tajante para evitar bucles de resolución de contradicciones:

```text
CORRECTO:
  ARCHITEX OS ──(En memoria)──> ContextoCanónico ──> DeepSeek
  ARCHITEX OS ──(En disco)────> RSC-Harness     ──> Antigravity / Cursor / Claude

INCORRECTO (PROHIBIDO):
  ARCHITEX OS ──> Archivos RSC en disco ──> DeepSeek lee CLAUDE.md / .cursorrules
  (Produce ambigüedad, pérdida de tokens y deriva agéntica).
```

* **DeepSeek** recibe el contexto directamente de ARCHITEX a través de los payloads de `ServicioIA` en memoria.
* **Los agentes externos** leen las proyecciones físicas generadas en el disco de trabajo.
* Ambos consumen **exactamente la misma verdad**, pero a través de sus canales idóneos.

---

## 10. CICLO DE VIDA DEL RSC Y RELACIÓN CON LAS 4 ESTACIONES

El RSC no es estático; evoluciona a medida que el proyecto recorre el **Viaje Didáctico**:

```text
ESTACIÓN 1: CONCEBIR      ──> RSC Inicial (Alcance, Idea, Problema, Restricciones).
ESTACIÓN 2: ESTRUCTURAR   ──> RSC Estructurado (Entidades ER, Roles, Pantallas, Topología).
ESTACIÓN 3: VALIDAR       ──> RSC Blindado (ADRs, Trazabilidad, Gate de Control Verde).
ESTACIÓN 4: CONSTRUIR     ──> RSC Operativo (Árbol de archivos, cola agéntica, skills).
```

### Estados Conceptuales del RSC:
* **`GENERADO`:** Los archivos de proyección han sido creados y su hash coincide con el estado vivo de ARCHITEX.
* **`VALIDADO`:** El proyecto cumple con la Puerta de Control de Arquitectura (Gate Verde: MVP, roles y problema delimitados).
* **`DESACTUALIZADO`:** `estadoProyecto` ha mutado en ARCHITEX, pero el RSC físico no ha sido recompilado (hash discrepante).
* **`INVALIDO`:** La integridad estructural del RSC ha sido corrompida o contiene referencias contradictorias.

---

## 11. SEGURIDAD Y AISLAMIENTO MULTI-TENANT

1. **Exclusión de Secretos:** Ninguna clave de API (`sk-...`), token OAuth, credencial de base de datos ni secreto de Google Apps Script o Cloud Console puede filtrarse en las proyecciones RSC. Las claves permanecen en `PropertiesService` en servidor.
2. **Aislamiento Multi-Tenant:** Cuando el contexto incluya delimitación multi-inquilino (`campoMultitenant`):
   * `tenantId` delimita el espacio de datos y configuración del cliente.
   * `projectId` delimita la especificación del sistema.
   * Los contextos de diferentes tenants o proyectos nunca se fusionan ni comparten proyecciones comunes.

---

## 12. TABLA MAESTRA DE RESPONSABILIDADES

| Artefacto / Componente | Función Principal | Fuente Primaria | ¿Puede Autorizar? | ¿Puede Ejecutar? | ¿Es Fuente de Verdad? |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **`estadoProyecto`** | Estado de memoria / UI viva | ARCHITEX OS (Cliente) | **NO** | **NO** | **SÍ (Local)** |
| **Google Sheets / Base** | Persistencia oficial | Backend ARCHITEX | **NO** | **NO** | **SÍ (Remota)** |
| **`ContextoCanonicoArchitex`**| Normalización técnica | ARCHITEX OS | **NO** | **NO** | **SÍ (Derivada)** |
| **`ARCHITEX_STATE.json`** | Contexto estructurado en disco | Contexto Canónico | **NO** | **NO** | **NO (Proyección)** |
| **`.antigravity/context.md`** | Contexto para Antigravity IDE | Contexto Canónico | **NO** | **NO** | **NO (Proyección)** |
| **`.cursorrules`** | Reglas de trabajo en Cursor | Contexto Canónico | **NO** | **NO** | **NO (Proyección)** |
| **`CLAUDE.md`** | Instrucciones para Claude Code | Contexto Canónico | **NO** | **NO** | **NO (Proyección)** |
| **`skills/*.md`** | Guías de habilidades técnicas | Contexto Canónico | **NO** | **NO** | **NO (Proyección)** |
| **`GobernanzaAgente.gs`** | Autorización y validación | Servidor Apps Script | **SÍ** | **NO** | **SÍ (Gobernanza)** |
| **Backend (`Codigo.gs`)** | Mutación segura con Lock | Servidor Apps Script | **NO** | **SÍ** | **SÍ (Ejecución)** |
| **DeepSeek** | Inferencia y razonamiento | Contexto recibido | **NO** | **NO** | **NO (Razonador)** |
| **`_ARCHITEX_ACCIONES_AGENTE`**| Auditoría inmutable de hechos | Backend ARCHITEX | **NO** | **NO** | **SÍ (Histórica)** |

---

## 13. CONDICIÓN DE TRANSICIÓN HACIA RSC-2

La presente especificación de contrato es suficiente, autocontenida y exhaustiva.
Queda formalmente aprobada para servir de base a la **FASE RSC-2 — COMPILADOR DE CONTEXTO CANÓNICO**, en la cual se implementará la función física normalizadora y el generador reproducible de artefactos sin necesidad de rediseñar contratos ni alterar la arquitectura de gobernanza.
