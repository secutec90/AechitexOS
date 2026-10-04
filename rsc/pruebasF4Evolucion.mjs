/**
 * ARCHITEX OS V-36 — RSC / F4: SUITE DE EVOLUCIÓN CANÓNICA C0 → C1
 *
 * Certifica el primer salto evolutivo formal de linaje causal:
 * C0 Génesis (v1.0.0, depth 0) -> C1 Primer Nodo Evolutivo (v1.1.0, depth 1)
 * con activación de Dimensión 10 (users) y Dimensión 12 (requirements).
 */

import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { normalizarContextoArchitex } from './normalizadorContexto.mjs';
import {
  verificarContextoRsc4,
  ESTADOS_VERIFICACION,
  PARENT_STATUS_F3,
  DIAGNOSTICOS_LINAJE_F3
} from './verificadorContexto.mjs';

const resultados = [];

function probar(nombre, esperado, obtenido, extra) {
  const ok = esperado === obtenido;
  resultados.push({ nombre, esperado, obtenido, ok, extra });
  console.log(ok ? 'OK' : 'FALLO', nombre, '→', obtenido, extra ? '(' + extra + ')' : '');
}

console.log('--- INICIO PRUEBAS F4: EVOLUCIÓN CANÓNICA C0 → C1 ---\n');

// 1. Cargar artefactos auditados
const c0Container = JSON.parse(readFileSync('rsc/c0-genesis-f3.json', 'utf8'));
const c1Container = JSON.parse(readFileSync('rsc/c1-f4.json', 'utf8'));
const architexRaw = JSON.parse(readFileSync('architex_os_architex_v4.json', 'utf8'));

const c0 = c0Container.contextoCanonico;
const c1 = c1Container.contextoCanonico;

// =========================================================================
// BLOQUE 1: Verificación de C0 (Padre Inmutable)
// =========================================================================
const HASH_ESPERADO_C0 = 'f1ac370dcaf885050882b2a2ddd6da142c93567f8e054b4534a36a76db33d70e';
const SHA256_FISICO_C0 = 'da30c093867d81c5f1b1557c470df34059a61ee607a5ffdfcad28bd77886637b';

const shaFisicoActualC0 = createHash('sha256').update(readFileSync('rsc/c0-genesis-f3.json')).digest('hex');
probar('F4-C0-1: SHA-256 físico de rsc/c0-genesis-f3.json intacto', SHA256_FISICO_C0, shaFisicoActualC0);
probar('F4-C0-2: contentHash semántico de C0 intacto', HASH_ESPERADO_C0, c0.contentHash);

const vC0 = verificarContextoRsc4(c0);
probar('F4-C0-3: C0 es VALIDO', ESTADOS_VERIFICACION.VALIDO, vC0.estado);
probar('F4-C0-4: C0 parentStatus es GENESIS', PARENT_STATUS_F3.GENESIS, vC0.parentStatus);
probar('F4-C0-5: C0 lineageDepth es 0', 0, vC0.lineageDepth);

// =========================================================================
// BLOQUE 2: Determinismo y Regeneración de C1 desde Fuente de Verdad
// =========================================================================
const c1DesdeFuenteA = normalizarContextoArchitex(architexRaw.datosProyecto);
await new Promise(r => setTimeout(r, 20));
const c1DesdeFuenteB = normalizarContextoArchitex(architexRaw.datosProyecto);

probar('F4-DET-1: normalización de estadoProyecto es determinista', true, c1DesdeFuenteA.contentHash === c1DesdeFuenteB.contentHash);
probar('F4-DET-2: contentHash de C1 coincide con normalización de fuente', c1DesdeFuenteA.contentHash, c1.contentHash);
probar('F4-DET-3: C1 difiere de C0 en contentHash', true, c1.contentHash !== c0.contentHash);

// =========================================================================
// BLOQUE 3: Linaje Causal C0 → C1
// =========================================================================
const vC1SinPadre = verificarContextoRsc4(c1);
probar('F4-LIN-1: C1 sin padre declara linaje con PARENT_DECLARED_ONLY', PARENT_STATUS_F3.PARENT_DECLARED_ONLY, vC1SinPadre.parentStatus);

