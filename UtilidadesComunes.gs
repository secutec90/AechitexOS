/**
 * UtilidadesComunes.gs
 * Funciones auxiliares transversales para ARCHITEX OS:
 * formateo de fechas, validaciones, manejo de errores y respuestas estandarizadas.
 */

// ============================================================
// CONSTANTES GLOBALES
// ============================================================

const ZONA_HORARIA_ARCHITEX = 'America/Mexico_City';
const FORMATO_FECHA_ISO = 'yyyy-MM-dd';
const FORMATO_FECHA_HORA = 'yyyy-MM-dd HH:mm:ss';
const FORMATO_FECHA_LEGIBLE = 'dd/MM/yyyy';
const TIEMPO_BLOQUEO_MS = 15000;

// ============================================================
// RESPUESTAS ESTANDARIZADAS
// ============================================================

/**
 * Construye una respuesta exitosa estandarizada.
 * @param {*} datos - Carga útil de la respuesta.
 * @param {string} mensaje - Mensaje descriptivo opcional.
 * @return {Object} Objeto con estructura { exito, mensaje, datos, timestamp }.
 */
function respuestaExitosa(datos, mensaje) {
  return {
    exito: true,
    mensaje: mensaje || 'Operación completada correctamente.',
    datos: datos !== undefined ? datos : null,
    timestamp: obtenerFechaHoraActual()
  };
}

/**
 * Construye una respuesta de error estandarizada.
 * @param {string} mensaje - Mensaje de error legible.
 * @param {string} codigo - Código interno del error (opcional).
 * @param {*} detalles - Información adicional del error (opcional).
 * @return {Object} Objeto con estructura { exito, mensaje, codigo, detalles, timestamp }.
 */
function respuestaError(mensaje, codigo, detalles) {
  return {
    exito: false,
    mensaje: mensaje || 'Ocurrió un error inesperado.',
    codigo: codigo || 'ERROR_GENERICO',
    detalles: detalles !== undefined ? detalles : null,
    timestamp: obtenerFechaHoraActual()
  };
}

// ============================================================
// MANEJO DE ERRORES
// ============================================================

/**
 * Ejecuta una función de forma segura capturando errores y devolviendo
 * una respuesta estandarizada.
 * @param {Function} funcion - Función a ejecutar.
 * @param {string} contexto - Nombre del contexto para trazabilidad.
 * @return {Object} Respuesta estandarizada (exitosa o de error).
 */
function ejecutarConManejoErrores(funcion, contexto) {
  try {
    const resultado = funcion();
    return respuestaExitosa(resultado, 'Ejecución correcta en: ' + (contexto || 'desconocido'));
  } catch (error) {
    registrarError(error, contexto);
    return respuestaError(
      error && error.message ? error.message : String(error),
      'ERROR_EJECUCION',
      { contexto: contexto || 'desconocido', pila: error && error.stack ? error.stack : null }
    );
  }
}

/**
 * Registra un error en el log de Apps Script con contexto.
 * @param {Error} error - Objeto de error capturado.
 * @param {string} contexto - Contexto donde ocurrió el error.
 */
function registrarError(error, contexto) {
  const marca = obtenerFechaHoraActual();
  const mensaje = error && error.message ? error.message : String(error);
  const pila = error && error.stack ? error.stack : 'sin pila';
  Logger.log('[ARCHITEX ERROR][' + marca + '][' + (contexto || 'general') + '] ' + mensaje + '\n' + pila);
}

// ============================================================
// BLOQUEO Y CONCURRENCIA
// ============================================================

/**
 * Ejecuta una función bajo bloqueo de script para escritura segura en Sheets.
 * @param {Function} funcion - Función a ejecutar dentro del bloqueo.
 * @param {number} tiempoEsperaMs - Tiempo máximo de espera (opcional).
 * @return {*} Resultado de la función ejecutada.
 */
function ejecutarConBloqueo(funcion, tiempoEsperaMs) {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(tiempoEsperaMs || TIEMPO_BLOQUEO_MS);
  try {
    return funcion();
  } finally {
    bloqueo.releaseLock();
  }
}

