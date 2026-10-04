/**
 * ARCHITEX OS V-36 — RSC-4: CONSUMO SEGURO Y VERIFICACIÓN DEL CONTEXTO
 *
 * Provee la API de verificación para consumidores de las proyecciones RSC-3
 * y del Contexto Canónico intermedio (ContextoCanonicoArchitex).
 *
 * Estados de clasificación:
 * - VALIDO: Estructuralmente íntegro, 25 dimensiones, hash coincide, versiones y multi-tenant coherentes.
 * - DESACTUALIZADO: Válido en sí mismo, pero su contentHash difiere del contexto canónico actual del proyecto.
 * - INVALIDO: Hash alterado (tampering), campos corruptos, tenant incorrecto, secretos o gobernanza detectada.
 * - INCOMPLETO: Faltan metadatos requeridos o faltan dimensiones canónicas de las 25 exigidas.
 * - NO_VERIFICABLE: Carga corrupta, JSON malformado o ausencia de firma/hash.
 *
 * Reglas fundamentales:
 * 1. Función pura: no realiza I/O de red, no usa DeepSeek ni modifica el estado.
 * 2. No lee directamente estadoProyecto para "reparar" proyecciones.
 * 3. No ejecuta herramientas ni concede permisos de gobernanza.
 * 4. Determinista y síncrona.
 */

import { createHash } from 'crypto';

export const ESTADOS_VERIFICACION = {
  VALIDO: 'VALIDO',
  DESACTUALIZADO: 'DESACTUALIZADO',
  INVALIDO: 'INVALIDO',
  INCOMPLETO: 'INCOMPLETO',
  NO_VERIFICABLE: 'NO_VERIFICABLE'
};

export const PARENT_STATUS_F3 = {
  GENESIS: 'GENESIS',
  PARENT_DECLARED_ONLY: 'PARENT_DECLARED_ONLY',
  PARENT_VERIFIED: 'PARENT_VERIFIED'
};

export const DIAGNOSTICOS_LINAJE_F3 = {
  PARENT_MISMATCH: 'PARENT_MISMATCH',
  DEPTH_INCONSISTENT: 'DEPTH_INCONSISTENT',
  ORPHAN_SNAPSHOT: 'ORPHAN_SNAPSHOT',
  FLOOR_VIOLATION: 'FLOOR_VIOLATION',
  VOLATILE_TIMESTAMP: 'VOLATILE_TIMESTAMP'
};

const RE_HASH_SHA256 = /^[a-f0-9]{64}$/;
const RE_ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

const DIMENSIONES_CANONICAS = [
  'identity', 'problem', 'objectives', 'audience', 'environment', 'mvp', 'future',
  'constraints', 'roles', 'users', 'entities', 'requirements', 'data', 'design',
  'architecture', 'technology', 'decisions', 'skills', 'traceability', 'tests',
  'production', 'maintenance', 'state', 'provenance', 'integrity'
];

const PATRONES_SECRETOS = [
  /sk-[a-zA-Z0-9_\-]{15,}/i,
  /Bearer\s+[a-zA-Z0-9_\-\.]+/i,
  /(?:password|passwd|contraseña|secreto|secret|api[_-]?key|token)\s*[:=]\s*['"][^'"]+['"]/i
];

const PROPIEDADES_PERMITIDAS_RAIZ = new Set([
  'schemaVersion',
  'contextVersion',
  'projectVersion',
  'generatedAt',
  'projectId',
  'tenantId',
  'source',
  'contentHash',
  'dimensions'
]);

/**
 * Ordena recursivamente las claves de un objeto para serialización canónica.
 * @param {any} obj
 * @return {any}
 */
function ordenarClaves(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(ordenarClaves);
  const ordenado = {};
  Object.keys(obj).sort().forEach(k => {
    ordenado[k] = ordenarClaves(obj[k]);
  });
  return ordenado;
}

/**
 * Calcula el SHA-256 determinista de un payload semántico canónico.
 * @param {Object} payload
 * @return {string} Hash SHA-256 en hexadecimal.
 */
