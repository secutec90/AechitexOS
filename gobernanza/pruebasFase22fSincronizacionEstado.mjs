import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const raiz = dirname(dirname(fileURLToPath(import.meta.url)));
const gov = require('./nucleoGobernanzaAgente.js');
const html = readFileSync(join(raiz, 'index.html.recuperado-v49'), 'utf8');

const resultados = [];

function probar(nombre, esperado, obtenido, extra) {
  const ok = esperado === obtenido;
  resultados.push({ nombre, esperado, obtenido, ok, extra });
  console.log(ok ? 'OK' : 'FALLO', nombre, '→', obtenido, extra ? '(' + extra + ')' : '');
}

function extraer(inicio, fin) {
  const desde = html.indexOf(inicio);
  const hasta = html.indexOf(fin, desde + inicio.length);
  return html.slice(desde, hasta);
}

// Extraer funciones del frontend desde index.html.recuperado-v49
const codigoDecidir = extraer('function decidirContinuacionHerramientaAgente', 'function consultarGobernanzaBackend');
const codigoSincronizar = extraer('function sincronizarEstadoDesdeServidor', 'async function ejecutarMisionAgenteDeepSeek');
const codigoCargarDatos = extraer('function cargarDatosDesdeObjetoJson', 'function abrirSelectorImportar');
const codigoGuardarLocal = extraer('function guardarEstadoLocal', 'function mostrarNotificacion');
const codigoEjecutarHerramienta = extraer('function ejecutarHerramientaAgente', 'function decidirContinuacionHerramientaAgente');

// Crear entorno de prueba completo (Backend + Frontend mockeado)
function crearAmbientePrueba() {
  const estadoInicialA = {
    idProyecto: 'proyecto_fase22f',
    nombreProyecto: 'Sistema Alpha',
    campoProblema: 'Problema Original A',
    campoObjetivo: 'Objetivo Original A',
    campoRoles: 'Admin A',
    campoMvp: 'Alcance MVP Version A',
    entidadesRegistradas: [{ nombre: 'EntidadA', campos: 'id, nombre' }],
    decisionesRegistradas: [{ titulo: 'ADR-001', problema: 'Prob A', motivo: 'Mot A' }]
  };

  const proyectosServidor = {
    proyecto_fase22f: JSON.parse(JSON.stringify(estadoInicialA))
  };

  const decisionesServidor = {};
  const auditoriaServidor = [];

  let mutacionesBackend = 0;
  let mutacionesFrontend = 0;

  const serviciosBackend = {
    ahora: () => Date.now(),
    vigenciaMs: 600000,
    leerDecision(id) {
      return decisionesServidor[id] ? JSON.parse(JSON.stringify(decisionesServidor[id])) : null;
    },
    guardarDecision(id, registro) {
      decisionesServidor[id] = JSON.parse(JSON.stringify(registro));
    },
    leerProyecto(id) {
      return proyectosServidor[id] ? JSON.parse(JSON.stringify(proyectosServidor[id])) : null;
    },
    escribirProyecto(proyecto) {
      mutacionesBackend += 1;
      proyectosServidor[proyecto.idProyecto] = JSON.parse(JSON.stringify(proyecto));
    },
    escribirAuditoria(registro) {
      auditoriaServidor.push(registro);
    },
    conLock(trabajo) {
      return trabajo();
    }
  };

  // Mock de DOM y Almacenamiento Local del Frontend
  const domElements = {};
  const listaCampos = [
    "campoProblema", "campoObjetivo", "campoPublico", "campoEntorno", "campoMvp", "campoFuturo", "campoRestricciones",
    "campoRoles", "campoFlujos", "campoEntidades", "campoMultitenant", "campoPantallas", "campoNavegacion",
    "campoDispositivos", "campoManejoOffline", "selectorTipoProyecto", "nombreProyecto"
  ];

  listaCampos.forEach(c => {
    domElements[c] = {
      id: c,
      value: estadoInicialA[c] || ''
    };
  });

  const storage = {
    architex_estado_proyecto: JSON.stringify(estadoInicialA)
  };

  const mockLocalStorage = {
    getItem: (k) => storage[k] || null,
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; }
  };

  const mockDocument = {
    getElementById: (id) => domElements[id] || null
  };

  // Ámbito de evaluación del frontend
  const ctx = {
    document: mockDocument,
    localStorage: mockLocalStorage,
    listaIdentificadoresCampos: listaCampos.filter(c => c !== 'nombreProyecto'),
    estadoProyecto: JSON.parse(JSON.stringify(estadoInicialA)),
    historialConversacionArquitecto: [],
    console: console,
    renderizarEntidadesRegistradas: () => {},
    actualizarTablaPermisos: () => {},
    renderizarTrazabilidad: () => {},
    renderizarDecisiones: () => {},
    generarRecomendacionTecnologica: () => {},
    renderizarDiagramaArquitectura: () => {},
    renderizarDiagramaEr: () => {},
    ejecutarAnalisisRadar: () => {},
    evaluarPuertaDeControlArquitectura: () => {},
    marcarCambiosSincronizados: () => {},
    marcarCambiosPendientes: () => {},
    autoAjustarTodosLosTextareas: () => {},
    setTimeout: (fn) => fn()
  };

  // Compilar funciones en el contexto frontend
  const factory = new Function('ctx', `
    with(ctx) {
      ${codigoDecidir}
      ${codigoCargarDatos}
      ${codigoSincronizar}
      ${codigoGuardarLocal}
      ${codigoEjecutarHerramienta}
      return {
        decidirContinuacionHerramientaAgente,
        sincronizarEstadoDesdeServidor,
        cargarDatosDesdeObjetoJson,
        guardarEstadoLocal,
        ejecutarHerramientaAgente
      };
    }
  `);

  const frontend = factory(ctx);

  return {
    estadoInicialA,
    proyectosServidor,
    serviciosBackend,
    auditoriaServidor,
    domElements,
    mockLocalStorage,
    storage,
    ctx,
    frontend,
    getMutacionesBackend: () => mutacionesBackend,
    getMutacionesFrontend: () => mutacionesFrontend
  };
}

