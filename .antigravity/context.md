# ARCHITEX OS V-36 — CONTEXTO CANÓNICO DE ARQUITECTURA

> **Context Hash:** `99acfdf8952c05a0d91ded67e220e01ea8b45b14bc8671eef164f541abf42727`
> **Schema Version:** `1.0.0` | **Context Version:** `1.2.0` | **Project Version:** `V-36`
> **Project ID:** `proy_1790980470320` | **Tenant ID:** `no` | **Source:** `ARCHITEX_OS_V36`
> **Generated At:** `2026-10-04T23:23:35.749Z`

---

## 1. Identidad del Sistema (`identity`)
- **ID Proyecto:** proy_1790980470320
- **Nombre Proyecto:** ARCHITEX-OS
- **Tipo de Proyecto:** web_laravel

## 2. Definición del Problema (`problem`)
Los equipos de arquitectura técnica carecen de un sistema unificado de gobernanza que conecte la especificación de proyectos (SDD), la auditoría de decisiones y la orquestación de agentes IA, provocando pérdida de trazabilidad, decisiones sin historial versionado y fricción entre documentación, código y despliegue.

## 3. Objetivos (`objectives`)
Proveer una plataforma web de gobernanza y auditoría de arquitectura técnica que centralice el ciclo de vida de proyectos (problema, objetivo, público, entorno, MVP, restricciones, roles), versione cada cambio en un historial inmutable y orqueste agentes IA de desarrollo y refutación mediante comandos SDD, todo sobre infraestructura Google Workspace sin servidores propios.

## 4. Audiencia y Usuarios Clave (`audience`)
Arquitectos de software, ingenieros principales, tech leads y equipos de plataforma que operan bajo metodologías SDD (Spec-Driven Development) y requieren gobernanza auditable; también agentes IA (Cursor, Antigravity) que consumen el harness de comandos y agentes para asistir el ciclo de desarrollo.

## 5. Entorno Operativo y Plataforma (`environment`)
- **Plataforma:** Google Apps Script (runtime V8) como backend serverless, Google Sheets como base de datos estructurada (pestañas _ARCHITEX_PROYECTOS y _ARCHITEX_HISTORIAL), Google Drive para artefactos de auditoría, HTML5/CSS3/JS vanilla como SPA cliente servida vía HtmlService, y despliegue gestionado con clasp. Zona horaria America/Mexico_City. Acceso web público (ANYONE) con ejecución como USER_DEPLOYING.
- **Dispositivos:** Computadoras de aula de medios, laptops de docentes, teléfonos móviles inteligentes (Android / iOS) vía navegador y tabletas.
- **Estrategia Offline:** Si se interrumpe la conexión durante una lectura, el cronómetro local en JavaScript no se interrumpe. Las respuestas del cuestionario se guardan temporalmente en localStorage y se sincronizan automáticamente en segundo plano cuando el navegador detecta evento 'online'.

## 6. Alcance del MVP (`mvp`)
Web App funcional que: (1) sirve una SPA de gobernanza desde Apps Script, (2) permite crear/leer/actualizar proyectos con los 8 campos canónicos (problema, objetivo, público, entorno, MVP, restricciones, roles, nombre), (3) persiste cada cambio en _ARCHITEX_PROYECTOS y versiona snapshots en _ARCHITEX_HISTORIAL, (4) expone un harness de 17 comandos SDD y 2 agentes IA (developer, refuter-correctness) en .cursor/, y (5) despliega vía clasp con appsscript.json configurado.

## 7. Alcance Futuro (`future`)
- Evaluación automática de fluidez y dicción oral mediante IA y reconocimiento de voz (Speech-to-Text).
- Notificaciones automáticas por WhatsApp a tutores ante faltas acumuladas.
- Biblioteca digital comunitaria con descarga de audiolibros.
- Migración a backend dedicado en Laravel 11 cuando se superen 500 alumnos concurrentes.

## 8. Restricciones Técnicas Innegociables (`constraints`)
- **Reglas Obligatorias:** 1. Dependencia total de Google Workspace (lock-in costo $0 USD).
2. Cuotas de Apps Script (6 min ejecución, triggers limitados).
3. Sheets protegido con LockService (timeout 15s) para transaccionalidad.
4. index.html monolítico.
5. Sin autenticación granular (acceso ANYONE con ejecución USER_DEPLOYING).
6. Nomenclatura obligatoria en ESPAÑOL.
- **Política $0 USD:** Sí ($0 USD)
- **Idioma / Nomenclatura:** ES_MX
- **Control de Concurrencia:** LOCK_SERVICE
- **Terminal Objetivo:** WINDOWS_POWERSHELL_CMD

