/**
 * ARCHITEX OS V-36 — RSC-2: NORMALIZADOR DE CONTEXTO CANÓNICO
 *
 * Transforma el estado interno del proyecto (estadoProyecto) en una representación
 * canónica determinista, no destructiva y estandarizada (ContextoCanonicoArchitex).
 *
 * Principio:
 * estadoProyecto -> normalizarContextoArchitex() -> ContextoCanonicoArchitex
 *
 * Reglas arquitectónicas:
 * 1. Función pura: no muta la entrada, no realiza I/O, no usa DOM ni storage.
 * 2. No invención: las dimensiones no implementadas o vacías se marcan explícitamente
 *    como { status: "NO_IMPLEMENTADO", value: null }.
 * 3. Seguridad: sanea y excluye secretos, claves API, tokens y contraseñas.
 * 4. Gobernanza excluida: no incorpora HERRAMIENTAS_AGENTES, idDecision ni permisos.
 * 5. Determinismo: contentHash no depende de generatedAt.
 */

import { createHash } from 'crypto';

const PATRONES_SECRETOS = [
  /sk-[a-zA-Z0-9_\-]{15,}/gi,
  /Bearer\s+[a-zA-Z0-9_\-\.]+/gi,
  /(?:password|passwd|contraseña|secreto|secret|api[_-]?key|token)\s*[:=]\s*['"][^'"]+['"]/gi
];

/**
 * Sanea cadenas de texto eliminando o redactando información sensible.
 * @param {any} val
 * @return {string|null}
 */
export function sanitizarTexto(val) {
  if (val === null || val === undefined) return null;
  let str = String(val).trim();
  if (str.length === 0) return null;

  PATRONES_SECRETOS.forEach(patron => {
    str = str.replace(patron, '[REDACTADO_POR_SEGURIDAD]');
  });

  return str;
}

/**
 * Ordena recursivamente las claves de un objeto para serialización canónica.
 * @param {any} obj
 * @return {any}
 */
function ordenarClaves(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(ordenarClaves);
  const ordenado = {};
  Object.keys(obj).sort().forEach(k => {
    ordenado[k] = ordenarClaves(obj[k]);
  });
  return ordenado;
}

const LIFECYCLES_F3 = new Set(['CANONICAL', 'SUPERSEDED', 'DEPRECATED']);
const SOURCE_TYPES_F3 = new Set(['SYSTEM_GENESIS', 'HUMAN_UI', 'AGENT_GOVERNED', 'SYSTEM_MIGRATION']);
const RE_HASH_SHA256 = /^[a-f0-9]{64}$/;
const RE_ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

/**
 * Extrae lifecycle F3 si es un valor del catálogo cerrado.
 * @param {any} bruto
 * @return {{status: string, value: Object}|null}
 */
function extraerEstadoCicloVida(bruto) {
  let lifecycle = null;
  if (typeof bruto === 'string') lifecycle = bruto.trim();
  else if (bruto && typeof bruto === 'object' && typeof bruto.lifecycle === 'string') {
    lifecycle = bruto.lifecycle.trim();
  }
  if (!lifecycle || !LIFECYCLES_F3.has(lifecycle)) return null;
  return { status: 'IMPLEMENTADO', value: { lifecycle } };
}

/**
 * Extrae procedencia F3. No genera timestamp ni author.
 * @param {any} bruto
 * @return {{status: string, value: Object}|null}
 */
function extraerRegistroProcedencia(bruto) {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return null;
  const sourceType = typeof bruto.sourceType === 'string' ? bruto.sourceType.trim() : '';
  const author = typeof bruto.author === 'string' ? bruto.author.trim() : '';
  const triggerDecisionId = typeof bruto.triggerDecisionId === 'string' ? bruto.triggerDecisionId.trim() : '';
  const timestamp = typeof bruto.timestamp === 'string' ? bruto.timestamp.trim() : '';
  if (!SOURCE_TYPES_F3.has(sourceType)) return null;
  if (!author || !triggerDecisionId || !RE_ISO_UTC.test(timestamp)) return null;
  return {
    status: 'IMPLEMENTADO',
    value: {
      sourceType,
      author: sanitizarTexto(author),
      triggerDecisionId: sanitizarTexto(triggerDecisionId),
      timestamp
    }
  };
}

