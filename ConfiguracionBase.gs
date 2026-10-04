/**
 * ============================================================================
 * ARCHITEX OS - CONFIGURACIÓN BASE
 * ============================================================================
 * Archivo: ConfiguracionBase.gs
 * Propósito: Constantes globales, IDs de hojas, nombres de columnas,
 *            configuración de entorno e inicialización de estructura de datos.
 * Autor: Desarrollador Senior ARCHITEX OS
 * ============================================================================
 */

// ============================================================================
// SECCIÓN 1: CONFIGURACIÓN DE ENTORNO
// ============================================================================

/**
 * Entorno de ejecución activo.
 * Valores permitidos: 'DESARROLLO' | 'PRODUCCION'
 */
const ENTORNO_ACTIVO = 'DESARROLLO';

/**
 * Configuración por entorno. Contiene el ID del libro maestro de Google Sheets
 * y parámetros específicos de cada ambiente.
 */
const CONFIGURACION_ENTORNO = {
  DESARROLLO: {
    ID_LIBRO: '1AbCdEfGhIjKlMnOpQrStUvWxYz_DEV_ARCHITEX',
    NOMBRE_LIBRO: 'ARCHITEX_OS_DEV',
    MODO_DEBUG: true,
    ZONA_HORARIA: 'America/Mexico_City',
    LOCALE: 'es_MX'
  },
  PRODUCCION: {
    ID_LIBRO: '1AbCdEfGhIjKlMnOpQrStUvWxYz_PROD_ARCHITEX',
    NOMBRE_LIBRO: 'ARCHITEX_OS_PROD',
    MODO_DEBUG: false,
    ZONA_HORARIA: 'America/Mexico_City',
    LOCALE: 'es_MX'
  }
};

/**
 * Obtiene la configuración del entorno activo.
 * @return {Object} Objeto con la configuración del entorno actual.
 */
function obtenerConfiguracionEntorno() {
  return CONFIGURACION_ENTORNO[ENTORNO_ACTIVO];
}

/**
 * Obtiene el ID del libro maestro según el entorno activo.
 * @return {string} ID del libro de Google Sheets.
 */
function obtenerIdLibro() {
  return obtenerConfiguracionEntorno().ID_LIBRO;
}

// ============================================================================
// SECCIÓN 2: NOMBRES DE HOJAS
// ============================================================================

/**
 * Nombres canónicos de todas las hojas del sistema Architex OS.
 * Toda referencia a hojas debe usar estas constantes para evitar errores.
 */
const HOJAS = {
  ALUMNOS: 'Alumnos',
  GRUPOS: 'Grupos',
  ASISTENCIA: 'Asistencia',
  CALIFICACIONES: 'Calificaciones',
  TAREAS: 'Tareas',
  ENTREGAS: 'Entregas',
  PAGOS: 'Pagos',
  PROFESORES: 'Profesores',
  MATERIAS: 'Materias',
  HORARIOS: 'Horarios',
  USUARIOS: 'Usuarios',
  BITACORA: 'Bitacora',
  CONFIGURACION: 'Configuracion',
  REPORTES: 'Reportes',
  NOTIFICACIONES: 'Notificaciones'
};

// ============================================================================
// SECCIÓN 3: NOMBRES DE COLUMNAS POR HOJA
// ============================================================================

/**
 * Definición de columnas para cada hoja. El orden del arreglo corresponde
 * al orden físico de las columnas en la hoja de cálculo.
 */
