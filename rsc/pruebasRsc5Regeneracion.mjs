/**
 * ARCHITEX OS V-36 — RSC-5: SUITE DE PRUEBAS DE REGENERACIÓN CONTROLADA
 *
 * Valida los 14 tests obligatorios especificados para RSC-5:
 * - Pre-flight y detección de cambios
 * - Autorización explícita y vinculada a contentHash
 * - Aislamiento en staging y verificación RSC-4
 * - Reemplazo controlado solo tras dictamen VALIDO
 * - No-mutación, idempotencia y multi-tenant
 */

import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { normalizarContextoArchitex } from './normalizadorContexto.mjs';
import { generarProyeccionesRsc3, escribirProyeccionesFisicas } from './generadorProyecciones.mjs';
import {
  ESTADOS_OPERACION_RSC5,
  compararSemVer,
  prepararRegeneracion,
  crearSolicitudAutorizacion,
  validarAutorizacion,
  generarEnStaging,
  verificarStaging,
  reemplazarControlado,
  ejecutarRegeneracionControlada
} from './regeneradorProyecciones.mjs';
import { ESTADOS_VERIFICACION, DIAGNOSTICOS_LINAJE_F3 } from './verificadorContexto.mjs';

const resultados = [];

function probar(nombre, esperado, obtenido, extra) {
  const ok = esperado === obtenido;
  resultados.push({ nombre, esperado, obtenido, ok, extra });
  console.log(ok ? 'OK' : 'FALLO', nombre, '→', obtenido, extra ? '(' + extra + ')' : '');
}

console.log('--- INICIO PRUEBAS RSC-5: REGENERACIÓN CONTROLADA DE PROYECCIONES ---\n');

