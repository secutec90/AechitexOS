/**
 * ARCHITEX OS V-36 — RSC-4: SUITE DE PRUEBAS DE CONSUMO Y VERIFICACIÓN
 *
 * Valida los 15 tests obligatorios de verificación y los 10 escenarios
 * de ataque conceptual (A-J) especificados para RSC-4.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { normalizarContextoArchitex } from './normalizadorContexto.mjs';
import { generarProyeccionesRsc3 } from './generadorProyecciones.mjs';
import {
  ESTADOS_VERIFICACION,
  PARENT_STATUS_F3,
  DIAGNOSTICOS_LINAJE_F3,
  verificarContextoRsc4,
  verificarTextoProyeccion,
  verificarConjuntoProyecciones
} from './verificadorContexto.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const raizProyecto = resolve(__dirname, '..');

const resultados = [];

function probar(nombre, esperado, obtenido, extra) {
  const ok = esperado === obtenido;
  resultados.push({ nombre, esperado, obtenido, ok, extra });
  console.log(ok ? 'OK' : 'FALLO', nombre, '→', obtenido, extra ? '(' + extra + ')' : '');
}

console.log('--- INICIO PRUEBAS RSC-4: CONSUMO SEGURO Y VERIFICACIÓN DEL CONTEXTO ---\n');

// 1. Preparar un contexto canónico y proyecciones válidas
const estadoBase = {
  idProyecto: 'proyecto_edu_01',
  nombreProyecto: 'EduLectura Accesible',
  campoProblema: 'Baja comprensión lectora.',
  campoObjetivo: 'Desarrollar plataforma con síntesis de voz.',
  campoPublico: 'Alumnos y docentes.',
  campoEntorno: 'Google Apps Script + Sheets.',
  campoMvp: 'Cronómetro y síntesis de voz.',
  campoFuturo: 'Módulo de análisis de fluidez.',
  campoRestricciones: 'Costo $0 USD, LockService, es-MX.',
  campoRoles: 'Docente, Alumno.',
  campoFlujos: 'Seleccionar lectura -> Leer -> Registrar.',
  campoEntidades: 'Alumnos, Lecturas.',
  campoPantallas: 'Vista Lectura, Panel Docente.',
  campoNavegacion: 'Ruta guiada de cuatro estaciones.',
  campoDispositivos: 'Navegador Web.',
  campoManejoOffline: 'localStorage local.',
  selectorTipoProyecto: 'web_appsscript',
  entidadesRegistradas: [{ nombre: 'Alumno', campos: 'id, nombre' }],
  decisionesRegistradas: [{ titulo: 'ADR-001', problema: 'Concurrencia', motivo: 'LockService', fecha: '2026-10-04' }],
  elementosTrazabilidad: [{ requisito: 'Voz', actor: 'Alumno', destino: 'Web Speech', prueba: 'Test locución' }],
  componentesClaveEstado: { frontend_web: true, backend_gas: true }
};

const ctxValido = normalizarContextoArchitex(estadoBase, { tenantId: 'tenant_colegio_01' });
const proyValidas = generarProyeccionesRsc3(ctxValido);
const stateJsonValido = JSON.parse(proyValidas.architexStateJson);

// =========================================================================
// TEST 1 — Proyección válida → VALIDO
// =========================================================================
const res1 = verificarContextoRsc4(stateJsonValido, {
  tenantIdEsperado: 'tenant_colegio_01',
  projectIdEsperado: 'proyecto_edu_01'
});
probar('TEST 1: Proyección válida retorna VALIDO', ESTADOS_VERIFICACION.VALIDO, res1.estado);

// =========================================================================
// TEST 2 — Hash incorrecto → INVALIDO
// =========================================================================
const stateHashInvalido = {
  ...stateJsonValido,
  contentHash: '0000000000000000000000000000000000000000000000000000000000000000'
};
const res2 = verificarContextoRsc4(stateHashInvalido);
probar('TEST 2: Hash manipulado retorna INVALIDO', ESTADOS_VERIFICACION.INVALIDO, res2.estado);

// =========================================================================
// TEST 3 — Proyección alterada (contenido modificado sin recomputar hash) → INVALIDO
// =========================================================================
const stateAlterado = JSON.parse(JSON.stringify(stateJsonValido));
stateAlterado.dimensions.problem.value.centralProblem = 'PROBLEMA ALTERADO MANUALMENTE';
const res3 = verificarContextoRsc4(stateAlterado);
probar('TEST 3: Contenido alterado manualmente retorna INVALIDO', ESTADOS_VERIFICACION.INVALIDO, res3.estado);

// =========================================================================
// TEST 4 — Contexto nuevo contra proyección antigua → DESACTUALIZADO
// =========================================================================
// Mutamos el estado y normalizamos a contexto nuevo
const estadoNuevo = { ...estadoBase, campoObjetivo: 'Nuevo objetivo arquitectónico ampliado.' };
const ctxNuevo = normalizarContextoArchitex(estadoNuevo, { tenantId: 'tenant_colegio_01' });

// Verificamos la proyección antigua contra el contexto nuevo
const res4 = verificarContextoRsc4(stateJsonValido, { contextoActual: ctxNuevo });
probar('TEST 4: Proyección antigua contra contexto nuevo retorna DESACTUALIZADO', ESTADOS_VERIFICACION.DESACTUALIZADO, res4.estado);

// =========================================================================
// TEST 5 — Tenant incorrecto → INVALIDO
// =========================================================================
const res5 = verificarContextoRsc4(stateJsonValido, { tenantIdEsperado: 'tenant_otro_colegio' });
probar('TEST 5: TenantId discrepante retorna INVALIDO', ESTADOS_VERIFICACION.INVALIDO, res5.estado);

// =========================================================================
// TEST 6 — ProjectId incorrecto → INVALIDO
// =========================================================================
const res6 = verificarContextoRsc4(stateJsonValido, { projectIdEsperado: 'proyecto_desconocido' });
probar('TEST 6: ProjectId discrepante retorna INVALIDO', ESTADOS_VERIFICACION.INVALIDO, res6.estado);

// =========================================================================
// TEST 7 — generatedAt diferente → VALIDO (si la semántica es idéntica)
// =========================================================================
const stateOtroTimestamp = {
  ...stateJsonValido,
  generatedAt: new Date(Date.now() + 500000).toISOString()
};
const res7 = verificarContextoRsc4(stateOtroTimestamp);
probar('TEST 7: generatedAt diferente mantiene estado VALIDO', ESTADOS_VERIFICACION.VALIDO, res7.estado);

// =========================================================================
// TEST 8 — Dimensión NO_IMPLEMENTADO bien formada → VALIDO
// =========================================================================
const usersEsNoImplementado = stateJsonValido.dimensions.users.status === 'NO_IMPLEMENTADO' && stateJsonValido.dimensions.users.value === null;
const res8 = verificarContextoRsc4(stateJsonValido);
probar('TEST 8: Dimensión NO_IMPLEMENTADO con value: null retorna VALIDO', true, usersEsNoImplementado && res8.valido);

// =========================================================================
// TEST 9 — Proyección incompleta (faltan dimensiones o cabeceras) → INCOMPLETO
// =========================================================================
const stateIncompleto = JSON.parse(JSON.stringify(stateJsonValido));
delete stateIncompleto.dimensions.integrity; // Eliminamos dimensión canónica 25
const res9 = verificarContextoRsc4(stateIncompleto);
probar('TEST 9: Proyección con dimensión faltante retorna INCOMPLETO', ESTADOS_VERIFICACION.INCOMPLETO, res9.estado);

// =========================================================================
// TEST 10 — Sin acceso de red
// =========================================================================
let llamadasRed = 0;
const fetchOriginal = globalThis.fetch;
globalThis.fetch = () => { llamadasRed++; return Promise.reject(new Error('Red bloqueada')); };

verificarContextoRsc4(stateJsonValido);

globalThis.fetch = fetchOriginal;
probar('TEST 10: Cero llamadas de red durante la verificación', 0, llamadasRed);

// =========================================================================
// TEST 11 — Sin acceso a gobernanza
// =========================================================================
const estadoConTrampas = {
  ...stateJsonValido,
  HERRAMIENTAS_AGENTES: { peligro: true }
};
const res11 = verificarContextoRsc4(estadoConTrampas);
probar('TEST 11: Presencia de gobernanza es detectada y rechazada como INVALIDO', ESTADOS_VERIFICACION.INVALIDO, res11.estado);

// =========================================================================
// TEST 12 — Sin mutación del objeto verificado
// =========================================================================
const snapshotAntes = JSON.stringify(stateJsonValido);
verificarContextoRsc4(stateJsonValido);
const snapshotDespues = JSON.stringify(stateJsonValido);
probar('TEST 12: Inmutabilidad estricta del objeto de entrada verificado', snapshotAntes, snapshotDespues);

// =========================================================================
// TEST 13 — Sin lectura de estadoProyecto
// =========================================================================
// Pasar un estadoProyecto crudo sin dimensiones debe fallar o dar INCOMPLETO
const res13 = verificarContextoRsc4(estadoBase);
probar('TEST 13: estadoProyecto crudo no es aceptado como proyección (no se lee directamente)', true, !res13.valido);

// =========================================================================
// TEST 14 — Cambio de projectVersion correctamente detectado
// =========================================================================
const res14 = verificarContextoRsc4(stateJsonValido, { projectVersionEsperada: 'V-37' });
probar('TEST 14: Cambio de projectVersion detectado como INVALIDO', ESTADOS_VERIFICACION.INVALIDO, res14.estado);

// =========================================================================
// TEST 15 — Cambio de schemaVersion correctamente detectado
// =========================================================================
const res15 = verificarContextoRsc4(stateJsonValido, { schemaVersionEsperada: '2.0.0' });
probar('TEST 15: Cambio de schemaVersion detectado como INVALIDO', ESTADOS_VERIFICACION.INVALIDO, res15.estado);

// =========================================================================
// PRUEBAS DE ATAQUE CONCEPTUAL (Escenarios A - J)
// =========================================================================
console.log('\n--- ESCENARIOS DE ATAQUE CONCEPTUAL (A - J) ---');

// A. Cambiar tenantId
const ataqueA = JSON.parse(JSON.stringify(stateJsonValido));
ataqueA.tenantId = 'tenant_hackeado';
const resA = verificarContextoRsc4(ataqueA);
probar('A. Ataque cambiar tenantId', ESTADOS_VERIFICACION.INVALIDO, resA.estado, resA.razon);

// B. Cambiar projectId
const ataqueB = JSON.parse(JSON.stringify(stateJsonValido));
ataqueB.projectId = 'proyecto_suplantado';
const resB = verificarContextoRsc4(ataqueB);
probar('B. Ataque cambiar projectId', ESTADOS_VERIFICACION.INVALIDO, resB.estado, resB.razon);

// C. Cambiar contentHash
const ataqueC = JSON.parse(JSON.stringify(stateJsonValido));
ataqueC.contentHash = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
const resC = verificarContextoRsc4(ataqueC);
probar('C. Ataque cambiar contentHash', ESTADOS_VERIFICACION.INVALIDO, resC.estado, resC.razon);

// D. Cambiar generatedAt (debe ser VALIDO porque es metadata no semántica)
const ataqueD = JSON.parse(JSON.stringify(stateJsonValido));
ataqueD.generatedAt = '2099-12-31T23:59:59.999Z';
const resD = verificarContextoRsc4(ataqueD);
probar('D. Ataque cambiar generatedAt', ESTADOS_VERIFICACION.VALIDO, resD.estado, 'Metadata volátil no afecta hash');

// E. Agregar propiedad desconocida
const ataqueE = JSON.parse(JSON.stringify(stateJsonValido));
ataqueE.campoInfiltradoXYZ = 'inyeccion_no_autorizada';
const resE = verificarContextoRsc4(ataqueE);
probar('E. Ataque propiedad desconocida', ESTADOS_VERIFICACION.INVALIDO, resE.estado, resE.razon);

// F. Alterar una dimensión (ej. corromper status o value)
const ataqueF = JSON.parse(JSON.stringify(stateJsonValido));
ataqueF.dimensions.problem.status = 'STATUS_FALSO';
const resF = verificarContextoRsc4(ataqueF);
probar('F. Ataque alterar una dimensión', ESTADOS_VERIFICACION.INVALIDO, resF.estado, resF.razon);

// G. Eliminar una dimensión
const ataqueG = JSON.parse(JSON.stringify(stateJsonValido));
delete ataqueG.dimensions.environment;
const resG = verificarContextoRsc4(ataqueG);
probar('G. Ataque eliminar una dimensión', ESTADOS_VERIFICACION.INCOMPLETO, resG.estado, resG.razon);

// H. Insertar una credencial sin redactar
const ataqueH = JSON.parse(JSON.stringify(stateJsonValido));
ataqueH.dimensions.problem.value.centralProblem = 'Fuga: sk-ant-api03-secretKeyInfiltrada12345678';
const resH = verificarContextoRsc4(ataqueH);
probar('H. Ataque insertar credencial sin redactar', ESTADOS_VERIFICACION.INVALIDO, resH.estado, resH.razon);

// I. Insertar HERRAMIENTAS_AGENTES
const ataqueI = JSON.parse(JSON.stringify(stateJsonValido));
ataqueI.dimensions.constraints.HERRAMIENTAS_AGENTES = { bypass: true };
const resI = verificarContextoRsc4(ataqueI);
probar('I. Ataque insertar HERRAMIENTAS_AGENTES', ESTADOS_VERIFICACION.INVALIDO, resI.estado, resI.razon);

// J. Insertar idDecision
const ataqueJ = JSON.parse(JSON.stringify(stateJsonValido));
ataqueJ.dimensions.decisions.idDecision = 'token_de_autorizacion_falso';
const resJ = verificarContextoRsc4(ataqueJ);
probar('J. Ataque insertar idDecision', ESTADOS_VERIFICACION.INVALIDO, resJ.estado, resJ.razon);

// =========================================================================
// F3 — Linaje: PARENT_DECLARED_ONLY / PARENT_VERIFIED / diagnósticos
// =========================================================================
const estadoPadre = {
  ...estadoBase,
  idProyecto: 'proyecto_edu_01',
  estadoCicloVida: { lifecycle: 'CANONICAL' },
  registroProcedencia: {
    sourceType: 'SYSTEM_GENESIS',
    author: 'ARQUITECTO_HUMANO',
    triggerDecisionId: 'ADR-000-BASE-V36',
    timestamp: '2026-10-04T00:00:00.000Z'
  },
  linajeCausal: { parentContentHash: null, lineageDepth: 0 }
};
const ctxPadre = normalizarContextoArchitex(estadoPadre, { contextVersion: '1.0.0', tenantId: 'tenant_colegio_01' });
const resGenesis = verificarContextoRsc4(ctxPadre);
probar('F3-A: génesis PARENT status GENESIS', PARENT_STATUS_F3.GENESIS, resGenesis.parentStatus);
probar('F3-B: génesis permanece VALIDO', ESTADOS_VERIFICACION.VALIDO, resGenesis.estado);

const estadoHijo = {
  ...estadoBase,
  campoProblema: 'Baja comprensión lectora — evolución PATCH.',
  estadoCicloVida: { lifecycle: 'CANONICAL' },
  registroProcedencia: {
    sourceType: 'HUMAN_UI',
    author: 'ARQUITECTO_HUMANO',
    triggerDecisionId: 'ADR-001-PATCH',
    timestamp: '2026-10-04T01:00:00.000Z'
  },
  linajeCausal: { parentContentHash: ctxPadre.contentHash, lineageDepth: 1 }
};
const ctxHijo = normalizarContextoArchitex(estadoHijo, { contextVersion: '1.0.1', tenantId: 'tenant_colegio_01' });
const resDeclared = verificarContextoRsc4(ctxHijo);
probar('F3-C: sin padre confiable → PARENT_DECLARED_ONLY', PARENT_STATUS_F3.PARENT_DECLARED_ONLY, resDeclared.parentStatus);
probar('F3-D: declarado solo sigue VALIDO', ESTADOS_VERIFICACION.VALIDO, resDeclared.estado);

const resVerified = verificarContextoRsc4(ctxHijo, { contextoPadre: ctxPadre });
probar('F3-E: con padre confiable → PARENT_VERIFIED', PARENT_STATUS_F3.PARENT_VERIFIED, resVerified.parentStatus);
probar('F3-F: verificado permanece VALIDO', ESTADOS_VERIFICACION.VALIDO, resVerified.estado);

const estadoMismatch = {
  ...estadoHijo,
  linajeCausal: { parentContentHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', lineageDepth: 1 }
};
const ctxMismatch = normalizarContextoArchitex(estadoMismatch, { contextVersion: '1.0.1', tenantId: 'tenant_colegio_01' });
const resMismatch = verificarContextoRsc4(ctxMismatch, { contextoPadre: ctxPadre });
probar('F3-G: parent mismatch → INVALIDO', ESTADOS_VERIFICACION.INVALIDO, resMismatch.estado);
probar('F3-H: diagnóstico PARENT_MISMATCH', DIAGNOSTICOS_LINAJE_F3.PARENT_MISMATCH, resMismatch.diagnosticoLinaje);

const estadoDepth = {
  ...estadoHijo,
  linajeCausal: { parentContentHash: ctxPadre.contentHash, lineageDepth: 5 }
};
const ctxDepth = normalizarContextoArchitex(estadoDepth, { contextVersion: '1.0.1', tenantId: 'tenant_colegio_01' });
const resDepth = verificarContextoRsc4(ctxDepth, { contextoPadre: ctxPadre });
probar('F3-I: depth mismatch → INVALIDO', ESTADOS_VERIFICACION.INVALIDO, resDepth.estado);
probar('F3-J: diagnóstico DEPTH_INCONSISTENT', DIAGNOSTICOS_LINAJE_F3.DEPTH_INCONSISTENT, resDepth.diagnosticoLinaje);

// =========================================================================
// VERIFICACIÓN FÍSICA DEL REPOSITORIO ACTUAL
// =========================================================================
console.log('\n--- VERIFICACIÓN DEL REPOSITORIO FÍSICO ACTUAL ---');
const rutaStateFisico = resolve(raizProyecto, 'ARCHITEX_STATE.json');
const contStateFisico = readFileSync(rutaStateFisico, 'utf8');
const resFisico = verificarContextoRsc4(contStateFisico);
probar('VERIFICACIÓN FÍSICA: ARCHITEX_STATE.json actual en disco es VALIDO', ESTADOS_VERIFICACION.VALIDO, resFisico.estado);

const rutaAntigravity = resolve(raizProyecto, '.antigravity', 'context.md');
const resAntigravity = verificarTextoProyeccion('.antigravity/context.md', readFileSync(rutaAntigravity, 'utf8'), resFisico.contentHash);
probar('VERIFICACIÓN FÍSICA: .antigravity/context.md alineado', ESTADOS_VERIFICACION.VALIDO, resAntigravity.estado);

const rutaCursor = resolve(raizProyecto, '.cursorrules');
const resCursor = verificarTextoProyeccion('.cursorrules', readFileSync(rutaCursor, 'utf8'), resFisico.contentHash);
probar('VERIFICACIÓN FÍSICA: .cursorrules alineado', ESTADOS_VERIFICACION.VALIDO, resCursor.estado);

const rutaClaude = resolve(raizProyecto, 'CLAUDE.md');
const resClaude = verificarTextoProyeccion('CLAUDE.md', readFileSync(rutaClaude, 'utf8'), resFisico.contentHash);
probar('VERIFICACIÓN FÍSICA: CLAUDE.md alineado', ESTADOS_VERIFICACION.VALIDO, resClaude.estado);

console.log('\n--- RESUMEN FINAL RSC-4 ---');
const fallos = resultados.filter(r => !r.ok);
if (fallos.length === 0) {
  console.log(`RESULTADO: TODAS LAS PRUEBAS RSC-4 PASARON CON ÉXITO (${resultados.length}/${resultados.length})`);
  process.exit(0);
} else {
  console.error(`RESULTADO: FALLARON ${fallos.length} PRUEBAS:`);
  fallos.forEach(f => console.error(' -', f.nombre, 'Esperado:', f.esperado, 'Obtenido:', f.obtenido));
  process.exit(1);
}