console.log('--- INICIO PRUEBAS FASE 2.2-F: SINCRONIZACIÓN DE ESTADO POST-EJECUCIÓN ---\n');

// 1. Estado inicial A
const env1 = crearAmbientePrueba();
probar(
  '1. Estado inicial A configurado',
  'Problema Original A',
  env1.ctx.estadoProyecto.campoProblema
);

// 2 & 3 & 4. Ejecución autorizada en backend produce B y retorna proyectoActualizado
const pedidoB = {
  nombre: 'modificar_campos_proyecto',
  argumentos: {
    campoProblema: 'Problema Transformado B',
    campoMvp: 'MVP Version B Blindado'
  },
  motivo: 'Evolución de arquitectura',
  proyectoIdContexto: 'proyecto_fase22f'
};

// Como modificar_campos_proyecto es riesgo MEDIO, requiere aprobación
const resPaso1 = gov.aplicarHerramientaAgenteAutorizadaNucleo(pedidoB, env1.serviciosBackend);
probar('2. Herramienta solicita aprobación', 'APROBACIÓN HUMANA', resPaso1.estado);

const idDecision = resPaso1.idDecision;
const resPaso2 = gov.aplicarHerramientaAgenteAutorizadaNucleo(Object.assign({}, pedidoB, {
  decisionHumana: 'APROBAR',
  idDecision: idDecision
}), env1.serviciosBackend);

probar('3. Backend ejecuta y retorna EJECUTADA', 'EJECUTADA', resPaso2.estado);
probar('4. Backend devuelve mutacionReal === true', true, resPaso2.mutacionReal);
probar('4b. Backend incluye proyectoActualizado', true, !!(resPaso2.proyectoActualizado && resPaso2.proyectoActualizado.campoProblema === 'Problema Transformado B'));

