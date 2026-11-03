const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const base = __dirname;
function archivo(nombre) {
  return path.join(base, nombre);
}

function extraer(nombreArchivo, nombre) {
  const src = fs.readFileSync(archivo(nombreArchivo), 'utf8');
  const inicio = src.indexOf('function ' + nombre + '(');
  if (inicio < 0) throw new Error('No está ' + nombre + ' en ' + nombreArchivo);
  const abre = src.indexOf('{', inicio);
  let nivel = 0;
  for (let i = abre; i < src.length; i++) {
    if (src[i] === '{') nivel++;
    else if (src[i] === '}') {
      nivel--;
      if (nivel === 0) return src.slice(inicio, i + 1);
    }
  }
  throw new Error('Llaves abiertas en ' + nombre);
}

const ctx = { console };
vm.createContext(ctx);
vm.runInContext(
  [
    extraer('Asistencia.gs', 'turnoDe_'),
    extraer('Asistencia.gs', 'turnoDesdeHoraAsi_'),
    extraer('Asistencia.gs', 'turnoDeFilaImportada_'),
    extraer('ClaseLogica.gs', 'turnoPedidoHorario_'),
    extraer('ClaseLogica.gs', 'turnosPresentesHorario_'),
    extraer('ClaseLogica.gs', 'normalizarVistaHorario_'),
    extraer('HorarioVistaJS.html', 'claveMateriaAsc_'),
    extraer('HorarioVistaJS.html', 'siglaAsignatura_'),
    extraer('HorarioVistaJS.html', 'horaAsc_'),
    extraer('HorarioVistaJS.html', 'firmaClaseAsc_'),
    extraer('HorarioVistaJS.html', 'firmaListaAsc_'),
    extraer('HorarioVistaJS.html', 'fusionarCeldasAsc_')
  ].join('\n'),
  ctx
);

assert.strictEqual(ctx.turnoDesdeHoraAsi_('7:00'), 'matutino');
assert.strictEqual(ctx.turnoDesdeHoraAsi_('12:40'), 'matutino');
assert.strictEqual(ctx.turnoDesdeHoraAsi_('13:00'), 'vespertino');
assert.strictEqual(ctx.turnoDesdeHoraAsi_('1:00'), 'vespertino');
assert.strictEqual(ctx.turnoDesdeHoraAsi_('6:40'), 'vespertino');
assert.strictEqual(ctx.turnoDesdeHoraAsi_('18:00'), 'vespertino');
assert.strictEqual(ctx.turnoDeFilaImportada_('1:00', 'auto'), 'vespertino');
assert.strictEqual(ctx.turnoDeFilaImportada_('7:00', 'auto'), 'matutino');
assert.strictEqual(ctx.turnoDeFilaImportada_('1:00', 'matutino'), 'matutino');
assert.strictEqual(ctx.turnoDeFilaImportada_('7:00', 'vespertino'), 'vespertino');

const filas = [
  { Turno: 'matutino' },
  { Turno: 'vespertino' },
  { Turno: 'matutino' }
];
assert.strictEqual(JSON.stringify(ctx.turnosPresentesHorario_(filas)), JSON.stringify(['matutino', 'vespertino']));
assert.strictEqual(ctx.turnoPedidoHorario_('vespertino', filas), 'vespertino');
assert.strictEqual(ctx.turnoPedidoHorario_('', filas), 'matutino');
assert.strictEqual(ctx.normalizarVistaHorario_('aulas'), 'aula');
assert.strictEqual(ctx.normalizarVistaHorario_('concentrado'), 'concentrado');
assert.strictEqual(ctx.normalizarVistaHorario_(''), 'grupo');

const conteo = { vespertino: 4 };
const conservadas = filas.filter(function (f) { return !conteo[ctx.turnoDe_(f.Turno)]; });
assert.strictEqual(conservadas.length, 2);
assert.ok(conservadas.every(function (f) { return f.Turno === 'matutino'; }));

const asistencia = fs.readFileSync(archivo('Asistencia.gs'), 'utf8');
assert.ok(asistencia.indexOf('!conteoTurnos[turnoDe_(f["Turno"])]') > 0);
assert.ok(asistencia.indexOf('LockService.getScriptLock()') > 0);

