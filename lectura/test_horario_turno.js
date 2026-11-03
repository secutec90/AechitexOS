const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

function extraer(archivo, nombre) {
  const src = fs.readFileSync(archivo, 'utf8');
  const inicio = src.indexOf('function ' + nombre + '(');
  if (inicio < 0) throw new Error('No está ' + nombre + ' en ' + archivo);
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
    extraer('ClaseLogica.gs', 'normalizarVistaHorario_')
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

const asistencia = fs.readFileSync('Asistencia.gs', 'utf8');
assert.ok(asistencia.indexOf('!conteoTurnos[turnoDe_(f["Turno"])]') > 0);
assert.ok(asistencia.indexOf('LockService.getScriptLock()') > 0);

function compilarHtml(archivo) {
  const html = fs.readFileSync(archivo, 'utf8');
  const re = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  let n = 0;
  while ((m = re.exec(html)) !== null) {
    n++;
    vm.compileFunction(m[1]);
  }
  if (!n) throw new Error(archivo + ' no tiene script');
}

['HorarioVistaJS.html', 'AdminPlanJS_01.html', 'ClaseJS_03.html', 'AdminPlanJS_04.html', 'ClaseJS_06.html'].forEach(compilarHtml);

console.log('test_horario_turno: ok');
