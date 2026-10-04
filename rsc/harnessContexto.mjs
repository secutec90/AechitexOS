/**
 * ARCHITEX OS V-36 — RSC-6: RSC-HARNESS (THIN CLI WRAPPER)
 *
 * Punto de entrada de consulta y certificación de contexto para agentes externos
 * (Antigravity, Cursor, Claude) y desarrolladores humanos.
 *
 * Características fundamentales:
 * 1. Thin Wrapper sobre RSC-4: No duplica hashing, normalización ni detección de secretos.
 * 2. Mecanismo de Certificación Cooperativo: NO bloquea físicamente archivos en el SO.
 * 3. Read-Only / Cero Auto-Sync: solicitar-regeneracion solo informa la plantilla; nunca ejecuta RSC-5.
 * 4. Determinista: Salida estándar humana o --json estructurada.
 * 5. Códigos de salida: 0 si VALIDO (aptoParaConsumo=true); 1 en cualquier otro estado.
 */

import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import {
  ESTADOS_VERIFICACION,
  PARENT_STATUS_F3,
  verificarContextoRsc4,
  verificarConjuntoProyecciones,
  verificarTextoProyeccion
} from './verificadorContexto.mjs';
import {
  prepararRegeneracion,
  crearSolicitudAutorizacion,
  leerProyeccionActiva
} from './regeneradorProyecciones.mjs';

export const COMANDOS_HARNESS = {
  VERIFICAR: 'verificar',
  INSPECCIONAR: 'inspeccionar',
  SOLICITAR_REGENERACION: 'solicitar-regeneracion'
};

const ARCHIVOS_REPOSITORIO = [
  { nombre: 'ARCHITEX_STATE.json', tipo: 'json' },
  { nombre: '.antigravity/context.md', tipo: 'texto' },
  { nombre: '.cursorrules', tipo: 'texto' },
  { nombre: 'CLAUDE.md', tipo: 'texto' },
  { nombre: 'skills/architex-context/SKILL.md', tipo: 'texto' },
  { nombre: 'skills/lockservice-concurrency/SKILL.md', tipo: 'texto' }
];

/**
 * Normaliza y compara el tenantId considerando la equivalencia de proyectos monotenant en V-36.
 *
 * @param {any} tenantDeclarado - tenantId extraído de la proyección.
 * @param {any} tenantEsperado - tenantId exigido por el consumidor.
 * @return {boolean} true si coinciden según las reglas formales.
 */
export function validarCoincidenciaTenant(tenantDeclarado, tenantEsperado) {
  if (tenantEsperado === undefined) return true;

  // Casos monotenant / ausencia de multi-tenant corporativo
  const esMonotenantEsperado = tenantEsperado === null || tenantEsperado === 'no';
  const esMonotenantDeclarado = tenantDeclarado === null || tenantDeclarado === 'no';

  if (esMonotenantEsperado && esMonotenantDeclarado) {
    return true;
  }

  // Tenant corporativo explícito exige coincidencia exacta
  return tenantDeclarado === tenantEsperado;
}

/**
 * Evalúa las proyecciones activas en el repositorio delegando la verificación a RSC-4.
 *
 * @param {string} directorioRaiz - Directorio raíz del proyecto.
 * @param {Object} [opciones] - Opciones (tenantIdEsperado, projectIdEsperado, contextoActual).
 * @return {Object} DiagnosticoHarnessRsc6 estructurado.
 */