assert.strictEqual(ctx.siglaAsignatura_('CIENCIAS'), 'CIEN');
assert.strictEqual(ctx.siglaAsignatura_('EDUCACIÓN FISICA'), 'EduF');
assert.strictEqual(ctx.siglaAsignatura_('F.C.E'), 'FcyE');
assert.strictEqual(ctx.siglaAsignatura_('A CURR'), 'A Curr');
assert.strictEqual(ctx.siglaAsignatura_('ESPAÑOL '), 'Esp');
assert.strictEqual(ctx.siglaAsignatura_('INGLES'), 'Ing');
assert.strictEqual(ctx.siglaAsignatura_('MATEMATICAS'), 'Mat');
assert.strictEqual(ctx.siglaAsignatura_('TECNOLOGIA'), 'Tec');
assert.strictEqual(ctx.siglaAsignatura_('HISTORIA'), 'His');
assert.strictEqual(ctx.siglaAsignatura_('ARTES'), 'Art');
assert.strictEqual(ctx.siglaAsignatura_('GEOGRAFIA'), 'Geo');
assert.strictEqual(ctx.siglaAsignatura_('TUTORIA'), 'Tut');
assert.strictEqual(ctx.siglaAsignatura_('CIEN'), 'CIEN');
assert.strictEqual(ctx.siglaAsignatura_('EduF'), 'EduF');
assert.strictEqual(ctx.siglaAsignatura_('A Curr'), 'A Curr');
assert.strictEqual(ctx.horaAsc_('07:00'), '7:00');
assert.strictEqual(ctx.horaAsc_('1:00'), '1:00');
assert.strictEqual(ctx.horaAsc_('12:40'), '12:40');

const misma = { asignatura: 'TECNOLOGIA', maestro: 'OLIVIA', grupoEtq: '2F', salon: 'C2' };
const otraSala = { asignatura: 'TECNOLOGIA', maestro: 'OLIVIA', grupoEtq: '2F', salon: '' };
const fusion = ctx.fusionarCeldasAsc_([[misma], [Object.assign({}, misma)], [], [otraSala]]);
assert.strictEqual(fusion.length, 3);
assert.strictEqual(fusion[0].indice, 0);
assert.strictEqual(fusion[0].span, 2);
assert.strictEqual(fusion[1].span, 1);
assert.strictEqual(fusion[2].indice, 3);
assert.strictEqual(ctx.fusionarCeldasAsc_([[misma], [otraSala]])[0].span, 1);

const logica = fs.readFileSync(archivo('ClaseLogica.gs'), 'utf8');
assert.ok(logica.indexOf('sujetoUso = "todas"') > 0);
assert.ok(logica.indexOf('catalogo.aulas[0]') < 0);
const vistaJs = fs.readFileSync(archivo('HorarioVistaJS.html'), 'utf8');
assert.ok(vistaJs.indexOf('function pintarHojaAsc_') > 0);
assert.ok(vistaJs.indexOf('hoja-asc') > 0);
assert.ok(fs.readFileSync(archivo('AdminPlanJS_01.html'), 'utf8').indexOf('pintarHojaAsc_') > 0);
assert.ok(fs.readFileSync(archivo('ClaseJS_03.html'), 'utf8').indexOf('pintarHojaAsc_') > 0);

function compilarHtml(nombreArchivo) {
  const html = fs.readFileSync(archivo(nombreArchivo), 'utf8');
  const re = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  let n = 0;
  while ((m = re.exec(html)) !== null) {
    n++;
    vm.compileFunction(m[1]);
  }
  if (!n) throw new Error(nombreArchivo + ' no tiene script');
}

['HorarioVistaJS.html', 'AdminPlanJS_01.html', 'ClaseJS_03.html', 'AdminPlanJS_04.html', 'ClaseJS_06.html'].forEach(compilarHtml);

function bloque(n, ini, fin) {
  return { clave: ini + '|' + fin, bloque: String(n), horaInicio: ini, horaFin: fin };
}
function clase(parcial) {
  return Object.assign({
    idHorario: 'h', asignatura: 'INGLES', maestro: 'LIZETH', grupoEtq: '2G',
    salon: '', horaInicio: '1:00', horaFin: '1:40', propia: true
  }, parcial);
}
const bloques = [
  bloque(1, '1:00', '1:40'), bloque(2, '1:40', '2:20'), bloque(3, '2:20', '3:00'),
  bloque(4, '3:00', '3:40'), bloque(5, '3:40', '4:20'), bloque(6, '4:40', '5:20')
];
function dia(nombre, fecha, horario) {
  return { dia: nombre, fecha: fecha, horario: horario };
}
const caja = { classList: { remove: function () {} }, innerHTML: '', _mapa: null };
const ctxVista = {
  console: console,
  document: { getElementById: function () { return caja; } },
  slotMaeSel: null,
  escaparHtml: function (s) { return String(s == null ? '' : s); }
};
vm.createContext(ctxVista);
const htmlVista = fs.readFileSync(archivo('HorarioVistaJS.html'), 'utf8');
const scriptVista = htmlVista.match(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/i)[1];
vm.runInContext(scriptVista, ctxVista);

