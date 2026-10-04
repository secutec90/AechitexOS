/**
 * ARCHITEX OS V-36 — F3: SUITE DE EVOLUCIÓN CONTROLADA
 *
 * Prueba el ciclo C0 → C1 PATCH → C2 MINOR → C3 MAJOR,
 * Floor Guard, linaje, ausencia de red/mutación y determinismo.
 */

import { normalizarContextoArchitex } from './normalizadorContexto.mjs';
import {
  ESTADOS_VERIFICACION,
  PARENT_STATUS_F3,
  DIAGNOSTICOS_LINAJE_F3,
  verificarContextoRsc4,
  calcularHashSemantico
} from './verificadorContexto.mjs';
import {
  ESTADOS_OPERACION_RSC5,
  compararSemVer,
  validarAutorizacion
} from './regeneradorProyecciones.mjs';

const HASH_PRE_F3 = '111790fff85e83c1a7bdd79310456dbfd3430eb6c06528df7db65c9c4692fdb8';
const resultados = [];

function probar(nombre, esperado, obtenido, extra) {
  const ok = esperado === obtenido;
  resultados.push({ nombre, esperado, obtenido, ok, extra });
  console.log(ok ? 'OK' : 'FALLO', nombre, '→', obtenido, extra ? '(' + extra + ')' : '');
}

const baseArchitex = {
  idProyecto: 'proy_1790980470320',
  nombreProyecto: 'ARCHITEX-OS',
  campoProblema: 'Gobernanza de arquitectura fragmentada.',
  campoObjetivo: 'Plataforma unificada de especificación y auditoría.',
  campoPublico: 'Arquitectos y agentes IA.',
  campoEntorno: 'Google Apps Script + Sheets',
  campoMvp: 'Contexto canónico y harness RSC',
  campoFuturo: 'Evolución controlada F3',
  campoRestricciones: 'Costo $0 USD, LockService, es-MX',
  campoRoles: 'Arquitecto Humano, Agente Gobernado',
  campoEntidades: 'Proyectos, Decisiones, Acciones',
  campoPantallas: '23 vistas operativas',
  campoNavegacion: 'Viaje de cuatro estaciones',
  campoDispositivos: 'Navegador',
  campoManejoOffline: 'localStorage',
  selectorTipoProyecto: 'web_laravel',
  entidadesRegistradas: [{ nombre: 'Proyecto', campos: 'id, nombre' }],
  decisionesRegistradas: [{
    titulo: 'ADR-000-BASE-V36',
    problema: 'Génesis de cadena F3',
    motivo: 'Anclar linaje causal',
    fecha: '2026-10-04'
  }],
  elementosTrazabilidad: [{
    requisito: 'Linaje F3',
    actor: 'Arquitecto',
    destino: 'RSC-2/4/5/6',
    prueba: 'pruebasF3Evolucion'
  }],
  componentesClaveEstado: { frontend_web: true, backend_gas: true }
};

function conF3(estado, extras) {
  return Object.assign({}, estado, extras);
}

console.log('--- INICIO PRUEBAS F3: CICLO DE VIDA, LINAJE Y EVOLUCIÓN ---\n');

// C0 — Génesis de la cadena de linaje causal F3
const estadoC0 = conF3(baseArchitex, {
  estadoCicloVida: { lifecycle: 'CANONICAL' },
  registroProcedencia: {
    sourceType: 'SYSTEM_GENESIS',
    author: 'ARQUITECTO_HUMANO',
    triggerDecisionId: 'ADR-000-BASE-V36',
    timestamp: '2026-10-04T00:00:00.000Z'
  },
  linajeCausal: { parentContentHash: null, lineageDepth: 0 }
});
const snapC0 = JSON.stringify(estadoC0);
const c0a = normalizarContextoArchitex(estadoC0, { contextVersion: '1.0.0', tenantId: 'no' });
await new Promise((r) => setTimeout(r, 15));
const c0b = normalizarContextoArchitex(estadoC0, { contextVersion: '1.0.0', tenantId: 'no' });
probar('C0-1: hash determinista', true, c0a.contentHash === c0b.contentHash);
probar('C0-2: hash distinto al pre-F3 111790…', true, c0a.contentHash !== HASH_PRE_F3);
probar('C0-3: timestamp no volátil', '2026-10-04T00:00:00.000Z', c0a.provenance.value.timestamp);
probar('C0-4: no mutación de estadoProyecto', snapC0, JSON.stringify(estadoC0));
const vC0 = verificarContextoRsc4(c0a);
probar('C0-5: VALIDO', ESTADOS_VERIFICACION.VALIDO, vC0.estado);
probar('C0-6: parentStatus GENESIS', PARENT_STATUS_F3.GENESIS, vC0.parentStatus);
probar('C0-7: lineageDepth 0', 0, vC0.lineageDepth);
probar('C0-8: sourceType SYSTEM_GENESIS', 'SYSTEM_GENESIS', c0a.provenance.value.sourceType);

