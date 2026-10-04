import { createRequire } from 'module';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const raiz = dirname(dirname(fileURLToPath(import.meta.url)));
const gov = require('./nucleoGobernanzaAgente.js');
const contexto = 'proyecto_A';
const resultados = [];

function probar(nombre, esperado, obtenido) {
  const ok = esperado === obtenido;
  resultados.push({ nombre, esperado, obtenido, ok });
  console.log(ok ? 'OK' : 'FALLO', nombre, '→', obtenido);
}

function efectos() {
  const conteo = { proyecto: 0, historial: 0, adr: 0, auditoria: 0 };
  return {
    conteo,
    escribirProyecto: () => { conteo.proyecto += 1; },
    escribirHistorial: () => { conteo.historial += 1; },
    escribirAdr: () => { conteo.adr += 1; },
    escribirAuditoria: () => { conteo.auditoria += 1; }
  };
}

const bajoFx = efectos();
const bajo = gov.ejecutarRutaSeguraHerramienta({
  nombre: 'consultar_estado_proyecto',
  argumentos: {},
  proyectoIdContexto: contexto
}, {}, bajoFx);
probar('Bajo', 'EJECUTADA', (bajo.estado === 'EJECUTADA' && bajo.escrituras.proyecto === 1 && bajoFx.conteo.proyecto === 1) ? 'EJECUTADA' : bajo.estado);

const medio = gov.ejecutarRutaSeguraHerramienta({
  nombre: 'configurar_tarea_programacion',
  argumentos: {
    tarea: 'Documentar el módulo',
    archivos: 'index.html',
    criterios: 'Nombres en español',
    prueba_verificacion: 'Revisar el prompt'
  },
  proyectoIdContexto: contexto
}, {}, efectos());
probar('Medio', 'APROBACIÓN HUMANA', medio.estado);

const alto = gov.ejecutarRutaSeguraHerramienta({
  nombre: 'modificar_campos_proyecto',
  argumentos: { campoProblema: 'Registrar asistencia sin perder el dato.' },
  proyectoIdContexto: contexto
}, {}, efectos());
probar('Alto', 'APROBACIÓN HUMANA', alto.estado);

const critico = gov.ejecutarRutaSeguraHerramienta({
  nombre: 'eliminar_datos_proyecto',
  argumentos: { proyectoId: contexto },
  proyectoIdContexto: contexto
}, { decisionHumana: 'APROBAR' }, efectos());
probar('Crítico', 'BLOQUEADA', critico.estado);

const desconocida = gov.ejecutarRutaSeguraHerramienta({
  nombre: 'herramienta_que_no_existe',
  argumentos: {},
  proyectoIdContexto: contexto
}, {}, efectos());
probar('Desconocida', 'DENEGADA', desconocida.estado);

const invalidos = gov.ejecutarRutaSeguraHerramienta({
  nombre: 'modificar_campos_proyecto',
  argumentos: { campoInventado: 'esto no está en el contrato' },
  proyectoIdContexto: contexto
}, {}, efectos());
probar('Argumentos inválidos', 'DENEGADA', invalidos.estado);

const bypass = gov.ejecutarRutaSeguraHerramienta({
  nombre: 'consultar_estado_proyecto',
  argumentos: { forzar: true },
  proyectoIdContexto: contexto
}, {}, efectos());
probar('Bypass', 'DENEGADA', bypass.estado);

const manipulado = gov.ejecutarRutaSeguraHerramienta({
  nombre: 'eliminar_datos_proyecto',
  argumentos: { proyectoId: contexto },
  proyectoIdContexto: contexto,
  nivelRiesgo: 'BAJO',
  requiereAprobacion: false,
  habilitada: true,
  catalogo: { eliminar_datos_proyecto: { nivelRiesgo: 'BAJO', habilitada: true } }
}, {}, efectos());
const riesgoServidor = gov.HERRAMIENTAS_AGENTES.eliminar_datos_proyecto.nivelRiesgo;
probar('Manipulación frontend', 'DENEGADA POR BACKEND', (manipulado.estado === 'DENEGADA POR BACKEND' && manipulado.mutacionReal === false && riesgoServidor === 'CRITICO') ? 'DENEGADA POR BACKEND' : manipulado.estado);

const fxSim = efectos();
const simulada = gov.ejecutarRutaSeguraHerramienta({
  nombre: 'modificar_campos_proyecto',
  argumentos: { campoProblema: 'Cambio que no debe guardarse.' },
  proyectoIdContexto: contexto
}, { modoSimulacion: true, decisionHumana: 'APROBAR' }, fxSim);
const sinMutacion = simulada.estado === 'SIN MUTACIÓN REAL'
  && simulada.mutacionReal === false
  && simulada.escrituras.proyecto === 0
  && simulada.escrituras.historial === 0
  && simulada.escrituras.adr === 0
  && simulada.escrituras.auditoria === 0
  && fxSim.conteo.proyecto === 0
  && fxSim.conteo.historial === 0
  && fxSim.conteo.adr === 0
  && fxSim.conteo.auditoria === 0;
probar('Simulación', 'SIN MUTACIÓN REAL', sinMutacion ? 'SIN MUTACIÓN REAL' : 'MUTACION');