export function calcularHashSemantico(payload) {
  const ordenado = ordenarClaves(payload);
  const jsonCanonica = JSON.stringify(ordenado);
  return createHash('sha256').update(jsonCanonica).digest('hex');
}

/**
 * Verifica una proyección estructurada (como ARCHITEX_STATE.json o un ContextoCanonicoArchitex).
 *
 * @param {Object|string} entrada - Objeto parseado o cadena JSON de la proyección.
 * @param {Object} [opciones] - Criterios de verificación (tenantIdEsperado, projectIdEsperado, contextHashEsperado, contextoActual).
 * @return {Object} Resultado de la verificación.
 */
export function verificarContextoRsc4(entrada, opciones = {}) {
  const opts = opciones && typeof opciones === 'object' ? opciones : {};
  const detalles = [];
  const advertencias = [];

  // 1. Validar si la entrada es parseable
  let obj = entrada;
  if (typeof entrada === 'string') {
    try {
      obj = JSON.parse(entrada);
    } catch (e) {
      return {
        estado: ESTADOS_VERIFICACION.NO_VERIFICABLE,
        valido: false,
        razon: 'JSON inválido o corrupto',
        detalles: [`Error de parseo: ${e.message}`]
      };
    }
  }

  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return {
      estado: ESTADOS_VERIFICACION.NO_VERIFICABLE,
      valido: false,
      razon: 'La entrada no es un objeto válido',
      detalles: ['La entrada recibida es nula o no es un objeto plano']
    };
  }

  // Comprobar presencia de campos raíz mínimos
  const {
    schemaVersion,
    contextVersion,
    projectVersion,
    generatedAt,
    projectId,
    tenantId,
    source,
    contentHash
  } = obj;

  // Soportar tanto formato plano (ContextoCanonicoArchitex) como anidado en "dimensions" (ARCHITEX_STATE.json)
  let dimensionsMap = obj.dimensions;
  if (!dimensionsMap && obj.identity) {
    dimensionsMap = {};
    DIMENSIONES_CANONICAS.forEach(d => {
      if (obj[d] !== undefined) dimensionsMap[d] = obj[d];
    });
  }

  // 2. Verificar Incompletitud (Metadatos raíz)
  if (!schemaVersion || !projectVersion || !source || !contentHash || !dimensionsMap) {
    return {
      estado: ESTADOS_VERIFICACION.INCOMPLETO,
      valido: false,
      razon: 'Faltan metadatos raíz requeridos en la proyección',
      detalles: [
        !schemaVersion && 'Falta schemaVersion',
        !projectVersion && 'Falta projectVersion',
        !source && 'Falta source',
        !contentHash && 'Falta contentHash',
        !dimensionsMap && 'Falta mapa de dimensions'
      ].filter(Boolean)
    };
  }

  // 3. Verificar Incompletitud de las 25 Dimensiones
  const dimensionesFaltantes = DIMENSIONES_CANONICAS.filter(d => dimensionsMap[d] === undefined);
  if (dimensionesFaltantes.length > 0) {
    return {
      estado: ESTADOS_VERIFICACION.INCOMPLETO,
      valido: false,
      razon: `Faltan dimensiones canónicas (${dimensionesFaltantes.length}/25)`,
      detalles: [`Dimensiones ausentes: ${dimensionesFaltantes.join(', ')}`]
    };
  }

  // 4. Inspección de Propiedades Desconocidas en la raíz (ARCHITEX_STATE)
  if (obj.dimensions) {
    for (const clave of Object.keys(obj)) {
      if (!PROPIEDADES_PERMITIDAS_RAIZ.has(clave)) {
        return {
          estado: ESTADOS_VERIFICACION.INVALIDO,
          valido: false,
          razon: `Propiedad no autorizada detectada en raíz: "${clave}"`,
          detalles: [`El esquema de la proyección no permite campos adicionales como "${clave}".`]
        };
      }
    }
  }

  // 5. Inspección de Seguridad: Detección de Secretos y Fugas de Gobernanza
  const serializadoCrudo = JSON.stringify(obj);
  for (const patron of PATRONES_SECRETOS) {
    if (patron.test(serializadoCrudo)) {
      return {
        estado: ESTADOS_VERIFICACION.INVALIDO,
        valido: false,
        razon: 'Fuga de credenciales o secretos detectada en el contexto',
        detalles: ['La proyección contiene patrones de claves o tokens sin redactar.']
      };
    }
  }

  // Detección de invasión de gobernanza
  if (
    serializadoCrudo.includes('"HERRAMIENTAS_AGENTES"') ||
    serializadoCrudo.includes('"idDecision"') ||
    serializadoCrudo.includes('aplicarHerramientaAgenteAutorizada')
  ) {
    return {
      estado: ESTADOS_VERIFICACION.INVALIDO,
      valido: false,
      razon: 'Invasión de gobernanza detectada en el contexto',
      detalles: ['La proyección contiene elementos normativos de gobernanza o tokens de ejecución.']
    };
  }

  // 6. Validación de Estructura de Dimensiones
  let implementadas = 0;
  let noImplementadas = 0;
  for (const dim of DIMENSIONES_CANONICAS) {
    const dObj = dimensionsMap[dim];
    if (!dObj || typeof dObj !== 'object') {
      return {
        estado: ESTADOS_VERIFICACION.INVALIDO,
        valido: false,
        razon: `Dimensión "${dim}" malformada`,
        detalles: [`La dimensión "${dim}" debe ser un objeto { status, value }`]
      };
    }
    if (dObj.status === 'NO_IMPLEMENTADO') {
      if (dObj.value !== null) {
        return {
          estado: ESTADOS_VERIFICACION.INVALIDO,
          valido: false,
          razon: `Dimensión "${dim}" tiene status NO_IMPLEMENTADO pero value no es null`,
          detalles: [`Violación de regla de no-invención: valor esperado null, obtenido: ${typeof dObj.value}`]
        };
      }
      noImplementadas++;
    } else if (dObj.status === 'IMPLEMENTADO') {
      implementadas++;
    } else {
      return {
        estado: ESTADOS_VERIFICACION.INVALIDO,
        valido: false,
        razon: `Estado desconocido "${dObj.status}" en dimensión "${dim}"`,
        detalles: ['El status debe ser IMPLEMENTADO o NO_IMPLEMENTADO']
      };
    }
  }

  // 7. Validación de Versiones
  if (opts.schemaVersionEsperada && schemaVersion !== opts.schemaVersionEsperada) {
    return {
      estado: ESTADOS_VERIFICACION.INVALIDO,
      valido: false,
      razon: `schemaVersion incompatible: esperado "${opts.schemaVersionEsperada}", obtenido "${schemaVersion}"`,
      detalles: ['Cambio estructural de contrato de esquema detectado.']
    };
  }

  if (opts.projectVersionEsperada && projectVersion !== opts.projectVersionEsperada) {
    return {
      estado: ESTADOS_VERIFICACION.INVALIDO,
      valido: false,
      razon: `projectVersion incompatible: esperado "${opts.projectVersionEsperada}", obtenido "${projectVersion}"`,
      detalles: ['La versión del producto no coincide con la versión requerida por el consumidor.']
    };
  }

  // 8. Validación Multi-Tenant & Proyecto
  if (opts.tenantIdEsperado !== undefined) {
    if (tenantId !== opts.tenantIdEsperado) {
      return {
        estado: ESTADOS_VERIFICACION.INVALIDO,
        valido: false,
        razon: `tenantId incompatible: esperado "${opts.tenantIdEsperado}", obtenido "${tenantId}"`,
        detalles: ['Violación de frontera multi-tenant.']
      };
    }
  }

  if (opts.projectIdEsperado !== undefined) {
    if (projectId !== opts.projectIdEsperado) {
      return {
        estado: ESTADOS_VERIFICACION.INVALIDO,
        valido: false,
        razon: `projectId incompatible: esperado "${opts.projectIdEsperado}", obtenido "${projectId}"`,
        detalles: ['El identificador del proyecto no coincide con el esperado.']
      };
    }
  }

  // 9. Recomputar el Hash Semántico Criptográfico (Sin generatedAt)
  const payloadSemantico = {
    schemaVersion,
    contextVersion,
    projectVersion,
    projectId,
    tenantId,
    source,
    dimensions: dimensionsMap
  };

  const hashCalculado = calcularHashSemantico(payloadSemantico);
  if (hashCalculado !== contentHash) {
    return {
      estado: ESTADOS_VERIFICACION.INVALIDO,
      valido: false,
      razon: 'Manipulación o discrepancia de contentHash detectada',
      contentHashDeclarado: contentHash,
      contentHashCalculado: hashCalculado,
      detalles: ['El contentHash declarado no coincide con el hash del contenido semántico actual.']
    };
  }

  // 10. Detección de Desactualización frente a contexto canónico fresco
  const hashObjetivo = opts.contentHashEsperado || (opts.contextoActual && opts.contextoActual.contentHash);
  if (hashObjetivo && contentHash !== hashObjetivo) {
    return {
      estado: ESTADOS_VERIFICACION.DESACTUALIZADO,
      valido: false,
      razon: 'La proyección corresponde a un contexto arquitectónico anterior',
      contentHashProyeccion: contentHash,
      contentHashActual: hashObjetivo,
      detalles: ['El estado primario del proyecto ha evolucionado y la proyección no ha sido regenerada.']
    };
  }

  // 11. Linaje F3 — diagnósticos bajo estados canónicos (no inventan estados nuevos)
  const linaje = evaluarLinajeF3(dimensionsMap, opts, contentHash);
  if (linaje.estado === ESTADOS_VERIFICACION.INVALIDO) {
    return {
      estado: ESTADOS_VERIFICACION.INVALIDO,
      valido: false,
      razon: linaje.razon,
      diagnosticoLinaje: linaje.diagnostico,
      parentStatus: linaje.parentStatus,
      contentHash,
      detalles: linaje.detalles
    };
  }

  // Si todas las verificaciones pasan con éxito
  return {
    estado: ESTADOS_VERIFICACION.VALIDO,
    valido: true,
    contentHash,
    schemaVersion,
    contextVersion,
    projectVersion,
    projectId,
    tenantId,
    dimensionesContadas: DIMENSIONES_CANONICAS.length,
    dimensionesImplementadas: implementadas,
    dimensionesNoImplementadas: noImplementadas,
    parentStatus: linaje.parentStatus,
    lineageDepth: linaje.lineageDepth,
    parentContentHash: linaje.parentContentHash,
    detalles: ['Proyección verificada exitosamente: íntegra, canónica y coherente.'].concat(linaje.detalles || [])
  };
}