## 9. Roles del Sistema (`roles`)
Arquitecto Principal (diseño de capas, modelo de datos, decisiones estructurales)
Ingeniero de Software (implementación en Codigo.gs e index.html)
Agente IA Developer (.cursor/agents/developer.md — generación de código)
Agente IA Refuter-Correctness (.cursor/agents/refuter-correctness.md — validación adversarial)
Auditor de Gobernanza (revisión de _ARCHITEX_HISTORIAL y decisiones.md)
Usuario Final (arquitecto/tech lead que consume la SPA)
Deployer (cuenta Google que ejecuta clasp y posee permisos sobre Sheet/Drive)

## 10. Usuarios del Sistema (`users`)
- **Total Perfiles:** 3
- **Perfiles Registrados:**
  - **USR-01 — Arquitecto Humano** (ADMIN_ARCHITECT):
    - *Descripción:* Responsable de diseño de alto nivel, validación de SDD, aprobación de ADRs y autorización de evoluciones canónicas.
    - *Capacidades:* AUTHORIZE_MUTATIONS, DECIDE_ADRS, APPROVE_REGENERATION
  - **USR-02 — Agente IA Gobernado** (READ_ONLY_EXECUTION):
    - *Descripción:* Agentes automatizados (Cursor, Antigravity, Claude) que asisten en generación, verificación adversarial y refutación bajo arnés RSC.
    - *Capacidades:* VERIFY_CONTEXT, AUDIT_CONSTRAINTS, REFUTE_CORRECTNESS
  - **USR-03 — Ingeniero de Software** (CONTRIBUTOR):
    - *Descripción:* Implementador de módulos de software en código fuente bajo los contratos canónicos definidos.
    - *Capacidades:* CODE_IMPLEMENTATION, RUN_TESTS

## 11. Entidades y Modelado de Datos (`entities`)
- **Resumen:** Proyectos (id, nombre, version, tipo_arquitectura, autor, fecha_creacion)
_ARCHITEX_PROYECTOS (ID_PROYECTO, NOMBRE_PROYECTO, FECHA_ACTUALIZACION, RESUMEN_PROBLEMA, DATOS_JSON_COMPLETOS)
_ARCHITEX_HISTORIAL (ID_HISTORIAL, ID_PROYECTO, NOMBRE_PROYECTO, FECHA_VERSION, RESUMEN, DATOS_JSON)
_ARCHITEX_RESPALDOS_JSON (carpeta drive para payloads > 45KB)
Decisiones_ADR (id, codigo_adr, titulo, problema, decision_tomada, justificacion)
DirectricesRSC (agentes_objetivo, ruta_reglas, skills_instaladas)
- **Entidades Registradas:**
  - **Alumnos:** `id, nombre_completo, grupo_id, matricula, es_invidente, fecha_registro`
  - **Docentes:** `id, nombre_completo, correo_electronico, asignatura_principal`
  - **Lecturas:** `id, titulo, materia, total_palabras, contenido_texto`
  - **SesionesLectura:** `id, alumno_id, lectura_id, segundos_totales, palabras_por_minuto, calificacion_quiz, fecha_hora`
  - **Asistencias:** `id, alumno_id, docente_id, fecha, estado, justificacion`
  - **ClasesAudio:** `id, titulo, contenido_voz, duracion_estimada, docente_id, fecha_publicacion`

## 12. Requisitos Formales (`requirements`)
- **Total Requisitos:** 5
- **Catálogo de Requisitos:**
  - **REQ-F01** [FUNCTIONAL] (HIGH | APPROVED): Normalización y proyección determinista de contexto
    - *Declaración:* El sistema debe transformar el estado del proyecto en un contexto canónico con hash SHA-256 sin depender de timestamps volátiles ni red.
    - *Trazabilidad:* `rsc/normalizadorContexto.mjs`
  - **REQ-F02** [FUNCTIONAL] (HIGH | APPROVED): Verificación y certificación cooperativa de agentes
    - *Declaración:* El arnés RSC-4/RSC-6 debe certificar que las proyecciones portan el hash canónico y rechazar contextos incompletos, manipulados o con fugas de gobernanza.
    - *Trazabilidad:* `rsc/verificadorContexto.mjs`
  - **REQ-F03** [FUNCTIONAL] (HIGH | APPROVED): Regeneración atómica en staging gobernada
    - *Declaración:* RSC-5 debe requerir autorización explícita para sincronizar proyecciones, verificando el staging antes de realizar reemplazo físico.
    - *Trazabilidad:* `rsc/regeneradorProyecciones.mjs`
  - **REQ-NF01** [NON_FUNCTIONAL] (MANDATORY | APPROVED): Costo de servidor $0 USD y runtime serverless
    - *Declaración:* Operar sobre infraestructura Google Workspace (Apps Script runtime V8 + Sheets) sin servidores dedicados.
    - *Trazabilidad:* `ConfiguracionBase.gs`
  - **REQ-NF02** [NON_FUNCTIONAL] (MANDATORY | APPROVED): Concurrencia protegida mediante LockService
    - *Declaración:* Toda mutación en Google Sheets debe ejecutarse bajo LockService con timeout de 15 segundos para evitar sobreescritura concurrente.
    - *Trazabilidad:* `Codigo.gs`

