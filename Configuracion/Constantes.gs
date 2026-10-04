/**
 * ============================================================================
 * ARCHITEX OS - Configuracion/Constantes.gs
 * ----------------------------------------------------------------------------
 * Propósito: Centralizar todas las constantes globales del sistema ARCHITEX OS.
 *            Incluye nombres de hojas, IDs de carpetas Drive, límites de
 *            payload, claves de localStorage, versiones de esquema y demás
 *            valores inmutables usados por el backend (Google Apps Script)
 *            y por el frontend (HtmlService).
 *
 * Reglas:
 *  - Nombres en español riguroso.
 *  - Sin dependencias externas.
 *  - Valores inmutables (no mutar en runtime).
 * ============================================================================
 */

/**
 * Objeto global con todas las constantes del sistema.
 * Se expone como `CONSTANTES_ARCHITEX` para ser consumido desde Codigo.gs,
 * Servicios y desde el frontend vía google.script.run.
 */
var CONSTANTES_ARCHITEX = (function () {

  // ==========================================================================
  // 1. IDENTIDAD DEL PROYECTO
  // ==========================================================================
  var IDENTIDAD = {
    NOMBRE_PROYECTO: 'ARCHITEX-OS',
    NOMBRE_SISTEMA: 'ARCHITEX OS',
    VERSION_SISTEMA: '1.0.0',
    VERSION_ESQUEMA: '1.0.0',
    DESCRIPCION: 'Plataforma de gobernanza y auditoría de arquitectura técnica',
    AUTOR: 'Arquitecto Principal ARCHITEX',
    ZONA_HORARIA: 'America/Mexico_City',
    LOCALE: 'es_MX'
  };

  // ==========================================================================
  // 2. NOMBRES DE HOJAS (Google Sheets como base de datos estructurada)
  // ==========================================================================
  var HOJAS = {
    PROYECTOS: '_ARCHITEX_PROYECTOS',
    HISTORIAL: '_ARCHITEX_HISTORIAL',
    META: '_ARCHITEX_META',
    DECISIONES_ADR: 'Decisiones_ADR',
    DIRECTRICES_RSC: 'DirectricesRSC',
    LOGS_AUDITORIA: '_ARCHITEX_LOGS'
  };

  // ==========================================================================
  // 3. ESQUEMAS DE COLUMNAS (orden físico en cada hoja)
  // ==========================================================================
  var ESQUEMAS = {
    // _ARCHITEX_PROYECTOS
    PROYECTOS: [
      'ID_PROYECTO',
      'NOMBRE_PROYECTO',
      'FECHA_ACTUALIZACION',
      'RESUMEN_PROBLEMA',
      'DATOS_JSON_COMPLETOS'
    ],
    // _ARCHITEX_HISTORIAL
    HISTORIAL: [
      'ID_HISTORIAL',
      'ID_PROYECTO',
      'NOMBRE_PROYECTO',
      'FECHA_VERSION',
      'RESUMEN',
      'DATOS_JSON'
    ],
    // _ARCHITEX_META
    META: [
      'version_esquema',
      'fecha_migracion',
      'descripcion'
    ],
    // Decisiones_ADR
    DECISIONES_ADR: [
      'id',
      'codigo_adr',
      'titulo',
      'problema',
      'decision_tomada',
      'justificacion'
    ],
    // DirectricesRSC
    DIRECTRICES_RSC: [
      'agentes_objetivo',
      'ruta_reglas',
      'skills_instaladas'
    ],
    // _ARCHITEX_LOGS
    LOGS_AUDITORIA: [
      'FECHA',
      'NIVEL',
      'MODULO',
      'MENSAJE',
      'USUARIO'
    ]
  };

  // ==========================================================================
  // 4. CARPETAS DE GOOGLE DRIVE
  // ==========================================================================
  var CARPETAS_DRIVE = {
    // Carpeta raíz de respaldos JSON (> 45KB)
    RESPALDOS_JSON: '_ARCHITEX_RESPALDOS_JSON',
    // Carpeta de artefactos de auditoría
    AUDITORIA: '_ARCHITEX_AUDITORIA',
    // Carpeta de exportaciones SDD
    EXPORTACIONES_SDD: '_ARCHITEX_EXPORTACIONES_SDD',
    // Carpeta de diagramas Mermaid renderizados
    DIAGRAMAS: '_ARCHITEX_DIAGRAMAS',
    // Prefijo de archivos de respaldo
    PREFIJO_RESPALDO: 'RESPALDO_',
    // Extensión de archivos de respaldo
    EXTENSION_RESPALDO: '.json'
  };

  // ==========================================================================
  // 5. LÍMITES DE PAYLOAD Y ALMACENAMIENTO
  // ==========================================================================
  var LIMITES = {
    // Límite máximo de payload en una celda de Sheets (45 KB)
    PAYLOAD_MAXIMO_BYTES: 45 * 1024,
    // Límite de caracteres por celda de Google Sheets
    CARACTERES_MAXIMOS_CELDA: 50000,
    // Límite de filas por hoja
    FILAS_MAXIMAS_HOJA: 10000000,
    // Límite de columnas por hoja
    COLUMNAS_MAXIMAS_HOJA: 18278,
    // Tamaño máximo de un archivo JSON de respaldo
    TAMANO_MAXIMO_RESPALDO_BYTES: 10 * 1024 * 1024,
    // Timeout de LockService en milisegundos
    TIMEOUT_LOCK_MS: 30000,
    // Reintentos máximos para operaciones con LockService
    REINTENTOS_LOCK: 3,
    // Espera entre reintentos de lock (ms)
    ESPERA_REINTENTO_LOCK_MS: 500,
    // Máximo de versiones de historial por proyecto
    MAXIMO_VERSIONES_HISTORIAL: 1000,
    // Máximo de proyectos por hoja
    MAXIMO_PROYECTOS: 5000
  };

  // ==========================================================================
  // 6. CLAVES DE LOCALSTORAGE (frontend)
  // ==========================================================================
  var CLAVES_LOCALSTORAGE = {
    // Prefijo global para todas las claves
    PREFIJO: 'architex_os_',
    // Sesión activa del usuario
    SESION_USUARIO: 'architex_os_sesion_usuario',
    // Proyecto activo en edición
    PROYECTO_ACTIVO: 'architex_os_proyecto_activo',
    // Borrador local del proyecto (antes de sincronizar)
    BORRADOR_PROYECTO: 'architex_os_borrador_proyecto',
    // Caché de proyectos sincronizados
    CACHE_PROYECTOS: 'architex_os_cache_proyectos',
    // Caché de historial
    CACHE_HISTORIAL: 'architex_os_cache_historial',
    // Configuración de UI (tema, layout)
    CONFIG_UI: 'architex_os_config_ui',
    // Última sincronización con Sheets
    ULTIMA_SINCRONIZACION: 'architex_os_ultima_sincronizacion',
    // Token de sesión temporal
    TOKEN_SESION: 'architex_os_token_sesion',
    // Estado del asistente de onboarding
    ESTADO_ONBOARDING: 'architex_os_estado_onboarding',
    // Ruta de carpeta física seleccionada
    RUTA_CARPETA_FISICA: 'architex_os_ruta_carpeta_fisica',
    // Preferencias del analizador DeepSeek
    PREFERENCIAS_DEEPSEEK: 'architex_os_preferencias_deepseek',
    // Historial de comandos SDD
    HISTORIAL_COMANDOS_SDD: 'architex_os_historial_comandos_sdd'
  };

  // ==========================================================================
  // 7. CLAVES DE PROPERTIES SERVICE (backend)
  // ==========================================================================
  var CLAVES_PROPERTIES = {
    // ID del Spreadsheet principal
    SPREADSHEET_ID: 'ARCHITEX_SPREADSHEET_ID',
    // ID de carpeta raíz en Drive
    CARPETA_RAIZ_ID: 'ARCHITEX_CARPETA_RAIZ_ID',
    // ID de carpeta de respaldos
    CARPETA_RESPALDOS_ID: 'ARCHITEX_CARPETA_RESPALDOS_ID',
    // API Key de DeepSeek (si aplica)
    DEEPSEEK_API_KEY: 'ARCHITEX_DEEPSEEK_API_KEY',
    // Versión de esquema instalada
    VERSION_ESQUEMA_INSTALADA: 'ARCHITEX_VERSION_ESQUEMA',
    // Fecha de instalación
    FECHA_INSTALACION: 'ARCHITEX_FECHA_INSTALACION',
    // Modo de ejecución (DEV / PROD)
    MODO_EJECUCION: 'ARCHITEX_MODO_EJECUCION'
  };

  // ==========================================================================
  // 8. NIVELES DE LOG
  // ==========================================================================
  var NIVELES_LOG = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    ADVERTENCIA: 'ADVERTENCIA',
    ERROR: 'ERROR',
    CRITICO: 'CRITICO'
  };

  // ==========================================================================
  // 9. MÓDULOS DEL SISTEMA
  // ==========================================================================
  var MODULOS = {
    GOBERNANZA: 'Gobernanza',
    MODELADO_ER: 'ModeladoER',
    ONBOARDING: 'Onboarding',
    ANALIZADOR_DEEPSEEK: 'AnalizadorDeepSeek',
    PERSISTENCIA: 'Persistencia',
    HISTORIAL: 'Historial',
    AUDITORIA: 'Auditoria',
    AGENTES_IA: 'AgentesIA',
    DESPLIEGUE: 'Despliegue'
  };

  // ==========================================================================
  // 10. ROLES Y NODOS
  // ==========================================================================
  var ROLES = {
    ARQUITECTO_PRINCIPAL: 'Arquitecto Principal',
    INGENIERO_SOFTWARE: 'Ingeniero de Software',
    AGENTE_DEVELOPER: 'Agente IA Developer',
    AGENTE_REFUTER: 'Agente IA Refuter-Correctness',
    AUDITOR_GOBERNANZA: 'Auditor de Gobernanza',
    USUARIO_FINAL: 'Usuario Final',
    DEPLOYER: 'Deployer'
  };

  // ==========================================================================
  // 11. COMANDOS SDD
  // ==========================================================================
  var COMANDOS_SDD = {
    ESPECIFICAR: '/sdd:especificar',
    DISENAR: '/sdd:disenar',
    IMPLEMENTAR: '/sdd:implementar',
    REFUTAR: '/sdd:refutar',
    AUDITAR: '/sdd:auditar',
    DESPLEGAR: '/sdd:desplegar',
    VERSIONAR: '/sdd:versionar'
  };

  // ==========================================================================
  // 12. ESTADOS DE PROYECTO
  // ==========================================================================
  var ESTADOS_PROYECTO = {
    BORRADOR: 'BORRADOR',
    EN_REVISION: 'EN_REVISION',
    APROBADO: 'APROBADO',
    RECHAZADO: 'RECHAZADO',
    ARCHIVADO: 'ARCHIVADO',
    DESPLEGADO: 'DESPLEGADO'
  };

  // ==========================================================================
  // 13. CONFIGURACIÓN DE UI
  // ==========================================================================
  var UI = {
    TITULO_APP: 'ARCHITEX OS',
    SUBTITULO_APP: 'Gobernanza y Auditoría de Arquitectura Técnica',
    TEMA_DEFECTO: 'oscuro',
    IDIOMA_DEFECTO: 'es',
    ANCHO_MAXIMO_CONTENEDOR: '1400px',
    DURACION_NOTIFICACION_MS: 4000,
    DURACION_ANIMACION_MS: 300
  };

  // ==========================================================================
  // 14. CONFIGURACIÓN DE SINCRONIZACIÓN
  // ==========================================================================
  var SINCRONIZACION = {
    // Intervalo de auto-sync en ms (5 minutos)
    INTERVALO_AUTO_SYNC_MS: 5 * 60 * 1000,
    // Máximo de reintentos de sincronización
    MAXIMO_REINTENTOS: 5,
    // Espera entre reintentos (ms)
    ESPERA_REINTENTO_MS: 2000,
    // Modo de sincronización (AUTO / MANUAL)
    MODO_DEFECTO: 'AUTO',
    // Estrategia de conflicto (LOCAL_GANA / REMOTO_GANA / PREGUNTAR)
    ESTRATEGIA_CONFLICTO: 'PREGUNTAR'
  };

  // ==========================================================================
  // 15. CONFIGURACIÓN DE AGENTES IA
  // ==========================================================================
  var AGENTES_IA = {
    RUTA_AGENTES: '.cursor/agents/',
    ARCHIVO_DEVELOPER: 'developer.md',
    ARCHIVO_REFUTER: 'refuter-correctness.md',
    ARCHIVO_ARQUITECTO: 'architect.md',
    ARCHIVO_AUDITOR: 'auditor.md',
    MAXIMO_TOKENS_RESPUESTA: 8192,
    TEMPERATURA_DEFECTO: 0.3,
    MODELO_DEFECTO: 'deepseek-chat'
  };

  // ==========================================================================
  // 16. MENSAJES DEL SISTEMA
  // ==========================================================================
  var MENSAJES = {
    ERROR_LOCK_TIMEOUT: 'No se pudo adquirir el lock de escritura. Reintente en unos segundos.',
    ERROR_PAYLOAD_EXCEDIDO: 'El payload excede el límite de 45KB. Se almacenará en Drive.',
    ERROR_HOJA_NO_ENCONTRADA: 'La hoja solicitada no existe en el Spreadsheet.',
    ERROR_PROYECTO_NO_ENCONTRADO: 'El proyecto solicitado no existe.',
    ERROR_SINCRONIZACION: 'Error al sincronizar con Google Sheets.',
    EXITO_GUARDADO: 'Proyecto guardado correctamente.',
    EXITO_SINCRONIZACION: 'Sincronización completada.',
    INFO_RESPALDO_CREADO: 'Respaldo JSON creado en Drive.',
    ADVERTENCIA_CONFLICTO: 'Se detectó un conflicto de versiones. Revise el historial.'
  };

  // ==========================================================================
  // 17. CONFIGURACIÓN DE RESPALDOS
  // ==========================================================================
  var RESPALDOS = {
    // Frecuencia de respaldo automático (en horas)
    FRECUENCIA_HORAS: 24,
    // Máximo de respaldos a conservar
    MAXIMO_RESPALDOS: 30,
    // Formato de fecha para nombres de archivo
    FORMATO_FECHA: 'yyyyMMdd_HHmmss',
    // Compresión habilitada
    COMPRESION_HABILITADA: false
  };

  // ==========================================================================
  // 18. CONFIGURACIÓN DE AUDITORÍA
  // ==========================================================================
  var AUDITORIA = {
    // Registrar todas las operaciones de escritura
    REGISTRAR_ESCRITURAS: true,
    // Registrar lecturas
    REGISTRAR_LECTURAS: false,
    // Retención de logs en días
    RETENCION_DIAS: 365,
    // Nivel mínimo de log
    NIVEL_MINIMO: 'INFO'
  };

  // ==========================================================================
  // 19. CONFIGURACIÓN DE ONBOARDING
  // ==========================================================================
  var ONBOARDING = {
    PASOS_TOTALES: 7,
    PASO_INICIAL: 1,
    COMANDO_CD_WINDOWS: 'cd /d',
    RUTA_PROYECTO_DEFECTO: 'g:\\Mi unidad\\PROYECTOS\\ARCHITEX-OS',
    COMANDO_CLASP_LOGIN: 'clasp login',
    COMANDO_CLASP_PUSH: 'clasp push',
    COMANDO_CLASP_DEPLOY: 'clasp deploy'
  };

  // ==========================================================================
  // 20. API PÚBLICA DEL MÓDULO
  // ==========================================================================
  return {
    IDENTIDAD: IDENTIDAD,
    HOJAS: HOJAS,
    ESQUEMAS: ESQUEMAS,
    CARPETAS_DRIVE: CARPETAS_DRIVE,
    LIMITES: LIMITES,
    CLAVES_LOCALSTORAGE: CLAVES_LOCALSTORAGE,
    CLAVES_PROPERTIES: CLAVES_PROPERTIES,
    NIVELES_LOG: NIVELES_LOG,
    MODULOS: MODULOS,
    ROLES: ROLES,
    COMANDOS_SDD: COMANDOS_SDD,
    ESTADOS_PROYECTO: ESTADOS_PROYECTO,
    UI: UI,
    SINCRONIZACION: SINCRONIZACION,
    AGENTES_IA: AGENTES_IA,
    MENSAJES: MENSAJES,
    RESPALDOS: RESPALDOS,
    AUDITORIA: AUDITORIA,
    ONBOARDING: ONBOARDING
  };

})();

