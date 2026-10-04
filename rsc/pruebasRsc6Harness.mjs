/**
 * ARCHITEX OS V-36 — RSC-6: SUITE DE PRUEBAS DEL RSC-HARNESS
 *
 * Valida de forma exhaustiva y aislada:
 * - Comandos verificar, inspeccionar, solicitar-regeneracion
 * - Formato humano y formato --json estructurado
 * - Códigos de salida (0 = VALIDO / apto; 1 = cualquier otro estado)
 * - Semántica multi-tenant formal (válido, null, "no", ausente, projectId)
 * - Thin Wrapper sobre RSC-4 sin duplicación de lógica
 * - Comportamiento no destructivo y sin ejecución automática de RSC-5
 */

import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { normalizarContextoArchitex } from './normalizadorContexto.mjs';
import { generarProyeccionesRsc3, escribirProyeccionesFisicas } from './generadorProyecciones.mjs';
import {
  COMANDOS_HARNESS,
  validarCoincidenciaTenant,
  evaluarHarnessContexto,
  ejecutarCliHarness
} from './harnessContexto.mjs';
import { ESTADOS_VERIFICACION, PARENT_STATUS_F3 } from './verificadorContexto.mjs';

const resultados = [];

function probar(nombre, esperado, obtenido, extra) {
  const ok = esperado === obtenido;
  resultados.push({ nombre, esperado, obtenido, ok, extra });
  console.log(ok ? 'OK' : 'FALLO', nombre, '→', obtenido, extra ? '(' + extra + ')' : '');
}

console.log('--- INICIO PRUEBAS RSC-6: RSC-HARNESS (THIN CLI WRAPPER) ---\n');

// 1. Crear entorno de prueba temporal aislado
const dirTest = mkdtempSync(join(tmpdir(), 'architex-rsc6-test-'));

const estadoPruebaA = {
  idProyecto: 'proyecto_edu_01',
  nombreProyecto: 'EduLectura Accesible',
  campoProblema: 'Problema Original A',
  campoObjetivo: 'Objetivo A',
  campoPublico: 'Comunidad escolar',
  campoEntorno: 'Google Apps Script',
  campoMvp: 'MVP A',
  campoFuturo: 'Futuro A',
  campoRestricciones: 'Costo $0 USD, LockService, es-MX',
  campoRoles: 'Docente, Alumno',
  campoFlujos: 'Flujo A',
  campoEntidades: 'Entidades A',
  campoPantallas: 'Pantallas A',
  campoNavegacion: 'Navegación A',
  campoDispositivos: 'Web',
  campoManejoOffline: 'localStorage',
  selectorTipoProyecto: 'web_appsscript',
  entidadesRegistradas: [{ nombre: 'Alumno', campos: 'id, nombre' }],
  decisionesRegistradas: [{ titulo: 'ADR-001', problema: 'Concurrencia', motivo: 'LockService', fecha: '2026-10-04' }],
  elementosTrazabilidad: [{ requisito: 'Req A', actor: 'Alumno', destino: 'GAS', prueba: 'Test A' }],
  componentesClaveEstado: { frontend_web: true, backend_gas: true }
};

const ctxA = normalizarContextoArchitex(estadoPruebaA, { tenantId: 'tenant_colegio_01' });
const proyA = generarProyeccionesRsc3(ctxA);
escribirProyeccionesFisicas(proyA, dirTest);

// =========================================================================
// TEST 01 — Comando verificar sobre workspace válido → Exit 0 y VALIDO
// =========================================================================
const diagT1 = evaluarHarnessContexto(dirTest, {
  tenantIdEsperado: 'tenant_colegio_01',
  projectIdEsperado: 'proyecto_edu_01'
});
probar('TEST 01a: evaluarHarnessContexto retorna VALIDO', ESTADOS_VERIFICACION.VALIDO, diagT1.estadoContexto);
probar('TEST 01b: aptoParaConsumo es true', true, diagT1.aptoParaConsumo);

const exitCodeT1 = ejecutarCliHarness(['verificar'], dirTest);
probar('TEST 01c: ejecutarCliHarness retorna Exit Code 0', 0, exitCodeT1);

