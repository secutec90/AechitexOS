import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const raiz = dirname(dirname(fileURLToPath(import.meta.url)));
const gov = require('./nucleoGobernanzaAgente.js');
const resultados = [];

function probar(nombre, esperado, obtenido) {
  const ok = esperado === obtenido;
  resultados.push({ nombre, esperado, obtenido, ok });
  console.log(ok ? 'OK' : 'FALLO', nombre, '→', obtenido);
}

function crearEntorno() {
  const proyectos = {
    proyecto_A: { idProyecto: 'proyecto_A', nombreProyecto: 'Aula', campoProblema: 'original A' },
    proyecto_B: { idProyecto: 'proyecto_B', nombreProyecto: 'B', campoProblema: 'original B' }
  };
  const decisiones = {};
  const auditoria = [];
  const stats = { proyecto: 0, auditoria: 0, locks: 0, profundidad: 0, maxProfundidad: 0 };
  const servicios = {
    ahora: () => Date.now(),
    vigenciaMs: 600000,
    leerDecision(id) {
      return decisiones[id] ? JSON.parse(JSON.stringify(decisiones[id])) : null;
    },
    guardarDecision(id, registro) {
      decisiones[id] = JSON.parse(JSON.stringify(registro));
    },
    leerProyecto(id) {
      return proyectos[id] ? JSON.parse(JSON.stringify(proyectos[id])) : null;
    },
    escribirProyecto(proyecto) {
      stats.proyecto += 1;
      if (servicios.fallarEscritura) throw new Error('fallo de escritura simulado');
      proyectos[proyecto.idProyecto] = JSON.parse(JSON.stringify(proyecto));
    },
    escribirAuditoria(registro) {
      stats.auditoria += 1;
      auditoria.push(registro);
    },
    conLock(trabajo) {
      if (stats.profundidad > 0) throw new Error('candado anidado');
      stats.profundidad += 1;
      stats.locks += 1;
      stats.maxProfundidad = Math.max(stats.maxProfundidad, stats.profundidad);
      try {
        return trabajo();
      } finally {
        stats.profundidad -= 1;
      }
    }
  };
  return { proyectos, decisiones, auditoria, servicios, stats };
}

const tareaA = {
  tarea: 'Documentar el módulo',
  archivos: 'Codigo.gs',
  criterios: 'Nombres en español',
  prueba_verificacion: 'Revisar el prompt'
};
const tareaB = {
  tarea: 'Otra tarea',
  archivos: 'Codigo.gs',
  criterios: 'Nombres en español',
  prueba_verificacion: 'Revisar el prompt'
};

function pedir(extra) {
  return Object.assign({
    nombre: 'consultar_estado_proyecto',
    argumentos: {},
    motivo: 'prueba',
    proyectoIdContexto: 'proyecto_A'
  }, extra);
}

const bajo = crearEntorno();
const fotoBajo = JSON.stringify(bajo.proyectos.proyecto_A);
const rBajo = gov.aplicarHerramientaAgenteAutorizadaNucleo(pedir(), bajo.servicios);
const bajoOk = rBajo.estado === 'EJECUTADA'
  && rBajo.escrituras.auditoria === 1
  && bajo.auditoria.length === 1
  && bajo.auditoria[0].estado === 'EJECUTADA'
  && bajo.auditoria[0].herramienta === 'consultar_estado_proyecto'
  && JSON.stringify(bajo.proyectos.proyecto_A) === fotoBajo;
probar('BAJO', 'EJECUTADA', bajoOk ? 'EJECUTADA' : rBajo.estado);

const medio = crearEntorno();
const rMedio = gov.aplicarHerramientaAgenteAutorizadaNucleo(pedir({
  nombre: 'configurar_tarea_programacion',
  argumentos: tareaA
}), medio.servicios);
const medioOk = rMedio.estado === 'APROBACIÓN HUMANA'
  && !!rMedio.idDecision
  && medio.stats.proyecto === 0
  && medio.auditoria.length === 0
  && !medio.proyectos.proyecto_A.promptTareaEspecifica;
probar('MEDIO sin aprobación', 'APROBACIÓN HUMANA', medioOk ? 'APROBACIÓN HUMANA' : rMedio.estado);

const rMedioOk = gov.aplicarHerramientaAgenteAutorizadaNucleo(pedir({
  nombre: 'configurar_tarea_programacion',
  argumentos: tareaA,
  idDecision: rMedio.idDecision,
  decisionHumana: 'APROBAR'
}), medio.servicios);
const medioEjecutada = rMedioOk.estado === 'EJECUTADA'
  && medio.proyectos.proyecto_A.promptTareaEspecifica === tareaA.tarea
  && medio.auditoria.some((fila) => fila.estado === 'EJECUTADA' && fila.herramienta === 'configurar_tarea_programacion');