// 1. Estados de prueba
const estadoBaseA = {
  idProyecto: 'proyecto_edu_01',
  nombreProyecto: 'EduLectura Accesible',
  campoProblema: 'Problema Original A',
  campoObjetivo: 'Objetivo A',
  campoPublico: 'Alumnos y docentes',
  campoEntorno: 'Google Apps Script + Sheets',
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

const estadoBaseB = {
  ...estadoBaseA,
  campoProblema: 'Problema Modificado B (Mutación Arquitectónica)',
  campoObjetivo: 'Objetivo B Ampliado'
};

const ctxA = normalizarContextoArchitex(estadoBaseA, { tenantId: 'tenant_colegio_01' });
const ctxB = normalizarContextoArchitex(estadoBaseB, { tenantId: 'tenant_colegio_01' });

// =========================================================================
// TEST 01 — Contexto sin cambios (hash actual == hash proyectado) → NO_CHANGES
// =========================================================================
const dirPrueba = mkdtempSync(join(tmpdir(), 'architex-rsc5-t1-'));
const proyA = generarProyeccionesRsc3(ctxA);
escribirProyeccionesFisicas(proyA, dirPrueba);

const resT1 = prepararRegeneracion(ctxA, dirPrueba);
probar('TEST 01: Contexto sin cambios retorna NO_CHANGES', ESTADOS_OPERACION_RSC5.NO_CHANGES, resT1.estado);

// =========================================================================
// TEST 02 — Contexto desactualizado (hash actual != hash proyectado) → AUTHORIZATION_REQUIRED
// =========================================================================
// Comparamos el nuevo contexto B contra el directorio con proyecciones de A
const resT2 = prepararRegeneracion(ctxB, dirPrueba);
probar('TEST 02: Contexto desactualizado retorna AUTHORIZATION_REQUIRED', ESTADOS_OPERACION_RSC5.AUTHORIZATION_REQUIRED, resT2.estado);

// =========================================================================
// TEST 03 — Autorización válida (hash autorizado == hash actual) → Permite generación
// =========================================================================
const solicitudAuth = crearSolicitudAutorizacion(resT2);
const dictamenAuthValida = validarAutorizacion(solicitudAuth, ctxB);
probar('TEST 03: Autorización válida retorna AUTHORIZED', ESTADOS_OPERACION_RSC5.AUTHORIZED, dictamenAuthValida.estado);

// =========================================================================
// TEST 04 — Autorización obsoleta (hash autorizado != hash actual) → CONTEXT_CHANGED
// =========================================================================
// Creamos una autorización para un hash viejo o ficticio
const authObsoleta = {
  ...solicitudAuth,
  authorizedContentHash: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
};
const dictamenAuthObsoleta = validarAutorizacion(authObsoleta, ctxB);
probar('TEST 04: Autorización con hash diferente retorna CONTEXT_CHANGED', ESTADOS_OPERACION_RSC5.CONTEXT_CHANGED, dictamenAuthObsoleta.estado);

// =========================================================================
// TEST 05 — Staging válido (RSC-4: VALIDO) → REPLACED
// =========================================================================
const resT5 = ejecutarRegeneracionControlada(ctxB, dirPrueba, { autorizacion: solicitudAuth });
const nuevoStateEnDisco = JSON.parse(readFileSync(join(dirPrueba, 'ARCHITEX_STATE.json'), 'utf8'));

const reemplazoExitoso = (
  resT5.estado === ESTADOS_OPERACION_RSC5.REPLACED &&
  nuevoStateEnDisco.contentHash === ctxB.contentHash &&
  nuevoStateEnDisco.dimensions.problem.value.centralProblem === 'Problema Modificado B (Mutación Arquitectónica)'
);
probar('TEST 05: Staging válido es verificado y reemplazado (REPLACED)', true, reemplazoExitoso);

// =========================================================================
// TEST 06 — Staging inválido (RSC-4: INVALIDO) → REJECTED (conserva proyección anterior)
// =========================================================================
// Creamos un contexto corrupto o inyectamos trampa de credencial
const estadoConTrampa = {
  ...estadoBaseB,
  campoProblema: 'Infiltracion sk-ant-api03-secretKeyPeligrosa12345678'
};
// Simular bypass donde un generador defectuoso produjera staging inválido
const dirStagingInvalido = mkdtempSync(join(tmpdir(), 'architex-rsc5-staging-invalido-'));
const proyTrampa = generarProyeccionesRsc3(normalizarContextoArchitex(estadoConTrampa, { tenantId: 'tenant_colegio_01' }));
// Inyectamos manualmente un secreto crudo en ARCHITEX_STATE.json del staging
const objTrampa = JSON.parse(proyTrampa.architexStateJson);
objTrampa.dimensions.problem.value.centralProblem = 'sk-ant-api03-secretKeyPeligrosa12345678';
escribirProyeccionesFisicas({ ...proyTrampa, architexStateJson: JSON.stringify(objTrampa, null, 2) }, dirStagingInvalido);

const resVerifStagingInvalido = verificarStaging(dirStagingInvalido, ctxB);
const stagingRechazado = !resVerifStagingInvalido.valido && resVerifStagingInvalido.estadoRsc4 === ESTADOS_VERIFICACION.INVALIDO;
probar('TEST 06: Staging con secreto es detectado como INVALIDO y no reemplaza', true, stagingRechazado);
rmSync(dirStagingInvalido, { recursive: true, force: true });

// =========================================================================
// TEST 07 — Staging incompleto (RSC-4: INCOMPLETO) → REJECTED
// =========================================================================
const dirStagingIncompleto = mkdtempSync(join(tmpdir(), 'architex-rsc5-staging-incompleto-'));
const proyIncompleta = generarProyeccionesRsc3(ctxB);
const objIncompleto = JSON.parse(proyIncompleta.architexStateJson);
delete objIncompleto.dimensions.integrity; // Falta dimensión 25
escribirProyeccionesFisicas({ ...proyIncompleta, architexStateJson: JSON.stringify(objIncompleto, null, 2) }, dirStagingIncompleto);

const resVerifIncompleto = verificarStaging(dirStagingIncompleto, ctxB);
probar('TEST 07: Staging incompleto retorna INCOMPLETO y no reemplaza', ESTADOS_VERIFICACION.INCOMPLETO, resVerifIncompleto.estadoRsc4);
rmSync(dirStagingIncompleto, { recursive: true, force: true });

// =========================================================================
// TEST 08 — Staging no verificable (JSON corrupto) → NO_VERIFICABLE
// =========================================================================
const dirStagingCorrupto = mkdtempSync(join(tmpdir(), 'architex-rsc5-staging-corrupto-'));
mkdirSync(dirStagingCorrupto, { recursive: true });
writeFileSync(join(dirStagingCorrupto, 'ARCHITEX_STATE.json'), '{{CORRUPTO_NO_PARSEABLE}}', 'utf8');

const resVerifCorrupto = verificarStaging(dirStagingCorrupto, ctxB);
probar('TEST 08: Staging con JSON corrupto retorna NO_VERIFICABLE', ESTADOS_VERIFICACION.NO_VERIFICABLE, resVerifCorrupto.estadoRsc4);
rmSync(dirStagingCorrupto, { recursive: true, force: true });

// =========================================================================
// TEST 09 — No mutación de estadoProyecto
// =========================================================================
const snapshotEstadoAntes = JSON.stringify(estadoBaseB);
// Ejecutamos flujo completo
ejecutarRegeneracionControlada(ctxB, dirPrueba, { autorizacion: solicitudAuth });
const snapshotEstadoDespues = JSON.stringify(estadoBaseB);
probar('TEST 09: Inmutabilidad absoluta de estadoProyecto', snapshotEstadoAntes, snapshotEstadoDespues);

// =========================================================================
// TEST 10 — Idempotencia (Dos regeneraciones consecutivas del mismo contexto)
// =========================================================================
// Ya se ejecutó para ctxB en TEST 05/09. Si se vuelve a ejecutar sin cambios:
const resT10 = ejecutarRegeneracionControlada(ctxB, dirPrueba, { autorizacion: solicitudAuth });
probar('TEST 10: Segunda ejecución idéntica retorna NO_CHANGES (Idempotencia)', ESTADOS_OPERACION_RSC5.NO_CHANGES, resT10.estado);

// =========================================================================
// TEST 11 — generatedAt no altera contentHash ni fuerza regeneración
// =========================================================================
const ctxConTimestampNuevo = {
  ...ctxB,
  generatedAt: new Date(Date.now() + 1000000).toISOString()
};
const resT11 = prepararRegeneracion(ctxConTimestampNuevo, dirPrueba);
probar('TEST 11: Cambio exclusivo de generatedAt mantiene NO_CHANGES', ESTADOS_OPERACION_RSC5.NO_CHANGES, resT11.estado);

// =========================================================================
// TEST 12 — Multi-tenant (Autorización tenant A no aplica a tenant B)
// =========================================================================
const authTenantA = {
  operation: 'REGENERATE_PROJECTIONS',
  tenantId: 'tenant_colegio_A',
  projectId: 'proyecto_edu_01',
  authorizedContentHash: ctxB.contentHash,
  authorized: true
};
const ctxTenantB = {
  ...ctxB,
  tenantId: 'tenant_colegio_B'
};
const resT12 = validarAutorizacion(authTenantA, ctxTenantB);
probar('TEST 12: Autorización de tenant A es rechazada en tenant B', ESTADOS_OPERACION_RSC5.REJECTED, resT12.estado);

// =========================================================================
// TEST 13 — Fallo durante generación conserva proyección existente intacta
// =========================================================================
const hashAntesFallo = readFileSync(join(dirPrueba, 'ARCHITEX_STATE.json'), 'utf8');
let falloSimulado = false;
try {
  // Pasamos un contexto nulo para forzar aborto
  const resFallo = ejecutarRegeneracionControlada(null, dirPrueba);
  if (resFallo.estado === ESTADOS_OPERACION_RSC5.ABORTED) falloSimulado = true;
} catch (e) {
  falloSimulado = true;
}
const hashDespuesFallo = readFileSync(join(dirPrueba, 'ARCHITEX_STATE.json'), 'utf8');
probar('TEST 13: Fallo en generación aborta y conserva proyección activa intacta', hashAntesFallo, hashDespuesFallo);

// =========================================================================
// TEST 14 — Fallo durante verificación (RSC-4: INVALIDO) conserva versión anterior
// =========================================================================
const hashAntesVerif = readFileSync(join(dirPrueba, 'ARCHITEX_STATE.json'), 'utf8');
// Simular contexto con hash fraudulento
const ctxHashFraudulento = {
  ...ctxB,
  contentHash: '0000000000000000000000000000000000000000000000000000000000000000'
};
const authFraude = {
  operation: 'REGENERATE_PROJECTIONS',
  tenantId: ctxHashFraudulento.tenantId,
  projectId: ctxHashFraudulento.projectId,
  authorizedContentHash: ctxHashFraudulento.contentHash,
  authorized: true
};
const resT14 = ejecutarRegeneracionControlada(ctxHashFraudulento, dirPrueba, { autorizacion: authFraude });
const hashDespuesVerif = readFileSync(join(dirPrueba, 'ARCHITEX_STATE.json'), 'utf8');
const versionConservada = (
  resT14.estado === ESTADOS_OPERACION_RSC5.REJECTED &&
  hashAntesVerif === hashDespuesVerif
);
probar('TEST 14: Verificación inválida rechaza reemplazo y preserva proyección anterior', true, versionConservada);

// =========================================================================
// F3 — Floor Guard
// =========================================================================
probar('F3-FG-1: SemVer 1.0.1 > 1.0.0', 1, compararSemVer('1.0.1', '1.0.0'));
const authBajoPiso = {
  operation: 'REGENERATE_PROJECTIONS',
  tenantId: ctxB.tenantId,
  projectId: ctxB.projectId,
  authorizedContentHash: ctxB.contentHash,
  authorized: true,
  proposedContextVersion: '1.0.0',
  minimumVersionFloor: '1.2.0',
  parentContentHash: ctxA.contentHash,
  rationale: 'Intento de bajar versión'
};
const resFloor = validarAutorizacion(authBajoPiso, { ...ctxB, contextVersion: '1.2.0' });
probar('F3-FG-2: proposed < floor → ABORTED', ESTADOS_OPERACION_RSC5.ABORTED, resFloor.estado);
probar('F3-FG-3: diagnóstico FLOOR_VIOLATION', DIAGNOSTICOS_LINAJE_F3.FLOOR_VIOLATION, resFloor.diagnostico);

const authPisoReducido = {
  ...authBajoPiso,
  proposedContextVersion: '1.1.0',
  minimumVersionFloor: '1.0.0'
};
const resPisoBajo = validarAutorizacion(authPisoReducido, { ...ctxB, contextVersion: '1.2.0' });
probar('F3-FG-4: floor < contextVersion actual → ABORTED', ESTADOS_OPERACION_RSC5.ABORTED, resPisoBajo.estado);

const authPisoOk = {
  ...authBajoPiso,
  proposedContextVersion: '1.3.0',
  minimumVersionFloor: '1.2.0',
  rationale: 'Elevación controlada'
};
const resPisoOk = validarAutorizacion(authPisoOk, { ...ctxB, contextVersion: '1.2.0' });
probar('F3-FG-5: proposed >= floor elevado → AUTHORIZED', ESTADOS_OPERACION_RSC5.AUTHORIZED, resPisoOk.estado);

const prepF3 = prepararRegeneracion(ctxB, dirPrueba, {
  proposedContextVersion: '1.3.0',
  minimumVersionFloor: '1.2.0',
  parentContentHash: ctxA.contentHash,
  rationale: 'Contrato F3'
});
const solicitudF3 = crearSolicitudAutorizacion(prepF3);
probar('F3-FG-6: solicitud incluye proposedContextVersion', '1.3.0', solicitudF3.proposedContextVersion);
probar('F3-FG-7: solicitud incluye minimumVersionFloor', '1.2.0', solicitudF3.minimumVersionFloor);
probar('F3-FG-8: solicitud incluye rationale', 'Contrato F3', solicitudF3.rationale);

// Limpieza de directorio de prueba
rmSync(dirPrueba, { recursive: true, force: true });

console.log('\n--- RESUMEN FINAL RSC-5 ---');
const fallos = resultados.filter(r => !r.ok);
if (fallos.length === 0) {
  console.log(`RESULTADO: TODAS LAS PRUEBAS RSC-5 PASARON CON ÉXITO (${resultados.length}/${resultados.length})`);
  process.exit(0);
} else {
  console.error(`RESULTADO: FALLARON ${fallos.length} PRUEBAS:`);
  fallos.forEach(f => console.error(' -', f.nombre, 'Esperado:', f.esperado, 'Obtenido:', f.obtenido));
  process.exit(1);
}
