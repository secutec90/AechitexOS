'use strict';

/**
 * ARCHITEX OS V-36 — Fase 2.1
 * Fuente única de gobernanza del agente.
 * DeepSeek propone; este archivo decide el catálogo, el riesgo y si algo puede ejecutarse.
 * index.html no contiene una copia. Apps Script carga este archivo como script global.
 * Node lo carga con require para las pruebas. No hay segundo catálogo.
 */

var NIVELES_RIESGO_AGENTE = Object.freeze({
  BAJO: 'BAJO',
  MEDIO: 'MEDIO',
  ALTO: 'ALTO',
  CRITICO: 'CRITICO'
});

var CLAVES_BYPASS_PROHIBIDAS = Object.freeze([
  'forzar', 'forzarEjecucion', 'ignorarSeguridad', 'ignorar_seguridad',
  'bypass', 'bypassAprobacion', 'saltarAprobacion', 'skipApproval',
  'cambiarRiesgo', 'nivelRiesgo', 'habilitada', 'requiereAprobacion',
  'aprobarAutomaticamente'
]);

var CLAVES_AMBITO_PROYECTO = Object.freeze(['proyectoId', 'idProyecto', 'proyecto_id']);

var PATRONES_INYECCION_GOBERNANZA = Object.freeze([
  /ignora(?:r)?\s+las\s+reglas\s+anteriores/i,
  /cambia(?:r)?\s+el\s+nivel\s+de\s+riesgo/i,
  /herram[ie]entas_agentes/i,
  /modifica(?:r)?\s+(?:tus\s+)?(?:propios\s+)?permisos/i,
  /salta(?:r)?te\s+la\s+aprobaci[oó]n/i
]);

var _decisionesGobernanza = {};
var _tokensGobernanza = {};

function congelarProfundo(valor) {
  if (!valor || typeof valor !== 'object' || Object.isFrozen(valor)) return valor;
  if (Array.isArray(valor)) {
    valor.forEach(congelarProfundo);
  } else {
    Object.keys(valor).forEach(function (clave) { congelarProfundo(valor[clave]); });
  }
  return Object.freeze(valor);
}

function texto(tipo, obligatorio) {
  return { tipo: 'texto', obligatorio: !!obligatorio };
}

function enumerado(valores, obligatorio) {
  return { tipo: 'enum', valores: valores.slice(), obligatorio: !!obligatorio };
}

function listaDe(esquema, obligatorio) {
  return { tipo: 'lista', esquema: esquema, obligatorio: !!obligatorio };
}

var CAMPOS_PROYECTO_AGENTE = {
  nombreProyecto: texto(false),
  campoProblema: texto(false),
  campoObjetivo: texto(false),
  campoPublico: texto(false),
  campoEntorno: texto(false),
  campoMvp: texto(false),
  campoFuturo: texto(false),
  campoRestricciones: texto(false),
  campoRoles: texto(false),
  campoFlujos: texto(false),
  campoEntidades: texto(false),
  campoPantallas: texto(false),
  campoNavegacion: texto(false),
  campoDispositivos: texto(false),
  campoManejoOffline: texto(false)
};

