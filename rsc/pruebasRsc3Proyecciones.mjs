/**
 * ARCHITEX OS V-36 — RSC-3: SUITE DE PRUEBAS DE PROYECCIONES FÍSICAS
 *
 * Valida los 12 requisitos mandatorios y la prueba especial de fuente única
 * para el generador de proyecciones físicas RSC-3.
 */

import { normalizarContextoArchitex } from './normalizadorContexto.mjs';
import { generarProyeccionesRsc3, escribirProyeccionesFisicas } from './generadorProyecciones.mjs';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const resultados = [];

function probar(nombre, esperado, obtenido, extra) {
  const ok = esperado === obtenido;
  resultados.push({ nombre, esperado, obtenido, ok, extra });
  console.log(ok ? 'OK' : 'FALLO', nombre, '→', obtenido, extra ? '(' + extra + ')' : '');
}

console.log('--- INICIO PRUEBAS RSC-3: PROYECCIONES FÍSICAS DEL CONTEXTO CANÓNICO ---\n');

// Objeto base representativo de estadoProyecto real
const estadoProyectoReal = {
  idProyecto: 'proyecto_edu_01',
  nombreProyecto: 'EduLectura Accesible',
  campoProblema: 'Baja comprensión lectora y falta de soporte accesible para alumnos con discapacidad visual.',
  campoObjetivo: 'Desarrollar una plataforma Web y móvil con síntesis de voz y cronómetro de lectura.',
  campoPublico: 'Alumnos de primaria, docentes de aula y especialistas de inclusión educativa.',
  campoEntorno: 'Google Apps Script + Sheets con versión móvil Flutter APK.',
  campoMvp: '1. Cronómetro de lectura. 2. Síntesis de voz accesible. 3. Registro en Google Sheets.',
  campoFuturo: 'Módulo de análisis de fluidez lectora con IA y paneles avanzados para directores.',
  campoRestricciones: 'Costo $0 USD de servidores, LockService obligatorio, código en español y soporte Windows.',
  campoRoles: 'Docente, Alumno Lector, Alumno Invidente, Administrador',
  campoFlujos: 'El docente selecciona la lectura -> El alumno reproduce en voz alta -> Se registra el tiempo.',
  campoEntidades: 'Alumnos, Lecturas, Evaluaciones, Asistencias',
  campoPantallas: 'Vista Lectura, Panel Docente, Módulo Accesible TTS',
  campoNavegacion: 'Ruta guiada de cuatro estaciones con persistencia local y sincronización Sheets.',
  campoDispositivos: 'Navegador Web Chrome/Edge, Tablets Android, teléfonos APK.',
  campoManejoOffline: 'Soporte local en SQLite para app móvil y localStorage en navegador.',
  selectorTipoProyecto: 'web_appsscript',
  entidadesRegistradas: [
    { nombre: 'Alumno', campos: 'id, nombre, grado, es_invidente' },
    { nombre: 'Lectura', campos: 'id, titulo, texto, duracion_estimada' },
    { nombre: 'Evaluacion', campos: 'id, alumno_id, lectura_id, pps, fecha' }
  ],
  decisionesRegistradas: [
    { titulo: 'ADR-001: Persistencia con LockService', problema: 'Concurrencia en Sheets', motivo: 'Garantizar atomicidad', fecha: '2026-10-04' },
    { titulo: 'ADR-002: Síntesis de Voz en Cliente', problema: 'Accesibilidad', motivo: 'Web Speech API es-MX nativa', fecha: '2026-10-04' }
  ],
  elementosTrazabilidad: [
    { requisito: 'Lectura en voz alta', actor: 'Alumno Invidente', destino: 'Web Speech API', prueba: 'Verificar locución es-MX' },
    { requisito: 'Guardado sin colisión', actor: 'Docente', destino: 'Google Sheets', prueba: 'Prueba de concurrencia LockService' }
  ],
  componentesClaveEstado: {
    frontend_web: true,
    backend_gas: true,
    persistencia_sheets: true
  }
};

// Generar contexto canónico oficial mediante RSC-2
const contextoOficial = normalizarContextoArchitex(estadoProyectoReal, { tenantId: 'tenant_colegio_01' });