/**
 * ============================================================================
 * FUNCIONES AUXILIARES DE ACCESO A CONSTANTES
 * ----------------------------------------------------------------------------
 * Estas funciones exponen las constantes al frontend vía google.script.run
 * y permiten validaciones rápidas desde el backend.
 * ============================================================================
 */

/**
 * Devuelve el objeto completo de constantes para consumo del frontend.
 * @return {Object} Objeto CONSTANTES_ARCHITEX serializable.
 */
function obtenerConstantes() {
  return CONSTANTES_ARCHITEX;
}

/**
 * Devuelve el nombre de una hoja por su clave lógica.
 * @param {string} claveHoja Clave dentro de CONSTANTES_ARCHITEX.HOJAS.
 * @return {string} Nombre físico de la hoja.
 */
function obtenerNombreHoja(claveHoja) {
  var hojas = CONSTANTES_ARCHITEX.HOJAS;
  if (!hojas.hasOwnProperty(claveHoja)) {
    throw new Error('Clave de hoja no reconocida: ' + claveHoja);
  }
  return hojas[claveHoja];
}

/**
 * Devuelve el esquema de columnas de una hoja por su clave lógica.
 * @param {string} claveEsquema Clave dentro de CONSTANTES_ARCHITEX.ESQUEMAS.
 * @return {Array<string>} Arreglo de nombres de columnas.
 */