ctxVista.pintarHojaAsc_({
  vista: 'docente', turno: 'vespertino', sujeto: 'LIZETH', bloques: bloques,
  calendario: [
    dia('lunes', '2026-11-02', [
      clase({ idHorario: 'a', grupoEtq: '2G', horaInicio: '1:00', horaFin: '1:40' }),
      clase({ idHorario: 'b', grupoEtq: '1F', horaInicio: '1:40', horaFin: '2:20' })
    ]),
    dia('martes', '2026-11-03', []),
    dia('miercoles', '2026-11-04', []),
    dia('jueves', '2026-11-05', [clase({ idHorario: 'c', grupoEtq: '2G', horaInicio: '1:00', horaFin: '1:40' })]),
    dia('viernes', '2026-11-06', [clase({ idHorario: 'd', grupoEtq: '2H', horaInicio: '4:40', horaFin: '5:20' })])
  ]
});
assert.ok(caja.innerHTML.indexOf('LIZETH') > 0);
assert.ok(caja.innerHTML.indexOf('Vespertino') > 0);
assert.ok(caja.innerHTML.indexOf('>2G<') > 0);
assert.ok(caja.innerHTML.indexOf('>Ing<') > 0);
assert.ok(caja.innerHTML.indexOf('Lunes') > 0);
assert.ok(caja.innerHTML.indexOf('Martes') < 0);
assert.ok(caja.innerHTML.indexOf('Miércoles') < 0);
assert.ok(caja.innerHTML.indexOf('abrirCeldaCal(') > 0);
assert.strictEqual(caja._mapa['2026-11-02|a'].grupoEtq, '2G');

ctxVista.pintarHojaAsc_({
  vista: 'grupo', turno: 'vespertino', grupoClave: '2|f',
  grupos: [{ clave: '2|f', etq: '2F' }], bloques: bloques,
  calendario: [
    dia('lunes', '2026-11-02', []),
    dia('martes', '2026-11-03', [
      clase({ idHorario: 't1', asignatura: 'TECNOLOGIA', maestro: 'OLIVIA', grupoEtq: '2F', salon: 'C2', horaInicio: '2:20', horaFin: '3:00' }),
      clase({ idHorario: 't2', asignatura: 'TECNOLOGIA', maestro: 'OLIVIA', grupoEtq: '2F', salon: 'C2', horaInicio: '3:00', horaFin: '3:40' })
    ]),
    dia('miercoles', '2026-11-04', []),
    dia('jueves', '2026-11-05', []),
    dia('viernes', '2026-11-06', [])
  ]
});
assert.ok(caja.innerHTML.indexOf('>2F<') > 0);
assert.ok(caja.innerHTML.indexOf('Martes') > 0);
assert.ok(caja.innerHTML.indexOf('Miércoles') > 0);
assert.ok(caja.innerHTML.indexOf('colspan="2"') > 0);
assert.ok(caja.innerHTML.indexOf('>Tec<') > 0);
assert.ok(caja.innerHTML.indexOf('>C2<') > 0);
assert.ok(caja.innerHTML.indexOf('>OLIVIA<') > 0);

ctxVista.pintarHojaAsc_({
  vista: 'aula', turno: 'vespertino', sujeto: 'todas', aulas: ['C2', 'LAB'], bloques: bloques,
  calendario: [
    dia('lunes', '2026-11-02', [
      clase({ idHorario: 'r1', asignatura: 'TECNOLOGIA', maestro: 'OLIVIA', grupoEtq: '1G', salon: 'C2', horaInicio: '2:20', horaFin: '3:00' })
    ]),
    dia('martes', '2026-11-03', [
      clase({ idHorario: 'r2', asignatura: 'CIENCIAS', maestro: 'JORGE', grupoEtq: '2H', salon: 'LAB', horaInicio: '2:20', horaFin: '3:00' })
    ]),
    dia('miercoles', '2026-11-04', []),
    dia('jueves', '2026-11-05', []),
    dia('viernes', '2026-11-06', [])
  ]
});
assert.ok(caja.innerHTML.indexOf('>C2<') > 0);
assert.ok(caja.innerHTML.indexOf('>LAB<') > 0);
assert.ok(caja.innerHTML.indexOf('>1G<') > 0);
assert.ok(caja.innerHTML.indexOf('>CIEN<') > 0);
assert.ok(caja.innerHTML.indexOf('>JORGE<') > 0);
const hojas = caja.innerHTML.split('class="hoja-asc"').length - 1;
assert.strictEqual(hojas, 2);

ctxVista.pintarHojaAsc_({
  vista: 'concentrado', turno: 'vespertino', bloques: [bloques[0], bloques[1]],
  concentrado: {
    grupos: [{ clave: '1|f', etq: '1F' }, { clave: '2|f', etq: '2F' }],
    dias: [{
      dia: 'lunes', fecha: '2026-11-02',
      celdas: {
        '1|f': { '1:00|1:40': [clase({ idHorario: 'c1', asignatura: 'HISTORIA', maestro: 'AIME', grupoEtq: '1F' })] },
        '2|f': { '1:00|1:40': [clase({ idHorario: 'c2', asignatura: 'HISTORIA', maestro: 'AIME', grupoEtq: '2F', salon: 'LAB' })] }
      }
    }]
  }
});
assert.ok(caja.innerHTML.indexOf('Concentrado') > 0);
assert.ok(caja.innerHTML.indexOf('>1F<') > 0);
assert.ok(caja.innerHTML.indexOf('>His<') > 0);
assert.ok(caja.innerHTML.indexOf('>LAB<') > 0);
assert.strictEqual(caja._mapa['2026-11-02|c1'].asignatura, 'HISTORIA');

console.log('test_horario_turno: ok');