const COLUMNAS = {
  ALUMNOS: [
    'ID_ALUMNO',
    'MATRICULA',
    'NOMBRE',
    'APELLIDO_PATERNO',
    'APELLIDO_MATERNO',
    'CORREO',
    'TELEFONO',
    'FECHA_NACIMIENTO',
    'ID_GRUPO',
    'ESTATUS',
    'FECHA_ALTA',
    'FECHA_BAJA',
    'OBSERVACIONES'
  ],
  GRUPOS: [
    'ID_GRUPO',
    'NOMBRE_GRUPO',
    'ID_MATERIA',
    'ID_PROFESOR',
    'CICLO_ESCOLAR',
    'AULA',
    'HORARIO',
    'CAPACIDAD_MAXIMA',
    'ESTATUS',
    'FECHA_CREACION'
  ],
  ASISTENCIA: [
    'ID_ASISTENCIA',
    'ID_ALUMNO',
    'ID_GRUPO',
    'FECHA',
    'ESTATUS_ASISTENCIA',
    'HORA_REGISTRO',
    'ID_PROFESOR',
    'OBSERVACIONES'
  ],
  CALIFICACIONES: [
    'ID_CALIFICACION',
    'ID_ALUMNO',
    'ID_GRUPO',
    'ID_MATERIA',
    'PERIODO',
    'CALIFICACION',
    'TIPO_EVALUACION',
    'FECHA_REGISTRO',
    'ID_PROFESOR',
    'OBSERVACIONES'
  ],
  TAREAS: [
    'ID_TAREA',
    'ID_GRUPO',
    'ID_MATERIA',
    'TITULO',
    'DESCRIPCION',
    'FECHA_ASIGNACION',
    'FECHA_ENTREGA',
    'PONDERACION',
    'ESTATUS'
  ],
  ENTREGAS: [
    'ID_ENTREGA',
    'ID_TAREA',
    'ID_ALUMNO',
    'FECHA_ENTREGA',
    'ARCHIVO_URL',
    'CALIFICACION',
    'COMENTARIOS',
    'ESTATUS'
  ],
  PAGOS: [
    'ID_PAGO',
    'ID_ALUMNO',
    'CONCEPTO',
    'MONTO',
    'FECHA_PAGO',
    'METODO_PAGO',
    'REFERENCIA',
    'ESTATUS',
    'FECHA_REGISTRO'
  ],
  PROFESORES: [
    'ID_PROFESOR',
    'NOMBRE',
    'APELLIDO_PATERNO',
    'APELLIDO_MATERNO',
    'CORREO',
    'TELEFONO',
    'ESPECIALIDAD',
    'ESTATUS',
    'FECHA_ALTA'
  ],
  MATERIAS: [
    'ID_MATERIA',
    'NOMBRE_MATERIA',
    'CLAVE_MATERIA',
    'CREDITOS',
    'HORAS_SEMANA',
    'DESCRIPCION',
    'ESTATUS'
  ],
  HORARIOS: [
    'ID_HORARIO',
    'ID_GRUPO',
    'DIA_SEMANA',
    'HORA_INICIO',
    'HORA_FIN',
    'AULA',
    'ID_PROFESOR'
  ],
  USUARIOS: [
    'ID_USUARIO',
    'CORREO',
    'NOMBRE_COMPLETO',
    'ROL',
    'HASH_CLAVE',
    'ESTATUS',
    'ULTIMO_ACCESO',
    'FECHA_CREACION'
  ],
  BITACORA: [
    'ID_BITACORA',
    'FECHA_HORA',
    'ID_USUARIO',
    'ACCION',
    'MODULO',
    'DETALLE',
    'RESULTADO'
  ],
  CONFIGURACION: [
    'CLAVE',
    'VALOR',
    'DESCRIPCION',
    'FECHA_ACTUALIZACION'
  ],
  REPORTES: [
    'ID_REPORTE',
    'TIPO_REPORTE',
    'FECHA_GENERACION',
    'ID_USUARIO',
    'PARAMETROS',
    'URL_ARCHIVO',
    'ESTATUS'
  ],
  NOTIFICACIONES: [
    'ID_NOTIFICACION',
    'ID_USUARIO',
    'TIPO',
    'MENSAJE',
    'FECHA_CREACION',
    'LEIDA',
    'FECHA_LECTURA'
  ]
};

// ============================================================================
// SECCIÓN 4: CONSTANTES DE NEGOCIO
// ============================================================================

/**
 * Estatus válidos para alumnos.
 */