// =========================================================================
// TEST 02 — Salida estructurada --json es parseable y conforme al contrato
// =========================================================================
let jsonCapturado = '';
const logOriginal = console.log;
console.log = (txt) => { jsonCapturado = txt; };

const exitCodeT2 = ejecutarCliHarness(['verificar', '--json'], dirTest);
console.log = logOriginal;

let jsonValido = false;
let parsedJson = null;
try {
  parsedJson = JSON.parse(jsonCapturado);
  jsonValido = parsedJson && parsedJson.estadoContexto === 'VALIDO' && parsedJson.aptoParaConsumo === true;
} catch (e) {
  jsonValido = false;
}
probar('TEST 02a: Formato --json es parseable y válido', true, jsonValido);
probar('TEST 02b: Formato --json contiene los 6 archivos auditados', 6, parsedJson ? parsedJson.archivosAuditados.length : 0);
probar('TEST 02c: Exit Code de --json es 0', 0, exitCodeT2);

// =========================================================================
// TEST 03 — Comando inspeccionar retorna metadata e identidad sin mutar nada
// =========================================================================
const exitCodeT3 = ejecutarCliHarness(['inspeccionar'], dirTest);
probar('TEST 03: Comando inspeccionar retorna Exit Code 0', 0, exitCodeT3);

// =========================================================================
// TEST 04 — solicitar-regeneracion NO muta archivos ni ejecuta RSC-5
// =========================================================================
const snapshotAntesT4 = readFileSync(join(dirTest, 'ARCHITEX_STATE.json'), 'utf8');
const exitCodeT4 = ejecutarCliHarness(['solicitar-regeneracion'], dirTest);
const snapshotDespuesT4 = readFileSync(join(dirTest, 'ARCHITEX_STATE.json'), 'utf8');
probar('TEST 04a: solicitar-regeneracion retorna Exit Code 0', 0, exitCodeT4);
probar('TEST 04b: solicitar-regeneracion no modifica archivos en disco', snapshotAntesT4, snapshotDespuesT4);

// =========================================================================
// TEST 05 — Contexto inválido por hash manipulado → Exit 1 e INVALIDO
// =========================================================================
const dirInvalido = mkdtempSync(join(tmpdir(), 'architex-rsc6-invalido-'));
escribirProyeccionesFisicas(proyA, dirInvalido);
// Manipulamos el JSON en disco
const objState = JSON.parse(readFileSync(join(dirInvalido, 'ARCHITEX_STATE.json'), 'utf8'));
objState.dimensions.problem.value.centralProblem = 'MANIPULADO';
writeFileSync(join(dirInvalido, 'ARCHITEX_STATE.json'), JSON.stringify(objState, null, 2), 'utf8');

const diagT5 = evaluarHarnessContexto(dirInvalido);
probar('TEST 05a: Hash alterado retorna INVALIDO', ESTADOS_VERIFICACION.INVALIDO, diagT5.estadoContexto);
probar('TEST 05b: aptoParaConsumo es false', false, diagT5.aptoParaConsumo);

const exitCodeT5 = ejecutarCliHarness(['verificar'], dirInvalido);
probar('TEST 05c: Exit Code es 1 ante INVALIDO', 1, exitCodeT5);
rmSync(dirInvalido, { recursive: true, force: true });

// =========================================================================
// TEST 06 — Contexto incompleto (falta un archivo de proyección) → Exit 1 e INCOMPLETO
// =========================================================================
const dirIncompleto = mkdtempSync(join(tmpdir(), 'architex-rsc6-incompleto-'));
escribirProyeccionesFisicas(proyA, dirIncompleto);
rmSync(join(dirIncompleto, '.cursorrules')); // Eliminamos archivo obligatorio

const diagT6 = evaluarHarnessContexto(dirIncompleto);
probar('TEST 06a: Archivo faltante retorna INCOMPLETO', ESTADOS_VERIFICACION.INCOMPLETO, diagT6.estadoContexto);
probar('TEST 06b: aptoParaConsumo es false', false, diagT6.aptoParaConsumo);
rmSync(dirIncompleto, { recursive: true, force: true });

// =========================================================================
// TEST 07 — Detección de DESACTUALIZADO contra contexto nuevo → Exit 1
// =========================================================================
const estadoMutado = { ...estadoPruebaA, campoProblema: 'Problema Mutado Nuevo' };
const ctxMutado = normalizarContextoArchitex(estadoMutado, { tenantId: 'tenant_colegio_01' });

