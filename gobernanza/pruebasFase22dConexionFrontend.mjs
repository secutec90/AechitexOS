import { createRequire } from 'module';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';

const require = createRequire(import.meta.url);
const raiz = dirname(dirname(fileURLToPath(import.meta.url)));
const gov = require('./nucleoGobernanzaAgente.js');
const html = readFileSync(join(raiz, 'index.html.recuperado-v49'), 'utf8');
const vivo = readFileSync(join(raiz, 'index.html'));
const resultados = [];

function probar(nombre, esperado, obtenido) {
  const ok = esperado === obtenido;
  resultados.push({ nombre, esperado, obtenido, ok });
  console.log(ok ? 'OK' : 'FALLO', nombre, '→', obtenido);
}

function extraer(inicio, fin) {
  const desde = html.indexOf(inicio);
  const hasta = html.indexOf(fin, desde + inicio.length);
  return html.slice(desde, hasta);
}

const decidir = new Function(
  'decision',
  'opciones',
  extraer('function decidirContinuacionHerramientaAgente', 'function consultarGobernanzaBackend')
    + '\nreturn decidirContinuacionHerramientaAgente(decision, opciones);'
);

function crearEntorno() {
  const proyectos = {
    proyecto_A: { idProyecto: 'proyecto_A', nombreProyecto: 'Aula', campoProblema: 'original A' },
    proyecto_B: { idProyecto: 'proyecto_B', nombreProyecto: 'B', campoProblema: 'original B' }
  };
  const decisiones = {};
  const auditoria = [];
  const local = { campoProblema: 'original A', escrituras: 0 };
  const servicios = {
    ahora: () => Date.now(),
    vigenciaMs: 600000,
    leerDecision(id) { return decisiones[id] ? JSON.parse(JSON.stringify(decisiones[id])) : null; },
    guardarDecision(id, registro) { decisiones[id] = JSON.parse(JSON.stringify(registro)); },
    leerProyecto(id) { return proyectos[id] ? JSON.parse(JSON.stringify(proyectos[id])) : null; },
    escribirProyecto(proyecto) { proyectos[proyecto.idProyecto] = JSON.parse(JSON.stringify(proyecto)); },
    escribirAuditoria(registro) { auditoria.push(registro); },
    conLock(trabajo) { return trabajo(); }
  };
  return { proyectos, auditoria, local, servicios };
}

function correr(entorno, pedido, humana) {
  const antes = JSON.stringify(entorno.local);
  let decision = gov.aplicarHerramientaAgenteAutorizadaNucleo(pedido, entorno.servicios);
  let paso = decidir(decision, { modoSimulacion: pedido.modoSimulacion === true });
  let idAprobacion = paso.accion === 'modal' ? (decision.idDecision || '') : '';
  if (paso.accion === 'modal') {
    const respuesta = humana || 'APROBAR';
    paso = decidir(decision, {
      modoSimulacion: pedido.modoSimulacion === true,
      decisionHumana: respuesta,
      idDecision: idAprobacion
    });
    if (paso.accion === 'consultar') {
      decision = gov.aplicarHerramientaAgenteAutorizadaNucleo(Object.assign({}, pedido, {
        decisionHumana: 'APROBAR',
        idDecision: paso.idDecision
      }), entorno.servicios);
      paso = decidir(decision, { modoSimulacion: false });
    }
  }
  const mutoLocal = JSON.stringify(entorno.local) !== antes || paso.ejecutarLocal || paso.mutarEstado || paso.guardarLocal;
  return { decision, paso, mutoLocal, idAprobacion };
}

const tareaA = {
  tarea: 'Documentar el módulo',
  archivos: 'Codigo.gs',
  criterios: 'Nombres en español',
  prueba_verificacion: 'Revisar el prompt'
};

const bajo = crearEntorno();
const rBajo = correr(bajo, {
  nombre: 'consultar_estado_proyecto',
  argumentos: {},
  motivo: 'lectura',
  proyectoIdContexto: 'proyecto_A'
});
probar('BAJO', 'EJECUTADA', (!rBajo.mutoLocal && rBajo.paso.accion === 'representar' && rBajo.decision.estado === 'EJECUTADA' && bajo.auditoria.length === 1) ? 'EJECUTADA' : rBajo.decision.estado);