function obtenerEsquemaHoja(claveEsquema) {
  var esquemas = CONSTANTES_ARCHITEX.ESQUEMAS;
  if (!esquemas.hasOwnProperty(claveEsquema)) {
    throw new Error('Clave de esquema no reconocida: ' + claveEsquema);
  }
  return esquemas[claveEsquema].slice();
}

/**
 * Verifica si un payload excede el límite permitido para celdas de Sheets.
 * @param {string} payload Cadena JSON serializada.
 * @return {boolean} true si excede el límite, false en caso contrario.
 */
function excedeLimitePayload(payload) {
  if (payload === null || payload === undefined) {
    return false;
  }
  var tamano = Utilities.newBlob(String(payload)).getBytes().length;
  return tamano > CONSTANTES_ARCHITEX.LIMITES.PAYLOAD_MAXIMO_BYTES;
}

/**
 * Devuelve la clave de localStorage con prefijo aplicado.
 * @param {string} claveBase Clave base sin prefijo.
 * @return {string} Clave completa con prefijo.
 */
function construirClaveLocalStorage(claveBase) {
  return CONSTANTES_ARCHITEX.CLAVES_LOCALSTORAGE.PREFIJO + claveBase;
}

/**
 * Devuelve el valor de una clave de Properties Service.
 * @param {string} clave Clave dentro de CONSTANTES_ARCHITEX.CLAVES_PROPERTIES.
 * @return {string|null} Valor almacenado o null si no existe.
 */
function obtenerProperty(clave) {
  var claves = CONSTANTES_ARCHITEX.CLAVES_PROPERTIES;
  if (!claves.hasOwnProperty(clave)) {
    throw new Error('Clave de Properties no reconocida: ' + clave);
  }
  return PropertiesService.getScriptProperties().getProperty(claves[clave]);
}

/**
 * Establece el valor de una clave de Properties Service.
 * @param {string} clave Clave dentro de CONSTANTES_ARCHITEX.CLAVES_PROPERTIES.
 * @param {string} valor Valor a almacenar.
 */
function establecerProperty(clave, valor) {
  var claves = CONSTANTES_ARCHITEX.CLAVES_PROPERTIES;
  if (!claves.hasOwnProperty(clave)) {
    throw new Error('Clave de Properties no reconocida: ' + clave);
  }
  PropertiesService.getScriptProperties().setProperty(claves[clave], String(valor));
}