const ESTATUS_ALUMNO = {
  ACTIVO: 'ACTIVO',
  INACTIVO: 'INACTIVO',
  EGRESADO: 'EGRESADO',
  BAJA_TEMPORAL: 'BAJA_TEMPORAL',
  BAJA_DEFINITIVA: 'BAJA_DEFINITIVA'
};

/**
 * Estatus válidos para asistencia.
 */
const ESTATUS_ASISTENCIA = {
  PRESENTE: 'PRESENTE',
  AUSENTE: 'AUSENTE',
  RETARDO: 'RETARDO',
  JUSTIFICADO: 'JUSTIFICADO'
};

/**
 * Roles de usuario del sistema.
 */
const ROLES_USUARIO = {
  ADMINISTRADOR: 'ADMINISTRADOR',
  COORDINADOR: 'COORDINADOR',
  PROFESOR: 'PROFESOR',
  ALUMNO: 'ALUMNO',
  PADRE_FAMILIA: 'PADRE_FAMILIA'
};

/**
 * Estatus genéricos reutilizables.
 */
const ESTATUS_GENERICO = {
  ACTIVO: 'ACTIVO',
  INACTIVO: 'INACTIVO',
  PENDIENTE: 'PENDIENTE',
  COMPLETADO: 'COMPLETADO',
  CANCELADO: 'CANCELADO'
};

/**
 * Tipos de evaluación para calificaciones.
 */
const TIPOS_EVALUACION = {
  EXAMEN: 'EXAMEN',
  TAREA: 'TAREA',
  PROYECTO: 'PROYECTO',
  PARTICIPACION: 'PARTICIPACION',
  PRACTICA: 'PRACTICA'
};

/**
 * Métodos de pago aceptados.
 */
const METODOS_PAGO = {
  EFECTIVO: 'EFECTIVO',
  TRANSFERENCIA: 'TRANSFERENCIA',
  TARJETA: 'TARJETA',
  CHEQUE: 'CHEQUE',
  DEPOSITO: 'DEPOSITO'
};

// ============================================================================
// SECCIÓN 5: CONFIGURACIÓN DE SEGURIDAD Y CONCURRENCIA
// ============================================================================

/**
 * Tiempo máximo de espera para adquirir el bloqueo de script (ms).
 */
const TIEMPO_ESPERA_BLOQUEO_MS = 15000;

/**
 * Clave secreta para firma de tokens de sesión.
 * En producción debe obtenerse desde Propiedades del Script.
 */
const CLAVE_SECRETA = (function() {
  try {
    const propiedades = PropertiesService.getScriptProperties();
    const clave = propiedades.getProperty('CLAVE_SECRETA');
    return clave || 'ARCHITEX_OS_CLAVE_POR_DEFECTO_CAMBIAR_EN_PRODUCCION';
  } catch (error) {
    return 'ARCHITEX_OS_CLAVE_POR_DEFECTO_CAMBIAR_EN_PRODUCCION';
  }
})();

/**
 * Duración de sesión en minutos.
 */
const DURACION_SESION_MINUTOS = 480;

// ============================================================================
// SECCIÓN 6: UTILIDADES DE ACCESO A HOJAS
// ============================================================================

/**
 * Obtiene el objeto Spreadsheet del libro maestro.
 * @return {Spreadsheet} Objeto Spreadsheet activo.
 */
function obtenerLibro() {
  return SpreadsheetApp.openById(obtenerIdLibro());
}

/**
 * Obtiene una hoja por su nombre canónico.
 * @param {string} nombreHoja - Nombre de la hoja (usar constantes de HOJAS).
 * @return {Sheet} Objeto Sheet correspondiente.
 * @throws {Error} Si la hoja no existe.
 */
function obtenerHoja(nombreHoja) {
  const libro = obtenerLibro();
  const hoja = libro.getSheetByName(nombreHoja);
  if (!hoja) {
    throw new Error('La hoja "' + nombreHoja + '" no existe en el libro maestro.');
  }
  return hoja;
}

