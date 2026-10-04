/**
 * ============================================================================
 * ARCHITEX OS - Punto de Entrada del Web App
 * ----------------------------------------------------------------------------
 * Archivo: Codigo.gs
 * Propósito: doGet, doPost, include() para plantillas HTML y enrutador principal.
 * Runtime: Google Apps Script (V8)
 * ============================================================================
 */

// ============================================================================
// CONSTANTES GLOBALES DEL SISTEMA
// ============================================================================

/** Nombre de la hoja de cálculo maestra que actúa como base de datos estructurada. */
const NOMBRE_HOJA_MAESTRA = 'ARCHITEX_OS_DB';

/** Nombres canónicos de las pestañas (tablas) del modelo ER. */
const TABLA_PROYECTOS = '_ARCHITEX_PROYECTOS';
const TABLA_HISTORIAL = '_ARCHITEX_HISTORIAL';
const TABLA_META = '_ARCHITEX_META';
const TABLA_DECISIONES_ADR = 'Decisiones_ADR';
const TABLA_DIRECTRICES_RSC = 'DirectricesRSC';
const TABLA_ACCIONES_AGENTE = '_ARCHITEX_ACCIONES_AGENTE';

/** Nombre de la carpeta de Drive para respaldos JSON > 45KB. */
const CARPETA_RESPALDOS = '_ARCHITEX_RESPALDOS_JSON';

/** Umbral en bytes para derivar payloads a Drive (45KB). */
const UMBRAL_RESPALDO_BYTES = 45 * 1024;

/** Versión actual del esquema de datos. */
const VERSION_ESQUEMA_ACTUAL = '1.0.0';

/** Tiempo máximo de espera del LockService en milisegundos. */
const TIEMPO_ESPERA_LOCK_MS = 30000;

/** Nombre del archivo HTML principal de la SPA. */
const ARCHIVO_VISTA_PRINCIPAL = 'index';

/** Mapa de rutas de vistas disponibles en la SPA. */
const RUTAS_VISTAS = {
  'inicio': 'index',
  'gobernanza': 'vista_gobernanza',
  'modelado_datos': 'vista_modelado_datos',
  'onboarding': 'vista_onboarding',
  'analizador_carpeta': 'vista_analizador_carpeta',
  'historial': 'vista_historial',
  'decisiones': 'vista_decisiones'
};

// ============================================================================
// PUNTO DE ENTRADA HTTP GET
// ============================================================================

/**
 * Maneja las solicitudes HTTP GET del Web App.
 * Sirve la SPA principal o vistas específicas según el parámetro "vista".
 *
 * @param {Object} evento - Objeto de evento con parámetros de la solicitud.
 * @return {HtmlOutput} Plantilla HTML renderizada.
 */
function doGet(evento) {
  try {
    // Extraer parámetros de la URL (query string).
    const parametros = (evento && evento.parameter) ? evento.parameter : {};
    const nombreVista = parametros.vista || 'inicio';
    const idProyecto = parametros.idProyecto || '';

    // Resolver la plantilla HTML correspondiente a la vista solicitada.
    const archivoPlantilla = RUTAS_VISTAS[nombreVista] || ARCHIVO_VISTA_PRINCIPAL;

    let correoUsuario = '';
    try {
      correoUsuario = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
    } catch (e) {
      correoUsuario = 'usuario_anonimo';
    }

    // Construir el objeto de contexto que se inyecta en la plantilla.
    const contextoPlantilla = {
      nombreVista: nombreVista,
      idProyecto: idProyecto,
      versionEsquema: VERSION_ESQUEMA_ACTUAL,
      fechaServidor: new Date().toISOString(),
      usuarioActivo: correoUsuario,
      urlWebApp: (function() {
        try { return ScriptApp.getService().getUrl(); } catch(e) { return ''; }
      })()
    };

    // Renderizar la plantilla desde el archivo HTML correspondiente.
    const plantilla = HtmlService.createTemplateFromFile(archivoPlantilla);
    plantilla.contexto = contextoPlantilla;

    return plantilla.evaluate()
      .setTitle('ARCHITEX OS - Gobernanza de Arquitectura Técnica')
      .setFaviconUrl('https://ssl.gstatic.com/docs/script/images/favicon.ico')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  } catch (error) {
    // Registrar el error y devolver una vista de error controlada.
    registrarErrorSistema('doGet', error);
    return construirVistaError(error);
  }
}

// ============================================================================
// PUNTO DE ENTRADA HTTP POST
// ============================================================================

/**
 * Maneja las solicitudes HTTP POST del Web App.
 * Actúa como enrutador de acciones backend invocadas desde el cliente.
 *
 * @param {Object} evento - Objeto de evento con postData.
 * @return {TextOutput} Respuesta JSON serializada.
 */
function doPost(evento) {
  // Estructura de respuesta estándar.
  const respuesta = {
    exito: false,
    mensaje: '',
    datos: null,
    marcaTiempo: new Date().toISOString()
  };

  try {
    // Validar existencia de cuerpo en la solicitud.
    if (!evento || !evento.postData || !evento.postData.contents) {
      respuesta.mensaje = 'Solicitud POST sin cuerpo válido.';
      return responderJSON(respuesta);
    }

    // Parsear el cuerpo JSON recibido.
    let cuerpo;
    try {
      cuerpo = JSON.parse(evento.postData.contents);
    } catch (errorParseo) {
      respuesta.mensaje = 'Cuerpo JSON malformado: ' + errorParseo.message;
      return responderJSON(respuesta);
    }

    // Extraer acción y payload.
    const accion = cuerpo.accion || '';
    const datos = cuerpo.datos || {};

    // Enrutar la acción al manejador correspondiente.
    const resultado = enrutarAccion(accion, datos);

    respuesta.exito = true;
    respuesta.mensaje = 'Acción ejecutada correctamente.';
    respuesta.datos = resultado;

    return responderJSON(respuesta);

  } catch (error) {
    registrarErrorSistema('doPost', error);
    respuesta.mensaje = 'Error interno del servidor: ' + error.message;
    return responderJSON(respuesta);
  }
}