// C0 → C1 PATCH
const estadoC1 = conF3(baseArchitex, {
  campoMvp: 'Contexto canónico, harness RSC y linaje F3',
  estadoCicloVida: { lifecycle: 'CANONICAL' },
  registroProcedencia: {
    sourceType: 'HUMAN_UI',
    author: 'ARQUITECTO_HUMANO',
    triggerDecisionId: 'ADR-001-PATCH-F3',
    timestamp: '2026-10-04T01:00:00.000Z'
  },
  linajeCausal: { parentContentHash: c0a.contentHash, lineageDepth: 1 }
});
const c1 = normalizarContextoArchitex(estadoC1, { contextVersion: '1.0.1', tenantId: 'no' });
const vC1Declared = verificarContextoRsc4(c1);
const vC1Verified = verificarContextoRsc4(c1, { contextoPadre: c0a });
probar('C1-1: contextVersion PATCH 1.0.1', '1.0.1', c1.contextVersion);
probar('C1-2: PARENT_DECLARED_ONLY sin padre', PARENT_STATUS_F3.PARENT_DECLARED_ONLY, vC1Declared.parentStatus);
probar('C1-3: PARENT_VERIFIED con padre', PARENT_STATUS_F3.PARENT_VERIFIED, vC1Verified.parentStatus);
probar('C1-4: hash C1 ≠ hash C0', true, c1.contentHash !== c0a.contentHash);

// C1 → C2 MINOR
const estadoC2 = conF3(baseArchitex, {
  campoObjetivo: 'Plataforma unificada con evolución SemVer controlada.',
  estadoCicloVida: { lifecycle: 'CANONICAL' },
  registroProcedencia: {
    sourceType: 'AGENT_GOVERNED',
    author: 'AGENTE_GOBERNADO',
    triggerDecisionId: 'ADR-002-MINOR-F3',
    timestamp: '2026-10-04T02:00:00.000Z'
  },
  linajeCausal: { parentContentHash: c1.contentHash, lineageDepth: 2 }
});
const c2 = normalizarContextoArchitex(estadoC2, { contextVersion: '1.1.0', tenantId: 'no' });
const vC2 = verificarContextoRsc4(c2, { contextoPadre: c1 });
probar('C2-1: contextVersion MINOR 1.1.0', '1.1.0', c2.contextVersion);
probar('C2-2: PARENT_VERIFIED', PARENT_STATUS_F3.PARENT_VERIFIED, vC2.parentStatus);
probar('C2-3: lineageDepth 2', 2, vC2.lineageDepth);

// C2 → C3 MAJOR
const estadoC3 = conF3(baseArchitex, {
  campoProblema: 'Gobernanza de arquitectura fragmentada — rediseño mayor de contrato de linaje.',
  estadoCicloVida: { lifecycle: 'CANONICAL' },
  registroProcedencia: {
    sourceType: 'SYSTEM_MIGRATION',
    author: 'ARQUITECTO_HUMANO',
    triggerDecisionId: 'ADR-003-MAJOR-F3',
    timestamp: '2026-10-04T03:00:00.000Z'
  },
  linajeCausal: { parentContentHash: c2.contentHash, lineageDepth: 3 }
});
const c3 = normalizarContextoArchitex(estadoC3, { contextVersion: '2.0.0', tenantId: 'no' });
const vC3 = verificarContextoRsc4(c3, { contextoPadre: c2 });
probar('C3-1: contextVersion MAJOR 2.0.0', '2.0.0', c3.contextVersion);
probar('C3-2: PARENT_VERIFIED', PARENT_STATUS_F3.PARENT_VERIFIED, vC3.parentStatus);
probar('C3-3: cadena C0→C3 con depths crecientes', true,
  c0a.integrity.value.lineageDepth === 0 &&
  c1.integrity.value.lineageDepth === 1 &&
  c2.integrity.value.lineageDepth === 2 &&
  c3.integrity.value.lineageDepth === 3
);

// Floor Guard
const authFloor = {
  operation: 'REGENERATE_PROJECTIONS',
  tenantId: 'no',
  projectId: c3.projectId,
  authorizedContentHash: c3.contentHash,
  authorized: true,
  proposedContextVersion: '1.5.0',
  minimumVersionFloor: '2.0.0',
  parentContentHash: c2.contentHash,
  rationale: 'Intento ilegal de bajar versión'
};
const resFloor = validarAutorizacion(authFloor, c3);
probar('FG-1: proposed < floor → ABORTED', ESTADOS_OPERACION_RSC5.ABORTED, resFloor.estado);
probar('FG-2: FLOOR_VIOLATION', DIAGNOSTICOS_LINAJE_F3.FLOOR_VIOLATION, resFloor.diagnostico);
probar('FG-3: SemVer 2.0.0 > 1.1.0', 1, compararSemVer('2.0.0', '1.1.0'));

