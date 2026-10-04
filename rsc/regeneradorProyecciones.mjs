/**
 * ARCHITEX OS V-36 — RSC-5: REGENERACIÓN Y SINCRONIZACIÓN CONTROLADA
 *
 * Orquesta la regeneración segura de las proyecciones RSC-3 a partir de
 * ContextoCanonicoArchitex (RSC-2) y la verificación estricta de RSC-4.
 *
 * Flujo arquitectónico:
 * 1. Preflight: Compara contentHash del contexto actual con la proyección activa.
 * 2. Si es idéntico: NO_CHANGES (sin operaciones).
 * 3. Si difiere: AUTHORIZATION_REQUIRED (solicita autorización explícita).
 * 4. Validación de Autorización: Vinculada obligatoriamente a tenantId, projectId y contentHash.
 * 5. Si el contexto cambió tras autorizar: CONTEXT_CHANGED (aborto).
 * 6. Generación en Staging: Se crea una copia aislada antes de tocar el destino.
 * 7. Verificación RSC-4: Staging se audita exhaustivamente.
 * 8. Reemplazo controlado: Solo si RSC-4 dictamina VALIDO. Si no, se descarta staging y se conserva la versión anterior.
 *
 * Reglas absolutas:
 * - NO modifica estadoProyecto.
 * - NO concede permisos ni ejecuta herramientas.
 * - NO auto-sync silencioso.
 * - NO DeepSeek ni dependencias externas.
 */