probar('MEDIO con aprobación válida', 'EJECUTADA', medioEjecutada ? 'EJECUTADA' : rMedioOk.estado);

const falsa = crearEntorno();
const rFalsa = gov.aplicarHerramientaAgenteAutorizadaNucleo(pedir({
  nombre: 'configurar_tarea_programacion',
  argumentos: tareaA,
  decisionHumana: 'APROBAR'
}), falsa.servicios);
probar('MEDIO con aprobación falsa', 'DENEGADA', (rFalsa.estado === 'DENEGADA' && falsa.stats.proyecto === 0) ? 'DENEGADA' : rFalsa.estado);

const rReuso = gov.aplicarHerramientaAgenteAutorizadaNucleo(pedir({
  nombre: 'configurar_tarea_programacion',
  argumentos: tareaA,
  idDecision: rMedio.idDecision,
  decisionHumana: 'APROBAR'
}), medio.servicios);
probar('MEDIO reutilizando aprobación', 'DENEGADA', (rReuso.estado === 'DENEGADA' && medio.stats.proyecto === 1) ? 'DENEGADA' : rReuso.estado);

const args = crearEntorno();
const pendienteArgs = gov.aplicarHerramientaAgenteAutorizadaNucleo(pedir({
  nombre: 'configurar_tarea_programacion',
  argumentos: tareaA
}), args.servicios);
const rArgs = gov.aplicarHerramientaAgenteAutorizadaNucleo(pedir({
  nombre: 'configurar_tarea_programacion',
  argumentos: tareaB,
  idDecision: pendienteArgs.idDecision,
  decisionHumana: 'APROBAR'
}), args.servicios);
probar('MEDIO con argumentos modificados', 'DENEGADA', (rArgs.estado === 'DENEGADA' && !args.proyectos.proyecto_A.promptTareaEspecifica) ? 'DENEGADA' : rArgs.estado);

const proy = crearEntorno();
const pendienteProy = gov.aplicarHerramientaAgenteAutorizadaNucleo(pedir({
  nombre: 'configurar_tarea_programacion',
  argumentos: tareaA,
  proyectoIdContexto: 'proyecto_A'
}), proy.servicios);
const rProy = gov.aplicarHerramientaAgenteAutorizadaNucleo(pedir({
  nombre: 'configurar_tarea_programacion',
  argumentos: tareaA,
  proyectoIdContexto: 'proyecto_B',
  idDecision: pendienteProy.idDecision,
  decisionHumana: 'APROBAR'
}), proy.servicios);
probar('MEDIO con proyecto modificado', 'DENEGADA', (rProy.estado === 'DENEGADA' && proy.proyectos.proyecto_B.campoProblema === 'original B' && !proy.proyectos.proyecto_B.promptTareaEspecifica) ? 'DENEGADA' : rProy.estado);

function cicloAlto(argumentosA, argumentosB, proyectoDestino) {
  const entorno = crearEntorno();
  const alta = gov.aplicarHerramientaAgenteAutorizadaNucleo(pedir({
    nombre: 'modificar_campos_proyecto',
    argumentos: argumentosA
  }), entorno.servicios);
  return { entorno, alta };
}

const altoSin = cicloAlto({ campoProblema: 'nuevo problema' });
probar('ALTO sin aprobación', 'APROBACIÓN HUMANA', (altoSin.alta.estado === 'APROBACIÓN HUMANA' && altoSin.entorno.stats.proyecto === 0) ? 'APROBACIÓN HUMANA' : altoSin.alta.estado);

const altoCon = cicloAlto({ campoProblema: 'nuevo problema' });
const altoOk = gov.aplicarHerramientaAgenteAutorizadaNucleo(pedir({
  nombre: 'modificar_campos_proyecto',
  argumentos: { campoProblema: 'nuevo problema' },
  idDecision: altoCon.alta.idDecision,
  decisionHumana: 'APROBAR'
}), altoCon.entorno.servicios);
probar('ALTO con aprobación válida', 'EJECUTADA', (altoOk.estado === 'EJECUTADA' && altoCon.entorno.proyectos.proyecto_A.campoProblema === 'nuevo problema') ? 'EJECUTADA' : altoOk.estado);

const altoFalsa = gov.aplicarHerramientaAgenteAutorizadaNucleo(pedir({
  nombre: 'modificar_campos_proyecto',
  argumentos: { campoProblema: 'nuevo problema' },
  decisionHumana: 'APROBAR'
}), crearEntorno().servicios);
probar('ALTO con aprobación falsa', 'DENEGADA', altoFalsa.estado);