// ============================================================================
// ENRUTADOR PRINCIPAL DE ACCIONES BACKEND
// ============================================================================

/**
 * Enruta una acción recibida por POST al manejador backend correspondiente.
 * Todas las operaciones de escritura usan LockService para control de concurrencia.
 *
 * @param {string} accion - Identificador de la acción solicitada.
 * @param {Object} datos - Payload con los datos de la acción.
 * @return {Object} Resultado de la acción ejecutada.
 */
function enrutarAccion(accion, datos) {
  switch (accion) {
    case 'guardarProyecto':
      return guardarProyectoConLock(datos);
    case 'obtenerProyecto':
      return obtenerProyecto(datos.idProyecto);
    case 'listarProyectos':
      return listarProyectos();
    case 'guardarVersionHistorial':
      return guardarVersionHistorialConLock(datos);
    case 'obtenerHistorialProyecto':
      return obtenerHistorialProyecto(datos.idProyecto);
    case 'guardarDecisionADR':
      return guardarDecisionADRConLock(datos);
    case 'listarDecisionesADR':
      return listarDecisionesADR();
    case 'guardarDirectrizRSC':
      return guardarDirectrizRSCConLock(datos);
    case 'listarDirectricesRSC':
      return listarDirectricesRSC();
    case 'obtenerMetaSistema':
      return obtenerMetaSistema();
    case 'analizarCarpetaLocal':
      return analizarCarpetaLocal(datos);
    case 'sincronizarLocalStorage':
      return sincronizarLocalStorageConLock(datos);
    case 'registrarAccionAgente':
      return registrarAccionAgente(datos);
    case 'obtenerCatalogoHerramientasPublico':
      return obtenerCatalogoHerramientasPublico();
    case 'decidirSolicitudHerramientaAgente':
      return decidirSolicitudHerramientaAgente(datos);
    case 'resolverEjecucionHerramientaAgente':
      return resolverEjecucionHerramientaAgente(datos);
    case 'aplicarHerramientaAgenteAutorizada':
      return aplicarHerramientaAgenteAutorizada(datos);
    default:
      throw new Error('Acción no reconocida: ' + accion);
  }
}

// ============================================================================
// FUNCIÓN INCLUDE PARA PLANTILLAS HTML
// ============================================================================

/**
 * Incluye el contenido de un archivo HTML dentro de otro.
 * Se usa en las plantillas con <?!= include('nombre_archivo') ?>.
 *
 * @param {string} nombreArchivo - Nombre del archivo HTML sin extensión.
 * @return {string} Contenido HTML del archivo solicitado.
 */
function include(nombreArchivo) {
  try {
    return HtmlService.createHtmlOutputFromFile(nombreArchivo).getContent();
  } catch (error) {
    registrarErrorSistema('include:' + nombreArchivo, error);
    return '<!-- Error al incluir archivo: ' + nombreArchivo + ' -->';
  }
}

// ============================================================================
// GESTIÓN DE LA HOJA DE CÁLCULO MAESTRA
// ============================================================================

/**
 * Obtiene (o crea si no existe) la hoja de cálculo maestra del sistema.
 * @return {Spreadsheet} Objeto Spreadsheet activo.
 */
function obtenerHojaMaestra() {
  const propiedades = PropertiesService.getScriptProperties();
  let idHoja = propiedades.getProperty('ID_HOJA_MAESTRA');

  if (idHoja) {
    try {
      return SpreadsheetApp.openById(idHoja);
    } catch (error) {
      // Si el ID guardado ya no es válido, se regenera.
      propiedades.deleteProperty('ID_HOJA_MAESTRA');
    }
  }

  // Crear una nueva hoja maestra si no existe.
  const nuevaHoja = SpreadsheetApp.create(NOMBRE_HOJA_MAESTRA);
  propiedades.setProperty('ID_HOJA_MAESTRA', nuevaHoja.getId());
  inicializarEsquema(nuevaHoja);
  return nuevaHoja;
}

/**
 * Inicializa el esquema de pestañas y encabezados si no existen.
 * @param {Spreadsheet} hoja - Hoja de cálculo maestra.
 */