const vC1ConPadre = verificarContextoRsc4(c1, { contextoPadre: c0 });
probar('F4-LIN-2: C1 evaluado contra C0 es VALIDO', ESTADOS_VERIFICACION.VALIDO, vC1ConPadre.estado);
probar('F4-LIN-3: C1 evaluado contra C0 es PARENT_VERIFIED', PARENT_STATUS_F3.PARENT_VERIFIED, vC1ConPadre.parentStatus);
probar('F4-LIN-4: parentContentHash coincide exactamente con C0', HASH_ESPERADO_C0, c1.integrity.value.parentContentHash);
probar('F4-LIN-5: lineageDepth de C1 es exactamente 1', 1, c1.integrity.value.lineageDepth);
probar('F4-LIN-6: contextVersion de C1 es 1.1.0 (MINOR)', '1.1.0', c1.contextVersion);
probar('F4-LIN-7: triggerDecisionId es ADR-001-F4-DIMENSIONES-SDD', 'ADR-001-F4-DIMENSIONES-SDD', c1.provenance.value.triggerDecisionId);
probar('F4-LIN-8: author es ARQUITECTO_HUMANO', 'ARQUITECTO_HUMANO', c1.provenance.value.author);
probar('F4-LIN-9: sourceType es HUMAN_UI', 'HUMAN_UI', c1.provenance.value.sourceType);
probar('F4-LIN-10: lifecycle de C1 es CANONICAL', 'CANONICAL', c1.state.value.lifecycle);

// =========================================================================
// BLOQUE 4: Balance de Dimensiones (21 IMPLEMENTADO / 4 NO_IMPLEMENTADO)
// =========================================================================
const DIMENSIONES = [
  'identity', 'problem', 'objectives', 'audience', 'environment', 'mvp', 'future',
  'constraints', 'roles', 'users', 'entities', 'requirements', 'data', 'design',
  'architecture', 'technology', 'decisions', 'skills', 'traceability', 'tests',
  'production', 'maintenance', 'state', 'provenance', 'integrity'
];

const implementadas = DIMENSIONES.filter(d => c1[d] && c1[d].status === 'IMPLEMENTADO');
const noImplementadas = DIMENSIONES.filter(d => c1[d] && c1[d].status === 'NO_IMPLEMENTADO');

probar('F4-DIM-1: total de 25 dimensiones canónicas evaluadas', 25, DIMENSIONES.length);
probar('F4-DIM-2: exactamente 21 dimensiones IMPLEMENTADO', 21, implementadas.length);
probar('F4-DIM-3: exactamente 4 dimensiones NO_IMPLEMENTADO', 4, noImplementadas.length);

const cuatroNoImplementadasEsperadas = ['skills', 'tests', 'production', 'maintenance'];
const coincidenCuatro = cuatroNoImplementadasEsperadas.every(d => c1[d].status === 'NO_IMPLEMENTADO' && c1[d].value === null);
probar('F4-DIM-4: las 4 dimensiones no implementadas son skills, tests, production, maintenance', true, coincidenCuatro);

// Validar Dimensión 10: users
probar('F4-USR-1: users status es IMPLEMENTADO', 'IMPLEMENTADO', c1.users.status);
probar('F4-USR-2: totalProfiles es 3', 3, c1.users.value.totalProfiles);
probar('F4-USR-3: targetProfiles contiene USR-01, USR-02, USR-03', true,
  c1.users.value.targetProfiles.some(u => u.id === 'USR-01') &&
  c1.users.value.targetProfiles.some(u => u.id === 'USR-02') &&
  c1.users.value.targetProfiles.some(u => u.id === 'USR-03')
);

// Validar Dimensión 12: requirements
probar('F4-REQ-1: requirements status es IMPLEMENTADO', 'IMPLEMENTADO', c1.requirements.status);
probar('F4-REQ-2: totalRequirements es 5', 5, c1.requirements.value.totalRequirements);
probar('F4-REQ-3: catalog contiene requisitos funcionales y no funcionales', true,
  c1.requirements.value.catalog.some(r => r.type === 'FUNCTIONAL') &&
  c1.requirements.value.catalog.some(r => r.type === 'NON_FUNCTIONAL')
);