// ============================================================
// FECHAS Y HORA
// ============================================================

/**
 * Obtiene la fecha y hora actual en la zona horaria de ARCHITEX.
 * @return {Date} Objeto Date actual.
 */
function obtenerFechaHoraActual() {
  return new Date();
}

/**
 * Formatea una fecha al formato ISO (yyyy-MM-dd).
 * @param {Date|string} fecha - Fecha a formatear.
 * @return {string} Fecha formateada o cadena vacía si es inválida.
 */
function formatearFechaISO(fecha) {
  const fechaValida = convertirAFecha(fecha);
  if (!fechaValida) return '';
  return Utilities.formatDate(fechaValida, ZONA_HORARIA_ARCHITEX, FORMATO_FECHA_ISO);
}

/**
 * Formatea una fecha y hora al formato yyyy-MM-dd HH:mm:ss.
 * @param {Date|string} fecha - Fecha a formatear.
 * @return {string} Fecha y hora formateada o cadena vacía si es inválida.
 */
function formatearFechaHora(fecha) {
  const fechaValida = convertirAFecha(fecha);
  if (!fechaValida) return '';
  return Utilities.formatDate(fechaValida, ZONA_HORARIA_ARCHITEX, FORMATO_FECHA_HORA);
}

/**
 * Formatea una fecha al formato legible dd/MM/yyyy.
 * @param {Date|string} fecha - Fecha a formatear.
 * @return {string} Fecha legible o cadena vacía si es inválida.
 */
function formatearFechaLegible(fecha) {
  const fechaValida = convertirAFecha(fecha);
  if (!fechaValida) return '';
  return Utilities.formatDate(fechaValida, ZONA_HORARIA_ARCHITEX, FORMATO_FECHA_LEGIBLE);
}

/**
 * Convierte distintos tipos de entrada a un objeto Date válido.
 * @param {Date|string|number} valor - Valor a convertir.
 * @return {Date|null} Objeto Date o null si no es válido.
 */
function convertirAFecha(valor) {
  if (!valor && valor !== 0) return null;
  if (valor instanceof Date) {
    return isNaN(valor.getTime()) ? null : valor;
  }
  if (typeof valor === 'string') {
    const limpio = valor.trim();
    if (limpio === '') return null;
    const posible = new Date(limpio);
    return isNaN(posible.getTime()) ? null : posible;
  }
  if (typeof valor === 'number') {
    const posible = new Date(valor);
    return isNaN(posible.getTime()) ? null : posible;
  }
  return null;
}

/**
 * Calcula la diferencia en días entre dos fechas.
 * @param {Date|string} fechaInicio - Fecha inicial.
 * @param {Date|string} fechaFin - Fecha final.
 * @return {number} Diferencia en días (positiva si fechaFin > fechaInicio).
 */
function calcularDiferenciaDias(fechaInicio, fechaFin) {
  const inicio = convertirAFecha(fechaInicio);
  const fin = convertirAFecha(fechaFin);
  if (!inicio || !fin) return 0;
  const msPorDia = 1000 * 60 * 60 * 24;
  return Math.round((fin.getTime() - inicio.getTime()) / msPorDia);
}

// ============================================================
// VALIDACIONES
// ============================================================

/**
 * Verifica si un valor es una cadena no vacía.
 * @param {*} valor - Valor a verificar.
 * @return {boolean} true si es cadena no vacía.
 */
function esCadenaNoVacia(valor) {
  return typeof valor === 'string' && valor.trim().length > 0;
}

/**
 * Verifica si un valor es un número finito.
 * @param {*} valor - Valor a verificar.
 * @return {boolean} true si es número válido.
 */
function esNumeroValido(valor) {
  return typeof valor === 'number' && isFinite(valor);
}

/**
 * Verifica si un correo electrónico tiene formato válido.
 * @param {string} correo - Correo a validar.
 * @return {boolean} true si el formato es válido.
 */
function esCorreoValido(correo) {
  if (!esCadenaNoVacia(correo)) return false;
  const patron = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return patron.test(correo.trim());
}

