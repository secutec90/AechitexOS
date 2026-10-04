/**
 * ARCHITEX OS V-36 — RSC-3: GENERADOR DE PROYECCIONES FÍSICAS
 *
 * Transforma el Contexto Canónico intermedio (ContextoCanonicoArchitex)
 * en proyecciones físicas legibles y consumibles por agentes externos:
 * - ARCHITEX_STATE.json
 * - .antigravity/context.md
 * - .cursorrules
 * - CLAUDE.md
 * - skills/
 *
 * Reglas fundamentales:
 * 1. La única entrada es ContextoCanonicoArchitex (nunca lee directamente estadoProyecto).
 * 2. Las proyecciones son derivadas, nunca fuente de verdad.
 * 3. Todas las proyecciones portan el contentHash del contexto canónico.
 * 4. Las dimensiones NO_IMPLEMENTADO permanecen explícitas (sin invenciones ni inferencias).
 * 5. Cero secretos, cero gobernanza ejecutable, cero llamadas de red.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Genera el contenido en memoria de todas las proyecciones RSC-3 a partir del contexto canónico.
 * Función pura respecto al contexto recibido.
 *
 * @param {Object} contexto - Objeto ContextoCanonicoArchitex válido.
 * @param {Object} [opciones] - Opciones adicionales de generación.
 * @return {Object} Mapa de proyecciones con sus contenidos serializados.
 */