// =========================================================================
// BLOQUE 5: Detección Adversarial de Manipulación
// =========================================================================
// 1. Padre falso (PARENT_MISMATCH)
const estadoPadreFalso = Object.assign({}, architexRaw.datosProyecto, {
  linajeCausal: {
    parentContentHash: 'a'.repeat(64),
    lineageDepth: 1
  }
});
const c1PadreFalso = normalizarContextoArchitex(estadoPadreFalso);
const vPadreFalso = verificarContextoRsc4(c1PadreFalso, { contextoPadre: c0 });
probar('F4-ADV-1: parent mismatch dispara INVALIDO', ESTADOS_VERIFICACION.INVALIDO, vPadreFalso.estado);
probar('F4-ADV-2: diagnóstico PARENT_MISMATCH', DIAGNOSTICOS_LINAJE_F3.PARENT_MISMATCH, vPadreFalso.diagnosticoLinaje);

// 2. Depth inconsistente (DEPTH_INCONSISTENT)
const estadoDepthInconsistente = Object.assign({}, architexRaw.datosProyecto, {
  linajeCausal: {
    parentContentHash: HASH_ESPERADO_C0,
    lineageDepth: 5
  }
});
const c1DepthInconsistente = normalizarContextoArchitex(estadoDepthInconsistente);
const vDepthInconsistente = verificarContextoRsc4(c1DepthInconsistente, { contextoPadre: c0 });
probar('F4-ADV-3: depth inconsistente dispara INVALIDO', ESTADOS_VERIFICACION.INVALIDO, vDepthInconsistente.estado);
probar('F4-ADV-4: diagnóstico DEPTH_INCONSISTENT', DIAGNOSTICOS_LINAJE_F3.DEPTH_INCONSISTENT, vDepthInconsistente.diagnosticoLinaje);

// 3. Modificación del contenido sin recalcular hash (tampering)
const c1Tampered = JSON.parse(JSON.stringify(c1));
c1Tampered.problem.value.centralProblem = 'Problema manipulado maliciosamente';
const vTampered = verificarContextoRsc4(c1Tampered, { contextoPadre: c0 });
probar('F4-ADV-5: tampering de contenido dispara INVALIDO', ESTADOS_VERIFICACION.INVALIDO, vTampered.estado);

// 4. Inyección de secretos en requirements detectada
const c1ConSecretos = JSON.parse(JSON.stringify(c1));
c1ConSecretos.requirements.value.catalog[0].statement = 'sk-ant-api03-leak1234567890 secreto filtrado';
const vConSecretos = verificarContextoRsc4(c1ConSecretos, { contextoPadre: c0 });
probar('F4-ADV-6: presencia de secretos en requirements dispara INVALIDO', ESTADOS_VERIFICACION.INVALIDO, vConSecretos.estado);

// =========================================================================
// BLOQUE 6: Cero Llamadas de Red
// =========================================================================
let llamadasRed = 0;
const fetchOriginal = globalThis.fetch;
globalThis.fetch = () => { llamadasRed++; return Promise.reject(new Error('Fetch bloqueado')); };

normalizarContextoArchitex(architexRaw.datosProyecto);
verificarContextoRsc4(c1, { contextoPadre: c0 });

globalThis.fetch = fetchOriginal;
probar('F4-NET-1: cero llamadas de red durante normalización y verificación F4', 0, llamadasRed);

console.log('\n--- RESUMEN FINAL F4 ---');
const fallos = resultados.filter(r => !r.ok);
if (fallos.length === 0) {
  console.log(`RESULTADO: TODAS LAS PRUEBAS F4 PASARON CON ÉXITO (${resultados.length}/${resultados.length})`);
  console.log('REAL_HASH_C1=' + c1.contentHash);
  process.exit(0);
} else {
  console.error(`RESULTADO: FALLARON ${fallos.length} PRUEBAS:`);
  fallos.forEach(f => console.error(' -', f.nombre, 'Esperado:', f.esperado, 'Obtenido:', f.obtenido));
  process.exit(1);
}