const tabla = [];
const lockSync = {
  ocupado: false,
  tryLock() {
    if (this.ocupado) return false;
    this.ocupado = true;
    return true;
  },
  releaseLock() {
    this.ocupado = false;
  }
};
const concurrentes = [
  gov.anexarAuditoriaBajoLock(tabla, { id: 'acc_concurrente_1', herramienta: 'consultar_estado_proyecto', nivel_riesgo: 'BAJO', estado: 'EJECUTADA', modo: 'REAL', proyecto_id: contexto }, lockSync, 30000),
  gov.anexarAuditoriaBajoLock(tabla, { id: 'acc_concurrente_2', herramienta: 'modificar_campos_proyecto', nivel_riesgo: 'ALTO', estado: 'SIMULADA', modo: 'SIMULACION', proyecto_id: contexto }, lockSync, 30000)
];
const ids = tabla.map((fila) => fila.id);
const idsUnicos = new Set(ids).size === 2;

let ocupadoCarrera = false;
const colaCarrera = [];
async function escribirConLock(destino, fila) {
  while (ocupadoCarrera) {
    await new Promise((resolver) => colaCarrera.push(resolver));
  }
  ocupadoCarrera = true;
  const posicion = destino.length;
  await new Promise((resolver) => setTimeout(resolver, 20));
  destino.push({ id: fila.id, posicion });
  ocupadoCarrera = false;
  const siguiente = colaCarrera.shift();
  if (siguiente) siguiente();
}
const carrera = [];
await Promise.all([
  escribirConLock(carrera, { id: 'carrera_1' }),
  escribirConLock(carrera, { id: 'carrera_2' })
]);
const carreraConsistente = carrera.length === 2 && carrera[0].posicion !== carrera[1].posicion;
const codigo = readFileSync(join(raiz, 'Codigo.gs'), 'utf8');
const lockProyectos = codigo.includes('function guardarProyectoConLock') && codigo.slice(codigo.indexOf('function guardarProyectoConLock'), codigo.indexOf('function guardarProyectoConLock') + 400).includes('LockService.getScriptLock()');
const lockAuditoria = codigo.includes('function registrarAccionAgente') && codigo.slice(codigo.indexOf('function registrarAccionAgente'), codigo.indexOf('function registrarAccionAgente') + 500).includes('LockService.getScriptLock()');
probar('Concurrencia', 'AUDITORÍA CONSISTENTE', (concurrentes.every((item) => item.exito) && idsUnicos && carreraConsistente && lockProyectos && lockAuditoria) ? 'AUDITORÍA CONSISTENTE' : 'INCONSISTENTE');

const html = readFileSync(join(raiz, 'index.html'), 'utf8');
const fuente = readFileSync(join(raiz, 'GobernanzaAgente.gs'), 'utf8');
const puente = readFileSync(join(raiz, 'gobernanza', 'nucleoGobernanzaAgente.js'), 'utf8');
const copiasFuente = (fuente.match(/var HERRAMIENTAS_AGENTES/g) || []).length;
const copiasHtml = (html.match(/HERRAMIENTAS_AGENTES/g) || []).length;
const copiasPuente = (puente.match(/var HERRAMIENTAS_AGENTES/g) || []).length;
const publico = JSON.stringify(gov.exponerCatalogoHerramientasParaPresentacion());
const publicoSeguro = !publico.includes('forzarEjecucion') && !publico.includes('PATRONES_INYECCION') && !publico.includes('sk-');
probar('Fuente única', 'UNA', (copiasFuente === 1 && copiasHtml === 0 && copiasPuente === 0 && publicoSeguro) ? 'UNA' : 'VARIAS');

const vistas = (html.match(/id="vista-/g) || []).length;
const catalogoUi = html.includes('catalogoSecciones');
console.log('REGRESION vistas', vistas, 'catalogoUi', catalogoUi, 'lineasHtml', html.split(/\r?\n/).length);

const fallos = resultados.filter((item) => !item.ok);
const lineas = [
  '# TESTS V-36 — Fase 2.1',
  '',
  'Ejecutado con `node gobernanza/pruebasFase21Gobernanza.mjs`.',
  '',
  '| Prueba | Esperado | Obtenido | Resultado |',
  '| --- | --- | --- | --- |',
  ...resultados.map((item) => `| ${item.nombre} | ${item.esperado} | ${item.obtenido} | ${item.ok ? 'PASA' : 'FALLA'} |`),
  '',
  'Regresión de interfaz: `index.html` tiene ' + vistas + ' vistas `id="vista-"` y ' + (catalogoUi ? 'sí' : 'no') + ' contiene `catalogoSecciones`.',
  '',
  fallos.length ? 'Fallos: ' + fallos.map((item) => item.nombre).join(', ') : 'Fallos de gobernanza: ninguno.',
  ''
];
writeFileSync(join(raiz, '02-DOCS', 'wiki', 'ftd', 'TESTS_V36_FASE21.md'), lineas.join('\n'));
console.log(fallos.length ? 'RESULTADO: FALLA' : 'RESULTADO: PASA');
process.exit(fallos.length ? 1 : 0);