const altoReusoEntorno = cicloAlto({ campoProblema: 'nuevo problema' });
gov.aplicarHerramientaAgenteAutorizadaNucleo(pedir({
  nombre: 'modificar_campos_proyecto',
  argumentos: { campoProblema: 'nuevo problema' },
  idDecision: altoReusoEntorno.alta.idDecision,
  decisionHumana: 'APROBAR'
}), altoReusoEntorno.entorno.servicios);
const altoReuso = gov.aplicarHerramientaAgenteAutorizadaNucleo(pedir({
  nombre: 'modificar_campos_proyecto',
  argumentos: { campoProblema: 'nuevo problema' },
  idDecision: altoReusoEntorno.alta.idDecision,
  decisionHumana: 'APROBAR'
}), altoReusoEntorno.entorno.servicios);
probar('ALTO reutilizando aprobación', 'DENEGADA', altoReuso.estado);

const altoArgs = cicloAlto({ campoProblema: 'problema A' });
const altoArgsR = gov.aplicarHerramientaAgenteAutorizadaNucleo(pedir({
  nombre: 'modificar_campos_proyecto',
  argumentos: { campoProblema: 'problema B' },
  idDecision: altoArgs.alta.idDecision,
  decisionHumana: 'APROBAR'
}), altoArgs.entorno.servicios);
probar('ALTO con argumentos modificados', 'DENEGADA', (altoArgsR.estado === 'DENEGADA' && altoArgs.entorno.proyectos.proyecto_A.campoProblema === 'original A') ? 'DENEGADA' : altoArgsR.estado);

const altoProy = cicloAlto({ campoProblema: 'nuevo problema' });
const altoProyR = gov.aplicarHerramientaAgenteAutorizadaNucleo(pedir({
  nombre: 'modificar_campos_proyecto',
  argumentos: { campoProblema: 'nuevo problema' },
  proyectoIdContexto: 'proyecto_B',
  idDecision: altoProy.alta.idDecision,
  decisionHumana: 'APROBAR'
}), altoProy.entorno.servicios);
probar('ALTO con proyecto modificado', 'DENEGADA', (altoProyR.estado === 'DENEGADA' && altoProy.entorno.proyectos.proyecto_B.campoProblema === 'original B') ? 'DENEGADA' : altoProyR.estado);

const critico = crearEntorno();
const rCritico = gov.aplicarHerramientaAgenteAutorizadaNucleo(pedir({
  nombre: 'eliminar_datos_proyecto',
  argumentos: { proyectoId: 'proyecto_A' },
  idDecision: 'dec_falsa',
  decisionHumana: 'APROBAR'
}), critico.servicios);
probar('CRÍTICO', 'BLOQUEADA', (rCritico.estado === 'BLOQUEADA' && critico.stats.proyecto === 0 && critico.auditoria.length === 0) ? 'BLOQUEADA' : rCritico.estado);

const rDesc = gov.aplicarHerramientaAgenteAutorizadaNucleo(pedir({
  nombre: 'herramienta_que_no_existe',
  decisionHumana: 'APROBAR',
  idDecision: 'dec_falsa'
}), crearEntorno().servicios);
probar('DESCONOCIDA', 'DENEGADA', rDesc.estado);

const rInv = gov.aplicarHerramientaAgenteAutorizadaNucleo(pedir({
  nombre: 'modificar_campos_proyecto',
  argumentos: { campoInventado: 'fuera de contrato' },
  decisionHumana: 'APROBAR'
}), crearEntorno().servicios);
probar('ARGUMENTOS INVÁLIDOS', 'DENEGADA', rInv.estado);

const candidata = readFileSync(join(raiz, 'index.html.recuperado-v49'), 'utf8');
const inicioFn = candidata.indexOf('function ejecutarHerramientaAgente');
const finFn = candidata.indexOf('function consultarGobernanzaBackend');
const cuerpoLocal = candidata.slice(inicioFn, finFn);
const remotoAntes = crearEntorno();
const copiaRemota = JSON.stringify(remotoAntes.proyectos);
const estadoLocal = { campoProblema: 'original A' };
estadoLocal.campoProblema = 'cambio solo en memoria del navegador';
const sinRemoto = inicioFn > 0
  && !cuerpoLocal.includes('SpreadsheetApp')
  && !cuerpoLocal.includes('DriveApp')
  && !cuerpoLocal.includes('google.script.run')
  && !cuerpoLocal.includes('LockService')
  && !cuerpoLocal.includes('guardarProyecto')
  && JSON.stringify(remotoAntes.proyectos) === copiaRemota
  && estadoLocal.campoProblema !== remotoAntes.proyectos.proyecto_A.campoProblema;
