import { normalizarContextoArchitex, sanitizarTexto } from './normalizadorContexto.mjs';

const resultados = [];

function probar(nombre, esperado, obtenido, extra) {
  const ok = esperado === obtenido;
  resultados.push({ nombre, esperado, obtenido, ok, extra });
  console.log(ok ? 'OK' : 'FALLO', nombre, '→', obtenido, extra ? '(' + extra + ')' : '');
}

console.log('--- INICIO PRUEBAS RSC-2: NORMALIZADOR DE CONTEXTO CANÓNICO ---\n');

// Objeto representativo de estadoProyecto real
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

// =========================================================================
// TEST 1 — No mutación
// =========================================================================
const snapshotAntes = JSON.stringify(estadoProyectoReal);
const contexto1 = normalizarContextoArchitex(estadoProyectoReal);
const snapshotDespues = JSON.stringify(estadoProyectoReal);
probar('TEST 1: No mutación de la entrada', snapshotAntes, snapshotDespues);

// =========================================================================
// TEST 2 — Determinismo (contentHash idéntico independiente de generatedAt)
// =========================================================================
const ctxA = normalizarContextoArchitex(estadoProyectoReal);
// Pequeña pausa para asegurar timestamp diferente
await new Promise(r => setTimeout(r, 25));
const ctxB = normalizarContextoArchitex(estadoProyectoReal);

const hashIgual = ctxA.contentHash === ctxB.contentHash;
const timestampDiferente = ctxA.generatedAt !== ctxB.generatedAt;
probar('TEST 2a: contentHash determinista', true, hashIgual);
probar('TEST 2b: generatedAt independiente del contentHash', true, timestampDiferente);

// =========================================================================
// TEST 3 — Estado vacío ({})
// =========================================================================
let errorVacio = false;
let ctxVacio = null;
try {
  ctxVacio = normalizarContextoArchitex({});
} catch (e) {
  errorVacio = true;
}
probar('TEST 3a: Estado vacío no lanza excepciones', false, errorVacio);

const dimensionesVacias = [
  'identity', 'problem', 'objectives', 'audience', 'environment', 'mvp', 'future',
  'constraints', 'roles', 'users', 'entities', 'requirements', 'data', 'design',
  'architecture', 'technology', 'decisions', 'skills', 'traceability', 'tests',
  'production', 'maintenance', 'state', 'provenance', 'integrity'
];
const todasNoImplementadas = dimensionesVacias.every(d => ctxVacio && ctxVacio[d] && ctxVacio[d].status === 'NO_IMPLEMENTADO' && ctxVacio[d].value === null);
probar('TEST 3b: Estado vacío marca 25 dimensiones como NO_IMPLEMENTADO', true, todasNoImplementadas);

// =========================================================================
// TEST 4 — No invención
// =========================================================================
const estadoMinimo = { nombreProyecto: 'Prueba Minimal' };
const ctxMinimo = normalizarContextoArchitex(estadoMinimo);

probar('TEST 4a: users es NO_IMPLEMENTADO', 'NO_IMPLEMENTADO', ctxMinimo.users.status);
probar('TEST 4b: users.value es null', null, ctxMinimo.users.value);
probar('TEST 4c: requirements es NO_IMPLEMENTADO', 'NO_IMPLEMENTADO', ctxMinimo.requirements.status);
probar('TEST 4d: tests es NO_IMPLEMENTADO', 'NO_IMPLEMENTADO', ctxMinimo.tests.status);
probar('TEST 4e: production es NO_IMPLEMENTADO', 'NO_IMPLEMENTADO', ctxMinimo.production.status);
probar('TEST 4f: skills es NO_IMPLEMENTADO', 'NO_IMPLEMENTADO', ctxMinimo.skills.status);

// =========================================================================
// TEST 5 — Propiedades desconocidas
// =========================================================================
const estadoConBasura = {
  nombreProyecto: 'Proyecto Filtrado',
  campoInventadoXYZ: 'valor_infiltrado_123',
  parametroInexistente: true,
  hackTemporal: { subcampo: 999 }
};
const ctxFiltrado = normalizarContextoArchitex(estadoConBasura);
const jsonFiltrado = JSON.stringify(ctxFiltrado);
const ignoraDesconocidas = !jsonFiltrado.includes('campoInventadoXYZ') &&
                           !jsonFiltrado.includes('valor_infiltrado_123') &&
                           !jsonFiltrado.includes('parametroInexistente') &&
                           !jsonFiltrado.includes('hackTemporal');