var HERRAMIENTAS_AGENTES = congelarProfundo({
  consultar_estado_proyecto: {
    nombre: 'consultar_estado_proyecto',
    descripcion: 'Lee el nombre, los conteos y un resumen del proyecto activo. No escribe nada.',
    categoria: 'consulta',
    nivelRiesgo: 'BAJO',
    requiereAprobacion: false,
    puedeModificarArquitectura: false,
    puedeEscribirDatos: false,
    puedeGenerarCodigo: false,
    puedeEliminarDatos: false,
    habilitada: true,
    cambiosPrevistos: 'Ninguno. Es una lectura del proyecto activo.',
    argumentos: {}
  },
  modificar_campos_proyecto: {
    nombre: 'modificar_campos_proyecto',
    descripcion: 'Actualiza campos de la especificación arquitectónica del proyecto activo.',
    categoria: 'especificacion',
    nivelRiesgo: 'ALTO',
    requiereAprobacion: true,
    puedeModificarArquitectura: true,
    puedeEscribirDatos: true,
    puedeGenerarCodigo: false,
    puedeEliminarDatos: false,
    habilitada: true,
    cambiosPrevistos: 'Textos de problema, objetivo, alcance, actores, flujos, pantallas y restricciones del proyecto activo.',
    argumentos: CAMPOS_PROYECTO_AGENTE
  },
  agregar_entidades_er: {
    nombre: 'agregar_entidades_er',
    descripcion: 'Agrega entidades al modelo entidad-relación del proyecto activo.',
    categoria: 'datos',
    nivelRiesgo: 'ALTO',
    requiereAprobacion: true,
    puedeModificarArquitectura: true,
    puedeEscribirDatos: true,
    puedeGenerarCodigo: false,
    puedeEliminarDatos: false,
    habilitada: true,
    cambiosPrevistos: 'Lista de entidades y campos del modelo de datos del proyecto activo.',
    argumentos: {
      entidades: listaDe({
        nombre: texto(true),
        campos: texto(true)
      }, true)
    }
  },
  registrar_decisiones_adr: {
    nombre: 'registrar_decisiones_adr',
    descripcion: 'Registra decisiones de arquitectura (ADR) en el proyecto activo.',
    categoria: 'decisiones',
    nivelRiesgo: 'ALTO',
    requiereAprobacion: true,
    puedeModificarArquitectura: true,
    puedeEscribirDatos: true,
    puedeGenerarCodigo: false,
    puedeEliminarDatos: false,
    habilitada: true,
    cambiosPrevistos: 'Nuevas decisiones ADR del proyecto activo.',
    argumentos: {
      decisiones: listaDe({
        titulo: texto(true),
        problema: texto(true),
        opciones: texto(false),
        motivo: texto(true),
        fecha: texto(false)
      }, true)
    }
  },
  configurar_ecosistema_topologia: {
    nombre: 'configurar_ecosistema_topologia',
    descripcion: 'Fija el tipo de arquitectura técnica del proyecto activo.',
    categoria: 'configuracion',
    nivelRiesgo: 'ALTO',
    requiereAprobacion: true,
    puedeModificarArquitectura: true,
    puedeEscribirDatos: true,
    puedeGenerarCodigo: false,
    puedeEliminarDatos: false,
    habilitada: true,
    cambiosPrevistos: 'Selector de topología del proyecto activo.',
    argumentos: {
      tipo_ecosistema: enumerado(['web_appsscript', 'web_laravel', 'movil_apk', 'iot_mqtt', 'hibrido'], true)
    }
  },
  configurar_tarea_programacion: {
    nombre: 'configurar_tarea_programacion',
    descripcion: 'Rellena la tarea, los archivos, los criterios y la prueba del generador de prompts.',
    categoria: 'preparacion',
    nivelRiesgo: 'MEDIO',
    requiereAprobacion: true,
    puedeModificarArquitectura: false,
    puedeEscribirDatos: true,
    puedeGenerarCodigo: false,
    puedeEliminarDatos: false,
    habilitada: true,
    cambiosPrevistos: 'Campos del generador de prompts. No modifica código ni la gobernanza.',
    argumentos: {
      tarea: texto(true),
      archivos: texto(true),
      criterios: texto(true),
      prueba_verificacion: texto(true)
    }
  },
  generar_codigo_fuente: {
    nombre: 'generar_codigo_fuente',
    descripcion: 'Muestra código generado en el visor. No lo escribe en disco ni en el servidor.',
    categoria: 'codigo',
    nivelRiesgo: 'ALTO',
    requiereAprobacion: true,
    puedeModificarArquitectura: false,
    puedeEscribirDatos: false,
    puedeGenerarCodigo: true,
    puedeEliminarDatos: false,
    habilitada: true,
    cambiosPrevistos: 'Contenido visible del visor de código. El disco y las hojas no cambian por esta herramienta.',
    argumentos: {
      nombre_archivo: texto(true),
      lenguaje: texto(false),
      codigo: texto(true),
      explicacion: texto(false)
    }
  },
  eliminar_datos_proyecto: {
    nombre: 'eliminar_datos_proyecto',
    descripcion: 'Operación destructiva de borrado. Queda bloqueada por riesgo crítico.',
    categoria: 'destructivo',
    nivelRiesgo: 'CRITICO',
    requiereAprobacion: true,
    puedeModificarArquitectura: true,
    puedeEscribirDatos: true,
    puedeGenerarCodigo: false,
    puedeEliminarDatos: true,
    habilitada: true,
    cambiosPrevistos: 'Ninguno: la gobernanza bloquea esta herramienta antes de ejecutarla.',
    argumentos: {
      proyectoId: texto(true)
    }
  },
  modificar_permisos_agente: {
    nombre: 'modificar_permisos_agente',
    descripcion: 'Intentaría cambiar el catálogo de permisos. Queda bloqueada.',
    categoria: 'gobernanza',
    nivelRiesgo: 'CRITICO',
    requiereAprobacion: true,
    puedeModificarArquitectura: true,
    puedeEscribirDatos: true,
    puedeGenerarCodigo: false,
    puedeEliminarDatos: false,
    habilitada: true,
    cambiosPrevistos: 'Ninguno: ARCHITEX no permite que el agente reescriba sus permisos.',
    argumentos: {
      confirmacion: texto(true)
    }
  },
  alterar_credenciales_ia: {
    nombre: 'alterar_credenciales_ia',
    descripcion: 'Intentaría cambiar credenciales de IA. Queda bloqueada.',
    categoria: 'credenciales',
    nivelRiesgo: 'CRITICO',
    requiereAprobacion: true,
    puedeModificarArquitectura: false,
    puedeEscribirDatos: true,
    puedeGenerarCodigo: false,
    puedeEliminarDatos: false,
    habilitada: true,
    cambiosPrevistos: 'Ninguno: las credenciales siguen solo en PropertiesService.',
    argumentos: {
      clave: texto(true)
    }
  },
  consulta_deshabilitada: {
    nombre: 'consulta_deshabilitada',
    descripcion: 'Herramienta apagada a propósito. Sirve para negar llamadas aunque el nombre exista.',
    categoria: 'consulta',
    nivelRiesgo: 'BAJO',
    requiereAprobacion: false,
    puedeModificarArquitectura: false,
    puedeEscribirDatos: false,
    puedeGenerarCodigo: false,
    puedeEliminarDatos: false,
    habilitada: false,
    cambiosPrevistos: 'Ninguno.',
    argumentos: {}
  }
});

function etiquetaRiesgoAgente(nivel) {
  if (nivel === 'BAJO') return '🟢 BAJO';
  if (nivel === 'MEDIO') return '🟡 MEDIO';
  if (nivel === 'ALTO') return '🟠 ALTO';
  if (nivel === 'CRITICO') return '🔴 CRÍTICO';
  return String(nivel || 'DESCONOCIDO');
}