const medio = crearEntorno();
const rMedio = correr(medio, {
  nombre: 'configurar_tarea_programacion',
  argumentos: tareaA,
  motivo: 'tarea',
  proyectoIdContexto: 'proyecto_A'
}, 'APROBAR');
probar('MEDIO', 'EJECUTADA', (!rMedio.mutoLocal && rMedio.idAprobacion && rMedio.decision.estado === 'EJECUTADA' && medio.proyectos.proyecto_A.promptTareaEspecifica === tareaA.tarea && medio.local.escrituras === 0) ? 'EJECUTADA' : rMedio.decision.estado);

const falsa = crearEntorno();
const dFalsa = gov.aplicarHerramientaAgenteAutorizadaNucleo({
  nombre: 'configurar_tarea_programacion',
  argumentos: tareaA,
  proyectoIdContexto: 'proyecto_A',
  decisionHumana: 'APROBAR'
}, falsa.servicios);
const pFalsa = decidir(dFalsa, {});
probar('APROBACIÓN FALSA', 'DENEGADA', (!pFalsa.ejecutarLocal && dFalsa.estado === 'DENEGADA' && !falsa.proyectos.proyecto_A.promptTareaEspecifica) ? 'DENEGADA' : dFalsa.estado);

const reuso = crearEntorno();
const primera = correr(reuso, {
  nombre: 'configurar_tarea_programacion',
  argumentos: tareaA,
  proyectoIdContexto: 'proyecto_A'
}, 'APROBAR');
const segunda = gov.aplicarHerramientaAgenteAutorizadaNucleo({
  nombre: 'configurar_tarea_programacion',
  argumentos: tareaA,
  proyectoIdContexto: 'proyecto_A',
  decisionHumana: 'APROBAR',
  idDecision: primera.idAprobacion
}, reuso.servicios);
probar('APROBACIÓN REUTILIZADA', 'DENEGADA', segunda.estado);

const args = crearEntorno();
const pendienteArgs = gov.aplicarHerramientaAgenteAutorizadaNucleo({
  nombre: 'configurar_tarea_programacion',
  argumentos: tareaA,
  proyectoIdContexto: 'proyecto_A'
}, args.servicios);
const pasoArgs = decidir(pendienteArgs, { decisionHumana: 'APROBAR', idDecision: pendienteArgs.idDecision });
const cambiados = gov.aplicarHerramientaAgenteAutorizadaNucleo({
  nombre: 'configurar_tarea_programacion',
  argumentos: Object.assign({}, tareaA, { tarea: 'Otra tarea' }),
  proyectoIdContexto: 'proyecto_A',
  decisionHumana: 'APROBAR',
  idDecision: pasoArgs.idDecision
}, args.servicios);
probar('ARGUMENTOS MODIFICADOS', 'DENEGADA', (cambiados.estado === 'DENEGADA' && !args.proyectos.proyecto_A.promptTareaEspecifica) ? 'DENEGADA' : cambiados.estado);

const proy = crearEntorno();
const pendienteProy = gov.aplicarHerramientaAgenteAutorizadaNucleo({
  nombre: 'configurar_tarea_programacion',
  argumentos: tareaA,
  proyectoIdContexto: 'proyecto_A'
}, proy.servicios);
const otroProyecto = gov.aplicarHerramientaAgenteAutorizadaNucleo({
  nombre: 'configurar_tarea_programacion',
  argumentos: tareaA,
  proyectoIdContexto: 'proyecto_B',
  decisionHumana: 'APROBAR',
  idDecision: pendienteProy.idDecision
}, proy.servicios);
probar('PROYECTO MODIFICADO', 'DENEGADA', (otroProyecto.estado === 'DENEGADA' && !proy.proyectos.proyecto_B.promptTareaEspecifica) ? 'DENEGADA' : otroProyecto.estado);

const critico = correr(crearEntorno(), {
  nombre: 'eliminar_datos_proyecto',
  argumentos: { proyectoId: 'proyecto_A' },
  proyectoIdContexto: 'proyecto_A',
  decisionHumana: 'APROBAR',
  idDecision: 'dec_falsa'
});
probar('CRÍTICO', 'BLOQUEADA', (!critico.mutoLocal && critico.decision.estado === 'BLOQUEADA') ? 'BLOQUEADA' : critico.decision.estado);

const desconocida = correr(crearEntorno(), {
  nombre: 'herramienta_que_no_existe',
  argumentos: {},
  proyectoIdContexto: 'proyecto_A'
});
probar('DESCONOCIDA', 'DENEGADA', (!desconocida.mutoLocal && desconocida.decision.estado === 'DENEGADA') ? 'DENEGADA' : desconocida.decision.estado);