export function evaluarHarnessContexto(directorioRaiz, opciones = {}) {
  const opts = opciones && typeof opciones === 'object' ? opciones : {};
  const rutaBase = resolve(directorioRaiz || process.cwd());

  const archivosAuditados = [];
  const rutaState = join(rutaBase, 'ARCHITEX_STATE.json');

  if (!existsSync(rutaState)) {
    return {
      timestamp: new Date().toISOString(),
      estadoContexto: ESTADOS_VERIFICACION.INCOMPLETO,
      aptoParaConsumo: false,
      identidad: { tenantId: null, projectId: null, contentHash: null },
      archivosAuditados: [],
      mensaje: 'ARCHITEX_STATE.json no existe en el directorio auditado.',
      accionRequerida: 'Se requiere generar las proyecciones iniciales (RSC-3) o verificar la ruta del repositorio.'
    };
  }

  let rawState = '';
  try {
    rawState = readFileSync(rutaState, 'utf8');
  } catch (e) {
    return {
      timestamp: new Date().toISOString(),
      estadoContexto: ESTADOS_VERIFICACION.NO_VERIFICABLE,
      aptoParaConsumo: false,
      identidad: { tenantId: null, projectId: null, contentHash: null },
      archivosAuditados: [],
      mensaje: `No se pudo leer ARCHITEX_STATE.json: ${e.message}`,
      accionRequerida: 'Verificar permisos de lectura en el sistema de archivos.'
    };
  }

  // 1. Verificar estructurado mediante RSC-4
  const resState = verificarContextoRsc4(rawState, {
    contextoActual: opts.contextoActual,
    projectIdEsperado: opts.projectIdEsperado,
    contentHashEsperado: opts.contentHashEsperado
  });

  const objState = leerProyeccionActiva(rutaBase) || {};

  let estadoFinal = resState.estado;
  let mensajeFinal = resState.razon || 'Proyección estructurada verificada.';

  // Detección explícita de ausencia de propiedad tenantId (INCOMPLETO)
  if (resState.estado !== ESTADOS_VERIFICACION.NO_VERIFICABLE && objState.tenantId === undefined) {
    estadoFinal = ESTADOS_VERIFICACION.INCOMPLETO;
    mensajeFinal = 'La proyección no contiene el metadato obligatorio tenantId (esperado string o null).';
  } else if (opts.tenantIdEsperado !== undefined) {
    // Validar regla formal multi-tenant
    const tenantValido = validarCoincidenciaTenant(objState.tenantId, opts.tenantIdEsperado);
    if (!tenantValido) {
      estadoFinal = ESTADOS_VERIFICACION.INVALIDO;
      mensajeFinal = `tenantId incompatible: esperado "${opts.tenantIdEsperado}", declarado "${objState.tenantId}"`;
    }
  }

  const hashCanonica = resState.contentHash || objState.contentHash || null;

  // 2. Auditar archivos físicos complementarios contra el hash
  for (const item of ARCHIVOS_REPOSITORIO) {
    const rutaAbs = join(rutaBase, item.nombre);
    const existe = existsSync(rutaAbs);
    let hashDeclarado = null;
    let coincide = false;

    if (existe) {
      try {
        const contenido = readFileSync(rutaAbs, 'utf8');
        if (item.tipo === 'json') {
          hashDeclarado = hashCanonica;
          coincide = resState.valido;
        } else {
          const resTexto = verificarTextoProyeccion(item.nombre, contenido, hashCanonica);
          hashDeclarado = resTexto.contentHash || null;
          coincide = resTexto.valido && resTexto.estado === ESTADOS_VERIFICACION.VALIDO;
        }
      } catch (e) {
        coincide = false;
      }
    }

    archivosAuditados.push({
      ruta: item.nombre,
      existe,
      hashDeclarado,
      coincideConCanonica: coincide
    });
  }

  // Si algún archivo físico falta o no coincide con la canónica, degradar estado
  const algunArchivoFalta = archivosAuditados.some(a => !a.existe);
  const algunArchivoDiscrepa = archivosAuditados.some(a => a.existe && !a.coincideConCanonica);

  if (estadoFinal === ESTADOS_VERIFICACION.VALIDO) {
    if (algunArchivoFalta) {
      estadoFinal = ESTADOS_VERIFICACION.INCOMPLETO;
      mensajeFinal = 'Faltan uno o más archivos físicos de proyección en el repositorio.';
    } else if (algunArchivoDiscrepa) {
      estadoFinal = ESTADOS_VERIFICACION.DESACTUALIZADO;
      mensajeFinal = 'Uno o más archivos de proyección (.cursorrules, CLAUDE.md o skills) portan un Context Hash desalineado.';
    }
  }

  const aptoParaConsumo = estadoFinal === ESTADOS_VERIFICACION.VALIDO;

  let accionRequerida = 'El contexto es canónico y consistente. El agente puede operar en modo sólo lectura.';
  let solicitudRsc5 = null;

  if (estadoFinal === ESTADOS_VERIFICACION.DESACTUALIZADO) {
    accionRequerida = 'El contexto está desactualizado respecto a la fuente de verdad. Se requiere autorización humana para ejecutar RSC-5.';
    if (opts.contextoActual) {
      const prep = prepararRegeneracion(opts.contextoActual, objState);
      solicitudRsc5 = crearSolicitudAutorizacion(prep);
    }
  } else if (estadoFinal === ESTADOS_VERIFICACION.INVALIDO) {
    accionRequerida = 'El contexto es inválido por manipulación manual, secreto detectado o discrepancia de tenant/proyecto. Detener consumo.';
  } else if (estadoFinal === ESTADOS_VERIFICACION.INCOMPLETO) {
    accionRequerida = 'El contexto está incompleto. Faltan cabeceras, dimensiones o archivos de proyección.';
  } else if (estadoFinal === ESTADOS_VERIFICACION.NO_VERIFICABLE) {
    accionRequerida = 'El contexto no pudo ser parseado o procesado de forma determinista.';
  }

  const linaje = extraerLinajeDesdeProyeccion(objState, resState);

  return {
    timestamp: new Date().toISOString(),
    estadoContexto: estadoFinal,
    aptoParaConsumo,
    identidad: {
      tenantId: objState.tenantId !== undefined ? objState.tenantId : null,
      projectId: objState.projectId || null,
      contentHash: hashCanonica,
      contextVersion: objState.contextVersion || null,
      lineageDepth: linaje.lineageDepth,
      parentContentHash: linaje.parentContentHash,
      parentStatus: linaje.parentStatus
    },
    linaje,
    archivosAuditados,
    mensaje: mensajeFinal,
    accionRequerida,
    ...(solicitudRsc5 ? { solicitudRsc5 } : {})
  };
}