probar('BYPASS FRONTEND', 'NO HAY MUTACIÓN REMOTA', sinRemoto ? 'NO HAY MUTACIÓN REMOTA' : 'HAY MUTACIÓN REMOTA');

const simulacion = crearEntorno();
const rSim = gov.aplicarHerramientaAgenteAutorizadaNucleo(pedir({
  nombre: 'modificar_campos_proyecto',
  argumentos: { campoProblema: 'no debe guardarse' },
  modoSimulacion: true,
  decisionHumana: 'APROBAR'
}), simulacion.servicios);
probar('SIMULACIÓN', 'SIN MUTACIÓN REAL', (rSim.estado === 'SIN MUTACIÓN REAL' && simulacion.stats.proyecto === 0 && simulacion.auditoria.length === 0 && simulacion.proyectos.proyecto_A.campoProblema === 'original A') ? 'SIN MUTACIÓN REAL' : rSim.estado);

const carrera = crearEntorno();
const pendiente1 = gov.aplicarHerramientaAgenteAutorizadaNucleo(pedir({
  nombre: 'modificar_campos_proyecto',
  argumentos: { campoProblema: 'problema uno' }
}), carrera.servicios);
const pendiente2 = gov.aplicarHerramientaAgenteAutorizadaNucleo(pedir({
  nombre: 'modificar_campos_proyecto',
  argumentos: { campoObjetivo: 'objetivo dos' }
}), carrera.servicios);
const primera = gov.aplicarHerramientaAgenteAutorizadaNucleo(pedir({
  nombre: 'modificar_campos_proyecto',
  argumentos: { campoProblema: 'problema uno' },
  idDecision: pendiente1.idDecision,
  decisionHumana: 'APROBAR'
}), carrera.servicios);
const segunda = gov.aplicarHerramientaAgenteAutorizadaNucleo(pedir({
  nombre: 'modificar_campos_proyecto',
  argumentos: { campoObjetivo: 'objetivo dos' },
  idDecision: pendiente2.idDecision,
  decisionHumana: 'APROBAR'
}), carrera.servicios);
const auditoriasReales = carrera.auditoria.filter((fila) => fila.estado === 'EJECUTADA');
const codigo = readFileSync(join(raiz, 'Codigo.gs'), 'utf8');
const ancla = codigo.indexOf('function aplicarHerramientaAgenteAutorizada(solicitud)');
const cuerpoServidor = ancla >= 0 ? codigo.slice(ancla, ancla + 1600) : '';
const lockServidor = cuerpoServidor.includes('LockService.getScriptLock()')
  && cuerpoServidor.includes('lock.releaseLock()')
  && cuerpoServidor.includes('guardarProyectoInterno')
  && cuerpoServidor.includes('registrarAccionAgenteInterno')
  && !cuerpoServidor.includes('guardarProyectoConLock');
const carreraOk = primera.estado === 'EJECUTADA'
  && segunda.estado === 'EJECUTADA'
  && carrera.proyectos.proyecto_A.campoProblema === 'problema uno'
  && carrera.proyectos.proyecto_A.campoObjetivo === 'objetivo dos'
  && auditoriasReales.length === 2
  && carrera.stats.maxProfundidad === 1
  && carrera.stats.locks >= 2
  && lockServidor;
probar('CONCURRENCIA', 'AUDITORÍA CONSISTENTE', carreraOk ? 'AUDITORÍA CONSISTENTE' : 'INCONSISTENTE');

const errorEntorno = crearEntorno();
errorEntorno.servicios.fallarEscritura = true;
const pendienteError = gov.aplicarHerramientaAgenteAutorizadaNucleo(pedir({
  nombre: 'modificar_campos_proyecto',
  argumentos: { campoProblema: 'va a fallar' }
}), errorEntorno.servicios);
errorEntorno.servicios.fallarEscritura = true;
const rError = gov.aplicarHerramientaAgenteAutorizadaNucleo(pedir({
  nombre: 'modificar_campos_proyecto',
  argumentos: { campoProblema: 'va a fallar' },
  idDecision: pendienteError.idDecision,
  decisionHumana: 'APROBAR'
}), errorEntorno.servicios);
probar('ERROR DURANTE EJECUCIÓN', 'ERROR', (rError.estado === 'ERROR' && errorEntorno.proyectos.proyecto_A.campoProblema === 'original A' && errorEntorno.auditoria.some((fila) => fila.estado === 'ERROR')) ? 'ERROR' : rError.estado);

const fallos = resultados.filter((item) => !item.ok);
console.log(fallos.length ? 'RESULTADO: FALLA' : 'RESULTADO: PASA');
process.exit(fallos.length ? 1 : 0);