function inicializarEsquema(hoja) {
  const definiciones = [
    { nombre: TABLA_PROYECTOS, encabezados: ['ID_PROYECTO', 'NOMBRE_PROYECTO', 'FECHA_ACTUALIZACION', 'RESUMEN_PROBLEMA', 'DATOS_JSON_COMPLETOS'] },
    { nombre: TABLA_HISTORIAL, encabezados: ['ID_HISTORIAL', 'ID_PROYECTO', 'NOMBRE_PROYECTO', 'FECHA_VERSION', 'RESUMEN', 'DATOS_JSON'] },
    { nombre: TABLA_META, encabezados: ['version_esquema', 'fecha_migracion', 'descripcion'] },
    { nombre: TABLA_DECISIONES_ADR, encabezados: ['id', 'codigo_adr', 'titulo', 'problema', 'decision_tomada', 'justificacion'] },
    { nombre: TABLA_DIRECTRICES_RSC, encabezados: ['agentes_objetivo', 'ruta_reglas', 'skills_instaladas'] },
    { nombre: TABLA_ACCIONES_AGENTE, encabezados: ['id', 'fecha_hora', 'proyecto_id', 'mision_id', 'herramienta', 'nivel_riesgo', 'estado', 'modo', 'usuario', 'argumentos_resumidos', 'motivo', 'resultado'] }
  ];

  definiciones.forEach(function (definicion) {
    let pestana = hoja.getSheetByName(definicion.nombre);
    if (!pestana) {
      pestana = hoja.insertSheet(definicion.nombre);
      pestana.appendRow(definicion.encabezados);
      pestana.getRange(1, 1, 1, definicion.encabezados.length).setFontWeight('bold');
      pestana.setFrozenRows(1);
    }
  });

  // Registrar la versión inicial del esquema en la tabla META.
  const pestanaMeta = hoja.getSheetByName(TABLA_META);
  if (pestanaMeta.getLastRow() < 2) {
    pestanaMeta.appendRow([VERSION_ESQUEMA_ACTUAL, new Date().toISOString(), 'Esquema inicial ARCHITEX OS']);
  }
}

/**
 * Obtiene una pestaña específica de la hoja maestra.
 * @param {string} nombrePestana - Nombre de la pestaña.
 * @return {Sheet} Pestaña solicitada.
 */
function obtenerPestana(nombrePestana) {
  const hoja = obtenerHojaMaestra();
  let pestana = hoja.getSheetByName(nombrePestana);
  if (!pestana) {
    inicializarEsquema(hoja);
    pestana = hoja.getSheetByName(nombrePestana);
  }
  return pestana;
}

// ============================================================================
// OPERACIONES DE PROYECTOS (CON LOCK)
// ============================================================================

/**
 * Guarda o actualiza un proyecto con control de concurrencia.
 * @param {Object} datos - Datos del proyecto.
 * @return {Object} Resultado de la operación.
 */
function guardarProyectoConLock(datos) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(TIEMPO_ESPERA_LOCK_MS)) {
    throw new Error('No se pudo adquirir el lock para guardar proyecto.');
  }
  try {
    return guardarProyectoInterno(datos);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Lógica interna de guardado de proyecto (sin lock).
 * @param {Object} datos - Datos del proyecto.
 * @return {Object} Resultado.
 */
function guardarProyectoInterno(datos) {
  if (!datos || !datos.idProyecto) {
    throw new Error('Datos de proyecto inválidos: falta idProyecto.');
  }

  const pestana = obtenerPestana(TABLA_PROYECTOS);
  const jsonCompleto = JSON.stringify(datos);
  const fechaActual = new Date().toISOString();

  // Buscar si el proyecto ya existe para actualizar.
  const ultimaFila = pestana.getLastRow();
  let filaExistente = -1;

  if (ultimaFila > 1) {
    const ids = pestana.getRange(2, 1, ultimaFila - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(datos.idProyecto)) {
        filaExistente = i + 2;
        break;
      }
    }
  }

  const fila = [
    datos.idProyecto,
    datos.nombreProyecto || '',
    fechaActual,
    datos.resumenProblema || '',
    jsonCompleto
  ];

  if (filaExistente > 0) {
    pestana.getRange(filaExistente, 1, 1, fila.length).setValues([fila]);
  } else {
    pestana.appendRow(fila);
  }

  return {
    idProyecto: datos.idProyecto,
    fechaActualizacion: fechaActual,
    accion: filaExistente > 0 ? 'actualizado' : 'creado'
  };
}

/**
 * Obtiene un proyecto por su ID.
 * @param {string} idProyecto - Identificador del proyecto.
 * @return {Object|null} Proyecto o null si no existe.
 */
function obtenerProyecto(idProyecto) {
  if (!idProyecto) {
    throw new Error('Se requiere idProyecto.');
  }
  const pestana = obtenerPestana(TABLA_PROYECTOS);
  const ultimaFila = pestana.getLastRow();
  if (ultimaFila < 2) return null;

  const valores = pestana.getRange(2, 1, ultimaFila - 1, 5).getValues();
  for (let i = 0; i < valores.length; i++) {
    if (String(valores[i][0]) === String(idProyecto)) {
      return {
        idProyecto: valores[i][0],
        nombreProyecto: valores[i][1],
        fechaActualizacion: valores[i][2],
        resumenProblema: valores[i][3],
        datosJsonCompletos: valores[i][4]
      };
    }
  }
  return null;
}

/**
 * Lista todos los proyectos registrados.
 * @return {Array<Object>} Lista de proyectos.
 */
function listarProyectos() {
  const pestana = obtenerPestana(TABLA_PROYECTOS);
  const ultimaFila = pestana.getLastRow();
  if (ultimaFila < 2) return [];

  const valores = pestana.getRange(2, 1, ultimaFila - 1, 5).getValues();
  return valores.map(function (fila) {
    return {
      idProyecto: fila[0],
      nombreProyecto: fila[1],
      fechaActualizacion: fila[2],
      resumenProblema: fila[3]
    };
  });
}

// ============================================================================
// OPERACIONES DE HISTORIAL (CON LOCK)
// ============================================================================

/**
 * Guarda una versión en el historial con control de concurrencia.
 * @param {Object} datos - Datos de la versión.
 * @return {Object} Resultado.
 */