// Parent mismatch / depth / orphan
const huerfano = normalizarContextoArchitex(conF3(baseArchitex, {
  estadoCicloVida: { lifecycle: 'CANONICAL' },
  registroProcedencia: {
    sourceType: 'HUMAN_UI',
    author: 'X',
    triggerDecisionId: 'ADR-X',
    timestamp: '2026-10-04T04:00:00.000Z'
  },
  linajeCausal: {
    parentContentHash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    lineageDepth: 1
  }
}), { contextVersion: '1.0.2', tenantId: 'no' });
const vOrphan = verificarContextoRsc4(huerfano, { contextoPadre: c0a });
probar('LIN-1: parent mismatch → INVALIDO', ESTADOS_VERIFICACION.INVALIDO, vOrphan.estado);
probar('LIN-2: PARENT_MISMATCH', DIAGNOSTICOS_LINAJE_F3.PARENT_MISMATCH, vOrphan.diagnosticoLinaje);

const depthBad = normalizarContextoArchitex(conF3(baseArchitex, {
  estadoCicloVida: { lifecycle: 'CANONICAL' },
  registroProcedencia: {
    sourceType: 'HUMAN_UI',
    author: 'X',
    triggerDecisionId: 'ADR-Y',
    timestamp: '2026-10-04T04:30:00.000Z'
  },
  linajeCausal: { parentContentHash: c0a.contentHash, lineageDepth: 9 }
}), { contextVersion: '1.0.3', tenantId: 'no' });
const vDepth = verificarContextoRsc4(depthBad, { contextoPadre: c0a });
probar('LIN-3: depth mismatch → INVALIDO', ESTADOS_VERIFICACION.INVALIDO, vDepth.estado);
probar('LIN-4: DEPTH_INCONSISTENT', DIAGNOSTICOS_LINAJE_F3.DEPTH_INCONSISTENT, vDepth.diagnosticoLinaje);

// Provenance mutation / volatile timestamp: invalid timestamp → not extracted → no VOLATILE at verify
// When manually injecting bad timestamp into IMPLEMENTADO provenance:
const ctxTampered = JSON.parse(JSON.stringify(c0a));
ctxTampered.provenance.value.timestamp = 'ahora';
const dimsTampered = {};
['identity', 'problem', 'objectives', 'audience', 'environment', 'mvp', 'future',
  'constraints', 'roles', 'users', 'entities', 'requirements', 'data', 'design',
  'architecture', 'technology', 'decisions', 'skills', 'traceability', 'tests',
  'production', 'maintenance', 'state', 'provenance', 'integrity'].forEach((d) => {
  dimsTampered[d] = ctxTampered[d];
});
ctxTampered.contentHash = calcularHashSemantico({
  schemaVersion: ctxTampered.schemaVersion,
  contextVersion: ctxTampered.contextVersion,
  projectVersion: ctxTampered.projectVersion,
  projectId: ctxTampered.projectId,
  tenantId: ctxTampered.tenantId,
  source: ctxTampered.source,
  dimensions: dimsTampered
});
const vVol = verificarContextoRsc4(ctxTampered);
probar('PROV-1: timestamp volátil → INVALIDO', ESTADOS_VERIFICACION.INVALIDO, vVol.estado);
probar('PROV-2: VOLATILE_TIMESTAMP', DIAGNOSTICOS_LINAJE_F3.VOLATILE_TIMESTAMP, vVol.diagnosticoLinaje);

// Ausencia de red
let llamadasRed = 0;
const fetchOriginal = globalThis.fetch;
globalThis.fetch = () => { llamadasRed++; return Promise.reject(new Error('red')); };
normalizarContextoArchitex(estadoC0, { contextVersion: '1.0.0', tenantId: 'no' });
verificarContextoRsc4(c1, { contextoPadre: c0a });
validarAutorizacion(authFloor, c3);
globalThis.fetch = fetchOriginal;
probar('NET-1: cero red', 0, llamadasRed);

// Dimensiones 10/12/18/20/21/22 siguen NO_IMPLEMENTADO
probar('DIM-1: users NO_IMPLEMENTADO', 'NO_IMPLEMENTADO', c0a.users.status);
probar('DIM-2: requirements NO_IMPLEMENTADO', 'NO_IMPLEMENTADO', c0a.requirements.status);
probar('DIM-3: skills NO_IMPLEMENTADO', 'NO_IMPLEMENTADO', c0a.skills.status);
probar('DIM-4: tests NO_IMPLEMENTADO', 'NO_IMPLEMENTADO', c0a.tests.status);
probar('DIM-5: production NO_IMPLEMENTADO', 'NO_IMPLEMENTADO', c0a.production.status);
probar('DIM-6: maintenance NO_IMPLEMENTADO', 'NO_IMPLEMENTADO', c0a.maintenance.status);

console.log('\n--- RESUMEN FINAL F3 ---');
const fallos = resultados.filter((r) => !r.ok);
if (fallos.length === 0) {
  console.log(`RESULTADO: TODAS LAS PRUEBAS F3 PASARON CON ÉXITO (${resultados.length}/${resultados.length})`);
  console.log('HASH_C0=' + c0a.contentHash);
  process.exit(0);
}
console.error(`RESULTADO: FALLARON ${fallos.length} PRUEBAS:`);
fallos.forEach((f) => console.error(' -', f.nombre, 'Esperado:', f.esperado, 'Obtenido:', f.obtenido));
process.exit(1);