/**
 * Obtiene el arreglo de nombres de columnas para una hoja dada.
 * @param {string} nombreHoja - Nombre canónico de la hoja.
 * @return {Array<string>} Arreglo con los nombres de columnas.
 */
function obtenerColumnasHoja(nombreHoja) {
  const clave = Object.keys(HOJAS).find(function(k) {
    return HOJAS[k] === nombreHoja;
  });
  if (!clave || !COLUMNAS[clave]) {
    throw new Error('No hay definición de columnas para la hoja: ' + nombreHoja);
  }
  return COLUMNAS[clave];
}

/**
 * Obtiene el índice (base 1) de una columna dentro de una hoja.
 * @param {string} nombreHoja - Nombre canónico de la hoja.
 * @param {string} nombreColumna - Nombre de la columna.
 * @return {number} Índice de la columna (1-based).
 * @throws {Error} Si la columna no existe.
 */
function obtenerIndiceColumna(nombreHoja, nombreColumna) {
  const columnas = obtenerColumnasHoja(nombreHoja);
  const indice = columnas.indexOf(nombreColumna);
  if (indice === -1) {
    throw new Error('La columna "' + nombreColumna + '" no existe en la hoja "' + nombreHoja + '".');
  }
  return indice + 1;
}

// ============================================================================
// SECCIÓN 7: INICIALIZACIÓN DE ESTRUCTURA DE DATOS
// ============================================================================

/**
 * Inicializa la estructura completa del libro maestro: crea las hojas
 * faltantes y escribe los encabezados correspondientes.
 * Debe ejecutarse una sola vez al desplegar el sistema.
 * @return {Object} Resumen de la operación con hojas creadas y actualizadas.
 */
function inicializarEstructuraDatos() {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(TIEMPO_ESPERA_BLOQUEO_MS);
  try {
    const libro = obtenerLibro();
    const resumen = {
      hojasCreadas: [],
      hojasActualizadas: [],
      errores: []
    };

    Object.keys(HOJAS).forEach(function(clave) {
      const nombreHoja = HOJAS[clave];
      const columnas = COLUMNAS[clave];
      if (!columnas || columnas.length === 0) {
        resumen.errores.push('Sin definición de columnas para: ' + nombreHoja);
        return;
      }

      let hoja = libro.getSheetByName(nombreHoja);
      if (!hoja) {
        hoja = libro.insertSheet(nombreHoja);
        resumen.hojasCreadas.push(nombreHoja);
      }

      const encabezadosActuales = hoja.getLastColumn() > 0
        ? hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0]
        : [];

      const encabezadosCoinciden = columnas.length === encabezadosActuales.length &&
        columnas.every(function(col, i) { return col === encabezadosActuales[i]; });

      if (!encabezadosCoinciden) {
        if (hoja.getLastColumn() > 0) {
          hoja.getRange(1, 1, 1, hoja.getLastColumn()).clearContent();
        }
        hoja.getRange(1, 1, 1, columnas.length).setValues([columnas]);
        hoja.getRange(1, 1, 1, columnas.length)
          .setFontWeight('bold')
          .setBackground('#1F4E78')
          .setFontColor('#FFFFFF');
        hoja.setFrozenRows(1);
        resumen.hojasActualizadas.push(nombreHoja);
      }
    });

    return resumen;
  } catch (error) {
    throw new Error('Error al inicializar estructura de datos: ' + error.message);
  } finally {
    bloqueo.releaseLock();
  }
}

/**
 * Verifica que todas las hojas definidas en HOJAS existan en el libro.
 * @return {Object} Resultado con hojas faltantes y presentes.
 */
function verificarEstructuraDatos() {
  const libro = obtenerLibro();
  const faltantes = [];
  const presentes = [];

  Object.keys(HOJAS).forEach(function(clave) {
    const nombreHoja = HOJAS[clave];
    if (libro.getSheetByName(nombreHoja)) {
      presentes.push(nombreHoja);
    } else {
      faltantes.push(nombreHoja);
    }
  });

  return {
    presentes: presentes,
    faltantes: faltantes,
    estructuraCompleta: faltantes.length === 0
  };
}