/**
 * Verifica si un objeto es un arreglo no vacío.
 * @param {*} valor - Valor a verificar.
 * @return {boolean} true si es arreglo con al menos un elemento.
 */
function esArregloNoVacio(valor) {
  return Array.isArray(valor) && valor.length > 0;
}

/**
 * Verifica si un valor está vacío (null, undefined, cadena vacía o arreglo vacío).
 * @param {*} valor - Valor a verificar.
 * @return {boolean} true si está vacío.
 */
function estaVacio(valor) {
  if (valor === null || valor === undefined) return true;
  if (typeof valor === 'string') return valor.trim() === '';
  if (Array.isArray(valor)) return valor.length === 0;
  if (typeof valor === 'object') return Object.keys(valor).length === 0;
  return false;
}

/**
 * Valida que un objeto contenga todas las claves requeridas y no vacías.
 * @param {Object} objeto - Objeto a validar.
 * @param {Array<string>} clavesRequeridas - Lista de claves obligatorias.
 * @return {Object} { valido: boolean, faltantes: Array<string> }.
 */
function validarCamposRequeridos(objeto, clavesRequeridas) {
  const faltantes = [];
  if (!objeto || typeof objeto !== 'object') {
    return { valido: false, faltantes: clavesRequeridas.slice() };
  }
  clavesRequeridas.forEach(function (clave) {
    if (estaVacio(objeto[clave])) faltantes.push(clave);
  });
  return { valido: faltantes.length === 0, faltantes: faltantes };
}

// ============================================================
// UTILIDADES DE TEXTO
// ============================================================

/**
 * Normaliza una cadena: recorta espacios y colapsa espacios internos.
 * @param {string} texto - Texto a normalizar.
 * @return {string} Texto normalizado.
 */
function normalizarTexto(texto) {
  if (!esCadenaNoVacia(texto)) return '';
  return texto.trim().replace(/\s+/g, ' ');
}

/**
 * Convierte una cadena a formato título (primera letra mayúscula).
 * @param {string} texto - Texto a convertir.
 * @return {string} Texto en formato título.
 */
function convertirATitulo(texto) {
  const normalizado = normalizarTexto(texto);
  if (normalizado === '') return '';
  return normalizado
    .toLowerCase()
    .split(' ')
    .map(function (palabra) {
      return palabra.charAt(0).toUpperCase() + palabra.slice(1);
    })
    .join(' ');
}

/**
 * Genera un identificador único basado en timestamp y aleatorio.
 * @param {string} prefijo - Prefijo opcional para el identificador.
 * @return {string} Identificador único.
 */
function generarIdentificadorUnico(prefijo) {
  const marca = new Date().getTime();
  const aleatorio = Math.floor(Math.random() * 1000000);
  const base = marca + '-' + aleatorio;
  return prefijo ? prefijo + '-' + base : base;
}

// ============================================================
// UTILIDADES DE HOJAS
// ============================================================

/**
 * Obtiene una hoja por nombre dentro de una hoja de cálculo.
 * @param {Spreadsheet} libro - Hoja de cálculo.
 * @param {string} nombreHoja - Nombre de la hoja.
 * @return {Sheet|null} Hoja encontrada o null.
 */
function obtenerHojaPorNombre(libro, nombreHoja) {
  if (!libro || !esCadenaNoVacia(nombreHoja)) return null;
  return libro.getSheetByName(nombreHoja);
}

/**
 * Obtiene o crea una hoja por nombre dentro de una hoja de cálculo.
 * @param {Spreadsheet} libro - Hoja de cálculo.
 * @param {string} nombreHoja - Nombre de la hoja.
 * @return {Sheet} Hoja existente o recién creada.
 */
function obtenerOCrearHoja(libro, nombreHoja) {
  if (!libro) throw new Error('Libro no proporcionado.');
  if (!esCadenaNoVacia(nombreHoja)) throw new Error('Nombre de hoja inválido.');
  let hoja = libro.getSheetByName(nombreHoja);
  if (!hoja) hoja = libro.insertSheet(nombreHoja);
  return hoja;
}