/**
 * Extrae linaje causal F3. parentContentHash null solo es válido con depth 0.
 * @param {any} bruto
 * @return {{status: string, value: Object}|null}
 */
function extraerLinajeCausal(bruto) {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return null;
  const depthRaw = bruto.lineageDepth;
  if (typeof depthRaw !== 'number' || !Number.isInteger(depthRaw) || depthRaw < 0) return null;
  const parentRaw = bruto.parentContentHash;
  if (parentRaw === null) {
    if (depthRaw !== 0) return null;
    return { status: 'IMPLEMENTADO', value: { parentContentHash: null, lineageDepth: 0 } };
  }
  if (typeof parentRaw !== 'string' || !RE_HASH_SHA256.test(parentRaw)) return null;
  if (depthRaw < 1) return null;
  return {
    status: 'IMPLEMENTADO',
    value: { parentContentHash: parentRaw, lineageDepth: depthRaw }
  };
}

/**
 * Extrae perfiles de usuarios si están estructurados en la entrada (F4).
 * @param {any} entrada
 * @return {{totalProfiles: number, targetProfiles: Array<Object>}|null}
 */
export function extraerUsuarios(entrada) {
  if (!entrada || typeof entrada !== 'object') return null;
  const lista = entrada.perfilesUsuarios || entrada.usuariosRegistrados || entrada.targetProfiles;
  if (!Array.isArray(lista) || lista.length === 0) return null;

  const targetProfiles = [];
  for (const item of lista) {
    if (!item || typeof item !== 'object') continue;
    const id = sanitizarTexto(item.id);
    const role = sanitizarTexto(item.role || item.rol);
    const description = sanitizarTexto(item.description || item.descripcion);
    const accessLevel = sanitizarTexto(item.accessLevel || item.nivelAcceso);

    const capsRaw = item.capabilities || item.capacidades;
    const capabilities = Array.isArray(capsRaw)
      ? capsRaw.map(c => sanitizarTexto(c)).filter(Boolean)
      : [];

    if (id || role || description) {
      targetProfiles.push({
        id: id || null,
        role: role || null,
        description: description || null,
        accessLevel: accessLevel || null,
        capabilities
      });
    }
  }

  if (targetProfiles.length === 0) return null;
  return {
    totalProfiles: targetProfiles.length,
    targetProfiles
  };
}

/**
 * Extrae catálogo de requisitos formales si están estructurados en la entrada (F4).
 * @param {any} entrada
 * @return {{totalRequirements: number, catalog: Array<Object>}|null}
 */
export function extraerRequisitos(entrada) {
  if (!entrada || typeof entrada !== 'object') return null;
  const lista = entrada.catalogoRequisitos || entrada.requisitosRegistrados || entrada.catalog;
  if (!Array.isArray(lista) || lista.length === 0) return null;

  const catalog = [];
  for (const item of lista) {
    if (!item || typeof item !== 'object') continue;
    const id = sanitizarTexto(item.id);
    const type = sanitizarTexto(item.type || item.tipo);
    const title = sanitizarTexto(item.title || item.titulo);
    const statement = sanitizarTexto(item.statement || item.declaracion || item.description || item.descripcion);
    const priority = sanitizarTexto(item.priority || item.prioridad);
    const status = sanitizarTexto(item.status || item.estado);
    const traceabilityTarget = sanitizarTexto(item.traceabilityTarget || item.destinoTrazabilidad);

    if (id || title || statement) {
      catalog.push({
        id: id || null,
        type: type || 'FUNCTIONAL',
        title: title || null,
        statement: statement || null,
        priority: priority || 'MEDIUM',
        status: status || 'PROPOSED',
        traceabilityTarget: traceabilityTarget || null
      });
    }
  }

  if (catalog.length === 0) return null;
  return {
    totalRequirements: catalog.length,
    catalog
  };
}