## 13. Datos y Persistencia (`data`)
- **Motor de Almacenamiento:** `MYSQL`
- **Resumen:** Proyectos (id, nombre, version, tipo_arquitectura, autor, fecha_creacion)
_ARCHITEX_PROYECTOS (ID_PROYECTO, NOMBRE_PROYECTO, FECHA_ACTUALIZACION, RESUMEN_PROBLEMA, DATOS_JSON_COMPLETOS)
_ARCHITEX_HISTORIAL (ID_HISTORIAL, ID_PROYECTO, NOMBRE_PROYECTO, FECHA_VERSION, RESUMEN, DATOS_JSON)
_ARCHITEX_RESPALDOS_JSON (carpeta drive para payloads > 45KB)
Decisiones_ADR (id, codigo_adr, titulo, problema, decision_tomada, justificacion)
DirectricesRSC (agentes_objetivo, ruta_reglas, skills_instaladas)

## 14. Diseño de Vistas y Navegación (`design`)
- **Estructura de Pantallas:** 1. Pantalla de Bienvenida y Selección de Rol
2. Panel Docente: Pase de lista y selector de grupos
3. Panel Alumno: Ruleta interactiva, visor de lectura con cronómetro y evaluación
4. Panel Accesible: Interfaz de audio simplificada de alto contraste con comandos por voz y atajos
5. Reporte de Desempeño: Gráficos de comprensión y porcentaje de asistencia escolar
- **Estrategia de Navegación:** Barra superior minimalista con indicador de conexión y usuario activo. Pestañas de navegación directa entre módulos. Botón visible y accesible de 'Cerrar Sesión'. Atajos de teclado universales (Alt+1 Lectura, Alt+2 Asistencia, Alt+3 Accesibilidad).

## 15. Arquitectura Técnica y Topología (`architecture`)
- **Tipo de Topología:** `web_laravel`
- **Componentes Clave:**


## 16. Tecnología y Stack (`technology`)
- **Ecosistema:** `web_laravel`
- **Runtime:** `PHP`

## 17. Registro de Decisiones de Arquitectura - ADRs (`decisions`)
### ADR-001: Persistencia en Google Sheets con LockService
- **Problema:** ¿Cómo almacenar datos sin costo de servidor garantizando integridad?
- **Motivo:** Sheets con LockService permite costo cero y previene corrupción de datos en concurrencia.
- **Fecha:** 02/10/2026

### ADR-002: Separación en Capas Agnóstica de Framework
- **Problema:** ¿Cómo facilitar la migración futura a Laravel sin reescribir la lógica escolar?
- **Motivo:** Los servicios de dominio quedan puros y en español, listos para portarse a cualquier backend.
- **Fecha:** 02/10/2026

### ADR-003: Accesibilidad Nativa sin Plugins Externos
- **Problema:** ¿Cómo garantizar soporte inmediato para el alumno invidente?
- **Motivo:** Web Speech API funciona sin internet y no añade peso a la aplicación web.
- **Fecha:** 02/10/2026

## 18. Habilidades Requeridas (`skills`)
- **Total Habilidades:** 3
- **Catálogo de Habilidades:**
  - **SKL-01 — Contexto Canónico y Proyecciones**:
    - *Descripción:* Interpretación y consumo de ARCHITEX_STATE.json y Markdown canónico
    - *Agentes Objetivo:* Cursor, Antigravity, Claude
    - *Reglas / Referencia:* `skills/architex-context/SKILL.md`
  - **SKL-02 — Concurrencia Atómica con LockService**:
    - *Descripción:* Patrón tryLock(10000)/finally releaseLock para escrituras concurrentes en Google Sheets (ADR-001)
    - *Agentes Objetivo:* Developer, Human Architect
    - *Reglas / Referencia:* `skills/lockservice-concurrency/SKILL.md`
  - **SKL-03 — Accesibilidad Nativa Web Speech API**:
    - *Descripción:* Locución por voz client-side y navegación accesible WCAG 2.1 AA
    - *Agentes Objetivo:* Frontend Agent
    - *Reglas / Referencia:* `ADR-003`