const diagT7 = evaluarHarnessContexto(dirTest, { contextoActual: ctxMutado });
probar('TEST 07a: Contexto desactualizado retorna DESACTUALIZADO', ESTADOS_VERIFICACION.DESACTUALIZADO, diagT7.estadoContexto);
probar('TEST 07b: aptoParaConsumo es false', false, diagT7.aptoParaConsumo);
probar('TEST 07c: solicitudRsc5 emitida para intervención humana', true, !!diagT7.solicitudRsc5);

// =========================================================================
// TEST 08 — Reglas formales Multi-Tenant
// =========================================================================
// 8a. tenantId válido estricto
probar('TEST 08a: Coincidencia estricta de tenant corporativo', true, validarCoincidenciaTenant('tenant_A', 'tenant_A'));
probar('TEST 08b: Rechazo de tenant corporativo discrepante', false, validarCoincidenciaTenant('tenant_A', 'tenant_B'));

// 8c. tenantId === null (monotenant)
probar('TEST 08c: null aceptado cuando se espera null', true, validarCoincidenciaTenant(null, null));
probar('TEST 08d: null aceptado cuando se espera "no"', true, validarCoincidenciaTenant(null, 'no'));

// 8e. tenantId === "no" (monotenant histórico)
probar('TEST 08e: "no" aceptado cuando se espera "no"', true, validarCoincidenciaTenant('no', 'no'));
probar('TEST 08f: "no" aceptado cuando se espera null', true, validarCoincidenciaTenant('no', null));
probar('TEST 08g: "no" rechazado cuando consumidor exige tenant corporativo', false, validarCoincidenciaTenant('no', 'tenant_corporativo'));

// 8h. projectId incorrecto
const diagT8h = evaluarHarnessContexto(dirTest, { projectIdEsperado: 'proyecto_falso' });
probar('TEST 08h: ProjectId incorrecto es INVALIDO', ESTADOS_VERIFICACION.INVALIDO, diagT8h.estadoContexto);

// 8i. tenantId ausente físicamente en ARCHITEX_STATE.json → INCOMPLETO
const dirTenantAusente = mkdtempSync(join(tmpdir(), 'architex-rsc6-tenant-ausente-'));
escribirProyeccionesFisicas(proyA, dirTenantAusente);

// Leemos el archivo físico real, eliminamos físicamente la propiedad tenantId y lo reescribimos
const stateSinTenant = JSON.parse(readFileSync(join(dirTenantAusente, 'ARCHITEX_STATE.json'), 'utf8'));
delete stateSinTenant.tenantId;
writeFileSync(join(dirTenantAusente, 'ARCHITEX_STATE.json'), JSON.stringify(stateSinTenant, null, 2), 'utf8');

// Ejecución del Harness real sobre el filesystem
const diagTenantAusente = evaluarHarnessContexto(dirTenantAusente);
probar('TEST 08i: tenantId ausente retorna INCOMPLETO', ESTADOS_VERIFICACION.INCOMPLETO, diagTenantAusente.estadoContexto);
probar('TEST 08i-b: aptoParaConsumo es false ante tenantId ausente', false, diagTenantAusente.aptoParaConsumo);

const exitCodeTenantAusente = ejecutarCliHarness(['verificar'], dirTenantAusente);
probar('TEST 08i-c: Exit Code es 1 ante tenantId ausente', 1, exitCodeTenantAusente);

rmSync(dirTenantAusente, { recursive: true, force: true });

// 8j. Normalización CLI de --tenantId null primitivo vs --tenantId no literal
const exitCodeTenantCliNull = ejecutarCliHarness(['verificar', '--tenantId', 'null'], dirTest);
probar('TEST 08j: CLI --tenantId null rechaza tenant corporativo con Exit 1', 1, exitCodeTenantCliNull);

// En un directorio monotenant histórico ('no')
const dirMonotenant = mkdtempSync(join(tmpdir(), 'architex-rsc6-monotenant-'));
const ctxMono = normalizarContextoArchitex(estadoPruebaA, { tenantId: 'no' });
const proyMono = generarProyeccionesRsc3(ctxMono);
escribirProyeccionesFisicas(proyMono, dirMonotenant);