/**
 * Evalúa el linaje causal F3 sin crear estados de verificación nuevos.
 * @param {Object} dimensionsMap
 * @param {Object} opts
 * @param {string} contentHashHijo
 * @return {Object}
 */
function evaluarLinajeF3(dimensionsMap, opts, contentHashHijo) {
  const integrity = dimensionsMap.integrity;
  const provenance = dimensionsMap.provenance;
  const detalles = [];

  if (provenance && provenance.status === 'IMPLEMENTADO' && provenance.value) {
    const ts = provenance.value.timestamp;
    if (typeof ts !== 'string' || !RE_ISO_UTC.test(ts)) {
      return {
        estado: ESTADOS_VERIFICACION.INVALIDO,
        diagnostico: DIAGNOSTICOS_LINAJE_F3.VOLATILE_TIMESTAMP,
        parentStatus: null,
        razon: 'Timestamp de procedencia ausente o no canónico (VOLATILE_TIMESTAMP).',
        detalles: ['El timestamp de registroProcedencia debe ser ISO-8601 UTC estático.']
      };
    }
  }

  if (!integrity || integrity.status !== 'IMPLEMENTADO' || !integrity.value) {
    return {
      estado: ESTADOS_VERIFICACION.VALIDO,
      parentStatus: null,
      lineageDepth: null,
      parentContentHash: null,
      detalles: []
    };
  }

  const parentContentHash = integrity.value.parentContentHash;
  const lineageDepth = integrity.value.lineageDepth;

  if (parentContentHash === null) {
    if (lineageDepth !== 0) {
      return {
        estado: ESTADOS_VERIFICACION.INVALIDO,
        diagnostico: DIAGNOSTICOS_LINAJE_F3.DEPTH_INCONSISTENT,
        parentStatus: PARENT_STATUS_F3.GENESIS,
        razon: 'lineageDepth inconsistente para génesis (DEPTH_INCONSISTENT).',
        detalles: [`Se esperaba lineageDepth 0 con parentContentHash null; obtenido ${lineageDepth}.`]
      };
    }
    return {
      estado: ESTADOS_VERIFICACION.VALIDO,
      parentStatus: PARENT_STATUS_F3.GENESIS,
      lineageDepth: 0,
      parentContentHash: null,
      detalles: ['Linaje génesis: parentContentHash null y depth 0.']
    };
  }

  if (typeof parentContentHash !== 'string' || !RE_HASH_SHA256.test(parentContentHash)) {
    return {
      estado: ESTADOS_VERIFICACION.INVALIDO,
      diagnostico: DIAGNOSTICOS_LINAJE_F3.ORPHAN_SNAPSHOT,
      parentStatus: PARENT_STATUS_F3.PARENT_DECLARED_ONLY,
      razon: 'Snapshot huérfano: parentContentHash inválido (ORPHAN_SNAPSHOT).',
      detalles: ['parentContentHash debe ser SHA-256 hex de 64 caracteres o null.']
    };
  }

  if (typeof lineageDepth !== 'number' || !Number.isInteger(lineageDepth) || lineageDepth < 1) {
    return {
      estado: ESTADOS_VERIFICACION.INVALIDO,
      diagnostico: DIAGNOSTICOS_LINAJE_F3.DEPTH_INCONSISTENT,
      parentStatus: PARENT_STATUS_F3.PARENT_DECLARED_ONLY,
      razon: 'lineageDepth inconsistente con padre declarado (DEPTH_INCONSISTENT).',
      detalles: [`Con padre declarado se exige lineageDepth >= 1; obtenido ${String(lineageDepth)}.`]
    };
  }

  const padre = opts.contextoPadre;
  const parentHashEsperado = opts.parentHashEsperado;

  if (!padre) {
    if (parentHashEsperado && parentHashEsperado !== parentContentHash) {
      return {
        estado: ESTADOS_VERIFICACION.INVALIDO,
        diagnostico: DIAGNOSTICOS_LINAJE_F3.PARENT_MISMATCH,
        parentStatus: PARENT_STATUS_F3.PARENT_DECLARED_ONLY,
        razon: 'parentContentHash no coincide con parentHashEsperado (PARENT_MISMATCH).',
        detalles: [
          `Declarado: ${parentContentHash}`,
          `Esperado: ${parentHashEsperado}`
        ]
      };
    }
    detalles.push('Padre declarado sin evidencia relacional (PARENT_DECLARED_ONLY).');
    return {
      estado: ESTADOS_VERIFICACION.VALIDO,
      parentStatus: PARENT_STATUS_F3.PARENT_DECLARED_ONLY,
      lineageDepth,
      parentContentHash,
      detalles
    };
  }

  if (!padre.contentHash || padre.contentHash !== parentContentHash) {
    return {
      estado: ESTADOS_VERIFICACION.INVALIDO,
      diagnostico: DIAGNOSTICOS_LINAJE_F3.PARENT_MISMATCH,
      parentStatus: PARENT_STATUS_F3.PARENT_DECLARED_ONLY,
      razon: 'El contentHash del padre no coincide con parentContentHash (PARENT_MISMATCH).',
      detalles: [
        `parentContentHash hijo: ${parentContentHash}`,
        `contentHash padre: ${padre.contentHash || 'ausente'}`
      ]
    };
  }

  if (parentHashEsperado && parentHashEsperado !== parentContentHash) {
    return {
      estado: ESTADOS_VERIFICACION.INVALIDO,
      diagnostico: DIAGNOSTICOS_LINAJE_F3.PARENT_MISMATCH,
      parentStatus: PARENT_STATUS_F3.PARENT_DECLARED_ONLY,
      razon: 'parentHashEsperado diverge del padre verificado (PARENT_MISMATCH).',
      detalles: [`Esperado: ${parentHashEsperado}`, `Declarado: ${parentContentHash}`]
    };
  }

  let depthPadre = null;
  if (padre.integrity && padre.integrity.status === 'IMPLEMENTADO' && padre.integrity.value) {
    depthPadre = padre.integrity.value.lineageDepth;
  } else if (padre.dimensions && padre.dimensions.integrity &&
             padre.dimensions.integrity.status === 'IMPLEMENTADO' &&
             padre.dimensions.integrity.value) {
    depthPadre = padre.dimensions.integrity.value.lineageDepth;
  }

  if (typeof depthPadre === 'number' && lineageDepth !== depthPadre + 1) {
    return {
      estado: ESTADOS_VERIFICACION.INVALIDO,
      diagnostico: DIAGNOSTICOS_LINAJE_F3.DEPTH_INCONSISTENT,
      parentStatus: PARENT_STATUS_F3.PARENT_DECLARED_ONLY,
      razon: 'lineageDepth no es parent.lineageDepth + 1 (DEPTH_INCONSISTENT).',
      detalles: [`depth hijo: ${lineageDepth}`, `depth padre: ${depthPadre}`]
    };
  }

  if (padre.contentHash === contentHashHijo) {
    return {
      estado: ESTADOS_VERIFICACION.INVALIDO,
      diagnostico: DIAGNOSTICOS_LINAJE_F3.ORPHAN_SNAPSHOT,
      parentStatus: PARENT_STATUS_F3.PARENT_DECLARED_ONLY,
      razon: 'El hijo no puede compartir contentHash con su padre (ORPHAN_SNAPSHOT).',
      detalles: ['Se detectó identidad de hash entre padre e hijo.']
    };
  }

  return {
    estado: ESTADOS_VERIFICACION.VALIDO,
    parentStatus: PARENT_STATUS_F3.PARENT_VERIFIED,
    lineageDepth,
    parentContentHash,
    detalles: ['Padre confiable verificado (PARENT_VERIFIED).']
  };
}