/**
 * Extrae metadatos de linaje F3 desde la proyección o el dictamen RSC-4.
 * @param {Object} objState
 * @param {Object} resState
 * @return {Object}
 */
function extraerLinajeDesdeProyeccion(objState, resState) {
  const dims = objState.dimensions || objState;
  const integrity = dims && dims.integrity;
  let parentContentHash = null;
  let lineageDepth = null;
  if (integrity && integrity.status === 'IMPLEMENTADO' && integrity.value) {
    parentContentHash = integrity.value.parentContentHash !== undefined
      ? integrity.value.parentContentHash
      : null;
    lineageDepth = typeof integrity.value.lineageDepth === 'number'
      ? integrity.value.lineageDepth
      : null;
  }

  let parentStatus = resState.parentStatus;
  if (parentStatus === undefined || parentStatus === null) {
    if (parentContentHash === null && lineageDepth === 0) {
      parentStatus = PARENT_STATUS_F3.GENESIS;
    } else if (typeof parentContentHash === 'string') {
      parentStatus = PARENT_STATUS_F3.PARENT_DECLARED_ONLY;
    } else {
      parentStatus = null;
    }
  }

  return {
    contextVersion: objState.contextVersion || null,
    lineageDepth,
    parentContentHash,
    parentStatus
  };
}

/**
 * Función controladora del CLI para procesar argumentos de terminal y generar salida.
 *
 * @param {string[]} [argumentos] - Argumentos de línea de comandos.
 * @param {string} [directorioRaiz] - Ruta del repositorio a inspeccionar.
 * @return {number} Código de salida: 0 (éxito/válido) o 1 (fallo/no apto).
 */