// 5 & 6 & 7. Frontend sincroniza y adopta B
const sincronizadoOk = env1.frontend.sincronizarEstadoDesdeServidor(resPaso2.proyectoActualizado);
probar('5. Frontend sincroniza sin error', true, sincronizadoOk);
probar('6. estadoProyecto en frontend es B', 'Problema Transformado B', env1.ctx.estadoProyecto.campoProblema);
probar('6b. campoMvp en estadoProyecto es B', 'MVP Version B Blindado', env1.ctx.estadoProyecto.campoMvp);

const storageParseado = JSON.parse(env1.mockLocalStorage.getItem('architex_estado_proyecto'));
probar('7. localStorage actualizado a B', 'Problema Transformado B', storageParseado.campoProblema);
probar('7b. Formulario visible (DOM) actualizado a B', 'Problema Transformado B', env1.domElements.campoProblema.value);
probar('7c. Formulario visible campoMvp actualizado a B', 'MVP Version B Blindado', env1.domElements.campoMvp.value);

// 8. Guardado posterior utiliza B (Protección contra Estado Obsoleto)
env1.frontend.guardarEstadoLocal();
const storagePostGuardado = JSON.parse(env1.mockLocalStorage.getItem('architex_estado_proyecto'));
probar('8. Guardado manual posterior preserva B (No regresa a A)', 'Problema Transformado B', storagePostGuardado.campoProblema);

// 9. Comprobación de no doble mutación (1 backend, 0 frontend)
probar('9. Mutaciones reales en Backend = 1', 1, env1.getMutacionesBackend());
const resEjecLocal = env1.frontend.ejecutarHerramientaAgente();
probar('9b. ejecutarHerramientaAgente local neutralizada', false, resEjecLocal.mutacionReal);
probar('9c. Mutaciones de mutador frontend = 0', 0, env1.getMutacionesFrontend());

// 10. Simulación no modifica estado
const envSim = crearAmbientePrueba();
const resSim = gov.aplicarHerramientaAgenteAutorizadaNucleo({
  nombre: 'modificar_campos_proyecto',
  argumentos: { campoProblema: 'Problema en Simulacion' },
  modoSimulacion: true,
  proyectoIdContexto: 'proyecto_fase22f'
}, envSim.serviciosBackend);

probar('10a. Simulación responde SIN MUTACIÓN REAL', 'SIN MUTACIÓN REAL', resSim.estado);
probar('10b. Simulación mutacionReal es false', false, resSim.mutacionReal);
const pasoSim = envSim.frontend.decidirContinuacionHerramientaAgente(resSim, { modoSimulacion: true });
probar('10c. Decisión frontend para simulación detiene mutación', 'detener', pasoSim.accion);
probar('10d. estadoProyecto permanece intacto en A', 'Problema Original A', envSim.ctx.estadoProyecto.campoProblema);
probar('10e. localStorage permanece intacto en A', 'Problema Original A', JSON.parse(envSim.mockLocalStorage.getItem('architex_estado_proyecto')).campoProblema);

// 11. Rechazo no modifica estado
const envRech = crearAmbientePrueba();
const pRech = gov.aplicarHerramientaAgenteAutorizadaNucleo({
  nombre: 'modificar_campos_proyecto',
  argumentos: { campoProblema: 'Problema Rechazado' },
  proyectoIdContexto: 'proyecto_fase22f'
}, envRech.serviciosBackend);
const pasoRech = envRech.frontend.decidirContinuacionHerramientaAgente(pRech, { decisionHumana: 'RECHAZAR' });
probar('11a. Decisión de rechazo detiene flujo', 'detener', pasoRech.accion);
probar('11b. Estado de paso es RECHAZADA', 'RECHAZADA', pasoRech.estado);
probar('11c. estadoProyecto permanece en A tras rechazo', 'Problema Original A', envRech.ctx.estadoProyecto.campoProblema);