/**
 * Verifica la firma y coherencia de un archivo de proyección en formato texto o Markdown.
 *
 * @param {string} nombreArchivo - Nombre o ruta de la proyección (ej. .cursorrules, CLAUDE.md).
 * @param {string} contenidoTexto - Contenido en texto del archivo.
 * @param {string} hashEsperado - Hash canónico con el cual debe alinearse la proyección.
 * @param {Object} [opciones] - Opciones adicionales de verificación.
 * @return {Object} Resultado de la verificación textual.
 */
export function verificarTextoProyeccion(nombreArchivo, contenidoTexto, hashEsperado, opciones = {}) {
  if (!contenidoTexto || typeof contenidoTexto !== 'string') {
    return {
      archivo: nombreArchivo,
      estado: ESTADOS_VERIFICACION.NO_VERIFICABLE,
      valido: false,
      razon: 'El contenido textual está vacío o no es una cadena válida.'
    };
  }

  // Comprobar presencia del Context Hash en el encabezado
  const matchHash = contenidoTexto.match(/Context Hash:\s*([a-f0-9]{64})/i) ||
                    contenidoTexto.match(/`([a-f0-9]{64})`/i);

  if (!matchHash) {
    return {
      archivo: nombreArchivo,
      estado: ESTADOS_VERIFICACION.INCOMPLETO,
      valido: false,
      razon: 'El archivo no contiene la declaración de Context Hash canónico.'
    };
  }

  const hashDeclarado = matchHash[1];
  if (hashEsperado && hashDeclarado !== hashEsperado) {
    return {
      archivo: nombreArchivo,
      estado: ESTADOS_VERIFICACION.DESACTUALIZADO,
      valido: false,
      razon: `El Context Hash declarado (${hashDeclarado}) no coincide con el hash canónico esperado (${hashEsperado}).`
    };
  }

  // Seguridad
  for (const patron of PATRONES_SECRETOS) {
    if (patron.test(contenidoTexto)) {
      return {
        archivo: nombreArchivo,
        estado: ESTADOS_VERIFICACION.INVALIDO,
        valido: false,
        razon: 'Contiene secretos o credenciales sin redactar.'
      };
    }
  }

  if (contenidoTexto.includes('HERRAMIENTAS_AGENTES') || contenidoTexto.includes('idDecision')) {
    return {
      archivo: nombreArchivo,
      estado: ESTADOS_VERIFICACION.INVALIDO,
      valido: false,
      razon: 'Invasión de gobernanza: contiene tokens normativos de ejecución.'
    };
  }

  return {
    archivo: nombreArchivo,
    estado: ESTADOS_VERIFICACION.VALIDO,
    valido: true,
    contentHash: hashDeclarado,
    detalles: ['Proyección textual alineada con el hash canónico.']
  };
}