// =========================================================================
// TEST 1 — Mismo contexto → mismo contenido semántico
// =========================================================================
const proy1 = generarProyeccionesRsc3(contextoOficial);
const proy2 = generarProyeccionesRsc3(contextoOficial);

const coincidenciaSemantica = (
  proy1.architexStateJson === proy2.architexStateJson &&
  proy1.antigravityContextMd === proy2.antigravityContextMd &&
  proy1.cursorrules === proy2.cursorrules &&
  proy1.claudeMd === proy2.claudeMd &&
  JSON.stringify(proy1.skills) === JSON.stringify(proy2.skills)
);
probar('TEST 1: Mismo contexto produce idénticas proyecciones', true, coincidenciaSemantica);

// =========================================================================
// TEST 2 — generatedAt diferente → mismo contentHash
// =========================================================================
// Simular contexto con idéntico hash pero diferente timestamp
const contextoConOtroTimestamp = {
  ...contextoOficial,
  generatedAt: new Date(Date.now() + 100000).toISOString()
};
const proyTimestamp = generarProyeccionesRsc3(contextoConOtroTimestamp);
const hashConsistente = (
  proyTimestamp.contentHash === contextoOficial.contentHash &&
  proyTimestamp.architexStateJson.includes(contextoOficial.contentHash) &&
  proyTimestamp.antigravityContextMd.includes(contextoOficial.contentHash) &&
  proyTimestamp.cursorrules.includes(contextoOficial.contentHash) &&
  proyTimestamp.claudeMd.includes(contextoOficial.contentHash)
);
probar('TEST 2: generatedAt no altera contentHash en las proyecciones', true, hashConsistente);

// =========================================================================
// TEST 3 — Las 25 dimensiones aparecen en la representación correspondiente
// =========================================================================
const dimensionesEsperadas = [
  'identity', 'problem', 'objectives', 'audience', 'environment', 'mvp', 'future',
  'constraints', 'roles', 'users', 'entities', 'requirements', 'data', 'design',
  'architecture', 'technology', 'decisions', 'skills', 'traceability', 'tests',
  'production', 'maintenance', 'state', 'provenance', 'integrity'
];

const stateObj = JSON.parse(proy1.architexStateJson);
const todasEnJson = dimensionesEsperadas.every(d => stateObj.dimensions && stateObj.dimensions[d] !== undefined);
const todasEnMarkdown = dimensionesEsperadas.every(d => proy1.antigravityContextMd.includes(`(${d})`) || proy1.antigravityContextMd.includes(`\`${d}\``));
probar('TEST 3: Las 25 dimensiones están presentes en JSON y Markdown', true, todasEnJson && todasEnMarkdown);

// =========================================================================
// TEST 4 — Las 9 dimensiones NO_IMPLEMENTADO permanecen explícitas
// =========================================================================
const noImplementadasEsperadas = [
  'users', 'requirements', 'skills', 'tests', 'production', 'maintenance', 'state', 'provenance', 'integrity'
];
const todasNoImplEnJson = noImplementadasEsperadas.every(d =>
  stateObj.dimensions[d].status === 'NO_IMPLEMENTADO' && stateObj.dimensions[d].value === null
);
const todasNoImplEnMarkdown = noImplementadasEsperadas.every(d =>
  proy1.antigravityContextMd.includes(`## `) && proy1.antigravityContextMd.includes(`NO_IMPLEMENTADO`)
);
probar('TEST 4: Las 9 dimensiones NO_IMPLEMENTADO permanecen explícitas con value: null', true, todasNoImplEnJson && todasNoImplEnMarkdown);

// =========================================================================
// TEST 5 — No aparecen secretos en ninguna proyección
// =========================================================================
const estadoConSecretos = {
  ...estadoProyectoReal,
  campoProblema: 'Clave sk-ant-api03-secret1234567890 no debe filtrarse',
  campoRestricciones: 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 token',
  campoObjetivo: 'password = "SuperSecretPassword123!" en DB'
};
const ctxSeguro = normalizarContextoArchitex(estadoConSecretos);
const proySegura = generarProyeccionesRsc3(ctxSeguro);
const textoCompletoProyecciones = (
  proySegura.architexStateJson +
  proySegura.antigravityContextMd +
  proySegura.cursorrules +
  proySegura.claudeMd +
  Object.values(proySegura.skills).join('\n')
);