export function generarProyeccionesRsc3(contexto, opciones = {}) {
  if (!contexto || typeof contexto !== 'object') {
    throw new Error('generarProyeccionesRsc3: Se requiere un objeto ContextoCanonicoArchitex válido.');
  }

  // Comprobación de integridad del contrato canónico
  const schemaVersion = contexto.schemaVersion || '1.0.0';
  const contextVersion = contexto.contextVersion || '1.0.0';
  const projectVersion = contexto.projectVersion || 'V-36';
  const generatedAt = contexto.generatedAt || new Date().toISOString();
  const projectId = contexto.projectId || null;
  const tenantId = contexto.tenantId || null;
  const source = contexto.source || 'ARCHITEX_OS_V36';
  const contentHash = contexto.contentHash || 'HASH_NO_DISPONIBLE';

  const dimensionesClaves = [
    'identity', 'problem', 'objectives', 'audience', 'environment', 'mvp', 'future',
    'constraints', 'roles', 'users', 'entities', 'requirements', 'data', 'design',
    'architecture', 'technology', 'decisions', 'skills', 'traceability', 'tests',
    'production', 'maintenance', 'state', 'provenance', 'integrity'
  ];

  // Extraer dimensiones respetando status y value
  const dimensiones = {};
  dimensionesClaves.forEach(dim => {
    if (contexto[dim] && typeof contexto[dim] === 'object') {
      dimensiones[dim] = {
        status: contexto[dim].status || 'NO_IMPLEMENTADO',
        value: contexto[dim].value !== undefined ? contexto[dim].value : null
      };
    } else {
      dimensiones[dim] = {
        status: 'NO_IMPLEMENTADO',
        value: null
      };
    }
  });

  // =========================================================================
  // 1. PROYECCIÓN: ARCHITEX_STATE.json
  // =========================================================================
  const estadoEstructurado = {
    schemaVersion,
    contextVersion,
    projectVersion,
    generatedAt,
    projectId,
    tenantId,
    source,
    contentHash,
    dimensions: dimensiones
  };
  const architexStateJson = JSON.stringify(estadoEstructurado, null, 2);

  // =========================================================================
  // 2. PROYECCIÓN: .antigravity/context.md
  // =========================================================================
  const lineasAntigravity = [
    `# ARCHITEX OS V-36 — CONTEXTO CANÓNICO DE ARQUITECTURA`,
    ``,
    `> **Context Hash:** \`${contentHash}\``,
    `> **Schema Version:** \`${schemaVersion}\` | **Context Version:** \`${contextVersion}\` | **Project Version:** \`${projectVersion}\``,
    `> **Project ID:** \`${projectId || 'null'}\` | **Tenant ID:** \`${tenantId || 'null'}\` | **Source:** \`${source}\``,
    `> **Generated At:** \`${generatedAt}\``,
    ``,
    `---`,
    ``,
    `## 1. Identidad del Sistema (\`identity\`)`,
    dimensiones.identity.status === 'IMPLEMENTADO' && dimensiones.identity.value
      ? `- **ID Proyecto:** ${dimensiones.identity.value.projectId || 'N/A'}\n- **Nombre Proyecto:** ${dimensiones.identity.value.projectName || 'N/A'}\n- **Tipo de Proyecto:** ${dimensiones.identity.value.projectType || 'N/A'}`
      : `*Estado:* \`NO_IMPLEMENTADO\` (Sin datos registrados)`,
    ``,
    `## 2. Definición del Problema (\`problem\`)`,
    dimensiones.problem.status === 'IMPLEMENTADO' && dimensiones.problem.value
      ? `${dimensiones.problem.value.centralProblem || 'N/A'}`
      : `*Estado:* \`NO_IMPLEMENTADO\``,
    ``,
    `## 3. Objetivos (\`objectives\`)`,
    dimensiones.objectives.status === 'IMPLEMENTADO' && dimensiones.objectives.value
      ? `${dimensiones.objectives.value.primaryObjective || 'N/A'}`
      : `*Estado:* \`NO_IMPLEMENTADO\``,
    ``,
    `## 4. Audiencia y Usuarios Clave (\`audience\`)`,
    dimensiones.audience.status === 'IMPLEMENTADO' && dimensiones.audience.value
      ? `${dimensiones.audience.value.targetAudience || 'N/A'}`
      : `*Estado:* \`NO_IMPLEMENTADO\``,
    ``,
    `## 5. Entorno Operativo y Plataforma (\`environment\`)`,
    dimensiones.environment.status === 'IMPLEMENTADO' && dimensiones.environment.value
      ? `- **Plataforma:** ${dimensiones.environment.value.targetPlatform || 'N/A'}\n- **Dispositivos:** ${dimensiones.environment.value.supportedDevices || 'N/A'}\n- **Estrategia Offline:** ${dimensiones.environment.value.offlineStrategy || 'N/A'}`
      : `*Estado:* \`NO_IMPLEMENTADO\``,
    ``,
    `## 6. Alcance del MVP (\`mvp\`)`,
    dimensiones.mvp.status === 'IMPLEMENTADO' && dimensiones.mvp.value
      ? `${dimensiones.mvp.value.scopeDefinition || 'N/A'}`
      : `*Estado:* \`NO_IMPLEMENTADO\``,
    ``,
    `## 7. Alcance Futuro (\`future\`)`,
    dimensiones.future.status === 'IMPLEMENTADO' && dimensiones.future.value
      ? `${dimensiones.future.value.roadmapDescription || 'N/A'}`
      : `*Estado:* \`NO_IMPLEMENTADO\``,
    ``,
    `## 8. Restricciones Técnicas Innegociables (\`constraints\`)`,
    dimensiones.constraints.status === 'IMPLEMENTADO' && dimensiones.constraints.value
      ? `- **Reglas Obligatorias:** ${dimensiones.constraints.value.mandatoryRules || 'N/A'}\n- **Política $0 USD:** ${dimensiones.constraints.value.zeroCostPolicy ? 'Sí ($0 USD)' : 'No'}\n- **Idioma / Nomenclatura:** ${dimensiones.constraints.value.namingLanguage || 'es-MX'}\n- **Control de Concurrencia:** ${dimensiones.constraints.value.concurrencyControl || 'LOCK_SERVICE'}\n- **Terminal Objetivo:** ${dimensiones.constraints.value.terminalTarget || 'WINDOWS_POWERSHELL_CMD'}`
      : `*Estado:* \`NO_IMPLEMENTADO\``,
    ``,
    `## 9. Roles del Sistema (\`roles\`)`,
    dimensiones.roles.status === 'IMPLEMENTADO' && dimensiones.roles.value
      ? `${dimensiones.roles.value.rolesDefinition || 'N/A'}`
      : `*Estado:* \`NO_IMPLEMENTADO\``,
    ``,
    `## 10. Usuarios del Sistema (\`users\`)`,
    dimensiones.users.status === 'IMPLEMENTADO' && dimensiones.users.value && Array.isArray(dimensiones.users.value.targetProfiles)
      ? `- **Total Perfiles:** ${dimensiones.users.value.totalProfiles || dimensiones.users.value.targetProfiles.length}\n- **Perfiles Registrados:**\n${dimensiones.users.value.targetProfiles.map(u => `  - **${u.id || 'N/A'} — ${u.role || 'N/A'}** (${u.accessLevel || 'N/A'}):\n    - *Descripción:* ${u.description || 'N/A'}\n    - *Capacidades:* ${Array.isArray(u.capabilities) ? u.capabilities.join(', ') : 'N/A'}`).join('\n')}`
      : `*Estado:* \`NO_IMPLEMENTADO\` (Sin perfiles de usuario detallados persistidos)`,
    ``,
    `## 11. Entidades y Modelado de Datos (\`entities\`)`,
    dimensiones.entities.status === 'IMPLEMENTADO' && dimensiones.entities.value
      ? `- **Resumen:** ${dimensiones.entities.value.summary || 'N/A'}\n- **Entidades Registradas:**\n${Array.isArray(dimensiones.entities.value.registeredEntities) ? dimensiones.entities.value.registeredEntities.map(e => `  - **${e.nombre}:** \`${e.campos}\``).join('\n') : '  *(Ninguna entidad estructurada)*'}`
      : `*Estado:* \`NO_IMPLEMENTADO\``,
    ``,
    `## 12. Requisitos Formales (\`requirements\`)`,
    dimensiones.requirements.status === 'IMPLEMENTADO' && dimensiones.requirements.value && Array.isArray(dimensiones.requirements.value.catalog)
      ? `- **Total Requisitos:** ${dimensiones.requirements.value.totalRequirements || dimensiones.requirements.value.catalog.length}\n- **Catálogo de Requisitos:**\n${dimensiones.requirements.value.catalog.map(r => `  - **${r.id || 'REQ'}** [${r.type || 'FUNCTIONAL'}] (${r.priority || 'MEDIUM'} | ${r.status || 'PROPOSED'}): ${r.title || ''}\n    - *Declaración:* ${r.statement || 'N/A'}\n    - *Trazabilidad:* \`${r.traceabilityTarget || 'N/A'}\``).join('\n')}`
      : `*Estado:* \`NO_IMPLEMENTADO\` (Sin colección formal persistida en estadoProyecto)`,
    ``,
    `## 13. Datos y Persistencia (\`data\`)`,
    dimensiones.data.status === 'IMPLEMENTADO' && dimensiones.data.value
      ? `- **Motor de Almacenamiento:** \`${dimensiones.data.value.storageEngine || 'GOOGLE_SHEETS'}\`\n- **Resumen:** ${dimensiones.data.value.entitiesSummary || 'N/A'}`
      : `*Estado:* \`NO_IMPLEMENTADO\``,
    ``,
    `## 14. Diseño de Vistas y Navegación (\`design\`)`,
    dimensiones.design.status === 'IMPLEMENTADO' && dimensiones.design.value
      ? `- **Estructura de Pantallas:** ${dimensiones.design.value.screensStructure || 'N/A'}\n- **Estrategia de Navegación:** ${dimensiones.design.value.navigationStrategy || 'N/A'}`
      : `*Estado:* \`NO_IMPLEMENTADO\``,
    ``,
    `## 15. Arquitectura Técnica y Topología (\`architecture\`)`,
    dimensiones.architecture.status === 'IMPLEMENTADO' && dimensiones.architecture.value
      ? `- **Tipo de Topología:** \`${dimensiones.architecture.value.topologyType || 'N/A'}\`\n- **Componentes Clave:**\n${dimensiones.architecture.value.keyComponentsStatus ? Object.entries(dimensiones.architecture.value.keyComponentsStatus).map(([k, v]) => `  - \`${k}\`: ${v ? 'Activo' : 'Inactivo'}`).join('\n') : '  *(Sin componentes declarados)*'}`
      : `*Estado:* \`NO_IMPLEMENTADO\``,
    ``,
    `## 16. Tecnología y Stack (\`technology\`)`,
    dimensiones.technology.status === 'IMPLEMENTADO' && dimensiones.technology.value
      ? `- **Ecosistema:** \`${dimensiones.technology.value.selectedEcosystem || 'N/A'}\`\n- **Runtime:** \`${dimensiones.technology.value.runtime || 'N/A'}\``
      : `*Estado:* \`NO_IMPLEMENTADO\``,
    ``,
    `## 17. Registro de Decisiones de Arquitectura - ADRs (\`decisions\`)`,
    dimensiones.decisions.status === 'IMPLEMENTADO' && dimensiones.decisions.value && Array.isArray(dimensiones.decisions.value.registeredAdrs)
      ? dimensiones.decisions.value.registeredAdrs.map(d => `### ${d.titulo || 'ADR'}\n- **Problema:** ${d.problema || 'N/A'}\n- **Motivo:** ${d.motivo || 'N/A'}\n- **Fecha:** ${d.fecha || 'N/A'}`).join('\n\n')
      : `*Estado:* \`NO_IMPLEMENTADO\``,
    ``,
    `## 18. Habilidades Requeridas (\`skills\`)`,
    dimensiones.skills.status === 'IMPLEMENTADO' && dimensiones.skills.value && Array.isArray(dimensiones.skills.value.skillsCatalog)
      ? `- **Total Habilidades:** ${dimensiones.skills.value.totalSkills || dimensiones.skills.value.skillsCatalog.length}\n- **Catálogo de Habilidades:**\n${dimensiones.skills.value.skillsCatalog.map(s => `  - **${s.id || 'SKL'} — ${s.name || s.nombre || 'N/A'}**:\n    - *Descripción:* ${s.description || s.descripcion || 'N/A'}\n    - *Agentes Objetivo:* ${Array.isArray(s.targetAgents || s.agentesObjetivo) ? (s.targetAgents || s.agentesObjetivo).join(', ') : 'N/A'}\n    - *Reglas / Referencia:* \`${s.rulesetRef || s.referenciaReglas || 'N/A'}\``).join('\n')}`
      : `*Estado:* \`NO_IMPLEMENTADO\` (Sin habilidades requeridas persistidas en estadoProyecto)`,
    ``,
    `## 19. Matriz de Trazabilidad (\`traceability\`)`,
    dimensiones.traceability.status === 'IMPLEMENTADO' && dimensiones.traceability.value && Array.isArray(dimensiones.traceability.value.matrix)
      ? dimensiones.traceability.value.matrix.map(t => `- **Requisito:** ${t.requisito} | **Actor:** ${t.actor} | **Destino:** ${t.destino} | **Prueba:** ${t.prueba}`).join('\n')
      : `*Estado:* \`NO_IMPLEMENTADO\``,
    ``,
    `## 20. Pruebas y Validación (\`tests\`)`,
    dimensiones.tests.status === 'IMPLEMENTADO' && dimensiones.tests.value
      ? `- **Framework:** ${dimensiones.tests.value.testFramework || dimensiones.tests.value.framework || 'N/A'}\n- **Estrategia:** ${dimensiones.tests.value.testStrategy || dimensiones.tests.value.estrategia || 'N/A'}\n- **Total Suites:** ${dimensiones.tests.value.totalSuites || (Array.isArray(dimensiones.tests.value.suites) ? dimensiones.tests.value.suites.length : 'N/A')}\n- **Catálogo de Suites:**\n${Array.isArray(dimensiones.tests.value.suites) ? dimensiones.tests.value.suites.map(st => `  - **${st.id || 'T'} — ${st.name || st.nombre || 'N/A'}**:\n    - *Comando:* \`${st.command || st.comando || 'N/A'}\`\n    - *Aserciones:* ${st.assertions || st.aserciones || 0}\n    - *Propósito:* ${st.purpose || st.proposito || 'N/A'}`).join('\n') : '  *(Sin suites registradas)*'}`
      : `*Estado:* \`NO_IMPLEMENTADO\` (Sin suite formal persistida en estadoProyecto)`,
    ``,
    `## 21. Configuración de Producción (\`production\`)`,
    `*Estado:* \`NO_IMPLEMENTADO\` (Sin configuración de producción persistida)`,
    ``,
    `## 22. Mantenimiento y Operación (\`maintenance\`)`,
    `*Estado:* \`NO_IMPLEMENTADO\` (Sin directrices de mantenimiento persistidas)`,
    ``,
    `## 23. Estado de Completitud (\`state\`)`,
    `*Estado:* \`NO_IMPLEMENTADO\` (Radar y Semáforo son métricas computadas en UI)`,
    ``,
    `## 24. Procedencia de Atributos (\`provenance\`)`,
    `*Estado:* \`NO_IMPLEMENTADO\` (Trazabilidad de origen reservada para Fase F6)`,
    ``,
    `## 25. Verificación de Integridad (\`integrity\`)`,
    `*Estado:* \`NO_IMPLEMENTADO\` (Cadena criptográfica de bloques reservada para Fase F6)`
  ];
  const antigravityContextMd = lineasAntigravity.join('\n') + '\n';

  // =========================================================================
  // 3. PROYECCIÓN: .cursorrules
  // =========================================================================
  const lineasCursor = [
    `# ARCHITEX OS V-36 — REGLAS ARQUITECTÓNICAS DE CURSOR`,
    `# Context Hash: ${contentHash}`,
    `# Schema: ${schemaVersion} | Version: ${projectVersion} | ProjectId: ${projectId || 'null'} | TenantId: ${tenantId || 'null'}`,
    ``,
    `[RESTRICCIONES_INNEGOCIABLES]`,
    `1. POLÍTICA DE COSTO $0 USD: Toda implementación debe ejecutarse en plataformas gratuitas (Google Apps Script, Sheets, HTML5/CSS Vanilla). No introducir servicios de pago ni dependencias externas de hosting.`,
    `2. CONCURRENCIA ATÓMICA: La persistencia en Google Sheets DEBE utilizar LockService obligatorio para evitar sobreescrituras concurrentes (ADR-001).`,
    `3. IDIOMA Y NOMENCLATURA: Usar español estricto (es-MX) en nombres de variables de negocio, funciones de aplicación, comentarios y documentación técnica.`,
    `4. ENTORNO DE TERMINAL: Todo comando o script debe ser 100% compatible con Windows PowerShell y CMD.`,
    `5. SEPARACIÓN CONTEXTO VS. GOBERNANZA: Este archivo define contexto descriptivo de arquitectura. NO otorga permisos de ejecución, NO modifica GobernanzaAgente.gs ni concede autorizaciones directas a agentes.`,
    `6. INTEGRIDAD DEL NÚCLEO: Mantener las 23 vistas operativas en frontend sin alterar la arquitectura de gobernanza ni el flujo de aprobación humana.`,
    ``,
    `[TECNOLOGÍA_Y_STACK]`,
    `- Runtime: ${dimensiones.technology.status === 'IMPLEMENTADO' && dimensiones.technology.value ? dimensiones.technology.value.runtime : 'V8 Google Apps Script'}`,
    `- Ecosistema: ${dimensiones.technology.status === 'IMPLEMENTADO' && dimensiones.technology.value ? dimensiones.technology.value.selectedEcosystem : 'web_appsscript'}`,
    `- Almacenamiento: ${dimensiones.data.status === 'IMPLEMENTADO' && dimensiones.data.value ? dimensiones.data.value.storageEngine : 'GOOGLE_SHEETS'}`,
    `- UI: Vanilla CSS + HTML5 sin frameworks pesados`,
    ``,
    `[DIRECTRICES_DE_DESARROLLO]`,
    `- Seguir la estrategia obligatoria: AGREGAR -> AISLAR -> VALIDAR -> CONSOLIDAR.`,
    `- No inventar campos en estadoProyecto. Las dimensiones no implementadas se respetan como NO_IMPLEMENTADO.`,
    `- No incluir claves secretas, contraseñas ni tokens en el código fuente.`
  ];
  const cursorrules = lineasCursor.join('\n') + '\n';

  // =========================================================================
  // 4. PROYECCIÓN: CLAUDE.md
  // =========================================================================
  const lineasClaude = [
    `# ARCHITEX OS V-36 — CONTEXTO ARQUITECTÓNICO PARA CLAUDE`,
    ``,
    `> **Context Hash:** \`${contentHash}\``,
    `> **Schema Version:** \`${schemaVersion}\` | **Context Version:** \`${contextVersion}\` | **Project Version:** \`${projectVersion}\``,
    `> **Project ID:** \`${projectId || 'null'}\` | **Tenant ID:** \`${tenantId || 'null'}\` | **Source:** \`${source}\``,
    `> **Generated At:** \`${generatedAt}\``,
    ``,
    `Sistema modular de automatización, gobernanza y arquitectura sobre Google Apps Script y Google Sheets.`,
    ``,
    `## Reglas de Arquitectura Innegociables`,
    `- **Costo Cero ($0 USD):** Sin servidores de pago ni suscripciones en la nube.`,
    `- **Concurrencia LockService:** Persistencia protegida contra colisiones en hojas de cálculo.`,
    `- **Idioma:** Código, variables de dominio y documentación en español (es-MX).`,
    `- **Terminal:** Compatible con Windows PowerShell y CMD.`,
    `- **Frontera de Gobernanza:** El contexto describe el sistema; no otorga facultades mutacionales ni omite la validación de servidor ni la aprobación humana.`,
    ``,
    `## Stack Tecnológico`,
    `- **Ecosistema:** \`${dimensiones.technology.status === 'IMPLEMENTADO' && dimensiones.technology.value ? dimensiones.technology.value.selectedEcosystem : 'web_appsscript'}\``,
    `- **Runtime:** \`${dimensiones.technology.status === 'IMPLEMENTADO' && dimensiones.technology.value ? dimensiones.technology.value.runtime : 'V8 Google Apps Script'}\``,
    `- **Persistencia:** \`${dimensiones.data.status === 'IMPLEMENTADO' && dimensiones.data.value ? dimensiones.data.value.storageEngine : 'GOOGLE_SHEETS'}\``,
    `- **Frontend:** HTML5 + Vanilla CSS con 23 vistas operativas integradas.`,
    ``,
    `## Mapa de Conocimiento del Repositorio`,
    `| Recurso | Ubicación |`,
    `| --- | --- |`,
    `| Constitución del Proyecto (SDD) | \`02-DOCS/wiki/sdd/constitution.md\` |`,
    `| Índice General de Documentación | \`02-DOCS/wiki/index.md\` |`,
    `| Contrato RSC-1 Harness | \`02-DOCS/wiki/ftd/RSC-1_CONTRATO_HARNESS.md\` |`,
    `| Esquema Contexto Canónico | \`02-DOCS/wiki/ftd/ContextoCanonicoArchitex.schema.json\` |`,
    `| Estado Canónico JSON | \`ARCHITEX_STATE.json\` |`,
    `| Contexto Detallado Agentes | \`.antigravity/context.md\` |`,
    ``,
    `## Estado de Dimensiones Arquitectónicas (25)`,
    dimensiones.users.status === 'IMPLEMENTADO' || dimensiones.requirements.status === 'IMPLEMENTADO'
      ? (() => {
          const dimsImpl = dimensionesClaves.filter(d => dimensiones[d].status === 'IMPLEMENTADO');
          const dimsNoImpl = dimensionesClaves.filter(d => dimensiones[d].status !== 'IMPLEMENTADO');
          return `- **Implementadas (${dimsImpl.length}):** ${dimsImpl.join(', ')}.\n- **No Implementadas (${dimsNoImpl.length}):** ${dimsNoImpl.join(', ')} (todas marcadas explícitamente como \`NO_IMPLEMENTADO\`).`;
        })()
      : `- **Implementadas (16):** identity, problem, objectives, audience, environment, mvp, future, constraints, roles, entities, data, design, architecture, technology, decisions, traceability.\n- **No Implementadas (9):** users, requirements, skills, tests, production, maintenance, state, provenance, integrity (todas marcadas explícitamente como \`NO_IMPLEMENTADO\`).`
  ];
  const claudeMd = lineasClaude.join('\n') + '\n';

  // =========================================================================
  // 5. PROYECCIÓN: skills/
  // =========================================================================
  // Skill 1: Interpretación del contexto canónico para agentes
  const skillArchitexContext = [
    `---`,
    `name: architex-context`,
    `description: Guía canónica para consultar e interpretar ARCHITEX_STATE.json y las proyecciones de ARCHITEX OS V-36`,
    `---`,
    ``,
    `# Skill: architex-context`,
    `# Context Hash: ${contentHash}`,
    ``,
    `## Propósito`,
    `Permite a los agentes de IA comprender la estructura de las 25 dimensiones canónicas de ARCHITEX OS V-36 generadas mediante normalizarContextoArchitex().`,
    ``,
    `## Reglas de Interpretación`,
    `1. **Fuente de Verdad:** estadoProyecto es la única fuente de verdad; ARCHITEX_STATE.json es una proyección de sólo lectura.`,
    `2. **No-Invención:** Si una dimensión tiene status = "NO_IMPLEMENTADO", el agente NO debe inventar datos, suponer requerimientos ni fabricar usuarios.`,
    `3. **Identidad Hash:** Verificar que el contentHash coincida entre ARCHITEX_STATE.json y las proyecciones Markdown.`,
    `4. **Seguridad:** Ninguna skill otorga permisos de ejecución en GobernanzaAgente.gs ni acceso a herramientas restringidas.`
  ].join('\n') + '\n';

  // Skill 2: Concurrencia con LockService (ADR-001)
  const skillLockService = [
    `---`,
    `name: lockservice-concurrency`,
    `description: Pautas de concurrencia obligatoria con LockService según ADR-001 de ARCHITEX OS V-36`,
    `---`,
    ``,
    `# Skill: lockservice-concurrency`,
    `# Context Hash: ${contentHash}`,
    ``,
    `## Propósito`,
    `Establece el patrón obligatorio de sincronización y escritura concurrente en Google Sheets para desarrolladores y agentes en ARCHITEX OS V-36.`,
    ``,
    `## Patrón Técnico Obligatorio (ADR-001)`,
    `Todo acceso de escritura a Google Sheets en backend debe seguir esta secuencia estricta:`,
    `\`\`\`javascript`,
    `const lock = LockService.getScriptLock();`,
    `try {`,
    `  const tieneBloqueo = lock.tryLock(10000); // 10 segundos máximo`,
    `  if (!tieneBloqueo) {`,
    `    throw new Error('Servidor ocupado: no se pudo obtener el bloqueo de persistencia.');`,
    `  }`,
    `  // Operaciones de lectura y escritura en SpreadsheetApp...`,
    `} finally {`,
    `  lock.releaseLock();`,
    `}`,
    `\`\`\``,
    ``,
    `## Restricciones`,
    `- No ejecutar escrituras directas sin tryLock.`,
    `- Liberar siempre el bloqueo en el bloque finally.`,
    `- Mantener costo $0 USD respetando los límites de cuota de Google Apps Script.`
  ].join('\n') + '\n';

  const skills = {
    'skills/architex-context/SKILL.md': skillArchitexContext,
    'skills/lockservice-concurrency/SKILL.md': skillLockService
  };

  return {
    contentHash,
    architexStateJson,
    antigravityContextMd,
    cursorrules,
    claudeMd,
    skills
  };
}