const simulacion = crearEntorno();
const rSim = correr(simulacion, {
  nombre: 'modificar_campos_proyecto',
  argumentos: { campoProblema: 'no debe guardarse' },
  proyectoIdContexto: 'proyecto_A',
  modoSimulacion: true,
  decisionHumana: 'APROBAR'
});
probar('SIMULACIÓN', 'SIN MUTACIÓN REAL', (!rSim.mutoLocal && rSim.decision.estado === 'SIN MUTACIÓN REAL' && simulacion.auditoria.length === 0 && simulacion.proyectos.proyecto_A.campoProblema === 'original A') ? 'SIN MUTACIÓN REAL' : rSim.decision.estado);

const rechazo = crearEntorno();
const pendienteRechazo = gov.aplicarHerramientaAgenteAutorizadaNucleo({
  nombre: 'configurar_tarea_programacion',
  argumentos: tareaA,
  proyectoIdContexto: 'proyecto_A'
}, rechazo.servicios);
const pasoRechazo = decidir(pendienteRechazo, { decisionHumana: 'RECHAZAR', idDecision: pendienteRechazo.idDecision });
probar('RECHAZAR', 'RECHAZADA', (pasoRechazo.accion === 'detener' && pasoRechazo.estado === 'RECHAZADA' && pasoRechazo.mutarEstado === false && !rechazo.proyectos.proyecto_A.promptTareaEspecifica) ? 'RECHAZADA' : pasoRechazo.estado);

const mision = extraer('async function ejecutarMisionAgenteDeepSeek', 'SECCIÓN 13');
const stub = extraer('function ejecutarHerramientaAgente()', 'function decidirContinuacionHerramientaAgente');
const consulta = extraer('function consultarGobernanzaBackend', 'let resolverModalGobernanza');
const bypassCerrado = !mision.includes('ejecutarHerramientaAgente')
  && !mision.includes('guardarEstadoLocal')
  && !/estadoProyecto\.[A-Za-z0-9_]+\s*=/.test(mision)
  && !mision.includes('estadoProyecto[')
  && mision.includes('idDecision: paso.idDecision')
  && mision.includes('aplicarHerramientaAgenteAutorizada') === false
  && consulta.includes('.aplicarHerramientaAgenteAutorizada(limpio)')
  && !consulta.includes('resolverEjecucionHerramientaAgente')
  && !stub.includes('estadoProyecto');
probar('BYPASS DE LA MISIÓN', 'CERRADO', bypassCerrado ? 'CERRADO' : 'ABIERTO');

const vistas = (html.match(/id="vista-/g) || []).length;
probar('23 VISTAS', '23', String(vistas));
const cierres = (html.match(/<\/html>/g) || []).length;
probar('CIERRE HTML', '1', String(cierres));
const prohibido = ['HERRAMIENTAS_AGENTES', 'validarSolicitudHerramientaAgente', 'Authorization: Bearer', 'api.deepseek.com']
  .filter((texto) => html.includes(texto));
probar('CATÁLOGO Y DEEPSEEK FUERA DEL HTML', 'AUSENTES', prohibido.length ? prohibido.join(',') : 'AUSENTES');
const integridad = html.includes('id="viajeDidactico"')
  && html.includes('const ESTACIONES_VIAJE')
  && html.includes('speechSynthesis')
  && html.includes('const ServicioIA')
  && html.includes('id="modalAprobacionGobernanza"')
  && html.includes('id="botonSimularMisionAgente"');
probar('INTEGRIDAD DE LA CANDIDATA', 'CONSERVADA', integridad ? 'CONSERVADA' : 'INCOMPLETA');

const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
const temporal = join(tmpdir(), 'architex-fase22d-check.js');
writeFileSync(temporal, script);
const chequeo = spawnSync(process.execPath, ['--check', temporal], { encoding: 'utf8' });
unlinkSync(temporal);
probar('NODE CHECK', 'VALIDA', chequeo.status === 0 ? 'VALIDA' : 'INVALIDA');

const hashVivo = require('crypto').createHash('sha256').update(vivo).digest('hex').toUpperCase();
const lineasVivo = vivo.toString('utf8').split(/\n/).length - (vivo.toString('utf8').endsWith('\n') ? 1 : 0);
probar('INDEX VIVO', 'INTACTO', (hashVivo.startsWith('43C22B7D') && lineasVivo === 861) ? 'INTACTO' : hashVivo);

const fallos = resultados.filter((item) => !item.ok);
console.log(fallos.length ? 'RESULTADO: FALLA' : 'RESULTADO: PASA');
process.exit(fallos.length ? 1 : 0);