export function ejecutarCliHarness(argumentos = process.argv.slice(2), directorioRaiz = process.cwd()) {
  const args = Array.isArray(argumentos) ? argumentos : [];
  const salidaJson = args.includes('--json');

  // Determinar comando principal
  let comando = COMANDOS_HARNESS.VERIFICAR;
  if (args.includes('inspeccionar')) comando = COMANDOS_HARNESS.INSPECCIONAR;
  else if (args.includes('solicitar-regeneracion')) comando = COMANDOS_HARNESS.SOLICITAR_REGENERACION;
  else if (args.includes('verificar')) comando = COMANDOS_HARNESS.VERIFICAR;

  // Extraer parámetros opcionales
  let tenantIdEsperado = undefined;
  const idxTenant = args.indexOf('--tenantId');
  if (idxTenant !== -1 && args[idxTenant + 1] !== undefined) {
    const valTenant = args[idxTenant + 1];
    tenantIdEsperado = valTenant === 'null' ? null : valTenant;
  }

  let projectIdEsperado = undefined;
  const idxProject = args.indexOf('--projectId');
  if (idxProject !== -1 && args[idxProject + 1]) {
    projectIdEsperado = args[idxProject + 1];
  }

  // Evaluar diagnóstico
  const diagnostico = evaluarHarnessContexto(directorioRaiz, {
    tenantIdEsperado,
    projectIdEsperado
  });

  const exitCode = diagnostico.aptoParaConsumo ? 0 : 1;

  if (salidaJson) {
    const salida = {
      comando,
      ...diagnostico
    };
    console.log(JSON.stringify(salida, null, 2));
    return exitCode;
  }

  // Formato Humano
  console.log('========================================================================');
  console.log(' ARCHITEX OS V-36 — RSC-HARNESS (CERTIFICACIÓN DE CONTEXTO)');
  console.log('========================================================================');
  console.log(`Comando:          ${comando.toUpperCase()}`);
  console.log(`Fecha/Hora:       ${diagnostico.timestamp}`);
  console.log(`Estado Contexto:  ${diagnostico.estadoContexto}`);
  console.log(`Apto p/ Consumo:  ${diagnostico.aptoParaConsumo ? 'SÍ (EXIT 0)' : 'NO (EXIT 1)'}`);
  console.log(`Project ID:       ${diagnostico.identidad.projectId || 'N/A'}`);
  console.log(`Tenant ID:        ${diagnostico.identidad.tenantId !== null ? diagnostico.identidad.tenantId : 'null (monotenant)'}`);
  console.log(`Content Hash:     ${diagnostico.identidad.contentHash || 'NO DISPONIBLE'}`);
  console.log(`Context Version:  ${diagnostico.identidad.contextVersion || 'N/A'}`);
  console.log(`Lineage Depth:    ${diagnostico.identidad.lineageDepth !== null && diagnostico.identidad.lineageDepth !== undefined ? diagnostico.identidad.lineageDepth : 'N/A'}`);
  console.log(`Parent Hash:      ${diagnostico.identidad.parentContentHash === null ? 'null (génesis)' : (diagnostico.identidad.parentContentHash || 'N/A')}`);
  console.log(`Parent Status:    ${diagnostico.identidad.parentStatus || 'N/A'}`);
  console.log('------------------------------------------------------------------------');
  console.log(`Diagnóstico:      ${diagnostico.mensaje}`);
  console.log(`Acción:           ${diagnostico.accionRequerida}`);
  console.log('------------------------------------------------------------------------');
  console.log('Archivos Auditados:');
  diagnostico.archivosAuditados.forEach(a => {
    const estado = !a.existe ? '[FALTA]' : (a.coincideConCanonica ? '[OK]' : '[DESALINEADO]');
    console.log(`  ${estado.padEnd(14)} ${a.ruta}`);
  });

  if (comando === COMANDOS_HARNESS.SOLICITAR_REGENERACION) {
    console.log('------------------------------------------------------------------------');
    console.log('AVISO RSC-5: El comando "solicitar-regeneracion" NO ejecuta reemplazos.');
    console.log('Para regenerar físicamente tras autorización humana, ejecute:');
    console.log('  node rsc/ejecutarProyecciones.mjs');
  }

  console.log('========================================================================\n');
  return exitCode;
}

// Invocación directa como script de terminal
const esScriptPrincipal = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (esScriptPrincipal) {
  const codigo = ejecutarCliHarness();
  process.exit(codigo);
}

export default {
  COMANDOS_HARNESS,
  PARENT_STATUS_F3,
  validarCoincidenciaTenant,
  evaluarHarnessContexto,
  ejecutarCliHarness
};