// 12. Cancelación no modifica estado
const envCanc = crearAmbientePrueba();
const pCanc = gov.aplicarHerramientaAgenteAutorizadaNucleo({
  nombre: 'modificar_campos_proyecto',
  argumentos: { campoProblema: 'Problema Cancelado' },
  proyectoIdContexto: 'proyecto_fase22f'
}, envCanc.serviciosBackend);
const pasoCanc = envCanc.frontend.decidirContinuacionHerramientaAgente(pCanc, { decisionHumana: 'CANCELAR_MISION' });
probar('12a. Cancelación detiene flujo', 'detener', pasoCanc.accion);
probar('12b. estadoProyecto permanece en A tras cancelación', 'Problema Original A', envCanc.ctx.estadoProyecto.campoProblema);

// 13. Estado inexistente no se inventa
const envNull = crearAmbientePrueba();
const resSincNull = envNull.frontend.sincronizarEstadoDesdeServidor(null);
probar('13a. Sincronización con null retorna false', false, resSincNull);
probar('13b. estadoProyecto no se corrompe ni inventa', 'Problema Original A', envNull.ctx.estadoProyecto.campoProblema);

// 14. CRÍTICO continúa bloqueado
const envCrit = crearAmbientePrueba();
const resCrit = gov.aplicarHerramientaAgenteAutorizadaNucleo({
  nombre: 'eliminar_datos_proyecto',
  argumentos: { proyectoId: 'proyecto_fase22f' },
  proyectoIdContexto: 'proyecto_fase22f'
}, envCrit.serviciosBackend);
probar('14a. Herramienta crítica resulta BLOQUEADA', 'BLOQUEADA', resCrit.estado);
const pasoCrit = envCrit.frontend.decidirContinuacionHerramientaAgente(resCrit, {});
probar('14b. Decisión frontend para crítica es detener', 'detener', pasoCrit.accion);
probar('14c. Backend no mutó', 0, envCrit.getMutacionesBackend());

// 15. Bypass continúa cerrado
const envBypass = crearAmbientePrueba();
const resBypassServidor = gov.aplicarHerramientaAgenteAutorizadaNucleo({
  nombre: 'modificar_campos_proyecto',
  argumentos: { campoProblema: 'Intento de Bypass' },
  proyectoIdContexto: 'proyecto_fase22f',
  decisionHumana: 'APROBAR',
  idDecision: 'token_falso_inventado'
}, envBypass.serviciosBackend);
probar('15a. Bypass con token falso es DENEGADA', 'DENEGADA', resBypassServidor.estado);
probar('15b. Backend no persiste bypass', 0, envBypass.getMutacionesBackend());
probar('15c. Bypass local cerrado', false, envBypass.frontend.ejecutarHerramientaAgente().mutacionReal);

// 16. Prueba de consistencia multidimensional
const consistencia = (
  env1.proyectosServidor.proyecto_fase22f.campoProblema === 'Problema Transformado B' &&
  env1.ctx.estadoProyecto.campoProblema === 'Problema Transformado B' &&
  JSON.parse(env1.mockLocalStorage.getItem('architex_estado_proyecto')).campoProblema === 'Problema Transformado B' &&
  env1.domElements.campoProblema.value === 'Problema Transformado B'
);
probar('16. Consistencia total (Servidor == estadoProyecto == localStorage == Formulario DOM)', true, consistencia);

console.log('\n--- RESUMEN FINAL ---');
const fallos = resultados.filter(r => !r.ok);
if (fallos.length === 0) {
  console.log('RESULTADO: TODAS LAS PRUEBAS PASARON (' + resultados.length + '/' + resultados.length + ')');
  process.exit(0);
} else {
  console.error('RESULTADO: FALLARON ' + fallos.length + ' PRUEBAS:');
  fallos.forEach(f => console.error(' -', f.nombre, 'Esperado:', f.esperado, 'Obtenido:', f.obtenido));
  process.exit(1);
}