/**
 * Normaliza estadoProyecto al esquema ContextoCanonicoArchitex.
 * Función pura y determinista.
 *
 * @param {Object} estadoProyecto - Estado crudo del proyecto.
 * @param {Object} [opciones] - Metadatos opcionales (contextVersion, tenantId).
 * @return {Object} ContextoCanonicoArchitex
 */
export function normalizarContextoArchitex(estadoProyecto, opciones = {}) {
  const entrada = estadoProyecto && typeof estadoProyecto === 'object' ? estadoProyecto : {};
  const opts = opciones && typeof opciones === 'object' ? opciones : {};

  const noImplementado = () => ({ status: 'NO_IMPLEMENTADO', value: null });
  const implementado = (val) => ({ status: 'IMPLEMENTADO', value: val });

  // 1. IDENTITY
  const hasIdentity = !!(
    (entrada.nombreProyecto && String(entrada.nombreProyecto).trim()) ||
    (entrada.idProyecto && String(entrada.idProyecto).trim()) ||
    (entrada.selectorTipoProyecto && String(entrada.selectorTipoProyecto).trim())
  );
  const identity = hasIdentity ? implementado({
    projectId: sanitizarTexto(entrada.idProyecto),
    projectName: sanitizarTexto(entrada.nombreProyecto),
    projectType: sanitizarTexto(entrada.selectorTipoProyecto)
  }) : noImplementado();

  // 2. PROBLEM
  const hasProblem = !!(entrada.campoProblema && String(entrada.campoProblema).trim());
  const problem = hasProblem ? implementado({
    centralProblem: sanitizarTexto(entrada.campoProblema)
  }) : noImplementado();

  // 3. OBJECTIVES
  const hasObjectives = !!(entrada.campoObjetivo && String(entrada.campoObjetivo).trim());
  const objectives = hasObjectives ? implementado({
    primaryObjective: sanitizarTexto(entrada.campoObjetivo)
  }) : noImplementado();

  // 4. AUDIENCE
  const hasAudience = !!(entrada.campoPublico && String(entrada.campoPublico).trim());
  const audience = hasAudience ? implementado({
    targetAudience: sanitizarTexto(entrada.campoPublico)
  }) : noImplementado();

  // 5. ENVIRONMENT
  const hasEnvironment = !!(
    (entrada.campoEntorno && String(entrada.campoEntorno).trim()) ||
    (entrada.campoDispositivos && String(entrada.campoDispositivos).trim()) ||
    (entrada.campoManejoOffline && String(entrada.campoManejoOffline).trim())
  );
  const environment = hasEnvironment ? implementado({
    targetPlatform: sanitizarTexto(entrada.campoEntorno),
    supportedDevices: sanitizarTexto(entrada.campoDispositivos),
    offlineStrategy: sanitizarTexto(entrada.campoManejoOffline)
  }) : noImplementado();

  // 6. MVP
  const hasMvp = !!(entrada.campoMvp && String(entrada.campoMvp).trim());
  const mvp = hasMvp ? implementado({
    scopeDefinition: sanitizarTexto(entrada.campoMvp)
  }) : noImplementado();

  // 7. FUTURE
  const hasFuture = !!(entrada.campoFuturo && String(entrada.campoFuturo).trim());
  const future = hasFuture ? implementado({
    roadmapDescription: sanitizarTexto(entrada.campoFuturo)
  }) : noImplementado();

  // 8. CONSTRAINTS
  const hasConstraints = !!(entrada.campoRestricciones && String(entrada.campoRestricciones).trim());
  const constraints = hasConstraints ? implementado({
    mandatoryRules: sanitizarTexto(entrada.campoRestricciones),
    zeroCostPolicy: true,
    namingLanguage: 'ES_MX',
    concurrencyControl: 'LOCK_SERVICE',
    terminalTarget: 'WINDOWS_POWERSHELL_CMD'
  }) : noImplementado();

  // 9. ROLES
  const hasRoles = !!(entrada.campoRoles && String(entrada.campoRoles).trim());
  const roles = hasRoles ? implementado({
    rolesDefinition: sanitizarTexto(entrada.campoRoles)
  }) : noImplementado();

  // 10. USERS (Soporte F4 / Retrocompatible con NO_IMPLEMENTADO si ausente)
  const usersVal = extraerUsuarios(entrada);
  const users = usersVal ? implementado(usersVal) : noImplementado();

  // 11. ENTITIES
  const hasEntitiesArray = Array.isArray(entrada.entidadesRegistradas) && entrada.entidadesRegistradas.length > 0;
  const hasEntitiesSummary = !!(entrada.campoEntidades && String(entrada.campoEntidades).trim());
  const entities = (hasEntitiesArray || hasEntitiesSummary) ? implementado({
    summary: sanitizarTexto(entrada.campoEntidades),
    registeredEntities: hasEntitiesArray ? entrada.entidadesRegistradas.map(e => ({
      nombre: sanitizarTexto(e && e.nombre),
      campos: sanitizarTexto(e && e.campos)
    })) : null
  }) : noImplementado();

  // 12. REQUIREMENTS (Soporte F4 / Retrocompatible con NO_IMPLEMENTADO si ausente)
  const reqsVal = extraerRequisitos(entrada);
  const requirements = reqsVal ? implementado(reqsVal) : noImplementado();

  // 13. DATA
  const hasData = hasEntitiesArray || hasEntitiesSummary || !!(entrada.selectorTipoProyecto && String(entrada.selectorTipoProyecto).trim());
  const data = hasData ? implementado({
    storageEngine: entrada.selectorTipoProyecto === 'web_laravel' ? 'MYSQL' : (entrada.selectorTipoProyecto === 'movil_apk' ? 'SQLITE' : 'GOOGLE_SHEETS'),
    entitiesSummary: sanitizarTexto(entrada.campoEntidades)
  }) : noImplementado();

  // 14. DESIGN
  const hasDesign = !!(
    (entrada.campoPantallas && String(entrada.campoPantallas).trim()) ||
    (entrada.campoNavegacion && String(entrada.campoNavegacion).trim())
  );
  const design = hasDesign ? implementado({
    screensStructure: sanitizarTexto(entrada.campoPantallas),
    navigationStrategy: sanitizarTexto(entrada.campoNavegacion)
  }) : noImplementado();

  // 15. ARCHITECTURE
  const hasArch = !!(
    (entrada.componentesClaveEstado && typeof entrada.componentesClaveEstado === 'object' && Object.keys(entrada.componentesClaveEstado).length > 0) ||
    (entrada.selectorTipoProyecto && String(entrada.selectorTipoProyecto).trim())
  );
  const architecture = hasArch ? implementado({
    topologyType: sanitizarTexto(entrada.selectorTipoProyecto) || 'web_appsscript',
    keyComponentsStatus: entrada.componentesClaveEstado && typeof entrada.componentesClaveEstado === 'object' ? Object.assign({}, entrada.componentesClaveEstado) : null
  }) : noImplementado();

  // 16. TECHNOLOGY
  const hasTech = !!(
    (entrada.selectorTipoProyecto && String(entrada.selectorTipoProyecto).trim()) ||
    (entrada.campoEntorno && String(entrada.campoEntorno).trim())
  );
  const technology = hasTech ? implementado({
    selectedEcosystem: sanitizarTexto(entrada.selectorTipoProyecto),
    runtime: entrada.selectorTipoProyecto === 'web_laravel' ? 'PHP' : (entrada.selectorTipoProyecto === 'iot_mqtt' ? 'C++ FreeRTOS' : 'V8 Google Apps Script')
  }) : noImplementado();

  // 17. DECISIONS (ADRs)
  const hasDecisions = Array.isArray(entrada.decisionesRegistradas) && entrada.decisionesRegistradas.length > 0;
  const decisions = hasDecisions ? implementado({
    registeredAdrs: entrada.decisionesRegistradas.map(d => ({
      titulo: sanitizarTexto(d && d.titulo),
      problema: sanitizarTexto(d && d.problema),
      opciones: sanitizarTexto(d && d.opciones),
      motivo: sanitizarTexto(d && d.motivo),
      fecha: d && d.fecha ? String(d.fecha) : null
    }))
  }) : noImplementado();

  // 18. SKILLS (No implementado en estadoProyecto)
  const skills = noImplementado();

  // 19. TRACEABILITY
  const hasTraceability = Array.isArray(entrada.elementosTrazabilidad) && entrada.elementosTrazabilidad.length > 0;
  const traceability = hasTraceability ? implementado({
    matrix: entrada.elementosTrazabilidad.map(t => ({
      requisito: sanitizarTexto(t && t.requisito),
      actor: sanitizarTexto(t && t.actor),
      destino: sanitizarTexto(t && t.destino),
      prueba: sanitizarTexto(t && t.prueba)
    }))
  }) : noImplementado();

  // 20. TESTS (No implementado como suite formal)
  const tests = noImplementado();

  // 21. PRODUCTION (CI/CD no implementado en estadoProyecto)
  const production = noImplementado();

  // 22. MAINTENANCE (No implementado en estadoProyecto)
  const maintenance = noImplementado();

  // 23. STATE ← F3 estadoCicloVida (solo si llega dato válido; nunca se inventa)
  const state = extraerEstadoCicloVida(entrada.estadoCicloVida) || noImplementado();

  // 24. PROVENANCE ← F3 registroProcedencia (timestamp debe venir del origen; no se genera)
  const provenance = extraerRegistroProcedencia(entrada.registroProcedencia) || noImplementado();

  // 25. INTEGRITY ← F3 linajeCausal (parentContentHash/lineageDepth solo si son válidos)
  const integrity = extraerLinajeCausal(entrada.linajeCausal) || noImplementado();

  // Ensamblar las 25 dimensiones exactamente
  const dimensiones = {
    identity,
    problem,
    objectives,
    audience,
    environment,
    mvp,
    future,
    constraints,
    roles,
    users,
    entities,
    requirements,
    data,
    design,
    architecture,
    technology,
    decisions,
    skills,
    traceability,
    tests,
    production,
    maintenance,
    state,
    provenance,
    integrity
  };

  const schemaVersion = '1.0.0';
  const projectVersion = 'V-36';
  const contextVersion = opts.contextVersion || (entrada.contextVersion ? String(entrada.contextVersion).trim() : '1.0.0');
  const projectId = sanitizarTexto(entrada.idProyecto) || null;
  const tenantId = (entrada.campoMultitenant && String(entrada.campoMultitenant).trim()) || (opts.tenantId ? String(opts.tenantId).trim() : null);
  const source = 'ARCHITEX_OS_V36';

  // Payload semántico para cálculo del hash determinista (SIN generatedAt)
  const payloadSemantico = {
    schemaVersion,
    contextVersion,
    projectVersion,
    projectId,
    tenantId,
    source,
    dimensions: dimensiones
  };

  const payloadOrdenado = ordenarClaves(payloadSemantico);
  const jsonCanonica = JSON.stringify(payloadOrdenado);
  const contentHash = createHash('sha256').update(jsonCanonica).digest('hex');

  // Objeto final ContextoCanonicoArchitex
  return {
    schemaVersion,
    contextVersion,
    projectVersion,
    generatedAt: new Date().toISOString(),
    projectId,
    tenantId,
    source,
    contentHash,
    ...dimensiones
  };
}

export default {
  normalizarContextoArchitex,
  sanitizarTexto,
  extraerUsuarios,
  extraerRequisitos,
  LIFECYCLES_F3: Array.from(LIFECYCLES_F3),
  SOURCE_TYPES_F3: Array.from(SOURCE_TYPES_F3)
};