function guardarVersionHistorialConLock(datos) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(TIEMPO_ESPERA_LOCK_MS)) {
    throw new Error('No se pudo adquirir el lock para guardar historial.');
  }
  try {
    return guardarVersionHistorialInterno(datos);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Lógica interna de guardado de versión de historial.
 * @param {Object} datos - Datos de la versión.
 * @return {Object} Resultado.
 */
function guardarVersionHistorialInterno(datos) {
  if (!datos || !datos.idProyecto) {
    throw new Error('Datos de historial inválidos: falta idProyecto.');
  }

  const pestana = obtenerPestana(TABLA_HISTORIAL);
  const idHistorial = Utilities.getUuid();
  const fechaVersion = new Date().toISOString();
  const jsonDatos = JSON.stringify(datos.datosJson || {});

  // Si el payload supera el umbral, se deriva a Drive.
  let referenciaJson = jsonDatos;
  if (jsonDatos.length > UMBRAL_RESPALDO_BYTES) {
    referenciaJson = guardarRespaldoEnDrive(idHistorial, jsonDatos);
  }

  pestana.appendRow([
    idHistorial,
    datos.idProyecto,
    datos.nombreProyecto || '',
    fechaVersion,
    datos.resumen || '',
    referenciaJson
  ]);

  return {
    idHistorial: idHistorial,
    fechaVersion: fechaVersion,
    derivadoADrive: referenciaJson !== jsonDatos
  };
}

/**
 * Obtiene el historial completo de un proyecto.
 * @param {string} idProyecto - Identificador del proyecto.
 * @return {Array<Object>} Lista de versiones.
 */
function obtenerHistorialProyecto(idProyecto) {
  if (!idProyecto) {
    throw new Error('Se requiere idProyecto para consultar historial.');
  }
  const pestana = obtenerPestana(TABLA_HISTORIAL);
  const ultimaFila = pestana.getLastRow();
  if (ultimaFila < 2) return [];

  const valores = pestana.getRange(2, 1, ultimaFila - 1, 6).getValues();
  const resultado = [];
  for (let i = 0; i < valores.length; i++) {
    if (String(valores[i][1]) === String(idProyecto)) {
      resultado.push({
        idHistorial: valores[i][0],
        idProyecto: valores[i][1],
        nombreProyecto: valores[i][2],
        fechaVersion: valores[i][3],
        resumen: valores[i][4],
        datosJson: valores[i][5]
      });
    }
  }
  return resultado;
}

// ============================================================================
// OPERACIONES DE DECISIONES ADR (CON LOCK)
// ============================================================================

/**
 * Guarda una decisión ADR con control de concurrencia.
 * @param {Object} datos - Datos de la decisión.
 * @return {Object} Resultado.
 */
function guardarDecisionADRConLock(datos) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(TIEMPO_ESPERA_LOCK_MS)) {
    throw new Error('No se pudo adquirir el lock para guardar ADR.');
  }
  try {
    const pestana = obtenerPestana(TABLA_DECISIONES_ADR);
    const id = datos.id || Utilities.getUuid();
    pestana.appendRow([
      id,
      datos.codigoAdr || '',
      datos.titulo || '',
      datos.problema || '',
      datos.decisionTomada || '',
      datos.justificacion || ''
    ]);
    return { id: id, accion: 'creado' };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Lista todas las decisiones ADR registradas.
 * @return {Array<Object>} Lista de decisiones.
 */
function listarDecisionesADR() {
  const pestana = obtenerPestana(TABLA_DECISIONES_ADR);
  const ultimaFila = pestana.getLastRow();
  if (ultimaFila < 2) return [];

  const valores = pestana.getRange(2, 1, ultimaFila - 1, 6).getValues();
  return valores.map(function (fila) {
    return {
      id: fila[0],
      codigoAdr: fila[1],
      titulo: fila[2],
      problema: fila[3],
      decisionTomada: fila[4],
      justificacion: fila[5]
    };
  });
}

// ============================================================================
// OPERACIONES DE DIRECTRICES RSC (CON LOCK)
// ============================================================================

/**
 * Guarda una directriz RSC con control de concurrencia.
 * @param {Object} datos - Datos de la directriz.
 * @return {Object} Resultado.
 */
function guardarDirectrizRSCConLock(datos) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(TIEMPO_ESPERA_LOCK_MS)) {
    throw new Error('No se pudo adquirir el lock para guardar directriz RSC.');
  }
  try {
    const pestana = obtenerPestana(TABLA_DIRECTRICES_RSC);
    pestana.appendRow([
      datos.agentesObjetivo || '',
      datos.rutaReglas || '',
      datos.skillsInstaladas || ''
    ]);
    return { accion: 'creado' };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Lista todas las directrices RSC registradas.
 * @return {Array<Object>} Lista de directrices.
 */
function listarDirectricesRSC() {
  const pestana = obtenerPestana(TABLA_DIRECTRICES_RSC);
  const ultimaFila = pestana.getLastRow();
  if (ultimaFila < 2) return [];

  const valores = pestana.getRange(2, 1, ultimaFila - 1, 3).getValues();
  return valores.map(function (fila) {
    return {
      agentesObjetivo: fila[0],
      rutaReglas: fila[1],
      skillsInstaladas: fila[2]
    };
  });
}

// ============================================================================
// OPERACIONES DE META DEL SISTEMA
// ============================================================================

/**
 * Obtiene la metadata del sistema (versión de esquema, fecha de migración).
 * @return {Object} Metadata del sistema.
 */
function obtenerMetaSistema() {
  const pestana = obtenerPestana(TABLA_META);
  const ultimaFila = pestana.getLastRow();
  if (ultimaFila < 2) {
    return {
      versionEsquema: VERSION_ESQUEMA_ACTUAL,
      fechaMigracion: new Date().toISOString(),
      descripcion: 'Esquema inicial'
    };
  }
  const valores = pestana.getRange(2, 1, ultimaFila - 1, 3).getValues();
  const ultima = valores[valores.length - 1];
  return {
    versionEsquema: ultima[0],
    fechaMigracion: ultima[1],
    descripcion: ultima[2]
  };
}

// ============================================================================
// RESPALDOS EN DRIVE
// ============================================================================

/**
 * Guarda un payload JSON en la carpeta de respaldos de Drive.
 * @param {string} idReferencia - Identificador de referencia.
 * @param {string} contenidoJson - Contenido JSON a respaldar.
 * @return {string} Referencia tipo "drive://<idArchivo>".
 */
function guardarRespaldoEnDrive(idReferencia, contenidoJson) {
  const carpetas = DriveApp.getFoldersByName(CARPETA_RESPALDOS);
  let carpeta;
  if (carpetas.hasNext()) {
    carpeta = carpetas.next();
  } else {
    carpeta = DriveApp.createFolder(CARPETA_RESPALDOS);
  }

  const nombreArchivo = 'respaldo_' + idReferencia + '_' + Date.now() + '.json';
  const archivo = carpeta.createFile(nombreArchivo, contenidoJson, MimeType.PLAIN_TEXT);
  return 'drive://' + archivo.getId();
}

// ============================================================================
// SINCRONIZACIÓN CON LOCALSTORAGE (CON LOCK)
// ============================================================================

/**
 * Sincroniza un lote de cambios provenientes de localStorage con la hoja maestra.
 * @param {Object} datos - Lote de cambios.
 * @return {Object} Resultado de la sincronización.
 */
function sincronizarLocalStorageConLock(datos) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(TIEMPO_ESPERA_LOCK_MS)) {
    throw new Error('No se pudo adquirir el lock para sincronizar localStorage.');
  }
  try {
    const cambios = (datos && datos.cambios) ? datos.cambios : [];
    const resultados = [];

    cambios.forEach(function (cambio) {
      try {
        if (cambio.tipo === 'proyecto') {
          resultados.push(guardarProyectoInterno(cambio.datos));
        } else if (cambio.tipo === 'historial') {
          resultados.push(guardarVersionHistorialInterno(cambio.datos));
        }
      } catch (errorCambio) {
        resultados.push({ error: errorCambio.message, cambio: cambio });
      }
    });

    return { totalCambios: cambios.length, resultados: resultados };
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// ANALIZADOR DE CARPETA LOCAL (MÓDULO 13)
// ============================================================================

/**
 * Analiza la estructura de una carpeta local reportada por el cliente.
 * Genera un resumen estructural para el módulo de análisis con DeepSeek.
 * @param {Object} datos - Datos de la carpeta (ruta, archivos, subcarpetas).
 * @return {Object} Resumen del análisis.
 */
function analizarCarpetaLocal(datos) {
  if (!datos || !datos.rutaCarpeta) {
    throw new Error('Se requiere rutaCarpeta para el análisis.');
  }

  const archivos = datos.archivos || [];
  const subcarpetas = datos.subcarpetas || [];

  // Clasificar archivos por extensión.
  const conteoPorExtension = {};
  archivos.forEach(function (archivo) {
    const partes = String(archivo).split('.');
    const extension = partes.length > 1 ? partes.pop().toLowerCase() : 'sin_extension';
    conteoPorExtension[extension] = (conteoPorExtension[extension] || 0) + 1;
  });

  return {
    rutaCarpeta: datos.rutaCarpeta,
    totalArchivos: archivos.length,
    totalSubcarpetas: subcarpetas.length,
    conteoPorExtension: conteoPorExtension,
    fechaAnalisis: new Date().toISOString()
  };
}

// ============================================================================
// UTILIDADES GENERALES
// ============================================================================

/**
 * Obtiene el correo del usuario activo o un valor por defecto.
 * @return {string} Correo del usuario.
 */
function obtenerUsuarioActivo() {
  try {
    return Session.getActiveUser().getEmail() || 'anonimo@architex.os';
  } catch (error) {
    return 'anonimo@architex.os';
  }
}

/**
 * Serializa un objeto como respuesta JSON.
 * @param {Object} objeto - Objeto a serializar.
 * @return {TextOutput} Respuesta JSON.
 */
function responderJSON(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Construye una vista HTML de error controlada.
 * @param {Error} error - Error capturado.
 * @return {HtmlOutput} Vista de error.
 */
function construirVistaError(error) {
  const html = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<title>Error ARCHITEX OS</title>' +
    '<style>body{font-family:Arial,sans-serif;background:#1a1a2e;color:#eee;padding:40px;}' +
    'h1{color:#e94560;}pre{background:#16213e;padding:20px;border-radius:8px;overflow:auto;}</style>' +
    '</head><body><h1>Error en ARCHITEX OS</h1>' +
    '<p>Se produjo un error al procesar la solicitud.</p>' +
    '<pre>' + String(error.message || error) + '</pre>' +
    '</body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('Error ARCHITEX OS');
}

/**
 * Registra un error del sistema en la consola de Apps Script.
 * @param {string} contexto - Contexto donde ocurrió el error.
 * @param {Error} error - Error capturado.
 */
function registrarErrorSistema(contexto, error) {
  console.error('[ARCHITEX OS][' + contexto + '] ' + (error && error.message ? error.message : String(error)));
  if (error && error.stack) {
    console.error(error.stack);
  }
}

// ============================================================================
// FUNCIONES DE PRUEBA / DIAGNÓSTICO
// ============================================================================

/**
 * Función de diagnóstico para verificar la conectividad con la hoja maestra.
 * @return {Object} Estado del sistema.
 */
function diagnosticoSistema() {
  try {
    const hoja = obtenerHojaMaestra();
    const meta = obtenerMetaSistema();
    return {
      exito: true,
      idHojaMaestra: hoja.getId(),
      nombreHojaMaestra: hoja.getName(),
      versionEsquema: meta.versionEsquema,
      pestanas: hoja.getSheets().map(function (p) { return p.getName(); }),
      marcaTiempo: new Date().toISOString()
    };
  } catch (error) {
    registrarErrorSistema('diagnosticoSistema', error);
    return { exito: false, mensaje: error.message };
  }
}

// ============================================================================
// ARCHITEX OS V-36 — SERVICIO IA SEGURO (BACKEND PROXY & PROPERTIES SERVICE)
// ============================================================================

/**
 * Obtiene el estado de configuración de IA sin exponer la clave en ningún momento.
 * @return {Object} Estado seguro de la configuración.
 */
function obtenerEstadoConfiguracionIA() {
  try {
    const propiedades = PropertiesService.getScriptProperties();
    const clave = propiedades.getProperty('ARCHITEX_DEEPSEEK_API_KEY');
    const modelo = propiedades.getProperty('ARCHITEX_IA_MODELO') || 'deepseek-chat';
    const proveedor = propiedades.getProperty('ARCHITEX_IA_PROVEEDOR') || 'deepseek';

    const tieneClave = Boolean(clave && clave.trim().length > 5);

    return {
      exito: true,
      configurada: tieneClave,
      mensajeEstado: tieneClave ? '🔐 Clave configurada en servidor' : '⚠️ Clave no configurada en servidor',
      modeloActivo: modelo,
      proveedor: proveedor
    };
  } catch (error) {
    registrarErrorSistema('obtenerEstadoConfiguracionIA', error);
    return {
      exito: false,
      configurada: false,
      mensajeEstado: '⚠️ Error al consultar configuración: ' + error.message,
      modeloActivo: 'deepseek-chat',
      proveedor: 'deepseek'
    };
  }
}

/**
 * Guarda o actualiza la clave y modelo en PropertiesService de forma privada.
 * @param {Object} config - { clave: string, modelo: string }
 * @return {Object} Confirmación de guardado.
 */
function guardarConfiguracionIABackend(config) {
  try {
    const propiedades = PropertiesService.getScriptProperties();
    if (config && config.clave && typeof config.clave === 'string' && config.clave.trim()) {
      propiedades.setProperty('ARCHITEX_DEEPSEEK_API_KEY', config.clave.trim());
    }
    if (config && config.modelo && typeof config.modelo === 'string') {
      propiedades.setProperty('ARCHITEX_IA_MODELO', config.modelo.trim());
    }
    return {
      exito: true,
      mensaje: 'Configuración de IA guardada de forma segura en el servidor.'
    };
  } catch (error) {
    registrarErrorSistema('guardarConfiguracionIABackend', error);
    return {
      exito: false,
      mensaje: 'Error al almacenar configuración: ' + error.message
    };
  }
}

/**
 * Ejecuta una llamada de inferencia a la API de DeepSeek desde el backend (Apps Script).
 * El navegador NUNCA recibe ni maneja la API Key.
 *
 * @param {Object} parametros - Opciones de la solicitud { mensajes, modelo, temperatura, maxTokens, stream }
 * @return {Object} Respuesta normalizada { exito, contenido, uso, error }
 */
function ejecutarLlamadaDeepSeekBackend(parametros) {
  try {
    const propiedades = PropertiesService.getScriptProperties();
    const clave = propiedades.getProperty('ARCHITEX_DEEPSEEK_API_KEY');

    if (!clave || !clave.trim()) {
      return {
        exito: false,
        error: 'No se ha configurado la clave ARCHITEX_DEEPSEEK_API_KEY en Script Properties del servidor.'
      };
    }

    const mensajes = parametros && Array.isArray(parametros.mensajes) ? parametros.mensajes : [];
    if (mensajes.length === 0) {
      return { exito: false, error: 'No se especificaron mensajes para el modelo.' };
    }

    const modelo = (parametros && parametros.modelo) || propiedades.getProperty('ARCHITEX_IA_MODELO') || 'deepseek-chat';
    const temperatura = (parametros && typeof parametros.temperatura === 'number') ? parametros.temperatura : 0.2;
    const maxTokens = (parametros && typeof parametros.maxTokens === 'number') ? parametros.maxTokens : 4000;

    const payload = {
      model: modelo,
      messages: mensajes,
      temperature: temperatura,
      max_tokens: maxTokens
    };

    if (parametros && parametros.tools && Array.isArray(parametros.tools)) {
      payload.tools = parametros.tools;
      if (parametros.tool_choice) {
        payload.tool_choice = parametros.tool_choice;
      }
    }

    const opciones = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + clave.trim()
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const respuestaHttp = UrlFetchApp.fetch('https://api.deepseek.com/chat/completions', opciones);
    const codigoRespuesta = respuestaHttp.getResponseCode();
    const textoRespuesta = respuestaHttp.getContentText();

    if (codigoRespuesta < 200 || codigoRespuesta >= 300) {
      let mensajeError = 'Error HTTP ' + codigoRespuesta;
      try {
        const errorJson = JSON.parse(textoRespuesta);
        if (errorJson.error && errorJson.error.message) {
          mensajeError += ': ' + errorJson.error.message;
        }
      } catch (e) {
        mensajeError += ': ' + textoRespuesta;
      }
      return { exito: false, error: mensajeError, codigo: codigoRespuesta };
    }

    const datosRespuesta = JSON.parse(textoRespuesta);
    const mensajeChoice = datosRespuesta.choices && datosRespuesta.choices[0] && datosRespuesta.choices[0].message
      ? datosRespuesta.choices[0].message
      : null;
    const contenido = mensajeChoice && mensajeChoice.content ? mensajeChoice.content : '';

    return {
      exito: true,
      contenido: contenido,
      mensaje: mensajeChoice,
      modeloUtilizado: datosRespuesta.model || modelo,
      uso: datosRespuesta.usage || null
    };

  } catch (error) {
    registrarErrorSistema('ejecutarLlamadaDeepSeekBackend', error);
    return {
      exito: false,
      error: 'Excepción en servidor al conectar con DeepSeek: ' + error.message
    };
  }
}

/**
 * Función de prueba de conectividad desde el servidor.
 * @return {Object} Resultado de la prueba.
 */
function probarConexionDeepSeekBackend() {
  return ejecutarLlamadaDeepSeekBackend({
    mensajes: [{ role: 'user', content: 'Responde únicamente la palabra OK.' }],
    maxTokens: 10,
    temperatura: 0
  });
}

// ============================================================================
// WRAPPERS DE COMPATIBILIDAD CON VISTAS FRONTEND (V-35 -> V-36)
// ============================================================================

function guardarProyectoEnHoja(proyecto) {
  return guardarProyectoConLock(proyecto);
}

function listarProyectosDesdeHoja() {
  return listarProyectos();
}

function cargarProyectoPorId(idProyecto) {
  return obtenerProyecto(idProyecto);
}

function eliminarProyectoPorId(idProyecto) {
  return eliminarProyecto(idProyecto);
}

function obtenerUltimoProyectoGuardado() {
  return obtenerUltimo();
}

function auditarProyectoEnCarpetaDrive(idCarpeta) {
  return guardarRespaldoEnDrive(idCarpeta);
}

// ============================================================================
// ARCHITEX OS V-36 — FASE 2: AUDITORÍA DE ACCIONES DEL AGENTE
// ============================================================================

/**
 * Redacta secretos antes de escribir la auditoría. No sustituye al validador.
 * @param {string} texto - Texto potencialmente sensible.
 * @return {string} Texto redactado.
 */
function redactarTextoAuditoriaServidor(texto) {
  return String(texto || '')
    .replace(/sk-[a-zA-Z0-9_\-]{6,}/g, '[secreto omitido]')
    .replace(/Bearer\s+[a-zA-Z0-9_\-.]{8,}/gi, 'Bearer [secreto omitido]')
    .replace(/("?(?:clave|api[_-]?key|token|secret|password|authorization|credencial)"?\s*:\s*")[^"]*/gi, '$1[secreto omitido]');
}

/**
 * Garantiza la pestaña de auditoría en hojas maestras ya creadas.
 * @return {Sheet} Pestaña _ARCHITEX_ACCIONES_AGENTE.
 */
function asegurarTablaAccionesAgente() {
  const hoja = obtenerHojaMaestra();
  const encabezados = ['id', 'fecha_hora', 'proyecto_id', 'mision_id', 'herramienta', 'nivel_riesgo', 'estado', 'modo', 'usuario', 'argumentos_resumidos', 'motivo', 'resultado'];
  let pestana = hoja.getSheetByName(TABLA_ACCIONES_AGENTE);
  if (!pestana) {
    pestana = hoja.insertSheet(TABLA_ACCIONES_AGENTE);
    pestana.appendRow(encabezados);
    pestana.getRange(1, 1, 1, encabezados.length).setFontWeight('bold');
    pestana.setFrozenRows(1);
    return pestana;
  }
  if (pestana.getLastRow() < 1) {
    pestana.appendRow(encabezados);
    pestana.setFrozenRows(1);
  }
  return pestana;
}

/**
 * Registra un intento del agente. El usuario y la hora los fija el servidor.
 * @param {Object} registro - Campos de auditoría ya resumidos en el cliente.
 * @return {Object} Confirmación con el id persistido.
 */
function registrarAccionAgente(registro) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(TIEMPO_ESPERA_LOCK_MS)) {
    return { exito: false, mensaje: 'No se pudo adquirir el lock de auditoría.' };
  }
  try {
    return registrarAccionAgenteInterno(registro || {});
  } catch (error) {
    registrarErrorSistema('registrarAccionAgente', error);
    return { exito: false, mensaje: error.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Escribe una fila de auditoría bajo el lock ya adquirido.
 * @param {Object} registro - Payload del cliente.
 * @return {Object} Resultado de la escritura.
 */
function registrarAccionAgenteInterno(registro) {
  const pestana = asegurarTablaAccionesAgente();
  const id = 'acc_' + Utilities.getUuid();
  const fila = [
    id,
    new Date().toISOString(),
    redactarTextoAuditoriaServidor(registro.proyecto_id || ''),
    redactarTextoAuditoriaServidor(registro.mision_id || ''),
    redactarTextoAuditoriaServidor(registro.herramienta || ''),
    redactarTextoAuditoriaServidor(registro.nivel_riesgo || ''),
    redactarTextoAuditoriaServidor(registro.estado || ''),
    redactarTextoAuditoriaServidor(registro.modo || 'REAL'),
    obtenerUsuarioActivo(),
    redactarTextoAuditoriaServidor(registro.argumentos_resumidos || '').slice(0, 800),
    redactarTextoAuditoriaServidor(registro.motivo || '').slice(0, 500),
    redactarTextoAuditoriaServidor(registro.resultado || '').slice(0, 500)
  ];
  pestana.appendRow(fila);
  return { exito: true, id: id, tabla: TABLA_ACCIONES_AGENTE };
}

/**
 * Lee los últimos registros de auditoría para verificación manual.
 * @param {number} limite - Cantidad máxima de filas.
 * @return {Object[]} Registros recientes, del más nuevo al más viejo.
 */
/**
 * Catálogo visible para la interfaz. No incluye contratos internos ni listas de bypass.
 * @return {Object[]} Herramientas para presentación.
 */
function obtenerCatalogoHerramientasPublico() {
  return exponerCatalogoHerramientasParaPresentacion();
}

/**
 * Decisión de seguridad. Ignora cualquier catálogo que el navegador intente enviar.
 * @param {Object} solicitud - Pedido del cliente.
 * @return {Object} Decisión del validador único.
 */
function decidirSolicitudHerramientaAgente(solicitud) {
  return decidirSolicitudHerramientaDesdeCliente(solicitud);
}

/**
 * Resuelve la ruta sin abrir escrituras de proyecto.
 * El navegador no puede adjuntar un mutador por JSON.
 * @param {Object} solicitud - Pedido con opciones de simulación.
 * @return {Object} Estado visible y contadores de escritura.
 */
function resolverEjecucionHerramientaAgente(solicitud) {
  var pedido = solicitud || {};
  var opciones = {
    modoSimulacion: pedido.modoSimulacion === true,
    decisionHumana: pedido.decisionHumana
  };
  return ejecutarRutaSeguraHerramienta(pedido, opciones, {});
}

/**
 * Adapta CacheService para decisiones de aprobación. Caducan a los 10 minutos.
 * @return {{leer: function(string): Object|null, guardar: function(string, Object): void}}
 */
function crearAlmacenDecisionesAgente() {
  var cache = CacheService.getScriptCache();
  var prefijo = 'architex_decision_';
  return {
    leer: function (id) {
      if (!id) return null;
      var texto = cache.get(prefijo + id);
      if (!texto) return null;
      try { return JSON.parse(texto); } catch (error) { return null; }
    },
    guardar: function (id, registro) {
      cache.put(prefijo + id, JSON.stringify(registro), 600);
    }
  };
}

/**
 * Aplica una herramienta del agente en el servidor.
 * Un solo LockService cubre la revalidación, la escritura interna y la auditoría.
 * No llama a las funciones ConLock para no tomar el mismo candado dos veces.
 * @param {Object} solicitud - Pedido del navegador.
 * @return {Object} Estado real: EJECUTADA, APROBACIÓN HUMANA, DENEGADA, BLOQUEADA, ERROR o SIN MUTACIÓN REAL.
 */
function aplicarHerramientaAgenteAutorizada(solicitud) {
  var almacen = crearAlmacenDecisionesAgente();
  return aplicarHerramientaAgenteAutorizadaNucleo(solicitud, {
    ahora: function () { return Date.now(); },
    vigenciaMs: 600000,
    leerDecision: almacen.leer,
    guardarDecision: almacen.guardar,
    leerProyecto: function (idProyecto) {
      var fila = obtenerProyecto(idProyecto);
      if (!fila || !fila.datosJsonCompletos) return null;
      var datos = JSON.parse(fila.datosJsonCompletos);
      datos.idProyecto = datos.idProyecto || fila.idProyecto;
      return datos;
    },
    escribirProyecto: function (proyecto) {
      return guardarProyectoInterno(proyecto);
    },
    escribirAuditoria: function (registro) {
      return registrarAccionAgenteInterno(registro);
    },
    conLock: function (trabajo) {
      var lock = LockService.getScriptLock();
      if (!lock.tryLock(TIEMPO_ESPERA_LOCK_MS)) {
        return { estado: 'ERROR', mutacionReal: false, motivo: 'No se pudo adquirir el lock.' };
      }
      try {
        return trabajo();
      } finally {
        lock.releaseLock();
      }
    }
  });
}

function listarAccionesAgente(limite) {
  const pestana = asegurarTablaAccionesAgente();
  const ultima = pestana.getLastRow();
  if (ultima < 2) return [];
  const cantidad = Math.max(1, Math.min(Number(limite) || 50, 200));
  const inicio = Math.max(2, ultima - cantidad + 1);
  const valores = pestana.getRange(inicio, 1, ultima - inicio + 1, 12).getValues();
  const encabezados = ['id', 'fecha_hora', 'proyecto_id', 'mision_id', 'herramienta', 'nivel_riesgo', 'estado', 'modo', 'usuario', 'argumentos_resumidos', 'motivo', 'resultado'];
  return valores.reverse().map(function (fila) {
    const objeto = {};
    encabezados.forEach(function (encabezado, indice) {
      objeto[encabezado] = fila[indice];
    });
    return objeto;
  });
}