const exitCodeMonoNull = ejecutarCliHarness(['verificar', '--tenantId', 'null'], dirMonotenant);
probar('TEST 08k: CLI --tenantId null acepta monotenant con Exit 0', 0, exitCodeMonoNull);

const exitCodeMonoNo = ejecutarCliHarness(['verificar', '--tenantId', 'no'], dirMonotenant);
probar('TEST 08l: CLI --tenantId no acepta monotenant con Exit 0', 0, exitCodeMonoNo);

rmSync(dirMonotenant, { recursive: true, force: true });

// =========================================================================
// TEST 09 — Ausencia de llamadas de red
// =========================================================================
let llamadasRed = 0;
const fetchOriginal = globalThis.fetch;
globalThis.fetch = () => { llamadasRed++; return Promise.reject(new Error('Red bloqueada')); };

evaluarHarnessContexto(dirTest);
ejecutarCliHarness(['verificar'], dirTest);

globalThis.fetch = fetchOriginal;
probar('TEST 09: Cero llamadas de red durante la ejecución del Harness', 0, llamadasRed);

// =========================================================================
// TEST 10 — Verificación del Repositorio Actual
// =========================================================================
const diagRepositorioActual = evaluarHarnessContexto(process.cwd());
probar('TEST 10: Repositorio físico actual evaluado por el Harness es VALIDO', ESTADOS_VERIFICACION.VALIDO, diagRepositorioActual.estadoContexto);
probar('TEST 10b: Repositorio físico actual aptoParaConsumo es true', true, diagRepositorioActual.aptoParaConsumo);

// =========================================================================
// F3 — Linaje visible en el harness
// =========================================================================
const dirGenesis = mkdtempSync(join(tmpdir(), 'architex-rsc6-f3-'));
const estadoGenesis = {
  ...estadoPruebaA,
  estadoCicloVida: { lifecycle: 'CANONICAL' },
  registroProcedencia: {
    sourceType: 'SYSTEM_GENESIS',
    author: 'ARQUITECTO_HUMANO',
    triggerDecisionId: 'ADR-000-BASE-V36',
    timestamp: '2026-10-04T00:00:00.000Z'
  },
  linajeCausal: { parentContentHash: null, lineageDepth: 0 }
};
const ctxGenesis = normalizarContextoArchitex(estadoGenesis, { contextVersion: '1.0.0', tenantId: 'tenant_colegio_01' });
escribirProyeccionesFisicas(generarProyeccionesRsc3(ctxGenesis), dirGenesis);
const diagGenesis = evaluarHarnessContexto(dirGenesis);
probar('F3-H1: génesis parentStatus GENESIS', PARENT_STATUS_F3.GENESIS, diagGenesis.identidad.parentStatus);
probar('F3-H2: lineageDepth 0', 0, diagGenesis.identidad.lineageDepth);
probar('F3-H3: parentContentHash null', null, diagGenesis.identidad.parentContentHash);
probar('F3-H4: contextVersion presente', '1.0.0', diagGenesis.identidad.contextVersion);
probar('F3-H5: exit 0 ⇔ VALIDO && apto', true, diagGenesis.estadoContexto === ESTADOS_VERIFICACION.VALIDO && diagGenesis.aptoParaConsumo === true);
const exitGenesis = ejecutarCliHarness(['verificar'], dirGenesis);
probar('F3-H6: CLI génesis Exit 0', 0, exitGenesis);
rmSync(dirGenesis, { recursive: true, force: true });

// Limpieza de directorio temporal
rmSync(dirTest, { recursive: true, force: true });

console.log('\n--- RESUMEN FINAL RSC-6 ---');
const fallos = resultados.filter(r => !r.ok);
if (fallos.length === 0) {
  console.log(`RESULTADO: TODAS LAS PRUEBAS RSC-6 PASARON CON ÉXITO (${resultados.length}/${resultados.length})`);
  process.exit(0);
} else {
  console.error(`RESULTADO: FALLARON ${fallos.length} PRUEBAS:`);
  fallos.forEach(f => console.error(' -', f.nombre, 'Esperado:', f.esperado, 'Obtenido:', f.obtenido));
  process.exit(1);
}