/**
 * Convierte una fila de valores en un objeto usando encabezados.
 * @param {Array<string>} encabezados - Nombres de columnas.
 * @param {Array<*>} fila - Valores de la fila.
 * @return {Object} Objeto con pares clave-valor.
 */
function filaAObjeto(encabezados, fila) {
  const objeto = {};
  if (!Array.isArray(encabezados) || !Array.isArray(fila)) return objeto;
  encabezados.forEach(function (clave, indice) {
    if (esCadenaNoVacia(clave)) {
      objeto[clave.trim()] = fila[indice] !== undefined ? fila[indice] : '';
    }
  });
  return objeto;
}

/**
 * Convierte un arreglo de filas en arreglo de objetos usando encabezados.
 * @param {Array<string>} encabezados - Nombres de columnas.
 * @param {Array<Array<*>>} filas - Filas de datos.
 * @return {Array<Object>} Arreglo de objetos.
 */
function filasAObjetos(encabezados, filas) {
  if (!Array.isArray(filas)) return [];
  return filas.map(function (fila) {
    return filaAObjeto(encabezados, fila);
  });
}

// ============================================================
// UTILIDADES DE OBJETOS Y ARREGLOS
// ============================================================

/**
 * Clona profundamente un objeto o arreglo serializable.
 * @param {*} valor - Valor a clonar.
 * @return {*} Copia profunda del valor.
 */
function clonarProfundo(valor) {
  if (valor === null || typeof valor !== 'object') return valor;
  return JSON.parse(JSON.stringify(valor));
}

/**
 * Agrupa un arreglo de objetos por el valor de una clave.
 * @param {Array<Object>} arreglo - Arreglo de objetos.
 * @param {string} clave - Clave por la cual agrupar.
 * @return {Object} Objeto con arreglos agrupados.
 */
function agruparPorClave(arreglo, clave) {
  const resultado = {};
  if (!Array.isArray(arreglo) || !esCadenaNoVacia(clave)) return resultado;
  arreglo.forEach(function (elemento) {
    if (!elemento || typeof elemento !== 'object') return;
    const valorClave = elemento[clave];
    if (valorClave === undefined || valorClave === null) return;
    const llave = String(valorClave);
    if (!resultado[llave]) resultado[llave] = [];
    resultado[llave].push(elemento);
  });
  return resultado;
}

/**
 * Elimina duplicados de un arreglo simple.
 * @param {Array<*>} arreglo - Arreglo con posibles duplicados.
 * @return {Array<*>} Arreglo sin duplicados.
 */
function eliminarDuplicados(arreglo) {
  if (!Array.isArray(arreglo)) return [];
  const vistos = {};
  const resultado = [];
  arreglo.forEach(function (elemento) {
    const llave = typeof elemento + '::' + String(elemento);
    if (!vistos[llave]) {
      vistos[llave] = true;
      resultado.push(elemento);
    }
  });
  return resultado;
}

// ============================================================
// UTILIDADES DE PROPIEDADES
// ============================================================

/**
 * Obtiene una propiedad del script con valor por defecto.
 * @param {string} clave - Clave de la propiedad.
 * @param {*} valorPorDefecto - Valor por defecto si no existe.
 * @return {*} Valor de la propiedad o valor por defecto.
 */
function obtenerPropiedadScript(clave, valorPorDefecto) {
  if (!esCadenaNoVacia(clave)) return valorPorDefecto;
  const valor = PropertiesService.getScriptProperties().getProperty(clave);
  return valor !== null && valor !== undefined ? valor : valorPorDefecto;
}

/**
 * Establece una propiedad del script.
 * @param {string} clave - Clave de la propiedad.
 * @param {*} valor - Valor a guardar.
 * @return {boolean} true si se guardó correctamente.
 */
function establecerPropiedadScript(clave, valor) {
  if (!esCadenaNoVacia(clave)) return false;
  try {
    PropertiesService.getScriptProperties().setProperty(clave, String(valor));
    return true;
  } catch (error) {
    registrarError(error, 'establecerPropiedadScript');
    return false;
  }
}