function generarIdGobernanza(prefijo) {
  return prefijo + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

function esObjetoPlano(valor) {
  return !!valor && typeof valor === 'object' && !Array.isArray(valor);
}

function redactarTextoAuditoria(textoEntrada) {
  return String(textoEntrada || '')
    .replace(/sk-[a-zA-Z0-9_\-]{6,}/g, '[secreto omitido]')
    .replace(/Bearer\s+[a-zA-Z0-9_\-.]{8,}/gi, 'Bearer [secreto omitido]');
}

function resumirArgumentosAuditoria(argumentos) {
  var copia;
  try {
    copia = JSON.parse(JSON.stringify(argumentos || {}));
  } catch (error) {
    return '[argumentos no serializables]';
  }
  function caminar(nodo) {
    if (Array.isArray(nodo)) {
      nodo.forEach(caminar);
      return;
    }
    if (!esObjetoPlano(nodo)) return;
    Object.keys(nodo).forEach(function (clave) {
      var lower = clave.toLowerCase();
      if (lower === 'codigo' && typeof nodo[clave] === 'string') {
        nodo[clave] = '[codigo omitido, ' + nodo[clave].length + ' caracteres]';
        return;
      }
      if (/clave|api[_-]?key|token|secret|password|authorization|credencial/.test(lower)) {
        nodo[clave] = '[secreto omitido]';
        return;
      }
      if (typeof nodo[clave] === 'string') nodo[clave] = redactarTextoAuditoria(nodo[clave]);
      else caminar(nodo[clave]);
    });
  }
  caminar(copia);
  var serializado = redactarTextoAuditoria(JSON.stringify(copia));
  if (serializado.length > 800) return serializado.slice(0, 800) + '…';
  return serializado;
}

function recorrerArbol(valor, visitante, ruta) {
  if (Array.isArray(valor)) {
    valor.forEach(function (item, indice) {
      recorrerArbol(item, visitante, ruta + '[' + indice + ']');
    });
    return;
  }
  if (!esObjetoPlano(valor)) return;
  Object.keys(valor).forEach(function (clave) {
    visitante(clave, valor[clave], ruta);
    recorrerArbol(valor[clave], visitante, ruta ? ruta + '.' + clave : clave);
  });
}

function contieneInyeccionGobernanza(valor) {
  var hallado = false;
  function revisarTexto(textoValor) {
    var plano = String(textoValor || '');
    for (var i = 0; i < PATRONES_INYECCION_GOBERNANZA.length; i++) {
      if (PATRONES_INYECCION_GOBERNANZA[i].test(plano)) hallado = true;
    }
  }
  revisarTexto(typeof valor === 'string' ? valor : '');
  function visitar(clave, contenido) {
    revisarTexto(clave);
    if (typeof contenido === 'string') revisarTexto(contenido);
  }
  if (esObjetoPlano(valor) || Array.isArray(valor)) recorrerArbol(valor, visitar, '');
  return hallado;
}

function respuestaGobernanza(estado, decision, motivo, extra) {
  var base = {
    estado: estado,
    decision: decision,
    motivo: motivo,
    mutacionReal: false
  };
  if (extra) {
    Object.keys(extra).forEach(function (clave) { base[clave] = extra[clave]; });
  }
  return base;
}

function validarContratoArgumentos(contrato, argumentos, ruta) {
  if (!esObjetoPlano(argumentos)) {
    return 'Los argumentos de ' + (ruta || 'la herramienta') + ' deben ser un objeto.';
  }
  var permitidas = contrato || {};
  var claves = Object.keys(argumentos);
  for (var i = 0; i < claves.length; i++) {
    if (!Object.prototype.hasOwnProperty.call(permitidas, claves[i])) {
      return 'Argumento no permitido: ' + (ruta ? ruta + '.' : '') + claves[i];
    }
  }
  var nombres = Object.keys(permitidas);
  for (var j = 0; j < nombres.length; j++) {
    var nombre = nombres[j];
    var regla = permitidas[nombre];
    var presente = Object.prototype.hasOwnProperty.call(argumentos, nombre);
    if (!presente) {
      if (regla.obligatorio) return 'Falta el argumento obligatorio: ' + nombre;
      continue;
    }
    var valor = argumentos[nombre];
    if (regla.tipo === 'texto') {
      if (typeof valor !== 'string') return 'El argumento ' + nombre + ' debe ser texto.';
      if (regla.obligatorio && !valor.trim()) return 'El argumento ' + nombre + ' no puede estar vacío.';
      if (valor.length > 200000) return 'El argumento ' + nombre + ' excede el tamaño permitido.';
    } else if (regla.tipo === 'enum') {
      if (typeof valor !== 'string' || regla.valores.indexOf(valor) === -1) {
        return 'Valor no permitido para ' + nombre + '.';
      }
    } else if (regla.tipo === 'lista') {
      if (!Array.isArray(valor)) return 'El argumento ' + nombre + ' debe ser una lista.';
      for (var k = 0; k < valor.length; k++) {
        var errorItem = validarContratoArgumentos(regla.esquema, valor[k], nombre + '[' + k + ']');
        if (errorItem) return errorItem;
      }
    } else {
      return 'Contrato de argumento desconocido: ' + nombre;
    }
  }
  return '';
}

function validarSolicitudHerramientaAgente(solicitud) {
  var pedido = solicitud || {};
  var nombre = typeof pedido.nombre === 'string' ? pedido.nombre : '';
  var argumentos = pedido.argumentos;
  var motivo = typeof pedido.motivo === 'string' ? pedido.motivo : '';
  var proyectoIdContexto = pedido.proyectoIdContexto ? String(pedido.proyectoIdContexto) : 'sesion_local';

  if (contieneInyeccionGobernanza(nombre) || contieneInyeccionGobernanza(motivo) || contieneInyeccionGobernanza(argumentos)) {
    return respuestaGobernanza('DENEGADA', 'DENEGAR', 'Intento de modificar la gobernanza mediante contenido no confiable.', {
      nombre: nombre,
      nivelRiesgo: '',
      proyectoId: proyectoIdContexto
    });
  }

  if (!Object.prototype.hasOwnProperty.call(HERRAMIENTAS_AGENTES, nombre)) {
    return respuestaGobernanza('DENEGADA', 'DENEGAR', 'La herramienta no existe en HERRAMIENTAS_AGENTES.', {
      nombre: nombre,
      nivelRiesgo: '',
      proyectoId: proyectoIdContexto
    });
  }

  var herramienta = HERRAMIENTAS_AGENTES[nombre];

  if (argumentos === undefined || argumentos === null) {
    return respuestaGobernanza('DENEGADA', 'DENEGAR', 'La solicitud no incluye argumentos.', {
      nombre: nombre,
      nivelRiesgo: herramienta.nivelRiesgo,
      etiquetaRiesgo: etiquetaRiesgoAgente(herramienta.nivelRiesgo),
      proyectoId: proyectoIdContexto,
      descripcion: herramienta.descripcion,
      cambiosPrevistos: herramienta.cambiosPrevistos
    });
  }

  var bypass = false;
  var fueraDeAmbito = false;
  if (esObjetoPlano(argumentos) || Array.isArray(argumentos)) {
    recorrerArbol(argumentos, function (clave, valor) {
      if (CLAVES_BYPASS_PROHIBIDAS.indexOf(clave) !== -1) bypass = true;
      if (CLAVES_AMBITO_PROYECTO.indexOf(clave) !== -1 && String(valor) !== proyectoIdContexto) {
        fueraDeAmbito = true;
      }
    }, '');
  }
  if (bypass) {
    return respuestaGobernanza('DENEGADA', 'DENEGAR', 'Intento de bypass: argumento fuera del contrato de la herramienta.', {
      nombre: nombre,
      nivelRiesgo: herramienta.nivelRiesgo,
      etiquetaRiesgo: etiquetaRiesgoAgente(herramienta.nivelRiesgo),
      proyectoId: proyectoIdContexto
    });
  }
  if (fueraDeAmbito) {
    return respuestaGobernanza('DENEGADA', 'DENEGAR', 'La herramienta solo puede operar sobre el proyecto de la misión.', {
      nombre: nombre,
      nivelRiesgo: herramienta.nivelRiesgo,
      etiquetaRiesgo: etiquetaRiesgoAgente(herramienta.nivelRiesgo),
      proyectoId: proyectoIdContexto
    });
  }

  var errorContrato = validarContratoArgumentos(herramienta.argumentos, argumentos, '');
  if (errorContrato) {
    return respuestaGobernanza('DENEGADA', 'DENEGAR', errorContrato, {
      nombre: nombre,
      nivelRiesgo: herramienta.nivelRiesgo,
      etiquetaRiesgo: etiquetaRiesgoAgente(herramienta.nivelRiesgo),
      proyectoId: proyectoIdContexto,
      descripcion: herramienta.descripcion
    });
  }

  var comun = {
    idDecision: generarIdGobernanza('dec'),
    nombre: herramienta.nombre,
    descripcion: herramienta.descripcion,
    nivelRiesgo: herramienta.nivelRiesgo,
    etiquetaRiesgo: etiquetaRiesgoAgente(herramienta.nivelRiesgo),
    proyectoId: proyectoIdContexto,
    cambiosPrevistos: herramienta.cambiosPrevistos,
    argumentosResumidos: resumirArgumentosAuditoria(argumentos),
    motivoAgente: motivo || 'Solicitud de tool calling sin motivo textual.'
  };

  if (!herramienta.habilitada) {
    return respuestaGobernanza('DENEGADA', 'DENEGAR', 'La herramienta está deshabilitada.', comun);
  }
  if (herramienta.nivelRiesgo === 'CRITICO') {
    var bloqueo = respuestaGobernanza('BLOQUEADA', 'BLOQUEAR', 'Riesgo crítico: no existe una aprobación que autorice esta ejecución.', comun);
    _decisionesGobernanza[bloqueo.idDecision] = {
      nombre: herramienta.nombre,
      decision: 'BLOQUEAR',
      nivelRiesgo: herramienta.nivelRiesgo,
      consumida: false
    };
    return bloqueo;
  }
  if (herramienta.nivelRiesgo === 'ALTO' || herramienta.nivelRiesgo === 'MEDIO' || herramienta.requiereAprobacion) {
    var aprobacion = respuestaGobernanza('REQUIERE_APROBACION', 'APROBACION', 'La herramienta requiere aprobación humana.', comun);
    _decisionesGobernanza[aprobacion.idDecision] = {
      nombre: herramienta.nombre,
      decision: 'APROBACION',
      nivelRiesgo: herramienta.nivelRiesgo,
      consumida: false
    };
    return aprobacion;
  }
  if (herramienta.nivelRiesgo === 'BAJO') {
    var ejecucion = respuestaGobernanza('VALIDADA', 'EJECUTAR', 'Riesgo bajo: ejecución automática permitida.', comun);
    _decisionesGobernanza[ejecucion.idDecision] = {
      nombre: herramienta.nombre,
      decision: 'EJECUTAR',
      nivelRiesgo: herramienta.nivelRiesgo,
      consumida: false
    };
    return ejecucion;
  }
  return respuestaGobernanza('DENEGADA', 'DENEGAR', 'Nivel de riesgo no reconocido.', comun);
}

function cerrarDecisionGobernanza(idDecision) {
  var decision = _decisionesGobernanza[idDecision];
  if (!decision) return false;
  decision.consumida = true;
  return true;
}

function emitirAutorizacionGobernanza(idDecision, opciones) {
  var decision = _decisionesGobernanza[idDecision];
  var modoSimulacion = !!(opciones && opciones.modoSimulacion === true);
  var decisionHumana = opciones && opciones.decisionHumana;
  if (!decision || decision.consumida) return null;
  decision.consumida = true;
  if (decision.decision === 'DENEGAR' || decision.decision === 'BLOQUEAR') return null;
  if (decision.nivelRiesgo === 'CRITICO') return null;
  if (decision.decision === 'APROBACION' && !modoSimulacion && decisionHumana !== 'APROBAR') return null;
  if (decision.decision !== 'EJECUTAR' && decision.decision !== 'APROBACION') return null;
  var token = generarIdGobernanza('tok');
  _tokensGobernanza[token] = {
    nombre: decision.nombre,
    modoSimulacion: modoSimulacion,
    usada: false
  };
  return token;
}

function consumirAutorizacionGobernanza(token, nombre) {
  var registro = token ? _tokensGobernanza[token] : null;
  if (!registro || registro.usada || registro.nombre !== nombre) {
    return { valida: false, modoSimulacion: false };
  }
  registro.usada = true;
  return { valida: true, modoSimulacion: registro.modoSimulacion === true };
}

function aplicarSiNoEsSimulacion(autorizacion, nombre, mutador) {
  var consumo = consumirAutorizacionGobernanza(autorizacion, nombre);
  if (!consumo.valida) {
    return { aplicado: false, estado: 'DENEGADA', mutacionReal: false, motivo: 'Llamada sin autorización vigente del validador.' };
  }
  if (consumo.modoSimulacion === true) {
    return { aplicado: false, estado: 'SIMULADA', mutacionReal: false, motivo: 'El modo simulación impide la mutación.' };
  }
  var resultado = typeof mutador === 'function' ? mutador() : null;
  return { aplicado: true, estado: 'EJECUTADA', mutacionReal: true, resultado: resultado };
}

function resolverRutaGobernanza(validacion, opciones) {
  var modoSimulacion = !!(opciones && opciones.modoSimulacion === true);
  var decisionHumana = opciones && opciones.decisionHumana;
  if (!validacion) {
    return { estado: 'DENEGADA', ejecutarMutacion: false, mutacionReal: false, cancelarMision: false };
  }
  if (validacion.decision === 'DENEGAR') {
    return { estado: 'DENEGADA', ejecutarMutacion: false, mutacionReal: false, cancelarMision: false, codigo: 'DENEGADA' };
  }
  if (validacion.decision === 'BLOQUEAR') {
    return { estado: 'BLOQUEADA', ejecutarMutacion: false, mutacionReal: false, cancelarMision: false, codigo: 'BLOQUEADA' };
  }
  if (validacion.decision === 'APROBACION') {
    if (modoSimulacion) {
      return {
        estado: 'SIMULADA',
        ejecutarMutacion: false,
        mutacionReal: false,
        cancelarMision: false,
        aprobacionRequerida: true,
        habriaEjecutado: true
      };
    }
    if (decisionHumana === 'RECHAZAR') {
      return { estado: 'RECHAZADA', ejecutarMutacion: false, mutacionReal: false, cancelarMision: false, codigo: 'RECHAZADA_POR_USUARIO' };
    }
    if (decisionHumana === 'CANCELAR_MISION') {
      return { estado: 'CANCELADA', ejecutarMutacion: false, mutacionReal: false, cancelarMision: true };
    }
    if (decisionHumana === 'APROBAR') {
      return { estado: 'EJECUTADA', ejecutarMutacion: true, mutacionReal: true, cancelarMision: false };
    }
    return { estado: 'REQUIERE_APROBACION', ejecutarMutacion: false, mutacionReal: false, pendienteHumano: true, cancelarMision: false };
  }
  if (validacion.decision === 'EJECUTAR') {
    if (modoSimulacion) {
      return { estado: 'SIMULADA', ejecutarMutacion: false, mutacionReal: false, aprobacionRequerida: false, habriaEjecutado: true, cancelarMision: false };
    }
    return { estado: 'EJECUTADA', ejecutarMutacion: true, mutacionReal: true, cancelarMision: false };
  }
  return { estado: 'DENEGADA', ejecutarMutacion: false, mutacionReal: false, cancelarMision: false };
}

function validarLlamadaInterna(nombreOrigen, solicitudDestino) {
  var origen = HERRAMIENTAS_AGENTES[nombreOrigen];
  var destino = validarSolicitudHerramientaAgente(solicitudDestino);
  return {
    revalidada: true,
    bypass: false,
    ejecucionDirecta: false,
    riesgoOrigen: origen ? origen.nivelRiesgo : 'DESCONOCIDO',
    decisionDestino: destino.decision,
    estadoDestino: destino.estado,
    idDecisionDestino: destino.idDecision || ''
  };
}

function intentarAlterarCatalogoDesdeDatosNoConfiables(textoNoConfiable) {
  var catalogoAlterado = false;
  try {
    HERRAMIENTAS_AGENTES.eliminar_datos_proyecto.nivelRiesgo = 'BAJO';
    catalogoAlterado = HERRAMIENTAS_AGENTES.eliminar_datos_proyecto.nivelRiesgo !== 'CRITICO';
  } catch (error) {
    catalogoAlterado = false;
  }
  var validacion = validarSolicitudHerramientaAgente({
    nombre: 'modificar_permisos_agente',
    argumentos: { orden: String(textoNoConfiable || '') },
    motivo: String(textoNoConfiable || ''),
    proyectoIdContexto: 'proyecto_A'
  });
  return {
    estado: 'DENEGADO',
    catalogoAlterado: catalogoAlterado,
    nivelPermaneceCritico: HERRAMIENTAS_AGENTES.eliminar_datos_proyecto.nivelRiesgo === 'CRITICO',
    decisionValidador: validacion.decision,
    estadoValidador: validacion.estado
  };
}

function filtrarHerramientasExpuestasAlModelo(definicion) {
  var lista = Array.isArray(definicion) ? definicion : [];
  return lista.filter(function (item) {
    var nombre = item && item.function && item.function.name;
    var herramienta = nombre ? HERRAMIENTAS_AGENTES[nombre] : null;
    return !!(herramienta && herramienta.habilitada && herramienta.nivelRiesgo !== 'CRITICO');
  });
}

function construirResultadoSimulacion(detalle) {
  var datos = detalle || {};
  return {
    status: 'simulacion',
    estado: 'SIMULADA',
    mutacionReal: false,
    texto: [
      'SIMULACIÓN',
      '',
      'Herramienta:',
      String(datos.nombre || ''),
      '',
      'Riesgo:',
      String(datos.nivelRiesgo || ''),
      '',
      'Aprobación requerida:',
      datos.aprobacionRequerida ? 'SÍ' : 'NO',
      '',
      'Resultado:',
      'La herramienta habría sido ejecutada,',
      'pero la misión está en modo simulación.',
      '',
      'Cambios reales:',
      'NINGUNO'
    ].join('\n')
  };
}

function construirInformeSimulacion(datos) {
  var informe = datos || {};
  function lista(items) {
    var arr = items || [];
    if (!arr.length) return '—';
    return arr.map(function (item, indice) { return (indice + 1) + '. ' + item; }).join('\n');
  }
  return [
    'MISIÓN SIMULADA',
    '',
    'Intención del agente:',
    String(informe.intencion || ''),
    '',
    'Herramientas solicitadas:',
    lista(informe.solicitadas),
    '',
    'Herramientas permitidas:',
    lista(informe.permitidas),
    '',
    'Herramientas que requieren aprobación:',
    lista(informe.requierenAprobacion),
    '',
    'Herramientas bloqueadas:',
    lista(informe.bloqueadas),
    '',
    'Herramientas denegadas:',
    lista(informe.denegadas),
    '',
    'Cambios que HABRÍAN ocurrido:',
    lista(informe.cambiosQueHabrianOcurrido),
    '',
    'Cambios realizados realmente:',
    informe.mutacionReal ? 'SE DETECTÓ UNA MUTACIÓN' : 'NINGUNO'
  ].join('\n');
}

function prepararRegistroAuditoria(registro) {
  var base = registro || {};
  var argumentos = base.argumentos !== undefined ? base.argumentos : base.argumentos_resumidos;
  return {
    id: String(base.id || ''),
    fecha_hora: String(base.fecha_hora || new Date().toISOString()),
    proyecto_id: String(base.proyecto_id || base.proyectoId || ''),
    mision_id: String(base.mision_id || ''),
    herramienta: String(base.herramienta || ''),
    nivel_riesgo: String(base.nivel_riesgo || ''),
    estado: String(base.estado || ''),
    modo: String(base.modo || 'REAL'),
    usuario: String(base.usuario || 'sesion_local'),
    argumentos_resumidos: typeof argumentos === 'string' ? redactarTextoAuditoria(argumentos).slice(0, 800) : resumirArgumentosAuditoria(argumentos),
    motivo: redactarTextoAuditoria(base.motivo || '').slice(0, 500),
    resultado: redactarTextoAuditoria(base.resultado || '').slice(0, 500)
  };
}

function listarCatalogoHerramientasAgente() {
  return Object.keys(HERRAMIENTAS_AGENTES).map(function (nombre) {
    var herramienta = HERRAMIENTAS_AGENTES[nombre];
    return {
      nombre: herramienta.nombre,
      nivelRiesgo: herramienta.nivelRiesgo,
      requiereAprobacion: herramienta.nivelRiesgo === 'MEDIO' || herramienta.nivelRiesgo === 'ALTO' || herramienta.requiereAprobacion === true,
      bloqueada: herramienta.nivelRiesgo === 'CRITICO' || herramienta.habilitada === false,
      habilitada: herramienta.habilitada
    };
  });
}

var CLAVES_OVERRIDE_CLIENTE = Object.freeze([
  'nivelRiesgo', 'riesgo', 'risk',
  'habilitada', 'enabled',
  'requiereAprobacion', 'requiresApproval',
  'catalogo', 'HERRAMIENTAS_AGENTES',
  'puedeModificarArquitectura', 'puedeEscribirDatos', 'puedeGenerarCodigo', 'puedeEliminarDatos',
  'canModifyArchitecture', 'canWriteData', 'canGenerateCode', 'canDeleteData'
]);

function solicitudTraeOverrideDeSeguridad(solicitud) {
  if (!esObjetoPlano(solicitud)) return false;
  var claves = Object.keys(solicitud);
  for (var i = 0; i < claves.length; i++) {
    if (CLAVES_OVERRIDE_CLIENTE.indexOf(claves[i]) !== -1) return true;
  }
  return false;
}

/**
 * Única puerta para un pedido que llegó del navegador.
 * Si el cliente intenta fijar riesgo, permiso o catálogo, se niega.
 * Si no, se delega en validarSolicitudHerramientaAgente, que lee el catálogo de este archivo.
 * @param {Object} solicitud - Pedido del cliente.
 * @return {Object} Decisión del servidor.
 */
function decidirSolicitudHerramientaDesdeCliente(solicitud) {
  if (solicitudTraeOverrideDeSeguridad(solicitud)) {
    return respuestaGobernanza(
      'DENEGADA POR BACKEND',
      'DENEGAR',
      'El navegador intentó fijar riesgo, permiso o catálogo. Esa decisión solo la toma el servidor.',
      { mutacionReal: false }
    );
  }
  var pedido = solicitud || {};
  return validarSolicitudHerramientaAgente({
    nombre: pedido.nombre,
    argumentos: pedido.argumentos,
    motivo: pedido.motivo,
    proyectoIdContexto: pedido.proyectoIdContexto
  });
}

/**
 * Datos de presentación. Omite contratos de argumentos, listas de bypass y patrones de inyección.
 * @return {Object[]} Catálogo visible.
 */
function exponerCatalogoHerramientasParaPresentacion() {
  return Object.keys(HERRAMIENTAS_AGENTES).map(function (nombre) {
    var herramienta = HERRAMIENTAS_AGENTES[nombre];
    return {
      nombre: herramienta.nombre,
      descripcion: herramienta.descripcion,
      categoria: herramienta.categoria,
      nivelRiesgo: herramienta.nivelRiesgo,
      requiereAprobacion: herramienta.requiereAprobacion,
      puedeModificarArquitectura: herramienta.puedeModificarArquitectura,
      puedeEscribirDatos: herramienta.puedeEscribirDatos,
      puedeGenerarCodigo: herramienta.puedeGenerarCodigo,
      puedeEliminarDatos: herramienta.puedeEliminarDatos,
      habilitada: herramienta.habilitada,
      cambiosPrevistos: herramienta.cambiosPrevistos
    };
  });
}

/**
 * Recorre la decisión ya tomada por el validador.
 * El modo simulación no llama a los escritores de proyecto, historial ni ADR.
 * @param {Object} solicitud - Pedido ya inspeccionado.
 * @param {Object} opciones - modoSimulacion y decisionHumana.
 * @param {Object} efectos - Escritores opcionales; el cliente HTTP no puede enviarlos.
 * @return {Object} Estado visible y contadores de escritura.
 */
function ejecutarRutaSeguraHerramienta(solicitud, opciones, efectos) {
  var opts = opciones || {};
  var fx = efectos || {};
  var conteo = { proyecto: 0, historial: 0, adr: 0, auditoria: 0 };
  var decision = decidirSolicitudHerramientaDesdeCliente(solicitud);
  if (decision.estado === 'DENEGADA POR BACKEND') {
    return {
      estado: 'DENEGADA POR BACKEND',
      estadoInterno: decision.estado,
      mutacionReal: false,
      escrituras: conteo,
      decision: decision
    };
  }
  var ruta = resolverRutaGobernanza(decision, opts);
  var simula = opts.modoSimulacion === true;
  if (!simula && ruta.ejecutarMutacion === true) {
    if (typeof fx.escribirProyecto === 'function') {
      fx.escribirProyecto();
      conteo.proyecto += 1;
    }
    if (typeof fx.escribirHistorial === 'function') {
      fx.escribirHistorial();
      conteo.historial += 1;
    }
    if (typeof fx.escribirAdr === 'function') {
      fx.escribirAdr();
      conteo.adr += 1;
    }
    if (typeof fx.escribirAuditoria === 'function') {
      fx.escribirAuditoria();
      conteo.auditoria += 1;
    }
  }
  var registroPreparado = prepararRegistroAuditoria({
    herramienta: decision.nombre || '',
    nivel_riesgo: decision.nivelRiesgo || '',
    estado: ruta.estado,
    modo: simula ? 'SIMULACION' : 'REAL',
    proyecto_id: decision.proyectoId || '',
    resultado: ruta.mutacionReal && !simula ? 'mutacion' : 'sin mutacion'
  });
  var visible = ruta.estado;
  if (simula) visible = 'SIN MUTACIÓN REAL';
  else if (ruta.estado === 'REQUIERE_APROBACION') visible = 'APROBACIÓN HUMANA';
  else if (ruta.estado === 'EJECUTADA') visible = 'EJECUTADA';
  else if (ruta.estado === 'BLOQUEADA') visible = 'BLOQUEADA';
  else if (ruta.estado === 'DENEGADA') visible = 'DENEGADA';
  return {
    estado: visible,
    estadoInterno: ruta.estado,
    mutacionReal: ruta.mutacionReal === true && !simula,
    escrituras: conteo,
    registroPreparado: registroPreparado,
    decision: decision
  };
}

/**
 * Anexa una fila de auditoría bajo un lock ya compatible con tryLock/releaseLock.
 * Sirve para probar que dos escrituras no se pisan. En Apps Script el lock real es LockService.
 * @param {Object[]} tabla - Destino en memoria.
 * @param {Object} registro - Campos de auditoría.
 * @param {Object} lock - Adaptador con tryLock y releaseLock.
 * @param {number} esperaMs - Tiempo de espera.
 * @return {Object} Resultado de la escritura.
 */
function anexarAuditoriaBajoLock(tabla, registro, lock, esperaMs) {
  var adquirido = lock && lock.tryLock(esperaMs || 30000);
  if (!adquirido) {
    return { exito: false, mensaje: 'No se pudo adquirir el lock de auditoría.' };
  }
  try {
    var fila = prepararRegistroAuditoria(registro);
    if (!fila.id) fila.id = 'acc_' + (tabla.length + 1) + '_' + Date.now().toString(36);
    var duplicado = tabla.some(function (existente) { return existente.id === fila.id; });
    if (duplicado) return { exito: false, mensaje: 'Identificador de auditoría duplicado.' };
    tabla.push(fila);
    return { exito: true, id: fila.id, total: tabla.length };
  } finally {
    lock.releaseLock();
  }
}

var VIGENCIA_DECISION_MS = 10 * 60 * 1000;

function canonizarParaFirma(valor) {
  if (Array.isArray(valor)) return valor.map(canonizarParaFirma);
  if (esObjetoPlano(valor)) {
    var salida = {};
    Object.keys(valor).sort().forEach(function (clave) {
      salida[clave] = canonizarParaFirma(valor[clave]);
    });
    return salida;
  }
  return valor;
}

function firmaArgumentosAgente(argumentos) {
  return JSON.stringify(canonizarParaFirma(argumentos || {}));
}

function construirDecisionPendiente(validacion, pedido) {
  return {
    idDecision: validacion.idDecision,
    herramienta: validacion.nombre,
    argumentosCanon: firmaArgumentosAgente(pedido.argumentos),
    proyectoId: String(pedido.proyectoIdContexto || ''),
    riesgo: validacion.nivelRiesgo,
    fechaCreacion: Date.now(),
    estado: 'PENDIENTE',
    usada: false
  };
}

function motivoDecisionInservible(guardada, pedido, ahora, vigenciaMs, validacion) {
  if (!pedido.idDecision) return 'Falta idDecision. APROBAR sin la decisión guardada no autoriza la ejecución.';
  if (!guardada) return 'No existe una decisión pendiente con ese identificador.';
  if (guardada.usada === true || guardada.estado === 'USADA') return 'Esa aprobación ya fue utilizada.';
  if ((ahora || Date.now()) - Number(guardada.fechaCreacion || 0) > (vigenciaMs || VIGENCIA_DECISION_MS)) {
    return 'La aprobación venció.';
  }
  if (guardada.herramienta !== pedido.nombre) return 'La herramienta no coincide con la decisión aprobada.';
  if (guardada.argumentosCanon !== firmaArgumentosAgente(pedido.argumentos)) return 'Los argumentos no coinciden con la decisión aprobada.';
  if (String(guardada.proyectoId || '') !== String(pedido.proyectoIdContexto || '')) return 'El proyecto no coincide con la decisión aprobada.';
  if (guardada.riesgo === 'CRITICO') return 'Una decisión crítica no puede ejecutarse.';
  if (validacion && guardada.riesgo !== validacion.nivelRiesgo) return 'El riesgo de la herramienta cambió desde la aprobación.';
  if (validacion && validacion.nombre && guardada.herramienta !== validacion.nombre) return 'La herramienta validada no coincide con la decisión.';
  return '';
}

function aplicarCambioHerramientaEnProyecto(nombre, argumentos, proyecto) {
  var copia = JSON.parse(JSON.stringify(proyecto || {}));
  var args = argumentos || {};
  if (nombre === 'consultar_estado_proyecto') {
    return {
      persistir: false,
      resultado: {
        nombreProyecto: copia.nombreProyecto || '',
        entidades: (copia.entidadesRegistradas || []).length,
        decisiones: (copia.decisionesRegistradas || []).length
      }
    };
  }
  if (nombre === 'modificar_campos_proyecto') {
    var cambiados = 0;
    Object.keys(CAMPOS_PROYECTO_AGENTE).forEach(function (campo) {
      if (typeof args[campo] === 'string') {
        copia[campo] = args[campo];
        cambiados += 1;
      }
    });
    return { persistir: true, proyecto: copia, resultado: { campos_modificados: cambiados } };
  }
  if (nombre === 'agregar_entidades_er') {
    copia.entidadesRegistradas = copia.entidadesRegistradas || [];
    var agregadas = 0;
    (args.entidades || []).forEach(function (item) {
      if (!item || !item.nombre || !item.campos) return;
      var ya = copia.entidadesRegistradas.some(function (existente) {
        return String(existente.nombre || '').toLowerCase() === String(item.nombre).toLowerCase();
      });
      if (!ya) {
        copia.entidadesRegistradas.push({ nombre: String(item.nombre).trim(), campos: String(item.campos).trim() });
        agregadas += 1;
      }
    });
    return { persistir: true, proyecto: copia, resultado: { entidades_agregadas: agregadas } };
  }
  if (nombre === 'registrar_decisiones_adr') {
    copia.decisionesRegistradas = copia.decisionesRegistradas || [];
    var nuevas = 0;
    (args.decisiones || []).forEach(function (decision) {
      if (!decision || !decision.titulo || !decision.problema || !decision.motivo) return;
      copia.decisionesRegistradas.push({
        titulo: String(decision.titulo).trim(),
        problema: String(decision.problema).trim(),
        opciones: String(decision.opciones || '').trim(),
        motivo: String(decision.motivo).trim(),
        fecha: decision.fecha || ''
      });
      nuevas += 1;
    });
    return { persistir: true, proyecto: copia, resultado: { decisiones_agregadas: nuevas } };
  }
  if (nombre === 'configurar_ecosistema_topologia') {
    copia.selectorTipoProyecto = args.tipo_ecosistema;
    return { persistir: true, proyecto: copia, resultado: { ecosistema_establecido: args.tipo_ecosistema } };
  }
  if (nombre === 'configurar_tarea_programacion') {
    copia.promptTareaEspecifica = args.tarea;
    copia.promptArchivos = args.archivos;
    copia.promptCriteriosAceptacion = args.criterios;
    copia.promptVerificacion = args.prueba_verificacion;
    return { persistir: true, proyecto: copia, resultado: { tarea_configurada: true } };
  }
  if (nombre === 'generar_codigo_fuente') {
    return {
      persistir: false,
      resultado: {
        nombre_archivo: args.nombre_archivo,
        longitud_caracteres: String(args.codigo || '').length,
        explicacion: args.explicacion || ''
      }
    };
  }
  throw new Error('No hay ejecución de servidor para la herramienta ' + nombre + '.');
}

function auditarOperacionAgente(servicios, validacion, pedido, estado, modo, resultado) {
  if (!servicios || typeof servicios.escribirAuditoria !== 'function') return;
  servicios.escribirAuditoria(prepararRegistroAuditoria({
    proyecto_id: pedido.proyectoIdContexto || '',
    herramienta: (validacion && validacion.nombre) || pedido.nombre || '',
    nivel_riesgo: (validacion && validacion.nivelRiesgo) || '',
    estado: estado,
    modo: modo,
    argumentos: pedido.argumentos,
    motivo: pedido.motivo || '',
    resultado: typeof resultado === 'string' ? resultado : JSON.stringify(resultado || {})
  }));
}

/**
 * Única aplicación de una herramienta ya gobernada.
 * Valida de nuevo, exige idDecision para aprobar, ejecuta en el servidor y audita el hecho.
 * El navegador no recibe un permiso para mutar por su cuenta.
 * @param {Object} solicitud - Pedido del cliente, sin riesgo ni catálogo.
 * @param {Object} servicios - Lectura, escritura, decisiones y candado.
 * @return {Object} Estado real de la operación.
 */
function aplicarHerramientaAgenteAutorizadaNucleo(solicitud, servicios) {
  var pedido = solicitud || {};
  var deps = servicios || {};
  var escrituras = { proyecto: 0, historial: 0, adr: 0, auditoria: 0 };
  if (solicitudTraeOverrideDeSeguridad(pedido)) {
    return { estado: 'DENEGADA', mutacionReal: false, escrituras: escrituras, motivo: 'El navegador intentó fijar riesgo, permiso o catálogo.' };
  }
  var modoSimulacion = pedido.modoSimulacion === true;
  function trabajo() {
    var validacion = validarSolicitudHerramientaAgente({
      nombre: pedido.nombre,
      argumentos: pedido.argumentos,
      motivo: pedido.motivo,
      proyectoIdContexto: pedido.proyectoIdContexto
    });
    if (validacion.decision === 'DENEGAR') {
      return { estado: 'DENEGADA', mutacionReal: false, escrituras: escrituras, motivo: validacion.motivo, decision: validacion };
    }
    if (validacion.decision === 'BLOQUEAR') {
      return { estado: 'BLOQUEADA', mutacionReal: false, escrituras: escrituras, motivo: validacion.motivo, decision: validacion };
    }
    if (modoSimulacion) {
      return {
        estado: 'SIN MUTACIÓN REAL',
        mutacionReal: false,
        escrituras: escrituras,
        explicacion: 'SIMULACIÓN — NO SE REALIZARÁN CAMBIOS REALES',
        decision: validacion
      };
    }
    if (validacion.decision === 'APROBACION' && pedido.decisionHumana !== 'APROBAR') {
      var pendiente = construirDecisionPendiente(validacion, pedido);
      if (typeof deps.guardarDecision === 'function') deps.guardarDecision(pendiente.idDecision, pendiente);
      return {
        estado: 'APROBACIÓN HUMANA',
        idDecision: pendiente.idDecision,
        mutacionReal: false,
        escrituras: escrituras,
        decision: validacion
      };
    }
    if (validacion.decision === 'APROBACION' && pedido.decisionHumana === 'APROBAR') {
      var guardada = typeof deps.leerDecision === 'function' ? deps.leerDecision(pedido.idDecision) : null;
      var motivo = motivoDecisionInservible(guardada, pedido, typeof deps.ahora === 'function' ? deps.ahora() : Date.now(), deps.vigenciaMs, validacion);
      if (motivo) return { estado: 'DENEGADA', mutacionReal: false, escrituras: escrituras, motivo: motivo };
      guardada.usada = true;
      guardada.estado = 'USADA';
      deps.guardarDecision(guardada.idDecision, guardada);
    }
    var proyecto = typeof deps.leerProyecto === 'function' ? deps.leerProyecto(pedido.proyectoIdContexto) : null;
    if (!proyecto || !proyecto.idProyecto) {
      auditarOperacionAgente(deps, validacion, pedido, 'ERROR', 'REAL', 'No existe el proyecto en el servidor.');
      escrituras.auditoria += 1;
      return { estado: 'ERROR', mutacionReal: false, escrituras: escrituras, motivo: 'No existe el proyecto en el servidor.' };
    }
    try {
      var cambio = aplicarCambioHerramientaEnProyecto(validacion.nombre, pedido.argumentos, proyecto);
      if (cambio.persistir) {
        if (typeof deps.escribirProyecto !== 'function') throw new Error('No hay escritor de proyecto en el servidor.');
        cambio.proyecto.idProyecto = proyecto.idProyecto;
        deps.escribirProyecto(cambio.proyecto);
        escrituras.proyecto += 1;
      }
      auditarOperacionAgente(deps, validacion, pedido, 'EJECUTADA', 'REAL', cambio.resultado);
      escrituras.auditoria += 1;
      return {
        estado: 'EJECUTADA',
        mutacionReal: cambio.persistir === true,
        escrituras: escrituras,
        resultado: cambio.resultado,
        herramienta: validacion.nombre,
        proyectoId: proyecto.idProyecto,
        proyectoActualizado: cambio.persistir === true ? cambio.proyecto : null
      };
    } catch (error) {
      auditarOperacionAgente(deps, validacion, pedido, 'ERROR', 'REAL', error.message);
      escrituras.auditoria += 1;
      return { estado: 'ERROR', mutacionReal: false, escrituras: escrituras, motivo: error.message };
    }
  }
  if (typeof deps.conLock === 'function') return deps.conLock(trabajo);
  return trabajo();
}

var API_GOBERNANZA_AGENTE = {
  HERRAMIENTAS_AGENTES: HERRAMIENTAS_AGENTES,
  validarSolicitudHerramientaAgente: validarSolicitudHerramientaAgente,
  resolverRutaGobernanza: resolverRutaGobernanza,
  emitirAutorizacionGobernanza: emitirAutorizacionGobernanza,
  aplicarSiNoEsSimulacion: aplicarSiNoEsSimulacion,
  validarLlamadaInterna: validarLlamadaInterna,
  intentarAlterarCatalogoDesdeDatosNoConfiables: intentarAlterarCatalogoDesdeDatosNoConfiables,
  filtrarHerramientasExpuestasAlModelo: filtrarHerramientasExpuestasAlModelo,
  construirResultadoSimulacion: construirResultadoSimulacion,
  construirInformeSimulacion: construirInformeSimulacion,
  prepararRegistroAuditoria: prepararRegistroAuditoria,
  listarCatalogoHerramientasAgente: listarCatalogoHerramientasAgente,
  cerrarDecisionGobernanza: cerrarDecisionGobernanza,
  etiquetaRiesgoAgente: etiquetaRiesgoAgente,
  decidirSolicitudHerramientaDesdeCliente: decidirSolicitudHerramientaDesdeCliente,
  exponerCatalogoHerramientasParaPresentacion: exponerCatalogoHerramientasParaPresentacion,
  ejecutarRutaSeguraHerramienta: ejecutarRutaSeguraHerramienta,
  anexarAuditoriaBajoLock: anexarAuditoriaBajoLock,
  aplicarHerramientaAgenteAutorizadaNucleo: aplicarHerramientaAgenteAutorizadaNucleo,
  firmaArgumentosAgente: firmaArgumentosAgente
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = API_GOBERNANZA_AGENTE;
}