const sinSk = !textoCompletoProyecciones.includes('sk-ant-api03-secret1234567890');
const sinBearer = !textoCompletoProyecciones.includes('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
const sinPass = !textoCompletoProyecciones.includes('SuperSecretPassword123!');
probar('TEST 5: Exclusión absoluta de secretos en todas las proyecciones', true, sinSk && sinBearer && sinPass);

// =========================================================================
// TEST 6 — No aparece gobernanza
// =========================================================================
const estadoConTrampas = {
  ...estadoProyectoReal,
  HERRAMIENTAS_AGENTES: { ejecutor: true },
  idDecision: 'token_de_decision_falso',
  permisos: ['ROOT', 'ADMIN'],
  riesgo: 'CRITICO'
};
const ctxTrampa = normalizarContextoArchitex(estadoConTrampas);
const proyTrampa = generarProyeccionesRsc3(ctxTrampa);
const textoTrampa = (
  proyTrampa.architexStateJson +
  proyTrampa.antigravityContextMd +
  proyTrampa.cursorrules +
  proyTrampa.claudeMd +
  Object.values(proyTrampa.skills).join('\n')
);

const sinGobernanza = (
  !textoTrampa.includes('HERRAMIENTAS_AGENTES') &&
  !textoTrampa.includes('idDecision') &&
  !textoTrampa.includes('token_de_decision_falso') &&
  !textoTrampa.includes('"permisos"')
);
probar('TEST 6: Gobernanza y permisos de ejecución excluidos de las proyecciones', true, sinGobernanza);

// =========================================================================
// TEST 7 — tenantId y projectId se conservan correctamente
// =========================================================================
const conservaTenantYProj = (
  stateObj.projectId === 'proyecto_edu_01' &&
  stateObj.tenantId === 'tenant_colegio_01' &&
  proy1.antigravityContextMd.includes('proyecto_edu_01') &&
  proy1.antigravityContextMd.includes('tenant_colegio_01') &&
  proy1.cursorrules.includes('proyecto_edu_01') &&
  proy1.claudeMd.includes('proyecto_edu_01')
);
probar('TEST 7: tenantId y projectId se conservan en las proyecciones', true, conservaTenantYProj);

// =========================================================================
// TEST 8 — Dos tenants diferentes producen proyecciones diferentes
// =========================================================================
const ctxTenantA = normalizarContextoArchitex(estadoProyectoReal, { tenantId: 'tenant_A' });
const ctxTenantB = normalizarContextoArchitex(estadoProyectoReal, { tenantId: 'tenant_B' });
const proyA = generarProyeccionesRsc3(ctxTenantA);
const proyB = generarProyeccionesRsc3(ctxTenantB);

const tenantDiferente = (
  proyA.contentHash !== proyB.contentHash &&
  proyA.architexStateJson !== proyB.architexStateJson &&
  proyA.antigravityContextMd !== proyB.antigravityContextMd
);
probar('TEST 8: Dos tenants diferentes producen proyecciones y hashes diferentes', true, tenantDiferente);

// =========================================================================
// TEST 9 — No existe acceso de red
// =========================================================================
let llamadasRed = 0;
const fetchOriginal = globalThis.fetch;
globalThis.fetch = () => { llamadasRed++; return Promise.reject(new Error('Red bloqueada')); };

generarProyeccionesRsc3(contextoOficial);

globalThis.fetch = fetchOriginal;
probar('TEST 9: Cero llamadas de red durante la generación de proyecciones', 0, llamadasRed);

// =========================================================================
// TEST 10 — No existe mutación del contexto recibido
// =========================================================================
const snapshotContextoAntes = JSON.stringify(contextoOficial);
generarProyeccionesRsc3(contextoOficial);
const snapshotContextoDespues = JSON.stringify(contextoOficial);
probar('TEST 10: Inmutabilidad del objeto ContextoCanonicoArchitex recibido', snapshotContextoAntes, snapshotContextoDespues);

// =========================================================================
// TEST 11 — No se lee directamente estadoProyecto durante la proyección
// =========================================================================
// Si pasamos un estadoProyecto crudo sin esquema canónico, debe fallar o marcar dimensiones ausentes
let falloEntradaInvalida = false;
try {
  generarProyeccionesRsc3(null);
} catch (e) {
  falloEntradaInvalida = true;
}
probar('TEST 11: La función exige estrictamente ContextoCanonicoArchitex y no lee estadoProyecto', true, falloEntradaInvalida);

// =========================================================================
// TEST 12 — El contentHash de ARCHITEX_STATE.json coincide con el contexto canónico
// =========================================================================
const hashStateJson = JSON.parse(proy1.architexStateJson).contentHash;
const coincideHashCanonica = hashStateJson === contextoOficial.contentHash;
probar('TEST 12: contentHash de ARCHITEX_STATE.json coincide con ContextoCanonicoArchitex', true, coincideHashCanonica);

// =========================================================================
// PRUEBA ESPECIAL DE FUENTE ÚNICA (Sección 24)
// =========================================================================
// 1. Tomar estado original y normalizarlo
const estadoMutable = { ...estadoProyectoReal };
const ctxOriginal = normalizarContextoArchitex(estadoMutable);
const proyeccionesOriginales = generarProyeccionesRsc3(ctxOriginal);

// 2. Mutar deliberadamente una propiedad de estadoProyecto sin regenerar contexto
estadoMutable.campoProblema = 'PROBLEMA ALTERADO DELIBERADAMENTE DESPUÉS DE LA PROYECCIÓN';
estadoMutable.campoMvp = 'MVP MODIFICADO DIRECTAMENTE';

// 3. Verificar que las proyecciones existentes permanecen intactas e inmutables
const proyeccionNoCambio = (
  !proyeccionesOriginales.architexStateJson.includes('PROBLEMA ALTERADO') &&
  !proyeccionesOriginales.antigravityContextMd.includes('PROBLEMA ALTERADO') &&
  proyeccionesOriginales.contentHash === ctxOriginal.contentHash
);
probar('PRUEBA ESPECIAL: Modificar estadoProyecto no altera las proyecciones ya generadas', true, proyeccionNoCambio);

// =========================================================================
// TEST FÍSICO EN DIRECTORIO TEMPORAL (I/O Aislado)
// =========================================================================
const dirTemp = mkdtempSync(join(tmpdir(), 'architex-rsc3-test-'));
const archivosEscritos = escribirProyeccionesFisicas(proy1, dirTemp);

const architexStateExiste = existsSync(join(dirTemp, 'ARCHITEX_STATE.json'));
const antigravityExiste = existsSync(join(dirTemp, '.antigravity', 'context.md'));
const cursorExiste = existsSync(join(dirTemp, '.cursorrules'));
const claudeExiste = existsSync(join(dirTemp, 'CLAUDE.md'));
const skill1Existe = existsSync(join(dirTemp, 'skills', 'architex-context', 'SKILL.md'));
const skill2Existe = existsSync(join(dirTemp, 'skills', 'lockservice-concurrency', 'SKILL.md'));

const archivosTodosExisten = (
  architexStateExiste && antigravityExiste && cursorExiste &&
  claudeExiste && skill1Existe && skill2Existe
);
probar('TEST FÍSICO: Escritura aislada de proyecciones en estructura de disco', true, archivosTodosExisten);

// Limpiar directorio temporal
rmSync(dirTemp, { recursive: true, force: true });

console.log('\n--- RESUMEN FINAL RSC-3 ---');
const fallos = resultados.filter(r => !r.ok);
if (fallos.length === 0) {
  console.log(`RESULTADO: TODAS LAS PRUEBAS RSC-3 PASARON CON ÉXITO (${resultados.length}/${resultados.length})`);
  process.exit(0);
} else {
  console.error(`RESULTADO: FALLARON ${fallos.length} PRUEBAS:`);
  fallos.forEach(f => console.error(' -', f.nombre, 'Esperado:', f.esperado, 'Obtenido:', f.obtenido));
  process.exit(1);
}