probar('TEST 5: Propiedades desconocidas excluidas del contexto', true, ignoraDesconocidas);

// =========================================================================
// TEST 6 — Seguridad (Exclusión / Saneamiento de Secretos)
// =========================================================================
const estadoConSecretos = {
  nombreProyecto: 'Proyecto con Fuga',
  campoProblema: 'Usa la clave sk-ant-api03-secretkey1234567890 para conectar.',
  campoRestricciones: 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 token secreto.',
  campoObjetivo: 'password = "SuperPassword123!" en la base de datos.'
};
const ctxSeguro = normalizarContextoArchitex(estadoConSecretos);
const jsonSeguro = JSON.stringify(ctxSeguro);
const sinSk = !jsonSeguro.includes('sk-ant-api03-secretkey1234567890');
const sinBearer = !jsonSeguro.includes('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
const sinPass = !jsonSeguro.includes('SuperPassword123!');
const tieneRedaccion = jsonSeguro.includes('[REDACTADO_POR_SEGURIDAD]');

probar('TEST 6a: Claves API sk-* redactadas', true, sinSk);
probar('TEST 6b: Tokens Bearer redactados', true, sinBearer);
probar('TEST 6c: Contraseñas en texto plano redactadas', true, sinPass);
probar('TEST 6d: Sustituido por [REDACTADO_POR_SEGURIDAD]', true, tieneRedaccion);

// =========================================================================
// TEST 7 — DeepSeek / Sin llamadas de red
// =========================================================================
let llamadasRed = 0;
const fetchOriginal = globalThis.fetch;
globalThis.fetch = () => { llamadasRed++; return Promise.reject(new Error('Fetch bloqueado')); };

normalizarContextoArchitex(estadoProyectoReal);

globalThis.fetch = fetchOriginal;
probar('TEST 7: Sin llamadas de red ni dependencias externas', 0, llamadasRed);

// =========================================================================
// TEST 8 — Gobernanza Excluida
// =========================================================================
const estadoConIntentoGobernanza = {
  nombreProyecto: 'Proyecto Trap',
  HERRAMIENTAS_AGENTES: { peligro: true },
  idDecision: 'token_falso',
  permisos: ['ROOT', 'ADMIN'],
  riesgo: 'CRITICO'
};
const ctxTrap = normalizarContextoArchitex(estadoConIntentoGobernanza);
const jsonTrap = JSON.stringify(ctxTrap);
const sinGobernanza = !jsonTrap.includes('HERRAMIENTAS_AGENTES') &&
                      !jsonTrap.includes('idDecision') &&
                      !jsonTrap.includes('token_falso') &&
                      !jsonTrap.includes('"permisos":');
probar('TEST 8: Gobernanza excluida del contexto canónico', true, sinGobernanza);

// =========================================================================
// TEST 9 — Validación Estructural y Schema
// =========================================================================
const ctxCompleto = normalizarContextoArchitex(estadoProyectoReal);

const tieneVersiones = ctxCompleto.schemaVersion === '1.0.0' &&
                       ctxCompleto.projectVersion === 'V-36' &&
                       typeof ctxCompleto.contextVersion === 'string' &&
                       typeof ctxCompleto.generatedAt === 'string';

const tieneMetas = ctxCompleto.projectId === 'proyecto_edu_01' &&
                   ctxCompleto.source === 'ARCHITEX_OS_V36' &&
                   /^[a-f0-9]{64}$/.test(ctxCompleto.contentHash);

const total25 = dimensionesVacias.every(d => ctxCompleto[d] !== undefined);
const implementadasConValor = ctxCompleto.identity.status === 'IMPLEMENTADO' &&
                              ctxCompleto.problem.status === 'IMPLEMENTADO' &&
                              ctxCompleto.decisions.status === 'IMPLEMENTADO' &&
                              ctxCompleto.entities.status === 'IMPLEMENTADO' &&
                              ctxCompleto.traceability.status === 'IMPLEMENTADO';

probar('TEST 9a: Versiones y encabezados presentes', true, tieneVersiones);
probar('TEST 9b: Metadatos y hash SHA-256 válido', true, tieneMetas);
probar('TEST 9c: 25 dimensiones presentes en la salida', true, total25);
probar('TEST 9d: Dimensiones reales mapeadas como IMPLEMENTADO', true, implementadasConValor);

// =========================================================================
// TEST F3 — Extracción condicional de ciclo/linaje/procedencia
// =========================================================================
const estadoSinF3 = {
  idProyecto: 'proy_f3_sin',
  nombreProyecto: 'Sin F3'
};
const ctxSinF3 = normalizarContextoArchitex(estadoSinF3);
probar('TEST F3-1a: sin estadoCicloVida → state NO_IMPLEMENTADO', 'NO_IMPLEMENTADO', ctxSinF3.state.status);
probar('TEST F3-1b: sin registroProcedencia → provenance NO_IMPLEMENTADO', 'NO_IMPLEMENTADO', ctxSinF3.provenance.status);
probar('TEST F3-1c: sin linajeCausal → integrity NO_IMPLEMENTADO', 'NO_IMPLEMENTADO', ctxSinF3.integrity.status);

const estadoF3C0 = {
  idProyecto: 'proy_f3_c0',
  nombreProyecto: 'Génesis F3',
  estadoCicloVida: { lifecycle: 'CANONICAL' },
  registroProcedencia: {
    sourceType: 'SYSTEM_GENESIS',
    author: 'ARQUITECTO_HUMANO',
    triggerDecisionId: 'ADR-000-BASE-V36',
    timestamp: '2026-10-04T00:00:00.000Z'
  },
  linajeCausal: { parentContentHash: null, lineageDepth: 0 }
};
const snapF3Antes = JSON.stringify(estadoF3C0);
const ctxF3A = normalizarContextoArchitex(estadoF3C0, { contextVersion: '1.0.0' });
await new Promise(r => setTimeout(r, 20));
const ctxF3B = normalizarContextoArchitex(estadoF3C0, { contextVersion: '1.0.0' });
const snapF3Despues = JSON.stringify(estadoF3C0);

probar('TEST F3-2a: lifecycle CANONICAL → state IMPLEMENTADO', 'IMPLEMENTADO', ctxF3A.state.status);
probar('TEST F3-2b: lifecycle valor', 'CANONICAL', ctxF3A.state.value.lifecycle);
probar('TEST F3-2c: provenance SYSTEM_GENESIS', 'SYSTEM_GENESIS', ctxF3A.provenance.value.sourceType);
probar('TEST F3-2d: timestamp estático de origen', '2026-10-04T00:00:00.000Z', ctxF3A.provenance.value.timestamp);
probar('TEST F3-2e: parentContentHash null en génesis', null, ctxF3A.integrity.value.parentContentHash);
probar('TEST F3-2f: lineageDepth 0', 0, ctxF3A.integrity.value.lineageDepth);
probar('TEST F3-2g: no mutación de estadoProyecto F3', snapF3Antes, snapF3Despues);
probar('TEST F3-2h: hash determinista con F3 activo', true, ctxF3A.contentHash === ctxF3B.contentHash);
probar('TEST F3-2i: hash F3 distinto al contexto sin F3', true, ctxF3A.contentHash !== ctxSinF3.contentHash);

const estadoF3Invalido = {
  idProyecto: 'proy_f3_bad',
  nombreProyecto: 'F3 inválido',
  estadoCicloVida: { lifecycle: 'ACTIVO' },
  registroProcedencia: {
    sourceType: 'SYSTEM_GENESIS',
    author: 'X',
    triggerDecisionId: 'ADR-X',
    timestamp: 'ahora'
  },
  linajeCausal: { parentContentHash: null, lineageDepth: 3 }
};
const ctxF3Bad = normalizarContextoArchitex(estadoF3Invalido);
probar('TEST F3-3a: lifecycle fuera de catálogo → NO_IMPLEMENTADO', 'NO_IMPLEMENTADO', ctxF3Bad.state.status);
probar('TEST F3-3b: timestamp inválido → provenance NO_IMPLEMENTADO', 'NO_IMPLEMENTADO', ctxF3Bad.provenance.status);
probar('TEST F3-3c: depth inconsistente con parent null → integrity NO_IMPLEMENTADO', 'NO_IMPLEMENTADO', ctxF3Bad.integrity.status);

console.log('\n--- RESUMEN FINAL RSC-2 ---');
const fallos = resultados.filter(r => !r.ok);
if (fallos.length === 0) {
  console.log('RESULTADO: TODAS LAS PRUEBAS RSC-2 PASARON CON ÉXITO (' + resultados.length + '/' + resultados.length + ')');
  process.exit(0);
} else {
  console.error('RESULTADO: FALLARON ' + fallos.length + ' PRUEBAS:');
  fallos.forEach(f => console.error(' -', f.nombre, 'Esperado:', f.esperado, 'Obtenido:', f.obtenido));
  process.exit(1);
}