// ============================================================================
// SECCIÓN 8: UTILIDADES GENERALES
// ============================================================================

/**
 * Registra un mensaje en la bitácora del sistema.
 * @param {string} accion - Acción realizada.
 * @param {string} modulo - Módulo del sistema.
 * @param {string} detalle - Detalle adicional.
 * @param {string} resultado - Resultado de la operación ('EXITO' | 'ERROR').
 * @param {string} idUsuario - ID del usuario que ejecuta la acción (opcional).
 */
function registrarBitacora(accion, modulo, detalle, resultado, idUsuario) {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(TIEMPO_ESPERA_BLOQUEO_MS);
  try {
    const hoja = obtenerHoja(HOJAS.BITACORA);
    const idBitacora = 'BIT-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000);
    hoja.appendRow([
      idBitacora,
      new Date(),
      idUsuario || 'SISTEMA',
      accion,
      modulo,
      detalle,
      resultado
    ]);
  } catch (error) {
    if (obtenerConfiguracionEntorno().MODO_DEBUG) {
      Logger.log('Error al registrar bitácora: ' + error.message);
    }
  } finally {
    bloqueo.releaseLock();
  }
}

/**
 * Obtiene un valor de configuración desde la hoja Configuracion.
 * @param {string} clave - Clave de configuración.
 * @param {*} valorPorDefecto - Valor por defecto si no existe la clave.
 * @return {*} Valor almacenado o valor por defecto.
 */
function obtenerValorConfiguracion(clave, valorPorDefecto) {
  try {
    const hoja = obtenerHoja(HOJAS.CONFIGURACION);
    const datos = hoja.getDataRange().getValues();
    for (let i = 1; i < datos.length; i++) {
      if (datos[i][0] === clave) {
        return datos[i][1];
      }
    }
  } catch (error) {
    if (obtenerConfiguracionEntorno().MODO_DEBUG) {
      Logger.log('Error al obtener configuración "' + clave + '": ' + error.message);
    }
  }
  return valorPorDefecto;
}

/**
 * Establece un valor de configuración en la hoja Configuracion.
 * @param {string} clave - Clave de configuración.
 * @param {*} valor - Valor a almacenar.
 * @param {string} descripcion - Descripción de la clave.
 */
function establecerValorConfiguracion(clave, valor, descripcion) {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(TIEMPO_ESPERA_BLOQUEO_MS);
  try {
    const hoja = obtenerHoja(HOJAS.CONFIGURACION);
    const datos = hoja.getDataRange().getValues();
    let filaEncontrada = -1;
    for (let i = 1; i < datos.length; i++) {
      if (datos[i][0] === clave) {
        filaEncontrada = i + 1;
        break;
      }
    }
    if (filaEncontrada > 0) {
      hoja.getRange(filaEncontrada, 2, 1, 3).setValues([[valor, descripcion || '', new Date()]]);
    } else {
      hoja.appendRow([clave, valor, descripcion || '', new Date()]);
    }
  } finally {
    bloqueo.releaseLock();
  }
}

/**
 * Genera un identificador único con prefijo.
 * @param {string} prefijo - Prefijo del ID (ej. 'ALU', 'GRP').
 * @return {string} Identificador único.
 */
function generarIdUnico(prefijo) {
  const marcaTiempo = new Date().getTime();
  const aleatorio = Math.floor(Math.random() * 10000);
  return prefijo + '-' + marcaTiempo + '-' + aleatorio;
}

/**
 * Formatea una fecha según el locale configurado.
 * @param {Date} fecha - Fecha a formatear.
 * @return {string} Fecha formateada.
 */
function formatearFecha(fecha) {
  if (!fecha) return '';
  const config = obtenerConfiguracionEntorno();
  return Utilities.formatDate(fecha, config.ZONA_HORARIA, 'dd/MM/yyyy HH:mm:ss');
}