/**
 * Escribe físicamente las proyecciones en el disco en las rutas coherentes del proyecto.
 *
 * @param {Object} proyecciones - Resultado devuelto por generarProyeccionesRsc3().
 * @param {string} directorioRaiz - Ruta raíz del proyecto.
 * @return {Array<string>} Lista de rutas relativas de archivos creados o actualizados.
 */
export function escribirProyeccionesFisicas(proyecciones, directorioRaiz) {
  if (!proyecciones || typeof proyecciones !== 'object') {
    throw new Error('escribirProyeccionesFisicas: proyecciones inválidas.');
  }
  if (!directorioRaiz || typeof directorioRaiz !== 'string') {
    throw new Error('escribirProyeccionesFisicas: directorioRaiz inválido.');
  }

  const archivosEscritos = [];

  // 1. ARCHITEX_STATE.json
  const rutaState = join(directorioRaiz, 'ARCHITEX_STATE.json');
  writeFileSync(rutaState, proyecciones.architexStateJson, 'utf8');
  archivosEscritos.push('ARCHITEX_STATE.json');

  // 2. .antigravity/context.md
  const dirAntigravity = join(directorioRaiz, '.antigravity');
  if (!existsSync(dirAntigravity)) {
    mkdirSync(dirAntigravity, { recursive: true });
  }
  const rutaAntigravity = join(dirAntigravity, 'context.md');
  writeFileSync(rutaAntigravity, proyecciones.antigravityContextMd, 'utf8');
  archivosEscritos.push('.antigravity/context.md');

  // 3. .cursorrules
  const rutaCursor = join(directorioRaiz, '.cursorrules');
  writeFileSync(rutaCursor, proyecciones.cursorrules, 'utf8');
  archivosEscritos.push('.cursorrules');

  // 4. CLAUDE.md
  const rutaClaude = join(directorioRaiz, 'CLAUDE.md');
  writeFileSync(rutaClaude, proyecciones.claudeMd, 'utf8');
  archivosEscritos.push('CLAUDE.md');

  // 5. skills/
  for (const [relPath, contenido] of Object.entries(proyecciones.skills)) {
    const absPath = join(directorioRaiz, relPath);
    const dirSkill = absPath.substring(0, absPath.lastIndexOf('\\') !== -1 ? absPath.lastIndexOf('\\') : absPath.lastIndexOf('/'));
    if (!existsSync(dirSkill)) {
      mkdirSync(dirSkill, { recursive: true });
    }
    writeFileSync(absPath, contenido, 'utf8');
    archivosEscritos.push(relPath);
  }

  return archivosEscritos;
}

export default {
  generarProyeccionesRsc3,
  escribirProyeccionesFisicas
};