/**
 * Verifica la coherencia de un conjunto completo de proyecciones físicas.
 *
 * @param {Object} mapaProyecciones - Objeto con { architexStateJson, antigravityContextMd, cursorrules, claudeMd, skills }.
 * @param {Object} [opciones] - Opciones (tenantIdEsperado, projectIdEsperado, contextoActual).
 * @return {Object} Resultado de la verificación del conjunto.
 */
export function verificarConjuntoProyecciones(mapaProyecciones, opciones = {}) {
  if (!mapaProyecciones || typeof mapaProyecciones !== 'object') {
    return {
      estado: ESTADOS_VERIFICACION.NO_VERIFICABLE,
      valido: false,
      razon: 'Mapa de proyecciones no proporcionado.'
    };
  }

  // 1. Verificar primero la proyección estructurada base ARCHITEX_STATE.json
  const resState = verificarContextoRsc4(mapaProyecciones.architexStateJson, opciones);
  if (!resState.valido) {
    return {
      estado: resState.estado,
      valido: false,
      archivoFallo: 'ARCHITEX_STATE.json',
      razon: resState.razon,
      detalles: resState.detalles
    };
  }

  const hashCanonica = resState.contentHash;

  // 2. Verificar las proyecciones textuales contra el hash canónico validado
  const textosAVerificar = [
    { nombre: '.antigravity/context.md', contenido: mapaProyecciones.antigravityContextMd },
    { nombre: '.cursorrules', contenido: mapaProyecciones.cursorrules },
    { nombre: 'CLAUDE.md', contenido: mapaProyecciones.claudeMd }
  ];

  if (mapaProyecciones.skills && typeof mapaProyecciones.skills === 'object') {
    for (const [rutaSkill, contSkill] of Object.entries(mapaProyecciones.skills)) {
      textosAVerificar.push({ nombre: rutaSkill, contenido: contSkill });
    }
  }

  for (const item of textosAVerificar) {
    if (item.contenido) {
      const resTexto = verificarTextoProyeccion(item.nombre, item.contenido, hashCanonica, opciones);
      if (!resTexto.valido) {
        return {
          estado: resTexto.estado,
          valido: false,
          archivoFallo: item.nombre,
          razon: resTexto.razon
        };
      }
    }
  }

  return {
    estado: ESTADOS_VERIFICACION.VALIDO,
    valido: true,
    contentHash: hashCanonica,
    archivosVerificados: 1 + textosAVerificar.length,
    detalles: ['Conjunto completo de proyecciones unificado bajo el mismo contentHash.']
  };
}

export default {
  ESTADOS_VERIFICACION,
  PARENT_STATUS_F3,
  DIAGNOSTICOS_LINAJE_F3,
  verificarContextoRsc4,
  verificarTextoProyeccion,
  verificarConjuntoProyecciones,
  calcularHashSemantico
};