import { existsSync, readFileSync, copyFileSync, mkdirSync, rmSync, mkdtempSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import { generarProyeccionesRsc3, escribirProyeccionesFisicas } from './generadorProyecciones.mjs';
import {
  ESTADOS_VERIFICACION,
  DIAGNOSTICOS_LINAJE_F3,
  verificarContextoRsc4,
  verificarConjuntoProyecciones
} from './verificadorContexto.mjs';

export const ESTADOS_OPERACION_RSC5 = {
  READY: 'READY',
  NO_CHANGES: 'NO_CHANGES',
  AUTHORIZATION_REQUIRED: 'AUTHORIZATION_REQUIRED',
  AUTHORIZED: 'AUTHORIZED',
  CONTEXT_CHANGED: 'CONTEXT_CHANGED',
  GENERATING: 'GENERATING',
  VERIFYING: 'VERIFYING',
  REPLACED: 'REPLACED',
  REJECTED: 'REJECTED',
  ABORTED: 'ABORTED'
};

/**
 * Compara dos versiones SemVer (major.minor.patch). Retorna -1, 0 o 1.
 * @param {string} a
 * @param {string} b
 * @return {number}
 */
export function compararSemVer(a, b) {
  const parse = (v) => {
    const partes = String(v || '').trim().split('.').map((p) => Number.parseInt(p, 10));
    if (partes.length !== 3 || partes.some((n) => !Number.isInteger(n) || n < 0)) return null;
    return partes;
  };
  const pa = parse(a);
  const pb = parse(b);
  if (!pa || !pb) return NaN;
  for (let i = 0; i < 3; i++) {
    if (pa[i] < pb[i]) return -1;
    if (pa[i] > pb[i]) return 1;
  }
  return 0;
}

const ARCHIVOS_PROYECCION = [
  'ARCHITEX_STATE.json',
  '.antigravity/context.md',
  '.cursorrules',
  'CLAUDE.md',
  'skills/architex-context/SKILL.md',
  'skills/lockservice-concurrency/SKILL.md'
];

/**
 * Inspecciona las proyecciones activas en un directorio y lee ARCHITEX_STATE.json si existe.
 * @param {string} directorioRaiz
 * @return {Object|null}
 */
export function leerProyeccionActiva(directorioRaiz) {
  if (!directorioRaiz || typeof directorioRaiz !== 'string') return null;
  const rutaState = join(directorioRaiz, 'ARCHITEX_STATE.json');
  if (!existsSync(rutaState)) return null;

  try {
    const raw = readFileSync(rutaState, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/**
 * Fase 1: Pre-flight. Compara el contexto canónico actual contra la proyección activa.
 *
 * @param {Object} contextoActual - Objeto ContextoCanonicoArchitex actual.
 * @param {string|Object} proyeccionActivaODirectorio - Directorio raíz o estado ya parseado.
 * @param {Object} [opciones]
 * @return {Object} Diagnóstico pre-flight.
 */
export function prepararRegeneracion(contextoActual, proyeccionActivaODirectorio, opciones = {}) {
  const opts = opciones && typeof opciones === 'object' ? opciones : {};
  if (!contextoActual || typeof contextoActual !== 'object' || !contextoActual.contentHash) {
    return {
      estado: ESTADOS_OPERACION_RSC5.ABORTED,
      razon: 'Contexto canónico actual inválido o ausente de contentHash.'
    };
  }

  let proyeccionActiva = null;
  if (typeof proyeccionActivaODirectorio === 'string') {
    proyeccionActiva = leerProyeccionActiva(proyeccionActivaODirectorio);
  } else if (proyeccionActivaODirectorio && typeof proyeccionActivaODirectorio === 'object') {
    proyeccionActiva = proyeccionActivaODirectorio;
  }

  const hashActual = contextoActual.contentHash;
  const tenantId = contextoActual.tenantId;
  const projectId = contextoActual.projectId;
  const metaF3 = {
    proposedContextVersion: opts.proposedContextVersion || contextoActual.contextVersion || null,
    minimumVersionFloor: opts.minimumVersionFloor || contextoActual.contextVersion || null,
    parentContentHash: opts.parentContentHash || null,
    rationale: opts.rationale || null
  };

  if (!proyeccionActiva) {
    return {
      estado: ESTADOS_OPERACION_RSC5.AUTHORIZATION_REQUIRED,
      requiereAutorizacion: true,
      contentHashActual: hashActual,
      contentHashProyectado: null,
      tenantId,
      projectId,
      ...metaF3,
      mensaje: 'No existen proyecciones previas. Se requiere autorización para la generación inicial.'
    };
  }

  const hashProyectado = proyeccionActiva.contentHash;

  // Comparar hashes semánticos (independientes de generatedAt)
  if (hashActual === hashProyectado) {
    return {
      estado: ESTADOS_OPERACION_RSC5.NO_CHANGES,
      requiereAutorizacion: false,
      contentHashActual: hashActual,
      contentHashProyectado: hashProyectado,
      tenantId,
      projectId,
      ...metaF3,
      mensaje: 'Las proyecciones ya están sincronizadas con el contexto canónico actual (mismo contentHash).'
    };
  }

  return {
    estado: ESTADOS_OPERACION_RSC5.AUTHORIZATION_REQUIRED,
    requiereAutorizacion: true,
    contentHashActual: hashActual,
    contentHashProyectado: hashProyectado,
    tenantId,
    projectId,
    ...metaF3,
    mensaje: 'Proyecciones desactualizadas. Se requiere autorización explícita ligada al nuevo contentHash.'
  };
}

/**
 * Crea una plantilla estructurada de autorización explícita para el consumidor.
 *
 * @param {Object} preparacion - Resultado emitido por prepararRegeneracion().
 * @return {Object} Token/objeto de autorización.
 */
export function crearSolicitudAutorizacion(preparacion) {
  if (!preparacion || !preparacion.contentHashActual) {
    throw new Error('crearSolicitudAutorizacion: Preparación inválida.');
  }

  return {
    operation: 'REGENERATE_PROJECTIONS',
    tenantId: preparacion.tenantId || null,
    projectId: preparacion.projectId || null,
    authorizedContentHash: preparacion.contentHashActual,
    authorized: true,
    proposedContextVersion: preparacion.proposedContextVersion || null,
    minimumVersionFloor: preparacion.minimumVersionFloor || null,
    parentContentHash: preparacion.parentContentHash || null,
    rationale: preparacion.rationale || null,
    timestamp: new Date().toISOString()
  };
}

/**
 * Valida que una autorización esté formalmente constituida y coincida con el contexto actual.
 *
 * @param {Object} autorizacion - Objeto de autorización presentado por el usuario.
 * @param {Object} contextoActual - Contexto canónico en el instante de ejecución.
 * @return {Object} Dictamen de autorización.
 */
export function validarAutorizacion(autorizacion, contextoActual) {
  if (!autorizacion || typeof autorizacion !== 'object') {
    return {
      valido: false,
      estado: ESTADOS_OPERACION_RSC5.AUTHORIZATION_REQUIRED,
      razon: 'No se suministró un objeto de autorización explícita.'
    };
  }

  if (autorizacion.operation !== 'REGENERATE_PROJECTIONS' || autorizacion.authorized !== true) {
    return {
      valido: false,
      estado: ESTADOS_OPERACION_RSC5.REJECTED,
      razon: 'La operación no fue expresamente autorizada (authorized !== true).'
    };
  }

  // Validación Multi-Tenant & Proyecto
  if (autorizacion.tenantId !== contextoActual.tenantId) {
    return {
      valido: false,
      estado: ESTADOS_OPERACION_RSC5.REJECTED,
      razon: `Violación multi-tenant: autorización para tenant "${autorizacion.tenantId}", contexto actual "${contextoActual.tenantId}".`
    };
  }

  if (autorizacion.projectId !== contextoActual.projectId) {
    return {
      valido: false,
      estado: ESTADOS_OPERACION_RSC5.REJECTED,
      razon: `Discrepancia de proyecto: autorización para "${autorizacion.projectId}", contexto actual "${contextoActual.projectId}".`
    };
  }

  // Regla crítica: El hash autorizado DEBE coincidir con el hash actual
  if (autorizacion.authorizedContentHash !== contextoActual.contentHash) {
    return {
      valido: false,
      estado: ESTADOS_OPERACION_RSC5.CONTEXT_CHANGED,
      razon: `El contexto mutó tras la autorización. Hash autorizado: "${autorizacion.authorizedContentHash}", hash actual: "${contextoActual.contentHash}".`
    };
  }

  // Floor Guard F3: proposedContextVersion >= minimumVersionFloor; el piso no puede bajar del contexto actual
  const floor = autorizacion.minimumVersionFloor;
  const proposed = autorizacion.proposedContextVersion || contextoActual.contextVersion;
  if (floor !== undefined && floor !== null && floor !== '') {
    const cmpFloorActual = compararSemVer(floor, contextoActual.contextVersion);
    if (Number.isNaN(cmpFloorActual)) {
      return {
        valido: false,
        estado: ESTADOS_OPERACION_RSC5.ABORTED,
        diagnostico: DIAGNOSTICOS_LINAJE_F3.FLOOR_VIOLATION,
        razon: 'minimumVersionFloor o contextVersion no son SemVer válidos (FLOOR_VIOLATION).'
      };
    }
    if (cmpFloorActual < 0) {
      return {
        valido: false,
        estado: ESTADOS_OPERACION_RSC5.ABORTED,
        diagnostico: DIAGNOSTICOS_LINAJE_F3.FLOOR_VIOLATION,
        razon: `El piso mínimo (${floor}) no puede ser inferior a la contextVersion actual (${contextoActual.contextVersion}).`
      };
    }
    const cmpProposedFloor = compararSemVer(proposed, floor);
    if (Number.isNaN(cmpProposedFloor) || cmpProposedFloor < 0) {
      return {
        valido: false,
        estado: ESTADOS_OPERACION_RSC5.ABORTED,
        diagnostico: DIAGNOSTICOS_LINAJE_F3.FLOOR_VIOLATION,
        razon: `Versión solicitada (${proposed}) inferior al piso mínimo (${floor}) → INVALIDA → ABORTED.`
      };
    }
  }

  return {
    valido: true,
    estado: ESTADOS_OPERACION_RSC5.AUTHORIZED,
    contentHash: contextoActual.contentHash,
    proposedContextVersion: proposed,
    minimumVersionFloor: floor || null,
    parentContentHash: autorizacion.parentContentHash || null,
    rationale: autorizacion.rationale || null
  };
}

/**
 * Fase 2: Generación en Staging.
 * Materializa las proyecciones en un directorio temporal aislado.
 *
 * @param {Object} contextoActual - Contexto canónico.
 * @param {string} [directorioStaging] - Ruta staging opcional; si no se provee, se crea un temporal.
 * @return {Object} { proyecciones, directorioStaging, temporalCreado }
 */
export function generarEnStaging(contextoActual, directorioStaging = null) {
  const temporalCreado = !directorioStaging;
  const dirStaging = directorioStaging || mkdtempSync(join(tmpdir(), 'architex-rsc5-staging-'));

  try {
    const proyecciones = generarProyeccionesRsc3(contextoActual);
    escribirProyeccionesFisicas(proyecciones, dirStaging);
    return {
      proyecciones,
      directorioStaging: dirStaging,
      temporalCreado
    };
  } catch (e) {
    if (temporalCreado && existsSync(dirStaging)) {
      rmSync(dirStaging, { recursive: true, force: true });
    }
    throw new Error(`Fallo durante la generación en staging: ${e.message}`);
  }
}

/**
 * Fase 3: Verificación de Staging mediante RSC-4.
 *
 * @param {string} directorioStaging - Directorio donde se generó el staging.
 * @param {Object} contextoActual - Contexto canónico de referencia.
 * @return {Object} Resultado de la verificación RSC-4.
 */
export function verificarStaging(directorioStaging, contextoActual) {
  const rutaStateStaging = join(directorioStaging, 'ARCHITEX_STATE.json');
  if (!existsSync(rutaStateStaging)) {
    return {
      valido: false,
      estadoRsc4: ESTADOS_VERIFICACION.INCOMPLETO,
      razon: 'ARCHITEX_STATE.json no fue generado en staging.'
    };
  }

  const rawState = readFileSync(rutaStateStaging, 'utf8');
  const resState = verificarContextoRsc4(rawState, {
    contextoActual,
    tenantIdEsperado: contextoActual.tenantId,
    projectIdEsperado: contextoActual.projectId,
    contentHashEsperado: contextoActual.contentHash
  });

  if (!resState.valido || resState.estado !== ESTADOS_VERIFICACION.VALIDO) {
    return {
      valido: false,
      estadoRsc4: resState.estado,
      razon: resState.razon || 'Fallo de verificación en ARCHITEX_STATE.json en staging.',
      detalles: resState.detalles
    };
  }

  // Verificar conjunto completo de proyecciones en staging
  try {
    const mapaProyecciones = {
      architexStateJson: rawState,
      antigravityContextMd: readFileSync(join(directorioStaging, '.antigravity', 'context.md'), 'utf8'),
      cursorrules: readFileSync(join(directorioStaging, '.cursorrules'), 'utf8'),
      claudeMd: readFileSync(join(directorioStaging, 'CLAUDE.md'), 'utf8'),
      skills: {
        'skills/architex-context/SKILL.md': readFileSync(join(directorioStaging, 'skills', 'architex-context', 'SKILL.md'), 'utf8'),
        'skills/lockservice-concurrency/SKILL.md': readFileSync(join(directorioStaging, 'skills', 'lockservice-concurrency', 'SKILL.md'), 'utf8')
      }
    };

    const resConjunto = verificarConjuntoProyecciones(mapaProyecciones, {
      tenantIdEsperado: contextoActual.tenantId,
      projectIdEsperado: contextoActual.projectId
    });

    if (!resConjunto.valido || resConjunto.estado !== ESTADOS_VERIFICACION.VALIDO) {
      return {
        valido: false,
        estadoRsc4: resConjunto.estado,
        razon: resConjunto.razon || 'Discrepancia en conjunto de proyecciones en staging.',
        archivoFallo: resConjunto.archivoFallo
      };
    }
  } catch (e) {
    return {
      valido: false,
      estadoRsc4: ESTADOS_VERIFICACION.INCOMPLETO,
      razon: `Archivos de proyección faltantes en staging: ${e.message}`
    };
  }

  return {
    valido: true,
    estadoRsc4: ESTADOS_VERIFICACION.VALIDO,
    contentHash: resState.contentHash
  };
}

/**
 * Fase 4: Reemplazo Controlado.
 * Transfiere los archivos validados desde staging al directorio destino activo.
 *
 * @param {string} directorioStaging - Directorio con los archivos ya validados.
 * @param {string} directorioDestino - Directorio raíz activo.
 * @return {Array<string>} Lista de rutas reemplazadas.
 */
export function reemplazarControlado(directorioStaging, directorioDestino) {
  const archivosReemplazados = [];

  for (const relPath of ARCHIVOS_PROYECCION) {
    const origen = join(directorioStaging, relPath);
    const destino = join(directorioDestino, relPath);

    if (existsSync(origen)) {
      const dirDestino = destino.substring(0, destino.lastIndexOf('\\') !== -1 ? destino.lastIndexOf('\\') : destino.lastIndexOf('/'));
      if (!existsSync(dirDestino)) {
        mkdirSync(dirDestino, { recursive: true });
      }
      copyFileSync(origen, destino);
      archivosReemplazados.push(relPath);
    }
  }

  return archivosReemplazados;
}

/**
 * Orquestador principal de RSC-5: Ejecuta el flujo seguro de regeneración controlada.
 *
 * @param {Object} contextoActual - Contexto canónico actual.
 * @param {string} directorioDestino - Directorio activo del repositorio.
 * @param {Object} [opciones] - { autorizacion, stagingDir }
 * @return {Object} Dictamen final de la operación RSC-5.
 */
export function ejecutarRegeneracionControlada(contextoActual, directorioDestino, opciones = {}) {
  const opts = opciones && typeof opciones === 'object' ? opciones : {};

  // 1. Preflight
  const preflight = prepararRegeneracion(contextoActual, directorioDestino, opts);
  if (preflight.estado === ESTADOS_OPERACION_RSC5.NO_CHANGES) {
    return {
      estado: ESTADOS_OPERACION_RSC5.NO_CHANGES,
      exito: true,
      mensaje: preflight.mensaje,
      contentHash: preflight.contentHashActual
    };
  }

  // 2. Verificar autorización
  const autorizacion = opts.autorizacion;
  const resAuth = validarAutorizacion(autorizacion, contextoActual);
  if (!resAuth.valido) {
    return {
      estado: resAuth.estado,
      exito: false,
      razon: resAuth.razon,
      solicitudAutorizacion: crearSolicitudAutorizacion(preflight)
    };
  }

  // 3. Generación en Staging
  let stagingInfo = null;
  try {
    stagingInfo = generarEnStaging(contextoActual, opts.stagingDir);
  } catch (e) {
    return {
      estado: ESTADOS_OPERACION_RSC5.ABORTED,
      exito: false,
      razon: `Error durante generación en staging: ${e.message}`
    };
  }

  const { directorioStaging, temporalCreado } = stagingInfo;

  try {
    // 4. Verificación de Staging mediante RSC-4
    const resVerif = verificarStaging(directorioStaging, contextoActual);
    if (!resVerif.valido || resVerif.estadoRsc4 !== ESTADOS_VERIFICACION.VALIDO) {
      return {
        estado: ESTADOS_OPERACION_RSC5.REJECTED,
        exito: false,
        razon: `Staging rechazado por verificación RSC-4: ${resVerif.razon}`,
        estadoRsc4: resVerif.estadoRsc4,
        detalles: resVerif.detalles
      };
    }

    // 5. Reemplazo controlado (Solo tras VALIDO)
    const reemplazados = reemplazarControlado(directorioStaging, directorioDestino);

    return {
      estado: ESTADOS_OPERACION_RSC5.REPLACED,
      exito: true,
      contentHash: contextoActual.contentHash,
      archivosReemplazados: reemplazados,
      mensaje: 'Proyecciones regeneradas y reemplazadas exitosamente tras validación estricta de staging.'
    };
  } finally {
    // Limpieza de staging si fue temporal
    if (temporalCreado && existsSync(directorioStaging)) {
      try {
        rmSync(directorioStaging, { recursive: true, force: true });
      } catch (e) {}
    }
  }
}

export default {
  ESTADOS_OPERACION_RSC5,
  compararSemVer,
  prepararRegeneracion,
  crearSolicitudAutorizacion,
  validarAutorizacion,
  generarEnStaging,
  verificarStaging,
  reemplazarControlado,
  ejecutarRegeneracionControlada,
  leerProyeccionActiva
};