## 19. Matriz de Trazabilidad (`traceability`)
- **Requisito:** Calcular PPM en lecturas | **Actor:** Alumno | **Destino:** ServicioLectura.gs | **Prueba:** Cronómetro no se reinicia y calcula PPM = (palabras/seg)*60
- **Requisito:** Pase de lista sin colisiones | **Actor:** Docente | **Destino:** RepositorioAsistencia.gs | **Prueba:** Escritura concurrente concurre bajo LockService sin sobreescritura
- **Requisito:** Lectura auditiva accesible | **Actor:** AlumnoInvidente | **Destino:** ModuloAccesibilidad.js | **Prueba:** Barra espaciadora alterna reproducción de audio con WCAG 2.1 AA
- **Requisito:** Sincronización offline de quizzes | **Actor:** Alumno | **Destino:** AlmacenamientoLocalCache.js | **Prueba:** Envía respuestas al reconectar sin perder datos

## 20. Pruebas y Validación (`tests`)
- **Framework:** Node.js Pure Assertions Harness
- **Estrategia:** Aislamiento determinista, no-mutación, pruebas adversariales de linaje y verificación de staging (RSC-2 a RSC-6)
- **Total Suites:** 8
- **Catálogo de Suites:**
  - **T-RSC2 — Normalizador Canónico**:
    - *Comando:* `node rsc/pruebasRsc2Normalizador.mjs`
    - *Aserciones:* 51
    - *Propósito:* Normalización determinista, saneamiento de secretos y no-invención
  - **T-RSC3 — Generador de Proyecciones Físicas**:
    - *Comando:* `node rsc/pruebasRsc3Proyecciones.mjs`
    - *Aserciones:* 19
    - *Propósito:* Generación pura de JSON, Markdown y skills
  - **T-RSC4 — Verificador Canónico**:
    - *Comando:* `node rsc/pruebasRsc4Verificacion.mjs`
    - *Aserciones:* 39
    - *Propósito:* Certificación de integridad, detección de tampering y validación de linaje
  - **T-RSC5 — Regenerador Staging**:
    - *Comando:* `node rsc/pruebasRsc5Regeneracion.mjs`
    - *Aserciones:* 22
    - *Propósito:* Autorización explícita, generación en staging y reemplazo atómico
  - **T-RSC6 — CLI Harness**:
    - *Comando:* `node rsc/pruebasRsc6Harness.mjs`
    - *Aserciones:* 40
    - *Propósito:* Consumo cooperativo y diagnóstico CLI
  - **T-F3 — Evolución y Linaje C0**:
    - *Comando:* `node rsc/pruebasF3Evolucion.mjs`
    - *Aserciones:* 34
    - *Propósito:* Génesis y Floor Guard F3
  - **T-F4 — Evolución C0 -> C1**:
    - *Comando:* `node rsc/pruebasF4Evolucion.mjs`
    - *Aserciones:* 35
    - *Propósito:* Linaje C0->C1 y activación de users y requirements
  - **T-F51 — Evolución C1 -> C2**:
    - *Comando:* `node rsc/pruebasF51Evolucion.mjs`
    - *Aserciones:* 48
    - *Propósito:* Linaje C1->C2 y activación de skills y tests

## 21. Configuración de Producción (`production`)
*Estado:* `NO_IMPLEMENTADO` (Sin configuración de producción persistida)

## 22. Mantenimiento y Operación (`maintenance`)
*Estado:* `NO_IMPLEMENTADO` (Sin directrices de mantenimiento persistidas)

## 23. Estado de Completitud (`state`)
*Estado:* `NO_IMPLEMENTADO` (Radar y Semáforo son métricas computadas en UI)

## 24. Procedencia de Atributos (`provenance`)
*Estado:* `NO_IMPLEMENTADO` (Trazabilidad de origen reservada para Fase F6)

## 25. Verificación de Integridad (`integrity`)
*Estado:* `NO_IMPLEMENTADO` (Cadena criptográfica de bloques reservada para Fase F6)
