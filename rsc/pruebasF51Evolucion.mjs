/**
 * ARCHITEX OS V-36 — RSC / F5.1: SUITE DE EVOLUCIÓN CANÓNICA C1 → C2
 *
 * Certifica el segundo salto evolutivo formal de linaje causal:
 * C0 Génesis (v1.0.0, depth 0) -> C1 Primer Nodo (v1.1.0, depth 1) -> C2 Segundo Nodo (v1.2.0, depth 2)
 * con activación exclusiva de Dimensión 18 (skills) y Dimensión 20 (tests).
 */

import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { normalizarContextoArchitex } from './normalizadorContexto.mjs';
import { generarProyeccionesRsc3 } from './generadorProyecciones.mjs';
import {
  verificarContextoRsc4,
  verificarTextoProyeccion,
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

console.log('--- INICIO PRUEBAS F5.1: EVOLUCIÓN CANÓNICA C1 → C2 ---\n');

// 1. Cargar artefactos auditados
const c0Container = JSON.parse(readFileSync('rsc/c0-genesis-f3.json', 'utf8'));
const c1Container = JSON.parse(readFileSync('rsc/c1-f4.json', 'utf8'));
const c2Container = JSON.parse(readFileSync('rsc/c2-f5.json', 'utf8'));

const c0 = c0Container.contextoCanonico;
const c1 = c1Container.contextoCanonico;
const c2 = c2Container.contextoCanonico;
const datosCandidato = c2Container.datosProyectoCandidato;

// =========================================================================
// BLOQUE 1: Verificación de C0 y C1 (Ancestros Inmutables)
// =========================================================================
const HASH_ESPERADO_C0 = 'f1ac370dcaf885050882b2a2ddd6da142c93567f8e054b4534a36a76db33d70e';
const SHA256_FISICO_C0 = 'da30c093867d81c5f1b1557c470df34059a61ee607a5ffdfcad28bd77886637b';
const HASH_ESPERADO_C1 = 'fe48761c3a9ace1ad55a401a3a9fcd0289339aa12e40c30ca4d8382c5c0b1b01';

const shaFisicoActualC0 = createHash('sha256').update(readFileSync('rsc/c0-genesis-f3.json')).digest('hex');
probar('F51-C0-1: SHA-256 físico de rsc/c0-genesis-f3.json intacto', SHA256_FISICO_C0, shaFisicoActualC0);
probar('F51-C0-2: contentHash semántico de C0 intacto', HASH_ESPERADO_C0, c0.contentHash);

const vC0 = verificarContextoRsc4(c0);
probar('F51-C0-3: C0 es VALIDO', ESTADOS_VERIFICACION.VALIDO, vC0.estado);
probar('F51-C0-4: C0 parentStatus es GENESIS', PARENT_STATUS_F3.GENESIS, vC0.parentStatus);
probar('F51-C0-5: C0 lineageDepth es 0', 0, vC0.lineageDepth);

probar('F51-C1-1: contentHash semántico de C1 intacto', HASH_ESPERADO_C1, c1.contentHash);
const vC1ConPadre = verificarContextoRsc4(c1, { contextoPadre: c0 });
probar('F51-C1-2: C1 evaluado contra C0 es VALIDO', ESTADOS_VERIFICACION.VALIDO, vC1ConPadre.estado);
probar('F51-C1-3: C1 evaluado contra C0 es PARENT_VERIFIED', PARENT_STATUS_F3.PARENT_VERIFIED, vC1ConPadre.parentStatus);
probar('F51-C1-4: lineageDepth de C1 es 1', 1, c1.integrity.value.lineageDepth);

// =========================================================================
// BLOQUE 2: Determinismo y Normalización de C2
// =========================================================================
const c2DesdeFuenteA = normalizarContextoArchitex(datosCandidato);
await new Promise(r => setTimeout(r, 20));
const c2DesdeFuenteB = normalizarContextoArchitex(datosCandidato);

probar('F51-DET-1: normalización de estado candidato C2 es determinista', true, c2DesdeFuenteA.contentHash === c2DesdeFuenteB.contentHash);
probar('F51-DET-2: contentHash de C2 coincide con normalización de candidato', c2DesdeFuenteA.contentHash, c2.contentHash);
probar('F51-DET-3: C2 difiere de C1 en contentHash', true, c2.contentHash !== c1.contentHash);
probar('F51-DET-4: C2 difiere de C0 en contentHash', true, c2.contentHash !== c0.contentHash);

// =========================================================================
// BLOQUE 3: Linaje Causal C1 → C2
// =========================================================================
const vC2SinPadre = verificarContextoRsc4(c2);
probar('F51-LIN-1: C2 sin padre declara linaje con PARENT_DECLARED_ONLY', PARENT_STATUS_F3.PARENT_DECLARED_ONLY, vC2SinPadre.parentStatus);

const vC2ConPadre = verificarContextoRsc4(c2, { contextoPadre: c1 });
probar('F51-LIN-2: C2 evaluado contra C1 es VALIDO', ESTADOS_VERIFICACION.VALIDO, vC2ConPadre.estado);
probar('F51-LIN-3: C2 evaluado contra C1 es PARENT_VERIFIED', PARENT_STATUS_F3.PARENT_VERIFIED, vC2ConPadre.parentStatus);
probar('F51-LIN-4: parentContentHash coincide exactamente con C1', HASH_ESPERADO_C1, c2.integrity.value.parentContentHash);
probar('F51-LIN-5: lineageDepth de C2 es exactamente 2', 2, c2.integrity.value.lineageDepth);
probar('F51-LIN-6: contextVersion de C2 es 1.2.0 (MINOR)', '1.2.0', c2.contextVersion);
probar('F51-LIN-7: triggerDecisionId es ADR-002-F5-CALIDAD-PLATAFORMA', 'ADR-002-F5-CALIDAD-PLATAFORMA', c2.provenance.value.triggerDecisionId);
probar('F51-LIN-8: author es ARQUITECTO_HUMANO', 'ARQUITECTO_HUMANO', c2.provenance.value.author);
probar('F51-LIN-9: sourceType es HUMAN_UI', 'HUMAN_UI', c2.provenance.value.sourceType);
probar('F51-LIN-10: lifecycle de C2 es CANONICAL', 'CANONICAL', c2.state.value.lifecycle);

// =========================================================================
// BLOQUE 4: Balance de Dimensiones (23 IMPLEMENTADO / 2 NO_IMPLEMENTADO)
// =========================================================================
const DIMENSIONES = [
  'identity', 'problem', 'objectives', 'audience', 'environment', 'mvp', 'future',
  'constraints', 'roles', 'users', 'entities', 'requirements', 'data', 'design',
  'architecture', 'technology', 'decisions', 'skills', 'traceability', 'tests',
  'production', 'maintenance', 'state', 'provenance', 'integrity'
];

const implementadas = DIMENSIONES.filter(d => c2[d] && c2[d].status === 'IMPLEMENTADO');
const noImplementadas = DIMENSIONES.filter(d => c2[d] && c2[d].status === 'NO_IMPLEMENTADO');

probar('F51-DIM-1: total de 25 dimensiones canónicas evaluadas', 25, DIMENSIONES.length);
probar('F51-DIM-2: exactamente 23 dimensiones IMPLEMENTADO', 23, implementadas.length);
probar('F51-DIM-3: exactamente 2 dimensiones NO_IMPLEMENTADO', 2, noImplementadas.length);

const dosNoImplementadasEsperadas = ['production', 'maintenance'];
const coincidenDos = dosNoImplementadasEsperadas.every(d => c2[d].status === 'NO_IMPLEMENTADO' && c2[d].value === null);
probar('F51-DIM-4: las 2 dimensiones no implementadas son production y maintenance', true, coincidenDos);

// Dimensión 18: skills
probar('F51-SKL-1: skills status es IMPLEMENTADO', 'IMPLEMENTADO', c2.skills.status);
probar('F51-SKL-2: totalSkills es 3', 3, c2.skills.value.totalSkills);
const idsSkills = c2.skills.value.skillsCatalog.map(s => s.id);
probar('F51-SKL-3: skillsCatalog contiene SKL-01, SKL-02, SKL-03', true, idsSkills.includes('SKL-01') && idsSkills.includes('SKL-02') && idsSkills.includes('SKL-03'));

// Dimensión 20: tests
probar('F51-TST-1: tests status es IMPLEMENTADO', 'IMPLEMENTADO', c2.tests.status);
probar('F51-TST-2: totalSuites es 8', 8, c2.tests.value.totalSuites);
const idsSuites = c2.tests.value.suites.map(s => s.id);
probar('F51-TST-3: suites contiene suites canónicas T-RSC2 a T-F51', true, idsSuites.includes('T-RSC2') && idsSuites.includes('T-F51'));

// =========================================================================
// BLOQUE 5: Proyecciones Físicas RSC-3 Derivadas de C2
// =========================================================================
const proyeccionesC2 = generarProyeccionesRsc3(c2);
const vContext = verificarTextoProyeccion('.antigravity/context.md', proyeccionesC2.antigravityContextMd, c2.contentHash);
probar('F51-PRY-1: .antigravity/context.md alineado con C2 hash', ESTADOS_VERIFICACION.VALIDO, vContext.estado);
probar('F51-PRY-2: .antigravity/context.md incluye catálogo de habilidades', true, proyeccionesC2.antigravityContextMd.includes('## 18. Habilidades Requeridas (`skills`)') && proyeccionesC2.antigravityContextMd.includes('SKL-01'));
probar('F51-PRY-3: .antigravity/context.md incluye catálogo de pruebas', true, proyeccionesC2.antigravityContextMd.includes('## 20. Pruebas y Validación (`tests`)') && proyeccionesC2.antigravityContextMd.includes('T-RSC2'));

const vClaude = verificarTextoProyeccion('CLAUDE.md', proyeccionesC2.claudeMd, c2.contentHash);
probar('F51-PRY-4: CLAUDE.md alineado con C2 hash', ESTADOS_VERIFICACION.VALIDO, vClaude.estado);
probar('F51-PRY-5: CLAUDE.md declara 23 implementadas y 2 no implementadas', true, proyeccionesC2.claudeMd.includes('Implementadas (23):') && proyeccionesC2.claudeMd.includes('No Implementadas (2):'));

// =========================================================================
// BLOQUE 6: Pruebas Adversariales de Robustez y Seguridad
// =========================================================================
// Adversarial 1: Parent mismatch
const estadoPadreFalso = Object.assign({}, datosCandidato, {
  linajeCausal: {
    parentContentHash: 'a'.repeat(64),
    lineageDepth: 2
  }
});
const c2PadreFalso = normalizarContextoArchitex(estadoPadreFalso);
const vAdv1 = verificarContextoRsc4(c2PadreFalso, { contextoPadre: c1 });
probar('F51-ADV-1: parent mismatch dispara INVALIDO', ESTADOS_VERIFICACION.INVALIDO, vAdv1.estado);
probar('F51-ADV-2: diagnóstico PARENT_MISMATCH', DIAGNOSTICOS_LINAJE_F3.PARENT_MISMATCH, vAdv1.diagnosticoLinaje);

// Adversarial 2: Depth inconsistente
const estadoDepthInconsistente = Object.assign({}, datosCandidato, {
  linajeCausal: {
    parentContentHash: HASH_ESPERADO_C1,
    lineageDepth: 99
  }
});
const c2DepthInconsistente = normalizarContextoArchitex(estadoDepthInconsistente);
const vAdv2 = verificarContextoRsc4(c2DepthInconsistente, { contextoPadre: c1 });
probar('F51-ADV-3: depth inconsistente dispara INVALIDO', ESTADOS_VERIFICACION.INVALIDO, vAdv2.estado);
probar('F51-ADV-4: diagnóstico DEPTH_INCONSISTENT', DIAGNOSTICOS_LINAJE_F3.DEPTH_INCONSISTENT, vAdv2.diagnosticoLinaje);

// Adversarial 3: Tampering de contenido en C2
const c2Tampered = JSON.parse(JSON.stringify(c2));
c2Tampered.skills.value.skillsCatalog[0].name = 'Habilidad Manipulada Sin Modificar Hash';
const vAdv3 = verificarContextoRsc4(c2Tampered, { contextoPadre: c1 });
probar('F51-ADV-5: tampering de contenido dispara INVALIDO', ESTADOS_VERIFICACION.INVALIDO, vAdv3.estado);

// Adversarial 4: Presencia de secretos en skills
const datosConSecretoSkill = JSON.parse(JSON.stringify(datosCandidato));
datosConSecretoSkill.catalogoHabilidades.push({
  id: 'SKL-LEAK',
  nombre: 'Fuga de Clave API',
  descripcion: 'Uso de token secreto sk-ant-api03-leak999999999',
  agentesObjetivo: ['TestAgent']
});
const c2ConSecretoSkill = normalizarContextoArchitex(datosConSecretoSkill);
const vAdv4 = verificarContextoRsc4(c2ConSecretoSkill);
probar('F51-ADV-6: sanitización de secretos en skills previene fugas', false, JSON.stringify(c2ConSecretoSkill.skills).includes('sk-ant-api03-leak999999999'));

// Adversarial 5: Presencia de secretos en tests
const datosConSecretoTest = JSON.parse(JSON.stringify(datosCandidato));
datosConSecretoTest.catalogoSuitesPrueba.suites.push({
  id: 'T-LEAK',
  nombre: 'Prueba con token',
  comando: 'token="Bearer eyJhbGciOiJIUzI1NiJ9" node run.js',
  aserciones: 1
});
const c2ConSecretoTest = normalizarContextoArchitex(datosConSecretoTest);
probar('F51-ADV-7: sanitización de secretos en tests previene fugas', false, JSON.stringify(c2ConSecretoTest.tests).includes('Bearer eyJhbGciOiJIUzI1NiJ9'));

// Adversarial 6: Fallback con arrays vacíos produce NO_IMPLEMENTADO
const datosVaciosF5 = JSON.parse(JSON.stringify(datosCandidato));
datosVaciosF5.catalogoHabilidades = [];
datosVaciosF5.catalogoSuitesPrueba = {};
const c2Vacio = normalizarContextoArchitex(datosVaciosF5);
probar('F51-ADV-8: catalogoHabilidades vacío produce skills NO_IMPLEMENTADO', 'NO_IMPLEMENTADO', c2Vacio.skills.status);
probar('F51-ADV-9: catalogoSuitesPrueba vacío produce tests NO_IMPLEMENTADO', 'NO_IMPLEMENTADO', c2Vacio.tests.status);

// =========================================================================
// BLOQUE 7: Cero Llamadas de Red
// =========================================================================
let llamadasRed = 0;
const origFetch = globalThis.fetch;
globalThis.fetch = () => { llamadasRed++; return Promise.reject(new Error('Red prohibida')); };

normalizarContextoArchitex(datosCandidato);
verificarContextoRsc4(c2, { contextoPadre: c1 });
generarProyeccionesRsc3(c2);

globalThis.fetch = origFetch;
probar('F51-NET-1: cero llamadas de red durante normalización y verificación F5.1', 0, llamadasRed);

console.log('\n--- RESUMEN FINAL F5.1 ---');
const fallos = resultados.filter(r => !r.ok);
if (fallos.length === 0) {
  console.log('RESULTADO: TODAS LAS PRUEBAS F5.1 PASARON CON ÉXITO (' + resultados.length + '/' + resultados.length + ')');
  console.log('REAL_HASH_C2=' + c2.contentHash);
  process.exit(0);
} else {
  console.error('RESULTADO: FALLARON ' + fallos.length + ' PRUEBAS:');
  fallos.forEach(f => console.error(' -', f.nombre, 'Esperado:', f.esperado, 'Obtenido:', f.obtenido));
  process.exit(1);
}
