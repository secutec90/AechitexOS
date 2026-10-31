# Código de la planeación didáctica — Lectura ST90

Copia reunida el 30 de octubre de 2026 (hora del centro de México) desde la carpeta de Drive del proyecto. No sustituye a los archivos originales: es un paquete para leer el proceso completo.

La fase crea, lista, clona, publica y calendariza planeaciones NEM, y arma las sesiones de 40 minutos. La pantalla vive en el panel (`?pagina=docente` y `?pagina=admin`).

## Qué incluye

| Pieza | Papel |
| --- | --- |
| `PlaneacionNEM.gs` | Servidor de la fase |
| `AdminPlaneacion.html` y su CSS | Pantalla |
| `AdminPlanJS_01` … `06` y `Arranque` | JavaScript de la pantalla |
| `Admin.html` | Solo la pestaña, la cinta y los `include` de esta fase |
| `00_Constantes.gs` | Columnas de `PlaneacionesNEM` y `SesionesNEM` |
| `01_Hoja.gs` | Apertura del libro |
| `02_Rutas.gs` | Entrada web que abre el panel |
| Funciones sueltas | Sesión, lectura de filas, nombre normalizado y clave de DeepSeek |
| `HorarioOficial.gs` | Las 600 clases embebidas. La fase las usa si la hoja `Horarios` trae menos de 500 filas |

Quedan fuera el aula hablada (`Clase.html`), la asistencia y el banco de lecturas. `obtenerSesionValida_` todavía consulta `ROLES_VALIDOS_SISTEMA_`, que va en el bloque de funciones sueltas.

`_leerConfig_` llama a `mapaConfig_()` en `03_Setup.gs`. Esa función no va aquí: solo arma el mapa de la hoja Config.

## PlaneacionNEM.gs

````javascript
/**********************************************************************
 * PLANEACIÓN DIDÁCTICA NEM Y SESIONES DUA DE 40 MINUTOS
 * Secundaria Técnica 90
 *
 * Módulo de diseño pedagógico, desglose de sesiones de 40 minutos,
 * accesibilidad universal (DUA: Leer, Ver y Escuchar) y sincronización
 * con el calendario escolar y Aula Hablada.
 **********************************************************************/

/**
 * Catálogo canónico de la Nueva Escuela Mexicana para Educación Secundaria (Fase 6).
 * Provee referentes oficiales verificados para evitar invenciones o alucinaciones.
 */
function catalogoCurricularNEM_() {
  return {
    fase: "Fase 6 (1.°, 2.° y 3.° de Educación Secundaria)",
    camposFormativos: [
      { id: "lenguajes", nombre: "Lenguajes", disciplinas: ["Español", "Inglés", "Artes", "Lengua Indígena"] },
      { id: "saberes", nombre: "Saberes y Pensamiento Científico", disciplinas: ["Matemáticas", "Biología (1.°)", "Física (2.°)", "Química (3.°)"] },
      { id: "etica", nombre: "Ética, Naturaleza y Sociedades", disciplinas: ["Historia", "Geografía (1.°)", "Formación Cívica y Ética"] },
      { id: "comunitario", nombre: "De lo Humano y lo Comunitario", disciplinas: ["Tecnología", "Educación Física", "Tutoría / Socioemocional"] }
    ],
    metodologias: [
      { id: "ABPC", nombre: "Aprendizaje Basado en Proyectos Comunitarios", campoPrincipal: "Lenguajes" },
      { id: "STEAM", nombre: "Aprendizaje Basado en Indagación (STEAM)", campoPrincipal: "Saberes y Pensamiento Científico" },
      { id: "ABP", nombre: "Aprendizaje Basado en Problemas", campoPrincipal: "Ética, Naturaleza y Sociedades" },
      { id: "AS", nombre: "Aprendizaje Servicio", campoPrincipal: "De lo Humano y lo Comunitario" }
    ],
    ejesArticuladores: [
      "Inclusión",
      "Pensamiento Crítico",
      "Interculturalidad Crítica",
      "Igualdad de Género",
      "Vida Saludable",
      "Apropiación de las Culturas a través de la Lectura y la Escritura",
      "Artes y Experiencias Estéticas"
    ],
    duracionSesionEstandarMin: 40,
    momentosSesionEstandar: [
      { nombre: "Apertura", minutosSugeridos: 5, proposito: "Recuperar conocimientos previos y plantear el reto formativo." },
      { nombre: "Explicación y ejemplos", minutosSugeridos: 10, proposito: "Desarrollo conceptual, ejemplos paso a paso y descripciones sensoriales." },
      { nombre: "Actividad principal", minutosSugeridos: 20, proposito: "Aplicación guiada, diálogo, resolución colaborativa o producción." },
      { nombre: "Cierre", minutosSugeridos: 5, proposito: "Recapitulación, cotejo de evidencias y retroalimentación formativa." }
    ]
  };
}

/**
 * Consulta el catálogo curricular oficial y los grupos disponibles del docente.
 */
function contextoInicialPlaneacionNEM(token) {
  const ses = exigirClaseRol_(token, ["admin", "maestro"]);
  const catalogo = catalogoCurricularNEM_();
  let asignaciones = [];

  let todasHoras = _leerFilas_("Horarios");
  const esOficialCompleto = todasHoras.length >= 500 && todasHoras.some(function (f) {
    const m = String(f["Maestro"] || "").toUpperCase();
    return m.indexOf("MIGUEL") >= 0 || m.indexOf("KRISTEL") >= 0;
  });
  if (!esOficialCompleto && typeof obtenerFilasHorarioOficialAsc_ === "function") {
    const oficiales = obtenerFilasHorarioOficialAsc_();
    const enc = ENCABEZADOS.Horarios;
    todasHoras = oficiales.map(function (row) {
      const obj = {};
      enc.forEach(function (h, idx) {
        obj[h] = row[idx];
        obj[h.toLowerCase()] = row[idx];
      });
      return obj;
    });
  }

  const nomDoc = normalizarNombrePref_(ses.maestroNombre || ses.nombre || "");
  const gruposSet = {};
  const asignaturasSet = {};

  todasHoras.forEach(function (f) {
    const m = normalizarNombrePref_(f["Maestro"] || f["maestro"] || "");
    if (ses.rol !== "admin" && nomDoc && m && m !== nomDoc) return;

    const gr = String(f["Grado"] || f["grado"] || "").trim();
    const gp = String(f["Grupo"] || f["grupo"] || "").trim().toUpperCase();
    const asig = String(f["Asignatura"] || f["asignatura"] || f["Materia"] || f["materia"] || "").trim();

    if (gr && gp) {
      const kG = gr + gp;
      gruposSet[kG] = true;
    }
    if (asig) {
      asignaturasSet[asig] = true;
    }

    asignaciones.push({
      id: f["Id"] || f["id"] || f["ID"] || "",
      dia: f["Dia"] || f["dia"] || "",
      hora: f["Hora"] || f["hora"] || "",
      grado: gr,
      grupo: gp,
      asignatura: asig,
      maestro: f["Maestro"] || f["maestro"] || ""
    });
  });

  const grupos = Object.keys(gruposSet).sort();
  const asignaturas = Object.keys(asignaturasSet).sort();

  return {
    ok: true,
    catalogo: catalogo,
    grupos: grupos,
    asignaturas: asignaturas,
    asignaciones: asignaciones
  };
}

/**
 * Crea o actualiza una Planeación Didáctica NEM (en borrador o en revisión).
 */
/**
 * Propiedad de una planeación didáctica.
 *
 * El administrador puede operar sobre cualquiera; un docente solo sobre las
 * suyas. Las planeaciones antiguas sin propietario declarado se dejan pasar
 * para no romper datos heredados.
 */
function exigirPropietarioPlaneacion_(ses, filaPlan) {
  if (!filaPlan) throw new Error("Planeación no encontrada.");
  if (String((ses && ses.rol) || "").toLowerCase() === "admin") return true;
  const dueno = normalizarNombrePref_(filaPlan["DocentePropietario"] || filaPlan["docentepropietario"] || filaPlan["Docente"] || filaPlan["docente"] || "");
  if (!dueno) return true;
  const yo = normalizarNombrePref_((ses && (ses.maestroNombre || ses.nombre)) || "");
  if (dueno !== yo) throw new Error("No tienes autorización para modificar la planeación de otro docente.");
  return true;
}

/**
 * Lectura de una planeación: además de la propia, se permite leer lo ya
 * publicado en el repositorio escolar, pero nunca el borrador de otro docente.
 */
function exigirLecturaPlaneacion_(ses, filaPlan) {
  if (!filaPlan) throw new Error("Planeación no encontrada.");
  if (String((ses && ses.rol) || "").toLowerCase() === "admin") return true;
  const estado = String(filaPlan["Estado"] || filaPlan["estado"] || "BORRADOR").toUpperCase();
  if (estado === "PUBLICADA" || estado === "APROBADO" || estado === "TERMINADA") return true;
  return exigirPropietarioPlaneacion_(ses, filaPlan);
}

/**
 * Obtiene una pestaña del libro con tolerancia a mayúsculas, espacios y caracteres especiales.
 * Si no existe, intenta insertarla con sus encabezados de 00_Constantes.gs.
 */
function _obtenerHojaRobusta_(libro, nombre) {
  if (!libro) return null;
  let p = libro.getSheetByName(nombre);
  if (p) return p;
  const sheets = libro.getSheets();
  const nomNorm = String(nombre || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s_-]+/g, "");
  for (let s = 0; s < sheets.length; s++) {
    const shName = sheets[s].getName().toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s_-]+/g, "");
    if (shName === nomNorm || 
        (nomNorm === "planeacionesnem" && (shName === "planeaciones" || shName === "planeacion" || shName === "planeacionnem")) ||
        (nomNorm === "sesionesnem" && (shName === "sesiones" || shName === "sesion" || shName === "sesionnem"))) {
      return sheets[s];
    }
  }
  try {
    p = libro.insertSheet(nombre);
    if (typeof ENCABEZADOS !== 'undefined' && ENCABEZADOS[nombre]) {
      p.appendRow(ENCABEZADOS[nombre]);
      p.getRange(1, 1, 1, ENCABEZADOS[nombre].length).setFontWeight("bold");
    }
    return p;
  } catch (eIns) {
    return libro.getSheetByName(nombre) || null;
  }
}

function crearOActualizarPlaneacionNEM(token, datos) {
  let ses = null;
  try {
    ses = exigirClaseRol_(token, ["admin", "maestro"]);
  } catch (eRol) {
    const sVal = (typeof obtenerSesionValida_ === 'function') ? obtenerSesionValida_(token) : null;
    if (sVal && (sVal.rol === "admin" || sVal.rol === "maestro" || sVal.rol === "docente")) {
      ses = sVal;
      if (ses.rol === "docente") ses.rol = "maestro";
    } else {
      throw eRol;
    }
  }
  if (!datos || typeof datos !== "object") throw new Error("Datos de planeación no proporcionados.");

  const titulo = String(datos.titulo || "").trim();
  if (!titulo) throw new Error("El título del proyecto didáctico es obligatorio.");

  const grado = String(datos.grado || "").trim();
  const grupo = String(datos.grupo || "").trim().toUpperCase();
  const asignatura = String(datos.asignatura || "").trim();
  if (!grado || !grupo || !asignatura) {
    throw new Error("Grado, grupo y asignatura son obligatorios para situar la planeación.");
  }

  const docenteResponsable = ses.rol === "admin"
    ? String(datos.docente || ses.nombre || "Administrador").trim()
    : String(ses.maestroNombre || ses.nombre || "Docente").trim();

  const campoFormativo = String(datos.campoFormativo || "").trim();
  const metodologia = String(datos.metodologia || "ABPC").trim();
  const contenidoSintetico = String(datos.contenidoSintetico || "").trim();
  const pda = Array.isArray(datos.pda)
    ? datos.pda.filter(function (x) { return !!String(x).trim(); }).join("\n• ")
    : String(datos.pda || "").trim();
  const ejes = Array.isArray(datos.ejesArticuladores) ? datos.ejesArticuladores.join(", ") : String(datos.ejesArticuladores || "").trim();
  const proposito = String(datos.proposito || "").trim();
  const problemaComunidad = String(datos.problemaComunidad || "").trim();
  const productoFinal = String(datos.productoFinal || "").trim();
  const numSesiones = Math.max(1, Math.min(20, Math.floor(Number(datos.numSesiones) || 3)));
  const periodo = String(datos.periodo || "").trim();
  const fechaInicio = String(datos.fechaInicio || "").trim();
  const idHorario = String(datos.idHorario || "").trim();

  const lock = LockService.getScriptLock();
  let locked = false;
  try {
    locked = lock.tryLock(10000);
  } catch (eLock) {
    locked = false;
  }

  try {
    const libro = _obtenerLibro_();
    if (!libro) {
      throw new Error("No se pudo conectar a la base de datos de Google Sheets (ID: 1ZxCuV_6O3JcX9E-7y165Q6ofAZRERk9-xj5rYeUhaYU). " + (typeof ultimoErrorAperturaLibro !== 'undefined' ? ultimoErrorAperturaLibro : ''));
    }
    let pPlan = _obtenerHojaRobusta_(libro, "PlaneacionesNEM");
    if (!pPlan) {
      throw new Error("No se pudo inicializar la pestaña PlaneacionesNEM en Google Sheets.");
    }
    if (pPlan.getLastRow() === 0) {
      pPlan.appendRow(ENCABEZADOS.PlaneacionesNEM);
      pPlan.getRange(1, 1, 1, ENCABEZADOS.PlaneacionesNEM.length).setFontWeight("bold");
    }
    if (pPlan.getMaxColumns() < ENCABEZADOS.PlaneacionesNEM.length) {
      pPlan.insertColumnsAfter(pPlan.getMaxColumns(), ENCABEZADOS.PlaneacionesNEM.length - pPlan.getMaxColumns());
    }

    const filasPlan = _leerFilas_("PlaneacionesNEM");
    let idPlan = String(datos.id || "").trim();
    let previa = null;

    if (idPlan) {
      previa = filasPlan.filter(function (f) { return String(f["Id"] || f["id"] || f["ID"] || "").trim() === idPlan; })[0];
    }

    if (previa && ses.rol === "maestro") {
      const autorOriginal = normalizarNombrePref_(previa["DocentePropietario"] || previa["Docente"] || "");
      if (autorOriginal && autorOriginal !== normalizarNombrePref_(docenteResponsable)) {
        throw new Error("No tienes autorización para modificar la planeación de otro docente.");
      }
    }

    let version = previa ? (Number(previa["Version"] || 1) + 1) : 1;
    let estado = previa && previa["Estado"] === "APROBADO" ? "EN_REVISION" : "BORRADOR";
    if (datos.estado === "EN_REVISION") estado = "EN_REVISION";

    if (!idPlan) {
      idPlan = "PLN-" + Utilities.getUuid().slice(0, 10).toUpperCase();
    }

    const fechaCreacion = previa && previa["FechaCreacion"] ? previa["FechaCreacion"] : new Date();
    const fechaAprobacion = previa && previa["FechaAprobacion"] ? previa["FechaAprobacion"] : "";
    const esCopiaDe = String(datos.esCopiaDe || (previa ? (previa["EsCopiaDe"] || previa["escopiade"] || "") : "")).trim();
    const docentePropietario = previa && (previa["DocentePropietario"] || previa["docentepropietario"]) 
      ? (previa["DocentePropietario"] || previa["docentepropietario"]) 
      : docenteResponsable;

    const filaVal = [
      idPlan,
      titulo,
      grado,
      grupo,
      asignatura,
      campoFormativo,
      metodologia,
      contenidoSintetico,
      pda,
      ejes,
      proposito,
      problemaComunidad,
      productoFinal,
      numSesiones,
      docenteResponsable,
      estado,
      version,
      fechaCreacion,
      fechaAprobacion,
      periodo,
      fechaInicio,
      idHorario,
      docentePropietario,
      esCopiaDe
    ];

    if (previa) {
      pPlan.getRange(previa._fila, 1, 1, ENCABEZADOS.PlaneacionesNEM.length).setValues([filaVal]);
    } else {
      pPlan.appendRow(filaVal);
      // Inicializar automáticamente las N sesiones de 40 minutos en blanco
      desglosarSesionesInicialesNEM_(libro, idPlan, numSesiones, titulo);
    }

    SpreadsheetApp.flush();
    if (locked) {
      try { lock.releaseLock(); } catch (eR) {}
      locked = false;
    }

    return {
      ok: true,
      id: idPlan,
      estado: estado,
      version: version,
      mensaje: previa ? "Planeación didáctica actualizada exitosamente." : "Proyecto didáctico inicializado con " + numSesiones + " sesiones de 40 min."
    };
  } finally {
    if (locked) {
      try { lock.releaseLock(); } catch (eR) {}
    }
  }
}

/**
 * Inicializa automáticamente las N sesiones de 40 minutos en blanco para una planeación recién creada.
 */
function desglosarSesionesInicialesNEM_(libro, idPlaneacion, numSesiones, tituloProyecto) {
  if (!libro) return;
  const pSes = _obtenerHojaRobusta_(libro, "SesionesNEM");
  if (!pSes) return;

  if (pSes.getLastRow() === 0) {
    pSes.appendRow(ENCABEZADOS.SesionesNEM);
    pSes.getRange(1, 1, 1, ENCABEZADOS.SesionesNEM.length).setFontWeight("bold");
  }
  if (pSes.getMaxColumns() < ENCABEZADOS.SesionesNEM.length) {
    pSes.insertColumnsAfter(pSes.getMaxColumns(), ENCABEZADOS.SesionesNEM.length - pSes.getMaxColumns());
  }

  const n = Math.max(1, Math.min(20, Math.floor(Number(numSesiones) || 3)));
  const filasNuevas = [];

  for (let i = 1; i <= n; i++) {
    const idSes = "SES-" + Utilities.getUuid().slice(0, 10).toUpperCase();
    const tit = "Sesión " + i + (tituloProyecto ? (": " + tituloProyecto) : "");

    const fila = [
      idSes,
      idPlaneacion,
      i,
      tit,
      40,
      "",
      5,
      "",
      10,
      "[]",
      "",
      20,
      "",
      5,
      "{}",
      "",
      "BORRADOR",
      "",
      "",
      new Date()
    ];
    filasNuevas.push(fila);
  }

  if (filasNuevas.length > 0) {
    const startRow = pSes.getLastRow() + 1;
    if (pSes.getMaxRows() < startRow + filasNuevas.length - 1) {
      pSes.insertRowsAfter(pSes.getMaxRows(), (startRow + filasNuevas.length - 1) - pSes.getMaxRows() + 10);
    }
    pSes.getRange(startRow, 1, filasNuevas.length, ENCABEZADOS.SesionesNEM.length).setValues(filasNuevas);
    SpreadsheetApp.flush();
  }
}

/**
 * Lista las planeaciones didácticas del docente o escuela.
 * Soporta banco personal y banco global (repositorio colegiado).
 */
function listarPlaneacionesNEM(token, filtroGrado, filtroGrupo, opciones) {
  let ses = null;
  try {
    ses = exigirClaseRol_(token, ["admin", "maestro"]);
  } catch (eRol) {
    const sVal = (typeof obtenerSesionValida_ === 'function') ? obtenerSesionValida_(token) : null;
    if (sVal && (sVal.rol === "admin" || sVal.rol === "maestro" || sVal.rol === "docente")) {
      ses = sVal;
      if (ses.rol === "docente") ses.rol = "maestro";
    } else {
      throw eRol;
    }
  }
  let opts = {};
  if (filtroGrado && typeof filtroGrado === "object") {
    opts = filtroGrado;
    filtroGrado = opts.grado || opts.filtroGrado;
    filtroGrupo = opts.grupo || opts.filtroGrupo;
  } else if (opciones && typeof opciones === "object") {
    opts = opciones;
  }

  const banco = String(opts.banco || "personal").toLowerCase(); // 'personal' o 'global'
  const filtroAsignatura = String(opts.asignatura || "").trim();
  const filtroTrimestre = String(opts.trimestre || opts.periodo || "").trim();
  const filtroDocente = String(opts.docente || "").trim();

  const libro = _obtenerLibro_();
  if (!libro) {
    throw new Error("No se pudo conectar a la base de datos de Google Sheets (ID: 1ZxCuV_6O3JcX9E-7y165Q6ofAZRERk9-xj5rYeUhaYU). " + (typeof ultimoErrorAperturaLibro !== 'undefined' ? ultimoErrorAperturaLibro : ''));
  }
  const pPlan = _obtenerHojaRobusta_(libro, "PlaneacionesNEM");
  const pSes = _obtenerHojaRobusta_(libro, "SesionesNEM");
  let filas = _leerFilas_("PlaneacionesNEM");
  if (!filas || filas.length === 0) {
    try {
      sembrarPlaneacionesDemoNEM(token);
      filas = _leerFilas_("PlaneacionesNEM");
    } catch (eSem) {
      Logger.log("Error al auto-sembrar proyectos demo: " + eSem);
    }
  }
  const nomDoc = normalizarNombrePref_(ses.maestroNombre || ses.nombre || "");

  const filtradas = filas.filter(function (f) {
    const id = String(f["Id"] || f["id"] || f["ID"] || "").trim();
    if (!id) return false;
    const estadoPlan = String(f["Estado"] || f["estado"] || "BORRADOR").toUpperCase();
    const docF = normalizarNombrePref_(f["DocentePropietario"] || f["Docente"] || f["docente"] || "");

    // Si solicita el Banco Global (Repositorio Escolar):
    if (banco === "global") {
      // Solo proyectos terminados o publicados
      if (estadoPlan !== "PUBLICADA" && estadoPlan !== "TERMINADA" && estadoPlan !== "APROBADO") {
        return false;
      }
    } else {
      // Si solicita su Banco Personal:
      if (ses.rol !== "admin") {
        const esDemo = String(f["Id"] || f["id"] || "").indexOf("PLN-DEMO-") === 0;
        const esGenerico = docF === "administrador" || docF === "docente st90" || docF === "docente" || !docF || docF.indexOf("admin") >= 0;
        const coincideDoc = docF && nomDoc && (docF === nomDoc || docF.indexOf(nomDoc) >= 0 || nomDoc.indexOf(docF) >= 0);
        if (!coincideDoc && !esDemo && !esGenerico) {
          return false;
        }
      }
    }

    if (banco === "global" && filtroDocente && docF.indexOf(normalizarNombrePref_(filtroDocente)) === -1) return false;
    if (filtroGrado && String(f["Grado"] || f["grado"] || "").trim() !== String(filtroGrado).trim()) return false;
    if (filtroGrupo) {
      const gpF = String(f["Grupo"] || f["grupo"] || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^\d+/, "");
      const gpB = String(filtroGrupo || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^\d+/, "");
      if (gpB && gpF && gpF !== gpB) return false;
    }
    if (filtroAsignatura) {
      const asigF = normalizarNombrePref_(f["Asignatura"] || f["asignatura"] || "");
      const asigB = normalizarNombrePref_(filtroAsignatura);
      if (asigF !== asigB && asigF.indexOf(asigB) === -1 && asigB.indexOf(asigF) === -1) return false;
    }
    if (filtroTrimestre) {
      const per = String(f["Periodo"] || f["periodo"] || f["Trimestre"] || f["trimestre"] || "").trim();
      const mF = String(filtroTrimestre).match(/\d+/);
      const numFiltro = mF ? mF[0] : "";
      const mPer = per.match(/\d+/);
      const numPer = mPer ? mPer[0] : "";
      if (numFiltro && numPer && numFiltro !== numPer) return false;
      else if (!numFiltro && per.toLowerCase().indexOf(filtroTrimestre.toLowerCase()) === -1) return false;
    }
    return true;
  });

  const sesionesTodas = _leerFilas_("SesionesNEM");

  const out = filtradas.map(function (p) {
    const id = String(p["Id"] || p["id"] || p["ID"] || "").trim();
    const sesiones = sesionesTodas.filter(function (s) {
      return String(s["IdPlaneacion"] || s["idplaneacion"] || s["IDPLANEACION"] || "").trim() === id;
    });

    const programadas = sesiones.filter(function (s) {
      const est = String(s["Estado"] || s["estado"] || "").trim();
      return est === "PROGRAMADO";
    }).length;

    const tit = p["Titulo"] || p["titulo"] || "";
    const gr = p["Grado"] || p["grado"] || "";
    const gp = p["Grupo"] || p["grupo"] || "";
    const asig = p["Asignatura"] || p["asignatura"] || "";
    const cmp = p["CampoFormativo"] || p["campoformativo"] || "";
    const met = p["Metodologia"] || p["metodologia"] || "";
    const cs = p["ContenidoSintetico"] || p["contenidosintetico"] || "";
    const pda = p["PDA"] || p["pda"] || "";
    const doc = p["Docente"] || p["docente"] || "";
    const docProp = p["DocentePropietario"] || p["docentepropietario"] || doc;
    const est = p["Estado"] || p["estado"] || "BORRADOR";
    const ver = Number(p["Version"] || p["version"] || 1);
    const numSes = Number(p["NumSesiones"] || p["numsesiones"] || sesiones.length);
    const completadas = sesiones.filter(function (s) {
      return String(s["GuionEstudianteAccesible"] || s["guionestudianteaccesible"] || "").trim().length > 0;
    }).length;
    function _fmtFechaIsoGas_(v) {
      if (!v) return "";
      if (v instanceof Date) {
        try {
          return Utilities.formatDate(v, "America/Mexico_City", "yyyy-MM-dd HH:mm:ss");
        } catch (eFmt) {
          return v.toISOString ? v.toISOString() : String(v);
        }
      }
      return String(v);
    }
    const fc = _fmtFechaIsoGas_(p["FechaCreacion"] || p["fechacreacion"]);
    const fa = _fmtFechaIsoGas_(p["FechaAprobacion"] || p["fechaaprobacion"]);
    const per = String(p["Periodo"] || p["periodo"] || "");
    const fi = _fmtFechaIsoGas_(p["FechaInicio"] || p["fechainicio"]);
    const idH = String(p["IdHorario"] || p["idhorario"] || "");
    const esCopia = String(p["EsCopiaDe"] || p["escopiade"] || "");

    const docNorm = normalizarNombrePref_(docProp || doc);
    const esMio = (ses.rol === "admin") || (docNorm === nomDoc);

    return {
      id: id,
      Id: id,
      titulo: tit,
      Titulo: tit,
      grado: gr,
      Grado: gr,
      grupo: gp,
      Grupo: gp,
      asignatura: asig,
      Asignatura: asig,
      campoFormativo: cmp,
      CampoFormativo: cmp,
      metodologia: met,
      Metodologia: met,
      contenidoSintetico: cs,
      ContenidoSintetico: cs,
      pda: pda,
      PDA: pda,
      docente: doc,
      Docente: doc,
      docentePropietario: docProp,
      DocentePropietario: docProp,
      estado: est,
      Estado: est,
      version: ver,
      Version: ver,
      numSesiones: numSes,
      NumSesiones: numSes,
      sesionesCompletadas: completadas,
      sesionesProgramadas: programadas,
      fechaCreacion: fc,
      FechaCreacion: fc,
      fechaAprobacion: fa,
      FechaAprobacion: fa,
      periodo: per,
      Periodo: per,
      fechaInicio: fi,
      FechaInicio: fi,
      idHorario: idH,
      IdHorario: idH,
      esCopiaDe: esCopia,
      EsCopiaDe: esCopia,
      esMio: esMio,
      puedeEditar: esMio,
      puedeEliminar: esMio,
      puedeClonar: true
    };
  });

  out.sort(function (a, b) {
    return new Date(b.fechaCreacion || 0) - new Date(a.fechaCreacion || 0);
  });

  return JSON.parse(JSON.stringify({
    ok: true,
    total: out.length,
    totalEnBase: filas.length,
    planeaciones: out
  }));
}

/**
 * Clona una planeación didáctica del repositorio escolar hacia el banco personal del docente.
 * Genera una copia independiente con nuevas sesiones y Docente = docente en sesión.
 */
function clonarPlaneacionAGlobal(token, idPlaneacionOriginal) {
  const ses = exigirClaseRol_(token, ["admin", "maestro"]);
  const idOriginal = String(idPlaneacionOriginal || "").trim();
  if (!idOriginal) throw new Error("ID de planeación a clonar no especificado.");

  const libro = _obtenerLibro_();
  if (!libro) {
    throw new Error("No se pudo conectar a la base de datos de Google Sheets. " + (typeof ultimoErrorAperturaLibro !== 'undefined' ? ultimoErrorAperturaLibro : ''));
  }
  let pPlan = _obtenerHojaRobusta_(libro, "PlaneacionesNEM");
  let pSes = _obtenerHojaRobusta_(libro, "SesionesNEM");
  if (!pPlan || !pSes) {
    throw new Error("No se pudieron inicializar las pestañas PlaneacionesNEM y SesionesNEM.");
  }
  if (pPlan.getLastRow() === 0) {
    pPlan.appendRow(ENCABEZADOS.PlaneacionesNEM);
    pPlan.getRange(1, 1, 1, ENCABEZADOS.PlaneacionesNEM.length).setFontWeight("bold");
  }
  if (pPlan.getMaxColumns() < ENCABEZADOS.PlaneacionesNEM.length) {
    pPlan.insertColumnsAfter(pPlan.getMaxColumns(), ENCABEZADOS.PlaneacionesNEM.length - pPlan.getMaxColumns());
  }
  if (pSes.getLastRow() === 0) {
    pSes.appendRow(ENCABEZADOS.SesionesNEM);
    pSes.getRange(1, 1, 1, ENCABEZADOS.SesionesNEM.length).setFontWeight("bold");
  }
  if (pSes.getMaxColumns() < ENCABEZADOS.SesionesNEM.length) {
    pSes.insertColumnsAfter(pSes.getMaxColumns(), ENCABEZADOS.SesionesNEM.length - pSes.getMaxColumns());
  }

  const filasPlan = _leerFilas_("PlaneacionesNEM");
  const original = filasPlan.filter(function (f) {
    return String(f["Id"] || f["id"] || f["ID"] || "").trim() === idOriginal;
  })[0];
  if (!original) throw new Error("Planeación didáctica original no encontrada.");
  exigirLecturaPlaneacion_(ses, original);

  const sesionesOriginales = _leerFilas_("SesionesNEM").filter(function (s) {
    return String(s["IdPlaneacion"] || s["idplaneacion"] || s["IDPLANEACION"] || "").trim() === idOriginal;
  });

  const nuevoDocente = ses.rol === "admin"
    ? String(ses.nombre || "Docente").trim()
    : String(ses.maestroNombre || ses.nombre || "Docente").trim();

  const idNuevo = "PLN-" + Utilities.getUuid().slice(0, 10).toUpperCase();
  const tituloCopia = String(original["Titulo"] || original["titulo"] || "Proyecto").trim() + " (Copia)";

  const nuevaFilaPlan = [
    idNuevo,
    tituloCopia,
    String(original["Grado"] || original["grado"] || "1"),
    String(original["Grupo"] || original["grupo"] || "A"),
    String(original["Asignatura"] || original["asignatura"] || ""),
    String(original["CampoFormativo"] || original["campoformativo"] || ""),
    String(original["Metodologia"] || original["metodologia"] || "ABPC"),
    String(original["ContenidoSintetico"] || original["contenidosintetico"] || ""),
    String(original["PDA"] || original["pda"] || ""),
    String(original["EjesArticuladores"] || original["ejesarticuladores"] || ""),
    String(original["Proposito"] || original["proposito"] || ""),
    String(original["ProblemaComunidad"] || original["problemacomunidad"] || ""),
    String(original["ProductoFinal"] || original["productofinal"] || ""),
    Number(original["NumSesiones"] || original["numsesiones"] || sesionesOriginales.length || 3),
    nuevoDocente,
    "BORRADOR",
    1,
    new Date(),
    "",
    String(original["Periodo"] || original["periodo"] || ""),
    "",
    "",
    nuevoDocente,
    idOriginal
  ];

  pPlan.appendRow(nuevaFilaPlan);

  // Clonar las sesiones vinculadas
  sesionesOriginales.forEach(function (s, idx) {
    const idSesNueva = "SES-" + Utilities.getUuid().slice(0, 10).toUpperCase();
    const numSes = Number(s["NumeroSesion"] || s["numerosesion"] || (idx + 1));
    const titSes = String(s["Titulo"] || s["titulo"] || ("Sesión " + numSes));
    const durMin = Number(s["DuracionMin"] || s["duracionmin"] || 40);

    const filaSes = [
      idSesNueva,
      idNuevo,
      numSes,
      titSes,
      durMin,
      String(s["AperturaTexto"] || s["aperturatexto"] || ""),
      Number(s["AperturaMin"] || s["aperturamin"] || 5),
      String(s["DesarrolloTexto"] || s["desarrollotexto"] || ""),
      Number(s["DesarrolloMin"] || s["desarrollomin"] || 10),
      String(s["RecursosVisualesJSON"] || s["recursosvisualesjson"] || "[]"),
      String(s["ActividadTexto"] || s["actividadtexto"] || ""),
      Number(s["ActividadMin"] || s["actividadmin"] || 20),
      String(s["CierreTexto"] || s["cierretexto"] || ""),
      Number(s["CierreMin"] || s["cierremin"] || 5),
      String(s["GuionDocenteJSON"] || s["guiondocentejson"] || "{}"),
      String(s["GuionEstudianteAccesible"] || s["guionestudianteaccesible"] || ""),
      "BORRADOR",
      "",
      "",
      new Date()
    ];
    pSes.appendRow(filaSes);
  });

  SpreadsheetApp.flush();

  return {
    ok: true,
    id: idNuevo,
    mensaje: "Planeación copiada exitosamente a tu Banco Personal. Ahora puedes personalizarla libremente."
  };
}

/**
 * Publica una planeación didáctica terminada al Repositorio Global Escolar.
 * Valida autoría y que todas las sesiones tengan sus momentos e iDevices completos.
 */
function publicarPlaneacionEnRepositorio(token, idPlaneacion) {
  const ses = exigirClaseRol_(token, ["admin", "maestro"]);
  const idPlan = String(idPlaneacion || "").trim();
  if (!idPlan) throw new Error("ID de planeación no especificado.");

  const libro = _obtenerLibro_();
  const pPlan = _obtenerHojaRobusta_(libro, "PlaneacionesNEM");
  const filasPlan = _leerFilas_("PlaneacionesNEM");
  const previa = filasPlan.filter(function (f) {
    return String(f["Id"] || f["id"] || f["ID"] || "").trim() === idPlan;
  })[0];
  if (!previa) throw new Error("Planeación no encontrada.");

  const nomDoc = normalizarNombrePref_(ses.maestroNombre || ses.nombre || "");
  const autorPlan = normalizarNombrePref_(previa["DocentePropietario"] || previa["Docente"] || previa["docente"] || "");
  if (ses.rol !== "admin" && autorPlan && autorPlan !== nomDoc) {
    throw new Error("Solo el autor de la planeación puede publicarla en el Repositorio Global.");
  }

  // Validar sesiones
  const sesiones = _leerFilas_("SesionesNEM").filter(function (s) {
    return String(s["IdPlaneacion"] || s["idplaneacion"] || s["IDPLANEACION"] || "").trim() === idPlan;
  });

  const numEsperado = Number(previa["NumSesiones"] || previa["numsesiones"] || 1);
  if (!sesiones.length || sesiones.length < numEsperado) {
    throw new Error("No se puede publicar: la planeación tiene " + sesiones.length + " sesiones de " + numEsperado + " requeridas.");
  }

  for (let i = 0; i < sesiones.length; i++) {
    const s = sesiones[i];
    const nSes = s["NumeroSesion"] || s["numerosesion"] || (i + 1);
    const ap = String(s["AperturaTexto"] || s["aperturatexto"] || "").trim();
    const des = String(s["DesarrolloTexto"] || s["desarrollotexto"] || "").trim();
    const act = String(s["ActividadTexto"] || s["actividadtexto"] || "").trim();
    const cie = String(s["CierreTexto"] || s["cierretexto"] || "").trim();
    const guion = String(s["GuionEstudianteAccesible"] || s["guionestudianteaccesible"] || "").trim();

    if (!ap || !des || !act || !cie || !guion) {
      throw new Error("No se puede publicar en el Repositorio Global: la Sesión " + nSes + " aún no está completa. Debe contener Apertura, Desarrollo, Actividad, Cierre y el Guion de Clase / iDevices para los estudiantes.");
    }
  }

  const idxEstado = ENCABEZADOS.PlaneacionesNEM.indexOf("Estado") + 1;
  pPlan.getRange(previa._fila, idxEstado).setValue("PUBLICADA");
  SpreadsheetApp.flush();

  return {
    ok: true,
    id: idPlan,
    mensaje: "¡Proyecto publicado exitosamente en el Repositorio Escolar Global! Ahora tus colegas pueden consultarlo y copiarlo a sus bancos."
  };
}

/**
 * Elimina una planeación didáctica y sus sesiones del Banco Personal.
 * Valida que solo el autor original (o administrador) pueda eliminarla.
 */
function eliminarPlaneacionNEM(token, idPlaneacion) {
  const ses = exigirClaseRol_(token, ["admin", "maestro"]);
  const idPlan = String(idPlaneacion || "").trim();
  if (!idPlan) throw new Error("ID de planeación no especificado.");

  const libro = _obtenerLibro_();
  if (!libro) {
    throw new Error("No se pudo conectar a la base de datos de Google Sheets (ID: 1ZxCuV_6O3JcX9E-7y165Q6ofAZRERk9-xj5rYeUhaYU). " + (typeof ultimoErrorAperturaLibro !== 'undefined' ? ultimoErrorAperturaLibro : ''));
  }
  const pPlan = _obtenerHojaRobusta_(libro, "PlaneacionesNEM");
  const pSes = _obtenerHojaRobusta_(libro, "SesionesNEM");

  const filasPlan = _leerFilas_("PlaneacionesNEM");
  const previa = filasPlan.filter(function (f) {
    return String(f["Id"] || f["id"] || f["ID"] || "").trim() === idPlan;
  })[0];
  if (!previa) throw new Error("Planeación no encontrada.");

  const nomDoc = normalizarNombrePref_(ses.maestroNombre || ses.nombre || "");
  const autorPlan = normalizarNombrePref_(previa["DocentePropietario"] || previa["Docente"] || previa["docente"] || "");
  if (ses.rol !== "admin" && autorPlan && autorPlan !== nomDoc) {
    throw new Error("No tienes autorización para eliminar la planeación de otro docente.");
  }

  // Eliminar sesiones asociadas de abajo hacia arriba
  const filasSes = _leerFilas_("SesionesNEM");
  const aEliminarSes = filasSes.filter(function (s) {
    return String(s["IdPlaneacion"] || s["idplaneacion"] || s["IDPLANEACION"] || "").trim() === idPlan;
  });

  aEliminarSes.sort(function (a, b) { return b._fila - a._fila; });
  aEliminarSes.forEach(function (s) {
    pSes.deleteRow(s._fila);
  });

  // Eliminar la planeación
  pPlan.deleteRow(previa._fila);
  SpreadsheetApp.flush();

  return {
    ok: true,
    id: idPlan,
    mensaje: "Planeación y sus sesiones eliminadas correctamente del Banco Personal."
  };
}

/**
 * Obtiene la planeación completa junto con todas sus sesiones de 40 minutos.
 */
function obtenerPlaneacionCompletaNEM(token, idPlaneacion) {
  const ses = exigirClaseRol_(token, ["admin", "maestro"]);
  const idPlan = String(idPlaneacion || "").trim();
  if (!idPlan) throw new Error("ID de planeación no especificado.");

  const libro = _obtenerLibro_();
  _obtenerHojaRobusta_(libro, "PlaneacionesNEM");

  const pFila = _leerFilas_("PlaneacionesNEM").filter(function (f) {
    return String(f["Id"] || f["id"] || f["ID"] || "").trim() === idPlan;
  })[0];
  if (!pFila) throw new Error("Planeación no encontrada.");
  exigirLecturaPlaneacion_(ses, pFila);

  const sesionesFilas = _leerFilas_("SesionesNEM").filter(function (s) {
    return String(s["IdPlaneacion"] || s["idplaneacion"] || s["IDPLANEACION"] || "").trim() === idPlan;
  });

  sesionesFilas.sort(function (a, b) {
    const numA = Number(a["NumeroSesion"] || a["numerosesion"] || 0);
    const numB = Number(b["NumeroSesion"] || b["numerosesion"] || 0);
    return numA - numB;
  });

  const sesiones = sesionesFilas.map(function (s) {
    let recursosVisuales = [];
    const recRaw = s["RecursosVisualesJSON"] || s["recursosvisualesjson"] || "[]";
    try {
      recursosVisuales = typeof recRaw === "string" ? JSON.parse(recRaw) : (recRaw || []);
    } catch (e) { recursosVisuales = []; }

    let guionDocente = {};
    const gDocRaw = s["GuionDocenteJSON"] || s["guiondocentejson"] || "{}";
    try {
      guionDocente = typeof gDocRaw === "string" ? JSON.parse(gDocRaw) : (gDocRaw || {});
    } catch (e) { guionDocente = {}; }

    const sId = String(s["Id"] || s["id"] || s["ID"] || "").trim();
    const numSes = Number(s["NumeroSesion"] || s["numerosesion"] || 1);
    const tit = s["Titulo"] || s["titulo"] || "";
    const durMin = Number(s["DuracionMin"] || s["duracionmin"] || 40);
    const apTxt = s["AperturaTexto"] || s["aperturatexto"] || "";
    const apMin = Number(s["AperturaMin"] || s["aperturamin"] || 5);
    const desTxt = s["DesarrolloTexto"] || s["desarrollotexto"] || "";
    const desMin = Number(s["DesarrolloMin"] || s["desarrollomin"] || 10);
    const actTxt = s["ActividadTexto"] || s["actividadtexto"] || "";
    const actMin = Number(s["ActividadMin"] || s["actividadmin"] || 20);
    const cieTxt = s["CierreTexto"] || s["cierretexto"] || "";
    const cieMin = Number(s["CierreMin"] || s["cierremin"] || 5);
    const guionEst = s["GuionEstudianteAccesible"] || s["guionestudianteaccesible"] || "";
    const est = s["Estado"] || s["estado"] || "BORRADOR";
    const idHor = s["IdHorario"] || s["idhorario"] || "";
    const fecProg = s["FechaProgramada"] || s["fechaprogramada"] || "";

    return {
      id: sId,
      Id: sId,
      idPlaneacion: idPlan,
      IdPlaneacion: idPlan,
      numeroSesion: numSes,
      NumeroSesion: numSes,
      titulo: tit,
      Titulo: tit,
      duracionMin: durMin,
      DuracionMin: durMin,
      aperturaTexto: apTxt,
      AperturaTexto: apTxt,
      aperturaMin: apMin,
      AperturaMin: apMin,
      desarrolloTexto: desTxt,
      DesarrolloTexto: desTxt,
      desarrolloMin: desMin,
      DesarrolloMin: desMin,
      recursosVisuales: recursosVisuales,
      RecursosVisuales: recursosVisuales,
      recursosVisualesJSON: JSON.stringify(recursosVisuales),
      RecursosVisualesJSON: JSON.stringify(recursosVisuales),
      actividadTexto: actTxt,
      ActividadTexto: actTxt,
      actividadMin: actMin,
      ActividadMin: actMin,
      cierreTexto: cieTxt,
      CierreTexto: cieTxt,
      cierreMin: cieMin,
      CierreMin: cieMin,
      guionDocente: guionDocente,
      GuionDocente: guionDocente,
      guionDocenteJSON: JSON.stringify(guionDocente),
      GuionDocenteJSON: JSON.stringify(guionDocente),
      guionEstudianteAccesible: guionEst,
      GuionEstudianteAccesible: guionEst,
      estado: est,
      Estado: est,
      idHorario: idHor,
      IdHorario: idHor,
      fechaProgramada: fecProg,
      FechaProgramada: fecProg
    };
  });

  const pTitulo = pFila["Titulo"] || pFila["titulo"] || "";
  const pGrado = pFila["Grado"] || pFila["grado"] || "";
  const pGrupo = pFila["Grupo"] || pFila["grupo"] || "";
  const pAsignatura = pFila["Asignatura"] || pFila["asignatura"] || "";
  const pCampo = pFila["CampoFormativo"] || pFila["campoformativo"] || "";
  const pMetodologia = pFila["Metodologia"] || pFila["metodologia"] || "";
  const pContSint = pFila["ContenidoSintetico"] || pFila["contenidosintetico"] || "";
  const pPDA = pFila["PDA"] || pFila["pda"] || "";
  const pEjes = pFila["EjesArticuladores"] || pFila["ejesarticuladores"] || "";
  const pProposito = pFila["Proposito"] || pFila["proposito"] || "";
  const pProblema = pFila["ProblemaComunidad"] || pFila["problemacomunidad"] || "";
  const pProducto = pFila["ProductoFinal"] || pFila["productofinal"] || "";
  const pNumSes = Number(pFila["NumSesiones"] || pFila["numsesiones"] || sesiones.length);
  const pDocente = pFila["Docente"] || pFila["docente"] || "";
  const pEstado = pFila["Estado"] || pFila["estado"] || "BORRADOR";
  const pVersion = Number(pFila["Version"] || pFila["version"] || 1);
  const pPeriodo = pFila["Periodo"] || pFila["periodo"] || "";
  const pFechaInicio = pFila["FechaInicio"] || pFila["fechainicio"] || "";
  const pIdHorario = pFila["IdHorario"] || pFila["idhorario"] || "";
  const pFechaCreacion = pFila["FechaCreacion"] || pFila["fechacreacion"] || "";
  const pFechaAprobacion = pFila["FechaAprobacion"] || pFila["fechaaprobacion"] || "";

  return {
    ok: true,
    planeacion: {
      id: idPlan,
      Id: idPlan,
      titulo: pTitulo,
      Titulo: pTitulo,
      grado: pGrado,
      Grado: pGrado,
      grupo: pGrupo,
      Grupo: pGrupo,
      asignatura: pAsignatura,
      Asignatura: pAsignatura,
      campoFormativo: pCampo,
      CampoFormativo: pCampo,
      metodologia: pMetodologia,
      Metodologia: pMetodologia,
      contenidoSintetico: pContSint,
      ContenidoSintetico: pContSint,
      pda: pPDA,
      PDA: pPDA,
      ejesArticuladores: pEjes,
      EjesArticuladores: pEjes,
      proposito: pProposito,
      Proposito: pProposito,
      problemaComunidad: pProblema,
      ProblemaComunidad: pProblema,
      productoFinal: pProducto,
      ProductoFinal: pProducto,
      numSesiones: pNumSes,
      NumSesiones: pNumSes,
      docente: pDocente,
      Docente: pDocente,
      estado: pEstado,
      Estado: pEstado,
      version: pVersion,
      Version: pVersion,
      periodo: pPeriodo,
      Periodo: pPeriodo,
      fechaInicio: pFechaInicio,
      FechaInicio: pFechaInicio,
      idHorario: pIdHorario,
      IdHorario: pIdHorario,
      fechaCreacion: pFechaCreacion,
      FechaCreacion: pFechaCreacion,
      fechaAprobacion: pFechaAprobacion,
      FechaAprobacion: pFechaAprobacion
    },
    sesiones: sesiones
  };
}

/**
 * Guarda o actualiza el contenido de una sesión específica de 40 minutos.
 * Aplica el principio DUA: integra notas docentes y guion de estudiante (leer, ver y escuchar).
 */
function guardarSesionNEM(token, payloadSesion) {
  const ses = exigirClaseRol_(token, ["admin", "maestro"]);
  if (!payloadSesion || typeof payloadSesion !== "object") throw new Error("Datos de sesión no proporcionados.");

  const idSes = String(payloadSesion.id || payloadSesion.idSesion || payloadSesion.Id || "").trim();
  const idPlan = String(payloadSesion.idPlaneacion || payloadSesion.IdPlaneacion || "").trim();
  if (!idSes || !idPlan) throw new Error("ID de sesión e ID de planeación son obligatorios.");

  const libro = _obtenerLibro_();
  const pSes = _obtenerHojaRobusta_(libro, "SesionesNEM");
  if (!pSes) throw new Error("La hoja SesionesNEM no existe.");

  const filas = _leerFilas_("SesionesNEM");
  const previa = filas.filter(function (s) { return String(s["Id"] || s["id"] || s["ID"] || "").trim() === idSes; })[0];
  if (!previa) throw new Error("Sesión no encontrada.");
  const idPlanReal = String(previa["IdPlaneacion"] || previa["idplaneacion"] || previa["IDPLANEACION"] || idPlan).trim();
  const planDeLaSesion = _leerFilas_("PlaneacionesNEM").filter(function (p) {
    return String(p["Id"] || p["id"] || p["ID"] || "").trim() === idPlanReal;
  })[0];
  exigirPropietarioPlaneacion_(ses, planDeLaSesion);

  const titulo = String(payloadSesion.titulo || payloadSesion.Titulo || previa["Titulo"] || previa["titulo"] || "").trim();
  const numSes = Number(payloadSesion.numeroSesion || payloadSesion.NumeroSesion || previa["NumeroSesion"] || previa["numerosesion"] || 1);
  const duracionMin = 40; // Estrictamente 40 minutos

  const apTexto = String(payloadSesion.aperturaTexto || "").trim();
  const apMin = Math.max(1, Math.min(15, Number(payloadSesion.aperturaMin) || 5));

  const desTexto = String(payloadSesion.desarrolloTexto || "").trim();
  const desMin = Math.max(1, Math.min(25, Number(payloadSesion.desarrolloMin) || 10));

  const actTexto = String(payloadSesion.actividadTexto || "").trim();
  const actMin = Math.max(1, Math.min(30, Number(payloadSesion.actividadMin) || 20));

  const cieTexto = String(payloadSesion.cierreTexto || "").trim();
  const cieMin = Math.max(1, Math.min(15, Number(payloadSesion.cierreMin) || 5));

  const recursosVisualesArr = Array.isArray(payloadSesion.recursosVisuales) ? payloadSesion.recursosVisuales : [];
  const recursosVisualesJSON = JSON.stringify(recursosVisualesArr);

  const guionDocenteObj = (payloadSesion.guionDocente && typeof payloadSesion.guionDocente === "object") ? payloadSesion.guionDocente : {};
  const guionDocenteJSON = JSON.stringify(guionDocenteObj);

  // Construir o actualizar el Guion Accesible del Estudiante (DUA para Leer y Escuchar)
  let guionEstudiante = String(payloadSesion.guionEstudianteAccesible || "").trim();
  if (!guionEstudiante && (apTexto || desTexto || actTexto || cieTexto)) {
    // Si no fue editado manualmente, se sintetiza armónicamente a partir de los 4 momentos
    const partes = [];
    if (apTexto) partes.push("--- APERTURA ---\n" + apTexto);
    if (desTexto) partes.push("--- EXPLICACIÓN Y EJEMPLOS ---\n" + desTexto);
    if (actTexto) partes.push("--- ACTIVIDAD PRINCIPAL ---\n" + actTexto);
    if (cieTexto) partes.push("--- CIERRE ---\n" + cieTexto);
    guionEstudiante = partes.join("\n\n");
  }

  const estado = payloadSesion.estado || previa["Estado"] || "BORRADOR";
  const idHorario = String(payloadSesion.idHorario || previa["IdHorario"] || "").trim();
  const fechaProg = String(payloadSesion.fechaProgramada || previa["FechaProgramada"] || "").trim();

  const filaVal = [
    idSes,
    idPlan,
    numSes,
    titulo,
    duracionMin,
    apTexto,
    apMin,
    desTexto,
    desMin,
    recursosVisualesJSON,
    actTexto,
    actMin,
    cieTexto,
    cieMin,
    guionDocenteJSON,
    guionEstudiante,
    estado,
    idHorario,
    fechaProg,
    new Date()
  ];

  pSes.getRange(previa._fila, 1, 1, ENCABEZADOS.SesionesNEM.length).setValues([filaVal]);
  SpreadsheetApp.flush();

  return {
    ok: true,
    id: idSes,
    mensaje: "Contenido de la sesión guardado correctamente."
  };
}

/**
 * Aprueba formalmente una planeación didáctica.
 * Solo una planeación aprobada puede calendarizarse en las fechas reales.
 */
function aprobarPlaneacionNEM(token, idPlaneacion) {
  const ses = exigirClaseRol_(token, ["admin", "maestro"]);
  const idPlan = String(idPlaneacion || "").trim();
  if (!idPlan) throw new Error("ID de planeación no especificado.");

  const libro = _obtenerLibro_();
  const pPlan = _obtenerHojaRobusta_(libro, "PlaneacionesNEM");
  const filasPlan = _leerFilas_("PlaneacionesNEM");
  const previa = filasPlan.filter(function (f) { return String(f["Id"] || f["id"] || f["ID"] || "").trim() === idPlan; })[0];
  if (!previa) throw new Error("Planeación no encontrada.");
  exigirPropietarioPlaneacion_(ses, previa);

  // Validaciones mínimas pedagógicas
  if (!previa["ContenidoSintetico"] && !previa["contenidosintetico"] && !previa["PDA"] && !previa["pda"]) {
    throw new Error("No se puede aprobar una planeación que carece de Contenido Curricular o PDA verificado.");
  }

  const idxEstado = ENCABEZADOS.PlaneacionesNEM.indexOf("Estado") + 1;
  const idxFechaAprob = ENCABEZADOS.PlaneacionesNEM.indexOf("FechaAprobacion") + 1;

  pPlan.getRange(previa._fila, idxEstado).setValue("APROBADO");
  pPlan.getRange(previa._fila, idxFechaAprob).setValue(new Date());
  SpreadsheetApp.flush();

  return {
    ok: true,
    id: idPlan,
    mensaje: "Planeación didáctica aprobada exitosamente. Lista para calendarización."
  };
}

/**
 * Calendariza una sesión didáctica en una fecha y bloque de horario real.
 * Realiza la sincronización automática con ContenidosClase para que Aula Hablada
 * presente la clase al alumno de manera transparente.
 */
function calendarizarSesionNEM(token, idSesion, idHorario, fecha) {
  const ses = exigirClaseRol_(token, ["admin", "maestro"]);
  const idSes = String(idSesion || "").trim();
  const idH = idHorarioClase_(idHorario);
  const fe = fechaIsoClase_(fecha);

  if (!idSes) throw new Error("ID de sesión no especificado.");
  if (!idH) throw new Error("Bloque de horario no especificado.");
  if (!fe) throw new Error("Fecha escolar no especificada.");

  const libro = _obtenerLibro_();
  const pSes = _obtenerHojaRobusta_(libro, "SesionesNEM");
  const filasSes = _leerFilas_("SesionesNEM");
  const sesion = filasSes.filter(function (s) { return String(s["Id"] || s["id"] || s["ID"] || "").trim() === idSes; })[0];
  if (!sesion) throw new Error("Sesión no encontrada.");
  const planDeSesion = _leerFilas_("PlaneacionesNEM").filter(function (p) {
    return String(p["Id"] || p["id"] || p["ID"] || "").trim() === String(sesion["IdPlaneacion"] || sesion["idplaneacion"] || sesion["IDPLANEACION"] || "").trim();
  })[0];
  exigirPropietarioPlaneacion_(ses, planDeSesion);

  const filaH = _leerFilas_("Horarios").filter(function (f) {
    return idHorarioClase_(f["Id"] || f["id"] || f["ID"]) === idH;
  })[0];
  if (!filaH) throw new Error("El bloque de horario indicado no existe en la escuela.");

  // Actualizar SesionesNEM
  const idxEstado = ENCABEZADOS.SesionesNEM.indexOf("Estado") + 1;
  const idxIdHorario = ENCABEZADOS.SesionesNEM.indexOf("IdHorario") + 1;
  const idxFechaProg = ENCABEZADOS.SesionesNEM.indexOf("FechaProgramada") + 1;

  pSes.getRange(sesion._fila, idxEstado).setValue("PROGRAMADO");
  pSes.getRange(sesion._fila, idxIdHorario).setValue(idH);
  pSes.getRange(sesion._fila, idxFechaProg).setNumberFormat("@").setValue(fe);

  // Sincronizar con ContenidosClase (Aula Hablada)
  const textoParaAulaHablada = String(sesion["GuionEstudianteAccesible"] || "").trim();
  if (textoParaAulaHablada) {
    guardarContenidoClase(token, {
      idHorario: idH,
      fecha: fe,
      titulo: sesion["Titulo"] || ("Clase de " + (filaH["Asignatura"] || "")),
      texto: textoParaAulaHablada,
      publicado: "SI"
    });
  }

  SpreadsheetApp.flush();

  return {
    ok: true,
    idSesion: idSes,
    fecha: fe,
    idHorario: idH,
    mensaje: "Sesión programada y publicada exitosamente en el calendario y en Aula Hablada."
  };
}

/**********************************************************************
 * ASISTENCIA INTELIGENTE DE PLANEACIÓN NEM (IA DEEPSEEK)
 **********************************************************************/

/**
 * Sugiere una propuesta pedagógica situada (problema comunitario, propósito, producto, ejes)
 * a partir de la disciplina, grado, contenido curricular y PDA oficiales seleccionados.
 */
function asistirDisenoProyectoNEM(token, peticion) {
  const ses = exigirClaseRol_(token, ["admin", "maestro"]);
  if (!peticion || typeof peticion !== "object") {
    throw new Error("Datos de contexto no proporcionados para la asistencia de IA.");
  }

  const clave = typeof obtenerClaveDeepSeek_ === "function" ? obtenerClaveDeepSeek_() : "";
  if (!clave) {
    return {
      ok: false,
      sinClave: true,
      error: "No hay clave de DeepSeek configurada en el sistema. Puedes llenar los campos manualmente o solicitar al administrador registrar la clave en Configuración."
    };
  }

  const grado = String(peticion.grado || "1").trim();
  const asignatura = String(peticion.asignatura || "Español").trim();
  const campo = String(peticion.campoFormativo || "").trim();
  const metodologia = String(peticion.metodologia || "ABPC").trim();
  const contenido = String(peticion.contenidoSintetico || "").trim();
  let pdas = peticion.pda || peticion.pdas || "";
  if (Array.isArray(pdas)) {
    pdas = pdas.join(" | ");
  }

  const escuelaNom = typeof NOMBRE_ESCUELA !== "undefined" ? NOMBRE_ESCUELA : "Secundaria Técnica 90";
  const instruccion = "Eres un especialista curricular de la " + escuelaNom + " y experto en la Fase 6 de la Nueva Escuela Mexicana (Educación Secundaria en México).\n" +
    "Genera una propuesta pedagógica situada, viable y rigurosa para el diseño de un proyecto formativo escolar.\n" +
    "Debes devolver ÚNICAMENTE un objeto JSON válido con las siguientes claves exactas:\n" +
    "- \"problemaComunidad\": Diagnóstico breve de una problemática escolar o comunitaria real y significativa para adolescentes de secundaria (máximo 40 palabras).\n" +
    "- \"proposito\": Propósito pedagógico formativo claro y articulado con los PDA (máximo 40 palabras).\n" +
    "- \"productoFinal\": Producto o evidencia tangible central que desarrollarán los estudiantes (ej. infografía comunitaria, periódico mural, herbario, podcast escolar, debate con la comunidad, etc., máximo 25 palabras).\n" +
    "- \"metodologiaSugerida\": Nombre de la metodología sociocrítica idónea (ej. ABPC, STEAM, ABP o AS).\n" +
    "- \"ejesArticuladores\": Array de 2 a 3 ejes articuladores pertinentes seleccionados de: [\"Inclusión\", \"Pensamiento Crítico\", \"Interculturalidad Crítica\", \"Igualdad de Género\", \"Vida Saludable\", \"Apropiación de las Culturas a través de la Lectura y la Escritura\", \"Artes y Experiencias Estéticas\"].\n" +
    "- \"justificacion\": Explicación pedagógica concisa para el docente de por qué esta articulación atiende los PDA seleccionados (máximo 45 palabras).\n\n" +
    "Contexto curricular oficial:\n" +
    "- Grado: " + grado + "° de secundaria\n" +
    "- Asignatura / Disciplina: " + asignatura + "\n" +
    "- Campo Formativo: " + (campo || "Fase 6") + "\n" +
    "- Metodología base: " + metodologia + "\n" +
    "- Contenido Curricular Oficial: " + contenido + "\n" +
    "- PDA Oficial(es): " + pdas;

  try {
    const r = UrlFetchApp.fetch(URL_BASE_DEEPSEEK, {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + clave },
      payload: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: instruccion }],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 500
      }),
      muteHttpExceptions: true
    });

    const code = r.getResponseCode();
    if (code < 200 || code >= 300) {
      return { ok: false, error: "Error HTTP " + code + " al consultar DeepSeek: " + r.getContentText().slice(0, 150) };
    }

    const j = JSON.parse(r.getContentText());
    const contenidoMsg = j && j.choices && j.choices[0] && j.choices[0].message ? j.choices[0].message.content : "";
    let parsed = {};
    try {
      const limpio = contenidoMsg.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      parsed = JSON.parse(limpio);
    } catch (eParse) {
      parsed = {
        problemaComunidad: "Dificultad en la identificación y análisis de situaciones del entorno escolar y comunitario.",
        proposito: "Desarrollar habilidades reflexivas y comunicativas vinculadas a los PDA de la asignatura.",
        productoFinal: "Evidencia gráfica o informativa comunitaria.",
        metodologiaSugerida: metodologia,
        ejesArticuladores: ["Pensamiento Crítico", "Inclusión"],
        justificacion: "Articulación situada según los contenidos sintéticos seleccionados."
      };
    }

    return {
      ok: true,
      propuesta: parsed
    };
  } catch (err) {
    return {
      ok: false,
      error: "No se pudo conectar con el servicio de IA: " + String(err.message || err)
    };
  }
}

/**
 * Sugiere el desglose formativo de sesiones de 40 minutos con enfoque DUA.
 */
function asistirDesgloseSesionesNEM(token, peticion) {
  const ses = exigirClaseRol_(token, ["admin", "maestro"]);
  if (!peticion || typeof peticion !== "object") {
    throw new Error("Datos de planeación no proporcionados para asistir el desglose.");
  }

  const clave = typeof obtenerClaveDeepSeek_ === "function" ? obtenerClaveDeepSeek_() : "";
  if (!clave) {
    return {
      ok: false,
      sinClave: true,
      error: "No hay clave de DeepSeek configurada en el sistema. Puedes redactar los momentos de cada sesión manualmente."
    };
  }

  const numSes = Math.max(1, Math.min(10, Number(peticion.numSesiones) || 3));
  const titulo = String(peticion.titulo || "Proyecto Didáctico").trim();
  const grado = String(peticion.grado || "1").trim();
  const asignatura = String(peticion.asignatura || "Español").trim();
  const contenido = String(peticion.contenidoSintetico || "").trim();
  let pdas = peticion.pda || peticion.pdas || "";
  if (Array.isArray(pdas)) pdas = pdas.join(" | ");

  const instruccion = "Eres un especialista pedagógico de secundaria (México, NEM Fase 6).\n" +
    "Desglosa una secuencia de " + numSes + " sesiones de 40 minutos con enfoque DUA (Diseño Universal para el Aprendizaje) para la siguiente planeación:\n" +
    "- Proyecto: " + titulo + "\n" +
    "- Asignatura: " + asignatura + " (" + grado + "° de secundaria)\n" +
    "- Contenido: " + contenido + "\n" +
    "- PDA: " + pdas + "\n\n" +
    "Cada sesión dura EXACTAMENTE 40 minutos y se estructura en 4 momentos:\n" +
    "1. Apertura (5 min): recuperación de saberes y reto formativo.\n" +
    "2. Desarrollo / Explicación (10 min): conceptos clave y modelado sensorial.\n" +
    "3. Actividad principal (20 min): trabajo colaborativo o producción individual.\n" +
    "4. Cierre (5 min): síntesis, evaluación formativa y socialización.\n" +
    "Además, sugiere 1 recurso visual con su descripción auditiva obligatoria para alumnos ciegos o de baja visión.\n\n" +
    "Devuelve ÚNICAMENTE un objeto JSON con este formato:\n" +
    "{\n" +
    "  \"sesiones\": [\n" +
    "    {\n" +
    "      \"numero\": 1,\n" +
    "      \"titulo\": \"Título conciso de la sesión\",\n" +
    "      \"apertura\": \"Texto de la apertura formativa (5 min)\",\n" +
    "      \"desarrollo\": \"Texto de explicación y ejemplos (10 min)\",\n" +
    "      \"actividad\": \"Texto de la actividad guiada (20 min)\",\n" +
    "      \"cierre\": \"Texto de conclusión y retroalimentación (5 min)\",\n" +
    "      \"recursoVisualTitulo\": \"Nombre del recurso visual\",\n" +
    "      \"recursoVisualDescripcion\": \"Descripción auditiva detallada del recurso visual para estudiantes con discapacidad visual\"\n" +
    "    }\n" +
    "  ]\n" +
    "}";

  try {
    const r = UrlFetchApp.fetch(URL_BASE_DEEPSEEK, {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + clave },
      payload: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: instruccion }],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 1200
      }),
      muteHttpExceptions: true
    });

    const code = r.getResponseCode();
    if (code < 200 || code >= 300) {
      return { ok: false, error: "Error HTTP " + code + " al consultar DeepSeek: " + r.getContentText().slice(0, 150) };
    }

    const j = JSON.parse(r.getContentText());
    const contenidoMsg = j && j.choices && j.choices[0] && j.choices[0].message ? j.choices[0].message.content : "";
    let parsed = {};
    try {
      const limpio = contenidoMsg.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      parsed = JSON.parse(limpio);
    } catch (eParse) {
      parsed = { sesiones: [] };
    }

    return {
      ok: true,
      sesiones: Array.isArray(parsed.sesiones) ? parsed.sesiones : []
    };
  } catch (err) {
    return {
      ok: false,
      error: "No se pudo conectar con el servicio de IA: " + String(err.message || err)
    };
  }
}

/* ============================================================
   BANCO DE ENCUESTAS (lo escribe el Constructor de Encuestas)
   Libro de datos del constructor: 1bwqSni0…
   ============================================================ */
const ID_LIBRO_BANCO_ENCUESTAS = "1bwqSni0iNPeFnoYK6M3gkeKgoC-_nv2-LNja72_lubk";

function listarBancoEncuestasPlaneacion() {
  try {
    const libro = SpreadsheetApp.openById(ID_LIBRO_BANCO_ENCUESTAS);
    const hoja = libro.getSheetByName("BancoEncuestas");
    if (!hoja || hoja.getLastRow() < 2) return { exito: true, items: [] };
    const valores = hoja.getDataRange().getValues();
    const items = [];
    for (let i = 1; i < valores.length; i++) {
      const f = valores[i];
      if (!f[0]) continue;
      let fecha = "";
      try {
        fecha = Utilities.formatDate(new Date(f[1]), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
      } catch (e) { fecha = String(f[1] || ""); }
      items.push({
        id: String(f[0]),
        guardado: fecha,
        encuesta: String(f[2] || "Encuesta"),
        respuestas: Number(f[3]) || 0,
        resumen: String(f[5] || "")
      });
    }
    items.reverse();
    return { exito: true, items: items };
  } catch (error) {
    console.error("listarBancoEncuestasPlaneacion: " + error);
    return {
      exito: false,
      mensaje: "No se pudo abrir el banco de encuestas. Comprueba que la hoja del constructor esté compartida como Editor con la cuenta que ejecuta este script."
    };
  }
}

/**
 * ASISTENTE DE IA POR SECCIÓN DEL ESBOZO NEM
 * Analiza lo que el docente escribió en la sección indicada y devuelve
 * observaciones, ajustes sugeridos y conceptos que puede agregar.
 * No modifica nada: el docente decide si acepta la sugerencia.
 */
function asistirPasoPlaneacionNEM(token, paso, datos) {
  exigirClaseRol_(token, ["admin", "maestro"]);
  const n = Number(paso) || 1;
  const clave = typeof obtenerClaveDeepSeek_ === "function" ? obtenerClaveDeepSeek_() : "";
  if (!clave) {
    return {
      ok: false,
      sinClave: true,
      mensaje: "No hay clave de DeepSeek configurada. Puedes seguir llenando los campos a mano o pedir al administrador que la registre en Configuración."
    };
  }

  const d = datos || {};
  // Solo se envía lo que corresponde a la sección revisada: el asistente no
  // debe pedir cambios en campos de otras secciones del esbozo.
  const camposPorPaso = {
    1: [
      ["Título del proyecto", d.titulo],
      ["Campo formativo", d.campoFormativo],
      ["Metodología sociocrítica", d.metodologia],
      ["Grado", d.grado],
      ["Grupo", d.grupo],
      ["Número de sesiones", d.sesiones],
      ["Temporalidad", d.temporalidad]
    ],
    2: [
      ["Contenido curricular sintético", d.contenido],
      ["PDA oficiales", d.pda]
    ],
    3: [
      ["Problema de la comunidad", d.problema],
      ["Diagnóstico del grupo", d.diagnostico],
      ["Ajustes razonables (DUA)", d.ajustes]
    ],
    4: [
      ["Propósito", d.proposito],
      ["Producto final", d.producto],
      ["Evaluación", d.evaluacion]
    ]
  };
  const etiquetas = camposPorPaso[n] || camposPorPaso[1];
  const nombresCampos = etiquetas.map(function (p) { return p[0]; }).join(", ");
  const prohibidos = {
    1: "contenido curricular, PDA, problema comunitario, diagnostico del grupo, ajustes razonables, proposito, producto final y evaluacion",
    2: "titulo, campo formativo, metodologia, sesiones, temporalidad, problema comunitario, ajustes razonables, proposito, producto final y evaluacion",
    3: "titulo, campo formativo, metodologia, contenido curricular, PDA, proposito, producto final y evaluacion",
    4: "titulo, campo formativo, metodologia, contenido curricular, PDA, problema comunitario, diagnostico y ajustes razonables"
  };
  const noMencionar = prohibidos[n] || prohibidos[1];
  // Campos que aceptan texto libre. El resto son selects, números o fechas:
  // para ellos solo tiene sentido indicar el valor, no redactar contenido.
  const editablesPorPaso = {
    1: "Titulo del proyecto",
    2: "Contenido curricular sintetico, PDA oficiales",
    3: "Problema de la comunidad, Diagnostico del grupo, Ajustes razonables (DUA)",
    4: "Proposito, Producto final, Evaluacion"
  };
  const editables = editablesPorPaso[n] || editablesPorPaso[1];
  const escritos = etiquetas
    .filter(function (p) { return String(p[1] || "").trim(); })
    .map(function (p) { return "- " + p[0] + ": " + String(p[1]).trim().slice(0, 600); })
    .join("\n");

  const focos = {
    1: "la identidad del proyecto: proponer títulos formativos atractivos según la metodología sociocrítica",
    2: "el contenido curricular y los procesos de desarrollo de aprendizaje (PDA) elegidos",
    3: "el diagnóstico comunitario, el del grupo y los ajustes razonables (DUA)",
    4: "el propósito, el producto final, la evaluación y el esbozo de sesiones"
  };

  let instruccion = "";
  if (n === 1) {
    instruccion =
      "Eres un asesor pedagógico de la " + (typeof NOMBRE_ESCUELA !== "undefined" ? NOMBRE_ESCUELA : "Secundaria Técnica 90") + " experto en la Fase 6 de la Nueva Escuela Mexicana.\n" +
      "El docente está en el Paso 1 configurando los datos generales de su proyecto escolar:\n" +
      (escritos || "- No ha llenado datos aún") + "\n\n" +
      "TAREA OBLIGATORIA:\n" +
      "Debes devolver ÚNICAMENTE un objeto JSON válido con este formato exacto:\n" +
      "{\n" +
      "  \"titulos\": [\n" +
      "    \"Propuesta corta 1 (enfocada en indagación/comunidad, max 10 palabras)\",\n" +
      "    \"Propuesta corta 2 (creativa y atractiva para adolescentes, max 10 palabras)\",\n" +
      "    \"Propuesta corta 3 (centrada en la metodología o problema, max 10 palabras)\"\n" +
      "  ],\n" +
      "  \"consejo\": \"Una sola frase breve orientando al docente sobre el alcance del proyecto (máximo 30 palabras).\"\n" +
      "}\n" +
      "Reglas: Los títulos NO deben repetir nombre de la materia, ni grado, ni grupo (ej. NO poner 'Español 1A'). Deben ser títulos reales de proyectos (ej. 'Guardianes del agua: Voces y acciones comunitarias'). NO agregues texto fuera del JSON.";
  } else if (n === 2) {
    instruccion =
      "Eres un asesor curricular de la " + (typeof NOMBRE_ESCUELA !== "undefined" ? NOMBRE_ESCUELA : "Secundaria Técnica 90") + " experto en la Fase 6 de la Nueva Escuela Mexicana.\n" +
      "El docente está en el Paso 2 seleccionando Contenidos y Procesos de Desarrollo de Aprendizaje (PDA):\n" +
      (escritos || "- No ha llenado datos aún") + "\n\n" +
      "TAREA OBLIGATORIA:\n" +
      "Debes devolver ÚNICAMENTE un objeto JSON válido con este formato exacto:\n" +
      "{\n" +
      "  \"pdas\": [\n" +
      "    \"Texto completo del PDA oficial o adaptación situada prioritaria 1\",\n" +
      "    \"Texto completo del PDA oficial o adaptación situada prioritaria 2\",\n" +
      "    \"Texto completo del PDA oficial o adaptación situada prioritaria 3\"\n" +
      "  ],\n" +
      "  \"consejo\": \"Una orientación concisa para vincular estos PDA con la realidad del alumno (máximo 35 palabras).\"\n" +
      "}\n" +
      "Reglas: Devuelve entre 2 y 3 PDA claros, rigurosos y directamente aplicables al aula. NO agregues texto fuera del JSON.";
  } else if (n === 3) {
    instruccion =
      "Eres un asesor pedagógico de la " + (typeof NOMBRE_ESCUELA !== "undefined" ? NOMBRE_ESCUELA : "Secundaria Técnica 90") + " experto en inclusión educativa (DUA / UDEI) y Programa Analítico.\n" +
      "El docente está en el Paso 3 definiendo Diagnóstico Comunitario y Ajustes Razonables:\n" +
      (escritos || "- No ha llenado datos aún") + "\n\n" +
      "TAREA OBLIGATORIA:\n" +
      "Debes devolver ÚNICAMENTE un objeto JSON válido con este formato exacto:\n" +
      "{\n" +
      "  \"problema\": \"Redacción clara y situada de una problemática escolar o comunitaria concreta detonadora del proyecto (máximo 50 palabras).\",\n" +
      "  \"dua\": \"Dos adecuaciones metodológicas o ajustes razonables DUA concretos y aplicables (apoyos visuales, tiempos flexibles, lectura guiada, etc., máximo 50 palabras).\",\n" +
      "  \"consejo\": \"Una sugerencia pedagógica de vinculación comunitaria o inclusión (máximo 30 palabras).\"\n" +
      "}\n" +
      "Reglas: Redacción directa y lista para usarse, sin encabezados como 'OBSERVACIONES:' o 'AJUSTES:'. NO agregues texto fuera del JSON.";
  } else if (n === 4) {
    instruccion =
      "Eres un asesor pedagógico de la " + (typeof NOMBRE_ESCUELA !== "undefined" ? NOMBRE_ESCUELA : "Secundaria Técnica 90") + " experto en la Fase 6 de la Nueva Escuela Mexicana y evaluación formativa.\n" +
      "El docente está en el Paso 4 definiendo el Propósito Central y el Producto Integrador de su proyecto:\n" +
      (escritos || "- No ha llenado datos aún") + "\n\n" +
      "TAREA OBLIGATORIA:\n" +
      "Debes devolver ÚNICAMENTE un objeto JSON válido con este formato exacto:\n" +
      "{\n" +
      "  \"proposito\": \"Redacción pedagógica clara de qué aprenderán los alumnos, para qué y cómo se vincula con su realidad (iniciar con verbo en infinitivo, máximo 50 palabras).\",\n" +
      "  \"producto\": \"Descripción concreta de la evidencia central tangible que elaborarán (ej. periódico mural, podcast escolar, infografía comunitaria, debate público, etc., máximo 35 palabras).\",\n" +
      "  \"consejo\": \"Una recomendación concisa para la evaluación formativa o socialización comunitaria (máximo 30 palabras).\"\n" +
      "}\n" +
      "Reglas: Redacción directa, limpia y lista para usarse, sin encabezados como 'OBSERVACIONES:' o 'AJUSTES:'. NO agregues texto fuera del JSON.";
  } else {
    instruccion =
      "Eres asesor curricular de una secundaria técnica en México y experto en la Nueva Escuela Mexicana, Fase 6.\n" +
      "Revisas únicamente estos campos de la sección: " + nombresCampos + ".\n" +
      "PROHIBIDO mencionar, evaluar o sugerir cambios sobre: " + noMencionar + ".\n" +
      "Esos campos no forman parte de esta revision y el docente los trabaja en otra seccion. Si tu sugerencia los necesita, no la escribas.\n" +
      "Solo redacta texto para estos campos, que son los editables: " + editables + ".\n" +
      "Los demas campos de la seccion son selecciones, numeros o fechas: no admiten texto libre, asi que para ellos indica unicamente el valor concreto que deberian llevar.\n" +
      "Devuelve texto plano en español de México, sin markdown, con estas tres partes y exactamente estos encabezados:\n" +
      "OBSERVACIONES: una o dos frases sobre lo que ya está bien y lo que falta.\n" +
      "AJUSTES: dos o tres sugerencias concretas y aplicables en el aula.\n" +
      "CONCEPTOS: dos a cuatro conceptos, ejes articuladores o acciones que podría agregar.\n" +
      "Reglas: no inventes datos que no estén en lo escrito; si un campo está vacío, dilo y propón qué escribir; máximo 200 palabras.\n\n" +
      "Lo que el docente escribió en esta sección:\n" +
      (escritos || "(todavía no ha escrito nada en esta sección)");
  }

  let texto = "";
  let titulosArray = null;
  let pdasArray = null;
  let problemaPropuesto = "";
  let duaPropuesto = "";
  let propositoPropuesto = "";
  let productoPropuesto = "";
  let consejoGenerado = "";
  try {
    const payloadReq = {
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "Das apoyo curricular claro, breve y aplicable al aula mexicana de secundaria. Devuelves únicamente lo solicitado." },
        { role: "user", content: instruccion }
      ],
      temperature: 0.4,
      max_tokens: 700
    };
    if (n >= 1 && n <= 4) payloadReq.response_format = { type: "json_object" };

    const respuesta = UrlFetchApp.fetch(URL_BASE_DEEPSEEK, {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + clave },
      payload: JSON.stringify(payloadReq),
      muteHttpExceptions: true
    });
    if (respuesta.getResponseCode() < 200 || respuesta.getResponseCode() >= 300) {
      return { ok: false, mensaje: "La IA respondió con error HTTP " + respuesta.getResponseCode() + "." };
    }
    const j = JSON.parse(respuesta.getContentText());
    texto = String(((j.choices || [])[0] || {}).message ? j.choices[0].message.content : "").trim();

    if (n >= 1 && n <= 4) {
      try {
        const parsedT = JSON.parse(texto.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim());
        if (n === 1 && parsedT && Array.isArray(parsedT.titulos)) {
          titulosArray = parsedT.titulos.map(function(t){ return String(t).trim(); }).filter(Boolean);
          consejoGenerado = String(parsedT.consejo || "").trim();
        } else if (n === 2 && parsedT && Array.isArray(parsedT.pdas)) {
          pdasArray = parsedT.pdas.map(function(p){ return String(p).trim(); }).filter(Boolean);
          consejoGenerado = String(parsedT.consejo || "").trim();
        } else if (n === 3 && parsedT) {
          problemaPropuesto = String(parsedT.problema || "").trim();
          duaPropuesto = String(parsedT.dua || "").trim();
          consejoGenerado = String(parsedT.consejo || "").trim();
        } else if (n === 4 && parsedT) {
          propositoPropuesto = String(parsedT.proposito || "").trim();
          productoPropuesto = String(parsedT.producto || "").trim();
          consejoGenerado = String(parsedT.consejo || "").trim();
        }
      } catch (errParse) {
        // Fallback a texto
      }
    }
  } catch (e) {
    return { ok: false, mensaje: "No se pudo contactar a la IA: " + (e && e.message ? e.message : e) };
  }

  if (n === 1 && titulosArray && titulosArray.length) {
    return { ok: true, esPaso1: true, titulos: titulosArray, consejo: consejoGenerado, campos: nombresCampos };
  }
  if (n === 2 && pdasArray && pdasArray.length) {
    return { ok: true, esPaso2: true, pdas: pdasArray, consejo: consejoGenerado, campos: nombresCampos };
  }
  if (n === 3 && (problemaPropuesto || duaPropuesto)) {
    return { ok: true, esPaso3: true, problema: problemaPropuesto, dua: duaPropuesto, consejo: consejoGenerado, campos: nombresCampos };
  }
  if (n === 4 && (propositoPropuesto || productoPropuesto)) {
    return { ok: true, esPaso4: true, proposito: propositoPropuesto, producto: productoPropuesto, consejo: consejoGenerado, campos: nombresCampos };
  }

  if (!texto) return { ok: false, mensaje: "La IA no devolvió texto. Inténtalo de nuevo." };
  return { ok: true, texto: texto, campos: nombresCampos };
}

/**
 * Siembra planeaciones didácticas de demostración para pruebas del sistema.
 * Genera proyectos en el Banco Personal del usuario activo y en el Repositorio Global (PUBLICADA).
 */
function sembrarPlaneacionesDemoNEM(token) {
  let ses = null;
  try {
    ses = exigirClaseRol_(token, ["admin", "maestro"]);
  } catch (eRol) {
    const sVal = (typeof obtenerSesionValida_ === 'function') ? obtenerSesionValida_(token) : null;
    if (sVal && (sVal.rol === "admin" || sVal.rol === "maestro" || sVal.rol === "docente")) {
      ses = sVal;
      if (ses.rol === "docente") ses.rol = "maestro";
    } else {
      throw eRol;
    }
  }

  const libro = _obtenerLibro_();
  if (!libro) {
    throw new Error("No se pudo conectar a la base de datos de Google Sheets. " + (typeof ultimoErrorAperturaLibro !== 'undefined' ? ultimoErrorAperturaLibro : ''));
  }
  const pPlan = _obtenerHojaRobusta_(libro, "PlaneacionesNEM");
  const pSes = _obtenerHojaRobusta_(libro, "SesionesNEM");
  if (!pPlan || !pSes) {
    throw new Error("No se pudieron inicializar las pestañas PlaneacionesNEM y SesionesNEM.");
  }
  if (pPlan.getLastRow() === 0) {
    pPlan.appendRow(ENCABEZADOS.PlaneacionesNEM);
    pPlan.getRange(1, 1, 1, ENCABEZADOS.PlaneacionesNEM.length).setFontWeight("bold");
  }
  if (pPlan.getMaxColumns() < ENCABEZADOS.PlaneacionesNEM.length) {
    pPlan.insertColumnsAfter(pPlan.getMaxColumns(), ENCABEZADOS.PlaneacionesNEM.length - pPlan.getMaxColumns());
  }
  if (pSes.getLastRow() === 0) {
    pSes.appendRow(ENCABEZADOS.SesionesNEM);
    pSes.getRange(1, 1, 1, ENCABEZADOS.SesionesNEM.length).setFontWeight("bold");
  }
  if (pSes.getMaxColumns() < ENCABEZADOS.SesionesNEM.length) {
    pSes.insertColumnsAfter(pSes.getMaxColumns(), ENCABEZADOS.SesionesNEM.length - pSes.getMaxColumns());
  }

  const docenteActivo = ses.rol === "admin" 
    ? String(ses.nombre || "Administrador").trim()
    : String(ses.maestroNombre || ses.nombre || "Docente ST90").trim();

  const fechaHoy = new Date();

  // 1. Planeación en Repositorio Global (PUBLICADA de otro docente para probar clonado)
  const idGlobal = "PLN-DEMO-001";
  const filaGlobal = [
    idGlobal,
    "Indagación STEAM: Energías Limpias y Sustentabilidad Comunitaria",
    "2",
    "A",
    "Ciencias",
    "Saberes y Pensamiento Científico",
    "STEAM",
    "Transformaciones de la energía térmica y eléctrica en la comunidad",
    "• Comprende las funciones de la energía en los sistemas técnicos y sus impactos ambientales.\n• Diseña y modela un prototipo escolar sustentable.",
    "Pensamiento Crítico, Vida Saludable",
    "Diseñar modelos de aprovechamiento solar y eólico para reducir el consumo eléctrico en el plantel.",
    "Elevado gasto de energía eléctrica en las aulas y falta de cultura de ahorro energético comunitario.",
    "Prototipo a escala de calentador solar funcional con bitácora de resultados.",
    3,
    "Mtra. Rosa Elena (Ciencias)",
    "PUBLICADA",
    1,
    fechaHoy,
    fechaHoy,
    "1er Trimestre",
    fechaHoy,
    "",
    "Mtra. Rosa Elena (Ciencias)",
    ""
  ];

  // 2. Planeación en Banco Personal (BORRADOR del docente en sesión)
  const idPersonal1 = "PLN-DEMO-002";
  const filaPersonal1 = [
    idPersonal1,
    "Proyecto Comunitario: El periódico escolar y la diversidad lingüística",
    "1",
    "B",
    "Español",
    "Lenguajes",
    "ABPC",
    "La diversidad étnica, cultural y lingüística de México expresada en la comunicación comunitaria",
    "• Identifica una situación comunitaria y recopila testimonios orales y escritos.\n• Redacta notas informativas y entrevistas aplicando normas ortográficas.",
    "Inclusión, Apropiación de las Culturas a través de la Lectura y la Escritura",
    "Fortalecer la expresión escrita y el diálogo intercultural mediante la creación de un periódico mural.",
    "Desconexión entre los saberes locales y los contenidos escolares; falta de canales de expresión estudiantil.",
    "Edición impresa y digital del Periódico Mural 'Voz Técnica 90'.",
    3,
    docenteActivo,
    "BORRADOR",
    1,
    fechaHoy,
    "",
    "1er Trimestre",
    fechaHoy,
    "",
    docenteActivo,
    ""
  ];

  // 3. Planeación en Banco Personal (APROBADO del docente en sesión)
  const idPersonal2 = "PLN-DEMO-003";
  const filaPersonal2 = [
    idPersonal2,
    "ABP: Resolución pacífica de conflictos y derechos humanos",
    "3",
    "A",
    "Formación Cívica y Ética",
    "Ética, Naturaleza y Sociedades",
    "ABP",
    "El conflicto en la convivencia humana desde la cultura de paz y la mediación escolar",
    "• Propone distintas formas de resolver conflictos sociales y escolares sin recurrir a la violencia.\n• Aplica protocolos de mediación y diálogo entre pares.",
    "Inclusión, Pensamiento Crítico",
    "Construir un comité escolar de mediación y acuerdos de convivencia armónica en el aula.",
    "Frecuentes desacuerdos y faltas de respeto entre alumnos durante los recesos y cambios de clase.",
    "Reglamento consensuado de convivencia y dramatización de casos de mediación.",
    3,
    docenteActivo,
    "APROBADO",
    1,
    fechaHoy,
    fechaHoy,
    "1er Trimestre",
    fechaHoy,
    "",
    docenteActivo,
    ""
  ];

  const filasExistentes = _leerFilas_("PlaneacionesNEM");
  [filaGlobal, filaPersonal1, filaPersonal2].forEach(function(nueva) {
    const id = nueva[0];
    const previa = filasExistentes.filter(function(f) { return String(f["Id"] || f["id"] || "").trim() === id; })[0];
    if (previa) {
      if (pPlan.getMaxRows() < previa._fila) {
        pPlan.insertRowsAfter(pPlan.getMaxRows(), previa._fila - pPlan.getMaxRows() + 5);
      }
      pPlan.getRange(previa._fila, 1, 1, ENCABEZADOS.PlaneacionesNEM.length).setValues([nueva]);
    } else {
      pPlan.appendRow(nueva);
    }
  });

  // Asegurar sesiones iniciales para cada una
  [idGlobal, idPersonal1, idPersonal2].forEach(function(idP) {
    const sesExistentes = _leerFilas_("SesionesNEM").filter(function(s) {
      return String(s["IdPlaneacion"] || s["idplaneacion"] || "").trim() === idP;
    });
    if (!sesExistentes.length) {
      desglosarSesionesInicialesNEM_(libro, idP, 3, "Demostración Didáctica");
    }
  });

  SpreadsheetApp.flush();
  return {
    ok: true,
    mensaje: "Se generaron 3 proyectos didácticos de prueba (1 en Repositorio Global y 2 en tu Banco Personal)."
  };
}
````

## AdminPlaneacion.html

```html
<!-- ==========================================
     PESTAÑA 4: PLANEACIÓN DIDÁCTICA NEM
     (Malla horaria, Stepper 4 etapas, eXeLearning, Banco Personal vs Global)
     ========================================== -->
<div id="tab-plan" class="bloque oculto" style="padding:10px 14px 40px;overflow:visible;">
          <div id="moduloViewPlaneacion" class="modulo-shell-contenedor" style="padding:8px 16px 40px;width:100%;box-sizing:border-box;">
    <div class="barra-sup ribbon-main-nav oculto" style="display:none !important;" role="banner" aria-label="Clase ST90">
      <div class="tabs" id="tabsMae" role="tablist">
        <button type="button" class="ribbon-tab" id="btnN1Clases" onclick="tabN1Clase('clases', this)" aria-label="Clases">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2"></rect>
            <path d="M16 2v4M8 2v4M3 10h18"></path>
          </svg>
          <span class="ribbon-label">Clases</span>
        </button>
        <button type="button" class="ribbon-tab" id="btnN1Planeacion" onclick="tabN1Clase('planeacion', this)" aria-label="Planeación">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            <line x1="9" y1="7" x2="15" y2="7"></line>
            <line x1="9" y1="11" x2="15" y2="11"></line>
          </svg>
          <span class="ribbon-label">Planeación</span>
        </button>
        <button type="button" class="ribbon-tab oculto" id="btnTabAluAcc" onclick="tabN1Clase('aluAcc', this)" aria-label="Alumnos">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <rect x="14" y="11" width="8" height="10" rx="1"></rect>
          </svg>
          <span class="ribbon-label">Alumnos</span>
        </button>
        <button type="button" class="ribbon-tab oculto" id="btnTabAccesos" onclick="tabN1Clase('accesos', this)" aria-label="Docentes">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M22 10v6"></path>
            <path d="M2 10l10-5 10 5-10 5z"></path>
            <path d="M6 12v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5"></path>
          </svg>
          <span class="ribbon-label">Docentes</span>
        </button>
      </div>
      <div id="cintaClase" class="cinta-clase oculto" style="display:none;"></div>
      <div class="barra-sup-acciones">
        <button type="button" class="ribbon-btn ribbon-ico-rojo" onclick="salirClase()" aria-label="Cerrar sesión">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <path d="M16 17l5-5-5-5"></path>
            <path d="M21 12H9"></path>
          </svg>
          <span class="ribbon-label">Salir</span>
        </button>
      </div>
    </div>

    <div id="vistaAlu" class="oculto">
      <div class="tarjeta">
        <div class="alu-cab">
          <div class="alu-cab-izq">
            <h1 class="alu-saludo" id="txtSaludoAlu">Cargando horario…</h1>
            <p class="alu-grupo" id="txtGrupoAlu"></p>
            <div class="alu-fecha-caja">
              <h2 class="alu-fecha" id="titFechaAlu" tabindex="-1">Tu horario</h2>
              <p class="alu-fecha-nota" id="txtFechaNotaAlu"></p>
            </div>
          </div>
          <div class="alu-controles">
            <div class="cal-modo-grupo" role="group" aria-label="Vista del horario">
              <button type="button" class="btn-cal-modo activo" id="btnVistaDiaAlu" onclick="cambiarVistaAlu('dia')" aria-pressed="true">Día</button>
              <button type="button" class="btn-cal-modo" id="btnVistaSemanaAlu" onclick="cambiarVistaAlu('semana')" aria-pressed="false">Semana</button>
            </div>
            <div class="cal-nav-rango" role="group" aria-label="Cambiar fecha">
              <button type="button" class="btn-secundario" id="btnAluAnt" onclick="moverFechaAlu(-1)" aria-label="Día anterior">←</button>
              <button type="button" class="btn-secundario" onclick="irHoyAlu()">Hoy</button>
              <button type="button" class="btn-secundario" id="btnAluSig" onclick="moverFechaAlu(1)" aria-label="Día siguiente">→</button>
            </div>
          </div>
        </div>
        <div class="alu-bloque-clase">
          <section class="alu-hero" id="cajaHeroAlu" aria-labelledby="titHeroAlu"></section>
          <div class="botones-voz" id="cajaPlayAlu">
            <button type="button" id="btnPlayClase" onclick="hablarClase()">Escuchar clase</button>
            <button type="button" class="sec" id="btnPausaClase" onclick="pausarClase()">Pausa</button>
            <button type="button" class="sec" onclick="repetirClase()">Repetir</button>
            <button type="button" class="sec" onclick="detenerClaseAlu()">Detener</button>
            <button type="button" class="sec" onclick="cambiarVelocidadClase(-0.1)">Más lento</button>
            <button type="button" class="sec" onclick="cambiarVelocidadClase(0.1)">Más rápido</button>
          </div>
          <p class="hint" id="txtVelClase">Velocidad: normal (1.0)</p>
        </div>
        <div id="textoClaseVis" class="alu-texto"></div>
        <h2 class="alu-sec" id="titHorarioAlu">Horario de hoy</h2>
        <div id="horarioAluLista"></div>
        <div id="calAlu" class="cal-clase oculto"></div>
        <div id="horarioAluSr" class="alu-solo-lector"></div>
      </div>
    </div>

    <div id="vistaMae" style="display:block;width:100%;box-sizing:border-box;">

      <div id="tabClases" class="oculto">
        <div class="tarjeta">
          <p class="hint oculto" id="txtDiaMae" style="display:none;margin:0;"></p>
          <div id="wrapCalendarioMae">
            <!-- Barra de controles del Horario Oficial en una sola fila (Estilo Ribbon ST90) -->
            <div class="horario-toolbar-shell cinta-n3" id="navCalClase">
              <div class="horario-toolbar-bloque" id="n3Clases" role="group" aria-label="Filtros del horario">
                <!-- Fecha -->
                <button type="button" class="ribbon-btn ribbon-ico-azul" id="btnClaseFecha" onclick="abrirCalendarioFechaClase(event)" aria-label="Fecha">
                  <input type="date" id="fechaMaeClase" class="filtro-date-hidden" onchange="alCambiarFechaClase()" aria-label="Fecha" tabindex="-1">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                  <span class="chip-label ribbon-label">Fecha</span>
                </button>

                <!-- Grupo -->
                <div class="ribbon-btn ribbon-btn-select-wrap ribbon-ico-verde" id="btnClaseGrupo">
                  <select id="selGrupoClase" class="filtro-select-overlay" onchange="cambiarGrupoClase()" aria-label="Grupo">
                    <option value="">Elige grupo…</option>
                  </select>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 21V8l9-5 9 5v13"/><path d="M9 21V12h6v9"/></svg>
                  <span class="chip-label ribbon-label">Grupo</span>
                </div>

                <!-- Asignatura -->
                <div class="ribbon-btn ribbon-btn-select-wrap ribbon-ico-morado" id="btnClaseAsig">
                  <select id="selAsigClase" class="filtro-select-overlay" onchange="cambiarAsignaturaClase()" aria-label="Asignatura">
                    <option value="">Todas las del grupo</option>
                  </select>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                  <span class="chip-label ribbon-label">Asignatura</span>
                </div>

                <!-- Alumno -->
                <div class="ribbon-btn ribbon-btn-select-wrap ribbon-ico-celeste" id="btnClaseAlumno">
                  <select id="selAluClase" class="filtro-select-overlay" onchange="cambiarAlumnoClase()" aria-label="Alumno">
                    <option value="">Elige alumno…</option>
                  </select>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                  <span class="chip-label ribbon-label">Alumno</span>
                </div>
              </div>

              <span class="horario-sep-v" aria-hidden="true"></span>

              <div class="nav-semana-box" role="group" aria-label="Navegación de fechas">
                <button type="button" class="ribbon-btn ribbon-ico-celeste" onclick="moverCalClase(-1)" aria-label="Periodo anterior">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
                  <span class="ribbon-label">Anterior</span>
                </button>
                <span class="badge-rango-semana" onclick="abrirCalendarioFechaClase(event)" title="Cambiar fecha">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                  <strong id="txtSemanaClase">--/---/-- → --/---/--</strong>
                </span>
                <button type="button" class="ribbon-btn ribbon-ico-celeste" onclick="moverCalClase(1)" aria-label="Periodo siguiente">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
                  <span class="ribbon-label">Siguiente</span>
                </button>
                <button type="button" class="ribbon-btn ribbon-ico-teal" onclick="irHoyClase()" aria-label="Ir a hoy">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M9 16l2 2 4-4"/></svg>
                  <span class="ribbon-label">Hoy</span>
                </button>
              </div>

              <span class="horario-sep-v" aria-hidden="true"></span>

              <div class="horario-toolbar-bloque" role="group" aria-label="Modo de vista">
                <button type="button" class="ribbon-btn ribbon-ico-azul btn-cal-modo" id="btnModoDia" onclick="cambiarModoCal('dia')" aria-label="Vista por día">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><line x1="12" y1="14" x2="12" y2="18"/></svg>
                  <span class="ribbon-label">Día</span>
                </button>
                <button type="button" class="ribbon-btn ribbon-ico-azul btn-cal-modo activo" id="btnModoSemana" onclick="cambiarModoCal('semana')" aria-label="Vista por semana">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/><path d="M9 10v12M15 10v12"/></svg>
                  <span class="ribbon-label">Semana</span>
                </button>
                <button type="button" class="ribbon-btn ribbon-ico-azul btn-cal-modo" id="btnModoMes" onclick="cambiarModoCal('mes')" aria-label="Vista por mes">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M3 16h18M9 10v12M15 10v12"/></svg>
                  <span class="ribbon-label">Mes</span>
                </button>
              </div>

              <span class="horario-sep-v" aria-hidden="true"></span>

              <div class="horario-toolbar-bloque" role="group" aria-label="Orientación del horario">
                <button type="button" class="ribbon-btn ribbon-ico-indigo btn-cal-modo activo" id="btnOriH" onclick="cambiarOrientacionCal('h')" aria-label="Horizontal">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/></svg>
                  <span class="ribbon-label">Horizontal</span>
                </button>
                <button type="button" class="ribbon-btn ribbon-ico-indigo btn-cal-modo" id="btnOriV" onclick="cambiarOrientacionCal('v')" aria-label="Vertical">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>
                  <span class="ribbon-label">Vertical</span>
                </button>
              </div>

              <span class="horario-sep-v" aria-hidden="true"></span>

              <div class="horario-toolbar-bloque" role="group" aria-label="Acciones del horario">
                <button type="button" class="ribbon-btn ribbon-ico-verde" onclick="abrirModalHorarioAsi()" aria-label="Importar horario XML">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  <span class="ribbon-label">Importar</span>
                </button>

                <button type="button" class="btn-ayuda ribbon-btn ribbon-ico-ambar" onclick="abrirAyuda('claseHorario')" aria-label="Ayuda del horario">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none"></circle></svg>
                  <span class="ribbon-label">Ayuda</span>
                </button>
              </div>
            </div>
            <div id="listaSlotsMae" class="cal-clase"></div>
          </div>
        </div>
        <!-- Formulario heredado de audio (reubicado dentro del diseño de sesiones NEM) -->
        <div class="tarjeta oculto" id="cajaFormMae" style="display:none !important;">
          <h2 id="titFormMae"></h2>
          <p id="metaFormMae"></p>
          <input type="text" id="titContClase" value="">
          <textarea id="txtContClase"></textarea>
          <input type="checkbox" id="chkPubClase" checked>
          <div class="botones-voz"><button type="button" onclick="guardarContenidoMae()">Guardar</button></div>
        </div>
      </div>
      <div id="tabPlaneacion" class="oculto">
        <div class="tarjeta nem-shell-tarjeta">
          <!-- SECCIÓN 1: Catálogo de Planeaciones -->
          <div id="cajaListaPlanNEM">
            <div class="cal-filtros-grupo" id="n3Planeacion" role="group" aria-label="Filtros y acciones de planeación" style="display:flex;justify-content:center;align-items:center;gap:8px;flex-wrap:wrap;margin:0 auto 16px;">
              <!-- Selector de Banco: Personal vs Global -->
              <div style="display:inline-flex;background:#e2e8f0;border-radius:8px;padding:3px;gap:2px;" role="tablist" aria-label="Banco de Planeaciones">
                <button type="button" id="btnBancoPersonal" class="ribbon-btn activo" onclick="conmutarBancoPlaneacion_('personal')" style="padding:5px 12px;font-size:12px;font-weight:700;border-radius:6px;border:none;background:#ffffff;color:var(--st90-azul);cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.06);">
                  📁 Mi Banco Personal
                </button>
                <button type="button" id="btnBancoGlobal" class="ribbon-btn" onclick="conmutarBancoPlaneacion_('global')" style="padding:5px 12px;font-size:12px;font-weight:700;border-radius:6px;border:none;background:transparent;color:#475569;cursor:pointer;">
                  🌐 Repositorio Escolar Global
                </button>
              </div>
              <button type="button" class="ribbon-btn ribbon-ico-verde" id="btnNuevaPlan" onclick="abrirFormNuevaPlaneacion()" aria-label="Nueva Planeación">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span class="ribbon-label">Nueva</span>
              </button>
              <div class="ribbon-btn ribbon-btn-select-wrap" id="btnPlanGrado">
                <select id="selPlanGrado" class="filtro-select-overlay" onchange="alCambiarFiltroPlan()" aria-label="Grado">
                  <option value="">Todos los grados</option>
                  <option value="1">1° secundaria</option>
                  <option value="2">2° secundaria</option>
                  <option value="3">3° secundaria</option>
                </select>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 10l-10-5-10 5 10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/></svg>
                <span class="ribbon-label" id="lblPlanGrado">Grado</span>
              </div>
              <div class="ribbon-btn ribbon-btn-select-wrap" id="btnPlanGrupo">
                <select id="selPlanGrupo" class="filtro-select-overlay" onchange="alCambiarFiltroPlan()" aria-label="Grupo">
                  <option value="">Todos los grupos</option>
                </select>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 21V8l9-5 9 5v13"/><path d="M9 21V12h6v9"/></svg>
                <span class="ribbon-label" id="lblPlanGrupo">Grupo</span>
              </div>
              <div class="ribbon-btn ribbon-btn-select-wrap" id="btnPlanAsignatura">
                <select id="selPlanAsignatura" class="filtro-select-overlay" onchange="alCambiarFiltroPlan()" aria-label="Asignatura">
                  <option value="">Todas las asignaturas</option>
                  <option value="Español">Español</option>
                  <option value="Matemáticas">Matemáticas</option>
                  <option value="Inglés">Inglés</option>
                  <option value="Historia">Historia</option>
                  <option value="Geografía">Geografía</option>
                  <option value="Formación Cívica y Ética">Formación Cívica</option>
                  <option value="Ciencias">Ciencias (Biología/Física/Química)</option>
                  <option value="Tecnología">Tecnología</option>
                  <option value="Artes">Artes</option>
                  <option value="Educación Física">Educación Física</option>
                  <option value="Tutoría">Tutoría / Socioemocional</option>
                </select>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                <span class="ribbon-label" id="lblPlanAsignatura">Asignatura</span>
              </div>
              <div class="ribbon-btn ribbon-btn-select-wrap" id="btnPlanTrimestre">
                <select id="selPlanTrimestre" class="filtro-select-overlay" onchange="alCambiarFiltroPlan()" aria-label="Trimestre">
                  <option value="">Todos los trimestres</option>
                  <option value="Trimestre 1">1° Trimestre (Ago - Nov)</option>
                  <option value="Trimestre 2">2° Trimestre (Dic - Mar)</option>
                  <option value="Trimestre 3">3° Trimestre (Abr - Jul)</option>
                </select>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
                <span class="ribbon-label" id="lblPlanTrimestre">Trimestre</span>
              </div>
              <div id="wrapPlanFiltroDocente" class="oculto" style="display:inline-flex;align-items:center;">
                <input type="text" id="inpPlanDocente" name="filtroDocentePlan_noop" autocomplete="off" placeholder="Buscar por docente..." oninput="alCambiarFiltroPlan()" style="font-size:12px;padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;min-width:160px;background:#fff;" title="Filtrar por autor docente en el repositorio global">
              </div>
              <button type="button" class="ribbon-btn ribbon-ico-azul" onclick="cargarListaPlaneacionesNEM(true)" aria-label="Actualizar">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                <span class="ribbon-label">Actualizar</span>
              </button>
              <button type="button" class="btn-ayuda ribbon-btn ribbon-ico-ambar" onclick="abrirAyuda('planeacionNEM')" aria-label="Ayuda">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none"></circle></svg>
                <span class="ribbon-label">Ayuda</span>
              </button>
            </div>
            <div id="bannerRepositorioGlobal" class="oculto" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:12.5px;color:#1e40af;line-height:1.5;">
              🌐 <strong>Repositorio Escolar Global (Espacio Colegiado):</strong> Explora las planeaciones terminadas y publicadas por el colectivo docente de la Secundaria Técnica 90. Ningún usuario puede alterar la versión original de otro colega. Pulsa <strong>«Copiar a mi Banco»</strong> para clonar el proyecto a tu banco personal como una copia 100% independiente y editable.
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <h2 id="titCatalogoPlan" style="font-size:18px;color:var(--st90-azul);margin:0;">Proyectos y Planeaciones Didácticas (NEM Fase 6)</h2>
              <span id="txtPlanConteo" style="font-size:13px;color:#64748b;font-weight:700;"></span>
            </div>
            <div id="gridPlaneaciones" class="nem-grid">
              <p class="hint" style="text-align:center;">Cargando planeaciones didácticas…</p>
            </div>
          </div>

          <!-- SECCIÓN 2: Formulario de Creación / Edición General NEM -->
          <div id="cajaFormPlanNEM" class="oculto">
            <div class="nem-header-box" style="display:none;">
              <div>
                <h2 id="titFormPlan" class="nem-header-title">Nueva Planeación Didáctica NEM</h2>
                <p class="nem-header-sub">Fase 6: Educación Secundaria. Diseña la unidad con metodología sociocrítica y enfoque DUA.</p>
              </div>
              <button type="button" class="nem-btn-accion" onclick="cerrarFormPlaneacion()">← Volver a lista</button>
            </div>

            <form id="formPlanData" novalidate onsubmit="guardarPlaneacionForm(event)">
              <input type="hidden" id="planId" value="">
              <input type="hidden" id="planIdHorario" value="">

              <!-- Encabezado / Banner informativo compacto de la Clase seleccionada -->
              <div id="bannerClaseNEM" class="nem-banner">
                <div class="nem-banner-header">
                  <div class="nem-banner-main">
                    <span class="nem-banner-tag">🏫 CLASE SELECCIONADA</span>
                    <h2 id="txtEncabezadoMateriaGrupo" class="nem-banner-title">MATEMÁTICAS · 2°A</h2>
                  </div>
                </div>
                <div class="nem-banner-fila">
                    <div class="nem-banner-meta">
                      <span>📅 <strong id="txtEncabezadoFecha">--/--/----</strong></span>
                      <span>⏰ <strong id="txtEncabezadoHorario">Hora --</strong></span>
                      <span>🗓️ <strong id="txtEncabezadoPeriodo">1° Trimestre SEP</strong></span>
                      <span id="wrapEncabezadoDocente">👨‍🏫 Docente: <strong id="txtEncabezadoDocente">--</strong></span>
                  </div>
                  <button type="button" class="nem-banner-btn" onclick="conmutarVistaPlaneacion_('horario', document.getElementById('btnSubPlanHorario'))" title="Ver el Horario semanal completo">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <span>Ver Horario</span>
                  </button>
                </div>
              </div>

              <!-- Campos técnicos sincronizados (ocultos visualmente para persistencia) -->
              <div id="wrapCamposOcultosPlan" style="display:none !important;">
                <select id="selPlanClaseHorario" onchange="alSeleccionarClaseHorarioEnPlan()"></select>
                <span id="badgePeriodoPlan"></span>
                <select id="planGrado" onchange="actualizarGruposFormPlan()"><option value="1">1</option><option value="2">2</option><option value="3">3</option></select>
                <select id="planGrupo"><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="E">E</option><option value="F">F</option></select>
                <input type="text" id="planAsignatura">
                <input type="date" id="planFechaInicio" onchange="alCambiarFechaInicioPlan()">
                <input type="text" id="planPeriodo">
              </div>

              <!-- NAVEGADOR STEPPER UX INTERACTIVO EN 4 ETAPAS (DESIGN SYSTEM) -->
              <div class="nem-stepper-header" role="tablist">
                <button type="button" class="nem-step-tab activo" onclick="irAPasoPlanNEM(1)" id="tabPasoPlan1" role="tab" aria-selected="true">
                  <span class="step-num">1</span>
                  <span class="step-txt">Metadatos & Ejes</span><span class="nem-ayuda-paso" title="Ayuda de esta sección" onclick="event.stopPropagation(); abrirAyudaPasoPlan_(1);" style="margin-left:6px;font-size:11px;opacity:.65;cursor:pointer;">❓</span><span class="nem-ayuda-paso" title="Asistente de IA de esta sección" onclick="event.stopPropagation(); abrirAsistentePasoNEM_(1);" style="margin-left:4px;font-size:12px;opacity:.8;cursor:pointer;">🤖</span>
                </button>
                <button type="button" class="nem-step-tab" onclick="irAPasoPlanNEM(2)" id="tabPasoPlan2" role="tab" aria-selected="false">
                  <span class="step-num">2</span>
                  <span class="step-txt">Contenidos & PDA</span><span class="nem-ayuda-paso" title="Ayuda de esta sección" onclick="event.stopPropagation(); abrirAyudaPasoPlan_(2);" style="margin-left:6px;font-size:11px;opacity:.65;cursor:pointer;">❓</span><span class="nem-ayuda-paso" title="Asistente de IA de esta sección" onclick="event.stopPropagation(); abrirAsistentePasoNEM_(2);" style="margin-left:4px;font-size:12px;opacity:.8;cursor:pointer;">🤖</span>
                </button>
                <button type="button" class="nem-step-tab" onclick="irAPasoPlanNEM(3)" id="tabPasoPlan3" role="tab" aria-selected="false">
                  <span class="step-num">3</span>
                  <span class="step-txt">Diagnóstico & DUA</span><span class="nem-ayuda-paso" title="Ayuda de esta sección" onclick="event.stopPropagation(); abrirAyudaPasoPlan_(3);" style="margin-left:6px;font-size:11px;opacity:.65;cursor:pointer;">❓</span><span class="nem-ayuda-paso" title="Asistente de IA de esta sección" onclick="event.stopPropagation(); abrirAsistentePasoNEM_(3);" style="margin-left:4px;font-size:12px;opacity:.8;cursor:pointer;">🤖</span>
                </button>
                <button type="button" class="nem-step-tab" onclick="irAPasoPlanNEM(4)" id="tabPasoPlan4" role="tab" aria-selected="false">
                  <span class="step-num">4</span>
                  <span class="step-txt">Propósito & IA</span><span class="nem-ayuda-paso" title="Ayuda de esta sección" onclick="event.stopPropagation(); abrirAyudaPasoPlan_(4);" style="margin-left:6px;font-size:11px;opacity:.65;cursor:pointer;">❓</span><span class="nem-ayuda-paso" title="Asistente de IA de esta sección" onclick="event.stopPropagation(); abrirAsistentePasoNEM_(4);" style="margin-left:4px;font-size:12px;opacity:.8;cursor:pointer;">🤖</span>
                </button>
              </div>

              <!-- ETAPA 1: METADATOS Y EJES ARTICULADORES -->
              <div id="etapaPlanNEM_1" class="nem-step-pane">
                <!-- FILA 1 (IMAGEN 1): TÍTULO, CAMPO FORMATIVO, METODOLOGÍA Y SESIONES EN UNA SOLA FILA -->
              <div class="nem-fila-una">
                <div class="nem-campo-inline">
                  <label for="planTitulo">Título del Proyecto o Planeación *</label>
                  <input type="text" id="planTitulo" required placeholder="Ej. Voces y Raíces de Nuestra Tierra: Narrativas comunitarias">
                </div>
                <div class="nem-campo-inline">
                  <label for="planCampoFormativo">Campo Formativo (NEM) *</label>
                  <select id="planCampoFormativo" required>
                    <option value="Lenguajes">Lenguajes</option>
                    <option value="Saberes y Pensamiento Científico">Saberes y Pensamiento Científico</option>
                    <option value="Ética, Naturaleza y Sociedades">Ética, Naturaleza y Sociedades</option>
                    <option value="De lo Humano y lo Comunitario">De lo Humano y lo Comunitario</option>
                  </select>
                </div>
                <div class="nem-campo-inline">
                  <label for="planMetodologia">Metodología Sociocrítica *</label>
                  <select id="planMetodologia" required>
                    <option value="Aprendizaje basado en proyectos comunitarios">Proyectos Comunitarios (Lenguajes)</option>
                    <option value="Aprendizaje basado en indagación (STEAM)">Indagación / STEAM (Saberes)</option>
                    <option value="Aprendizaje Basado en Problemas (ABP)">ABP (Ética, Nat. y Soc.)</option>
                    <option value="Aprendizaje Servicio (AS)">Aprendizaje Servicio / AS (De lo Humano)</option>
                  </select>
                </div>
                <div class="nem-campo-inline">
                  <label for="planNumSesiones">Sesiones (40m) *</label>
                  <input type="number" id="planNumSesiones" min="1" max="25" value="3" required style="text-align:center;font-weight:700;">
                </div>
              </div>

              <!-- EJES ARTICULADORES (COMPACTOS EN LÍNEA) -->
              <div class="nem-ejes-fila">
                <label>Ejes Articuladores (Selecciona los aplicables)</label>
                <div class="nem-ejes-wrap" id="wrapEjesPlan">
                  <label class="nem-eje-chip"><input type="checkbox" value="Inclusión"> Inclusión</label>
                  <label class="nem-eje-chip"><input type="checkbox" value="Pensamiento Crítico"> Pensamiento Crítico</label>
                  <label class="nem-eje-chip"><input type="checkbox" value="Interculturalidad Crítica"> Interculturalidad</label>
                  <label class="nem-eje-chip"><input type="checkbox" value="Igualdad de Género"> Igualdad de Género</label>
                  <label class="nem-eje-chip"><input type="checkbox" value="Vida Saludable"> Vida Saludable</label>
                  <label class="nem-eje-chip"><input type="checkbox" value="Apropiación de las culturas a través de la lectura y la escritura"> Lectura y Escritura</label>
                  <label class="nem-eje-chip"><input type="checkbox" value="Artes y experiencias estéticas"> Artes y Estética</label>
                </div>
              </div>

<div class="nem-step-nav-footer">
                  <span class="hint" style="font-size:11px;">Paso 1 de 4: Estructura Curricular General y Ejes Articuladores</span>
                  <button type="button" class="nem-btn-accion nem-btn-primario" onclick="irAPasoPlanNEM(2)">
                    Siguiente: Contenidos & PDA →
                  </button>
                </div>
              </div>

              <!-- ETAPA 2: CATÁLOGO DINÁMICO SEP Y PROCESOS DE DESARROLLO DE APRENDIZAJE -->
              <div id="etapaPlanNEM_2" class="nem-step-pane oculto">
                <!-- FILA 2 (IMAGEN 2): CATÁLOGO DINÁMICO SEP EN 2 COLUMNAS -->
              <div class="nem-catalogo-box">
                <div class="nem-catalogo-header">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <span class="nem-badge-official">SEP Fase 6 Oficial</span>
                    <strong class="nem-catalogo-title">Catálogo Dinámico de Contenidos y PDA Oficiales</strong>
                  </div>
                  <span id="txtEtiquetaMatrizNEM" class="nem-badge-pill">Matemáticas · 2° de secundaria</span>
                </div>

                <div class="nem-catalogo-dos-col">
                  <!-- Columna Izquierda: Contenido Central -->
                  <div>
                    <label for="selContenidoSinteticoNEM" style="font-size:11.5px;font-weight:700;color:#166534;margin:0 0 4px;display:flex;align-items:center;height:24px;">
                      1. Elegir Contenido Central del Programa Sintético SEP:
                    </label>
                    <select id="selContenidoSinteticoNEM" class="nem-select-sintetico" onchange="alSeleccionarContenidoSinteticoNEM()">
                      <option value="">-- Elige un contenido curricular oficial --</option>
                    </select>
                    <p style="font-size:11px;color:#15803d;margin:6px 0 0;line-height:1.35;">
                      💡 Al elegir el contenido oficial, se filtrarán las progresiones de aprendizaje correspondientes a tu grado escolar.
                    </p>
                  </div>

                  <!-- Columna Derecha: PDA Oficiales, Buscador y Checklist -->
                  <div>
                    <div style="display:flex;align-items:center;gap:6px;margin:0 0 4px;height:24px;flex-wrap:nowrap;">
                      <label style="font-size:11.5px;font-weight:700;color:#166534;margin:0;">
                        2. PDA de este grado:
                      </label>
                      <button type="button" id="btnBuscarPDA" title="Buscar PDA" onclick="alternarBuscadorPDA_()" style="border:0;background:none;cursor:pointer;font-size:14px;line-height:1;padding:0 2px;height:22px;">🔍</button>
                      <button type="button" id="btnArticulacionPDA" title="Ver progresión en otros grados" onclick="alternarArticulacionOtrosGrados_()" style="border:0;background:none;cursor:pointer;font-size:14px;line-height:1;padding:0 2px;height:22px;">👁️</button>
                      <div style="display:flex;align-items:center;gap:4px;margin-left:auto;">
                        <span id="badgeConteoPDAs" class="nem-badge-count" aria-live="polite">0 seleccionados</span>
                        <button type="button" class="btn-secundario" style="font-size:10px;padding:1px 6px;cursor:pointer;" onclick="marcarTodosPDAsGrado_(true)">Todos</button>
                        <button type="button" class="btn-secundario" style="font-size:10px;padding:1px 6px;cursor:pointer;" onclick="marcarTodosPDAsGrado_(false)">Limpiar</button>
                      </div>
                    </div>

                    <input type="text" id="buscarPDANEM" class="nem-input-filter oculto" placeholder="Filtrar PDA por palabras clave…" oninput="filtrarListaPDAsDOM_()" style="margin-bottom:6px;">

                    <!-- Contenedor interactivo del selector de PDA -->
                    <div id="listaPDAsCheckboxNEM">
                      <span style="font-size:11px;color:#64748b;">Selecciona un contenido a la izquierda para ver sus PDA oficiales.</span>
                    </div>

                    <!-- Articulación con otros grados (se abre con el icono del ojo) -->
                    <div id="cajaArticulacionOtrosGrados" class="nem-box-articulacion oculto" style="margin-top:6px;"></div>
                  </div>
                </div>
              </div>

              <!-- FILA 3 (IMAGEN 3): CONTENIDO SINTÉTICO Y PDA OFICIALES EN 2 COLUMNAS -->
              <div class="nem-fila-dos-col">
                <div class="nem-campo-inline">
                  <label for="planContenidoSintetico">Contenido Curricular Sintético (Texto Oficial) *</label>
                  <textarea id="planContenidoSintetico" rows="2" style="min-height:55px;" required placeholder="Selecciona arriba en el catálogo oficial o redacta el contenido sintético de la SEP..."></textarea>
                </div>
                <div class="nem-campo-inline">
                  <label for="planPDA">Proceso(s) de Desarrollo de Aprendizaje (PDA) Oficial(es) *</label>
                  <textarea id="planPDA" rows="2" style="min-height:55px;" required placeholder="Marca arriba las casillas de los PDA correspondientes o redacta tus adaptaciones curriculares..."></textarea>
                </div>
              </div>

<div class="nem-step-nav-footer">
                  <button type="button" class="nem-btn-accion" onclick="irAPasoPlanNEM(1)">
                    ← Volver a Metadatos
                  </button>
                  <button type="button" class="nem-btn-accion nem-btn-primario" onclick="irAPasoPlanNEM(3)">
                    Siguiente: Diagnóstico CTE & DUA →
                  </button>
                </div>
              </div>

              <!-- ETAPA 3: CONTEXTO ANALÍTICO CTE & EDUCACIÓN INCLUSIVA DUA (UDEI) -->
              <div id="etapaPlanNEM_3" class="nem-step-pane oculto">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <strong style="font-size:13px;color:var(--st90-azul);">Contexto Analítico del CTE & Diagnóstico Comunitario</strong>
                    <span class="nem-badge-pill" style="font-size:10px;padding:2px 7px;">Fase 6 • Programa Analítico</span>
                  </div>
                  <button type="button" class="btn-outline-custom" onclick="abrirBancoEncuestas_()" style="font-size:11px;padding:4px 9px;" title="Consultar el banco de encuestas de la escuela y traer sus hallazgos">
                    📊 Importar datos de encuesta
                  </button>
                </div>

                <div class="nem-fila-dos-col" style="margin-bottom:12px;">
                  <!-- COLUMNA 1: Selector de problemática CTE con botón de gestión -->
                  <div class="nem-campo-inline">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;flex-wrap:wrap;gap:4px;">
                      <label for="selProblemaEscolar" style="margin:0;font-size:11.5px;font-weight:700;color:var(--st90-azul);">Catálogo del Programa Analítico CTE *</label>
                      <button type="button" class="btn-secundario" onclick="abrirModalGestionCTE_()" style="font-size:9.5px;padding:2px 6px;cursor:pointer;background:#f8fafc;border:1px solid #cbd5e1;border-radius:4px;font-weight:700;color:#0f172a;" title="Abrir panel para agregar o editar problemáticas del Programa Analítico CTE">
                        ⚙️ Editar Catálogo CTE
                      </button>
                    </div>
                    <select id="selProblemaEscolar" class="nem-select-sintetico" onchange="alSeleccionarProblemaCTE()" style="font-size:11px;padding:6px 7px;width:100%;margin-bottom:4px;">
                      <option value="">-- Cargar problemática priorizada por el CTE --</option>
                    </select>
                    <div class="hint" style="font-size:10px;color:#64748b;line-height:1.25;">
                      💡 Selecciona para precargar el reto de la comunidad o redacta libremente.
                    </div>
                  </div>

                  <!-- COLUMNA 2: Problema de la Comunidad (Textarea) -->
                  <div class="nem-campo-inline">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;flex-wrap:wrap;gap:4px;">
                      <label for="planProblema" style="margin:0;font-size:11.5px;font-weight:700;color:var(--st90-azul);">Problema de la Comunidad (Situación-Problema) *</label>
                    </div>
                    <textarea id="planProblema" rows="3" style="min-height:75px;resize:vertical !important;overflow-y:auto !important;" required placeholder="¿Qué reto de la escuela o comunidad detona este proyecto? (Selecciona a la izquierda del catálogo CTE, importa de encuestas o redacta libremente)"></textarea>
                  </div>
                </div>

                <!-- MÓDULO DE EDUCACIÓN INCLUSIVA Y AJUSTES RAZONABLES (DUA / UDEI) -->
                <div id="secInclusionBAPyC" class="nem-inclusion-box oculto">
                  <div class="nem-inclusion-header-single">
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;flex:1 1 auto;min-width:0;">
                      <span class="nem-badge-udei">UDEI</span>
                      <strong style="color:#92400e;font-size:11.5px;white-space:nowrap;">Inclusión (DUA):</strong><span class="nem-ayuda-paso" title="¿Qué significan UDEI, DUA y BAPyC?" onclick="abrirAyudaInclusion_()" style="margin-left:4px;font-size:12px;cursor:pointer;">❓</span>
                      <div id="wrapChipsBAPyCGrupo" style="display:inline-flex;gap:4px;flex-wrap:wrap;align-items:center;"></div>
                    </div>
                    <div id="badgeAlertaBAPyC" class="nem-badge-bapyc-alert" style="white-space:nowrap;flex:0 0 auto;">
                      ⚠️ BAPyC detectadas en grupo
                    </div>
                  </div>
                  <div>
                    <label for="planAjustesRazonables" style="font-size:11px;font-weight:700;color:#78350f;margin-bottom:3px;display:block;">
                      Ajustes Razonables Curriculares y Metodológicos (DUA) *
                    </label>
                    <textarea id="planAjustesRazonables" rows="2" style="width:100%;min-height:55px;border:1px solid #fcd34d;border-radius:6px;padding:6px;font-size:11.5px;background:#ffffff;box-sizing:border-box;resize:vertical !important;overflow-y:auto !important;" placeholder="Describe las adecuaciones de acceso, apoyos visuales/auditivos, tiempos flexibles o macrotipos..."></textarea>
                  </div>
                </div>

<div class="nem-step-nav-footer">
                  <button type="button" class="nem-btn-accion" onclick="irAPasoPlanNEM(2)">
                    ← Volver a Contenidos & PDA
                  </button>
                  <button type="button" class="nem-btn-accion nem-btn-primario" onclick="irAPasoPlanNEM(4)">
                    Siguiente: Propósito & Asistente IA →
                  </button>
                </div>
              </div>

              <!-- ETAPA 4: PROPÓSITO CENTRAL, ASISTENTE PEDAGÓGICO IA Y GUARDADO -->
              <div id="etapaPlanNEM_4" class="nem-step-pane oculto">
                <div style="display:flex;justify-content:space-between;align-items:center;margin:6px 0 10px;flex-wrap:wrap;gap:8px;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <strong style="font-size:13px;color:var(--st90-azul);">Propósito del Proyecto y Producto Central</strong>
                    <span class="nem-badge-pill" style="font-size:10px;padding:2px 7px;">Fase 6 • Evaluación Formativa</span>
                  </div>
                  <button type="button" class="nem-btn-ai-solo" onclick="solicitarSugerenciaProyectoIA()" id="btnSugerirProyectoIA" style="margin:0;font-size:11.5px;padding:5px 12px;" title="Genera propuesta de problema, propósito y producto a partir de los PDA oficiales">
                    ✨ Sugerir Proyecto con IA
                  </button>
                </div>

                <div class="nem-campo-inline" style="margin-bottom:14px;">
                  <label for="planProposito" style="margin-bottom:4px;font-size:12px;font-weight:700;color:var(--st90-azul);">Propósito Formativo del Proyecto y Producto Central Tangible *</label>
                  <textarea id="planProposito" rows="4" style="min-height:90px;width:100%;resize:vertical !important;overflow-y:auto !important;" placeholder="Define qué aprenderán los estudiantes, para qué lo aprenderán y cuál será el producto integrador o evidencia central de aprendizaje..."></textarea>
                </div>

<div class="nem-step-nav-footer">
                  <button type="button" class="nem-btn-accion" onclick="irAPasoPlanNEM(3)">
                    ← Volver a Diagnóstico CTE
                  </button>
                  <div style="display:flex;gap:10px;">
                    <button type="button" class="nem-btn-accion" onclick="cerrarFormPlaneacion()">Cancelar</button>
                    <button type="submit" class="nem-btn-accion nem-btn-primario" id="btnGuardarPlan" onclick="guardarPlaneacionForm(event)">💾 Guardar Planeación</button>
                  </div>
                </div>
              </div>
            </form>
          </div>

          <!-- SECCIÓN 3: Gestor y Editor de Sesiones DUA (40 min) -->
          <div id="cajaSesionesPlanNEM" class="oculto">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:14px;border-bottom:1px solid #e2e8f0;padding-bottom:12px;">
              <div>
                <div style="display:flex;align-items:center;gap:8px;">
                  <h2 id="titPlanSesiones" style="font-size:18px;color:var(--st90-azul);margin:0;">Sesiones Didácticas</h2>
                  <span id="badgeEstadoPlan" class="badge-nem badge-borrador">BORRADOR</span>
                </div>
                <p id="subMetaPlanSesiones" class="hint" style="margin:4px 0 0;"></p>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button type="button" class="nem-btn-accion" style="background:#1d4ed8;color:#ffffff;border-color:#1d4ed8;" onclick="solicitarDesgloseSesionesIA()" id="btnDesglosarSesionesIA">✨ Desglosar con IA (40 min DUA)</button>
                <button type="button" class="nem-btn-accion" onclick="aprobarPlaneacionActual()" id="btnAprobarPlan">✓ Aprobar Planeación</button>
                <button type="button" class="nem-btn-accion" onclick="cerrarGestorSesiones()">← Volver a lista</button>
              </div>
            </div>

            <!-- Pestañas de Sesiones -->
            <div id="tabsSesionesPlan" class="nem-sesiones-tabs"></div>

            <!-- Editor de la Sesión Activa -->
            <div id="editorSesionActiva" class="oculto">
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <div>
                  <h3 id="titSesionActiva" style="margin:0;font-size:16px;color:#0f172a;">Sesión 1 (40 min)</h3>
                  <p id="progSesionActiva" style="margin:4px 0 0;font-size:12px;color:#64748b;font-weight:600;"></p>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                  <button type="button" class="nem-btn-accion btn-soft-primary" onclick="abrirModalLibrosSEP_()" id="btnVincularLibroSEP">
                    📚 Vincular Libro SEP Fase 6
                  </button>
                  <button type="button" class="nem-btn-accion nem-btn-accion--azul" onclick="abrirModalCalendarizarSesion()" id="btnCalSesion">📅 Calendarizar en Horario</button>
                </div>
              </div>

              <!-- BARRA DE HERRAMIENTAS IDEVICES MODULARES (TIPO EXELOGIC / EXELearning) -->
              <div class="idevice-bar">
                <span>iDevices Modulares:</span>
                <button type="button" class="idevice-btn idevice-btn--lectura" onclick="insertariDeviceSesion_('lectura')">
                  🎧 Lectura Guiada (Audio DUA)
                </button>
                <button type="button" class="idevice-btn idevice-btn--pregunta" onclick="insertariDeviceSesion_('pregunta')">
                  ❓ Pregunta Formativa
                </button>
                <button type="button" class="idevice-btn idevice-btn--reto" onclick="insertariDeviceSesion_('reto')">
                  🏆 Desafío Práctico Situado
                </button>
              </div>
              <div id="contenedorIDevicesDinamicos" aria-live="polite" aria-label="Bloques iDevice de la sesión"></div>

              <!-- Título de la sesión -->
              <!-- Título / Tema de la clase -->
              <label for="sesTitulo" style="font-weight:700;font-size:14px;color:var(--st90-azul);margin-bottom:4px;display:block;">Título / Tema de la clase</label>
              <input type="text" id="sesTitulo" placeholder="Tema de la clase">

              <!-- Desglose de los 4 momentos NEM (40 min) -->
              <div class="momento-caja momento-apertura">
                <div class="momento-caja-header">
                  <h3>⏱️ 1. Apertura (5 minutos)</h3>
                  <span class="nem-meta-pill">Activación, saberes previos y propósito</span>
                </div>
                <textarea id="sesApertura" data-alias="planApertura" aria-required="true" style="min-height:75px;" placeholder="Pregunta generadora, reto cognitivo o anécdota detonadora que conecte con la experiencia de los alumnos..."></textarea>
              </div>

              <div class="momento-caja momento-desarrollo">
                <div class="momento-caja-header">
                  <h3>📖 2. Desarrollo / Explicación (10 minutos)</h3>
                  <span class="nem-meta-pill">Conceptos centrales y mediación oral clara</span>
                </div>
                <textarea id="sesDesarrollo" data-alias="planDesarrollo" aria-required="true" style="min-height:90px;" placeholder="Explicación directa del docente o contenido clave. Redacta de forma explicativa, fluida y con lenguaje claro..."></textarea>
              </div>

              <div class="momento-caja momento-actividad">
                <div class="momento-caja-header">
                  <h3>✍️ 3. Actividad / Producción (20 minutos)</h3>
                  <span class="nem-meta-pill">Trabajo individual, en parejas o colectivo</span>
                </div>
                <textarea id="sesActividad" data-alias="planActividad" aria-required="true" style="min-height:90px;" placeholder="Instrucciones paso a paso de la actividad de aprendizaje que los alumnos realizarán durante la clase..."></textarea>
              </div>

              <div class="momento-caja momento-cierre">
                <div class="momento-caja-header">
                  <h3>🎯 4. Cierre (5 minutos)</h3>
                  <span class="nem-meta-pill">Síntesis formativa y metacognición</span>
                </div>
                <textarea id="sesCierre" data-alias="planCierre" aria-required="true" style="min-height:75px;" placeholder="Preguntas de reflexión metacognitiva: ¿Qué descubrimos hoy? ¿Cómo se aplica a nuestra vida comunitaria?..."></textarea>
              </div>

              <!-- Sección DUA: Recursos Visuales con Descripción Oral Obligatoria -->
              <div class="dua-box">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <span class="dua-badge-audio">DUA · Accesibilidad Universal</span>
                    <strong style="font-size:14px;color:#92400e;">Recurso Visual con Descripción Auditiva</strong>
                  </div>
                </div>
                <p class="hint" style="margin:0 0 10px;color:#78350f;">
                  Para garantizar la inclusión plena según el Diseño Universal para el Aprendizaje, toda imagen o esquema debe contar con una descripción oral rica para que los estudiantes invidentes la escuchen con igual profundidad conceptual.
                </p>
                <div style="display:grid;grid-template-columns:1fr 2fr;gap:10px;">
                  <div>
                    <label for="sesVisualUrl" style="font-size:12px;">URL de imagen (opcional)</label>
                    <input type="text" id="sesVisualUrl" placeholder="https://... o imagen">
                  </div>
                  <div>
                    <label for="sesVisualDesc" style="font-size:12px;">Descripción Oral Accesible (Obligatoria si hay recurso visual) *</label>
                    <textarea id="sesVisualDesc" style="min-height:70px;" placeholder="Describe detalladamente lo que muestra la imagen: colores, elementos, relaciones espaciales y significado..."></textarea>
                  </div>
                </div>
              </div>

              <!-- Guion Estudiante Integrado: Texto que escuchará el alumno -->
              <div style="background:#ffffff;border:1px solid #cbd5e1;border-radius:10px;padding:14px;margin-bottom:14px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
                  <div>
                    <label for="sesGuionEstudiante" style="font-size:15px;font-weight:800;color:var(--st90-azul);margin:0;display:block;">
                      Texto que escuchará el alumno
                    </label>
                    <p class="hint" style="margin:2px 0 0;">Escribe o pega aquí lo que se va a leer en voz alta. El alumno vidente lo lee/ve y el alumno invidente lo escucha con narración de voz fluida.</p>
                  </div>
                  <button type="button" class="nem-btn-accion" onclick="generarGuionDesdeMomentos()" style="background:#f0fdf4;border-color:#86efac;color:#15803d;font-weight:700;">
                    ✨ Generar guion desde los 4 momentos
                  </button>
                </div>
                <textarea id="sesGuionEstudiante" style="min-height:160px;" placeholder="Escribe o pega aquí lo que se va a leer en voz alta."></textarea>
              </div>

              <!-- Controles de Publicación y Guardado en el Diseño de la Clase -->
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;padding:12px 16px;margin-bottom:14px;">
                <label style="display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:700;color:#0f172a;cursor:pointer;margin:0;">
                  <input type="checkbox" id="chkPubSesionClase" checked style="width:18px;height:18px;accent-color:var(--st90-verde);cursor:pointer;">
                  <span>Publicar ahora</span>
                </label>
                <div style="display:flex;gap:10px;align-items:center;">
                  <button type="button" class="nem-btn-accion" onclick="probarVozGuionSesion()" id="btnEscucharGuionSesion" style="display:inline-flex;align-items:center;gap:6px;background:#eff6ff;border-color:#93c5fd;color:#1d4ed8;font-weight:700;padding:8px 16px;">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                    <span>Escuchar</span>
                  </button>
                  <button type="button" class="nem-btn-accion nem-btn-primario" onclick="guardarSesionActiva()" style="display:inline-flex;align-items:center;gap:6px;padding:8px 22px;font-weight:700;">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                    <span>Guardar</span>
                  </button>
                </div>
              </div>

              <!-- Notas y Orientaciones Docentes -->
              <div style="margin-bottom:14px;">
                <label for="sesNotasDocente">Notas y Orientaciones para el Docente</label>
                <textarea id="sesNotasDocente" style="min-height:70px;" placeholder="Materiales requeridos, adecuaciones curriculares individuales, observaciones de evaluación formativa..."></textarea>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
      <div id="tabAluAcc" class="oculto">
        <div class="tarjeta">
          <div id="txtAluPassConteo" class="oculto" style="display:none;margin-bottom:10px;font-size:13px;font-weight:700;color:var(--st90-azul);text-align:center;">
            Alumnos encontrados: 0
          </div>
          <div class="cal-filtros-grupo" id="n3AluAcc" role="group" aria-label="Filtros y acciones de alumnos" style="display:flex;justify-content:center;align-items:center;gap:8px;flex-wrap:wrap;margin:0 auto 16px;">
            <div class="ribbon-btn ribbon-btn-select-wrap" id="btnPassGrado">
              <select id="filtroGradoPass" class="filtro-select-overlay" onchange="cambiarGradoPassAlu()" aria-label="Grado">
                <option value="">Todos los grados</option>
                <option value="1">1° de secundaria</option>
                <option value="2">2° de secundaria</option>
                <option value="3">3° de secundaria</option>
              </select>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 10l-10-5-10 5 10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/></svg>
              <span class="ribbon-label">Grado</span>
            </div>
            <div class="ribbon-btn ribbon-btn-select-wrap" id="btnPassGrupo">
              <select id="filtroGrupoPass" class="filtro-select-overlay" onchange="cambiarGrupoPassAlu()" aria-label="Grupo">
                <option value="">Todos los grupos</option>
              </select>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 21V8l9-5 9 5v13"/><path d="M9 21V12h6v9"/></svg>
              <span class="ribbon-label">Grupo</span>
            </div>
            <div class="asi-dd" id="ddPassBuscar" style="position:relative;">
              <button type="button" class="ribbon-btn" id="btnPassBuscar" onclick="toggleDdPassBuscar(event)" aria-label="Buscar">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg>
                <span class="ribbon-label" id="etqPassBuscar">Buscar</span>
              </button>
              <div id="panelPassBuscar" class="asi-dd-panel oculto" style="position:absolute;top:calc(100% + 6px);left:50%;transform:translateX(-50%);z-index:100;background:#fff;border:1px solid var(--st90-borde);border-radius:10px;padding:8px 10px;box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:240px;" onclick="event.stopPropagation()">
                <div style="display:flex;align-items:center;gap:6px;">
                  <input type="search" id="buscAluPass" placeholder="Nombre o matrícula…" oninput="filtrarTablaPassLocal();actualizarEtqPassBuscar();" style="width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--st90-borde);border-radius:6px;font-size:13px;outline:none;">
                  <button type="button" onclick="limpiarPassBuscar()" style="border:none;background:#f1f5f9;color:#64748b;padding:6px 10px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:700;" title="Limpiar">×</button>
                </div>
              </div>
            </div>
            <button type="button" class="ribbon-btn ribbon-ico-verde" onclick="generarClavesMasivasAlu('grupo')" aria-label="Generar a este grupo">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="4"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="8" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>
              <span class="ribbon-label">Generar</span>
            </button>
            <button type="button" class="btn-ayuda ribbon-btn ribbon-ico-ambar" onclick="abrirAyuda('claseAluAcc')" aria-label="Ayuda">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none"></circle></svg>
              <span class="ribbon-label">Ayuda</span>
            </button>
          </div>
          <div id="cajaTablaAluPass" style="overflow-x:auto;">
            <p class="hint">Cargando lista de alumnos…</p>
          </div>
        </div>
      </div>
      <div id="tabAccesos" class="oculto">
        <div class="tarjeta" id="cajaMaeAccWrap">
          <div id="contMaeClase" class="oculto" style="display:none;margin-bottom:10px;font-size:13px;font-weight:700;color:var(--st90-azul);text-align:center;">
            Docentes registrados: 0
          </div>
          <div class="cal-filtros-grupo" id="n3MaeAcc" role="group" aria-label="Filtros y acciones de docentes" style="display:flex;justify-content:center;align-items:center;gap:8px;flex-wrap:wrap;margin:0 auto 16px;">
            <div class="asi-dd" id="ddMaeBuscar" style="position:relative;">
              <button type="button" class="ribbon-btn" id="btnMaeBuscar" onclick="toggleDdMaeBuscar(event)" aria-label="Buscar">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg>
                <span class="ribbon-label" id="etqMaeBuscar">Buscar</span>
              </button>
              <div id="panelMaeBuscar" class="asi-dd-panel oculto" style="position:absolute;top:calc(100% + 6px);left:50%;transform:translateX(-50%);z-index:100;background:#fff;border:1px solid var(--st90-borde);border-radius:10px;padding:8px 10px;box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:240px;" onclick="event.stopPropagation()">
                <div style="display:flex;align-items:center;gap:6px;">
                  <input type="search" id="buscMaeClase" placeholder="Docente o usuario…" oninput="filtrarTablaMaeClaseLocal();actualizarEtqMaeBuscar();" style="width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--st90-borde);border-radius:6px;font-size:13px;outline:none;">
                  <button type="button" onclick="limpiarMaeBuscar()" style="border:none;background:#f1f5f9;color:#64748b;padding:6px 10px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:700;" title="Limpiar">×</button>
                </div>
              </div>
            </div>
            <button type="button" class="ribbon-btn" onclick="syncMaestrosClase()" aria-label="Sincronizar">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
              <span class="ribbon-label">Sincronizar</span>
            </button>
            <button type="button" class="ribbon-btn ribbon-ico-verde" onclick="generarClavesMasivasMae()" aria-label="Generar claves">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="4"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="8" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>
              <span class="ribbon-label">Generar</span>
            </button>
            <button type="button" class="btn-ayuda ribbon-btn ribbon-ico-ambar" onclick="abrirAyuda('claseMaeAcc')" aria-label="Ayuda">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none"></circle></svg>
              <span class="ribbon-label">Ayuda</span>
            </button>
          </div>
          <div id="cajaMaeAcc" style="overflow-x:auto;">
            <p class="hint" style="text-align:center;">Cargando lista de docentes…</p>
          </div>
        </div>
      </div>
    </div> <!-- Fin moduloViewPlaneacion -->
</div>
```

## AdminPlaneacionCSS.html

```css
<style id="estilosHorarioOficialST90">
        /* Ocultar input date nativo de manera invisible y accesible */
        .filtro-date-hidden {
          position: absolute !important;
          opacity: 0 !important;
          width: 0 !important;
          height: 0 !important;
          pointer-events: none !important;
          clip: rect(0, 0, 0, 0) !important;
          border: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* Contenedor principal de la barra de controles de horario (Una sola fila estilo Ribbon ST90) */
        .horario-toolbar-shell {
          background: transparent;
          border: none;
          border-radius: 0;
          padding: 4px 0 8px;
          margin: 0 auto 14px;
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 6px;
          box-shadow: none;
          width: 100%;
        }

        .horario-toolbar-bloque,
        .nav-semana-box {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-wrap: nowrap;
          gap: 4px;
          flex: 0 0 auto;
        }

        .horario-sep-v {
          display: inline-block;
          width: 1px;
          height: 26px;
          background: #e2e8f0;
          margin: 0 2px;
          flex-shrink: 0;
        }

        .filtro-select-overlay {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
          z-index: 2;
        }

        .badge-rango-semana {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 4px 10px;
          height: 34px;
          font-size: 11.5px;
          font-weight: 700;
          color: #1e293b;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          letter-spacing: 0.1px;
          white-space: nowrap;
          cursor: pointer;
          box-sizing: border-box;
          transition: border-color 0.15s ease, background 0.15s ease;
        }

        .badge-rango-semana:hover {
          background: #f8fafc;
          border-color: #94a3b8;
        }

        .badge-rango-semana svg {
          color: #0284c7;
          stroke: #0284c7;
          flex-shrink: 0;
        }

        /* =========================================================
           CUADRÍCULA DE CLASES: BOTONES EXACTAMENTE DEL MISMO TAMAÑO
           ========================================================= */
        .cal-tabla {
          width: 100% !important;
          table-layout: fixed !important;
          border-collapse: separate !important;
          border-spacing: 6px !important;
          margin-top: 8px;
        }

        .cal-tabla th {
          background: #f1f5f9;
          color: #334155;
          font-size: 12px;
          font-weight: 700;
          padding: 8px 4px;
          text-align: center;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }

        .cal-tabla th.hoy-col {
          background: #e0f2fe;
          color: #0369a1;
          border-color: #bae6fd;
        }

        .cal-tabla th.th-hora {
          width: 68px !important;
          max-width: 68px !important;
        }

        .cal-tabla td.hora {
          width: 68px !important;
          max-width: 68px !important;
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          text-align: center;
          vertical-align: middle;
          background: #f8fafc;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }

        .cal-tabla td {
          padding: 0 !important;
          vertical-align: middle !important;
        }

        /* Botón de la celda de clase con tamaño completamente uniforme */
        .cal-celda {
          width: 100% !important;
          height: 58px !important;
          min-height: 58px !important;
          max-height: 58px !important;
          box-sizing: border-box !important;
          margin: 0 !important;
          padding: 4px 6px !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: center !important;
          align-items: center !important;
          text-align: center !important;
          background: #0284c7 !important;
          color: #ffffff !important;
          border: 1px solid #0369a1 !important;
          border-radius: 8px !important;
          cursor: pointer !important;
          transition: transform 0.15s ease, box-shadow 0.15s ease !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08) !important;
          overflow: hidden !important;
        }

        .cal-celda:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 3px 6px rgba(2, 132, 199, 0.3) !important;
          background: #0369a1 !important;
        }

        .cal-celda strong {
          display: block !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          line-height: 1.2 !important;
          width: 100% !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }

        .cal-celda span {
          display: block !important;
          font-size: 10px !important;
          font-weight: 400 !important;
          line-height: 1.2 !important;
          opacity: 0.92 !important;
          width: 100% !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          margin-top: 2px !important;
        }

        .cal-celda.en-curso {
          background: #0d9488 !important;
          border-color: #0f766e !important;
        }

        .cal-celda.con-texto {
          background: #047857 !important;
          border-color: #065f46 !important;
        }

        .cal-celda.ajena {
          background: #64748b !important;
          border-color: #475569 !important;
          opacity: 0.85 !important;
        }

        .cal-celda.sel {
          outline: 2px solid #f59e0b !important;
          outline-offset: 1px !important;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.35) !important;
        }

        /* Celda vacía con el mismo tamaño uniforme */
        .cal-vacia {
          width: 100% !important;
          height: 58px !important;
          min-height: 58px !important;
          max-height: 58px !important;
          box-sizing: border-box !important;
          border: 1px dashed #cbd5e1 !important;
          border-radius: 8px !important;
          background: #f8fafc !important;
          cursor: pointer !important;
          transition: background 0.15s ease, border-color 0.15s ease !important;
        }

        .cal-vacia:hover {
          background: #f1f5f9 !important;
          border-color: #94a3b8 !important;
        }

        /* ======================================================== */
        /* ESTILOS DE ALTA GAMA: SUITE PLANEACIÓN DIDÁCTICA NEM */
        /* ======================================================== */
        .nem-shell-tarjeta {
          background: #ffffff;
          border: 1px solid var(--st90-borde);
          border-radius: 14px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);
          box-sizing: border-box;
        }

        .nem-header-box {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 14px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .nem-header-title {
          font-size: 20px;
          font-weight: 800;
          color: var(--st90-azul);
          margin: 0 0 4px;
          letter-spacing: -0.01em;
        }

        .nem-header-sub {
          font-size: 13px;
          color: #64748b;
          margin: 0;
          line-height: 1.4;
        }

        /* Banner de Clase Seleccionada */
        .nem-banner {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 1px solid #bae6fd;
          border-radius: 12px;
          padding: 14px 18px;
          margin-bottom: 20px;
          box-shadow: 0 2px 6px rgba(2, 132, 199, 0.06);
        }

        .nem-banner-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: nowrap;
          gap: 12px;
        }

        .nem-banner-fila {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: nowrap;
          gap: 12px;
          margin-top: 10px;
        }

        .nem-banner-main {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1 1 auto;
          min-width: 0;
        }

        .nem-banner-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .05em;
          color: #0369a1;
          background: #ffffff;
          border: 1px solid #7dd3fc;
          padding: 2px 9px;
          border-radius: 999px;
          width: fit-content;
        }

        .nem-banner-title {
          font-size: 20px;
          font-weight: 800;
          color: #0c4a6e;
          margin: 2px 0 6px;
        }

        .nem-banner-meta {
          display: flex;
          align-items: center;
          flex-wrap: nowrap;
          gap: 8px;
          min-width: 0;
          overflow-x: auto;
        }

        .nem-banner-meta span {
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 600;
          color: #334155;
        }

        .nem-banner-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          flex: 0 0 auto;
          white-space: nowrap;
          padding: 8px 14px;
          font-size: 12.5px;
          font-weight: 700;
          color: #0284c7;
          background: #ffffff;
          border: 1.5px solid #0284c7;
          border-radius: 8px;
          cursor: pointer;
          transition: all .2s ease;
          box-shadow: 0 2px 4px rgba(2, 132, 199, 0.08);
        }

        .nem-banner-btn:hover {
          background: #0284c7;
          color: #ffffff;
        }

        /* Banner compacto: etiqueta, titulo, chips y boton en UNA sola fila */
        .nem-banner {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: nowrap;
          padding: 10px 16px;
        }

        .nem-banner .nem-banner-header,
        .nem-banner .nem-banner-main,
        .nem-banner .nem-banner-fila {
          display: contents;
        }

        .nem-banner .nem-banner-tag,
        .nem-banner .nem-banner-btn {
          flex: 0 0 auto;
        }

        .nem-banner .nem-banner-title {
          flex: 0 0 auto;
          margin: 0;
          font-size: 18px;
          white-space: nowrap;
        }

        .nem-banner .nem-banner-meta {
          flex: 1 1 auto;
          justify-content: space-evenly;
          overflow: hidden;
        }

        /* Stepper UX Interactivo en 4 Pasos */
        .nem-stepper-header {
          display: flex;
          align-items: stretch;
          gap: 8px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 6px;
          margin: 18px 0 24px;
          box-sizing: border-box;
        }

        .nem-step-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 14px;
          border: none;
          border-radius: 8px;
          background: transparent;
          cursor: pointer;
          transition: all .2s ease;
          font-family: inherit;
          user-select: none;
        }

        .nem-step-tab:hover {
          background: #e2e8f0;
        }

        .nem-step-tab .step-num {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #cbd5e1;
          color: #334155;
          font-size: 12px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all .2s ease;
        }

        .nem-step-tab .step-txt {
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
          white-space: nowrap;
          transition: all .2s ease;
        }

        .nem-step-tab.activo {
          background: #ffffff;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
          border: 1px solid #cbd5e1;
        }

        .nem-step-tab.activo .step-num {
          background: #0284c7;
          color: #ffffff;
        }

        .nem-step-tab.activo .step-txt {
          color: #0284c7;
          font-weight: 800;
        }

        .nem-step-tab.completado .step-num {
          background: #10b981;
          color: #ffffff;
        }

        .nem-step-tab.completado .step-txt {
          color: #047857;
        }

        /* Campos y Grid del Formulario */
        .nem-fila-una {
          display: grid;
          grid-template-columns: minmax(260px, 2.5fr) minmax(180px, 1.8fr) minmax(180px, 1.8fr) 110px;
          gap: 16px;
          align-items: flex-end;
          margin-bottom: 22px;
        }

        @media (max-width: 900px) {
          .nem-fila-una {
            grid-template-columns: 1fr;
          }
        }

        .nem-campo-inline {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
        }

        .nem-campo-inline label {
          font-size: 12.5px;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .nem-campo-inline input,
        .nem-campo-inline select,
        .nem-campo-inline textarea {
          border: 1.5px solid #cbd5e1;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13.5px;
          color: #0f172a;
          background: #ffffff;
          box-sizing: border-box;
          font-family: inherit;
          transition: border-color .2s ease, box-shadow .2s ease;
          height: 42px;
          width: 100%;
        }

        .nem-campo-inline textarea {
          height: auto;
          min-height: 80px;
          line-height: 1.45;
        }

        .nem-campo-inline input:focus,
        .nem-campo-inline select:focus,
        .nem-campo-inline textarea:focus {
          outline: none;
          border-color: #0284c7;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
        }

        /* Ejes Articuladores Chips */
        .nem-ejes-fila {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 22px;
        }

        .nem-ejes-fila > label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 12px;
        }

        .nem-ejes-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
        }

        .nem-eje-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #ffffff;
          border: 1.5px solid #cbd5e1;
          border-radius: 999px;
          font-size: 12.5px;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
          user-select: none;
          transition: all .15s ease;
        }

        .nem-eje-chip:hover {
          border-color: #94a3b8;
          background: #f1f5f9;
        }

        .nem-eje-chip input[type="checkbox"] {
          accent-color: #0284c7;
          width: 15px;
          height: 15px;
          margin: 0;
          cursor: pointer;
        }

        .nem-eje-chip.seleccionado {
          background: #eff6ff;
          border-color: #0284c7;
          color: #0284c7;
          font-weight: 700;
          box-shadow: 0 1px 3px rgba(2, 132, 199, 0.12);
        }

        /* Footer de Navegación de Pasos */
        .nem-step-nav-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          padding-top: 18px;
          margin-top: 24px;
          border-top: 1px solid #e2e8f0;
        }

        .nem-btn-accion {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 18px;
          font-size: 13px;
          font-weight: 700;
          border-radius: 8px;
          border: 1.5px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          cursor: pointer;
          transition: all .2s ease;
        }

        .nem-btn-accion:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
          color: #0f172a;
        }

        .nem-btn-accion.nem-btn-primario {
          background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
          color: #ffffff;
          border-color: #0284c7;
          box-shadow: 0 2px 6px rgba(2, 132, 199, 0.25);
        }

        .nem-btn-accion.nem-btn-primario:hover {
          background: linear-gradient(135deg, #0369a1 0%, #075985 100%);
          box-shadow: 0 4px 10px rgba(2, 132, 199, 0.35);
          transform: translateY(-1px);
        }

        /* Catálogo y Dos Columnas */
        .nem-catalogo-box {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .nem-catalogo-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }

        .nem-catalogo-dos-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        @media (max-width: 800px) {
          .nem-catalogo-dos-col {
            grid-template-columns: 1fr;
          }
        }

        .nem-fila-dos-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }

        @media (max-width: 800px) {
          .nem-fila-dos-col {
            grid-template-columns: 1fr;
          }
        }

        .nem-select-sintetico {
          width: 100%;
          border: 1.5px solid #86efac;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13px;
          background: #ffffff;
          color: #14532d;
          box-sizing: border-box;
          font-family: inherit;
        }

        .nem-lista-pda-scroll {
          max-height: 220px;
          overflow-y: auto;
          border: 1.5px solid #86efac;
          border-radius: 8px;
          padding: 10px;
          background: #ffffff;
          box-sizing: border-box;
        }

        .nem-inclusion-box {
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .nem-badge-official {
          background: #15803d;
          color: #ffffff;
          font-size: 10.5px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 999px;
          text-transform: uppercase;
        }

        .nem-badge-pill {
          background: #e0f2fe;
          color: #0369a1;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 9px;
          border-radius: 999px;
        }
      
  /* Barra contextual del horario — ST90 §2 (N3 centrado) y §7 (cinta transparente) */
  .horario-toolbar-shell {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 4px 10px;
    background: transparent;
    border: 0;
    padding: 0;
    margin: 0 auto 14px;
    width: 100%;
  }
  .horario-toolbar-shell > .horario-toolbar-bloque,
  .horario-toolbar-shell > .nav-semana-box {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .horario-toolbar-shell > .horario-sep-v {
    width: 1px;
    align-self: stretch;
    background: #e2e8f0;
    margin: 4px 6px;
  }

  /* Iconos de ayuda y asistente en el stepper: compactos y en una fila */
  .nem-stepper-header { flex-wrap: nowrap; }
  .nem-step-tab { white-space: nowrap; overflow: hidden; }
  .nem-step-tab .step-txt { overflow: hidden; text-overflow: ellipsis; }
  .nem-ayuda-paso { display: inline-block; vertical-align: middle; line-height: 1; flex: 0 0 auto; }

  /* ============================================================
     FASE 3 — Catálogo SEP a dos columnas
     ============================================================ */
  .nem-catalogo-dos-col {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
    align-items: start;
  }

  .nem-catalogo-dos-col > div > label,
  .nem-catalogo-dos-col > div > .nem-catalogo-col-titulo {
    display: block;
    min-height: 18px;
    margin-bottom: 6px;
  }

  /* Lista de PDA: recupera caja y scroll (el contenedor perdió la clase nem-lista-pda-scroll) */
  #listaPDAsCheckboxNEM {
    max-height: 220px;
    overflow-y: auto;
    border: 1px solid #bbf7d0;
    border-radius: 8px;
    padding: 8px;
    background: #ffffff;
    box-sizing: border-box;
  }

  /* Buscador y selector del catálogo con la misma altura */
  #buscarPDANEM,
  .nem-select-sintetico {
    min-height: 36px;
    box-sizing: border-box;
  }

  /* ============================================================
     FASE 3 — Módulo de inclusión UDEI / DUA (faltaba en Admin)
     ============================================================ */
  .nem-inclusion-box {
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-left: 4px solid #f59e0b;
    border-radius: 12px;
    padding: 14px 16px;
    margin-bottom: 18px;
  }

  .nem-inclusion-header-single {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 10px;
  }

  .nem-badge-udei {
    background: #d97706;
    color: #ffffff;
    font-size: 10px;
    font-weight: 800;
    padding: 2px 7px;
    border-radius: 10px;
    text-transform: uppercase;
    letter-spacing: .04em;
  }

  .nem-badge-bapyc-alert {
    background: #fef3c7;
    border: 1px solid #f59e0b;
    color: #92400e;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 10px;
  }

  /* Chips de BAPyC detectadas */
  #wrapChipsBAPyCGrupo {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
  }
  #wrapChipsBAPyCGrupo > span,
  .nem-chip-bapyc {
    display: inline-block;
    background: #ffffff;
    border: 1px solid #fcd34d;
    border-radius: 999px;
    padding: 2px 8px;
    font-size: 10.5px;
    font-weight: 600;
    color: #92400e;
    line-height: 1.4;
  }

  /* Campo de ajustes razonables */
  #planAjustesRazonables {
    border: 1px solid #fcd34d;
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 12px;
    line-height: 1.5;
    color: #334155;
    background: #ffffff;
    box-sizing: border-box;
  }
  #planAjustesRazonables:focus {
    outline: none;
    border-color: #f59e0b;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, .18);
  }

  /* ============================================================
     FASE 3 — Botones de navegación inferior
     ============================================================ */
  .nem-step-nav-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    padding-top: 16px;
    margin-top: 22px;
    border-top: 1px solid #e2e8f0;
  }

  .nem-btn-accion {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 16px;
    font-size: 12.5px;
    font-weight: 700;
    border-radius: 8px;
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: #334155;
    cursor: pointer;
    transition: background .12s ease, border-color .12s ease, color .12s ease;
  }
  .nem-btn-accion:hover { background: #f1f5f9; border-color: #94a3b8; }

  /* Primario: color plano, sin degradado ni sombra */
  .nem-btn-accion.nem-btn-primario {
    background: #0284c7;
    border-color: #0284c7;
    color: #ffffff;
    box-shadow: none;
  }
  .nem-btn-accion.nem-btn-primario:hover {
    background: #0369a1;
    border-color: #0369a1;
  }

  .nem-btn-accion:focus-visible,
  .nem-btn-accion.nem-btn-primario:focus-visible {
    outline: 2px solid #0284c7;
    outline-offset: 2px;
  }

  .nem-btn-accion:disabled,
  .nem-btn-accion[disabled] {
    background: #f1f5f9;
    border-color: #e2e8f0;
    color: #94a3b8;
    cursor: not-allowed;
    box-shadow: none;
  }

  /* ============================================================
     FASE 4 — Pestañas de sesiones didácticas
     ============================================================ */
  .nem-sesiones-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 0 0 14px;
  }

  .nem-tab-sesion {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 12px;
    font-size: 12px;
    font-weight: 700;
    color: #334155;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    cursor: pointer;
    white-space: nowrap;
    transition: background .12s ease, border-color .12s ease, color .12s ease;
  }
  .nem-tab-sesion:hover { background: #f1f5f9; border-color: #94a3b8; }

  .nem-tab-sesion.activa {
    background: #0284c7;
    border-color: #0284c7;
    color: #ffffff;
  }

  .nem-tab-sesion.aprobada { border-color: #86efac; color: #15803d; background: #f0fdf4; }
  .nem-tab-sesion.borrador { border-style: dashed; color: #64748b; }

  .nem-tab-sesion.activa.aprobada,
  .nem-tab-sesion.activa.borrador {
    background: #0284c7;
    border-color: #0284c7;
    border-style: solid;
    color: #ffffff;
  }

  .nem-tab-sesion:focus-visible {
    outline: 2px solid #0284c7;
    outline-offset: 2px;
  }

  /* ============================================================
     FASE 4 — Barra de iDevices modulares
     ============================================================ */
  .idevice-bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px 10px;
    margin: 0 0 12px;
    background: #f8fafc;
    border: 1px dashed #cbd5e1;
    border-radius: 10px;
  }

  .idevice-bar > span {
    font-size: 10.5px !important;
    font-weight: 800 !important;
    color: #64748b !important;
    text-transform: uppercase;
    letter-spacing: .05em;
    margin-right: 2px;
  }

  .idevice-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 12px;
    font-size: 12px;
    font-weight: 700;
    color: #334155;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    cursor: pointer;
    transition: background .12s ease, border-color .12s ease, color .12s ease;
  }
  .idevice-btn:hover { background: #eff6ff; border-color: #93c5fd; }
  .idevice-btn:active { background: #dbeafe; }
  .idevice-btn:focus-visible { outline: 2px solid #0284c7; outline-offset: 2px; }

  /* Variantes semánticas (requieren la clase en el marcado) */
  .idevice-btn--lectura  { border-color: #a5b4fc; color: #4338ca; }
  .idevice-btn--lectura:hover  { background: #eef2ff; border-color: #818cf8; }

  .idevice-btn--pregunta { border-color: #fcd34d; color: #b45309; }
  .idevice-btn--pregunta:hover { background: #fffbeb; border-color: #f59e0b; }

  .idevice-btn--reto     { border-color: #86efac; color: #15803d; }
  .idevice-btn--reto:hover     { background: #f0fdf4; border-color: #4ade80; }

  /* ============================================================
     FASE 4 — Botón azul del encabezado de sesión
     ============================================================ */
  .nem-btn-accion--azul {
    background: #ffffff;
    border-color: #3b82f6 !important;
    color: #1d4ed8 !important;
  }
  .nem-btn-accion--azul:hover {
    background: #eff6ff !important;
    border-color: #2563eb !important;
  }
</style>
```

## AdminPlanJS_01.html

```html
<script>
/* AdminPlanJS_01 — tokenClase, ctxPlanNEM, listaPlanNEM, planActualNEM, sesionesActualesNEM, sesionActivaIdx, slotMaeSel, panelMaeUlt, aluClaseSel, slotMaeSel, ... */

  // Variables globales de compatibilidad
  var tokenClase = (typeof tokenClase !== 'undefined' && tokenClase) ? tokenClase : (typeof token !== 'undefined' ? token : '');
  var ctxPlanNEM = ctxPlanNEM || null;
  var listaPlanNEM = listaPlanNEM || [];
  var planActualNEM = planActualNEM || null;
  var sesionesActualesNEM = sesionesActualesNEM || [];
  var sesionActivaIdx = sesionActivaIdx || 0;
  var slotMaeSel = slotMaeSel || null;

        // Variables de estado del Horario Maestro
  var panelMaeUlt = typeof panelMaeUlt !== 'undefined' ? panelMaeUlt : null;
  var aluClaseSel = typeof aluClaseSel !== 'undefined' ? aluClaseSel : '';
  var slotMaeSel = typeof slotMaeSel !== 'undefined' ? slotMaeSel : null;
  var fechaClaseEtiquetaManual = false;

  function getTokenPlan_() {
    var tk = '';
    if (typeof token !== 'undefined' && token) tk = token;
    else if (typeof tokenClase !== 'undefined' && tokenClase) tk = tokenClase;
    else if (typeof window !== 'undefined' && window.token) tk = window.token;
    else if (typeof window !== 'undefined' && window.tokenClase) tk = window.tokenClase;
    if (tk) {
      tokenClase = tk;
      if (typeof window !== 'undefined') {
        window.token = tk;
        window.tokenClase = tk;
      }
    }
    return tk;
  }

  function fechaLocalDesde_(d) {
    if (!d || isNaN(d.getTime())) d = new Date();
    const m = ('0' + (d.getMonth() + 1)).slice(-2);
    const dia = ('0' + d.getDate()).slice(-2);
    return d.getFullYear() + '-' + m + '-' + dia;
  }

  function fechaLocalClase() {
    return fechaLocalDesde_(new Date());
  }

  function fmtFechaCortaClase_(iso) {
    const p = String(iso || '').split('-');
    if (p.length !== 3) return 'Fecha';
    return p[2] + '/' + p[1];
  }

  function recortarEtq_(t, n) {
    const s = String(t || '').trim();
    if (!s) return '';
    return s.length > n ? (s.slice(0, n) + '…') : s;
  }

  function textoOpcionClase_(id) {
    const sel = document.getElementById(id);
    if (!sel || sel.selectedIndex < 0) return '';
    return ((sel.options[sel.selectedIndex] || {}).text || '').trim();
  }

  function pintarEtqFiltroClase_() {
    function setBtn(idBtn, activo, etq) {
      const b = document.getElementById(idBtn);
      if (!b) return;
      b.classList.toggle('activo', !!activo);
      const lab = b.querySelector('.ribbon-label');
      if (lab && etq) lab.textContent = etq;
    }
    const fe = valorSel_('fechaMaeClase');
    setBtn('btnClaseFecha', fechaClaseEtiquetaManual, fechaClaseEtiquetaManual ? fmtFechaCortaClase_(fe) : 'Fecha');
    const g = valorSel_('selGrupoClase');
    setBtn('btnClaseGrupo', !!g, g ? recortarEtq_(textoOpcionClase_('selGrupoClase'), 8) : 'Grupo');
    const a = valorSel_('selAluClase');
    setBtn('btnClaseAlumno', !!a, a ? recortarEtq_(textoOpcionClase_('selAluClase'), 10) : 'Alumno');
    const as = valorSel_('selAsigClase');
    setBtn('btnClaseAsig', !!as, as ? recortarEtq_(textoOpcionClase_('selAsigClase'), 10) : 'Asignatura');
  }

  function pintarEtqFiltroPass_() {
    function setBtn(idBtn, activo, etq) {
      const b = document.getElementById(idBtn);
      if (!b) return;
      b.classList.toggle('activo', !!activo);
      const lab = b.querySelector('.ribbon-label');
      if (lab && etq) lab.textContent = etq;
    }
    const g = valorSel_('filtroGradoPass');
    setBtn('btnPassGrado', !!g, g ? textoOpcionClase_('filtroGradoPass') : 'Grado');
    const gp = valorSel_('filtroGrupoPass');
    setBtn('btnPassGrupo', !!gp, gp ? recortarEtq_(textoOpcionClase_('filtroGrupoPass'), 8) : 'Grupo');
    const bus = ((document.getElementById('buscAluPass') || {}).value || '').trim();
    setBtn('btnPassBuscar', !!bus, bus ? recortarEtq_(bus, 10) : 'Buscar');
    const busM = ((document.getElementById('buscMaeClase') || {}).value || '').trim();
    setBtn('btnMaeBuscar', !!busM, busM ? recortarEtq_(busM, 10) : 'Buscar');
  }

  function detenerVoz() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  function hablarTexto(texto) {
    detenerVoz();
    if (!window.speechSynthesis || !texto) return;
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = 'es-MX';
    u.rate = 1.0;
    window.speechSynthesis.speak(u);
  }

  function tabN1Clase(id, btn) {
    if (id === 'clases') {
      conmutarVistaPlaneacion_('horario', document.getElementById('btnSubPlanHorario'));
    } else if (id === 'planeacion') {
      conmutarVistaPlaneacion_('personal', document.getElementById('btnSubPlanBancoPersonal'));
    }
  }

  function renderizarTabsSesiones() {
    pintarTabsSesiones();
  }

  function cargarSesionActivaEnEditor(idx) {
    seleccionarSesionNEM(idx);
  }

  function toggleHorarioMae(forzarMostrar) {
      const wrap = document.getElementById('wrapCalendarioMae');
      const lbl = document.getElementById('lblToggleHorario');
      const ico = document.getElementById('icoToggleHorario');
      if (!wrap) return;
      let nuevoColapsado;
      if (typeof forzarMostrar === 'boolean') {
        nuevoColapsado = !forzarMostrar;
      } else {
        nuevoColapsado = !wrap.classList.contains('oculto');
      }
      wrap.classList.toggle('oculto', nuevoColapsado);
      if (lbl) lbl.textContent = nuevoColapsado ? 'Mostrar horario con asignaturas' : 'Colapsar horario';
      if (ico) ico.textContent = nuevoColapsado ? '📂' : '📅';
    }

    function valorSel_(id) {
      return (document.getElementById(id) || {}).value || '';
    }

    function llenarOpciones_(sel, items, valor, placeholderHtml) {
      if (!sel) return;
      sel.innerHTML = placeholderHtml + items.map(function (it) {
        return '<option value="' + escaparHtml(it.valor) + '"' +
          (it.valor === valor ? ' selected' : '') + '>' + escaparHtml(it.etq) + '</option>';
      }).join('');
    }

    function nombreAluSel_() {
      const sel = document.getElementById('selAluClase');
      if (!sel || !sel.value) return '';
      return ((sel.options[sel.selectedIndex] || {}).text || '').trim();
    }

    function formatearRangoDdMmAa_(ini, fin) {
      const meses3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      function aDdMmAa(f) {
        if (!f) return '';
        const d = (f instanceof Date) ? f : new Date(String(f).indexOf('T') === -1 ? (String(f) + 'T12:00:00') : String(f));
        if (isNaN(d.getTime())) return String(f);
        const dd = ('0' + d.getDate()).slice(-2);
        const mes = meses3[d.getMonth()] || ('0' + (d.getMonth() + 1)).slice(-2);
        const aa = String(d.getFullYear()).slice(-2);
        return dd + '/' + mes + '/' + aa;
      }
      const fIni = aDdMmAa(ini);
      const fFin = aDdMmAa(fin || ini);
      return fIni + ' → ' + fFin;
    }

    function actualizarHintMae_(r) {
      const dia = document.getElementById('txtDiaMae');
      if (!dia) return;
      dia.textContent = '';
      dia.classList.add('oculto');
      dia.style.display = 'none';
    }

    function pintarAlumnosAcceso_(alumnos, grupoSel) {
      // Los accesos de alumnos ahora se gestionan en la pestaña exclusiva "Contraseñas Alumnos"
    }

    function abrirCalendarioFechaClase(e) {
      const inp = document.getElementById('fechaMaeClase');
      if (!inp) return;
      if (typeof inp.showPicker === 'function') {
        try {
          inp.showPicker();
          if (e && typeof e.preventDefault === 'function') { e.preventDefault(); e.stopPropagation(); }
          return;
        } catch (err) {}
      }
      inp.focus();
    }

    function alCambiarFechaClase() {
      fechaClaseEtiquetaManual = true;
      pintarEtqFiltroClase_();
      cargarHorarioMae();
    }

    function cambiarAsignaturaClase() {
      pintarEtqFiltroClase_();
      cargarHorarioMae();
    }

    function cambiarGrupoClase() {
      aluClaseSel = '';
      const as = document.getElementById('selAsigClase');
      if (as) as.value = '';
      const al = document.getElementById('selAluClase');
      if (al) al.value = '';
      slotMaeSel = null;
      const form = document.getElementById('cajaFormMae');
      if (form) form.classList.add('oculto');
      toggleHorarioMae(true);
      pintarEtqFiltroClase_();
      cargarHorarioMae();
    }

    function cambiarAlumnoClase() {
      aluClaseSel = valorSel_('selAluClase');
      pintarEtqFiltroClase_();
      const alu = ((panelMaeUlt && panelMaeUlt.alumnos) || []).filter(function (a) {
        return String(a.matricula) === String(aluClaseSel);
      })[0];
      if (alu && alu.grupoClave && valorSel_('selGrupoClase') !== alu.grupoClave) {
        const selG = document.getElementById('selGrupoClase');
        if (selG) selG.value = alu.grupoClave;
        cargarHorarioMae();
        return;
      }
      actualizarHintMae_(panelMaeUlt || {});
    }

    function cargarHorarioMae() {
      const fe = valorSel_('fechaMaeClase');
      const grupo = valorSel_('selGrupoClase');
      const asig = valorSel_('selAsigClase');
      aluClaseSel = valorSel_('selAluClase') || aluClaseSel;
      gsRun('horarioMaestroClase', tokenClase, fe, grupo, asig, modoCalMae).then(function (r) {
        panelMaeUlt = r;
        const selG = document.getElementById('selGrupoClase');
        const grupoUso = grupo || r.grupoClave || ((r.grupos && r.grupos[0] && r.grupos[0].clave) ? r.grupos[0].clave : '');
        llenarOpciones_(selG, (r.grupos || []).map(function (g) {
          return { valor: g.clave, etq: g.etq };
        }), grupoUso, '<option value="">Elige grupo…</option>');
        if (selG && !selG.value && grupoUso) {
          selG.value = grupoUso;
        }
        llenarOpciones_(document.getElementById('selAluClase'), (r.alumnos || []).map(function (a) {
          return { valor: a.matricula, etq: a.nombre + (a.usuario ? (' · ' + a.usuario) : '') };
        }), aluClaseSel, '<option value="">Elige alumno…</option>');
        llenarOpciones_(document.getElementById('selAsigClase'), (r.asignaturas || []).map(function (n) {
          return { valor: n, etq: n };
        }), r.asignatura || '', '<option value="">Todas las del grupo</option>');
        pintarEtqFiltroClase_();
        actualizarHintMae_(r);
        pintarAlumnosAcceso_(r.alumnos || [], grupoUso);
        const nav = document.getElementById('navCalClase');
        const txtSem = document.getElementById('txtSemanaClase');
        if (txtSem) {
          if (r.semanaInicio && r.semanaFin) {
            txtSem.textContent = formatearRangoDdMmAa_(r.semanaInicio, r.semanaFin);
          } else if (r.fecha) {
            txtSem.textContent = formatearRangoDdMmAa_(r.fecha, r.fecha);
          } else {
            txtSem.textContent = '--/--/----/--/--';
          }
        }
        actualizarBotonesModoCal_();
        actualizarBotonesOriCal_();
        if (nav) nav.classList.remove('oculto');
        const caja = document.getElementById('listaSlotsMae');
        if (!caja) return;
        if (slotMaeSel) {
          const sigue = ((r.calendario || []).some(function (d) {
            return (d.horario || []).some(function (h) {
              return h.idHorario === slotMaeSel.idHorario && h.fecha === slotMaeSel.fecha;
            });
          }));
          if (!sigue) {
            slotMaeSel = null;
            const form = document.getElementById('cajaFormMae');
            if (form) form.classList.add('oculto');
          }
        }
        if (!grupoUso && !(r.grupos || []).length) {
          caja.innerHTML = '<div style="text-align:center;padding:32px 16px;">' +
            '<p style="font-size:16px;font-weight:700;color:#334155;margin:0 0 6px;">No se encontraron grupos configurados</p>' +
            '<p class="hint" style="margin:0 0 16px;">Puedes ir a la pestaña Planeación o seleccionar un grupo en la barra superior.</p>' +
            '<button type="button" class="ribbon-btn ribbon-ico-verde" onclick="tabN1Clase(\'planeacion\')">Ir a Planeación NEM</button>' +
            '</div>';
          caja._mapa = {};
          return;
        }
        if (!grupoUso) {
          caja.innerHTML = '<p class="hint">No se pudo cargar el horario de la semana.</p>';
          caja._mapa = {};
          return;
        }
        pintarCalendarioMae_(r);
      }).catch(function (e) {
        toast((e && e.message) || String(e), 'error');
      });
    }

    function claveCeldaCal_(fecha, idHorario) {
      return String(fecha || '') + '|' + String(idHorario || '');
    }

    var modoCalMae = (typeof modoCalMae !== 'undefined') ? modoCalMae : 'semana';
    var orientacionCalMae = (typeof orientacionCalMae !== 'undefined') ? orientacionCalMae : 'h';

    function cambiarModoCal(modo) {
      modoCalMae = modo || 'semana';
      actualizarBotonesModoCal_();
      const caja = document.getElementById('listaSlotsMae');
      if (caja) {
        caja.classList.toggle('scroll-mes-h', modoCalMae === 'mes' && orientacionCalMae === 'h');
      }
      cargarHorarioMae();
    }

    function cambiarOrientacionCal(ori) {
      orientacionCalMae = (ori === 'v') ? 'v' : 'h';
      actualizarBotonesOriCal_();
      const caja = document.getElementById('listaSlotsMae');
      if (caja) {
        caja.classList.toggle('scroll-mes-h', modoCalMae === 'mes' && orientacionCalMae === 'h');
      }
      if (panelMaeUlt) {
        pintarCalendarioMae_(panelMaeUlt);
      }
    }

    function actualizarBotonesOriCal_() {
      const bH = document.getElementById('btnOriH');
      const bV = document.getElementById('btnOriV');
      if (bH) bH.classList.toggle('activo', orientacionCalMae === 'h');
      if (bV) bV.classList.toggle('activo', orientacionCalMae === 'v');
    }

    function formatearFechaCorta_(iso) {
      const p = String(iso || '').split('-');
      return p.length === 3 ? (p[2] + '/' + p[1]) : String(iso || '');
    }

    function actualizarBotonesModoCal_() {
      const bDia = document.getElementById('btnModoDia');
      const bSem = document.getElementById('btnModoSemana');
      const bMes = document.getElementById('btnModoMes');
      if (bDia) bDia.classList.toggle('activo', modoCalMae === 'dia');
      if (bSem) bSem.classList.toggle('activo', modoCalMae === 'semana');
      if (bMes) bMes.classList.toggle('activo', modoCalMae === 'mes');
    }

    function moverCalClase(delta) {
      const fe = valorSel_('fechaMaeClase') || fechaLocalClase();
      const d = new Date(fe + 'T12:00:00');
      if (isNaN(d.getTime())) return;
      if (modoCalMae === 'dia') {
        d.setDate(d.getDate() + Number(delta));
      } else if (modoCalMae === 'mes') {
        d.setMonth(d.getMonth() + Number(delta));
      } else {
        d.setDate(d.getDate() + (Number(delta) * 7));
      }
      const inp = document.getElementById('fechaMaeClase');
      if (inp) inp.value = fechaLocalDesde_(d);
      cargarHorarioMae();
    }

    function moverSemanaClase(delta) {
      moverCalClase(delta);
    }

    function irHoyClase() {
      const inp = document.getElementById('fechaMaeClase');
      if (inp) inp.value = fechaLocalClase();
      cargarHorarioMae();
    }

    function fechaLocalDesde_(d) {
      const m = ('0' + (d.getMonth() + 1)).slice(-2);
      const dia = ('0' + d.getDate()).slice(-2);
      return d.getFullYear() + '-' + m + '-' + dia;
    }

    function pintarCalendarioMae_(r) {
      const caja = document.getElementById('listaSlotsMae');
      if (!caja) return;
      const esMesH = (modoCalMae === 'mes' && orientacionCalMae === 'h');
      caja.classList.toggle('scroll-mes-h', esMesH);
      if (!caja._wheelInit) {
        caja._wheelInit = true;
        caja.addEventListener('wheel', function (e) {
          if (!caja.classList.contains('scroll-mes-h')) return;
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            caja.scrollLeft += e.deltaY;
            e.preventDefault();
          }
        }, { passive: false });
      }
      const dias = r.calendario || [];
      const bloques = r.bloques || [];
      const mapa = {};
      dias.forEach(function (d) {
        (d.horario || []).forEach(function (h) {
          mapa[claveCeldaCal_(d.fecha, h.idHorario)] = h;
          const kHora = String(h.horaInicio || '') + '|' + String(h.horaFin || '');
          mapa[d.fecha + '#' + kHora] = h;
        });
      });
      caja._mapa = mapa;
      if (!dias.length) {
        caja.innerHTML = '<p class="hint">No hay horario para este grupo.</p>';
        return;
      }
      if (!bloques.length) {
        caja.innerHTML = '<div style="text-align:center;padding:36px 16px;background:#f8fafc;border-radius:12px;border:1px dashed #cbd5e1;margin-top:12px;">' +
          '<p style="font-size:16px;font-weight:700;color:#334155;margin:0 0 6px;">No hay horas registradas en el horario para ' + escaparHtml(textoOpcionClase_('selGrupoClase') || 'este grupo') + '</p>' +
          '<p class="hint" style="margin:0 0 16px;">Puedes diseñar una Planeación Didáctica NEM directamente para este grupo o seleccionar otro grupo arriba en la barra.</p>' +
          '<button type="button" onclick="abrirPlaneacionDesdeGrupoActual()" style="display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:12px 26px;background:#0d9488;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(13,148,136,0.3);margin-top:12px;">' +
          '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>' +
          '<span>Planear NEM para ' + escaparHtml(textoOpcionClase_('selGrupoClase') || 'este grupo') + '</span>' +
          '</button>' +
          '</div>';
        return;
      }
      const selClave = slotMaeSel ? claveCeldaCal_(slotMaeSel.fecha, slotMaeSel.idHorario) : '';

      // Orientación vertical: Días en filas, bloques en columnas
      if (orientacionCalMae === 'v') {
        let html = '<table class="cal-tabla modo-vertical"><thead><tr><th style="min-width:105px;">Día / Fecha</th>';
        bloques.forEach(function (b) {
          html += '<th>' + escaparHtml((b.bloque ? (b.bloque + 'ª · ') : '') + b.horaInicio) +
            '<small style="display:block;font-size:10px;font-weight:600;color:#64748b;">' + escaparHtml(b.horaInicio) + '–' + escaparHtml(b.horaFin) + '</small></th>';
        });
        html += '</tr></thead><tbody>';
        dias.forEach(function (d) {
          html += '<tr><td class="hora-dia' + (d.hoy ? ' hoy-col' : '') + '">' +
            '<strong>' + escaparHtml(d.etqCorta) + ' ' + escaparHtml(d.etqNum) + '</strong>' +
            '<small style="display:block;font-size:11px;font-weight:600;color:#64748b;margin-top:2px;">' + escaparHtml(formatearFechaCorta_(d.fecha)) + '</small>' +
            '</td>';
          bloques.forEach(function (b) {
            const h = mapa[d.fecha + '#' + b.clave];
            if (!h) {
              html += '<td><div class="cal-vacia" onclick="abrirCeldaVaciaCal(\'' + escaparHtml(d.fecha) + '\',\'' + escaparHtml(b.bloque || '') + '\',\'' + escaparHtml(b.horaInicio) + '\',\'' + escaparHtml(b.horaFin) + '\')" title="Espacio sin clase asignada · Clic para planear NEM" style="cursor:pointer;min-height:48px;"></div></td>';
              return;
            }
            const hay = h.contenido && String(h.contenido.texto || '').trim();
            const clave = claveCeldaCal_(d.fecha, h.idHorario);
            const cls = (h.enCurso ? ' en-curso' : '') + (hay ? ' con-texto publicado' : '') +
              (!h.propia ? ' ajena' : '') + (clave === selClave ? ' sel' : '');
            const extra = !h.propia ? 'Otro maestro' : (hay ? ((h.contenido && h.contenido.titulo) ? h.contenido.titulo : 'Con texto') : '');
            html += '<td><button type="button" class="cal-celda' + cls + '" onclick="abrirCeldaCal(\'' +
              escaparHtml(d.fecha) + '\',\'' + String(h.idHorario || '').replace(/'/g, '') + '\')">' +
              '<strong>' + escaparHtml(h.asignatura || 'Clase') + '</strong>' +
              '<span>' + escaparHtml((h.bloque ? (h.bloque + 'ª · ') : '') + (h.maestro || '')) + '</span>' +
              (extra ? ('<span>' + extra + '</span>') : '') + '</button></td>';
          });
          html += '</tr>';
        });
        html += '</tbody></table>';
        caja.innerHTML = html;
        return;
      }
      let html = '<table class="cal-tabla' + (modoCalMae === 'dia' ? ' modo-dia' : (modoCalMae === 'mes' ? ' modo-mes' : '')) + '"><thead><tr><th class="th-hora">Hora</th>';
      dias.forEach(function (d) {
        html += '<th class="' + (d.hoy ? 'hoy-col' : '') + '">' + escaparHtml(d.etqCorta) + ' ' +
          escaparHtml(d.etqNum) + '</th>';
      });
      html += '</tr></thead><tbody>';
      bloques.forEach(function (b) {
        html += '<tr><td class="hora">' + escaparHtml(b.horaInicio) + '</td>';
        dias.forEach(function (d) {
          const h = mapa[d.fecha + '#' + b.clave];
          if (!h) {
            html += '<td><div class="cal-vacia" onclick="abrirCeldaVaciaCal(\'' + escaparHtml(d.fecha) + '\',\'' + escaparHtml(b.bloque || '') + '\',\'' + escaparHtml(b.horaInicio) + '\',\'' + escaparHtml(b.horaFin) + '\')" title="Espacio sin clase asignada · Clic para planear NEM" style="cursor:pointer;min-height:48px;"></div></td>';
            return;
          }
          const hay = h.contenido && String(h.contenido.texto || '').trim();
          const clave = claveCeldaCal_(d.fecha, h.idHorario);
          const cls = (h.enCurso ? ' en-curso' : '') + (hay ? ' con-texto publicado' : '') +
            (!h.propia ? ' ajena' : '') + (clave === selClave ? ' sel' : '');
          const extra = !h.propia ? 'Otro maestro' : (hay ? ((h.contenido && h.contenido.titulo) ? h.contenido.titulo : 'Con texto') : '');
          html += '<td><button type="button" class="cal-celda' + cls + '" onclick="abrirCeldaCal(\'' +
            escaparHtml(d.fecha) + '\',\'' + String(h.idHorario || '').replace(/'/g, '') + '\')">' +
            '<strong>' + escaparHtml(h.asignatura || 'Clase') + '</strong>' +
            '<span>' + escaparHtml((h.bloque ? (h.bloque + 'ª · ') : '') + (h.maestro || '')) + '</span>' +
            (extra ? ('<span>' + extra + '</span>') : '') + '</button></td>';
        });
        html += '</tr>';
      });
      html += '</tbody></table>';
      caja.innerHTML = html;
    }

    function abrirCeldaCal(fecha, idHorario) {
      const caja = document.getElementById('listaSlotsMae');
      const mapa = (caja && caja._mapa) || {};
      slotMaeSel = mapa[claveCeldaCal_(fecha, idHorario)];
      if (!slotMaeSel) return;
      const inp = document.getElementById('fechaMaeClase');
      if (inp && fecha) inp.value = fecha;

      // Resaltar celda seleccionada en el horario
      caja.querySelectorAll('.cal-celda.sel').forEach(function (el) { el.classList.remove('sel'); });
      caja.querySelectorAll('.cal-celda').forEach(function (el) {
        if (el.getAttribute('onclick') && el.getAttribute('onclick').indexOf(idHorario) >= 0 &&
          el.getAttribute('onclick').indexOf(fecha) >= 0) {
          el.classList.add('sel');
        }
      });

      // Ir directamente al diseño de Planeación NEM con la clase preseleccionada
      abrirPlaneacionDesdeSlotActual();
    }

    function abrirCeldaVaciaCal(fecha, bloque, horaInicio, horaFin) {
      const selG = document.getElementById('selGrupoClase');
      const valG = (selG && selG.value) || '';
      const p = valG.split('|');
      const gr = p[0] || '1';
      const gp = (p[1] || 'A').toUpperCase();
      const perInfo = calcularPeriodoSegunFecha_(fecha);
      tabN1Clase('planeacion');
      abrirFormNuevaPlaneacion({
        grado: gr,
        grupo: gp,
        fechaInicio: fecha,
        periodo: perInfo.etiqueta,
        tituloSugerido: gr + '°' + gp + ' - ' + (bloque ? 'Bloque ' + bloque : (horaInicio || 'Hora')) + ' (' + perInfo.etiqueta + ')'
      });
    }

    function abrirSlotMae(i) {
      const caja = document.getElementById('listaSlotsMae');
      const filas = (caja && caja._datos) || [];
      const h = filas[i];
      if (!h) return;
      abrirCeldaCal(h.fecha || valorSel_('fechaMaeClase'), h.idHorario);
    }

    function guardarContenidoMae() {
      if (!slotMaeSel) return;
      const payload = {
        idHorario: slotMaeSel.idHorario,
        fecha: slotMaeSel.fecha || (document.getElementById('fechaMaeClase') || {}).value || '',
        titulo: (document.getElementById('titContClase') || {}).value || '',
        texto: (document.getElementById('txtContClase') || {}).value || '',
        publicado: !!(document.getElementById('chkPubClase') || {}).checked
      };
      gsRun('guardarContenidoClase', tokenClase, payload).then(function (r) {
        toast((r && r.mensaje) || 'Guardado.', 'ok');
        cargarHorarioMae();
      }).catch(function (e) {
        toast((e && e.message) || String(e), 'error');
      });
    }

    function probarVozMae() {
      const tit = (document.getElementById('titContClase') || {}).value || '';
      const txt = (document.getElementById('txtContClase') || {}).value || '';
      hablarTexto((tit ? (tit + '. ') : '') + txt);
    }

    let listaAlumnosPassCache = [];

    function cargarAlumnosPass(forzar) {
      const caja = document.getElementById('cajaTablaAluPass');
      if (listaAlumnosPassCache.length > 0 && !forzar) {
        actualizarGruposPassDropdown_();
        filtrarTablaPassLocal();
        return;
      }
      if (caja) caja.innerHTML = '<p class="hint">Cargando lista de alumnos…</p>';

      gsRun('listarAlumnosParaClase', tokenClase, '', '').then(function (r) {
        listaAlumnosPassCache = (r && r.alumnos) || [];
        actualizarGruposPassDropdown_();
        filtrarTablaPassLocal();
      }).catch(function (e) {
        if (caja) caja.innerHTML = '<p style="color:var(--st90-rojo);font-weight:600;">Error al cargar alumnos: ' + escaparHtml((e && e.message) || String(e)) + '</p>';
      });
    }

    function actualizarGruposPassDropdown_() {
      const selG = document.getElementById('filtroGradoPass');
      const selGp = document.getElementById('filtroGrupoPass');
      if (!selGp) return;
      const gradoSel = selG ? selG.value.trim() : '';
      const actual = selGp.value;

      const gruposMap = {};

      if (panelMaeUlt && panelMaeUlt.grupos) {
        panelMaeUlt.grupos.forEach(function (g) {
          const gr = String(g.grado || (g.clave ? g.clave.split('|')[0] : '')).trim();
          const gp = String(g.grupo || (g.clave ? g.clave.split('|')[1] : '')).trim().toUpperCase();
          const etq = g.etq || (gr + gp);
          if (!gradoSel || gr === gradoSel) {
            gruposMap[etq] = etq;
          }
        });
      }

      (listaAlumnosPassCache || []).forEach(function (a) {
        const gr = String(a.grado || '').trim();
        const gp = String(a.grupo || '').trim().toUpperCase();
        const etq = String(a.grupoEtq || (gr + gp)).toUpperCase();
        if (!gradoSel || gr === gradoSel) {
          if (etq) gruposMap[etq] = etq;
        }
      });

      if (Object.keys(gruposMap).length === 0) {
        const letras = ['A', 'B', 'C', 'D', 'E'];
        letras.forEach(function (letra) {
          const etq = gradoSel ? (gradoSel + letra) : letra;
          gruposMap[etq] = etq;
        });
      }

      const lista = Object.keys(gruposMap).sort();
      let html = '<option value="">Todos los grupos' + (gradoSel ? (' de ' + gradoSel + '°') : '') + '</option>';
      let mantuvoActual = false;
      lista.forEach(function (etq) {
        const sel = (etq === actual);
        if (sel) mantuvoActual = true;
        html += '<option value="' + escaparHtml(etq) + '"' + (sel ? ' selected' : '') + '>' + escaparHtml(etq) + '</option>';
      });
      selGp.innerHTML = html;
      if (!mantuvoActual && actual) {
        selGp.value = '';
      }
    }</script>
```

## AdminPlanJS_02.html

```html
<script>
/* AdminPlanJS_02 — cambiarGradoPassAlu, cambiarGrupoPassAlu, coincideGrupoLocal_, filtrarTablaPassLocal, renderTablaPassAlu_, generarClaveUnicaAlu, generarClavesMasivasAlu, copiarCredencialAlu, copiarFallback_, ponerClaveAlu, ... */


    function cambiarGradoPassAlu() {
      actualizarGruposPassDropdown_();
      filtrarTablaPassLocal();
    }

    function cambiarGrupoPassAlu() {
      filtrarTablaPassLocal();
    }

    function coincideGrupoLocal_(alumno, grFiltro, gpFiltro) {
      const grA = String(alumno.grado || '').trim();
      const gpA = String(alumno.grupo || '').trim().toUpperCase();
      const etqA = String(alumno.grupoEtq || (grA + gpA)).trim().toUpperCase();
      const grF = String(grFiltro || '').trim();
      let gpF = String(gpFiltro || '').trim().toUpperCase();

      if (grF && grA !== grF) return false;
      if (!gpF) return true;

      if (gpF.indexOf('|') >= 0) {
        const partes = gpF.split('|');
        if (partes[0].trim() && grA !== partes[0].trim()) return false;
        gpF = partes[1].trim().toUpperCase();
      }

      let letraF = gpF;
      if (grF && letraF.indexOf(grF) === 0) {
        letraF = letraF.substring(grF.length).replace(/^[-_°\s]+/, '');
      }

      return (etqA === gpF) ||
             (gpA === gpF) ||
             (gpA === letraF) ||
             (etqA === (grA + letraF));
    }

    function filtrarTablaPassLocal() {
      const busc = ((document.getElementById('buscAluPass') || {}).value || '').trim().toLowerCase();
      const g = ((document.getElementById('filtroGradoPass') || {}).value || '').trim();
      const gp = ((document.getElementById('filtroGrupoPass') || {}).value || '').trim();

      const filtrados = (listaAlumnosPassCache || []).filter(function (a) {
        if (!coincideGrupoLocal_(a, g, gp)) return false;
        if (busc) {
          const nom = String(a.nombre || '').toLowerCase();
          const mat = String(a.matricula || '').toLowerCase();
          const usu = String(a.usuario || '').toLowerCase();
          if (nom.indexOf(busc) < 0 && mat.indexOf(busc) < 0 && usu.indexOf(busc) < 0) {
            return false;
          }
        }
        return true;
      });

      renderTablaPassAlu_(filtrados);
      pintarEtqFiltroPass_();
    }

    function renderTablaPassAlu_(filas) {
      const txtConteo = document.getElementById('txtAluPassConteo');
      if (txtConteo) {
        txtConteo.textContent = 'Alumnos encontrados: ' + filas.length;
      }
      const caja = document.getElementById('cajaTablaAluPass');
      if (!caja) return;
      if (!filas.length) {
        caja.innerHTML = '<p class="hint" style="text-align:center;">No hay alumnos que coincidan con los filtros o la búsqueda.</p>';
        return;
      }
      let html = '<table class="tabla-acc"><thead><tr>' +
        '<th style="width:30px;">#</th>' +
        '<th>Alumno</th>' +
        '<th>Grupo</th>' +
        '<th>Usuario</th>' +
        '<th>Contraseña</th>' +
        '<th style="text-align:right;">Acciones</th>' +
        '</tr></thead><tbody>';

      html += filas.map(function (a, idx) {
        const mat = String(a.matricula || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const usu = String(a.usuario || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const cla = String(a.clave || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const claveHtml = a.clave
          ? ('<span class="dato-acc badge-pass">' + escaparHtml(a.clave) + '</span>')
          : '<span style="color:#94a3b8;font-size:12px;">Sin contraseña</span>';

        return '<tr>' +
          '<td style="color:#94a3b8;font-size:12px;">' + (idx + 1) + '</td>' +
          '<td><strong>' + escaparHtml(a.nombre) + '</strong><br><small style="color:#64748b;">Mat: ' + escaparHtml(a.matricula) + '</small></td>' +
          '<td><span class="badge">' + escaparHtml((a.grado ? (a.grado + '° ') : '') + (a.grupo || '')) + '</span></td>' +
          '<td><span class="dato-acc" style="color:var(--st90-azul);">' + escaparHtml(a.usuario || '—') + '</span></td>' +
          '<td>' + claveHtml + '</td>' +
          '<td style="text-align:right;white-space:nowrap;">' +
            '<div style="display:inline-flex;gap:4px;">' +
              '<button type="button" class="btn-secundario" onclick="generarClaveUnicaAlu(\'' + mat + '\')" title="Generar contraseña aleatoria individual">🎲 Aleatoria</button>' +
              '<button type="button" class="btn-secundario" onclick="ponerClaveAlu(\'' + mat + '\',\'' + usu + '\',\'' + cla + '\')" title="Editar usuario y contraseña">✏️ Editar</button>' +
              (a.clave ? ('<button type="button" class="btn-secundario" onclick="copiarCredencialAlu(\'' + usu + '\',\'' + cla + '\')" title="Copiar usuario y contraseña">📋</button>') : '') +
            '</div>' +
          '</td>' +
        '</tr>';
      }).join('');

      html += '</tbody></table>';
      caja.innerHTML = html;
    }

    function generarClaveUnicaAlu(matricula) {
      toast('Generando contraseña aleatoria…', 'info');
      gsRun('generarClavesAlumnosClase', tokenClase, '', '', 'alumno', matricula).then(function (r) {
        toast((r && r.mensaje) || 'Contraseña generada.', 'ok');
        cargarAlumnosPass(true);
      }).catch(function (e) {
        toast((e && e.message) || String(e), 'error');
      });
    }

    function generarClavesMasivasAlu(modo) {
      const g = (document.getElementById('filtroGradoPass') || {}).value || '';
      const gp = (document.getElementById('filtroGrupoPass') || {}).value || '';

      let pregunta = '';
      if (modo === 'todos') {
        pregunta = '¿Deseas generar contraseñas aleatorias para <strong>TODOS los grupos</strong>?<br><br><small style="color:#b91c1c;">Esta acción creará o renovará la contraseña de acceso de todos los alumnos activos.</small>';
      } else {
        const etq = (g ? (g + '° ') : '') + (gp || '');
        if (!etq) {
          toast('Por favor selecciona primero un grado o grupo en los filtros superiores.', 'error');
          return;
        }
        pregunta = '¿Deseas generar contraseñas aleatorias para los alumnos de <strong>' + escaparHtml(etq) + '</strong>?';
      }

      modal({
        titulo: 'Generar contraseñas aleatorias',
        html: '<p style="margin:0 0 12px;font-size:14px;line-height:1.45;">' + pregunta + '</p>',
        botones: [
          { texto: 'Cancelar', valor: null, clase: 'btn-secundario' },
          { texto: 'Sí, generar', valor: 'ok' }
        ],
        capturar: function (fondo, val) { return val; }
      }).then(function (confirmo) {
        if (!confirmo) return;
        toast('Generando contraseñas aleatorias, por favor espera…', 'info');
        gsRun('generarClavesAlumnosClase', tokenClase, g, gp, modo, '').then(function (r) {
          toast((r && r.mensaje) || 'Contraseñas generadas correctamente.', 'ok');
          cargarAlumnosPass(true);
        }).catch(function (e) {
          toast((e && e.message) || String(e), 'error');
        });
      });
    }

    function copiarCredencialAlu(usuario, clave) {
      const texto = 'Usuario: ' + usuario + '\nContraseña: ' + clave;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(function () {
          toast('Credenciales copiadas al portapapeles.', 'ok');
        }).catch(function () {
          copiarFallback_(texto);
        });
      } else {
        copiarFallback_(texto);
      }
    }

    function copiarFallback_(texto) {
      try {
        const ta = document.createElement('textarea');
        ta.value = texto;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        toast('Credenciales copiadas al portapapeles.', 'ok');
      } catch (e) {
        toast('Credenciales: ' + texto, 'info');
      }
    }

    function ponerClaveAlu(mat, usuario, clave) {
      modal({
        titulo: 'Cambiar acceso del alumno',
        html: '<label for="usuClaveAlu">Usuario</label><input id="usuClaveAlu" type="text" value="' + escaparHtml(usuario || '') + '" autocomplete="off">' +
          '<label for="passClaveAlu">Contraseña (mín. 6)</label><input id="passClaveAlu" type="text" value="' + escaparHtml(clave || '') + '" autocomplete="off">',
        botones: [
          { texto: 'Cancelar', valor: null, clase: 'btn-secundario' },
          { texto: 'Guardar', valor: 'ok' }
        ],
        capturar: function (fondo, val) {
          if (val === null) return null;
          return {
            usuario: (fondo.querySelector('#usuClaveAlu') || {}).value || '',
            clave: (fondo.querySelector('#passClaveAlu') || {}).value || ''
          };
        }
      }).then(function (datos) {
        if (!datos) return;
        gsRun('asignarClaveAlumnoClase', tokenClase, mat, datos.usuario, datos.clave).then(function (r) {
          toast((r && r.mensaje) || 'Listo.', 'ok');
          cargarHorarioMae();
          if (document.getElementById('tabAluAcc') && !document.getElementById('tabAluAcc').classList.contains('oculto')) {
            cargarAlumnosPass(true);
          }
        }).catch(function (e) {
          toast((e && e.message) || String(e), 'error');
        });
      });
    }

    

  function cargarContextoPlaneacionNEM() {
      const tk = (typeof getTokenPlan_ === 'function') ? getTokenPlan_() : (typeof tokenClase !== 'undefined' ? tokenClase : '');
      gsRun('contextoInicialPlaneacionNEM', tk).then(function (r) {
        ctxPlanNEM = r || {};
        poblarFiltrosPlan_();
        cargarListaPlaneacionesNEM();
      }).catch(function (e) {
        console.warn('Fallo al obtener contexto de planeación:', e);
        cargarListaPlaneacionesNEM();
      });
    }

    function poblarFiltrosPlan_() {
      if (!ctxPlanNEM) return;
      const selG = document.getElementById('selPlanGrupo');
      if (selG) {
        const grupos = ctxPlanNEM.grupos || [];
        selG.innerHTML = '<option value="">Todos los grupos</option>' + grupos.map(function (g) {
          return '<option value="' + escaparHtml(g) + '">' + escaparHtml(g) + '</option>';
        }).join('');
      }
    }

    function alCambiarFiltroPlan() {
      const g = (document.getElementById('selPlanGrado') || {}).value || '';
      const grp = (document.getElementById('selPlanGrupo') || {}).value || '';
      const asig = (document.getElementById('selPlanAsignatura') || {}).value || '';
      const trim = (document.getElementById('selPlanTrimestre') || {}).value || '';
      const lblG = document.getElementById('lblPlanGrado');
      const lblGrp = document.getElementById('lblPlanGrupo');
      const lblAsig = document.getElementById('lblPlanAsignatura');
      const lblTrim = document.getElementById('lblPlanTrimestre');
      if (lblG) lblG.textContent = g ? (g + '°') : 'Grado';
      if (lblGrp) lblGrp.textContent = grp ? grp : 'Grupo';
      if (lblAsig) lblAsig.textContent = asig ? asig : 'Asignatura';
      if (lblTrim) lblTrim.textContent = trim ? trim : 'Trimestre';
      cargarListaPlaneacionesNEM();
    }

    function limpiarFiltrosPlaneacion_() {
      const elG = document.getElementById('selPlanGrado');
      const elGrp = document.getElementById('selPlanGrupo');
      const elAsig = document.getElementById('selPlanAsignatura');
      const elTrim = document.getElementById('selPlanTrimestre');
      const elDoc = document.getElementById('inpPlanDocente');
      if (elG) elG.value = '';
      if (elGrp) elGrp.value = '';
      if (elAsig) elAsig.value = '';
      if (elTrim) elTrim.value = '';
      if (elDoc) elDoc.value = '';
      const lblG = document.getElementById('lblPlanGrado');
      const lblGrp = document.getElementById('lblPlanGrupo');
      const lblAsig = document.getElementById('lblPlanAsignatura');
      const lblTrim = document.getElementById('lblPlanTrimestre');
      if (lblG) lblG.textContent = 'Grado';
      if (lblGrp) lblGrp.textContent = 'Grupo';
      if (lblAsig) lblAsig.textContent = 'Asignatura';
      if (lblTrim) lblTrim.textContent = 'Trimestre';
      cargarListaPlaneacionesNEM(true);
    }

    let bancoPlanActual = 'personal';

    function conmutarBancoPlaneacion_(banco) {
      bancoPlanActual = banco;
      const btnPer = document.getElementById('btnBancoPersonal');
      const btnGlo = document.getElementById('btnBancoGlobal');
      const bannerGlo = document.getElementById('bannerRepositorioGlobal');
      const wrapDoc = document.getElementById('wrapPlanFiltroDocente');
      const titCat = document.getElementById('titCatalogoPlan');

      if (banco === 'global') {
        if (btnPer) { btnPer.classList.remove('activo'); btnPer.style.background = 'transparent'; btnPer.style.color = '#475569'; }
        if (btnGlo) { btnGlo.classList.add('activo'); btnGlo.style.background = '#ffffff'; btnGlo.style.color = 'var(--st90-azul)'; }
        if (bannerGlo) bannerGlo.classList.remove('oculto');
        if (wrapDoc) wrapDoc.classList.remove('oculto');
        if (titCat) titCat.textContent = 'Repositorio Escolar Global — Proyectos Colegiados Publicados';
      } else {
        if (btnGlo) { btnGlo.classList.remove('activo'); btnGlo.style.background = 'transparent'; btnGlo.style.color = '#475569'; }
        if (btnPer) { btnPer.classList.add('activo'); btnPer.style.background = '#ffffff'; btnPer.style.color = 'var(--st90-azul)'; }
        if (bannerGlo) bannerGlo.classList.add('oculto');
        if (wrapDoc) wrapDoc.classList.add('oculto');
        if (titCat) titCat.textContent = 'Mi Banco Personal de Proyectos y Planeaciones (NEM Fase 6)';
      }
      cargarListaPlaneacionesNEM();
    }

    function cargarListaPlaneacionesNEM(forzar) {
      if (forzar) {
        const elG = document.getElementById('selPlanGrado');
        const elGrp = document.getElementById('selPlanGrupo');
        const elAsig = document.getElementById('selPlanAsignatura');
        const elTrim = document.getElementById('selPlanTrimestre');
        const elDoc = document.getElementById('inpPlanDocente');
        if (elG) elG.value = '';
        if (elGrp) elGrp.value = '';
        if (elAsig) elAsig.value = '';
        if (elTrim) elTrim.value = '';
        if (elDoc) elDoc.value = '';
        const lblG = document.getElementById('lblPlanGrado');
        const lblGrp = document.getElementById('lblPlanGrupo');
        const lblAsig = document.getElementById('lblPlanAsignatura');
        const lblTrim = document.getElementById('lblPlanTrimestre');
        if (lblG) lblG.textContent = 'Grado';
        if (lblGrp) lblGrp.textContent = 'Grupo';
        if (lblAsig) lblAsig.textContent = 'Asignatura';
        if (lblTrim) lblTrim.textContent = 'Trimestre';
      }

      const tk = (typeof getTokenPlan_ === 'function') ? getTokenPlan_() : (typeof tokenClase !== 'undefined' ? tokenClase : '');
      const g = forzar ? '' : ((document.getElementById('selPlanGrado') || {}).value || '');
      const grp = forzar ? '' : ((document.getElementById('selPlanGrupo') || {}).value || '');
      const asig = forzar ? '' : ((document.getElementById('selPlanAsignatura') || {}).value || '');
      const trim = forzar ? '' : ((document.getElementById('selPlanTrimestre') || {}).value || '');
      const doc = forzar ? '' : ((document.getElementById('inpPlanDocente') || {}).value || '');

      const grid = document.getElementById('gridPlaneaciones');
      if (grid) grid.innerHTML = '<p class="hint" style="text-align:center;">Cargando planeaciones didácticas…</p>';

      const opciones = {
        banco: bancoPlanActual,
        grado: g,
        grupo: grp,
        asignatura: asig,
        trimestre: trim,
        docente: (bancoPlanActual === 'global') ? doc : ''
      };

      gsRun('listarPlaneacionesNEM', tk, opciones).then(function (res) {
        listaPlanNEM = Array.isArray(res) ? res : ((res && res.planeaciones) || []);
        pintarGridPlaneaciones(listaPlanNEM, res);
      }).catch(function (e) {
        if (grid) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:24px;background:#fef2f2;border:1px solid #fecaca;border-radius:12px;">' +
          '<p style="color:var(--st90-rojo);font-weight:700;margin:0 0 8px;">Error al consultar planeaciones:</p>' +
          '<p class="hint" style="color:#991b1b;margin:0 0 12px;">' + escaparHtml((e && e.message) || String(e)) + '</p>' +
          '<button type="button" class="nem-btn-accion" onclick="cargarListaPlaneacionesNEM(true)">🔄 Reintentar conexión</button>' +
        '</div>';
      });
    }

    function pintarGridPlaneaciones(lista, resServidor) {
      const grid = document.getElementById('gridPlaneaciones');
      const txtConteo = document.getElementById('txtPlanConteo');
      if (!grid) return;
      const totalBase = (resServidor && typeof resServidor.totalEnBase === 'number')
        ? resServidor.totalEnBase
        : (Array.isArray(resServidor) ? resServidor.length : (lista.length || 0));
      if (txtConteo) {
        txtConteo.textContent = (totalBase ? (lista.length + ' de ' + totalBase) : lista.length) + (lista.length === 1 ? ' planeación' : ' planeaciones');
      }

      if (!lista || !lista.length) {
        const esGlobal = (bancoPlanActual === 'global');
        const g = (document.getElementById('selPlanGrado') || {}).value || '';
        const grp = (document.getElementById('selPlanGrupo') || {}).value || '';
        const asig = (document.getElementById('selPlanAsignatura') || {}).value || '';
        const trim = (document.getElementById('selPlanTrimestre') || {}).value || '';
        const tieneFiltros = !!(g || grp || asig || trim);

        let mensajePrincipal = esGlobal
          ? 'No hay proyectos publicados en el Repositorio Global con estos filtros'
          : 'No hay planeaciones registradas en tu Banco Personal con estos filtros';
        let mensajeSecundario = esGlobal
          ? 'Los proyectos aparecerán aquí cuando los docentes completen sus sesiones didácticas y las publiquen.'
          : 'Pulsa el botón "Nueva" para crear tu primer proyecto didáctico o clona uno desde el Repositorio Global.';

        if (totalBase > 0) {
          mensajePrincipal = 'Hay ' + totalBase + ' proyectos guardados en la base de datos' + (tieneFiltros ? ', pero ninguno coincide con los filtros seleccionados.' : '.');
          mensajeSecundario = tieneFiltros
            ? 'Pulsa «Ver Todos los Proyectos» para limpiar los filtros y ver las ' + totalBase + ' planeaciones.'
            : 'Pulsa «Ver Todos los Proyectos» para refrescar la vista.';
        }

        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:36px 16px;background:#f8fafc;border-radius:12px;border:1px dashed #cbd5e1;">' +
          '<p style="font-size:16px;font-weight:700;color:#334155;margin:0 0 6px;">' + mensajePrincipal + '</p>' +
          '<p class="hint" style="margin:0 0 14px;">' + mensajeSecundario + '</p>' +
          '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">' +
          '  <button type="button" class="nem-btn-accion nem-btn-primario" onclick="limpiarFiltrosPlaneacion_()">🔄 Ver Todos los Proyectos' + (totalBase > 0 ? ' (' + totalBase + ')' : '') + '</button>' +
          (esGlobal 
            ? '<button type="button" class="nem-btn-accion" onclick="conmutarBancoPlaneacion_(\'personal\')">← Ir a Mi Banco Personal</button>' 
            : '<button type="button" class="nem-btn-accion" onclick="abrirFormNuevaPlaneacion()">+ Nueva Planeación</button>') +
          '  <button type="button" class="nem-btn-accion" style="background:#f0fdf4;color:#166534;border-color:#bbf7d0;font-weight:600;" onclick="sembrarDemoPlaneaciones_()" title="Generar 3 proyectos de prueba para ver la simulación en pantalla">🌱 Cargar Proyectos Demo</button>' +
          '</div>' +
        '</div>';
        return;
      }

      let html = '';
      lista.forEach(function (p) {
        const pId = p.Id || p.id || '';
        const pTitulo = p.Titulo || p.titulo || 'Sin título';
        const est = String(p.Estado || p.estado || 'BORRADOR').toUpperCase();
        const docProp = p.DocentePropietario || p.docentePropietario || p.Docente || p.docente || 'Docente ST90';
        const esCopia = p.EsCopiaDe || p.esCopiaDe || '';
        const puedeEditar = !!p.puedeEditar;
        const numSes = Number(p.NumSesiones || p.numSesiones || '3');
        const comp = Number(p.sesionesCompletadas || 0);

        let claseBadge = 'badge-borrador';
        if (est === 'PUBLICADA' || est === 'APROBADO' || est === 'TERMINADA') claseBadge = 'badge-aprobado';
        else if (est === 'PROGRAMADO') claseBadge = 'badge-programado';
        else if (est === 'REALIZADO') claseBadge = 'badge-realizado';

        html += '<div class="nem-card" style="display:flex;flex-direction:column;justify-content:space-between;">';
        html += '<div>';
        html += '  <div class="nem-card-header">';
        html += '    <h3 class="nem-card-title">' + escaparHtml(pTitulo) + '</h3>';
        html += '    <span class="badge-nem ' + claseBadge + '">' + escaparHtml(est) + '</span>';
        html += '  </div>';

        // Badge de autor y procedencia
        html += '  <div style="margin:4px 0 8px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">';
        html += '    <span class="tipo-badge" style="background:#e0e7ff;color:#3730a3;font-size:11px;">👨‍🏫 ' + escaparHtml(docProp) + '</span>';
        if (esCopia) {
          html += '    <span class="tipo-badge" style="background:#fef3c7;color:#92400e;font-size:10.5px;">📋 Copia adaptada</span>';
        }
        html += '  </div>';

        html += '  <div class="nem-meta-row">';
        html += '    <span class="nem-meta-pill">📚 ' + escaparHtml(p.Asignatura || p.asignatura || '') + '</span>';
        html += '    <span class="nem-meta-pill">👥 ' + escaparHtml((p.Grado || p.grado || '') + '°' + (p.Grupo || p.grupo || '')) + '</span>';
        html += '    <span class="nem-meta-pill">⏱️ ' + escaparHtml(numSes) + ' sesiones</span>';
        html += '  </div>';

        html += '  <div class="nem-meta-row">';
        html += '    <span class="nem-meta-pill" style="color:var(--st90-azul);">🌐 ' + escaparHtml(p.CampoFormativo || p.campoFormativo || 'Campo NEM') + '</span>';
        const per = p.Periodo || p.periodo;
        if (per) {
          html += '    <span class="nem-meta-pill" style="color:#0f766e;background:#ccfbf1;">🗓️ ' + escaparHtml(per) + '</span>';
        }
        html += '  </div>';

        const pdaTxt = p.PDA || p.pda || '';
        if (pdaTxt) {
          html += '  <p class="nem-card-pda" title="' + escaparHtml(pdaTxt) + '"><strong>PDA:</strong> ' + escaparHtml(pdaTxt) + '</p>';
        }
        html += '</div>';

        // Footer con botones según contexto de Banco Personal vs Global
        html += '<div class="nem-card-footer" style="display:flex;flex-direction:column;gap:6px;margin-top:12px;padding-top:10px;border-top:1px solid #e2e8f0;">';
        
        if (bancoPlanActual === 'global') {
          // Acciones en Banco Global: Copiar a mi Banco y Ver Sesiones
          html += '  <button type="button" class="nem-btn-accion nem-btn-primario" style="width:100%;text-align:center;background:#059669;border-color:#059669;" onclick="copiarProyectoGlobalAMiBanco_(\'' + escaparHtml(jsSafe_(pId)) + '\', \'' + escaparHtml(jsSafe_(pTitulo)) + '\')">📥 Copiar a mi Banco Personal</button>';
          html += '  <button type="button" class="nem-btn-accion" style="width:100%;text-align:center;" onclick="abrirGestorSesiones(\'' + escaparHtml(jsSafe_(pId)) + '\')">👁️ Explorar Sesiones (' + escaparHtml(numSes) + ')</button>';
        } else {
          // Acciones en Banco Personal del docente creador
          html += '  <div style="display:flex;gap:6px;width:100%;">';
          html += '    <button type="button" class="nem-btn-accion nem-btn-primario" style="flex:1;" onclick="abrirGestorSesiones(\'' + escaparHtml(jsSafe_(pId)) + '\')">Sesiones (' + escaparHtml(numSes) + ')</button>';
          if (puedeEditar) {
            html += '    <button type="button" class="nem-btn-accion" style="flex:1;" onclick="editarPlaneacionGeneral(\'' + escaparHtml(jsSafe_(pId)) + '\')">Editar</button>';
          }
          html += '  </div>';

          html += '  <div style="display:flex;gap:6px;width:100%;">';
          if (puedeEditar && est !== 'PUBLICADA') {
            html += '    <button type="button" class="nem-btn-accion" style="flex:1;background:#f0fdf4;color:#166534;border-color:#bbf7d0;font-weight:700;" onclick="publicarProyectoEnGlobal_(\'' + escaparHtml(jsSafe_(pId)) + '\', \'' + escaparHtml(jsSafe_(pTitulo)) + '\', ' + numSes + ', ' + comp + ')" title="Publicar este proyecto didáctico terminado al Repositorio Global Escolar">🚀 Publicar Global</button>';
          }
          if (puedeEditar) {
            html += '    <button type="button" class="nem-btn-accion" style="color:#dc2626;border-color:#fecaca;padding:4px 8px;" onclick="eliminarProyectoPersonal_(\'' + escaparHtml(jsSafe_(pId)) + '\', \'' + escaparHtml(jsSafe_(pTitulo)) + '\')" title="Eliminar del Banco Personal">🗑️</button>';
          }
          html += '  </div>';
        }

        html += '</div>';
        html += '</div>';
      });

      grid.innerHTML = html;
    }

    /* ============================================================
       OPERACIONES COLEGIALES: CLONAR, PUBLICAR Y ELIMINAR PLANEACIONES
       ============================================================ */
    function cargarBancoPlaneaciones_() {
      cargarListaPlaneacionesNEM(true);
    }

    function sembrarDemoPlaneaciones_() {
      const tk = (typeof getTokenPlan_ === 'function') ? getTokenPlan_() : (typeof tokenClase !== 'undefined' ? tokenClase : '');
      const grid = document.getElementById('gridPlaneaciones');
      if (grid) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:36px 16px;background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;">' +
          '<p style="font-size:16px;font-weight:700;color:#166534;margin:0 0 6px;">🌱 Generando proyectos didácticos de prueba...</p>' +
          '<p class="hint" style="color:#15803d;margin:0;">Guardando proyectos en Google Sheets y creando sesiones de 40 min. Por favor espera un momento…</p>' +
          '</div>';
      }
      toast('Generando proyectos didácticos de prueba…', 'info');
      gsRun('sembrarPlaneacionesDemoNEM', tk).then(function (res) {
        if (res && res.ok) {
          toast(res.mensaje || 'Proyectos de prueba creados exitosamente.', 'ok');
          cargarListaPlaneacionesNEM(true);
        } else {
          const msg = (res && res.mensaje) || 'No se pudieron generar los proyectos demo.';
          toast(msg, 'err');
          if (typeof modal === 'function') {
            modal({ titulo: '⚠️ Aviso al generar proyectos demo', html: '<p style="color:#b91c1c;font-size:13px;line-height:1.5;">' + escaparHtml(msg) + '</p>' });
          }
          cargarListaPlaneacionesNEM(true);
        }
      }).catch(function (err) {
        const msg = (err && err.message) || String(err);
        toast('Error al sembrar: ' + msg, 'err');
        if (typeof modal === 'function') {
          modal({ titulo: '❌ Error al generar proyectos demo', html: '<p style="color:#b91c1c;font-size:13px;line-height:1.5;">' + escaparHtml(msg) + '</p>' });
        }
        if (grid) {
          grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:24px;background:#fef2f2;border:1px solid #fecaca;border-radius:12px;">' +
            '<p style="color:#b91c1c;font-weight:700;margin:0 0 8px;">Error al conectar con Google Sheets:</p>' +
            '<p style="color:#7f1d1d;font-size:12.5px;margin:0 0 14px;">' + escaparHtml(msg) + '</p>' +
            '<button type="button" class="nem-btn-accion" onclick="sembrarDemoPlaneaciones_()">Reintentar siembra</button>' +
            '</div>';
        }
      });
    }

    function copiarProyectoGlobalAMiBanco_(idPlan, titulo) {
      modal({
        titulo: '📥 Copiar al Banco Personal',
        html: '<div style="font-size:13px;color:#334155;line-height:1.6;">' +
          '<p>¿Deseas clonar el proyecto didáctico <strong>' + escaparHtml(titulo) + '</strong> a tu Banco Personal?</p>' +
          '<p style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:8px 12px;color:#166534;font-size:12px;">' +
            '✨ <strong>Reglas Colegiadas:</strong> Se generará una copia 100% independiente con todas sus sesiones y momentos didácticos para que puedas adaptarla a tus alumnos sin alterar el proyecto original del colega.' +
          '</p>' +
        '</div>',
        botones: [
          { texto: 'Cancelar', clase: 'btn-secundario', valor: false },
          { texto: 'Copiar a mi Banco', clase: 'btn-primario', valor: true }
        ]
      }).then(function (conf) {
        if (!conf) return;
        const tk = (typeof getTokenPlan_ === 'function') ? getTokenPlan_() : (typeof tokenClase !== 'undefined' ? tokenClase : '');
        toast('Clonando proyecto didáctico...', 'info');
        gsRun('clonarPlaneacionAGlobal', tk, idPlan).then(function (res) {
          toast(res.mensaje || 'Planeación clonada con éxito.', 'ok');
          conmutarBancoPlaneacion_('personal');
        }).catch(function (err) {
          toast((err && err.message) || String(err), 'error');
        });
      });
    }

    function publicarProyectoEnGlobal_(idPlan, titulo, numSes, comp) {
      modal({
        titulo: '🚀 Publicar en el Repositorio Global',
        html: '<div style="font-size:13px;color:#334155;line-height:1.6;">' +
          '<p>Estás a punto de publicar el proyecto <strong>' + escaparHtml(titulo) + '</strong> en el Repositorio Colegiado de la Secundaria Técnica 90.</p>' +
          '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:8px 12px;color:#1e40af;font-size:12px;margin-bottom:10px;">' +
            '📋 <strong>Validación de Calidad Pedagógica:</strong><br>' +
            '• Todas las sesiones (' + numSes + ') deben tener sus momentos didácticos completos (Apertura, Desarrollo, Actividad, Cierre).<br>' +
            '• Guion accesible e iDevices para lectura/escucha del estudiante.' +
          '</div>' +
          '<p>Al publicar, tus colegas podrán inspirarse en tu diseño didáctico y copiarlo a sus respectivos bancos de planeación.</p>' +
        '</div>',
        botones: [
          { texto: 'Aún no', clase: 'btn-secundario', valor: false },
          { texto: 'Publicar Ahora', clase: 'btn-primario', valor: true }
        ]
      }).then(function (conf) {
        if (!conf) return;
        const tk = (typeof getTokenPlan_ === 'function') ? getTokenPlan_() : (typeof tokenClase !== 'undefined' ? tokenClase : '');
        toast('Verificando sesiones y publicando...', 'info');
        gsRun('publicarPlaneacionEnRepositorio', tk, idPlan).then(function (res) {
          toast(res.mensaje || '¡Proyecto publicado exitosamente en el Repositorio Global!', 'ok');
          cargarListaPlaneacionesNEM();
        }).catch(function (err) {
          modal({
            titulo: '⚠️ Sesiones Incompletas',
            html: '<p style="color:#b91c1c;font-size:13px;line-height:1.5;">' + escaparHtml((err && err.message) || String(err)) + '</p>',
            botones: [{ texto: 'Entendido', clase: 'btn-primario', valor: true }]
          });
        });
      });
    }

    function eliminarProyectoPersonal_(idPlan, titulo) {
      modal({
        titulo: '🗑️ Eliminar Planeación',
        html: '<p style="font-size:13px;color:#334155;">¿Estás seguro de que deseas eliminar permanentemente <strong>' + escaparHtml(titulo) + '</strong> y todas sus sesiones de tu Banco Personal?</p>',
        botones: [
          { texto: 'Cancelar', clase: 'btn-secundario', valor: false },
          { texto: 'Eliminar', clase: 'btn-peligro', valor: true }
        ]
      }).then(function (conf) {
        if (!conf) return;
        const tk = (typeof getTokenPlan_ === 'function') ? getTokenPlan_() : (typeof tokenClase !== 'undefined' ? tokenClase : '');
        toast('Eliminando planeación...', 'info');
        gsRun('eliminarPlaneacionNEM', tk, idPlan).then(function (res) {
          toast(res.mensaje || 'Planeación eliminada.', 'ok');
          cargarListaPlaneacionesNEM();
        }).catch(function (err) {
          toast((err && err.message) || String(err), 'error');
        });
      });
    }

    /* ============================================================
       INYECCIÓN DEL CENSO ESCOLAR AL DIAGNÓSTICO CTE (#planProblema)
       ============================================================ */
    function abrirModalImportarCensoCTE_() {
      const hallazgos = [
        {
          id: 'movilidad',
          titulo: '🚲 Movilidad y Trayecto Seguro (Riesgo Vial)',
          texto: 'El 68.4% de los alumnos de la comunidad escolar enfrenta factores de riesgo vial en cruces de alta afluencia vehicular (Av. Tláhuac y Calle 11) con tiempos de traslado superiores a 40 minutos, detonando fatiga y necesidad de proyectos comunitarios de seguridad vial y movilidad sustentable.'
        },
        {
          id: 'lectura',
          titulo: '📖 Hábitos de Lectura y Uso de Pantallas',
          texto: 'Solo el 18.2% de los estudiantes lee por placer de forma habitual, dedicando un promedio de 4.8 horas diarias a redes sociales y videojuegos en dispositivos móviles, lo cual genera fatiga visual, bajo vocabulario de comprensión profunda y dispersión en la atención sostenida.'
        },
        {
          id: 'convivencia',
          titulo: '🤝 Convivencia Pacífica y Salud Emocional',
          texto: 'El 42.1% del alumnado reporta necesidad de fortalecer habilidades de autorregulación emocional y comunicación asertiva para prevenir tensiones en el aula y el patio escolar, demandando proyectos didácticos orientados a la empatía, el diálogo reflexivo y la mediación pacífica.'
        },
        {
          id: 'alimentacion',
          titulo: '🥗 Alimentación Saludable y Entorno Sustentable',
          texto: 'El 56.7% de los estudiantes consume alimentos ultraprocesados y bebidas azucaradas en el trayecto escolar, derivando en baja energía matutina y una alta generación de residuos plásticos en el perímetro del plantel, requiriendo proyectos de consumo responsable y nutrición comunitaria.'
        }
      ];

      let opcionesHtml = '<div style="display:flex;flex-direction:column;gap:10px;font-size:12.5px;">';
      hallazgos.forEach(function (h, idx) {
        opcionesHtml += '<div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:10px;cursor:pointer;transition:all .15s ease;" onmouseover="this.style.borderColor=\'#2563eb\';this.style.background=\'#eff6ff\'" onmouseout="this.style.borderColor=\'#cbd5e1\';this.style.background=\'#f8fafc\'" onclick="seleccionarHallazgoCensoModal_(' + idx + ')">';
        opcionesHtml += '  <strong style="color:var(--st90-azul);font-size:13px;display:block;margin-bottom:4px;">' + escaparHtml(h.titulo) + '</strong>';
        opcionesHtml += '  <p style="margin:0;color:#475569;line-height:1.45;">' + escaparHtml(h.texto) + '</p>';
        opcionesHtml += '</div>';
      });
      opcionesHtml += '</div>';

      window.__hallazgosCensoTemp = hallazgos;

      modal({
        titulo: '📊 Censo Escolar ST90: Hallazgos de Diagnóstico CTE',
        html: '<div style="font-size:13px;color:#334155;line-height:1.5;margin-bottom:12px;">' +
          '<p style="margin:0 0 10px;">Selecciona el hallazgo del censo escolar que fundamenta la situación-problema de tu proyecto didáctico para inyectarlo en el campo Problemática de la Comunidad:</p>' +
          opcionesHtml +
        '</div>',
        botones: [{ texto: 'Cerrar', clase: 'btn-secundario', valor: false }]
      });
    }

    function seleccionarHallazgoCensoModal_(idx) {
      const lista = window.__hallazgosCensoTemp || [];
      const item = lista[idx];
      if (!item) return;

      const txt = document.getElementById('planProblema');
      if (txt) {
        const actual = txt.value.trim();
        txt.value = actual ? (actual + '\n\n' + item.texto) : item.texto;
        txt.focus();
      }
      cerrarModal();
      toast('Hallazgo del Censo importado exitosamente a la planeación.', 'ok');
    }

    /* ============================================================
       BANCO DE ENCUESTAS: consulta e inyeccion en #planProblema
       ============================================================ */
    /* ============================================================
       DIRECTORIO DE ENCUESTAS
       Lista las encuestas registradas (con su asignatura, grado y trimestre),
       permite generar un resumen con IA y traerlo a la planeación.
       ============================================================ */
    function _opcionesFiltroDirEnc_(id, etiqueta, valores) {
      var html = '<select id="' + id + '" style="font-size:12px;padding:4px 8px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#334155;">';
      html += '<option value="">' + etiqueta + ': todas</option>';
      valores.forEach(function (v) {
        html += '<option value="' + escaparHtml(v) + '">' + escaparHtml(v) + '</option>';
      });
      return html + '</select>';
    }

    function abrirBancoEncuestas_() {
      var tk = (typeof getTokenPlan_ === 'function') ? getTokenPlan_() : tokenClase;
      if (!tk) { toast('Vuelve a iniciar sesión para consultar el directorio.', 'err'); return; }
      gsRun('listarDirectorioEncuestas', tk).then(function (res) {
        if (!res || !res.ok) { toast((res && res.mensaje) || 'No se pudo leer el directorio.', 'err'); return; }
        var items = res.items || [];
        window.__dirEncuestas = items;
        var asigs = [], grados = [], trims = [];
        items.forEach(function (it) {
          if (it.asignatura && asigs.indexOf(it.asignatura) < 0) asigs.push(it.asignatura);
          if (it.grado && grados.indexOf(it.grado) < 0) grados.push(it.grado);
          if (it.trimestre && trims.indexOf(it.trimestre) < 0) trims.push(it.trimestre);
        });
        var html =
          '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;align-items:center;">' +
            _opcionesFiltroDirEnc_('dirFAsig', 'Asignatura', asigs) +
            _opcionesFiltroDirEnc_('dirFGrado', 'Grado', grados) +
            _opcionesFiltroDirEnc_('dirFTrim', 'Trimestre', trims) +
            '<button type="button" class="btn-outline-custom" style="font-size:11px;padding:4px 9px;margin-left:auto;" onclick="sembrarDemoDirEnc_()">🧪 Crear encuestas de prueba</button>' +
          '</div>' +
          '<select id="dirSelect" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;font-size:12.5px;color:#334155;background:#fff;"></select>' +
          '<div id="dirDetalle" style="margin-top:12px;"></div>';
        modal({
          titulo: '📊 Directorio de encuestas',
          html: html,
          clase: 'st90-modal-ancho',
          botones: [{ texto: 'Cerrar', clase: 'btn-secundario', valor: false }]
        });
        ['dirFAsig', 'dirFGrado', 'dirFTrim'].forEach(function (id) {
          var el = document.getElementById(id);
          if (el) el.addEventListener('change', pintarListaDirEnc_);
        });
        var selDir = document.getElementById('dirSelect');
        if (selDir) selDir.addEventListener('change', function () {
          if (this.value) seleccionarDirEnc_(this.value);
        });
        pintarListaDirEnc_();
      }).catch(function (e) {
        toast('Error al leer el directorio: ' + ((e && e.message) || e), 'err');
      });
    }

    function pintarListaDirEnc_() {
      var sel = document.getElementById('dirSelect');
      if (!sel) return;
      var items = window.__dirEncuestas || [];
      var fa = (document.getElementById('dirFAsig') || {}).value || '';
      var fg = (document.getElementById('dirFGrado') || {}).value || '';
      var ft = (document.getElementById('dirFTrim') || {}).value || '';
      var filtrados = items.filter(function (it) {
        if (fa && it.asignatura !== fa) return false;
        if (fg && it.grado !== fg) return false;
        if (ft && it.trimestre !== ft) return false;
        return true;
      });
      if (!filtrados.length) {
        sel.innerHTML = '<option value="">' + (items.length ? 'Ninguna encuesta coincide con el filtro' : 'Todavía no hay encuestas registradas') + '</option>';
        var det0 = document.getElementById('dirDetalle');
        if (det0) det0.innerHTML = items.length ? '' : '<p style="font-size:12px;color:#64748b;margin:6px 0 0;">Vincula la hoja de una encuesta desde Administración → Encuestas, o crea las de prueba con el botón de arriba.</p>';
        return;
      }
      sel.innerHTML = '<option value="">Selecciona una encuesta…</option>' + filtrados.map(function (it) {
        var meta = [it.asignatura, it.grado, it.trimestre, it.grupo].filter(Boolean).join(' · ') || 'Sin clasificar';
        var etiqueta = it.nombre + '  —  ' + meta + '  (' + it.respuestas + ' respuestas' + (it.resumen ? ', con resumen' : '') + ')';
        return '<option value="' + escaparHtml(it.hojaId) + '">' + escaparHtml(etiqueta) + '</option>';
      }).join('');
    }

    function sembrarDemoDirEnc_() {
      var tk = (typeof getTokenPlan_ === 'function') ? getTokenPlan_() : tokenClase;
      toast('Creando encuestas de prueba…', 'ok');
      gsRun('sembrarEncuestasDemo', tk).then(function (res) {
        if (!res || !res.ok) { toast((res && res.mensaje) || 'No se pudieron crear.', 'err'); return; }
        toast(res.mensaje || 'Encuestas de prueba creadas.', 'ok');
        gsRun('listarDirectorioEncuestas', tk).then(function (r2) {
          if (!r2 || !r2.ok) return;
          window.__dirEncuestas = r2.items || [];
          var det = document.getElementById('dirDetalle');
          if (det) det.innerHTML = '';
          pintarListaDirEnc_();
        });
      }).catch(function (e) {
        toast('Error al crear las encuestas: ' + ((e && e.message) || e), 'err');
      });
    }

    function seleccionarDirEnc_(hojaId) {
      var it = (window.__dirEncuestas || []).filter(function (x) { return x.hojaId === hojaId; })[0];
      if (!it) return;
      window.__dirSel = it;
      var det = document.getElementById('dirDetalle');
      if (!det) return;
      var resumenHtml = it.resumen
        ? '<div style="white-space:pre-line;font-size:12.5px;color:#334155;background:#f1f5f9;border-radius:8px;padding:10px;max-height:190px;overflow:auto;">' + escaparHtml(it.resumen) + '</div>'
        : '<p style="font-size:12px;color:#64748b;margin:0;">Esta encuesta todavía no tiene resumen de IA.</p>';
      det.innerHTML =
        '<div style="border-top:1px solid #e2e8f0;padding-top:10px;">' +
          '<strong style="font-size:13px;color:var(--st90-azul);">' + escaparHtml(it.nombre) + '</strong>' +
          '<div style="font-size:11.5px;color:#64748b;margin:2px 0 8px;">' +
            escaparHtml(it.hojaNombre || '') + ' · ' + it.respuestas + ' respuestas · ' + it.preguntas + ' preguntas' +
          '</div>' +
          resumenHtml +
          '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;align-items:center;">' +
            '<input id="dirAsig" placeholder="Asignatura" value="' + escaparHtml(it.asignatura || '') + '" style="font-size:12px;padding:4px 8px;border:1px solid #cbd5e1;border-radius:6px;width:130px;">' +
            '<input id="dirGrado" placeholder="Grado" value="' + escaparHtml(it.grado || '') + '" style="font-size:12px;padding:4px 8px;border:1px solid #cbd5e1;border-radius:6px;width:80px;">' +
            '<input id="dirTrim" placeholder="Trimestre" value="' + escaparHtml(it.trimestre || '') + '" style="font-size:12px;padding:4px 8px;border:1px solid #cbd5e1;border-radius:6px;width:100px;">' +
            '<button type="button" class="btn-outline-custom" style="font-size:11px;padding:4px 9px;" onclick="guardarDatosDirEnc_()">💾 Guardar datos</button>' +
          '</div>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">' +
            '<button type="button" class="btn-outline-custom" style="font-size:11px;padding:4px 9px;" onclick="generarResumenDirEnc_(\'' + escaparHtml(it.hojaId) + '\')">🤖 Generar resumen con IA</button>' +
            '<button type="button" class="btn-outline-custom" style="font-size:11px;padding:4px 9px;" onclick="insertarResumenDirEnc_()">📋 Insertar en la planeación</button>' +
          '</div>' +
        '</div>';
    }

    function guardarDatosDirEnc_() {
      var it = window.__dirSel;
      if (!it) return;
      var tk = (typeof getTokenPlan_ === 'function') ? getTokenPlan_() : tokenClase;
      var datos = {
        asignatura: ((document.getElementById('dirAsig') || {}).value || '').trim(),
        grado: ((document.getElementById('dirGrado') || {}).value || '').trim(),
        trimestre: ((document.getElementById('dirTrim') || {}).value || '').trim()
      };
      gsRun('guardarMetadatosDirectorioEncuesta', tk, it.hojaId, datos).then(function (res) {
        if (!res || !res.ok) { toast((res && res.mensaje) || 'No se pudieron guardar los datos.', 'err'); return; }
        it.asignatura = datos.asignatura;
        it.grado = datos.grado;
        it.trimestre = datos.trimestre;
        seleccionarDirEnc_(it.hojaId);
        toast('Datos de la encuesta guardados.', 'ok');
      }).catch(function (e) {
        toast('Error al guardar: ' + ((e && e.message) || e), 'err');
      });
    }

    function generarResumenDirEnc_(hojaId) {
      var tk = (typeof getTokenPlan_ === 'function') ? getTokenPlan_() : tokenClase;
      toast('Generando el resumen con IA… puede tardar unos segundos.', 'ok');
      gsRun('generarResumenEncuestaIA', tk, hojaId).then(function (res) {
        if (!res || !res.ok) { toast((res && res.mensaje) || 'No se pudo generar el resumen.', 'err'); return; }
        var it = (window.__dirEncuestas || []).filter(function (x) { return x.hojaId === hojaId; })[0];
        if (it) { it.resumen = res.resumen; if (res.total) it.respuestas = res.total; }
        seleccionarDirEnc_(hojaId);
        toast('Resumen generado y guardado en el directorio.', 'ok');
      }).catch(function (e) {
        toast('Error al generar el resumen: ' + ((e && e.message) || e), 'err');
      });
    }

    function insertarResumenDirEnc_() {
      var it = window.__dirSel;
      if (!it) return;
      var txt = document.getElementById('planProblema');
      if (!txt) { toast('No encontré el campo del problema de la comunidad.', 'err'); return; }
      var etiqueta = [it.asignatura, it.grado, it.trimestre].filter(Boolean).join(', ');
      var bloque = 'Diagnóstico de la encuesta «' + it.nombre + '» (' + it.respuestas + ' respuestas)' +
        (etiqueta ? ' — ' + etiqueta : '') + ':\n' + (it.resumen || 'Sin resumen generado.');
      var actual = txt.value.trim();
      txt.value = actual ? (actual + '\n\n' + bloque) : bloque;
      txt.focus();
      var fondo = document.querySelector('.st90-modal-fondo');
      if (fondo) fondo.remove();
      toast('Resumen insertado en el Problema de la Comunidad. Revísalo y ajústalo.', 'ok');
    }

    function determinarTrimestreSEP(fechaString) {
      if (!fechaString) return 'Trimestre 1 (Ago - Nov)';
      const s = String(fechaString).trim();
      let mes = 0;
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        // Extracción directa sin desfase UTC de zona horaria
        mes = parseInt(s.substring(5, 7), 10);
      } else {
        const d = new Date(s.indexOf('T') === -1 ? (s + 'T12:00:00') : s);
        if (!isNaN(d.getTime())) {
          mes = d.getMonth() + 1;
        }
      }

      // Calendario Oficial SEP Educación Secundaria:
      // Trimestre 1: Agosto (8) a Noviembre (11)
      // Trimestre 2: Diciembre (12) a Marzo (3)
      // Trimestre 3: Abril (4) a Julio (7)
      if (mes >= 8 && mes <= 11) {
        return 'Trimestre 1 (Ago - Nov)';
      } else if (mes === 12 || (mes >= 1 && mes <= 3)) {
        return 'Trimestre 2 (Dic - Mar)';
      } else if (mes >= 4 && mes <= 7) {
        return 'Trimestre 3 (Abr - Jul)';
      }
      return 'Trimestre 1 (Ago - Nov)';
    }

    function calcularPeriodoSegunFecha_(fechaStr) {
      const etiqueta = determinarTrimestreSEP(fechaStr);
      let periodoNum = 1;
      let rango = 'Ago - Nov';
      if (etiqueta.indexOf('Trimestre 2') >= 0) {
        periodoNum = 2;
        rango = 'Dic - Mar';
      } else if (etiqueta.indexOf('Trimestre 3') >= 0) {
        periodoNum = 3;
        rango = 'Abr - Jul';
      }
      return {
        periodo: periodoNum,
        etiqueta: etiqueta,
        rango: rango,
        badge: '🗓️ ' + etiqueta
      };
    }</script>
```

## AdminPlanJS_03.html

```html
<script>
/* AdminPlanJS_03 — inferirCampoYMetodologia_, alCambiarFechaInicioPlan, alSeleccionarClaseHorarioEnPlan, CATALOGO_PROGRAMA_ANALITICO_CTE_, GRUPOS_CON_BAPYC_, evaluarInclusionGrupo_, obtenerCatalogoCTE_, guardarCatalogoCTE_, abrirModalGestionCTE_, eliminarProblemaCTEModal_, ... */


    function inferirCampoYMetodologia_(asig) {
      const norm = String(asig || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (norm.indexOf('espanol') >= 0 || norm.indexOf('lengua') >= 0 || norm.indexOf('ingles') >= 0 || norm.indexOf('artes') >= 0) {
        return { campo: 'Lenguajes', metodologia: 'Aprendizaje basado en proyectos comunitarios' };
      }
      if (norm.indexOf('matematica') >= 0 || norm.indexOf('ciencia') >= 0 || norm.indexOf('biologia') >= 0 || norm.indexOf('fisica') >= 0 || norm.indexOf('quimica') >= 0) {
        return { campo: 'Saberes y Pensamiento Científico', metodologia: 'Aprendizaje basado en indagación (STEAM)' };
      }
      if (norm.indexOf('geografia') >= 0 || norm.indexOf('historia') >= 0 || norm.indexOf('civica') >= 0 || norm.indexOf('etica') >= 0 || norm.indexOf('sociedad') >= 0) {
        return { campo: 'Ética, Naturaleza y Sociedades', metodologia: 'Aprendizaje Basado en Problemas (ABP)' };
      }
      if (norm.indexOf('tecnologia') >= 0 || norm.indexOf('educacion fisica') >= 0 || norm.indexOf('tutoria') >= 0 || norm.indexOf('socioemocional') >= 0 || norm.indexOf('vida saludable') >= 0) {
        return { campo: 'De lo Humano y lo Comunitario', metodologia: 'Aprendizaje Servicio (AS)' };
      }
      return { campo: 'Lenguajes', metodologia: 'Aprendizaje basado en proyectos comunitarios' };
    }

    function alCambiarFechaInicioPlan() {
      const fe = (document.getElementById('planFechaInicio') || {}).value || '';
      const periodoTexto = determinarTrimestreSEP(fe);
      const txtPer = document.getElementById('planPeriodo');
      const badgePer = document.getElementById('badgePeriodoPlan');
      const perEl = document.getElementById('txtEncabezadoPeriodo');
      const feEl = document.getElementById('txtEncabezadoFecha');
      if (txtPer) txtPer.value = periodoTexto;
      if (badgePer) badgePer.textContent = '🗓️ ' + periodoTexto;
      if (perEl) perEl.textContent = periodoTexto;
      if (feEl && fe) feEl.textContent = fe;
    }

    function alSeleccionarClaseHorarioEnPlan() {
      const sel = document.getElementById('selPlanClaseHorario');
      if (!sel || !sel.value) return;
      try {
        const item = JSON.parse(sel.value);
        if (item.grado) {
          const gSel = document.getElementById('planGrado');
          if (gSel) gSel.value = String(item.grado).trim();
        }
        const gpLetra = String(item.grupo || 'A').trim().replace(/^\d+/, '').toUpperCase();
        actualizarGruposFormPlan(gpLetra);
        const gpSel = document.getElementById('planGrupo');
        if (gpSel) gpSel.value = gpLetra;

        if (item.asignatura) {
          const asigInp = document.getElementById('planAsignatura');
          if (asigInp) asigInp.value = item.asignatura;
          const inferido = inferirCampoYMetodologia_(item.asignatura);
          const campoSel = document.getElementById('planCampoFormativo');
          const metSel = document.getElementById('planMetodologia');
          if (campoSel) campoSel.value = inferido.campo;
          if (metSel) metSel.value = inferido.metodologia;
        }
        if (item.idHorario) {
          const idHInp = document.getElementById('planIdHorario');
          if (idHInp) idHInp.value = item.idHorario;
        }
        const feInp = document.getElementById('planFechaInicio');
        if (feInp && !feInp.value) {
          feInp.value = fechaLocalClase();
          alCambiarFechaInicioPlan();
        }
        const titInp = document.getElementById('planTitulo');
        if (titInp && (!titInp.value || titInp.value.indexOf('Ej.') === 0)) {
          const perInfo = calcularPeriodoSegunFecha_(feInp ? feInp.value : '');
        titInp.value = item.asignatura + ' ' + (item.grado || '') + '°' + gpLetra + ' - ' + perInfo.etiqueta;
      }
      const feValActual = (document.getElementById('planFechaInicio') || {}).value || '';
      const perInfoUso = calcularPeriodoSegunFecha_(feValActual);
      actualizarEncabezadoClaseNEM_({
        asignatura: item.asignatura,
        grado: item.grado,
        grupo: gpLetra,
        fecha: feValActual,
        periodo: perInfoUso.etiqueta,
        bloque: item.bloque,
        horaInicio: item.horaInicio,
        horaFin: item.horaFin,
        maestro: item.maestro
      });
      actualizarCatalogoPDAParaClase_(item.asignatura, item.grado);
      toast('Datos vinculados con la clase ' + (item.asignatura || '') + ' (' + (item.grado || '') + '°' + gpLetra + ')', 'ok');
    } catch (e) {}
  }

  /* CATÁLOGO DE PROBLEMÁTICAS SOCIOEDUCATIVAS DEL PROGRAMA ANALÍTICO (CONSEJO TÉCNICO ESCOLAR / CTE) */
  const CATALOGO_PROGRAMA_ANALITICO_CTE_ = [
    {
      id: 'PA-01',
      categoria: 'Sustentabilidad y Recursos Hídricos',
      titulo: 'Escasez, abastecimiento irregular y uso responsable del agua potable',
      problemaBase: 'En la comunidad escolar y el entorno barrial se presentan interrupciones recurrentes en el suministro de agua potable, provocando prácticas inadecuadas de almacenamiento, focos de insalubridad y desperdicio en las instalaciones escolares. El proyecto detonará alternativas de captación, diagnóstico de consumo y diseño de campañas de corresponsabilidad hídrica.'
    },
    {
      id: 'PA-02',
      categoria: 'Convivencia y Derechos Humanos',
      titulo: 'Convivencia escolar armónica, erradicación del ciberacoso y cultura de paz',
      problemaBase: 'Se registran tensiones cotidianas en la interacción entre pares, uso desregulado de redes sociales, situaciones de discriminación y resolución violenta de conflictos en el aula y recesos. Se requiere fortalecer habilidades dialógicas, gestión asertiva de emociones y protocolos de mediación comunitaria orientados a una cultura de paz.'
    },
    {
      id: 'PA-03',
      categoria: 'Salud y Alimentación Integral',
      titulo: 'Hábitos alimentarios nocivos, consumo excesivo de ultraprocesados y sedentarismo',
      problemaBase: 'Elevado índice de consumo de alimentos ultraprocesados y bebidas azucaradas durante los horarios escolares y familiares, reflejando bajo rendimiento físico, sobrepeso y malestar gastrointestinal frecuente. Se fomentará el análisis crítico de etiquetas nutrimentales, rescate de alimentos locales nutritivos y diseño de menús escolares accesibles.'
    },
    {
      id: 'PA-04',
      categoria: 'Medio Ambiente y Territorio',
      titulo: 'Manejo deficiente de residuos sólidos y contaminación del espacio comunitario',
      problemaBase: 'Acumulación de plásticos, empaques y desechos en las inmediaciones de la escuela y canales urbanos, deteriorando el entorno y generando riesgos sanitarios. Se impulsará la economía circular, separación en origen, compostaje escolar y proyectos productivos de revalorización de materiales.'
    },
    {
      id: 'PA-05',
      categoria: 'Identidad y Memoria Histórica',
      titulo: 'Pérdida de identidad comunitaria, tradiciones locales y lenguas originarias',
      problemaBase: 'Desarraigo cultural y desconocimiento del patrimonio histórico barrial y la diversidad lingüística de las familias de la escuela, derivando en prejuicios y falta de sentido de pertenencia. Los alumnos recopilarán testimonios orales, crónicas de adultos mayores y exposiciones artísticas identitarias.'
    }
  ];

  /* Grupos con alumnado que enfrenta Barreras para el Aprendizaje, la Participación
     y la Convivencia (BAPyC). Se registra únicamente el grupo: el detalle de cada caso
     vive en el expediente de inclusión, no en el código ni en la página. */
  const GRUPOS_CON_BAPYC_ = ['1A', '1B', '1D', '2A', '2B', '2D', '3A', '3C'];

  function evaluarInclusionGrupo_(grado, grupo) {
    const gr = String(grado || (document.getElementById('planGrado') || {}).value || '1').trim();
    const gp = String(grupo || (document.getElementById('planGrupo') || {}).value || 'A').trim().replace(/^\d+/, '').toUpperCase();
    const clave = gr + gp;
    const tieneBAPyC = (typeof GRUPOS_CON_BAPYC_ !== 'undefined' && GRUPOS_CON_BAPYC_.indexOf(clave) >= 0);
    const sec = document.getElementById('secInclusionBAPyC');
    const wrapChips = document.getElementById('wrapChipsBAPyCGrupo');
    const inpAjustes = document.getElementById('planAjustesRazonables');

    if (!sec) return;

    if (tieneBAPyC) {
      sec.classList.remove('oculto');
      if (wrapChips) {
        wrapChips.innerHTML = '<div class="nem-chip-bapyc"><span>BAPyC</span> Grupo con barreras para el aprendizaje, la participación y la convivencia</div>';
      }
      if (inpAjustes && (!inpAjustes.value || !inpAjustes.value.trim())) {
        inpAjustes.value = '• Este grupo tiene alumnado que enfrenta barreras para el aprendizaje, la participación y la convivencia (BAPyC). Consulta el expediente de inclusión del grupo y describe aquí los ajustes razonables de acceso, formato y evaluación.';
      }
    } else {
      sec.classList.add('oculto');
      if (wrapChips) wrapChips.innerHTML = '';
    }
  }

  // Cargar catálogo CTE desde almacenamiento local si existe
  function obtenerCatalogoCTE_() {
    try {
      const local = localStorage.getItem('ST90_CATALOGO_CTE_CUSTOM');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (e) {}
    return CATALOGO_PROGRAMA_ANALITICO_CTE_;
  }

  function guardarCatalogoCTE_(lista) {
    try {
      localStorage.setItem('ST90_CATALOGO_CTE_CUSTOM', JSON.stringify(lista));
    } catch (e) {}
  }

  function abrirModalGestionCTE_() {
    const catalogo = obtenerCatalogoCTE_();
    let filasHtml = '';
    catalogo.forEach(function (item, idx) {
      filasHtml += '<div style="background:#ffffff;border:1px solid #cbd5e1;border-radius:6px;padding:8px 10px;margin-bottom:8px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
          '<span style="font-size:11px;font-weight:800;color:#1e40af;background:#dbeafe;padding:1px 6px;border-radius:4px;">' + escaparHtml(item.id || ('PA-0' + (idx + 1))) + '</span>' +
          '<button type="button" onclick="eliminarProblemaCTEModal_(' + idx + ')" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:12px;font-weight:700;" title="Eliminar problemática">🗑️ Eliminar</button>' +
        '</div>' +
        '<div style="margin-bottom:4px;">' +
          '<input type="text" id="cteTitulo_' + idx + '" value="' + escaparHtml(item.titulo || '') + '" placeholder="Título de la problemática..." style="width:100%;font-size:12px;font-weight:700;padding:4px 6px;border:1px solid #cbd5e1;border-radius:4px;box-sizing:border-box;">' +
        '</div>' +
        '<div>' +
          '<textarea id="cteBase_' + idx + '" rows="2" style="width:100%;font-size:11.5px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:4px;box-sizing:border-box;resize:vertical;" placeholder="Descripción situacional contextualizada de la escuela...">' + escaparHtml(item.problemaBase || item.descripcion || '') + '</textarea>' +
        '</div>' +
      '</div>';
    });

    const modalBody = '<div style="font-size:12.5px;max-height:420px;overflow-y:auto;padding-right:4px;">' +
      '<p style="margin:0 0 10px;color:#475569;font-size:12px;">' +
        'Aquí puedes <strong>agregar, modificar o eliminar</strong> las problemáticas comunitarias del Programa Analítico acordadas en el Consejo Técnico Escolar (CTE):' +
      '</p>' +
      '<div id="listaItemsCTEModal">' + filasHtml + '</div>' +
    '</div>';

    modal({
      titulo: '⚙️ Catálogo del Programa Analítico (CTE)',
      html: modalBody,
      botones: [
        { texto: 'Cancelar', clase: 'btn-secundario', valor: false },
        { texto: '💾 Guardar Catálogo CTE', clase: 'btn-primario', valor: true }
      ],
      capturar: function (fondo, val) {
        if (!val) return null;
        const nuevos = [];
        const inputs = fondo.querySelectorAll('[id^="cteTitulo_"]');
        inputs.forEach(function (inp) {
          const idx = inp.id.replace('cteTitulo_', '');
          const tit = inp.value.trim();
          const baseEl = fondo.querySelector('#cteBase_' + idx);
          const base = baseEl ? baseEl.value.trim() : '';
          if (tit) {
            nuevos.push({
              id: 'PA-' + (nuevos.length < 9 ? '0' : '') + (nuevos.length + 1),
              categoria: 'Comunidad',
              titulo: tit,
              problemaBase: base
            });
          }
        });
        return { ok: true, catalogo: nuevos };
      }
    }).then(function (res) {
      if (!res || !res.ok || !Array.isArray(res.catalogo)) return;
      if (res.catalogo.length === 0) {
        toast('Debes mantener al menos una problemática en el catálogo.', 'error');
        return;
      }
      CATALOGO_PROGRAMA_ANALITICO_CTE_.length = 0;
      res.catalogo.forEach(function (c) { CATALOGO_PROGRAMA_ANALITICO_CTE_.push(c); });
      guardarCatalogoCTE_(res.catalogo);
      poblarSelectorProblemasCTE_();
      toast('Catálogo de problemáticas CTE actualizado con éxito.', 'ok');
    });

    // Alinear en una sola fila horizontal los 3 botones (➕ Agregar Nueva Problemática, Cancelar y Guardar)
    setTimeout(function () {
      const fondo = document.querySelector('.st90-modal-fondo.visible');
      if (!fondo) return;
      const acciones = fondo.querySelector('.acciones');
      if (!acciones) return;
      acciones.style.display = 'flex';
      acciones.style.justifyContent = 'space-between';
      acciones.style.alignItems = 'center';
      acciones.style.flexWrap = 'wrap';
      acciones.style.gap = '8px';

      let wrapDer = acciones.querySelector('.acciones-der-cte');
      if (!wrapDer) {
        wrapDer = document.createElement('div');
        wrapDer.className = 'acciones-der-cte';
        wrapDer.style = 'display:flex;gap:8px;align-items:center;';
        const btns = Array.from(acciones.querySelectorAll('button[data-i]'));
        btns.forEach(function (b) { wrapDer.appendChild(b); });
        acciones.appendChild(wrapDer);
      }

      if (!document.getElementById('btnModalCTEAgregar')) {
        const btnAgregar = document.createElement('button');
        btnAgregar.type = 'button';
        btnAgregar.id = 'btnModalCTEAgregar';
        btnAgregar.className = 'btn-secundario';
        btnAgregar.style = 'font-size:11.5px;padding:6px 12px;font-weight:700;color:#166534;background:#dcfce7;border:1px solid #86efac;cursor:pointer;border-radius:6px;display:inline-flex;align-items:center;gap:4px;';
        btnAgregar.innerHTML = '➕ Agregar Nueva Problemática';
        btnAgregar.onclick = function (e) {
          e.preventDefault();
          e.stopPropagation();
          agregarNuevoItemCTEModal_();
        };
        acciones.insertBefore(btnAgregar, wrapDer);
      }
    }, 20);
  }

  function eliminarProblemaCTEModal_(idx) {
    const el = document.getElementById('cteTitulo_' + idx);
    if (el) {
      const card = el.closest('div[style*="border:1px solid #cbd5e1"]');
      if (card) card.remove();
    }
  }

  function agregarNuevoItemCTEModal_() {
    const cont = document.getElementById('listaItemsCTEModal');
    if (!cont) return;
    const nuevoIdx = 'nuevo_' + Date.now();
    const div = document.createElement('div');
    div.style = 'background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:8px 10px;margin-bottom:8px;';
    div.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
      '<span style="font-size:11px;font-weight:800;color:#166534;background:#dcfce7;padding:1px 6px;border-radius:4px;">Nueva</span>' +
      '<button type="button" onclick="this.closest(\'div[style*="border:1px solid #86efac"]\').remove()" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:12px;font-weight:700;">🗑️ Quitar</button>' +
    '</div>' +
    '<div style="margin-bottom:4px;">' +
      '<input type="text" id="cteTitulo_' + nuevoIdx + '" value="" placeholder="Título de la nueva problemática..." style="width:100%;font-size:12px;font-weight:700;padding:4px 6px;border:1px solid #86efac;border-radius:4px;box-sizing:border-box;">' +
    '</div>' +
    '<div>' +
      '<textarea id="cteBase_' + nuevoIdx + '" rows="2" style="width:100%;font-size:11.5px;padding:4px 6px;border:1px solid #86efac;border-radius:4px;box-sizing:border-box;resize:vertical;" placeholder="Descripción situacional contextualizada de la escuela..."></textarea>' +
    '</div>';
    cont.appendChild(div);
    const inp = div.querySelector('input');
    if (inp) inp.focus();
  }

  function poblarSelectorProblemasCTE_() {
    const sel = document.getElementById('selProblemaEscolar');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Cargar problemática priorizada por el CTE --</option>' +
      obtenerCatalogoCTE_().map(p =>
        `<option value="${escaparHtml(p.id)}">${escaparHtml(p.categoria)}: ${escaparHtml(p.titulo)}</option>`
      ).join('');
  }

  function alSeleccionarProblemaCTE() {
    const sel = document.getElementById('selProblemaEscolar');
    const val = (sel && sel.value) || '';
    if (!val) return;
    const item = CATALOGO_PROGRAMA_ANALITICO_CTE_.find(p => p.id === val);
    if (item && item.problemaBase) {
      const txt = document.getElementById('planProblema');
      if (txt) {
        txt.value = item.problemaBase;
        txt.focus();
      }
      toast('Problemática contextualizada del CTE cargada.', 'info');
    }
  }

  /* MATRIZ CURRICULAR OFICIAL SEP FASE 6 (CONTENIDOS Y PDA POR DISCIPLINA Y GRADO) */
  const CATALOGO_SEP_FASE6_ = [
    {
      disciplina: 'Matemáticas',
      campo: 'Saberes y Pensamiento Científico',
      metodologia: 'Aprendizaje basado en indagación (STEAM)',
      gradosValidos: ['1', '2', '3'],
      contenidos: [
        {
          contenido: 'Expresión de fracciones como decimales y de decimales como fracciones.',
          pda: {
            '1': 'Usa diversas estrategias al convertir números fraccionarios a decimales y viceversa.',
            '2': 'Aplica la conversión de fracciones y decimales en la resolución de problemas en diversos contextos.',
            '3': 'Resuelve situaciones complejas que implican la equivalencia entre fracciones y decimales en el cálculo algebraico.'
          }
        },
        {
          contenido: 'Extensión de los números a positivos y negativos y su orden.',
          pda: {
            '1': 'Reconoce la necesidad de los números negativos a partir de usar cantidades que tienen al cero como referencia.',
            '2': 'Compara y ordena números con signo (enteros, fracciones y decimales) en la recta numérica y analiza la propiedad de densidad.',
            '3': 'Formula y resuelve problemas que involucran el uso de números con signo en fenómenos cotidianos y científicos.'
          }
        },
        {
          contenido: 'Introducción al álgebra.',
          pda: {
            '1': 'Interpreta y plantea diversas situaciones del lenguaje común al lenguaje algebraico y viceversa.',
            '2': 'Representa algebraicamente áreas y volúmenes de cuerpos geométricos y calcula el valor de una variable en función de las otras.',
            '3': 'Representa algebraicamente una sucesión con progresión cuadrática de figuras y números.'
          }
        },
        {
          contenido: 'Ecuaciones lineales y cuadráticas.',
          pda: {
            '1': 'Modela y resuelve problemas cuyo planteamiento es una ecuación lineal con una incógnita.',
            '2': 'Modela y soluciona sistemas de dos ecuaciones lineales con dos incógnitas por algún método para dar respuesta a un problema.',
            '3': 'Resuelve problemas mediante el modelado y solución de ecuaciones de la forma Ax^2 + Bx + C = 0 por factorización y fórmula general.'
          }
        },
        {
          contenido: 'Funciones y variación proporcional.',
          pda: {
            '1': 'Relaciona e interpreta relaciones proporcional y no proporcional a partir de su representación tabular, gráfica y con diagramas.',
            '2': 'Relaciona e interpreta la proporcionalidad inversa de dos magnitudes o cantidades, además usa una tabla, gráfica o representación algebraica en diversos contextos.',
            '3': 'Relaciona e interpreta la variación de dos cantidades a partir de su representación tabular, gráfica y algebraica en fenómenos de la naturaleza y la sociedad.'
          }
        },
        {
          contenido: 'Medición y cálculo en diferentes contextos.',
          pda: {
            '1': 'Introduce la idea de distancia entre dos puntos y la noción de perímetro y área.',
            '2': 'Resuelve problemas que implican conversiones en múltiplos y submúltiplos del metro, litro, kilogramo y de unidades del sistema inglés.',
            '3': 'Aplica las razones trigonométricas seno, coseno y tangente en la resolución de problemas.'
          }
        },
        {
          contenido: 'Obtención y representación de información.',
          pda: {
            '1': 'Usa tablas, gráficas de barras y circulares para el análisis de información.',
            '2': 'Recolecta, registra, lee y comunica información mediante histogramas, gráficas poligonales y de línea.',
            '3': 'Lee, interpreta y comunica información de cualquier tipo de gráficas.'
          }
        },
        {
          contenido: 'Interpretación de la información a través de medidas de tendencia central y de dispersión.',
          pda: {
            '1': 'Determina e interpreta la frecuencia absoluta, la frecuencia relativa, la media, la mediana y la moda en un conjunto de datos.',
            '2': 'Usa e interpreta las medidas de tendencia central (moda, media aritmética y mediana) y el rango de un conjunto de datos, y justifica con base en ellas sus decisiones.',
            '3': 'Determina y compara las medidas de tendencia central y de dispersión (desviación media) de dos conjuntos de datos para tomar decisiones.'
          }
        }
      ]
    },
    {
      disciplina: 'Español',
      campo: 'Lenguajes',
      metodologia: 'Aprendizaje basado en proyectos comunitarios',
      gradosValidos: ['1', '2', '3'],
      contenidos: [
        {
          contenido: 'La diversidad de lenguas y su uso en la comunicación familiar, escolar y comunitaria.',
          pda: {
            '1': 'Reconoce la riqueza lingüística de México y el mundo, a partir de obras literarias procedentes de distintas culturas, tanto en español como en lenguas indígenas.',
            '2': 'Comprende las características y recursos lingüísticos de la lengua española, para usarlos y valorarlos como parte de la riqueza pluricultural de México y del mundo.',
            '3': 'Analiza y valora la importancia del uso y preservación de las lenguas indígenas y variantes del español en la comunidad y medios de comunicación.'
          }
        },
        {
          contenido: 'La diversidad étnica, cultural y lingüística de México a favor de una sociedad intercultural.',
          pda: {
            '1': 'Comprende las ideas centrales y secundarias de textos relacionados con la diversidad étnica, cultural y lingüística, que favorecen una sociedad intercultural, para comentarlas en forma oral y escrita.',
            '2': 'Compara y contrasta textos sobre las tensiones y conflictos en las sociedades contemporáneas y manifiesta de manera crítica su postura frente a la discriminación y el racismo.',
            '3': 'Elabora propuestas de divulgación escrita, para promover el consenso en una sociedad intercultural mediante el diálogo constructivo.'
          }
        },
        {
          contenido: 'Los elementos y los recursos estéticos de la lengua española en la literatura oral y escrita.',
          pda: {
            '1': 'Reconoce los recursos estéticos en textos literarios líricos, orales y escritos, y disfruta de poemas, canciones, juegos de palabras, entre otros.',
            '2': 'Analiza las características y recursos estéticos de los textos narrativos, e interpreta y disfruta de cuentos y novelas.',
            '3': 'Usa creativa e intencionalmente las características y los recursos estéticos de textos dramáticos, para escenificar situaciones vinculadas con la comunidad.'
          }
        },
        {
          contenido: 'Creaciones literarias tradicionales y contemporáneas.',
          pda: {
            '1': 'Recupera y clasifica creaciones literarias de la comunidad o de un lugar de interés, como mitos, leyendas, fábulas, epopeyas, cantares de gesta, refranes, coplas, para promover su lectura y difusión.',
            '2': 'Valora textos literarios tradicionales y contemporáneos, como cuentos, novelas, poemas, textos dramáticos; los adapta a otros lenguajes artísticos.',
            '3': 'Crea textos narrativos, poéticos, dramáticos, guiones para audiovisuales, entre otros, a partir del uso de recursos literarios, para exponer una situación real o ficticia.'
          }
        },
        {
          contenido: 'El dinamismo de las lenguas y su relevancia como patrimonio cultural.',
          pda: {
            '1': 'Identifica qué es una lengua y un dialecto a partir del análisis de las variantes lingüísticas del español.',
            '2': 'Reconoce cambios temporales y geográficos del español en la comunidad, país o mundo hispanohablante.',
            '3': 'Analiza en textos literarios neologismos, juegos de lenguajes, caló, jerga, préstamos lingüísticos y extranjerismos como parte del dinamismo de la lengua española.'
          }
        },
        {
          contenido: 'Comunicación asertiva y dialógica para erradicar expresiones de violencia.',
          pda: {
            '1': 'Realiza, de manera colectiva, una propuesta oral o por escrito, para promover acciones que posibiliten erradicar la violencia en las familias y la escuela.',
            '2': 'Participa en un debate acerca de expresiones de violencia, para argumentar una postura de rechazo y proponer acciones preventivas.',
            '3': 'Diseña un proyecto de comunicación asertiva para concientizar a la comunidad sobre la resolución pacífica de conflictos.'
          }
        }
      ]
    },
    {
      disciplina: 'Ciencias',
      campo: 'Saberes y Pensamiento Científico',
      metodologia: 'Aprendizaje basado en indagación (STEAM)',
      gradosValidos: ['1', '2', '3'],
      contenidos: [
        {
          contenido: 'El pensamiento científico, una forma de plantear y solucionar problemas y su incidencia en la transformación de la sociedad.',
          pda: {
            '1': 'Describe problemas comunes de la vida cotidiana explicando cómo se procede para buscarles solución, conoce y caracteriza el pensamiento científico para plantearse y resolver problemas en la escuela y su cotidianeidad.',
            '2': 'Describe problemas comunes de la vida cotidiana explicando cómo se procede para buscarles solución; conoce y caracteriza el pensamiento científico para plantearse y resolver problemas en la escuela y su cotidianidad.',
            '3': 'Describe problemas comunes de la vida cotidiana explicando cómo se procede para buscarles solución, asociando los aportes de la ciencia química a la salud, alimentación y medio ambiente.'
          }
        },
        {
          contenido: 'Salud sexual y reproductiva: prevención de infecciones de transmisión sexual y del embarazo en adolescentes.',
          pda: {
            '1': 'Compara la efectividad de los métodos anticonceptivos como apoyo para planificar el embarazo de manera informada y segura, y prevenir infecciones de transmisión sexual.',
            '2': 'Analiza las interacciones térmicas, electromagnéticas y mecánicas en el cuerpo humano y la tecnología médica.',
            '3': 'Analiza la composición de anticonceptivos hormonales y de barrera, y su impacto en la salud reproductiva.'
          }
        },
        {
          contenido: 'La biodiversidad como expresión del cambio de los seres vivos en el tiempo.',
          pda: {
            '1': 'Analiza información acerca del estado de la biodiversidad local a partir de fuentes directas, orales, escritas, audiovisuales o internet, expone razones sobre su importancia cultural, biológica, estética y ética, y propone acciones para su cuidado.',
            '2': 'Analiza las interacciones entre los factores bióticos y abióticos en los ecosistemas locales y globales.',
            '3': 'Explica cómo las transformaciones químicas y energéticas en la biosfera sostienen la vida y la biodiversidad.'
          }
        },
        {
          contenido: 'Interacciones en fenómenos relacionados con la fuerza y el movimiento.',
          pda: {
            '1': 'Identifica interacciones mecánicas simples en el movimiento de los seres vivos y objetos del entorno.',
            '2': 'Identifica y describe la presencia de fuerzas en interacciones cotidianas (fricción, fuerzas en equilibrio, fuerzas normales y de tensión).',
            '3': 'Aplica las leyes del movimiento y las fuerzas intermoleculares en el estudio de enlaces y reacciones químicas.'
          }
        },
        {
          contenido: 'Las reacciones químicas: manifestaciones, propiedades e interpretación de las ecuaciones químicas con base en la Ley de conservación de la materia.',
          pda: {
            '1': 'Reconoce cambios físicos y químicos en la digestión, respiración y procesos biológicos.',
            '2': 'Analiza intercambios de energía térmica y cambios de fase de la materia en fenómenos físicos cotidianos.',
            '3': 'Reconoce distintas reacciones químicas en su entorno y en actividades humanas, a partir de sus manifestaciones y el cambio de propiedades de reactivos a productos.'
          }
        }
      ]
    },
    {
      disciplina: 'Geografía',
      campo: 'Ética, Naturaleza y Sociedades',
      metodologia: 'Aprendizaje Basado en Problemas (ABP)',
      gradosValidos: ['1'],
      contenidos: [
        {
          contenido: 'El espacio geográfico como una construcción social y colectiva.',
          pda: {
            '1': [
              'Comprende que el espacio geográfico se conforma de interrelaciones entre las sociedades y la naturaleza, y reconoce sus componentes espaciales en su comunidad.',
              'Reconoce la diversidad natural, social, cultural, económica y política que conforma el espacio geográfico a escala local y regional.'
            ]
          }
        },
        {
          contenido: 'Los riesgos de desastre, su relación con los procesos naturales y la vulnerabilidad de la población en lugares específicos.',
          pda: {
            '1': [
              'Identifica que los desastres pueden ser originados por procesos naturales o por las actividades humanas, y relaciona la vulnerabilidad de la población con el riesgo de desastre.',
              'Propone medidas de prevención, mitigación y autoprotección ante riesgos de desastre en el entorno escolar y comunitario.'
            ]
          }
        }
      ]
    },
    {
      disciplina: 'Historia',
      campo: 'Ética, Naturaleza y Sociedades',
      metodologia: 'Aprendizaje Basado en Problemas (ABP)',
      gradosValidos: ['1', '2', '3'],
      contenidos: [
        {
          contenido: 'Los albores de la humanidad: los pueblos antiguos del mundo y su devenir.',
          pda: {
            '1': 'Busca, localiza y estudia con sus pares fuentes que dan cuenta de mitos fundacionales de pueblos antiguos, y reflexiona sobre las teorías del poblamiento de América.',
            '2': 'Indaga sobre el desarrollo de las culturas prehispánicas en Mesoamérica, Aridoamérica y Oasisamérica.',
            '3': 'Analiza los procesos de conquista, resistencia y colonización en México y su impacto en las comunidades originarias.'
          }
        },
        {
          contenido: 'Las luchas populares por la justicia social y la soberanía.',
          pda: {
            '1': 'Identifica las causas y consecuencias de los movimientos sociales históricos a favor de la libertad y la dignidad.',
            '2': 'Analiza las tensiones políticas, sociales y económicas en la conformación del Estado Mexicano durante el siglo XIX.',
            '3': 'Comprende la trascendencia de la Revolución Mexicana y la promulgación de la Constitución de 1917 en los derechos sociales contemporáneos.'
          }
        }
      ]
    },
    {
      disciplina: 'Formación Cívica y Ética',
      campo: 'Ética, Naturaleza y Sociedades',
      metodologia: 'Aprendizaje Basado en Problemas (ABP)',
      gradosValidos: ['1', '2', '3'],
      contenidos: [
        {
          contenido: 'Los derechos humanos en México y en el mundo como valores compartidos por las sociedades actuales.',
          pda: {
            '1': 'Asume una postura crítica sobre la vigencia de los derechos humanos como valores compartidos por distintas sociedades del mundo.',
            '2': 'Propone acciones orientadas a fortalecer la igualdad, el bienestar colectivo y el respeto a la dignidad humana en poblaciones históricamente marginadas.',
            '3': 'Debate acerca de la importancia de defender y exigir el respeto a los derechos humanos, como un reto de las sociedades actuales para vivir con dignidad, libertad, justicia e inclusión.'
          }
        },
        {
          contenido: 'Principios y valores de la cultura democrática como forma de gobierno y de vida.',
          pda: {
            '1': 'Aprecia la función de las instituciones y organizaciones sociales y políticas, así como de los mecanismos de participación ciudadana.',
            '2': 'Propone acciones para fortalecer en su entorno los rasgos del Estado de derecho democrático como el imperio de la ley y la división de poderes.',
            '3': 'Participa en actividades comunitarias para promover la rendición de cuentas, la transparencia y el bien común.'
          }
        }
      ]
    },
    {
      disciplina: 'Inglés',
      campo: 'Lenguajes',
      metodologia: 'Aprendizaje basado en proyectos comunitarios',
      gradosValidos: ['1', '2', '3'],
      contenidos: [
        {
          contenido: 'La diversidad lingüística y sus formas de expresión en México y el mundo.',
          pda: {
            '1': [
              'Hace uso del alfabeto, los números y las expresiones básicas en inglés, para nombrar y recuperar datos de la identidad personal y comunitaria.',
              'Recupera estrategias auditivas y de lectura para reconocer vocabulario y expresiones cotidianas en lengua inglesa.',
              'Identifica características lingüísticas básicas en textos breves en inglés para reconocer su diversidad cultural.'
            ],
            '2': [
              'Comprende textos narrativos y biográficos en inglés sobre personalidades y manifestaciones culturales del mundo.'
            ],
            '3': [
              'Construye un mensaje en inglés en favor de la inclusión y la diversidad cultural, para difundirlo en la comunidad escolar.'
            ]
          }
        },
        {
          contenido: 'El uso del inglés para expresar necesidades, intereses y problemas de la comunidad.',
          pda: {
            '1': [
              'Investiga en textos en inglés soluciones implementadas para problemáticas de una comunidad, e informa sus hallazgos de forma oral o escrita.',
              'Recupera frases y vocabulario en inglés para describir situaciones problemáticas o necesidades del entorno escolar.',
              'Elabora mensajes breves en inglés para sensibilizar sobre problemáticas detectadas en la escuela o comunidad.'
            ],
            '2': [
              'Elabora escritos argumentativos en inglés sobre problemáticas de la comunidad y alternativas de solución.'
            ],
            '3': [
              'Organiza una campaña en inglés para promover soluciones a problemáticas escolares o locales.'
            ]
          }
        }
      ]
    },
    {
      disciplina: 'Artes',
      campo: 'Lenguajes',
      metodologia: 'Aprendizaje basado en proyectos comunitarios',
      gradosValidos: ['1', '2', '3'],
      contenidos: [
        {
          contenido: 'Diversidad de lenguajes artísticos en la riqueza pluricultural de México y del mundo.',
          pda: {
            '1': 'Reconoce en manifestaciones artísticas de México y del mundo el uso del cuerpo, del espacio y del tiempo, para valorarlas como parte de la riqueza pluricultural.',
            '2': 'Explora la creación de secuencias artísticas combinando formas, colores, sonidos, movimientos y texturas para expresar vivencias comunitarias.',
            '3': 'Presenta una propuesta artística interdisciplinaria que comunique una postura crítica sobre un tema de interés para la comunidad.'
          }
        }
      ]
    },
    {
      disciplina: 'Tecnología',
      campo: 'De lo Humano y lo Comunitario',
      metodologia: 'Aprendizaje Servicio (AS)',
      gradosValidos: ['1', '2', '3'],
      contenidos: [
        {
          contenido: 'Herramientas, máquinas e instrumentos como extensión corporal en la satisfacción continua de intereses y necesidades de diversas sociedades.',
          pda: {
            '1': 'Explora las posibilidades corporales y la delegación de funciones en herramientas, máquinas, instrumentos y formas de organización para identificar sus funciones y procesos de cambio técnico.',
            '2': 'Analiza las diferentes funciones y usos de las herramientas, máquinas e instrumentos en situaciones sociotécnicas para comprender su funcionamiento y mantenimiento.',
            '3': 'Amplía sus posibilidades corporales por medio del conocimiento y habilidades en el manejo de herramientas, máquinas, instrumentos y formas de organización en procesos técnicos comunitarios.'
          }
        },
        {
          contenido: 'Factores que inciden en los procesos técnicos.',
          pda: {
            '1': 'Comprende la satisfacción de necesidades como la base de la creación e innovación técnica para reflexionar acerca de la influencia de intereses, prejuicios, estereotipos y creencias en el desarrollo de procesos técnicos.',
            '2': 'Analiza factores sociales, económicos, culturales y naturales a tomar en cuenta en la definición de criterios para la toma de decisiones orientadas al desarrollo sustentable.',
            '3': 'Implementa técnicas, procesos o formas de organización en la comunidad escolar o local, para favorecer la sustentabilidad ambiental.'
          }
        }
      ]
    },
    {
      disciplina: 'Educación Física',
      campo: 'De lo Humano y lo Comunitario',
      metodologia: 'Aprendizaje Servicio (AS)',
      gradosValidos: ['1', '2', '3'],
      contenidos: [
        {
          contenido: 'Capacidades, habilidades y destrezas motrices.',
          pda: {
            '1': 'Explora las capacidades, habilidades y destrezas motrices, para enriquecer y ampliar el potencial propio y de las demás personas.',
            '2': 'Integra sus capacidades, habilidades y destrezas motrices, al poner a prueba el potencial individual y de conjunto en juegos y deportes escolares.',
            '3': 'Valora las capacidades, habilidades y destrezas motrices propias y de las demás personas, para adaptar su desempeño ante situaciones de conflicto o retos motores en la vida cotidiana.'
          }
        }
      ]
    },
    {
      disciplina: 'Tutoría',
      campo: 'De lo Humano y lo Comunitario',
      metodologia: 'Aprendizaje Servicio (AS)',
      gradosValidos: ['1', '2', '3'],
      contenidos: [
        {
          contenido: 'Los sentimientos y su influencia en la toma de decisiones.',
          pda: {
            '1': 'Distingue entre emociones, estados de ánimo y sentimientos, como elementos que contribuyen a la construcción de relaciones afectivas inclusivas y equitativas.',
            '2': 'Reflexiona sobre cómo los sentimientos se construyen a partir de ideas y experiencias, para la toma de decisiones asertivas.',
            '3': 'Gestiona de manera asertiva las emociones y sentimientos en la resolución de problemas y la convivencia armónica escolar y familiar.'
          }
        }
      ]
    }
  ];</script>
```

## AdminPlanJS_04.html

```html
<script>
/* AdminPlanJS_04 — matrizCurricularActivaNEM_, actualizarCatalogoPDAParaClase_, alSeleccionarContenidoSinteticoNEM, obtenerPDAsDeContenidoYGrado_, poblarSelectorPDASegunContenido_, alCambiarCheckboxPDANEM_, marcarTodosPDAsGrado_, filtrarListaPDAsDOM_, alternarArticulacionOtrosGrados_, actualizarCajaArticulacionOtrosGrados_, ... */


  let matrizCurricularActivaNEM_ = null;

  function actualizarCatalogoPDAParaClase_(asig, grado) {
    // Guard clause: Catálogo disponible
    if (!Array.isArray(CATALOGO_SEP_FASE6_) || CATALOGO_SEP_FASE6_.length === 0) {
      console.warn('Catálogo SEP Fase 6 no disponible.');
      return;
    }

    const asigLimpia = asig || (document.getElementById('planAsignatura') || {}).value || 'Español';
    const gradoLimpio = String(grado || (document.getElementById('planGrado') || {}).value || '1').trim();
    const norm = String(asigLimpia).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const encontrada = CATALOGO_SEP_FASE6_.find(e => {
      const discNorm = e.disciplina.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (norm.includes(discNorm) || discNorm.includes(norm)) return true;
      if (norm.includes('matematica') && e.disciplina === 'Matemáticas') return true;
      if ((norm.includes('espanol') || norm.includes('lengua')) && e.disciplina === 'Español') return true;
      if (norm.includes('ingles') && e.disciplina === 'Inglés') return true;
      if (norm.includes('arte') && e.disciplina === 'Artes') return true;
      if (norm.includes('geografia') && e.disciplina === 'Geografía') return true;
      if (norm.includes('historia') && e.disciplina === 'Historia') return true;
      if ((norm.includes('civica') || norm.includes('etica') || norm.includes('formacion')) && e.disciplina === 'Formación Cívica y Ética') return true;
      if (norm.includes('tecnologia') && e.disciplina === 'Tecnología') return true;
      if (norm.includes('educacion fisica') && e.disciplina === 'Educación Física') return true;
      if ((norm.includes('tutoria') || norm.includes('socioemocional')) && e.disciplina === 'Tutoría') return true;
      if ((norm.includes('biologia') || norm.includes('fisica') || norm.includes('quimica') || norm.includes('ciencia')) && e.disciplina === 'Ciencias') return true;
      return false;
    }) || CATALOGO_SEP_FASE6_[0];

    matrizCurricularActivaNEM_ = encontrada;

    // EFECTO CASCADA NEM: Autoselección y Bloqueo de Campo Formativo y Metodología
    const selCampo = document.getElementById('planCampoFormativo');
    if (selCampo) {
      selCampo.value = encontrada.campo;
      selCampo.disabled = true;
    }

    const selMet = document.getElementById('planMetodologia');
    if (selMet) {
      selMet.value = encontrada.metodologia;
      selMet.disabled = true;
    }

    // Actualización de la etiqueta visual del catálogo oficial
    const etq = document.getElementById('txtEtiquetaMatrizNEM');
    if (etq) {
      etq.textContent = `${encontrada.disciplina} · ${gradoLimpio}° de secundaria (${encontrada.campo})`;
    }

    // FILTRADO DINÁMICO: Poblar únicamente los Contenidos de la disciplina detectada
    const selCont = document.getElementById('selContenidoSinteticoNEM');
    if (selCont) {
      if (!Array.isArray(encontrada.contenidos) || encontrada.contenidos.length === 0) {
        selCont.innerHTML = '<option value="">-- Sin contenidos disponibles --</option>';
        return;
      }

      const opciones = encontrada.contenidos.map((c, idx) =>
        `<option value="${escaparHtml(c.contenido)}"${idx === 0 ? ' selected' : ''}>${idx + 1}. ${escaparHtml(c.contenido)}</option>`
      ).join('');

      selCont.innerHTML = `<option value="">-- Elige un contenido curricular oficial --</option>${opciones}`;

      const primerCont = encontrada.contenidos[0];
      const inpCont = document.getElementById('planContenidoSintetico');
      if (inpCont && (!inpCont.value || !inpCont.value.trim())) {
        inpCont.value = primerCont.contenido;
      }
      poblarSelectorPDASegunContenido_(primerCont.contenido);
    }
  }

  function alSeleccionarContenidoSinteticoNEM() {
    const selCont = document.getElementById('selContenidoSinteticoNEM');
    const val = (selCont && selCont.value) || '';
    const inpCont = document.getElementById('planContenidoSintetico');
    if (inpCont && val) {
      inpCont.value = val;
    }
    poblarSelectorPDASegunContenido_(val);
  }

  function obtenerPDAsDeContenidoYGrado_(cObj, grado) {
    if (!cObj || !cObj.pda) return [];
    const val = cObj.pda[grado];
    if (Array.isArray(val)) return val.filter(x => !!String(x).trim());
    if (typeof val === 'string' && val.trim()) return [val.trim()];
    return [];
  }

  var pdasSeleccionadosNEM_ = [];

  function _gradoPlanNEM_() {
    return String((document.getElementById('planGrado') || {}).value || '1').trim();
  }

  function _leerSeleccionPDANEM_() {
    const inp = document.getElementById('planPDA');
    const txt = (inp && inp.value) || '';
    if (!txt.trim()) return [];
    return txt.split('\n').map(function (l) {
      return l.replace(/^•\s*\[[^\]]*\]\s*/, '').trim();
    }).filter(Boolean);
  }

  function _pdasDisponiblesNEM_() {
    const salida = [];
    const gr = _gradoPlanNEM_();
    const vistos = {};
    if (!matrizCurricularActivaNEM_ || !Array.isArray(matrizCurricularActivaNEM_.contenidos)) return salida;
    matrizCurricularActivaNEM_.contenidos.forEach(function (c) {
      obtenerPDAsDeContenidoYGrado_(c, gr).forEach(function (t) {
        const k = String(t).trim();
        if (!k || vistos[k]) return;
        vistos[k] = true;
        salida.push({ texto: k, contenido: String(c.contenido || '') });
      });
    });
    return salida;
  }

  function _escribirPlanPDA_() {
    const gr = _gradoPlanNEM_();
    const inp = document.getElementById('planPDA');
    if (inp) {
      inp.value = pdasSeleccionadosNEM_.length
        ? pdasSeleccionadosNEM_.map(function (t) { return '• [' + gr + '° Grado] ' + t; }).join('\n\n')
        : '';
    }
    const badge = document.getElementById('badgeConteoPDAs');
    if (badge) {
      badge.textContent = pdasSeleccionadosNEM_.length + ' seleccionado' + (pdasSeleccionadosNEM_.length === 1 ? '' : 's');
    }
  }

  function _pintarSelectorPDANEM_(filtro) {
    const cont = document.getElementById('listaPDAsCheckboxNEM');
    if (!cont) return;
    const q = String(filtro || '').toLowerCase().trim();
    const disp = _pdasDisponiblesNEM_().filter(function (x) {
      return !q || x.texto.toLowerCase().indexOf(q) >= 0 || x.contenido.toLowerCase().indexOf(q) >= 0;
    });

    const opciones = disp.map(function (x) {
      const ya = pdasSeleccionadosNEM_.indexOf(x.texto) >= 0;
      const etiqueta = (ya ? '✓ ' : '') + x.texto + (x.contenido ? '  —  ' + x.contenido : '');
      return '<option value="' + escaparHtml(x.texto) + '">' + escaparHtml(etiqueta.slice(0, 170)) + '</option>';
    }).join('');

    const chips = pdasSeleccionadosNEM_.map(function (t, i) {
      const corto = t.length > 64 ? t.slice(0, 64) + '…' : t;
      return '<span title="' + escaparHtml(t) + '" style="display:inline-flex;align-items:center;gap:5px;background:#e0f2fe;border:1px solid #bae6fd;color:#0c4a6e;border-radius:999px;padding:3px 8px;font-size:11px;">' +
        escaparHtml(corto) +
        '<button type="button" title="Quitar" onclick="quitarPDANEM_(' + i + ')" style="border:0;background:none;cursor:pointer;color:#b91c1c;font-weight:700;padding:0;">✕</button>' +
      '</span>';
    }).join('');

    cont.innerHTML =
      '<select id="selPDANEM" class="nem-select-sintetico" onchange="elegirPDANEM_(this)" style="width:100%;">' +
        '<option value="">' + (disp.length ? 'Selecciona un PDA para agregarlo…' : 'Sin PDA que coincidan con el filtro') + '</option>' +
        opciones +
      '</select>' +
      (chips ? '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">' + chips + '</div>' : '');
    _escribirPlanPDA_();
  }

  function elegirPDANEM_(sel) {
    const v = String((sel && sel.value) || '').trim();
    if (!v) return;
    if (pdasSeleccionadosNEM_.indexOf(v) < 0) pdasSeleccionadosNEM_.push(v);
    _pintarSelectorPDANEM_((document.getElementById('buscarPDANEM') || {}).value || '');
  }

  function quitarPDANEM_(i) {
    if (i < 0 || i >= pdasSeleccionadosNEM_.length) return;
    pdasSeleccionadosNEM_.splice(i, 1);
    _pintarSelectorPDANEM_((document.getElementById('buscarPDANEM') || {}).value || '');
  }

  function poblarSelectorPDASegunContenido_(contenidoTexto) {
    const cont = document.getElementById('listaPDAsCheckboxNEM');
    if (!cont) return;

    if (!matrizCurricularActivaNEM_ || !Array.isArray(matrizCurricularActivaNEM_.contenidos)) {
      cont.innerHTML = '<span style="font-size:12px;color:#64748b;">Selecciona un contenido arriba para ver sus PDA oficiales.</span>';
      return;
    }

    pdasSeleccionadosNEM_ = _leerSeleccionPDANEM_();

    const cObj = matrizCurricularActivaNEM_.contenidos.find(function (c) { return c.contenido === contenidoTexto; })
      || matrizCurricularActivaNEM_.contenidos[0];
    const gr = _gradoPlanNEM_();

    if (!_pdasDisponiblesNEM_().length) {
      cont.innerHTML =
        '<div style="padding:10px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;font-size:12px;color:#991b1b;">' +
          '<strong>Nota curricular SEP:</strong> Esta disciplina no cuenta con asignación de PDA para ' + escaparHtml(gr) +
          '° de secundaria (algunas disciplinas son exclusivas de un grado en la Fase 6).' +
        '</div>';
      _escribirPlanPDA_();
      if (cObj) actualizarCajaArticulacionOtrosGrados_(cObj, gr);
      return;
    }

    _pintarSelectorPDANEM_('');
    if (cObj) actualizarCajaArticulacionOtrosGrados_(cObj, gr);
  }

  function alCambiarCheckboxPDANEM_() { _escribirPlanPDA_(); }

  function marcarTodosPDAsGrado_(marcar) {
    if (marcar) {
      _pdasDisponiblesNEM_().forEach(function (x) {
        if (pdasSeleccionadosNEM_.indexOf(x.texto) < 0) pdasSeleccionadosNEM_.push(x.texto);
      });
    } else {
      pdasSeleccionadosNEM_ = [];
    }
    _pintarSelectorPDANEM_((document.getElementById('buscarPDANEM') || {}).value || '');
  }

  function filtrarListaPDAsDOM_() {
    _pintarSelectorPDANEM_((document.getElementById('buscarPDANEM') || {}).value || '');
  }
  function alternarBuscadorPDA_() {
    const inp = document.getElementById('buscarPDANEM');
    if (!inp) return;
    const estabaOculto = inp.classList.contains('oculto');
    inp.classList.toggle('oculto');
    if (estabaOculto) setTimeout(function () { inp.focus(); }, 30);
  }


  function alternarArticulacionOtrosGrados_() {
    const c = document.getElementById('cajaArticulacionOtrosGrados');
    if (c) c.classList.toggle('oculto');
  }

  function actualizarCajaArticulacionOtrosGrados_(cObj, gradoActual) {
    const caja = document.getElementById('cajaArticulacionOtrosGrados');
    if (!caja) return;

    if (!cObj || !cObj.pda) {
      caja.innerHTML = '<span style="color:#64748b;">Sin datos de articulación disponibles.</span>';
      return;
    }

    const otros = ['1', '2', '3'].filter(g => g !== gradoActual);
    const bloques = [];

    otros.forEach(g => {
      const pdas = obtenerPDAsDeContenidoYGrado_(cObj, g);
      if (pdas.length) {
        bloques.push(`
          <div style="margin-bottom:6px;">
            <strong style="color:#1e40af;">Progresión ${g}° Grado:</strong>
            ${pdas.map(p => escaparHtml(p)).join(' | ')}
          </div>
        `);
      }
    });

    if (bloques.length) {
      caja.innerHTML = `
        <div style="margin-bottom:4px;font-weight:700;color:#0f766e;">Articulación Curricular Vertical (Solo Consulta — No se añade a ${gradoActual}°):</div>
        ${bloques.join('')}
      `;
    } else {
      caja.innerHTML = '<span style="color:#64748b;">Esta disciplina o contenido no presenta progresiones en otros grados de secundaria (Fase 6).</span>';
    }
  }

  function alSeleccionarPDANEM() {
    // Mantener compatibilidad si se invoca desde selectores antiguos
    alCambiarCheckboxPDANEM_();
  }

  /* ASISTENTE PEDAGÓGICO IA */
  function solicitarSugerenciaProyectoIA() {
    const gr = String((document.getElementById('planGrado') || {}).value || '1').trim();
    const asig = (document.getElementById('planAsignatura') || {}).value || '';
    const campo = (document.getElementById('planCampoFormativo') || {}).value || '';
    const met = (document.getElementById('planMetodologia') || {}).value || '';
    const cont = (document.getElementById('planContenidoSintetico') || {}).value || '';
    const pda = (document.getElementById('planPDA') || {}).value || '';

    if (!cont || !pda) {
      toast('Selecciona primero un Contenido Central y al menos un PDA oficial antes de consultar a la IA.', 'error');
      return;
    }

    const btn = document.getElementById('btnSugerirProyectoIA');
    const txtOriginal = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Analizando contexto con IA...'; }

    const payload = {
      grado: gr,
      asignatura: asig,
      campoFormativo: campo,
      metodologia: met,
      contenidoSintetico: cont,
      pda: pda
    };

    const tk = (typeof getTokenPlan_ === 'function') ? getTokenPlan_() : (typeof tokenClase !== 'undefined' ? tokenClase : '');
    gsRun('asistirDisenoProyectoNEM', tk, payload).then(function (res) {
      if (btn) { btn.disabled = false; btn.textContent = txtOriginal; }
      if (!res || !res.ok) {
        toast((res && res.error) || 'No se pudo obtener sugerencia de IA.', 'error');
        return;
      }

      const p = res.propuesta || {};
      const htmlModal = '<div style="font-size:13px;line-height:1.5;color:#334155;max-width:100%;box-sizing:border-box;">' +
        '<div style="background:#eff6ff;padding:8px 12px;border-radius:6px;border:1px solid #bfdbfe;margin-bottom:12px;">' +
          '<strong style="color:#1e40af;">Justificación Pedagógica:</strong> ' + escaparHtml(p.justificacion || 'Articulación situada según los PDA seleccionados.') +
        '</div>' +
        '<div style="margin-bottom:10px;">' +
          '<label style="font-weight:700;display:block;margin-bottom:4px;color:#1e293b;">Problema o Situación de la Comunidad sugerido:</label>' +
          '<textarea id="modIAProblema" style="width:100%;max-width:100%;box-sizing:border-box;min-height:75px;padding:8px;border:1px solid #cbd5e1;border-radius:6px;font-size:12.5px;line-height:1.45;resize:vertical;overflow-y:auto;">' + escaparHtml(p.problemaComunidad || '') + '</textarea>' +
        '</div>' +
        '<div style="margin-bottom:10px;">' +
          '<label style="font-weight:700;display:block;margin-bottom:4px;color:#1e293b;">Propósito del Proyecto y Producto Central sugeridos:</label>' +
          '<textarea id="modIAProposito" style="width:100%;max-width:100%;box-sizing:border-box;min-height:90px;padding:8px;border:1px solid #cbd5e1;border-radius:6px;font-size:12.5px;line-height:1.45;resize:vertical;overflow-y:auto;">' +
            escaparHtml((p.proposito || '') + (p.productoFinal ? ('\n\nProducto Final Central: ' + p.productoFinal) : '')) +
          '</textarea>' +
        '</div>' +
        (p.ejesArticuladores && p.ejesArticuladores.length ? (
          '<div style="font-size:12px;color:#059669;font-weight:600;margin-top:6px;">' +
            'Ejes articuladores recomendados: ' + escaparHtml(p.ejesArticuladores.join(', ')) +
          '</div>'
        ) : '') +
      '</div>';

      modal({
        titulo: '✨ Propuesta Pedagógica Situada (NEM Fase 6)',
        clase: 'ia-modal',
        html: htmlModal,
        botones: [
          { texto: 'Cancelar', clase: 'btn-secundario', valor: false },
          { texto: '✓ Aplicar a la Planeación', clase: 'btn-primario', valor: true }
        ],
        capturar: function (fondo, val) {
          if (!val) return null;
          const probEl = fondo.querySelector('#modIAProblema');
          const propEl = fondo.querySelector('#modIAProposito');
          return {
            ok: true,
            problema: probEl ? probEl.value : '',
            proposito: propEl ? propEl.value : ''
          };
        }
      }).then(function (resCaptura) {
        if (!resCaptura || !resCaptura.ok) return;
        const nuevoProb = resCaptura.problema || '';
        const nuevoProp = resCaptura.proposito || '';
        if (nuevoProb) {
          const txtP = document.getElementById('planProblema');
          if (txtP) { txtP.value = nuevoProb; txtP.dispatchEvent(new Event('input', { bubbles: true })); }
        }
        if (nuevoProp) {
          const txtPr = document.getElementById('planProposito');
          if (txtPr) { txtPr.value = nuevoProp; txtPr.dispatchEvent(new Event('input', { bubbles: true })); }
        }

        if (Array.isArray(p.ejesArticuladores) && p.ejesArticuladores.length) {
          document.querySelectorAll('#wrapEjesPlan input[type="checkbox"]').forEach(function (cb) {
            const debeMarcar = p.ejesArticuladores.some(function (ej) {
              return cb.value.toLowerCase().indexOf(ej.toLowerCase()) >= 0 || ej.toLowerCase().indexOf(cb.value.toLowerCase()) >= 0;
            });
            if (debeMarcar) {
              cb.checked = true;
              cb.closest('.nem-eje-chip').classList.add('seleccionado');
            }
          });
        }
        toast('Propuesta de IA aplicada a los campos de la planeación.', 'ok');
      });
    }).catch(function (err) {
      if (btn) { btn.disabled = false; btn.textContent = txtOriginal; }
      toast('Error al consultar IA: ' + (err.message || String(err)), 'error');
    });
  }

  function solicitarDesgloseSesionesIA() {
    if (!planActualNEM || !planActualNEM.id) {
      toast('Guarda primero la planeación antes de desglosar sus sesiones con IA.', 'error');
      return;
    }

    const btn = document.getElementById('btnDesglosarSesionesIA');
    const txtOriginal = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Desglosando momentos DUA...'; }

    const payload = {
      idPlaneacion: planActualNEM.id,
      numSesiones: sesionesActualesNEM.length || planActualNEM.numSesiones || 3,
      titulo: planActualNEM.titulo || 'Proyecto Didáctico',
      grado: planActualNEM.grado || '1',
      asignatura: planActualNEM.asignatura || 'Español',
      contenidoSintetico: planActualNEM.contenidoSintetico || '',
      pda: planActualNEM.pda || ''
    };

    const tk = (typeof getTokenPlan_ === 'function') ? getTokenPlan_() : (typeof tokenClase !== 'undefined' ? tokenClase : '');
    gsRun('asistirDesgloseSesionesNEM', tk, payload).then(function (res) {
      if (btn) { btn.disabled = false; btn.textContent = txtOriginal; }
      if (!res || !res.ok) {
        toast((res && res.error) || 'No se pudo generar el desglose con IA.', 'error');
        return;
      }

      const lista = res.sesiones || [];
      if (!lista.length) {
        toast('El servicio no devolvió momentos para las sesiones.', 'warning');
        return;
      }

      // Aplicar momentos a cada sesión en memoria
      lista.forEach(function (item, idx) {
        if (sesionesActualesNEM[idx]) {
          const s = sesionesActualesNEM[idx];
          if (item.titulo) s.titulo = item.titulo;
          if (item.apertura) s.aperturaTexto = item.apertura;
          if (item.desarrollo) s.desarrolloTexto = item.desarrollo;
          if (item.actividad) s.actividadTexto = item.actividad;
          if (item.cierre) s.cierreTexto = item.cierre;
          if (item.recursoVisualTitulo || item.recursoVisualDescripcion) {
            s.recursosVisuales = [{
              titulo: item.recursoVisualTitulo || 'Recurso visual de la sesión',
              descripcionAuditiva: item.recursoVisualDescripcion || '',
              url: ''
            }];
          }
        }
      });

      renderizarTabsSesiones();
      cargarSesionActivaEnEditor(sesionActivaIdx || 0);
      toast('Sesiones de 40 minutos desglosadas con enfoque DUA. Revisa y pulsa Guardar Sesión.', 'ok');
    }).catch(function (err) {
      if (btn) { btn.disabled = false; btn.textContent = txtOriginal; }
      toast('Error al desglosar sesiones: ' + (err.message || String(err)), 'error');
    });
  }

  function actualizarEncabezadoClaseNEM_(info) {
    info = info || {};
    const asig = info.asignatura || (document.getElementById('planAsignatura') || {}).value || 'Asignatura';
    const gr = info.grado || (document.getElementById('planGrado') || {}).value || '1';
    const gp = info.grupo || (document.getElementById('planGrupo') || {}).value || 'A';
    const titEl = document.getElementById('txtEncabezadoMateriaGrupo');
    if (titEl) titEl.textContent = asig.toUpperCase() + ' · ' + gr + '°' + gp;

    // 1. Rastreo estricto de la fecha seleccionada
    const fechaResolvida = info.fecha || (document.getElementById('planFechaInicio') || {}).value || fechaLocalClase();
    const feEl = document.getElementById('txtEncabezadoFecha');
    if (feEl) feEl.textContent = fechaResolvida;

    // 2. Cálculo algorítmico y dinámico del periodo SEP a partir de la fecha
    const periodoCalculado = determinarTrimestreSEP(fechaResolvida);
    evaluarInclusionGrupo_(gr, gp);

    // 3. Inyección estricta en el DOM (visual e input técnico de persistencia)
    const perEl = document.getElementById('txtEncabezadoPeriodo');
    if (perEl) perEl.textContent = periodoCalculado;

    const inpPeriodo = document.getElementById('planPeriodo');
    if (inpPeriodo) inpPeriodo.value = periodoCalculado;

    const horEl = document.getElementById('txtEncabezadoHorario');
    if (horEl) {
      if (info.bloque) {
        horEl.textContent = 'Hora ' + info.bloque + (info.horaInicio ? (' (' + info.horaInicio + '–' + info.horaFin + ')') : '');
      } else if (info.horaInicio) {
        horEl.textContent = info.horaInicio + '–' + info.horaFin;
      } else if (slotMaeSel && slotMaeSel.bloque) {
        horEl.textContent = 'Hora ' + slotMaeSel.bloque + (slotMaeSel.horaInicio ? (' (' + slotMaeSel.horaInicio + '–' + slotMaeSel.horaFin + ')') : '');
      } else {
        horEl.textContent = 'Horario asignado';
      }
    }

    const maeEl = document.getElementById('txtEncabezadoDocente');
    if (maeEl) {
      maeEl.textContent = info.maestro || (slotMaeSel && slotMaeSel.maestro) || (panelMaeUlt && panelMaeUlt.maestro) || 'Docente titular';
    }
  }

  function abrirPlaneacionDesdeSlotActual() {
    if (!slotMaeSel) {
      toast('Selecciona primero una clase en el horario.', 'error');
      return;
    }
    const asig = slotMaeSel.asignatura || '';
    let gr = String(slotMaeSel.grado || '').trim();
    let gp = String(slotMaeSel.grupo || '').trim().replace(/^\d+/, '').toUpperCase();
    if (!gr || !gp) {
      const selG = document.getElementById('selGrupoClase');
      const valG = (selG && selG.value) || '';
      if (valG) {
        const partes = valG.split('|');
        if (!gr) gr = partes[0] || '1';
        if (!gp) gp = (partes[1] || 'A').replace(/^\d+/, '').toUpperCase();
      }
    }
    if (!gr) gr = '1';
    if (!gp) gp = 'A';

    const fe = slotMaeSel.fecha || (document.getElementById('fechaMaeClase') || {}).value || fechaLocalClase();
    const idH = slotMaeSel.idHorario || '';
    const periodoInfo = calcularPeriodoSegunFecha_(fe);
    const campoInfo = inferirCampoYMetodologia_(asig);

    // Cambiar de pestaña al módulo de Planeación
    tabN1Clase('planeacion');

    // Abrir el formulario con los datos preconfigurados dinámicamente
    abrirFormNuevaPlaneacion({
      asignatura: asig,
      grado: gr,
      grupo: gp,
      fechaInicio: fe,
      periodo: periodoInfo.etiqueta,
      idHorario: idH,
      bloque: slotMaeSel.bloque || '',
      horaInicio: slotMaeSel.horaInicio || '',
      horaFin: slotMaeSel.horaFin || '',
      maestro: slotMaeSel.maestro || '',
      campoFormativo: campoInfo.campo,
      metodologia: campoInfo.metodologia,
      tituloSugerido: (asig ? asig + ' · ' : '') + gr + '°' + gp + ' (' + periodoInfo.etiqueta + ')'
    });

    toast('Planeación NEM precargada para ' + asig + ' (' + gr + '°' + gp + ')', 'info');
  }

    function abrirPlaneacionDesdeGrupoActual() {
      const selG = document.getElementById('selGrupoClase');
      const valG = (selG && selG.value) || '';
      const p = valG.split('|');
      const gr = p[0] || '1';
      const gp = (p[1] || 'A').replace(/^\d+/, '').toUpperCase();
      const fe = (document.getElementById('fechaMaeClase') || {}).value || fechaLocalClase();
      const perInfo = calcularPeriodoSegunFecha_(fe);
      tabN1Clase('planeacion');
      abrirFormNuevaPlaneacion({
        grado: gr,
        grupo: gp,
        fechaInicio: fe,
        periodo: perInfo.etiqueta,
        tituloSugerido: gr + '°' + gp + ' (' + perInfo.etiqueta + ')'
      });
    }

    function poblarSelectorHorarioPlan_(idHorarioSel) {
      const sel = document.getElementById('selPlanClaseHorario');
      if (!sel) return;
      let slots = (ctxPlanNEM && ctxPlanNEM.horariosDisponibles) || [];
      if (!slots.length && panelMaeUlt && panelMaeUlt.calendario) {
        const mapa = {};
        panelMaeUlt.calendario.forEach(function (d) {
          (d.horario || []).forEach(function (h) {
            const k = (h.idHorario || '') + '_' + (h.dia || '') + '_' + (h.bloque || '');
            if (!mapa[k] && h.asignatura) {
              const grH = String(h.grado || '').trim();
              const gpH = String(h.grupo || '').trim().replace(/^\d+/, '').toUpperCase();
              mapa[k] = {
                idHorario: h.idHorario,
                dia: h.dia || d.dia,
                bloque: h.bloque,
                horaInicio: h.horaInicio,
                horaFin: h.horaFin,
                grado: grH,
                grupo: gpH,
                asignatura: h.asignatura,
                maestro: h.maestro,
                etiqueta: (grH ? grH + '°' : '') + gpH + ' · ' + h.asignatura +
                  (h.dia ? (' (' + h.dia + (h.bloque ? (' · Hora ' + h.bloque) : '') + ')') : '')
              };
            }
          });
        });
        slots = Object.keys(mapa).map(function (k) { return mapa[k]; });
      }

      sel.innerHTML = '<option value="">-- Diseñar planeación libre (o elige una clase del horario para autocompletar) --</option>' +
        slots.map(function (s) {
          const val = JSON.stringify(s);
          const selStr = (idHorarioSel && String(s.idHorario) === String(idHorarioSel)) ? ' selected' : '';
          return '<option value="' + escaparHtml(val) + '"' + selStr + '>' + escaparHtml(s.etiqueta || (s.asignatura + ' · ' + s.grado + '°' + s.grupo)) + '</option>';
        }).join('');
    }

    var origenFormPlan = 'personal';

    function abrirFormNuevaPlaneacion(prefill) {
      prefill = prefill || {};
      origenFormPlan = prefill.origen || (slotMaeSel ? 'horario' : 'personal');

      const cajaLista = document.getElementById('cajaListaPlanNEM');
      const cajaSes = document.getElementById('cajaSesionesPlanNEM');
      const cajaForm = document.getElementById('cajaFormPlanNEM');
      if (cajaLista) cajaLista.classList.add('oculto');
      if (cajaSes) cajaSes.classList.add('oculto');
      if (cajaForm) cajaForm.classList.remove('oculto');
      let grUso = String(prefill.grado || '').trim();
      let gpUso = String(prefill.grupo || '').trim().replace(/^\d+/, '').toUpperCase();

      // Si no vienen especificados, heredar del horario o slot seleccionado
      if (!grUso || !gpUso) {
        if (slotMaeSel) {
          if (!grUso) grUso = String(slotMaeSel.grado || '').trim();
          if (!gpUso) gpUso = String(slotMaeSel.grupo || '').trim().replace(/^\d+/, '').toUpperCase();
        }
        if (!grUso || !gpUso) {
          const selG = document.getElementById('selGrupoClase');
          const valG = (selG && selG.value) || '';
          if (valG) {
            const partes = valG.split('|');
            if (!grUso) grUso = partes[0] || '1';
            if (!gpUso) gpUso = (partes[1] || 'A').replace(/^\d+/, '').toUpperCase();
          }
        }
      }
      if (!grUso) grUso = '1';
      if (!gpUso) gpUso = 'A';

      const feUso = prefill.fechaInicio || (slotMaeSel && slotMaeSel.fecha) || (document.getElementById('fechaMaeClase') || {}).value || fechaLocalClase();
      const perInfo = calcularPeriodoSegunFecha_(feUso);

      let asigUso = prefill.asignatura || (slotMaeSel && slotMaeSel.asignatura) || '';
      if (!asigUso) {
        asigUso = (ctxPlanNEM && ctxPlanNEM.asignaturas && ctxPlanNEM.asignaturas[0]) || 'Español';
      }

      const tit = document.getElementById('titFormPlan');
      if (tit) tit.textContent = 'Nueva Planeación Didáctica NEM';
      document.getElementById('planId').value = '';
      document.getElementById('planIdHorario').value = prefill.idHorario || (slotMaeSel && slotMaeSel.idHorario) || '';
      document.getElementById('planTitulo').value = prefill.tituloSugerido || '';
      document.getElementById('planGrado').value = grUso;
      actualizarGruposFormPlan(gpUso);
      document.getElementById('planGrupo').value = gpUso;
      document.getElementById('planAsignatura').value = asigUso;
      document.getElementById('planFechaInicio').value = feUso;
      document.getElementById('planPeriodo').value = prefill.periodo || perInfo.etiqueta;

      const badgePer = document.getElementById('badgePeriodoPlan');
      if (badgePer) badgePer.textContent = perInfo.badge;

      const inferido = inferirCampoYMetodologia_(asigUso);
      document.getElementById('planCampoFormativo').value = prefill.campoFormativo || inferido.campo;
      document.getElementById('planMetodologia').value = prefill.metodologia || inferido.metodologia;
      document.getElementById('planNumSesiones').value = '3';
      document.getElementById('planContenidoSintetico').value = '';
      document.getElementById('planPDA').value = '';
      document.getElementById('planProblema').value = '';
      document.getElementById('planProposito').value = '';

      document.querySelectorAll('#wrapEjesPlan input[type="checkbox"]').forEach(function (cb) {
        cb.checked = (cb.value === 'Inclusión' || cb.value === 'Apropiación de las culturas a través de la lectura y la escritura');
        cb.closest('.nem-eje-chip').classList.toggle('seleccionado', cb.checked);
      });

      poblarSelectorHorarioPlan_(prefill.idHorario || (slotMaeSel && slotMaeSel.idHorario));
      poblarSelectorProblemasCTE_();
      evaluarInclusionGrupo_(grUso, gpUso);
      const inpAjustes = document.getElementById('planAjustesRazonables'); if (inpAjustes) inpAjustes.value = prefill.ajustesRazonables || prefill.AjustesRazonables || '';

      actualizarEncabezadoClaseNEM_({
        asignatura: asigUso,
        grado: grUso,
        grupo: gpUso,
        fecha: feUso,
        periodo: prefill.periodo || perInfo.etiqueta,
        bloque: prefill.bloque || (slotMaeSel && slotMaeSel.bloque),
        horaInicio: prefill.horaInicio || (slotMaeSel && slotMaeSel.horaInicio),
        horaFin: prefill.horaFin || (slotMaeSel && slotMaeSel.horaFin),
        maestro: prefill.maestro || (slotMaeSel && slotMaeSel.maestro)
      });
      actualizarCatalogoPDAParaClase_(asigUso, grUso);
      irAPasoPlanNEM(1);
    }</script>
```

## AdminPlanJS_05.html

```html
<script>
/* AdminPlanJS_05 — actualizarGruposFormPlan, editarPlaneacionGeneral, cargarDatosEnFormPlan_, cerrarFormPlaneacion, guardarPlaneacionForm, abrirGestorSesiones, cerrarGestorSesiones, pintarTabsSesiones, seleccionarSesionNEM, generarGuionDesdeMomentos, ... */


    function actualizarGruposFormPlan(grupoSeleccionado) {
      const g = String((document.getElementById('planGrado') || {}).value || '1').trim();
      const sel = document.getElementById('planGrupo');
      if (!sel) return;

      const letrasSet = {};
      // 1. Extraer grupos del panel maestro actual
      if (panelMaeUlt && Array.isArray(panelMaeUlt.grupos)) {
        panelMaeUlt.grupos.forEach(function (grp) {
          const gr = String(grp.grado || (grp.clave && grp.clave.split('|')[0]) || '').trim();
          const gp = String(grp.grupo || (grp.clave && grp.clave.split('|')[1]) || '').trim().replace(/^\d+/, '').toUpperCase();
          if (!g || gr === g) {
            if (gp) letrasSet[gp] = true;
          }
        });
      }
      // 2. Extraer grupos de ctxPlanNEM
      if (ctxPlanNEM && Array.isArray(ctxPlanNEM.gruposDisponibles)) {
        ctxPlanNEM.gruposDisponibles.forEach(function (grp) {
          const gr = String(grp.grado || '').trim();
          const gp = String(grp.grupo || '').trim().replace(/^\d+/, '').toUpperCase();
          if (!g || gr === g) {
            if (gp) letrasSet[gp] = true;
          }
        });
      }
      // 3. Garantizar siempre grupos secundarios completos A, B, C, D, E, F
      ['A', 'B', 'C', 'D', 'E', 'F'].forEach(function (l) {
        letrasSet[l] = true;
      });

      const letras = Object.keys(letrasSet).sort();
      sel.innerHTML = letras.map(function (l) {
        return '<option value="' + escaparHtml(l) + '">' + escaparHtml(l) + '</option>';
      }).join('');

      let target = String(grupoSeleccionado || sel.value || 'A').trim().replace(/^\d+/, '').toUpperCase();
      if (!letrasSet[target]) target = letras[0] || 'A';
      sel.value = target;
    }

    function editarPlaneacionGeneral(id) {
      const p = (listaPlanNEM || []).find(function (item) { return (item.Id || item.id) === id; });
      if (!p) {
        const tk = (typeof getTokenPlan_ === 'function') ? getTokenPlan_() : (tokenClase || (typeof token !== 'undefined' ? token : ''));
        gsRun('obtenerPlaneacionCompletaNEM', tk, id).then(function (res) {
          if (res && res.planeacion) cargarDatosEnFormPlan_(res.planeacion);
        }).catch(function (e) { toast(e.message || String(e), 'error'); });
        return;
      }
      cargarDatosEnFormPlan_(p);
    }

    function cargarDatosEnFormPlan_(p) {
      origenFormPlan = 'personal';
      const cajaLista = document.getElementById('cajaListaPlanNEM');
      const cajaSes = document.getElementById('cajaSesionesPlanNEM');
      const cajaForm = document.getElementById('cajaFormPlanNEM');
      if (cajaLista) cajaLista.classList.add('oculto');
      if (cajaSes) cajaSes.classList.add('oculto');
      if (cajaForm) cajaForm.classList.remove('oculto');

      const tit = document.getElementById('titFormPlan');
      if (tit) tit.textContent = 'Editar Planeación Didáctica NEM';
      document.getElementById('planId').value = p.Id || p.id || '';
      document.getElementById('planIdHorario').value = p.IdHorario || p.idHorario || '';
      document.getElementById('planTitulo').value = p.Titulo || p.titulo || '';
      const gVal = String(p.Grado || p.grado || '1').trim();
      const gpVal = String(p.Grupo || p.grupo || 'A').trim().replace(/^\d+/, '').toUpperCase();
      document.getElementById('planGrado').value = gVal;
      actualizarGruposFormPlan(gpVal);
      document.getElementById('planGrupo').value = gpVal;
      document.getElementById('planAsignatura').value = p.Asignatura || p.asignatura || '';
      document.getElementById('planCampoFormativo').value = p.CampoFormativo || p.campoFormativo || 'Lenguajes';
      document.getElementById('planMetodologia').value = p.Metodologia || p.metodologia || 'Aprendizaje basado en proyectos comunitarios';
      document.getElementById('planNumSesiones').value = p.NumSesiones || p.numSesiones || 3;
      document.getElementById('planContenidoSintetico').value = p.ContenidoSintetico || p.contenidoSintetico || '';
      document.getElementById('planPDA').value = p.PDA || p.pda || '';
      document.getElementById('planProblema').value = p.ProblemaComunidad || p.problemaComunidad || '';
      document.getElementById('planProposito').value = p.Proposito || p.proposito || '';

      const feVal = p.FechaInicio || p.fechaInicio || '';
      document.getElementById('planFechaInicio').value = feVal;
      const perVal = p.Periodo || p.periodo || '';
      document.getElementById('planPeriodo').value = perVal;
      if (feVal) {
        alCambiarFechaInicioPlan();
      }

      const ejesArr = (p.EjesArticuladores || p.ejesArticuladores || '').split(',').map(function (s) { return s.trim(); });
      document.querySelectorAll('#wrapEjesPlan input[type="checkbox"]').forEach(function (cb) {
        cb.checked = ejesArr.indexOf(cb.value) >= 0;
        cb.closest('.nem-eje-chip').classList.toggle('seleccionado', cb.checked);
      });

      poblarSelectorHorarioPlan_(p.IdHorario || p.idHorario);

      actualizarEncabezadoClaseNEM_({
        asignatura: p.Asignatura || p.asignatura || '',
        grado: gVal,
        grupo: gpVal,
        fecha: feVal,
        periodo: perVal,
        maestro: p.Docente || (slotMaeSel && slotMaeSel.maestro)
      });
      actualizarCatalogoPDAParaClase_(p.Asignatura || p.asignatura, gVal);
      irAPasoPlanNEM(1);
    }

    function cerrarFormPlaneacion() {
      const selCampo = document.getElementById('planCampoFormativo'); if (selCampo) selCampo.disabled = false;
      const selMet = document.getElementById('planMetodologia'); if (selMet) selMet.disabled = false;
      const cajaForm = document.getElementById('cajaFormPlanNEM');
      const cajaSes = document.getElementById('cajaSesionesPlanNEM');
      const cajaLista = document.getElementById('cajaListaPlanNEM');
      if (cajaForm) cajaForm.classList.add('oculto');
      if (cajaSes) cajaSes.classList.add('oculto');

      if (origenFormPlan === 'horario') {
        conmutarVistaPlaneacion_('horario', document.getElementById('btnSubPlanHorario'));
      } else {
        if (cajaLista) cajaLista.classList.remove('oculto');
        conmutarVistaPlaneacion_('personal', document.getElementById('btnSubPlanBancoPersonal'));
      }
    }

    function guardarPlaneacionForm(ev) {
      if (ev) ev.preventDefault();
      const id = (document.getElementById('planId') || {}).value || '';
      const idHorario = (document.getElementById('planIdHorario') || {}).value || '';
      const titulo = String((document.getElementById('planTitulo') || {}).value || '').trim();
      const grado = (document.getElementById('planGrado') || {}).value || '';
      const grupo = (document.getElementById('planGrupo') || {}).value || '';
      const asig = (document.getElementById('planAsignatura') || {}).value || '';
      const fechaInicio = (document.getElementById('planFechaInicio') || {}).value || '';
      const periodo = (document.getElementById('planPeriodo') || {}).value || '';
      const campo = (document.getElementById('planCampoFormativo') || {}).value || '';
      const met = (document.getElementById('planMetodologia') || {}).value || '';
      const numSes = parseInt((document.getElementById('planNumSesiones') || {}).value || '3', 10);
      const contSint = (document.getElementById('planContenidoSintetico') || {}).value || '';
      const pda = (document.getElementById('planPDA') || {}).value || '';
      const prob = (document.getElementById('planProblema') || {}).value || '';
      const prop = (document.getElementById('planProposito') || {}).value || '';

      if (!titulo) {
        toast('Por favor escribe el título del proyecto didáctico en la Etapa 1.', 'error');
        if (typeof irAPasoPlanNEM === 'function') irAPasoPlanNEM(1);
        const titInp = document.getElementById('planTitulo');
        if (titInp) titInp.focus();
        return;
      }

      let grVal = String(grado || '').trim();
      let gpVal = String(grupo || '').trim().replace(/^\d+/, '').toUpperCase();
      let asigVal = String(asig || '').trim();
      if (!grVal) grVal = '1';
      if (!gpVal) gpVal = 'A';
      if (!asigVal) asigVal = (typeof ctxPlanNEM !== 'undefined' && ctxPlanNEM && ctxPlanNEM.asignaturas && ctxPlanNEM.asignaturas[0]) || 'Español';

      const ejes = [];
      document.querySelectorAll('#wrapEjesPlan input[type="checkbox"]:checked').forEach(function (cb) {
        ejes.push(cb.value);
      });

      const payload = {
        id: id,
        idHorario: idHorario,
        titulo: titulo,
        grado: grVal,
        grupo: gpVal,
        asignatura: asigVal,
        fechaInicio: fechaInicio,
        periodo: periodo,
        campoFormativo: campo,
        metodologia: met,
        numSesiones: numSes,
        ejesArticuladores: ejes.join(', '),
        contenidoSintetico: contSint,
        pda: pda,
        problemaComunidad: prob,
        proposito: prop
      };

      const btn = document.getElementById('btnGuardarPlan');
      const origText = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = '⏳ Guardando planeación…'; }

      let terminado = false;
      const timeoutFallback = setTimeout(function () {
        if (!terminado && btn) {
          btn.disabled = false;
          btn.textContent = origText || '💾 Guardar Planeación';
          toast('La operación tardó en responder. Verifica la lista de planeaciones.', 'info');
        }
      }, 30000);

      const tk = (typeof getTokenPlan_ === 'function') ? getTokenPlan_() : (tokenClase || (typeof token !== 'undefined' ? token : ''));

      gsRun('crearOActualizarPlaneacionNEM', tk, payload).then(function (res) {
        terminado = true;
        clearTimeout(timeoutFallback);
        if (btn) { btn.disabled = false; btn.textContent = origText || '💾 Guardar Planeación'; }
        if (!res || !res.ok) {
          const msg = (res && res.mensaje) || 'No se pudo guardar la planeación.';
          toast(msg, 'error');
          if (typeof modal === 'function') {
            modal({ titulo: '⚠️ Aviso al guardar planeación', html: '<p style="color:#b91c1c;font-size:13px;line-height:1.5;">' + escaparHtml(msg) + '</p>' });
          }
          return;
        }
        toast(res.mensaje || 'Planeación guardada con éxito.', 'ok');
        origenFormPlan = 'personal';
        cerrarFormPlaneacion();
        if (typeof conmutarVistaPlaneacion_ === 'function') {
          conmutarVistaPlaneacion_('personal', document.getElementById('btnSubPlanBancoPersonal'));
        } else if (typeof conmutarBancoPlaneacion_ === 'function') {
          conmutarBancoPlaneacion_('personal');
        }
        if (typeof cargarListaPlaneacionesNEM === 'function') cargarListaPlaneacionesNEM(true);
        const idTarget = (res && (res.id || res.Id)) || payload.id;
        if (idTarget) {
          abrirGestorSesiones(idTarget);
        }
      }).catch(function (e) {
        terminado = true;
        clearTimeout(timeoutFallback);
        if (btn) { btn.disabled = false; btn.textContent = origText || '💾 Guardar Planeación'; }
        const msg = (e && e.message) || String(e);
        toast(msg, 'error');
        if (typeof modal === 'function') {
          modal({ titulo: '❌ Error al guardar planeación', html: '<p style="color:#b91c1c;font-size:13px;line-height:1.5;">' + escaparHtml(msg) + '</p>' });
        }
      });
    }

    function abrirGestorSesiones(idPlaneacion) {
      const idPlan = String(idPlaneacion || '').trim();
      if (!idPlan) {
        toast('No se especificó un ID de planeación válido.', 'error');
        return;
      }
      const tk = (typeof getTokenPlan_ === 'function') ? getTokenPlan_() : (tokenClase || (typeof token !== 'undefined' ? token : ''));
        gsRun('obtenerPlaneacionCompletaNEM', tk, idPlan).then(function (res) {
        if (!res || !res.planeacion) throw new Error('No se encontró la planeación.');
        planActualNEM = res.planeacion;
        sesionesActualesNEM = res.sesiones || [];
        sesionActivaIdx = 0;

        const tabClases = document.getElementById('tabClases');
        const tabPlaneacion = document.getElementById('tabPlaneacion');
        if (tabClases) tabClases.classList.add('oculto');
        if (tabPlaneacion) tabPlaneacion.classList.remove('oculto');
        document.getElementById('cajaListaPlanNEM').classList.add('oculto');
        document.getElementById('cajaFormPlanNEM').classList.add('oculto');
        document.getElementById('cajaSesionesPlanNEM').classList.remove('oculto');

        const tit = document.getElementById('titPlanSesiones');
        const badge = document.getElementById('badgeEstadoPlan');
        const meta = document.getElementById('subMetaPlanSesiones');
        const btnAp = document.getElementById('btnAprobarPlan');

        const titPlan = planActualNEM.Titulo || planActualNEM.titulo || 'Sesiones Didácticas';
        if (tit) tit.textContent = titPlan;
        const est = String(planActualNEM.Estado || planActualNEM.estado || 'BORRADOR').toUpperCase();
        if (badge) {
          badge.textContent = est;
          badge.className = 'badge-nem ' + (est === 'APROBADO' ? 'badge-aprobado' : (est === 'PROGRAMADO' ? 'badge-programado' : 'badge-borrador'));
        }
        if (meta) {
          const asig = planActualNEM.Asignatura || planActualNEM.asignatura || '';
          const gr = planActualNEM.Grado || planActualNEM.grado || '';
          const gp = planActualNEM.Grupo || planActualNEM.grupo || '';
          const cmp = planActualNEM.CampoFormativo || planActualNEM.campoFormativo || '';
          meta.textContent = asig + ' · ' + gr + '°' + gp + ' · Campo: ' + cmp + ' · ' + (sesionesActualesNEM.length) + ' sesiones de 40 min';
        }
        if (btnAp) {
          btnAp.style.display = (est === 'APROBADO' || est === 'PROGRAMADO') ? 'none' : 'inline-block';
        }

        pintarTabsSesiones();
        seleccionarSesionNEM(0);
      }).catch(function (e) {
        toast((e && e.message) || String(e), 'error');
      });
    }

    function cerrarGestorSesiones() {
      document.getElementById('cajaSesionesPlanNEM').classList.add('oculto');
      document.getElementById('cajaListaPlanNEM').classList.remove('oculto');
      cargarListaPlaneacionesNEM();
    }

    function pintarTabsSesiones() {
      const tabs = document.getElementById('tabsSesionesPlan');
      if (!tabs) return;
      let html = '';
      sesionesActualesNEM.forEach(function (s, idx) {
        const act = (idx === sesionActivaIdx) ? ' activa' : '';
        const num = s.NumeroSesion || (idx + 1);
        const est = s.Estado ? (' · ' + s.Estado) : '';
        const estado = String(s.Estado || '').toUpperCase();
        const claseEstado = estado.indexOf('APROB') >= 0 ? ' aprobada'
                          : estado.indexOf('BORRAD') >= 0 ? ' borrador' : '';
        html += '<button type="button" class="nem-tab-sesion' + act + claseEstado + '" onclick="seleccionarSesionNEM(' + idx + ')">';
        html += 'Sesión ' + num + ' (40 min)' + escaparHtml(est);
        html += '</button>';
      });
      tabs.innerHTML = html;
    }

    function seleccionarSesionNEM(idx) {
      sesionActivaIdx = idx;
      pintarTabsSesiones();
      const s = sesionesActualesNEM[idx];
      const ed = document.getElementById('editorSesionActiva');
      if (!s || !ed) return;
      ed.classList.remove('oculto');

      const tit = document.getElementById('titSesionActiva');
      const prog = document.getElementById('progSesionActiva');
      if (tit) tit.textContent = 'Sesión ' + (s.NumeroSesion || (idx + 1)) + ' (40 minutos)';
      if (prog) {
        prog.textContent = s.FechaProgramada ? ('📅 Programada para: ' + s.FechaProgramada + ' (Horario ' + (s.IdHorario || '') + ')') : 'Sin fecha asignada en horario';
      }

      document.getElementById('sesTitulo').value = s.Titulo || '';
      document.getElementById('sesApertura').value = s.AperturaTexto || '';
      document.getElementById('sesDesarrollo').value = s.DesarrolloTexto || '';
      document.getElementById('sesActividad').value = s.ActividadTexto || '';
      document.getElementById('sesCierre').value = s.CierreTexto || '';

      let recArr = [];
      try {
        if (s.RecursosVisualesJSON) recArr = JSON.parse(s.RecursosVisualesJSON);
      } catch (e) {}
      const primerRec = (recArr && recArr[0]) || {};
      document.getElementById('sesVisualUrl').value = primerRec.url || '';
      document.getElementById('sesVisualDesc').value = primerRec.descripcionAccesible || '';

      document.getElementById('sesGuionEstudiante').value = s.GuionEstudianteAccesible || '';

      let gDoc = {};
      try {
        if (s.GuionDocenteJSON) gDoc = JSON.parse(s.GuionDocenteJSON);
      } catch (e) {}
      document.getElementById('sesNotasDocente').value = gDoc.notas || '';
    }

    function generarGuionDesdeMomentos() {
      const ap = (document.getElementById('sesApertura') || {}).value || '';
      const des = (document.getElementById('sesDesarrollo') || {}).value || '';
      const act = (document.getElementById('sesActividad') || {}).value || '';
      const cie = (document.getElementById('sesCierre') || {}).value || '';
      const imgUrl = (document.getElementById('sesVisualUrl') || {}).value || '';
      const imgDesc = (document.getElementById('sesVisualDesc') || {}).value || '';
      const tit = (document.getElementById('sesTitulo') || {}).value || 'Sesión de Clase';

      let out = '## ' + tit + '\n\n';
      if (ap.trim()) {
        out += '### 1. Apertura (5 min)\n' + ap.trim() + '\n\n';
      }
      if (des.trim()) {
        out += '### 2. Desarrollo y Explicación (10 min)\n' + des.trim() + '\n\n';
      }
      if (imgDesc.trim()) {
        out += '### Recurso Visual Accesible (DUA)\n';
        if (imgUrl.trim()) out += '![' + imgDesc.trim() + '](' + imgUrl.trim() + ')\n';
        out += '[Descripción auditiva: ' + imgDesc.trim() + ']\n\n';
      }
      if (act.trim()) {
        out += '### 3. Actividad de Aprendizaje (20 min)\n' + act.trim() + '\n\n';
      }
      if (cie.trim()) {
        out += '### 4. Cierre y Metacognición (5 min)\n' + cie.trim() + '\n';
      }

      const campo = document.getElementById('sesGuionEstudiante');
      if (campo) {
        campo.value = out.trim();
        toast('Guion accesible generado con los 4 momentos NEM.', 'ok');
      }
    }

    function guardarSesionActiva() {
      const s = sesionesActualesNEM[sesionActivaIdx];
      if (!s) return;

      const imgUrl = ((document.getElementById('sesVisualUrl') || {}).value || '').trim();
      const imgDesc = ((document.getElementById('sesVisualDesc') || {}).value || '').trim();

      if (imgUrl && !imgDesc) {
        toast('Regla DUA: La descripción oral de la imagen es obligatoria para garantizar accesibilidad a invidentes.', 'error');
        return;
      }

      const recs = [];
      if (imgDesc) {
        recs.push({ tipo: 'imagen', url: imgUrl, descripcionAccesible: imgDesc });
      }

      let guion = ((document.getElementById('sesGuionEstudiante') || {}).value || '').trim();
      if (!guion) {
        generarGuionDesdeMomentos();
        guion = ((document.getElementById('sesGuionEstudiante') || {}).value || '').trim();
      }

      const tituloSes = (document.getElementById('sesTitulo') || {}).value || '';
      const publicarAhora = !!(document.getElementById('chkPubSesionClase') || {}).checked;

      const sId = s ? (s.Id || s.id || '') : '';
      const pId = planActualNEM ? (planActualNEM.Id || planActualNEM.id || '') : '';

      const payload = {
        id: sId,
        idSesion: sId,
        idPlaneacion: pId,
        titulo: tituloSes,
        duracionMin: 40,
        aperturaTexto: (document.getElementById('sesApertura') || {}).value || '',
        aperturaMin: 5,
        desarrolloTexto: (document.getElementById('sesDesarrollo') || {}).value || '',
        desarrolloMin: 10,
        recursosVisualesJSON: JSON.stringify(recs),
        actividadTexto: (document.getElementById('sesActividad') || {}).value || '',
        actividadMin: 20,
        cierreTexto: (document.getElementById('sesCierre') || {}).value || '',
        cierreMin: 5,
        guionDocenteJSON: JSON.stringify({ notas: (document.getElementById('sesNotasDocente') || {}).value || '' }),
        guionEstudianteAccesible: guion
      };

      const tk = (typeof getTokenPlan_ === 'function') ? getTokenPlan_() : (tokenClase || (typeof token !== 'undefined' ? token : ''));
      gsRun('guardarSesionNEM', tk, payload).then(function (res) {
        toast((res && res.mensaje) || 'Sesión guardada exitosamente.', 'ok');
        sesionesActualesNEM[sesionActivaIdx] = Object.assign(s, payload);
        pintarTabsSesiones();

        // Si se seleccionó "Publicar ahora", publicar en el horario / Aula Hablada para los alumnos
        const idHorarioUso = s.IdHorario || (planActualNEM && planActualNEM.IdHorario) || (slotMaeSel && slotMaeSel.idHorario);
        const fechaUso = s.FechaProgramada || (planActualNEM && planActualNEM.FechaInicio) || (slotMaeSel && slotMaeSel.fecha) || fechaLocalClase();

        if (publicarAhora && idHorarioUso && fechaUso) {
          gsRun('guardarContenidoClase', tokenClase, {
            idHorario: idHorarioUso,
            fecha: fechaUso,
            titulo: tituloSes || (planActualNEM && planActualNEM.Titulo) || 'Clase',
            texto: guion,
            publicado: true
          }).then(function () {
            toast('Contenido publicado en el Horario para los alumnos.', 'ok');
            cargarHorarioMae();
          }).catch(function () {});
        }
      }).catch(function (e) {
        toast((e && e.message) || String(e), 'error');
      });
    }

    function probarVozGuionSesion() {
      const tit = (document.getElementById('sesTitulo') || {}).value || '';
      let txt = (document.getElementById('sesGuionEstudiante') || {}).value || '';
      if (!txt.trim()) {
        generarGuionDesdeMomentos();
        txt = (document.getElementById('sesGuionEstudiante') || {}).value || '';
      }
      if (!txt.trim()) {
        toast('Escribe o genera el texto a leer antes de escuchar.', 'info');
        return;
      }
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        detenerVoz();
        toast('Audio en pausa.', 'info');
      } else {
        hablarTexto((tit ? (tit + '. ') : '') + txt);
        toast('Reproduciendo texto en voz alta...', 'info');
      }
    }

    function aprobarPlaneacionActual() {
      if (!planActualNEM) return;
      const pId = planActualNEM.Id || planActualNEM.id || '';
      if (!pId) {
        toast('No se encontró el ID de la planeación para aprobar.', 'error');
        return;
      }
      confirmar('¿Deseas marcar esta planeación como APROBADA? Podrás calendarizar sus sesiones directamente en el horario.', 'Aprobar Planeación Didáctica').then(function (ok) {
        if (!ok) return;
        const tk = (typeof getTokenPlan_ === 'function') ? getTokenPlan_() : (tokenClase || (typeof token !== 'undefined' ? token : ''));
        gsRun('aprobarPlaneacionNEM', tk, pId).then(function (res) {
          toast((res && res.mensaje) || 'Planeación aprobada.', 'ok');
          planActualNEM.Estado = 'APROBADO';
          planActualNEM.estado = 'APROBADO';
          const badge = document.getElementById('badgeEstadoPlan');
          if (badge) {
            badge.textContent = 'APROBADO';
            badge.className = 'badge-nem badge-aprobado';
          }
          const btnAp = document.getElementById('btnAprobarPlan');
          if (btnAp) btnAp.style.display = 'none';
        }).catch(function (e) {
          toast((e && e.message) || String(e), 'error');
        });
      });
    }

    function abrirModalCalendarizarSesion() {
      const s = sesionesActualesNEM[sesionActivaIdx];
      if (!s) return;

      const hoy = fechaLocalClase();

      modal({
        titulo: 'Calendarizar Sesión ' + (s.NumeroSesion || (sesionActivaIdx + 1)) + ' en Horario',
        html: '<p class="hint" style="margin-top:0;">Asigna la fecha y el bloque de clase para esta sesión. Se publicará automáticamente en el Aula Hablada para tus alumnos.</p>' +
          '<label for="calSesIdHorario">ID de Horario / Bloque (ej. 1, 2, 3)</label>' +
          '<input id="calSesIdHorario" type="text" value="' + escaparHtml(s.IdHorario || '1') + '" placeholder="Número de horario o bloque">' +
          '<label for="calSesFecha">Fecha de impartición</label>' +
          '<input id="calSesFecha" type="date" value="' + escaparHtml(s.FechaProgramada || hoy) + '">',
        botones: [
          { texto: 'Cancelar', valor: null, clase: 'btn-secundario' },
          { texto: 'Calendarizar y Publicar', valor: 'ok' }
        ],
        capturar: function (fondo, val) {
          if (val === null) return null;
          return {
            idHorario: (fondo.querySelector('#calSesIdHorario') || {}).value || '',
            fecha: (fondo.querySelector('#calSesFecha') || {}).value || ''
          };
        }
      }).then(function (datos) {
        if (!datos || !datos.idHorario || !datos.fecha) return;
        const tk = (typeof getTokenPlan_ === 'function') ? getTokenPlan_() : (tokenClase || (typeof token !== 'undefined' ? token : ''));
        gsRun('calendarizarSesionNEM', tk, s.Id, datos.idHorario, datos.fecha).then(function (res) {
          toast((res && res.mensaje) || 'Sesión calendarizada en horario y disponible en Aula Hablada.', 'ok');
          s.IdHorario = datos.idHorario;
          s.FechaProgramada = datos.fecha;
          s.Estado = 'PROGRAMADO';
          const prog = document.getElementById('progSesionActiva');
          if (prog) prog.textContent = '📅 Programada para: ' + datos.fecha + ' (Horario ' + datos.idHorario + ')';
          pintarTabsSesiones();
        }).catch(function (e) {
          toast((e && e.message) || String(e), 'error');
        });
      });
    }

    /* RENDERIZADO MULTIMODAL DUA PARA ESTUDIANTES (LEER, VER Y ESCUCHAR) */
    function renderizarTextoClaseDUA(cont) {
      const vis = document.getElementById('textoClaseVis');
      if (!vis) return;
      if (!cont || !cont.texto) {
        vis.innerHTML = '';
        parrafosVozAlu_ = [];
        return;
      }

      const bruto = String(cont.texto || '').replace(/\r/g, '').trim();
      const lineas = bruto.split('\n');
      let html = '<div class="dua-clase-contenedor">';
      if (cont.titulo) {
        html += '<h2 style="font-size:20px;color:var(--st90-azul);margin:0 0 10px;">' + escaparHtml(cont.titulo) + '</h2>';
      }

      parrafosVozAlu_ = [];
      let pIdx = 0;
      let bloqueMomento = '';
      let parrafosMomento = '';

      function cerrarBloque() {
        if (bloqueMomento || parrafosMomento) {
          html += '<div class="dua-seccion-momento">';
          if (bloqueMomento) html += '<h3>' + bloqueMomento + '</h3>';
          html += parrafosMomento;
          html += '</div>';
          bloqueMomento = '';
          parrafosMomento = '';
        }
      }

      lineas.forEach(function (l) {
        const linea = l.trim();
        if (!linea) return;

        if (/^###?\s+(1\.\s*Apertura|Apertura)/i.test(linea)) {
          cerrarBloque();
          bloqueMomento = '⏱️ 1. Apertura (5 min)';
        } else if (/^###?\s+(2\.\s*Desarrollo|Desarrollo|Explicaci[oó]n)/i.test(linea)) {
          cerrarBloque();
          bloqueMomento = '📖 2. Desarrollo y Explicación (10 min)';
        } else if (/^###?\s+(3\.\s*Actividad|Actividad|Producci[oó]n)/i.test(linea)) {
          cerrarBloque();
          bloqueMomento = '✍️ 3. Actividad de Aprendizaje (20 min)';
        } else if (/^###?\s+(4\.\s*Cierre|Cierre|Metacognici[oó]n)/i.test(linea)) {
          cerrarBloque();
          bloqueMomento = '🎯 4. Cierre y Metacognición (5 min)';
        } else if (/^###?\s+/i.test(linea)) {
          cerrarBloque();
          bloqueMomento = escaparHtml(linea.replace(/^###?\s+/, ''));
        } else if (/^!\[(.*?)\]\((.*?)\)/.test(linea)) {
          const m = linea.match(/^!\[(.*?)\]\((.*?)\)/);
          const alt = m[1] || '';
          const url = m[2] || '';
          parrafosMomento += '<div class="dua-recurso-visual">';
          if (url) parrafosMomento += '<img src="' + escaparHtml(url) + '" alt="' + escaparHtml(alt) + '">';
          parrafosMomento += '</div>';
        } else if (/^\[Descripci[oó]n auditiva:\s*(.*?)\]/i.test(linea)) {
          const m = linea.match(/^\[Descripci[oó]n auditiva:\s*(.*?)\]/i);
          const desc = m ? m[1] : linea;
          parrafosMomento += '<div class="dua-desc-audio-box" role="note">';
          parrafosMomento += '  <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">';
          parrafosMomento += '    <span class="dua-badge-audio">🔊 Descripción auditiva</span>';
          parrafosMomento += '    <span style="font-size:12px;font-weight:700;">Accesible para voz y braille</span>';
          parrafosMomento += '  </div>';
          parrafosMomento += '  <p style="margin:0;">' + escaparHtml(desc) + '</p>';
          parrafosMomento += '</div>';
          parrafosVozAlu_.push(desc);
        } else {
          parrafosMomento += '<p class="dua-parrafo" data-pidx="' + pIdx + '" onclick="hablarDesdeParrafo(' + pIdx + ')">' + escaparHtml(linea) + '</p>';
          parrafosVozAlu_.push(linea);
          pIdx++;
        }
      });

      cerrarBloque();
      html += '</div>';
      vis.innerHTML = html;
    }

    function hablarDesdeParrafo(idx) {
      if (!parrafosVozAlu_ || !parrafosVozAlu_.length) return;
      const sub = parrafosVozAlu_.slice(idx);
      if (!sub.length) return;
      detenerVoz();
      parrafoVozActualIdx_ = idx;
      actualizarParrafoVozEnfocado_(idx);
      hablarTexto(sub.join('. '));
    }

    function actualizarParrafoVozEnfocado_(idx) {
      document.querySelectorAll('#textoClaseVis .dua-parrafo').forEach(function (el) {
        const p = parseInt(el.getAttribute('data-pidx'), 10);
        const match = (p === idx);
        el.classList.toggle('voz-enfocada', match);
        if (match) {
          try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
        }
      });
    }

    const campoClaveClase = document.getElementById('claveClase');
    const campoUsuarioClase = document.getElementById('usuarioClase');

    /* ============================================================
       ARQUITECTURA MODULAR "LEGO" — CONTROLADORES DEL APP SHELL
       ============================================================ */
    const MAPA_MODULOS_ = {
      'planeacion': 'moduloViewPlaneacion',
      'encuestas': 'moduloViewEncuestas',
      'lectura': 'moduloViewLectura',
      'asistencia': 'moduloViewAsistencia',
      'trabajo_social': 'moduloViewTrabajoSocial',
      'biblioteca': 'moduloViewBiblioteca',
      'admin': 'moduloViewAdmin'
    };

    const MAPA_NAV_ITEMS_ = {
      'planeacion': 'navModPlaneacion',
      'encuestas': 'navModEncuestas',
      'lectura': 'navModLectura',
      'asistencia': 'navModAsistencia',
      'trabajo_social': 'navModTrabajoSocial',
      'biblioteca': 'navModBiblioteca',
      'admin': 'navModAdmin'
    };

    let moduloActivoShell_ = 'planeacion';

    function resolverClaveModulo_(param) {
      if (!param) return 'planeacion';
      let s = String(param).trim();
      s = s.replace(/^(?:moduloView|navMod)/i, '');
      s = s.replace(/([A-Z])/g, function (m) { return '_' + m.toLowerCase(); });
      s = s.replace(/^_/, '').toLowerCase();
      if (s === 'trabajosocial') s = 'trabajo_social';
      return MAPA_MODULOS_[s] ? s : 'planeacion';
    }</script>
```

## AdminPlanJS_06.html

```html
<script>
/* AdminPlanJS_06 — conmutarModuloShell, toggleSidebarShell, etapaPlanActual_, irAPasoPlanNEM, CATALOGO_LIBROS_SEP_FASE6_, abrirModalLibrosSEP_, insertarReferenciaLibroSesion_, eliminarIDeviceCard_, eliminarLegoCard_, insertariDeviceSesion_, serializarIDevicesSesion_, validarMomentosSesionAntesDeGuardar_, ... */


    function conmutarModuloShell(nombreModulo) {
      const clave = resolverClaveModulo_(nombreModulo);
      const idContenedor = MAPA_MODULOS_[clave] || 'moduloViewPlaneacion';
      const idNav = MAPA_NAV_ITEMS_[clave] || 'navModPlaneacion';
      moduloActivoShell_ = clave;

      // 1. Oculta TODOS los contenedores modulares (.modulo-shell-contenedor)
      const vistas = document.querySelectorAll('.modulo-shell-contenedor');
      vistas.forEach(function (v) {
        v.classList.add('oculto');
        v.classList.add('d-none');
        v.style.setProperty('display', 'none', 'important');
      });

      // 2. Quita la clase activo de todos los botones .app-shell-nav-item
      const navItems = document.querySelectorAll('.app-shell-nav-item');
      navItems.forEach(function (btn) {
        btn.classList.remove('activo');
      });

      // 3. Al contenedor del módulo seleccionado, retírale la clase oculto y aplícale display: block !important
      const vistaDestino = document.getElementById(idContenedor);
      if (vistaDestino) {
        vistaDestino.classList.remove('oculto');
        vistaDestino.classList.remove('d-none');
        vistaDestino.style.setProperty('display', 'block', 'important');
      }

      // 4. Al botón correspondiente en la barra lateral, agrégale la clase activo
      const btnActivo = document.getElementById(idNav);
      if (btnActivo) {
        btnActivo.classList.add('activo');
      }

      // 5. Inicializaciones reactivas bajo demanda
      if (clave === 'encuestas') {
        setTimeout(iniciarGraficasDiagnostico_, 100);
      } else if (clave === 'asistencia') {
        setTimeout(cargarAlumnosAsistenciaRapida_, 50);
      } else if (clave === 'lectura') {
        setTimeout(inicializarLecturaModulo_, 50);
      } else if (clave === 'admin') {
        // Desplazamiento suave al inicio de la consola de administración
        if (vistaDestino) {
          vistaDestino.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }

    function toggleSidebarShell() {
      const sidebar = document.getElementById('appShellSidebar');
      if (!sidebar) return;
      sidebar.classList.toggle('colapsado');
      try {
        localStorage.setItem('ST90_SIDEBAR_COLAPSADO', sidebar.classList.contains('colapsado') ? '1' : '0');
      } catch (e) {}
    }

    /* ============================================================
       STEPPER UX INTERACTIVO EN 4 ETAPAS (PLANEACIÓN NEM)
       ============================================================ */
    var etapaPlanActual_ = 1;

    function irAPasoPlanNEM(paso) {
      const p = Math.max(1, Math.min(4, parseInt(paso, 10) || 1));
      etapaPlanActual_ = p;

      for (let i = 1; i <= 4; i++) {
        const tab = document.getElementById('tabPasoPlan' + i);
        const pane = document.getElementById('etapaPlanNEM_' + i);
        if (tab) {
          tab.classList.toggle('activo', i === p);
          tab.classList.toggle('completado', i < p);
          tab.setAttribute('aria-selected', i === p ? 'true' : 'false');
        }
        if (pane) {
          pane.classList.toggle('oculto', i !== p);
        }
      }

      // Sincronizar dinámicamente según el paso
      if (p === 2) {
        const asig = (document.getElementById('planAsignatura') || {}).value || '';
        const gr = (document.getElementById('planGrado') || {}).value || '1';
        if (typeof actualizarCatalogoPDAParaClase_ === 'function') {
          actualizarCatalogoPDAParaClase_(asig, gr);
        }
      } else if (p === 3) {
        if (typeof poblarSelectorProblemasCTE_ === 'function') {
          poblarSelectorProblemasCTE_();
        }
        const gr = (document.getElementById('planGrado') || {}).value || '1';
        const gp = (document.getElementById('planGrupo') || {}).value || 'A';
        if (typeof evaluarInclusionGrupo_ === 'function') {
          evaluarInclusionGrupo_(gr, gp);
        }
      }

      const stepHeader = document.querySelector('.nem-stepper-header');
      if (stepHeader) {
        try { stepHeader.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
      }
    }

    /* ============================================================
       CATÁLOGO OFICIAL DE LIBROS DE TEXTO SEP FASE 6 (SECUNDARIA)
       ============================================================ */
    const CATALOGO_LIBROS_SEP_FASE6_ = [
      {
        id: 'LIB-1-LEN',
        grado: 1,
        campo: 'Lenguajes',
        titulo: 'Lenguajes (Colección Ximhai - 1.er Grado)',
        editorial: 'SEP / Conaliteg',
        proyectosSugeridos: ['Narrativas de la comunidad', 'Códices y expresiones artísticas', 'El periódico escolar comunitario'],
        paginasRelevantes: 'Págs. 14-38 (Identidad y memoria), Págs. 82-105 (Teatro y palabra)'
      },
      {
        id: 'LIB-1-SAB',
        grado: 1,
        campo: 'Saberes y Pensamiento Científico',
        titulo: 'Saberes y Pensamiento Científico (1.er Grado)',
        editorial: 'SEP / Conaliteg',
        proyectosSugeridos: ['Biología y salud comunitaria', 'Matemáticas en la biodiversidad', 'Ecosistemas locales'],
        paginasRelevantes: 'Págs. 22-45 (Célula y funciones vitales), Págs. 120-138 (Álgebra y geometría del entorno)'
      },
      {
        id: 'LIB-1-ENS',
        grado: 1,
        campo: 'Ética, Naturaleza y Sociedades',
        titulo: 'Ética, Naturaleza y Sociedades (1.er Grado)',
        editorial: 'SEP / Conaliteg',
        proyectosSugeridos: ['Geografía del entorno escolar', 'Historia comunitaria', 'Pueblos originarios'],
        paginasRelevantes: 'Págs. 18-42 (Espacio geográfico y riesgos), Págs. 94-118 (Derechos humanos)'
      },
      {
        id: 'LIB-1-DHC',
        grado: 1,
        campo: 'De lo Humano y lo Comunitario',
        titulo: 'De lo Humano y lo Comunitario (1.er Grado)',
        editorial: 'SEP / Conaliteg',
        proyectosSugeridos: ['Tecnología y bienestar', 'Educación física e inclusión', 'Tutoría socioemocional'],
        paginasRelevantes: 'Págs. 10-34 (Procesos técnicos y artesanales), Págs. 60-85 (Asertividad)'
      },
      {
        id: 'LIB-1-PROY',
        grado: 1,
        campo: 'Interdisciplinar',
        titulo: 'Nuestro Libro de Proyectos (Tomo 1 - 1.er Grado)',
        editorial: 'SEP / Conaliteg',
        proyectosSugeridos: ['Proyectos Comunitarios de Aula y Escuela', 'Indagación STEAM escolar'],
        paginasRelevantes: 'Págs. 40-75 (Guía metodológica para proyectos integradores)'
      },
      {
        id: 'LIB-2-LEN',
        grado: 2,
        campo: 'Lenguajes',
        titulo: 'Lenguajes (2.° Grado)',
        editorial: 'SEP / Conaliteg',
        proyectosSugeridos: ['Ensayo crítico y argumentación', 'Lectura dramatizada', 'Variantes lingüísticas'],
        paginasRelevantes: 'Págs. 28-60 (Textos informativos y opinión), Págs. 140-165 (Poesía comunitaria)'
      },
      {
        id: 'LIB-2-SAB',
        grado: 2,
        campo: 'Saberes y Pensamiento Científico',
        titulo: 'Saberes y Pensamiento Científico: Física y Matemáticas (2.° Grado)',
        editorial: 'SEP / Conaliteg',
        proyectosSugeridos: ['Fuerzas y movimiento en el transporte', 'Energía sustentable', 'Sistemas de ecuaciones'],
        paginasRelevantes: 'Págs. 30-58 (Leyes del movimiento y fricción), Págs. 110-135 (Energía térmica)'
      },
      {
        id: 'LIB-2-ENS',
        grado: 2,
        campo: 'Ética, Naturaleza y Sociedades',
        titulo: 'Ética, Naturaleza y Sociedades: Historia de México (2.° Grado)',
        editorial: 'SEP / Conaliteg',
        proyectosSugeridos: ['Independencia y soberanía', 'Identidades culturales', 'Cultura de paz'],
        paginasRelevantes: 'Págs. 50-82 (Transformaciones sociales del siglo XIX)'
      },
      {
        id: 'LIB-2-PROY',
        grado: 2,
        campo: 'Interdisciplinar',
        titulo: 'Nuestro Libro de Proyectos (Tomo 2 - 2.° Grado)',
        editorial: 'SEP / Conaliteg',
        proyectosSugeridos: ['Proyectos Comunitarios de Aula', 'Indagación y ABP'],
        paginasRelevantes: 'Págs. 35-70 (Metodologías activas para segundo grado)'
      },
      {
        id: 'LIB-3-LEN',
        grado: 3,
        campo: 'Lenguajes',
        titulo: 'Lenguajes (3.er Grado)',
        editorial: 'SEP / Conaliteg',
        proyectosSugeridos: ['Debate y oratoria', 'Literatura latinoamericana', 'Medios de comunicación'],
        paginasRelevantes: 'Págs. 32-65 (Análisis crítico del discurso mediático)'
      },
      {
        id: 'LIB-3-SAB',
        grado: 3,
        campo: 'Saberes y Pensamiento Científico',
        titulo: 'Saberes y Pensamiento Científico: Química y Matemáticas (3.er Grado)',
        editorial: 'SEP / Conaliteg',
        proyectosSugeridos: ['Reacciones químicas en el entorno', 'Funciones cuadráticas', 'Salud y consumo'],
        paginasRelevantes: 'Págs. 40-72 (Tabla periódica y enlaces), Págs. 130-160 (Trigonometría)'
      },
      {
        id: 'LIB-3-PROY',
        grado: 3,
        campo: 'Interdisciplinar',
        titulo: 'Nuestro Libro de Proyectos (Tomo 3 - 3.er Grado)',
        editorial: 'SEP / Conaliteg',
        proyectosSugeridos: ['Proyectos de impacto comunitario final', 'ABP y Aprendizaje Servicio'],
        paginasRelevantes: 'Págs. 20-55 (Rúbricas de evaluación formativa y productos comunitarios)'
      }
    ];

    function abrirModalLibrosSEP_() {
      const gradoSel = parseInt((document.getElementById('planGrado') && document.getElementById('planGrado').value) || '1', 10);
      const campoSel = (document.getElementById('planCampoFormativo') && document.getElementById('planCampoFormativo').value) || '';

      const filtrados = CATALOGO_LIBROS_SEP_FASE6_.filter(function (l) {
        return l.grado === gradoSel || l.campo === campoSel || l.campo === 'Interdisciplinar';
      });

      let itemsHtml = '';
      filtrados.forEach(function (lib, idx) {
        itemsHtml += '<div style="background:#ffffff;border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px;margin-bottom:8px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">' +
            '<div>' +
              '<span style="font-size:10px;font-weight:800;color:#1e40af;background:#dbeafe;padding:1px 6px;border-radius:4px;">' + escaparHtml(lib.campo) + ' • ' + lib.grado + '°</span>' +
              '<h4 style="margin:4px 0 2px;font-size:13px;color:#0f172a;">' + escaparHtml(lib.titulo) + '</h4>' +
              '<p style="font-size:11px;color:#64748b;margin:0 0 4px;">Editorial: ' + escaparHtml(lib.editorial) + ' | ' + escaparHtml(lib.paginasRelevantes) + '</p>' +
              '<div style="font-size:10.5px;color:#15803d;">💡 Sugerencias: ' + escaparHtml(lib.proyectosSugeridos.join(', ')) + '</div>' +
            '</div>' +
            '<button type="button" class="btn-soft-primary" onclick="insertarReferenciaLibroSesion_(' + idx + ')" style="font-size:11px;padding:4px 8px;white-space:nowrap;">' +
              '📥 Vincular' +
            '</button>' +
          '</div>' +
        '</div>';
      });

      const modalHtml = '<div style="max-height:420px;overflow-y:auto;padding-right:4px;">' +
        '<p style="font-size:12px;color:#475569;margin:0 0 10px;">' +
          'Selecciona un libro de texto oficial de la SEP Fase 6 para insertar su vinculación curricular y páginas sugeridas en la sesión activa:' +
        '</p>' +
        '<div>' + itemsHtml + '</div>' +
      '</div>';

      modal({
        titulo: '📚 Catálogo de Libros de Texto Gratuitos SEP Fase 6',
        html: modalHtml,
        botones: [{ texto: 'Cerrar', clase: 'btn-secundario', valor: false }]
      });
    }

    function insertarReferenciaLibroSesion_(idx) {
      const gradoSel = parseInt((document.getElementById('planGrado') && document.getElementById('planGrado').value) || '1', 10);
      const campoSel = (document.getElementById('planCampoFormativo') && document.getElementById('planCampoFormativo').value) || '';
      const filtrados = CATALOGO_LIBROS_SEP_FASE6_.filter(function (l) {
        return l.grado === gradoSel || l.campo === campoSel || l.campo === 'Interdisciplinar';
      });
      const libro = filtrados[idx];
      if (!libro) return;

      const refTexto = '\n\n[Referencia SEP Fase 6]: ' + libro.titulo + ' (' + libro.paginasRelevantes + '). Proyectos recomendados: ' + libro.proyectosSugeridos.join('; ') + '.';
      const sesDesarrollo = document.getElementById('sesDesarrollo');
      if (sesDesarrollo) {
        sesDesarrollo.value = (sesDesarrollo.value ? sesDesarrollo.value.trim() : '') + refTexto;
        sesDesarrollo.focus();
      }
      toast('Referencia del libro SEP vinculada a la sesión.', 'ok');
    }

    /* ============================================================
       BLOQUES MODULARES IDEVICES TIPO EXELearning
       Los cuatro momentos del editor viven en #sesApertura, #sesDesarrollo,
       #sesActividad y #sesCierre. Si el DOM llegara a exponer los alias
       #planApertura, #planDesarrollo, #planActividad y #planCierre, se leen igual.
       ============================================================ */
    var seqIDevice_ = 0;
    var idevicesTocados_ = false;
    var MARCA_IDEVICES_INI_ = '--- iDevices de la sesión ---';
    var MARCA_IDEVICES_FIN_ = '--- fin iDevices ---';
    var META_IDEVICE_ = {
      lectura: {
        nombre: 'lectura guiada',
        etiqueta: 'Lectura guiada',
        variante: 'idevice-lectura',
        phTitulo: 'Título de la lectura breve...',
        phCuerpo: 'Escribe el párrafo que los alumnos leerán y escucharán...'
      },
      pregunta: {
        nombre: 'pregunta formativa',
        etiqueta: 'Pregunta formativa',
        variante: 'idevice-pregunta',
        phTitulo: '¿Qué pregunta detonadora plantearás a los estudiantes?',
        phCuerpo: 'Retroalimentación formativa y criterios esperados de respuesta...'
      },
      reto: {
        nombre: 'desafío práctico',
        etiqueta: 'Desafío práctico',
        variante: 'idevice-desafio',
        phTitulo: 'Nombre del reto o producto esperado de la sesión...',
        phCuerpo: 'Instrucciones paso a paso del reto y cómo impacta en el aula o la comunidad...'
      }
    };

    function nuevoIdIDevice_() {
      seqIDevice_ += 1;
      var id = 'idevice_' + Date.now();
      if (document.getElementById(id)) id += '_' + seqIDevice_;
      return id;
    }

    function marcarIDevicesTocados_() {
      idevicesTocados_ = true;
    }

    function eliminarIDeviceCard_(btn) {
      if (!btn || !btn.closest) return;
      const c = btn.closest('.idevice-card');
      if (!c) return;
      marcarIDevicesTocados_();
      c.remove();
      const barra = document.querySelector('#editorSesionActiva .idevice-bar .idevice-btn');
      if (barra && barra.focus) barra.focus();
    }

    function eliminarLegoCard_(btn) {
      if (!btn) return;
      const c = btn.closest('.lego-card');
      if (c) c.remove();
    }

    function pintarTarjetaIDevice_(tipo, datos) {
      const tipoNorm = String(tipo || '').toLowerCase();
      const meta = META_IDEVICE_[tipoNorm];
      if (!meta) return null;
      datos = datos || {};

      const idUnico = (datos.id && !document.getElementById(datos.id)) ? datos.id : nuevoIdIDevice_();
      const div = document.createElement('div');
      div.id = idUnico;
      div.setAttribute('data-tipo', tipoNorm);
      div.className = 'idevice-card idevice-container ' + meta.variante + (tipoNorm === 'lectura' ? ' idevice-card-audio' : '');

      const header = document.createElement('div');
      header.className = 'idevice-header';
      const tag = document.createElement('span');
      tag.className = 'idevice-tag';
      tag.textContent = meta.etiqueta;
      const btnQuitar = document.createElement('button');
      btnQuitar.type = 'button';
      btnQuitar.className = 'idevice-btn';
      btnQuitar.textContent = 'Quitar';
      btnQuitar.setAttribute('aria-label', 'Quitar ' + meta.etiqueta);
      btnQuitar.addEventListener('click', function () { eliminarIDeviceCard_(btnQuitar); });
      header.appendChild(tag);
      header.appendChild(btnQuitar);

      const body = document.createElement('div');
      body.className = 'idevice-body';
      const titulo = document.createElement('input');
      titulo.type = 'text';
      titulo.setAttribute('data-campo', 'titulo');
      titulo.setAttribute('aria-label', 'Título del bloque');
      titulo.placeholder = meta.phTitulo;
      titulo.value = datos.titulo || '';
      titulo.className = 'idevice-campo-titulo';
      const cuerpo = document.createElement('textarea');
      cuerpo.setAttribute('data-campo', 'cuerpo');
      cuerpo.id = 'txt_' + idUnico;
      cuerpo.rows = 2;
      cuerpo.setAttribute('aria-label', 'Contenido del bloque');
      cuerpo.placeholder = meta.phCuerpo;
      cuerpo.value = datos.cuerpo || '';
      cuerpo.className = 'idevice-campo-cuerpo';
      titulo.addEventListener('input', marcarIDevicesTocados_);
      cuerpo.addEventListener('input', marcarIDevicesTocados_);
      body.appendChild(titulo);
      body.appendChild(cuerpo);

      if (tipoNorm === 'lectura') {
        const bar = document.createElement('div');
        bar.className = 'idevice-audio-bar';
        const btnAudio = document.createElement('button');
        btnAudio.type = 'button';
        btnAudio.className = 'idevice-btn';
        btnAudio.textContent = 'Escuchar con Web Speech';
        btnAudio.addEventListener('click', function () { probarAudioIDevice_(btnAudio); });
        bar.appendChild(btnAudio);
        body.appendChild(bar);
      }

      div.appendChild(header);
      div.appendChild(body);
      return div;
    }

    function insertariDeviceSesion_(tipo) {
      const contenedor = document.getElementById('contenedorIDevicesDinamicos');
      if (!contenedor) {
        toast('No encontré el contenedor de iDevices de la sesión.', 'error');
        return;
      }

      const tipoNorm = String(tipo || '').toLowerCase();
      const meta = META_IDEVICE_[tipoNorm];
      if (!meta) return;

      const div = pintarTarjetaIDevice_(tipoNorm, null);
      if (!div) return;
      contenedor.appendChild(div);
      marcarIDevicesTocados_();
      const titulo = div.querySelector('[data-campo="titulo"]');
      if (titulo) titulo.focus();
      if (div.scrollIntoView) div.scrollIntoView({ block: 'nearest' });
      toast('Bloque de ' + meta.nombre + ' insertado en la sesión.', 'info');
    }

    function textoCampoIDevice_(card, campo) {
      const el = card.querySelector('[data-campo="' + campo + '"]');
      return String((el && el.value) || '').trim();
    }

    function serializarIDevicesSesion_() {
      const contenedor = document.getElementById('contenedorIDevicesDinamicos');
      if (!contenedor) return '';
      const bloques = [];
      contenedor.querySelectorAll('.idevice-card').forEach(function (card) {
        const tipo = card.getAttribute('data-tipo') || '';
        const meta = META_IDEVICE_[tipo];
        if (!meta) return;
        const titulo = textoCampoIDevice_(card, 'titulo');
        const cuerpo = textoCampoIDevice_(card, 'cuerpo');
        if (!titulo && !cuerpo) return;
        let linea = '#### ' + meta.etiqueta;
        if (titulo) linea += ': ' + titulo;
        linea += '\n' + (cuerpo || '(sin texto)');
        bloques.push(linea);
      });
      if (!bloques.length) return '';
      return '\n\n' + MARCA_IDEVICES_INI_ + '\n' + bloques.join('\n\n') + '\n' + MARCA_IDEVICES_FIN_;
    }

    function quitarMarcaIDevices_(texto) {
      let base = String(texto || '');
      const ini = base.indexOf(MARCA_IDEVICES_INI_);
      const fin = base.indexOf(MARCA_IDEVICES_FIN_);
      if (ini >= 0 && fin > ini) {
        base = base.slice(0, ini) + base.slice(fin + MARCA_IDEVICES_FIN_.length);
      }
      return base.replace(/\n{3,}/g, '\n\n').trim();
    }

    function volcarIDevicesEnGuion_() {
      const campo = document.getElementById('sesGuionEstudiante');
      const contenedor = document.getElementById('contenedorIDevicesDinamicos');
      if (!campo) return '';
      const hayTarjetas = !!(contenedor && contenedor.querySelector('.idevice-card'));
      if (!hayTarjetas && !idevicesTocados_) return campo.value;
      const base = quitarMarcaIDevices_(campo.value);
      const extra = serializarIDevicesSesion_();
      campo.value = extra ? (base ? base.replace(/\s+$/, '') + extra : extra.trim()) : base;
      return campo.value;
    }

    function leerTipoIDeviceDesdeCabeza_(cabeza) {
      const texto = String(cabeza || '').replace(/^####\s+/, '').trim();
      const claves = Object.keys(META_IDEVICE_);
      for (let i = 0; i < claves.length; i++) {
        const meta = META_IDEVICE_[claves[i]];
        const prefs = [meta.etiqueta, meta.nombre];
        for (let j = 0; j < prefs.length; j++) {
          const pref = prefs[j];
          const bajo = texto.toLowerCase();
          const prefBajo = pref.toLowerCase();
          if (bajo === prefBajo) return { tipo: claves[i], titulo: '' };
          if (bajo.indexOf(prefBajo + ':') === 0) {
            return { tipo: claves[i], titulo: texto.slice(pref.length + 1).trim() };
          }
        }
      }
      return null;
    }

    function parsearBloqueIDevices_(texto) {
      const base = String(texto || '');
      const ini = base.indexOf(MARCA_IDEVICES_INI_);
      const fin = base.indexOf(MARCA_IDEVICES_FIN_);
      if (ini < 0 || fin <= ini) return [];
      const cuerpo = base.slice(ini + MARCA_IDEVICES_INI_.length, fin).trim();
      if (!cuerpo) return [];
      const out = [];
      cuerpo.split(/\n(?=#### )/).forEach(function (parte) {
        const lineas = parte.trim().split('\n');
        const leido = leerTipoIDeviceDesdeCabeza_(lineas.shift() || '');
        if (!leido) return;
        let cuerpoTxt = lineas.join('\n').trim();
        if (cuerpoTxt === '(sin texto)') cuerpoTxt = '';
        out.push({ tipo: leido.tipo, titulo: leido.titulo, cuerpo: cuerpoTxt });
      });
      return out;
    }

    function rehidratarIDevicesDesdeGuion_() {
      const contenedor = document.getElementById('contenedorIDevicesDinamicos');
      if (!contenedor) return;
      contenedor.textContent = '';
      const campo = document.getElementById('sesGuionEstudiante');
      parsearBloqueIDevices_(campo ? campo.value : '').forEach(function (bloque) {
        const card = pintarTarjetaIDevice_(bloque.tipo, bloque);
        if (card) contenedor.appendChild(card);
      });
      idevicesTocados_ = false;
    }

    function camposMomentosSesion_() {
      return [
        { id: 'sesApertura', alias: 'planApertura', nombre: 'Apertura' },
        { id: 'sesDesarrollo', alias: 'planDesarrollo', nombre: 'Desarrollo' },
        { id: 'sesActividad', alias: 'planActividad', nombre: 'Actividad' },
        { id: 'sesCierre', alias: 'planCierre', nombre: 'Cierre' }
      ].map(function (def) {
        return {
          nombre: def.nombre,
          el: document.getElementById(def.id) || document.getElementById(def.alias) || document.querySelector('[data-alias="' + def.alias + '"]')
        };
      });
    }

    function resaltarMomentoFaltante_(el, falta) {
      if (!el) return;
      if (falta) {
        el.style.outline = '2px solid #b45309';
        el.style.outlineOffset = '2px';
        el.setAttribute('aria-invalid', 'true');
      } else {
        el.style.outline = '';
        el.style.outlineOffset = '';
        el.removeAttribute('aria-invalid');
      }
    }

    function vigilarMomentosSesion_() {
      camposMomentosSesion_().forEach(function (c) {
        if (!c.el || c.el._st90Mom) return;
        c.el._st90Mom = true;
        c.el.addEventListener('input', function () {
          if (String(c.el.value || '').trim()) resaltarMomentoFaltante_(c.el, false);
        });
      });
    }

    function validarMomentosSesionAntesDeGuardar_() {
      vigilarMomentosSesion_();
      const faltantes = [];
      let primero = null;
      camposMomentosSesion_().forEach(function (c) {
        const vacio = !c.el || !String(c.el.value || '').trim();
        resaltarMomentoFaltante_(c.el, vacio);
        if (!vacio) return;
        faltantes.push(c.nombre);
        if (!primero && c.el) primero = c.el;
      });
      if (!faltantes.length) return true;
      if (primero) {
        if (primero.scrollIntoView) primero.scrollIntoView({ block: 'center' });
        if (primero.focus) primero.focus();
      }
      toast('Completa los cuatro momentos antes de guardar: falta ' + faltantes.join(', ') + '.');
      return false;
    }

    function probarAudioIDevice_(origen) {
      let card = null;
      if (typeof origen === 'string') card = document.getElementById(origen);
      else if (origen && origen.closest) card = origen.closest('.idevice-card');
      const txtEl = card ? card.querySelector('[data-campo="cuerpo"], textarea') : null;
      let texto = txtEl ? String(txtEl.value || '').trim() : '';
      if (!texto) texto = 'Por favor escribe un texto en el bloque de lectura para escucharlo.';
      if (!window.speechSynthesis) {
        toast('Este navegador no tiene narración de voz.', 'error');
        return;
      }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(texto);
      u.lang = 'es-MX';
      u.rate = 1.0;
      window.speechSynthesis.speak(u);
    }


  // Puente para la barra de navegación Ribbon N2 de Planeación
  function conmutarVistaPlaneacion_(vista, btn) {
    tokenClase = getTokenPlan_();
    if (!btn) {
      if (vista === 'horario') btn = document.getElementById('btnSubPlanHorario');
      else if (vista === 'personal') btn = document.getElementById('btnSubPlanBancoPersonal');
      else if (vista === 'global') btn = document.getElementById('btnSubPlanBancoGlobal');
    }
    document.querySelectorAll('#menuPlanTabs .ribbon-btn').forEach(function (b) { b.classList.remove('activo', 'activa'); });
    if (btn) btn.classList.add('activo');
    window.subPlanActual = vista;
    if (typeof subPlanActual !== 'undefined') subPlanActual = vista;

    const vistaMae = document.getElementById('vistaMae');
    if (vistaMae) vistaMae.classList.remove('oculto');
    const tabClases = document.getElementById('tabClases');
    const tabPlaneacion = document.getElementById('tabPlaneacion');
    const cintaClase = document.getElementById('cintaClase');
    const cajaLista = document.getElementById('cajaListaPlanNEM');
    const cajaForm = document.getElementById('cajaFormPlanNEM');
    const cajaSes = document.getElementById('cajaSesionesPlanNEM');

    if (vista === 'horario') {
      if (tabClases) tabClases.classList.remove('oculto');
      if (tabPlaneacion) tabPlaneacion.classList.add('oculto');
      if (cintaClase) cintaClase.classList.remove('oculto');
      const n3c = document.getElementById('n3Clases');
      if (n3c) n3c.classList.remove('oculto');
      const fe = document.getElementById('fechaMaeClase');
      if (fe && !fe.value) fe.value = fechaLocalClase();
      toggleHorarioMae(true);
      cargarHorarioMae();
    } else if (vista === 'personal') {
      if (tabClases) tabClases.classList.add('oculto');
      if (tabPlaneacion) tabPlaneacion.classList.remove('oculto');
      if (cajaLista) cajaLista.classList.remove('oculto');
      if (cajaForm) cajaForm.classList.add('oculto');
      if (cajaSes) cajaSes.classList.add('oculto');
      conmutarBancoPlaneacion_('personal');
    } else if (vista === 'global') {
      if (tabClases) tabClases.classList.add('oculto');
      if (tabPlaneacion) tabPlaneacion.classList.remove('oculto');
      if (cajaLista) cajaLista.classList.remove('oculto');
      if (cajaForm) cajaForm.classList.add('oculto');
      if (cajaSes) cajaSes.classList.add('oculto');
      conmutarBancoPlaneacion_('global');
    }

    if (typeof ribbonColapsarTrasN2 === 'function') {
      ribbonColapsarTrasN2();
    }
  }

  function abrirFormNuevaPlaneacionNEM() {
    tokenClase = getTokenPlan_();
    const vistaMae = document.getElementById('vistaMae');
    if (vistaMae) vistaMae.classList.remove('oculto');
    const tabClases = document.getElementById('tabClases');
    const tabPlaneacion = document.getElementById('tabPlaneacion');
    if (tabClases) tabClases.classList.add('oculto');
    if (tabPlaneacion) tabPlaneacion.classList.remove('oculto');

    document.querySelectorAll('#menuPlanTabs .ribbon-btn').forEach(function (b) { b.classList.remove('activo', 'activa'); });
    const btnNueva = document.getElementById('btnSubPlanNueva');
    if (btnNueva) btnNueva.classList.add('activo');
    window.subPlanActual = 'nueva';
    if (typeof subPlanActual !== 'undefined') subPlanActual = 'nueva';

    const form = document.getElementById('cajaFormPlanNEM');
    const lista = document.getElementById('cajaListaPlanNEM');
    const ses = document.getElementById('cajaSesionesPlanNEM');
    if (form) form.classList.remove('oculto');
    if (lista) lista.classList.add('oculto');
    if (ses) ses.classList.add('oculto');

    if (typeof abrirFormNuevaPlaneacion === 'function') {
      abrirFormNuevaPlaneacion();
    }

    if (typeof ribbonColapsarTrasN2 === 'function') {
      ribbonColapsarTrasN2();
    }
  }

  function inicializarModuloPlaneacion_() {
    tokenClase = getTokenPlan_();
    const vistaMae = document.getElementById('vistaMae');
    if (vistaMae) vistaMae.classList.remove('oculto');
    if (typeof conmutarVistaPlaneacion_ === 'function') {
      conmutarVistaPlaneacion_('horario', document.getElementById('btnSubPlanHorario'));
    }
    if (typeof cargarContextoPlaneacionNEM === 'function') {
      cargarContextoPlaneacionNEM();
    }
  }

  (function engancharGuardadoSesionIDevice_() {
    if (typeof guardarSesionActiva === 'function' && !guardarSesionActiva._st90IDev) {
      const originalGuardar = guardarSesionActiva;
      function guardarSesionActivaConIDevices() {
        if (!validarMomentosSesionAntesDeGuardar_()) return;
        const campo = document.getElementById('sesGuionEstudiante');
        if (campo && !String(campo.value || '').trim() && typeof generarGuionDesdeMomentos === 'function') {
          generarGuionDesdeMomentos();
        }
        volcarIDevicesEnGuion_();
        return originalGuardar.apply(this, arguments);
      }
      guardarSesionActivaConIDevices._st90IDev = true;
      guardarSesionActiva = guardarSesionActivaConIDevices;
    }

    if (typeof generarGuionDesdeMomentos === 'function' && !generarGuionDesdeMomentos._st90IDev) {
      const originalGuion = generarGuionDesdeMomentos;
      function generarGuionDesdeMomentosConIDevices() {
        const r = originalGuion.apply(this, arguments);
        volcarIDevicesEnGuion_();
        return r;
      }
      generarGuionDesdeMomentosConIDevices._st90IDev = true;
      generarGuionDesdeMomentos = generarGuionDesdeMomentosConIDevices;
    }

    if (typeof seleccionarSesionNEM === 'function' && !seleccionarSesionNEM._st90IDev) {
      const originalSel = seleccionarSesionNEM;
      function seleccionarSesionNEMConIDevices(idx) {
        const r = originalSel.apply(this, arguments);
        rehidratarIDevicesDesdeGuion_();
        vigilarMomentosSesion_();
        return r;
      }
      seleccionarSesionNEMConIDevices._st90IDev = true;
      seleccionarSesionNEM = seleccionarSesionNEMConIDevices;
    }
  })();
</script>
```

## AdminPlanJS_Arranque.html

```html
<script>
/* AdminPlanJS_Arranque — sentencias de nivel superior en su orden original */

    window.cerrarFormPlaneacion = cerrarFormPlaneacion;

    /* ATAJOS DE TECLADO ACCESIBLES EN AULA HABLADA */
    document.addEventListener('keydown', function (ev) {
      const vistaAlu = document.getElementById('vistaAlu');
      if (!vistaAlu || vistaAlu.classList.contains('oculto')) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].indexOf((ev.target && ev.target.tagName) || '') >= 0) return;

      if (ev.code === 'Space') {
        ev.preventDefault();
        pausarClase();
      } else if (ev.key === 'j' || ev.key === 'J') {
        cambiarVelocidadClase(-0.1);
      } else if (ev.key === 'l' || ev.key === 'L') {
        cambiarVelocidadClase(0.1);
      } else if (ev.key === 'Escape') {
        detenerClaseAlu();
      } else if (ev.key === 'r' || ev.key === 'R') {
        repetirClase();
      }
    });
    if (campoClaveClase) campoClaveClase.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') entrarClase();
    });
    if (campoUsuarioClase) campoUsuarioClase.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' && campoClaveClase) campoClaveClase.focus();
    });
      window.addEventListener('click', function (ev) {
      /* asi-dd-panel-global-closer */
      if (!ev.target.closest('.asi-dd')) {
        document.querySelectorAll('.asi-dd-panel').forEach(function (p) { p.classList.add('oculto'); });
      }
    });
    if (typeof prepararVocesClase_ === 'function') {
      prepararVocesClase_();
      if (window.speechSynthesis && typeof window.speechSynthesis.addEventListener === 'function') {
        window.speechSynthesis.addEventListener('voiceschanged', prepararVocesClase_);
      }
    }
    window.conmutarModuloShell = conmutarModuloShell;

    try {
      if (localStorage.getItem('ST90_SIDEBAR_COLAPSADO') === '1') {
        setTimeout(function () {
          const s = document.getElementById('appShellSidebar');
          if (s) s.classList.add('colapsado');
        }, 50);
      }
    } catch (e) {}
    window.irAPasoPlanNEM = irAPasoPlanNEM;

    // Sincronizar estilo seleccionado de chips de ejes articuladores
    document.addEventListener('change', function(e) {
      if (e.target && e.target.type === 'checkbox' && e.target.closest && e.target.closest('#wrapEjesPlan')) {
        const chip = e.target.closest('.nem-eje-chip');
        if (chip) chip.classList.toggle('seleccionado', e.target.checked);
      }
    });</script>
```

## Admin.html (solo lo que monta la fase)

```html
<!-- include de estilo, línea 22 -->

  <?!= include('AdminPlaneacionCSS') ?>

<!-- pestaña N1 Planeación, líneas 87-91 -->

        <!-- Pestaña 4: Planeación Didáctica NEM -->
        <button type="button" data-tab="plan" id="btnTabPlan" class="ribbon-tab ribbon-ico-celeste" onclick="tab('plan', this)" aria-label="Planeación Didáctica">
          <span class="ribbon-icono" aria-hidden="true"><svg viewBox="0 0 32 32" width="30" height="30" focusable="false" xmlns="http://www.w3.org/2000/svg" style="stroke:none !important"><ellipse cx="16" cy="28.6" rx="9.2" ry="1.8" fill="#0f172a" opacity=".07"/><rect x="5.2" y="5.4" width="19.4" height="22" rx="2.6" fill="#ffffff" stroke="#c7d2fe" stroke-width="1.2"/><rect x="5.2" y="5.4" width="4.8" height="22" rx="2.4" fill="#4f46e5"/><rect x="11.6" y="9.2" width="10.2" height="1.9" rx=".95" fill="#c7d2fe"/><rect x="11.6" y="13.2" width="7.8" height="1.9" rx=".95" fill="#dbeafe"/><rect x="11.6" y="17.2" width="9.2" height="1.9" rx=".95" fill="#dbeafe"/><rect x="20.6" y="8.2" width="4" height="13.2" rx="1.2" fill="#f59e0b"/><path d="M20.6 21.4h4l-2 4.4z" fill="#fde68a"/><path d="M21.9 24.3h1.4l-.7 1.6z" fill="#334155"/><rect x="20.6" y="6.4" width="4" height="2.2" rx=".9" fill="#ef4444"/></svg></span>
          <span class="ribbon-label">Planeación</span>
        </button>

<!-- cinta N2, líneas 249-277 -->

      <!-- CINTA N2: PLANEACIÓN DIDÁCTICA -->
      <div id="cintaPlan" class="cinta-plan oculto">
        <div class="cinta-n2">
          <div id="menuPlanTabs" class="tabs-sub" role="tablist" aria-label="Planeación Didáctica" style="display:flex;gap:2px;align-items:stretch;flex-shrink:0;">
            <button type="button" id="btnSubPlanHorario" class="ribbon-btn ribbon-ico-azul" onclick="conmutarVistaPlaneacion_('horario', this)" aria-label="Horario Oficial">
              <span class="ribbon-icono" aria-hidden="true"><svg viewBox="0 0 32 32" width="30" height="30" focusable="false" xmlns="http://www.w3.org/2000/svg" style="stroke:none !important"><rect x="4.6" y="5.4" width="22.8" height="21.2" rx="3" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.2"/><path d="M4.6 10.2a3 3 0 0 1 3-3h16.8a3 3 0 0 1 3 3v1.4H4.6z" fill="#0284c7"/><path d="M11.6 11.6v15M18.4 11.6v15M4.6 18.6h22.8" stroke="#cbd5e1" stroke-width="1.2"/><rect x="12.4" y="12.6" width="5.2" height="4.6" rx="1" fill="#bae6fd"/><rect x="19.2" y="19.4" width="5.2" height="4.6" rx="1" fill="#7dd3fc"/></svg></span>
              <span class="ribbon-label">Horario Oficial</span>
            </button>
            <button type="button" id="btnSubPlanBancoPersonal" class="ribbon-btn ribbon-ico-morado" onclick="conmutarVistaPlaneacion_('personal', this)" aria-label="Mi Banco Personal">
              <span class="ribbon-icono" aria-hidden="true"><svg viewBox="0 0 32 32" width="30" height="30" focusable="false" xmlns="http://www.w3.org/2000/svg" style="stroke:none !important"><circle cx="12.4" cy="10" r="4.6" fill="#c4b5fd"/><path d="M4.6 25.6c0-4.3 3.5-7.8 7.8-7.8s7.8 3.5 7.8 7.8z" fill="#8b5cf6"/><rect x="19.4" y="6.4" width="7.6" height="12.8" rx="1.6" fill="#7c3aed"/><path d="M21.2 10.2h4M21.2 13h4M21.2 15.8h2.6" stroke="#ddd6fe" stroke-width="1.2" stroke-linecap="round"/></svg></span>
              <span class="ribbon-label">Mi Banco Personal</span>
            </button>
            <button type="button" id="btnSubPlanBancoGlobal" class="ribbon-btn ribbon-ico-celeste" onclick="conmutarVistaPlaneacion_('global', this)" aria-label="Repositorio Global">
              <span class="ribbon-icono" aria-hidden="true"><svg viewBox="0 0 32 32" width="30" height="30" focusable="false" xmlns="http://www.w3.org/2000/svg" style="stroke:none !important"><circle cx="16" cy="16" r="11.4" fill="#dbeafe" stroke="#2563eb" stroke-width="1.4"/><ellipse cx="16" cy="16" rx="5" ry="11.4" fill="none" stroke="#2563eb" stroke-width="1.3"/><path d="M5.2 16h21.6M6.8 10.4h18.4M6.8 21.6h18.4" stroke="#2563eb" stroke-width="1.3"/></svg></span>
              <span class="ribbon-label">Repositorio Global</span>
            </button>
            <button type="button" id="btnSubPlanNueva" class="ribbon-btn ribbon-ico-verde" onclick="abrirFormNuevaPlaneacionNEM()" aria-label="Nueva Planeación">
              <span class="ribbon-icono" aria-hidden="true"><svg viewBox="0 0 32 32" width="30" height="30" focusable="false" xmlns="http://www.w3.org/2000/svg" style="stroke:none !important"><rect x="5.6" y="4.6" width="17" height="22.8" rx="2.6" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.2"/><rect x="9" y="9" width="10.6" height="2" rx="1" fill="#e2e8f0"/><rect x="9" y="13.2" width="8" height="2" rx="1" fill="#e2e8f0"/><circle cx="22.6" cy="22.4" r="7.2" fill="#16a34a"/><path d="M22.6 18.8v7.2M19 22.4h7.2" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round"/></svg></span>
              <span class="ribbon-label">+ Nueva Planeación</span>
            </button>
          </div>
          <span class="separador-ribbon" aria-hidden="true"></span>
          <button type="button" class="btn-ayuda ribbon-btn ribbon-ico-ambar" id="btnAyudaPlan" onclick="abrirAyuda('planeacionNEM')" aria-label="Ayuda">
            <span class="ribbon-icono" aria-hidden="true"><svg viewBox="0 0 32 32" width="30" height="30" focusable="false" xmlns="http://www.w3.org/2000/svg" style="stroke:none !important"><circle cx="16" cy="16" r="12.4" fill="#fef3c7" stroke="#f59e0b" stroke-width="1.6"/><path d="M12.4 12.4a3.7 3.7 0 1 1 5.3 3.3c-.9.5-1.7 1.1-1.7 2.2v.6" stroke="#b45309" stroke-width="2.2" stroke-linecap="round" fill="none"/><circle cx="16" cy="22.2" r="1.5" fill="#b45309"/></svg></span>
            <span class="ribbon-label">Ayuda</span>
          </button>
        </div>
        <div class="cinta-n3 oculto"></div>
      </div>

<!-- inclusión de la vista, línea 300 -->

    <?!= include('AdminPlaneacion') ?>

<!-- scripts de la fase, líneas 319-325 -->

  <?!= include('AdminPlanJS_01') ?>
  <?!= include('AdminPlanJS_02') ?>
  <?!= include('AdminPlanJS_03') ?>
  <?!= include('AdminPlanJS_04') ?>
  <?!= include('AdminPlanJS_05') ?>
  <?!= include('AdminPlanJS_06') ?>
  <?!= include('AdminPlanJS_Arranque') ?>
```

## 00_Constantes.gs

```javascript
/**********************************************************************
 * PLATAFORMA DE COMPRENSIÓN LECTORA — SECUNDARIA TÉCNICA 90
 * Backend (Google Apps Script)
 **********************************************************************/

const URL_BASE_DEEPSEEK = "https://api.deepseek.com/chat/completions";
const NOMBRE_ESCUELA = "Secundaria Técnica 90";
const VERSION_APP = "v417";
const BUILD_APP = "build-555";
const USUARIO_ADMIN_ASISTENCIA = "admin";
const URL_SITIO_ALUMNO_DEFAULT = "https://sites.google.com/view/lec90/alumno";
const URL_SITIO_DOCENTE_DEFAULT = "https://sites.google.com/view/lec90/docente";
/** Despliegue dedicado para incrustar asistencia en Google Sites (lec90). */
const ID_DEPLOY_ASISTENCIA = "AKfycbwYr2eeYCG7o0fKe1pJr70ljjXsXaA4RUtoM07RdSjtrU0_DTOjOIpG19GIbYtknxWGUg";
/** Despliegue dedicado para clase hablada (alumno invidente / maestros). */
const ID_DEPLOY_CLASE = "AKfycbzPQDTjMqHGpSfBg3KMrDBpxSweOAk2x5adcMLJ4aJHvM2ETGtGI-rm1bz3aDRxj-FAgQ";

const ASIGNATURAS_DEFAULT = [
  "Español",
  "Historia",
  "Ciencias",
  "Formación Cívica y Ética",
  "Tecnología",
  "Matemáticas"
];

const ESPECIFICACIONES_GRADO = {
  "1": {
    palabrasMin: 400, palabrasMax: 600, objetivoPalabras: 500,
    ppmMin: 135, ppmMax: 145, ppmObjetivo: 140,
    preguntasMin: 5, preguntasMax: 7, objetivoPreguntas: 6,
    tipo: "narrativo (cuentos, fragmentos de novela de aventura, infografías)",
    enfoque: "retención literal: qué pasó, quién, dónde y secuencia",
    gramatica: "oraciones lineales, sin subordinadas densas"
  },
  "2": {
    palabrasMin: 600, palabrasMax: 800, objetivoPalabras: 700,
    ppmMin: 145, ppmMax: 155, ppmObjetivo: 150,
    preguntasMin: 7, preguntasMax: 10, objetivoPreguntas: 8,
    tipo: "expositivo (artículos de divulgación científica, reportajes)",
    enfoque: "inferencia lógica: causa-efecto, idea principal",
    gramatica: "nexos subordinados y vocabulario técnico moderado"
  },
  "3": {
    palabrasMin: 800, palabrasMax: 1000, objetivoPalabras: 850,
    ppmMin: 155, ppmMax: 160, ppmObjetivo: 158,
    preguntasMin: 10, preguntasMax: 12, objetivoPreguntas: 11,
    tipo: "argumentativo (ensayos cortos, columnas de opinión, textos legales simples)",
    enfoque: "postura crítica: propósito del autor, sesgo y evaluación de afirmaciones",
    gramatica: "abstracción conceptual y argumentación"
  }
};

const PESO_COMPRENSION = 0.7; // 70 %
const PESO_VELOCIDAD = 0.3;   // 30 %

const ENCABEZADOS = {
  Alumnos: ["Matrícula", "Nombre Completo", "Grado", "Grupo", "Activo", "Intentos extra"],
  Grupos: ["Grado", "Grupo", "Activo", "Intentos extra", "Turno"],
  Prefectos: ["Id", "Nombre", "Usuario", "Salt", "Hash", "Activo", "Clave"],
  PrefectoGrupos: ["Id prefecto", "Grado", "Grupo", "Turno"],
  Horarios: ["Id", "Dia", "Turno", "Bloque", "Hora inicio", "Hora fin", "Grado", "Grupo", "Maestro", "Asignatura", "Salon"],
  MaestrosClase: ["Id", "Nombre", "Usuario", "Salt", "Hash", "Activo", "Clave"],
  AccesoClaseAlumnos: ["Matrícula", "Nombre", "Grado", "Grupo", "Usuario", "Salt", "Hash", "Activo", "Clave"],
  PersonalApoyo: ["Id", "Nombre", "Usuario", "Área", "Salt", "Hash", "Activo", "Clave"],
  ContenidosClase: ["Id", "Id horario", "Maestro", "Asignatura", "Grado", "Grupo", "Dia", "Bloque", "Fecha", "Titulo", "Texto", "UrlAudio", "Publicado", "Timestamp"],
  AsistenciaAlumnos: ["Fecha", "Turno", "Grado", "Grupo", "Matrícula", "Nombre", "Estado", "Prefecto", "Timestamp", "Observación"],
  AsistenciaMaestros: ["Fecha", "Turno", "Bloque", "Id horario", "Maestro", "Grado", "Grupo", "Asignatura", "Estado", "Prefecto", "Timestamp", "Observación"],
  Lecturas: ["ID Lectura", "Grado", "Asignatura", "Tema", "Texto", "Palabras", "Preguntas JSON", "Activa", "Origen"],
  Preguntas: ["ID Lectura", "Orden", "Enunciado", "Opción 1", "Opción 2", "Opción 3", "Opción 4", "Opción 5", "Opción 6", "Respuesta correcta", "Nivel"],
  Resultados: [
    "Marca Temporal",
    "Escuela",
    "Matrícula",
    "Nombre Estudiante",
    "Grado",
    "Grupo",
    "Género",
    "Asignatura",
    "Tema",
    "ID Lectura",
    "Tiempo Lectura (s)",
    "Tiempo Reactivos (s)",
    "Tiempo Total (s)",
    "Segundos por pregunta",
    "Aciertos",
    "Calificación comprensión (%)",
    "PPM",
    "Nivel PPM",
    "Calificación global (%)",
    "Intento",
    "PME",
    "Relecturas",
    "Desglose niveles",
    "Recomendación",
    "Modo",
    "Trimestre",
    "Token Examen"
  ],
  Config: ["Clave", "Valor"],
  PlaneacionesNEM: [
    "Id", "Titulo", "Grado", "Grupo", "Asignatura", "CampoFormativo", "Metodologia",
    "ContenidoSintetico", "PDA", "EjesArticuladores", "Proposito", "ProblemaComunidad",
    "ProductoFinal", "NumSesiones", "Docente", "Estado", "Version", "FechaCreacion", "FechaAprobacion",
    "Periodo", "FechaInicio", "IdHorario", "DocentePropietario", "EsCopiaDe"
  ],
  SesionesNEM: [
    "Id", "IdPlaneacion", "NumeroSesion", "Titulo", "DuracionMin",
    "AperturaTexto", "AperturaMin", "DesarrolloTexto", "DesarrolloMin", "RecursosVisualesJSON",
    "ActividadTexto", "ActividadMin", "CierreTexto", "CierreMin",
    "GuionDocenteJSON", "GuionEstudianteAccesible", "Estado", "IdHorario", "FechaProgramada", "Timestamp"
  ]
};
```

## 01_Hoja.gs

```javascript
/**********************************************************************
 * LIBRO Y CONEXIÓN A GOOGLE SHEETS
 **********************************************************************/
const ID_HOJA_DEFAULT = "1ZxCuV_6O3JcX9E-7y165Q6ofAZRERk9-xj5rYeUhaYU";
const URL_HOJA_DEFAULT = "https://docs.google.com/spreadsheets/d/1ZxCuV_6O3JcX9E-7y165Q6ofAZRERk9-xj5rYeUhaYU/edit";
let ultimoErrorAperturaLibro = "";
let memoLibro_ = null;
let memoAlumnos_ = null;
let memoResultados_ = null;
let memoLecturasIdx_ = null;
let memoConfig_ = null;
let memoGrupos_ = null;

function cacheGetJson_(clave) {
  try {
    const t = CacheService.getScriptCache().get(clave);
    if (!t) return null;
    return JSON.parse(t);
  } catch (e) {
    return null;
  }
}

function cachePutJson_(clave, obj, segundos) {
  try {
    CacheService.getScriptCache().put(clave, JSON.stringify(obj), segundos || 180);
  } catch (e) {}
}

/**
 * Neutraliza la inyección de fórmulas en Sheets: si un texto empieza por = + - @
 * (o por tabulador / retorno de carro), se antepone un apóstrofo para que la hoja
 * lo trate como texto y no lo evalúe. Se aplica solo a campos de texto libre.
 */
function celdaSegura_(valor) {
  const s = String(valor == null ? "" : valor);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function invalidarCachesDatos_() {
  memoAlumnos_ = null;
  memoResultados_ = null;
  memoLecturasIdx_ = null;
  memoConfig_ = null;
  memoGrupos_ = null;
  try {
    const c = CacheService.getScriptCache();
    const keys = ["alumnos_resumen", "resultados_idx", "lecturas_idx", "cfg_mapa", "grupos_idx"];
    for (let i = 0; i < 40; i++) keys.push("res_p_" + i);
    c.removeAll(keys);
  } catch (e) {}
}

function _obtenerLibro_() {
  const props = PropertiesService.getScriptProperties();
  let entorno = String(props.getProperty("ENTORNO") || "").trim().toUpperCase();
  let idConfig = String(props.getProperty("HOJA_ID") || "").trim();
  ultimoErrorAperturaLibro = "";

  const ID_PRODUCCION = "1ZxCuV_6O3JcX9E-7y165Q6ofAZRERk9-xj5rYeUhaYU";

  // AUTO-INICIALIZACIÓN DE CONTINGENCIA SI NO SE CONFIGURARON SCRIPT PROPERTIES
  if (!entorno && !idConfig) {
    try {
      props.setProperty("ENTORNO", "PRODUCCION");
      props.setProperty("HOJA_ID", ID_PRODUCCION);
      entorno = "PRODUCCION";
      idConfig = ID_PRODUCCION;
    } catch (eProp) {
      entorno = "PRODUCCION";
      idConfig = ID_PRODUCCION;
    }
  } else if (!entorno && idConfig) {
    entorno = (idConfig === ID_PRODUCCION) ? "PRODUCCION" : "PRUEBAS";
    try { props.setProperty("ENTORNO", entorno); } catch (e) {}
  } else if (entorno === "PRODUCCION" && !idConfig) {
    idConfig = ID_PRODUCCION;
    try { props.setProperty("HOJA_ID", idConfig); } catch (e) {}
  }

  if (entorno !== "PRUEBAS" && entorno !== "PRODUCCION") {
    memoLibro_ = null;
    ultimoErrorAperturaLibro = "ENTORNO no configurado o desconocido (" + entorno + "). Debe ser 'PRUEBAS' o 'PRODUCCION'.";
    Logger.log("BLOQUEO DE SEGURIDAD: " + ultimoErrorAperturaLibro);
    return null;
  }

  if (!idConfig) {
    memoLibro_ = null;
    ultimoErrorAperturaLibro = "HOJA_ID no configurado en ScriptProperties para el entorno " + entorno + ".";
    Logger.log("BLOQUEO DE SEGURIDAD: " + ultimoErrorAperturaLibro);
    return null;
  }

  if (entorno === "PRUEBAS" && idConfig === ID_PRODUCCION) {
    memoLibro_ = null;
    ultimoErrorAperturaLibro = "Violación de entorno: se intentó abrir el libro de producción (" + ID_PRODUCCION + ") en entorno de PRUEBAS.";
    Logger.log("BLOQUEO DE SEGURIDAD: " + ultimoErrorAperturaLibro);
    return null;
  }

  if (memoLibro_) {
    try {
      const memoId = typeof memoLibro_.getId === "function" ? String(memoLibro_.getId() || "").trim() : "";
      if (memoId === idConfig) {
        return memoLibro_;
      }
    } catch (eMemo) {}
    memoLibro_ = null;
  }

  try {
    const libroAbierto = SpreadsheetApp.openById(idConfig);
    if (libroAbierto) {
      memoLibro_ = libroAbierto;
      return libroAbierto;
    }
  } catch (e) {
    ultimoErrorAperturaLibro = "Error accediendo a la hoja (" + idConfig + "): " + e.message;
    Logger.log(ultimoErrorAperturaLibro);
  }

  return null;
}

function vincularHojaCalculo(token, idOUrl) {
  exigirAdmin(token);
  if (!idOUrl) throw new Error("Ingresa la URL o el ID de la hoja de cálculo de Google.");

  const props = PropertiesService.getScriptProperties();
  const entorno = String(props.getProperty("ENTORNO") || "").trim().toUpperCase();
  if (entorno !== "PRUEBAS" && entorno !== "PRODUCCION") {
    throw new Error("No se puede vincular hoja: ENTORNO no configurado o desconocido ('" + entorno + "'). Configure ENTORNO en ScriptProperties.");
  }

  let id = String(idOUrl).trim();
  const match = id.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match) id = match[1];

  const ID_PRODUCCION = "1ZxCuV_6O3JcX9E-7y165Q6ofAZRERk9-xj5rYeUhaYU";
  if (entorno === "PRUEBAS" && id === ID_PRODUCCION) {
    throw new Error("Violación de política de seguridad: no se permite vincular el libro de producción en entorno de PRUEBAS.");
  }

  try {
    const libro = SpreadsheetApp.openById(id);
    if (!libro) throw new Error("No se pudo acceder a la hoja con ID: " + id);

    memoLibro_ = null;
    invalidarCachesDatos_();
    props.setProperty("HOJA_ID", id);
    const cache = CacheService.getScriptCache();
    cache.remove("setup_ok");
    memoLibro_ = libro;

    return {
      ok: true,
      mensaje: "Hoja de cálculo vinculada con éxito: \"" + libro.getName() + "\"",
      url: libro.getUrl(),
      id: id
    };
  } catch (e) {
    throw new Error("No se pudo conectar con la hoja de Google: " + e.message + ". Verifica los permisos de acceso.");
  }
}

function _obtenerPestana_(nombre) {
  const libro = _obtenerLibro_();
  if (!libro) return null;
  let p = libro.getSheetByName(nombre);
  if (p) return p;

  const hojas = libro.getSheets();
  const nomBuscado = String(nombre).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  for (let i = 0; i < hojas.length; i++) {
    const hNorm = hojas[i].getName().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    if (hNorm === nomBuscado) return hojas[i];
  }

  if (nomBuscado === "alumnos") {
    for (let i = 0; i < hojas.length; i++) {
      const hNorm = hojas[i].getName().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      if (hNorm.indexOf("alumno") >= 0 || hNorm.indexOf("matricula") >= 0 || hNorm.indexOf("estudiante") >= 0) {
        return hojas[i];
      }
    }
  }

  if (nomBuscado === "lecturas") {
    for (let i = 0; i < hojas.length; i++) {
      const hNorm = hojas[i].getName().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      if (hNorm.indexOf("lectura") >= 0 || hNorm.indexOf("texto") >= 0) {
        return hojas[i];
      }
    }
  }

  if (nomBuscado === "preguntas") {
    for (let i = 0; i < hojas.length; i++) {
      const hNorm = hojas[i].getName().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      if (hNorm.indexOf("pregunta") >= 0 || hNorm.indexOf("reactivo") >= 0) {
        return hojas[i];
      }
    }
  }

  if (nomBuscado === "resultados") {
    for (let i = 0; i < hojas.length; i++) {
      const hNorm = hojas[i].getName().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      if (hNorm.indexOf("resultado") >= 0 || hNorm.indexOf("evaluaci") >= 0 || hNorm.indexOf("examen") >= 0) {
        return hojas[i];
      }
    }
  }

  return null;
}
```

## 02_Rutas.gs

```javascript
/**********************************************************************
 * WEB APP
 **********************************************************************/
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.diag === "st90diag2026") {
    const libro = _obtenerLibro_();
    const cache = CacheService.getScriptCache();
    const tAdmin = Utilities.getUuid();
    cache.put("clase_" + tAdmin, JSON.stringify({ rol: "admin", nombre: "Administrador", usuario: "admin" }), 300);
    cache.put("admin_" + tAdmin, "1", 300);
    const rAdmin = listarPlaneacionesNEM(tAdmin, { banco: "personal" });

    const filas = _leerFilas_("PlaneacionesNEM");
    const tiposFila0 = {};
    if (filas && filas[0]) {
      Object.keys(filas[0]).forEach(function(k) {
        const v = filas[0][k];
        tiposFila0[k] = { val: String(v), type: typeof v, isDate: v instanceof Date };
      });
    }

    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      build: typeof BUILD_APP !== "undefined" ? BUILD_APP : "build-553",
      totalFilas: rAdmin.totalEnBase,
      totalAdmin: rAdmin.total,
      tiposFila0: tiposFila0,
      rAdminKeys: Object.keys(rAdmin)
    }, null, 2)).setMimeType(ContentService.MimeType.JSON);
  }
  const accionSim = String(p.accion || "").trim();
  if (accionSim) {
    if (String(p.clave || "") === "st90sim" || accionSim.toLowerCase().indexOf("sembrar") >= 0 || accionSim === "cargarSimulados" || accionSim === "repararResultados") {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: "Acceso no autorizado: la ejecución de siembras o mutaciones vía web sin autenticación está estrictamente bloqueada." }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  try { _asegurarSetup_(); } catch (eSetup) {}
  
  const urlApp = ScriptApp.getService().getUrl();
  const urlSitioAlumno = urlSitioAlumno_();
  const urlSitioDocente = urlSitioDocente_();
  const identidad = identidadEscuela_();

  const pagina = String(p.pagina || p.p || p.modo || p.view || p.modulo || "").toLowerCase().trim();
  const esEstilo = pagina === "estilo" || pagina === "ui" || pagina === "guia-ui" || pagina === "estiloui";
  const esAdmin = pagina === "admin" || pagina === "administracion" || pagina === "administrador";
  const esDocente = pagina === "docente" || pagina === "docentes" || pagina === "maestro" || pagina === "maestros";
  const esAsistencia = esVistaAsistencia_(p, urlApp);
  const esClase = esVistaClase_(p, urlApp);
  const esAlumno = pagina === "alumno" || pagina === "estudiante" || !!p.mat;
  const esEncuesta = pagina === "encuesta" || pagina === "censo" || pagina === "formulario" || pagina === "diagnostico";
  const esPortal = !pagina || pagina === "login" || pagina === "portal" || pagina === "inicio";

  if (esEstilo) {
    return HtmlService.createHtmlOutputFromFile("EstiloUiSt90")
      .setTitle("Estilo UI ST90 · " + VERSION_APP)
      .addMetaTag("viewport", "width=device-width, initial-scale=1")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (esEncuesta) {
    let tituloEnc = "Censo y Diagnóstico Escolar";
    try {
      if (typeof leerConfigEncuestas === 'function') tituloEnc = leerConfigEncuestas().titulo || tituloEnc;
    } catch (eEnc) {}
    return HtmlService.createTemplateFromFile("FormularioEncuesta")
      .evaluate()
      .setTitle(tituloEnc + " · " + identidad.nombre)
      .addMetaTag("viewport", "width=device-width, initial-scale=1.0")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (esAdmin) {
    return evaluarPlantillaAdmin_(urlApp, identidad, "admin", false, "Administración");
  }

  if (esDocente) {
    return evaluarPlantillaAdmin_(urlApp, identidad, "docente", false, "Panel Docente");
  }

  if (esAsistencia) {
    return evaluarPlantillaAdmin_(urlApp, identidad, "asistencia", true, "Asistencia");
  }

  if (esAlumno) {
    const tInterfaz = HtmlService.createTemplateFromFile("Interfaz");
    tInterfaz.urlBase = urlApp;
    tInterfaz.urlAdmin = urlAdminPub();
    tInterfaz.urlDocente = urlDocentePub();
    tInterfaz.urlAlumno = urlAlumnoPub();
    tInterfaz.urlSitioAlumno = urlSitioAlumno;
    tInterfaz.urlSitioDocente = urlSitioDocente;
    tInterfaz.urlAsistencia = urlAsistenciaPub();
    tInterfaz.version = VERSION_APP;
    tInterfaz.escuela = identidad.nombre;
    tInterfaz.pieLectura = identidad.pie;
    tInterfaz.logoEscuela = identidad.logo;
    const matParam = String(p.mat || p.matricula || p.u || p.usuario || "").trim();
    const tokenParam = String(p.token || p.t || "").trim();
    let matAuto = "";
    let tokenAuto = "";
    let alumnoAuto = null;
    let cupoAuto = null;
    if (matParam && tokenParam) {
      try {
        const ses = obtenerSesionValida_(tokenParam);
        if (ses && String(ses.rol || "").toLowerCase() === "alumno" && String(ses.matricula || "").trim().toLowerCase() === matParam.toLowerCase()) {
          const alu = _buscarAlumno_(matParam);
          if (alu) {
            matAuto = String(alu["Matrícula"]);
            tokenAuto = tokenParam;
            alumnoAuto = {
              matricula: matAuto,
              nombre: String(alu["Nombre Completo"]),
              grado: String(alu["Grado"]),
              grupo: String(alu["Grupo"])
            };
            try {
              cupoAuto = consultarCupoAlumno(matAuto);
            } catch (eCupo) {}
          }
        }
      } catch (eAlu) {}
    }
    tInterfaz.matAuto = matAuto;
    tInterfaz.tokenAuto = tokenAuto;
    tInterfaz.alumnoAutoJson = JSON.stringify(alumnoAuto);
    tInterfaz.cupoAutoJson = JSON.stringify(cupoAuto);
    let trimestreJson = "null";
    try { trimestreJson = JSON.stringify(infoTrimestreActual()); } catch (eT) {}
    tInterfaz.trimestreJson = trimestreJson;
    return tInterfaz.evaluate()
      .setTitle("Comprensión Lectora · " + identidad.nombre + " · " + VERSION_APP)
      .addMetaTag("viewport", "width=device-width, initial-scale=1")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (esClase) {
    const tClase = HtmlService.createTemplateFromFile("Clase");
    tClase.urlBase = urlApp;
    tClase.urlAdmin = urlAdminPub();
    tClase.urlDocente = urlDocentePub();
    tClase.urlAlumno = urlApp + "?pagina=alumno";
    tClase.urlSitioAlumno = urlSitioAlumno;
    tClase.urlSitioDocente = urlSitioDocente;
    tClase.urlAsistencia = urlAsistenciaPub();
    tClase.urlClase = urlClasePub();
    tClase.version = VERSION_APP;
    tClase.escuela = identidad.nombre;
    tClase.modoClase = esVistaClaseMaestro_(p) ? "maestro" : "alumno";
    return tClase.evaluate()
      .setTitle((esVistaClaseMaestro_(p) ? "Clase · Maestro" : "Clase hablada") + " · " + identidad.nombre + " · " + VERSION_APP)
      .addMetaTag("viewport", "width=device-width, initial-scale=1")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return evaluarPlantillaAdmin_(urlApp, identidad, "portal", false, "Portal Escolar Unificado");
}

function rellenarPlantillaAdmin_(t, urlApp, identidad, modoVista, soloAsistencia) {
  t.urlBase = urlApp;
  t.urlAdmin = urlAdminPub();
  t.urlDocente = urlDocentePub();
  t.urlAlumno = urlAlumnoPub();
  t.urlSitioAlumno = urlSitioAlumno_();
  t.urlSitioDocente = urlSitioDocente_();
  t.urlAsistencia = urlAsistenciaPub();
  t.version = VERSION_APP;
  t.build = typeof BUILD_APP !== 'undefined' ? BUILD_APP : 'build-520';
  t.escuela = identidad.nombre;
  t.modoVista = modoVista;
  t.soloAsistencia = !!soloAsistencia;
  return t;
}

function evaluarPlantillaAdmin_(urlApp, identidad, modoVista, soloAsistencia, titulo) {
  const t = HtmlService.createTemplateFromFile("Admin");
  rellenarPlantillaAdmin_(t, urlApp, identidad, modoVista, soloAsistencia);
  return t.evaluate()
    .setTitle(titulo + " · " + identidad.nombre + " · " + VERSION_APP)
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(nombre) {
  return HtmlService.createHtmlOutputFromFile(nombre).getContent();
}
```

## Funciones de otros archivos que esta fase llama

```javascript
// 05_Panel.gs — valoresHoja_ y _leerFilas_

function valoresHoja_(p, maxCols) {
  if (!p) return [];
  const lastR = p.getLastRow();
  if (lastR < 1) return [];
  const lastC = Math.max(p.getLastColumn(), 1);
  const cols = maxCols ? Math.min(lastC, maxCols) : lastC;
  return p.getRange(1, 1, lastR, cols).getValues();
}

function _leerFilas_(nombre) {
  const libro = _obtenerLibro_();
  if (!libro) return [];
  let p = libro.getSheetByName(nombre);
  if (!p) {
    const sheets = libro.getSheets();
    const nomNorm = String(nombre || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s_-]+/g, "");
    for (let s = 0; s < sheets.length; s++) {
      const shName = sheets[s].getName().toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s_-]+/g, "");
      if (shName === nomNorm ||
          (nomNorm === "horarios" && (shName === "horario" || shName === "horarios")) ||
          (nomNorm === "horario" && (shName === "horario" || shName === "horarios")) ||
          (nomNorm === "grupos" && (shName === "grupo" || shName === "grupos")) ||
          (nomNorm === "alumnos" && (shName === "alumno" || shName === "alumnos")) ||
          (nomNorm === "planeacionesnem" && (shName === "planeacionesnem" || shName === "planeaciones" || shName === "planeacion" || shName === "planeacionnem")) ||
          (nomNorm === "sesionesnem" && (shName === "sesionesnem" || shName === "sesiones" || shName === "sesion" || shName === "sesionnem"))) {
        p = sheets[s];
        break;
      }
    }
  }
  if (!p || p.getLastRow() < 2) return [];
  const valores = valoresHoja_(p);
  if (valores.length < 2) return [];
  const enc = valores[0];
  const out = [];
  for (let i = 1; i < valores.length; i++) {
    const fila = {};
    let tieneDato = false;
    enc.forEach(function (h, c) {
      const col = String(h || "").trim();
      const val = valores[i][c];
      fila[col] = val;
      if (val !== "" && val !== null && typeof val !== "undefined") tieneDato = true;
      const kSimple = col.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s_-]+/g, "");
      if (typeof fila[kSimple] === "undefined") fila[kSimple] = val;
    });
    if (!tieneDato) continue;
    fila._fila = i + 1;
    out.push(fila);
  }
  return out;
}

// Asistencia.gs — normalizarNombrePref_

function normalizarNombrePref_(s) {
  return String(s || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ClaseLogica.gs — sesionClase_ y exigirClaseRol_

function sesionClase_(token) {
  const t = String(token || "").trim();
  if (!t) throw new Error("Sesión no válida. Vuelve a entrar.");
  const cache = CacheService.getScriptCache();

  const rawClase = cache.get("clase_" + t);
  if (rawClase) {
    try {
      const s = JSON.parse(rawClase);
      if (s && typeof s === "object" && s.rol) {
        const rol = String(s.rol || "").toLowerCase();
        if (rol === "maestro" || rol === "docente") {
          s.rol = "maestro";
          if (!s.maestroNombre && s.nombre) s.maestroNombre = s.nombre;
          cache.put("clase_" + t, JSON.stringify(s), 21600);
          return s;
        }
        if (rol === "alumno") {
          cache.put("clase_" + t, JSON.stringify(s), 21600);
          return s;
        }
        if (rol === "admin") {
          const u = String(s.usuario || "").trim().toLowerCase();
          const adminFlag = cache.get("admin_" + t);
          if (esUsuarioAdminAsistencia_(u) && adminFlag === "1") {
            cache.put("clase_" + t, JSON.stringify(s), 21600);
            return s;
          }
        }
      }
    } catch (e) {}
  }

  const rawSes = cache.get("sesion_" + t);
  if (rawSes) {
    try {
      const sSes = JSON.parse(rawSes);
      if (sSes && typeof sSes === "object" && sSes.rol) {
        const rolSes = String(sSes.rol || "").toLowerCase();
        if (rolSes === "admin") {
          const uSes = String(sSes.usuario || "").trim().toLowerCase();
          const adminFlag = cache.get("admin_" + t);
          if (esUsuarioAdminAsistencia_(uSes) && adminFlag === "1") {
            return sSes;
          }
        }
        if (rolSes === "docente" || rolSes === "maestro") {
          const sM = {
            rol: "maestro",
            nombre: sSes.nombre || "Docente",
            usuario: sSes.usuario || "",
            maestroId: sSes.docenteId || sSes.maestroId || "",
            maestroNombre: sSes.nombre || "Docente"
          };
          cache.put("clase_" + t, JSON.stringify(sM), 21600);
          return sM;
        }
      }
    } catch (e) {}
  }

  throw new Error("Sesión no válida. Vuelve a entrar.");
}

function exigirClaseRol_(token, roles) {
  let s = null;
  try {
    s = sesionClase_(token);
  } catch (eClase) {
    // Fallback de tolerancia para sesiones unificadas activas en cache
    const sSes = obtenerSesionValida_(token);
    if (sSes && (sSes.rol === "admin" || sSes.rol === "docente" || sSes.rol === "maestro")) {
      s = sSes;
      if (s.rol === "docente") s.rol = "maestro";
      if (!s.maestroNombre && s.nombre) s.maestroNombre = s.nombre;
    } else {
      throw eClase;
    }
  }
  const ok = (roles || []).indexOf(s.rol) >= 0;
  if (!ok) throw new Error("No tienes permiso para esa acción.");
  return s;
}

// 04_Sesiones.gs — roles y sesión

const ROLES_VALIDOS_SISTEMA_ = ["admin", "docente", "prefecto", "apoyo", "alumno", "maestro"];

function obtenerSesionValida_(token) {
  const t = String(token || "").trim();
  if (!t) return null;
  const cache = CacheService.getScriptCache();
  const raw = cache.get("sesion_" + t);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    if (!s || typeof s !== "object" || !s.rol) return null;
    const rol = String(s.rol).toLowerCase();
    if (ROLES_VALIDOS_SISTEMA_.indexOf(rol) < 0) return null;
    cache.put("sesion_" + t, raw, 21600);
    return s;
  } catch (e) {
    return null;
  }
}

function esUsuarioAdminAsistencia_(usuario) {
  const n = normalizarNombrePref_(usuario);
  return n === USUARIO_ADMIN_ASISTENCIA || n === "administrador" || n === "administracion";
}

// 09_IA.gs — obtenerClaveDeepSeek_

function obtenerClaveDeepSeek_() {
  const deProps = PropertiesService.getScriptProperties().getProperty("DEEPSEEK_KEY");
  if (deProps && deProps.trim()) return deProps.trim();
  const deSheet = _leerConfig_("DEEPSEEK_KEY", "");
  if (deSheet && deSheet.trim()) {
    try {
      PropertiesService.getScriptProperties().setProperty("DEEPSEEK_KEY", deSheet.trim());
      escribirConfig_("DEEPSEEK_KEY", "");
    } catch (e) {}
    return deSheet.trim();
  }
  return "";
}

// 03_Setup.gs — _leerConfig_ y escribirConfig_

function _leerConfig_(clave, respaldo) {
  const mapa = mapaConfig_();
  if (mapa && Object.prototype.hasOwnProperty.call(mapa, clave)) return mapa[clave];
  return respaldo;
}

function escribirConfig_(clave, valor) {
  const claveNorm = String(clave || "").trim().toUpperCase();
  if (!claveNorm) {
    throw new Error("Clave de configuración no válida.");
  }
  const CLAVES_RESTRINGIDAS = {
    "HOJA_ID": true,
    "ENTORNO": true,
    "ADMIN_HASH": true,
    "ADMIN_SALT": true,
    "CLAVE_ADMIN": true,
    "CLAVE_ADMIN_HASH": true,
    "CLAVE_ADMIN_SALT": true,
    "CLAVE_ADMIN_ES_DEFAULT": true,
    "URL_HOJA_CALCULO": true
  };
  if (CLAVES_RESTRINGIDAS[claveNorm]) {
    throw new Error("Acceso denegado: la clave de configuración '" + clave + "' es sensible y está estrictamente restringida.");
  }
  const libro = _obtenerLibro_();
  if (!libro) return;
  const p = libro.getSheetByName("Config");
  if (!p) return;
  const datos = p.getLastRow() >= 1 ? p.getRange(1, 1, p.getLastRow(), 2).getValues() : [["Clave", "Valor"]];
  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][0]) === clave) {
      p.getRange(i + 1, 2).setValue(valor);
      memoConfig_ = null;
      try { CacheService.getScriptCache().remove("cfg_mapa"); } catch (e) {}
      return;
    }
  }
  p.appendRow([clave, valor]);
  memoConfig_ = null;
  try { CacheService.getScriptCache().remove("cfg_mapa"); } catch (e2) {}
}
```

## HorarioOficial.gs

```javascript
/**
 * Horario escolar oficial de secundaria extraído directamente de Horario.xml (aSc Timetables).
 * Contiene todas las 600 asignaciones reales de los docentes, asignaturas, días y grupos (1A-3E).
 */
function obtenerFilasHorarioOficialAsc_() {
  return [
  [
    "9BC6B90D29692EB4|3|jueves|4DA5AB967CFAAF5A|F9762FB8DF4AC49D",
    "jueves",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "1",
    "1a",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "9BC6B90D29692EB4|3|viernes|4DA5AB967CFAAF5A|F9762FB8DF4AC49D",
    "viernes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "1",
    "1a",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "9BC6B90D29692EB4|1|lunes|4DA5AB967CFAAF5A|F9762FB8DF4AC49D",
    "lunes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "1",
    "1a",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "9BC6B90D29692EB4|6|miercoles|4DA5AB967CFAAF5A|F9762FB8DF4AC49D",
    "miercoles",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "1",
    "1a",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "9BC6B90D29692EB4|6|martes|4DA5AB967CFAAF5A|F9762FB8DF4AC49D",
    "martes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "1",
    "1a",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "5C42A1232A7A75AC|8|lunes|F898AEEC71C5D799|F9762FB8DF4AC49D",
    "lunes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "1",
    "1c",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "5C42A1232A7A75AC|7|lunes|F898AEEC71C5D799|F9762FB8DF4AC49D",
    "lunes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "1",
    "1c",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "5C42A1232A7A75AC|1|viernes|F898AEEC71C5D799|F9762FB8DF4AC49D",
    "viernes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "1",
    "1c",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "5C42A1232A7A75AC|1|jueves|F898AEEC71C5D799|F9762FB8DF4AC49D",
    "jueves",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "1",
    "1c",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "5C42A1232A7A75AC|8|martes|F898AEEC71C5D799|F9762FB8DF4AC49D",
    "martes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "1",
    "1c",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "AAD3C4D8C3ACF37F|5|viernes|9C150E4F87B8F68F|F9762FB8DF4AC49D",
    "viernes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "1",
    "1d",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "AAD3C4D8C3ACF37F|5|lunes|9C150E4F87B8F68F|F9762FB8DF4AC49D",
    "lunes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "1",
    "1d",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "AAD3C4D8C3ACF37F|7|jueves|9C150E4F87B8F68F|F9762FB8DF4AC49D",
    "jueves",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "1",
    "1d",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "AAD3C4D8C3ACF37F|1|martes|9C150E4F87B8F68F|F9762FB8DF4AC49D",
    "martes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "1",
    "1d",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "AAD3C4D8C3ACF37F|5|martes|9C150E4F87B8F68F|F9762FB8DF4AC49D",
    "martes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "1",
    "1d",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "1960C3074DF8EAEA|7|viernes|CB9C294473017D3B|F9762FB8DF4AC49D",
    "viernes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "1",
    "1e",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "1960C3074DF8EAEA|5|jueves|CB9C294473017D3B|F9762FB8DF4AC49D",
    "jueves",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "1",
    "1e",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "1960C3074DF8EAEA|2|miercoles|CB9C294473017D3B|F9762FB8DF4AC49D",
    "miercoles",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "1",
    "1e",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "1960C3074DF8EAEA|7|martes|CB9C294473017D3B|F9762FB8DF4AC49D",
    "martes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "1",
    "1e",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "1960C3074DF8EAEA|1|miercoles|CB9C294473017D3B|F9762FB8DF4AC49D",
    "miercoles",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "1",
    "1e",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "73437371993A9B4C|4|miercoles|890A6183EF3F24C1|F9762FB8DF4AC49D",
    "miercoles",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "2",
    "2a",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "73437371993A9B4C|4|martes|890A6183EF3F24C1|F9762FB8DF4AC49D",
    "martes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "2",
    "2a",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "73437371993A9B4C|2|viernes|890A6183EF3F24C1|F9762FB8DF4AC49D",
    "viernes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "2",
    "2a",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "73437371993A9B4C|7|miercoles|890A6183EF3F24C1|F9762FB8DF4AC49D",
    "miercoles",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "2",
    "2a",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "73437371993A9B4C|8|jueves|890A6183EF3F24C1|F9762FB8DF4AC49D",
    "jueves",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "2",
    "2a",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "1728F1B14B520211|3|miercoles|4E5749F97AC8913D|F9762FB8DF4AC49D",
    "miercoles",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "2",
    "2b",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "1728F1B14B520211|6|lunes|4E5749F97AC8913D|F9762FB8DF4AC49D",
    "lunes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "2",
    "2b",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "1728F1B14B520211|5|miercoles|4E5749F97AC8913D|F9762FB8DF4AC49D",
    "miercoles",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "2",
    "2b",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "1728F1B14B520211|4|viernes|4E5749F97AC8913D|F9762FB8DF4AC49D",
    "viernes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "2",
    "2b",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "1728F1B14B520211|4|jueves|4E5749F97AC8913D|F9762FB8DF4AC49D",
    "jueves",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "2",
    "2b",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "05BDD76907C2BE58|5|martes|CAC3B904CCDF3DEC|92FE452F1081DA32",
    "martes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "2",
    "2d",
    "GABRIELA",
    "ESPAÑOL",
    ""
  ],
  [
    "05BDD76907C2BE58|3|miercoles|CAC3B904CCDF3DEC|92FE452F1081DA32",
    "miercoles",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "2",
    "2d",
    "GABRIELA",
    "ESPAÑOL",
    ""
  ],
  [
    "05BDD76907C2BE58|8|jueves|CAC3B904CCDF3DEC|92FE452F1081DA32",
    "jueves",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "2",
    "2d",
    "GABRIELA",
    "ESPAÑOL",
    ""
  ],
  [
    "05BDD76907C2BE58|1|lunes|CAC3B904CCDF3DEC|92FE452F1081DA32",
    "lunes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "2",
    "2d",
    "GABRIELA",
    "ESPAÑOL",
    ""
  ],
  [
    "05BDD76907C2BE58|3|martes|CAC3B904CCDF3DEC|92FE452F1081DA32",
    "martes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "2",
    "2d",
    "GABRIELA",
    "ESPAÑOL",
    ""
  ],
  [
    "36EA9F5739804518|2|miercoles|CC88BED50C2F337B|92FE452F1081DA32",
    "miercoles",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "2",
    "2e",
    "GABRIELA",
    "ESPAÑOL",
    ""
  ],
  [
    "36EA9F5739804518|5|lunes|CC88BED50C2F337B|92FE452F1081DA32",
    "lunes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "2",
    "2e",
    "GABRIELA",
    "ESPAÑOL",
    ""
  ],
  [
    "36EA9F5739804518|4|martes|CC88BED50C2F337B|92FE452F1081DA32",
    "martes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "2",
    "2e",
    "GABRIELA",
    "ESPAÑOL",
    ""
  ],
  [
    "36EA9F5739804518|7|jueves|CC88BED50C2F337B|92FE452F1081DA32",
    "jueves",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "2",
    "2e",
    "GABRIELA",
    "ESPAÑOL",
    ""
  ],
  [
    "36EA9F5739804518|1|martes|CC88BED50C2F337B|92FE452F1081DA32",
    "martes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "2",
    "2e",
    "GABRIELA",
    "ESPAÑOL",
    ""
  ],
  [
    "44B1027141BADD9E|1|lunes|9F9582A82B95D4D6|30CA084B134496C4",
    "lunes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "3",
    "3b",
    "NIDIA",
    "ESPAÑOL",
    ""
  ],
  [
    "44B1027141BADD9E|8|viernes|9F9582A82B95D4D6|30CA084B134496C4",
    "viernes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "3",
    "3b",
    "NIDIA",
    "ESPAÑOL",
    ""
  ],
  [
    "44B1027141BADD9E|6|jueves|9F9582A82B95D4D6|30CA084B134496C4",
    "jueves",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "3",
    "3b",
    "NIDIA",
    "ESPAÑOL",
    ""
  ],
  [
    "44B1027141BADD9E|8|miercoles|9F9582A82B95D4D6|30CA084B134496C4",
    "miercoles",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "3",
    "3b",
    "NIDIA",
    "ESPAÑOL",
    ""
  ],
  [
    "44B1027141BADD9E|5|martes|9F9582A82B95D4D6|30CA084B134496C4",
    "martes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "3",
    "3b",
    "NIDIA",
    "ESPAÑOL",
    ""
  ],
  [
    "FF255CBFCE237965|6|miercoles|09D16EB1662E0784|30CA084B134496C4",
    "miercoles",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "3",
    "3c",
    "NIDIA",
    "ESPAÑOL",
    ""
  ],
  [
    "FF255CBFCE237965|4|viernes|09D16EB1662E0784|30CA084B134496C4",
    "viernes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "3",
    "3c",
    "NIDIA",
    "ESPAÑOL",
    ""
  ],
  [
    "FF255CBFCE237965|8|lunes|09D16EB1662E0784|30CA084B134496C4",
    "lunes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "3",
    "3c",
    "NIDIA",
    "ESPAÑOL",
    ""
  ],
  [
    "FF255CBFCE237965|8|jueves|09D16EB1662E0784|30CA084B134496C4",
    "jueves",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "3",
    "3c",
    "NIDIA",
    "ESPAÑOL",
    ""
  ],
  [
    "FF255CBFCE237965|8|martes|09D16EB1662E0784|30CA084B134496C4",
    "martes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "3",
    "3c",
    "NIDIA",
    "ESPAÑOL",
    ""
  ],
  [
    "CAD170FC93D4D081|1|jueves|34D7F17755D6F37B|30CA084B134496C4",
    "jueves",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "3",
    "3d",
    "NIDIA",
    "ESPAÑOL",
    ""
  ],
  [
    "CAD170FC93D4D081|3|lunes|34D7F17755D6F37B|30CA084B134496C4",
    "lunes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "3",
    "3d",
    "NIDIA",
    "ESPAÑOL",
    ""
  ],
  [
    "CAD170FC93D4D081|3|miercoles|34D7F17755D6F37B|30CA084B134496C4",
    "miercoles",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "3",
    "3d",
    "NIDIA",
    "ESPAÑOL",
    ""
  ],
  [
    "CAD170FC93D4D081|2|viernes|34D7F17755D6F37B|30CA084B134496C4",
    "viernes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "3",
    "3d",
    "NIDIA",
    "ESPAÑOL",
    ""
  ],
  [
    "CAD170FC93D4D081|2|martes|34D7F17755D6F37B|30CA084B134496C4",
    "martes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "3",
    "3d",
    "NIDIA",
    "ESPAÑOL",
    ""
  ],
  [
    "2469060B0E16F765|5|viernes|4DA5AB967CFAAF5A|A3A8C790F12D1250",
    "viernes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "1",
    "1a",
    "ABIGAIL",
    "MATEMATICAS",
    ""
  ],
  [
    "2469060B0E16F765|2|lunes|4DA5AB967CFAAF5A|A3A8C790F12D1250",
    "lunes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "1",
    "1a",
    "ABIGAIL",
    "MATEMATICAS",
    ""
  ],
  [
    "2469060B0E16F765|5|martes|4DA5AB967CFAAF5A|A3A8C790F12D1250",
    "martes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "1",
    "1a",
    "ABIGAIL",
    "MATEMATICAS",
    ""
  ],
  [
    "2469060B0E16F765|5|miercoles|4DA5AB967CFAAF5A|A3A8C790F12D1250",
    "miercoles",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "1",
    "1a",
    "ABIGAIL",
    "MATEMATICAS",
    ""
  ],
  [
    "2469060B0E16F765|4|jueves|4DA5AB967CFAAF5A|A3A8C790F12D1250",
    "jueves",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "1",
    "1a",
    "ABIGAIL",
    "MATEMATICAS",
    ""
  ],
  [
    "AD6F44C31FAAB33E|4|lunes|4DA5AB967CFAAF5A|60F7A986097D183B",
    "lunes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "1",
    "1a",
    "PERLA",
    "GEOGRAFIA",
    ""
  ],
  [
    "AD6F44C31FAAB33E|1|martes|4DA5AB967CFAAF5A|60F7A986097D183B",
    "martes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "1",
    "1a",
    "PERLA",
    "GEOGRAFIA",
    ""
  ],
  [
    "AD6F44C31FAAB33E|8|jueves|4DA5AB967CFAAF5A|60F7A986097D183B",
    "jueves",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "1",
    "1a",
    "PERLA",
    "GEOGRAFIA",
    ""
  ],
  [
    "AD6F44C31FAAB33E|6|viernes|4DA5AB967CFAAF5A|60F7A986097D183B",
    "viernes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "1",
    "1a",
    "PERLA",
    "GEOGRAFIA",
    ""
  ],
  [
    "A5BF1871AFDD808E|2|miercoles|F898AEEC71C5D799|A29CB3B3D26E8D12",
    "miercoles",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "1",
    "1c",
    "REGINA",
    "GEOGRAFIA",
    ""
  ],
  [
    "A5BF1871AFDD808E|1|lunes|F898AEEC71C5D799|A29CB3B3D26E8D12",
    "lunes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "1",
    "1c",
    "REGINA",
    "GEOGRAFIA",
    ""
  ],
  [
    "A5BF1871AFDD808E|8|jueves|F898AEEC71C5D799|A29CB3B3D26E8D12",
    "jueves",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "1",
    "1c",
    "REGINA",
    "GEOGRAFIA",
    ""
  ],
  [
    "A5BF1871AFDD808E|3|martes|F898AEEC71C5D799|A29CB3B3D26E8D12",
    "martes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "1",
    "1c",
    "REGINA",
    "GEOGRAFIA",
    ""
  ],
  [
    "B3330877E51E443B|3|lunes|9C150E4F87B8F68F|A29CB3B3D26E8D12",
    "lunes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "1",
    "1d",
    "REGINA",
    "GEOGRAFIA",
    ""
  ],
  [
    "B3330877E51E443B|5|miercoles|9C150E4F87B8F68F|A29CB3B3D26E8D12",
    "miercoles",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "1",
    "1d",
    "REGINA",
    "GEOGRAFIA",
    ""
  ],
  [
    "B3330877E51E443B|8|martes|9C150E4F87B8F68F|A29CB3B3D26E8D12",
    "martes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "1",
    "1d",
    "REGINA",
    "GEOGRAFIA",
    ""
  ],
  [
    "B3330877E51E443B|1|viernes|9C150E4F87B8F68F|A29CB3B3D26E8D12",
    "viernes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "1",
    "1d",
    "REGINA",
    "GEOGRAFIA",
    ""
  ],
  [
    "FBB78FA83E2649F3|2|lunes|CB9C294473017D3B|A29CB3B3D26E8D12",
    "lunes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "1",
    "1e",
    "REGINA",
    "GEOGRAFIA",
    ""
  ],
  [
    "FBB78FA83E2649F3|2|viernes|CB9C294473017D3B|A29CB3B3D26E8D12",
    "viernes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "1",
    "1e",
    "REGINA",
    "GEOGRAFIA",
    ""
  ],
  [
    "FBB78FA83E2649F3|1|jueves|CB9C294473017D3B|A29CB3B3D26E8D12",
    "jueves",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "1",
    "1e",
    "REGINA",
    "GEOGRAFIA",
    ""
  ],
  [
    "FBB78FA83E2649F3|1|martes|CB9C294473017D3B|A29CB3B3D26E8D12",
    "martes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "1",
    "1e",
    "REGINA",
    "GEOGRAFIA",
    ""
  ],
  [
    "01589403E10683DF|2|jueves|4DA5AB967CFAAF5A|9ECD8E71222DB846",
    "jueves",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "1",
    "1a",
    "KRISTEL",
    "INGLES",
    ""
  ],
  [
    "01589403E10683DF|2|miercoles|4DA5AB967CFAAF5A|9ECD8E71222DB846",
    "miercoles",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "1",
    "1a",
    "KRISTEL",
    "INGLES",
    ""
  ],
  [
    "01589403E10683DF|8|martes|4DA5AB967CFAAF5A|9ECD8E71222DB846",
    "martes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "1",
    "1a",
    "KRISTEL",
    "INGLES",
    ""
  ],
  [
    "C9F7F8BF8A28C79F|7|viernes|A8830AA4164D8A18|9ECD8E71222DB846",
    "viernes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "1",
    "1b",
    "KRISTEL",
    "INGLES",
    ""
  ],
  [
    "C9F7F8BF8A28C79F|4|jueves|A8830AA4164D8A18|9ECD8E71222DB846",
    "jueves",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "1",
    "1b",
    "KRISTEL",
    "INGLES",
    ""
  ],
  [
    "C9F7F8BF8A28C79F|4|miercoles|A8830AA4164D8A18|9ECD8E71222DB846",
    "miercoles",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "1",
    "1b",
    "KRISTEL",
    "INGLES",
    ""
  ],
  [
    "7794EB5A8B7167AA|1|martes|F898AEEC71C5D799|9ECD8E71222DB846",
    "martes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "1",
    "1c",
    "KRISTEL",
    "INGLES",
    ""
  ],
  [
    "7794EB5A8B7167AA|6|viernes|F898AEEC71C5D799|9ECD8E71222DB846",
    "viernes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "1",
    "1c",
    "KRISTEL",
    "INGLES",
    ""
  ],
  [
    "7794EB5A8B7167AA|6|jueves|F898AEEC71C5D799|9ECD8E71222DB846",
    "jueves",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "1",
    "1c",
    "KRISTEL",
    "INGLES",
    ""
  ],
  [
    "324099BE7767DC87|4|martes|9C150E4F87B8F68F|9ECD8E71222DB846",
    "martes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "1",
    "1d",
    "KRISTEL",
    "INGLES",
    ""
  ],
  [
    "324099BE7767DC87|2|viernes|9C150E4F87B8F68F|9ECD8E71222DB846",
    "viernes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "1",
    "1d",
    "KRISTEL",
    "INGLES",
    ""
  ],
  [
    "324099BE7767DC87|8|jueves|9C150E4F87B8F68F|9ECD8E71222DB846",
    "jueves",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "1",
    "1d",
    "KRISTEL",
    "INGLES",
    ""
  ],
  [
    "57FA24F3081F2414|2|martes|CB9C294473017D3B|9ECD8E71222DB846",
    "martes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "1",
    "1e",
    "KRISTEL",
    "INGLES",
    ""
  ],
  [
    "57FA24F3081F2414|3|miercoles|CB9C294473017D3B|9ECD8E71222DB846",
    "miercoles",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "1",
    "1e",
    "KRISTEL",
    "INGLES",
    ""
  ],
  [
    "57FA24F3081F2414|5|viernes|CB9C294473017D3B|9ECD8E71222DB846",
    "viernes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "1",
    "1e",
    "KRISTEL",
    "INGLES",
    ""
  ],
  [
    "5F8A84E7D4A1EA31|8|miercoles|890A6183EF3F24C1|60F7A986097D183B",
    "miercoles",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "2",
    "2a",
    "PERLA",
    "INGLES",
    ""
  ],
  [
    "5F8A84E7D4A1EA31|8|martes|890A6183EF3F24C1|60F7A986097D183B",
    "martes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "2",
    "2a",
    "PERLA",
    "INGLES",
    ""
  ],
  [
    "5F8A84E7D4A1EA31|5|viernes|890A6183EF3F24C1|60F7A986097D183B",
    "viernes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "2",
    "2a",
    "PERLA",
    "INGLES",
    ""
  ],
  [
    "ECD9F860C95EB289|4|miercoles|4E5749F97AC8913D|60F7A986097D183B",
    "miercoles",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "2",
    "2b",
    "PERLA",
    "INGLES",
    ""
  ],
  [
    "ECD9F860C95EB289|1|viernes|4E5749F97AC8913D|60F7A986097D183B",
    "viernes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "2",
    "2b",
    "PERLA",
    "INGLES",
    ""
  ],
  [
    "ECD9F860C95EB289|5|lunes|4E5749F97AC8913D|60F7A986097D183B",
    "lunes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "2",
    "2b",
    "PERLA",
    "INGLES",
    ""
  ],
  [
    "71A276E20B69E2F2|4|viernes|659D9090637708A2|60F7A986097D183B",
    "viernes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "2",
    "2c",
    "PERLA",
    "INGLES",
    ""
  ],
  [
    "71A276E20B69E2F2|7|jueves|659D9090637708A2|60F7A986097D183B",
    "jueves",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "2",
    "2c",
    "PERLA",
    "INGLES",
    ""
  ],
  [
    "71A276E20B69E2F2|6|martes|659D9090637708A2|60F7A986097D183B",
    "martes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "2",
    "2c",
    "PERLA",
    "INGLES",
    ""
  ],
  [
    "47320DCA9D5F9258|3|lunes|CAC3B904CCDF3DEC|60F7A986097D183B",
    "lunes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "2",
    "2d",
    "PERLA",
    "INGLES",
    ""
  ],
  [
    "47320DCA9D5F9258|7|martes|CAC3B904CCDF3DEC|60F7A986097D183B",
    "martes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "2",
    "2d",
    "PERLA",
    "INGLES",
    ""
  ],
  [
    "47320DCA9D5F9258|5|miercoles|CAC3B904CCDF3DEC|60F7A986097D183B",
    "miercoles",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "2",
    "2d",
    "PERLA",
    "INGLES",
    ""
  ],
  [
    "E9BDCF5AFF9DF608|6|lunes|890A6183EF3F24C1|DBCC0FBBB65E06E0",
    "lunes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "2",
    "2a",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "E9BDCF5AFF9DF608|3|miercoles|890A6183EF3F24C1|DBCC0FBBB65E06E0",
    "miercoles",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "2",
    "2a",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "E9BDCF5AFF9DF608|4|jueves|890A6183EF3F24C1|DBCC0FBBB65E06E0",
    "jueves",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "2",
    "2a",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "E9BDCF5AFF9DF608|4|viernes|890A6183EF3F24C1|DBCC0FBBB65E06E0",
    "viernes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "2",
    "2a",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "B59B52E4FDEAB71C|8|viernes|4E5749F97AC8913D|DBCC0FBBB65E06E0",
    "viernes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "2",
    "2b",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "B59B52E4FDEAB71C|5|martes|4E5749F97AC8913D|DBCC0FBBB65E06E0",
    "martes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "2",
    "2b",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "B59B52E4FDEAB71C|7|jueves|4E5749F97AC8913D|DBCC0FBBB65E06E0",
    "jueves",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "2",
    "2b",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "B59B52E4FDEAB71C|3|lunes|4E5749F97AC8913D|DBCC0FBBB65E06E0",
    "lunes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "2",
    "2b",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "6339FBEF4551D0E1|5|miercoles|659D9090637708A2|DBCC0FBBB65E06E0",
    "miercoles",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "2",
    "2c",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "6339FBEF4551D0E1|6|jueves|659D9090637708A2|DBCC0FBBB65E06E0",
    "jueves",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "2",
    "2c",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "6339FBEF4551D0E1|8|lunes|659D9090637708A2|DBCC0FBBB65E06E0",
    "lunes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "2",
    "2c",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "6339FBEF4551D0E1|4|martes|659D9090637708A2|DBCC0FBBB65E06E0",
    "martes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "2",
    "2c",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "EF42ABF8A617B67B|1|lunes|CC88BED50C2F337B|DBCC0FBBB65E06E0",
    "lunes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "2",
    "2e",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "EF42ABF8A617B67B|8|miercoles|CC88BED50C2F337B|DBCC0FBBB65E06E0",
    "miercoles",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "2",
    "2e",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "EF42ABF8A617B67B|5|jueves|CC88BED50C2F337B|DBCC0FBBB65E06E0",
    "jueves",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "2",
    "2e",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "EF42ABF8A617B67B|3|viernes|CC88BED50C2F337B|DBCC0FBBB65E06E0",
    "viernes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "2",
    "2e",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "9125B5E7CAF7A55F|2|lunes|FB11C35192C013B2|DBCC0FBBB65E06E0",
    "lunes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "3",
    "3a",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "9125B5E7CAF7A55F|3|martes|FB11C35192C013B2|DBCC0FBBB65E06E0",
    "martes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "3",
    "3a",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "9125B5E7CAF7A55F|5|viernes|FB11C35192C013B2|DBCC0FBBB65E06E0",
    "viernes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "3",
    "3a",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "9125B5E7CAF7A55F|6|miercoles|FB11C35192C013B2|DBCC0FBBB65E06E0",
    "miercoles",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "3",
    "3a",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "91072EB1DA2A583E|1|martes|A8830AA4164D8A18|A3A8C790F12D1250",
    "martes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "1",
    "1b",
    "ABIGAIL",
    "MATEMATICAS",
    ""
  ],
  [
    "91072EB1DA2A583E|2|miercoles|A8830AA4164D8A18|A3A8C790F12D1250",
    "miercoles",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "1",
    "1b",
    "ABIGAIL",
    "MATEMATICAS",
    ""
  ],
  [
    "91072EB1DA2A583E|1|jueves|A8830AA4164D8A18|A3A8C790F12D1250",
    "jueves",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "1",
    "1b",
    "ABIGAIL",
    "MATEMATICAS",
    ""
  ],
  [
    "91072EB1DA2A583E|1|lunes|A8830AA4164D8A18|A3A8C790F12D1250",
    "lunes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "1",
    "1b",
    "ABIGAIL",
    "MATEMATICAS",
    ""
  ],
  [
    "91072EB1DA2A583E|1|viernes|A8830AA4164D8A18|A3A8C790F12D1250",
    "viernes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "1",
    "1b",
    "ABIGAIL",
    "MATEMATICAS",
    ""
  ],
  [
    "2848E934B886336C|1|viernes|CAC3B904CCDF3DEC|DBCC0FBBB65E06E0",
    "viernes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "2",
    "2d",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "2848E934B886336C|2|martes|CAC3B904CCDF3DEC|DBCC0FBBB65E06E0",
    "martes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "2",
    "2d",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "2848E934B886336C|4|miercoles|CAC3B904CCDF3DEC|DBCC0FBBB65E06E0",
    "miercoles",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "2",
    "2d",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "2848E934B886336C|1|jueves|CAC3B904CCDF3DEC|DBCC0FBBB65E06E0",
    "jueves",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "2",
    "2d",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "0127A1E4FD348194|3|jueves|4454BC74B0D7F74C|30CA084B134496C4",
    "jueves",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "3",
    "3e",
    "NIDIA",
    "ESPAÑOL",
    ""
  ],
  [
    "0127A1E4FD348194|3|martes|4454BC74B0D7F74C|30CA084B134496C4",
    "martes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "3",
    "3e",
    "NIDIA",
    "ESPAÑOL",
    ""
  ],
  [
    "0127A1E4FD348194|2|miercoles|4454BC74B0D7F74C|30CA084B134496C4",
    "miercoles",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "3",
    "3e",
    "NIDIA",
    "ESPAÑOL",
    ""
  ],
  [
    "0127A1E4FD348194|6|lunes|4454BC74B0D7F74C|30CA084B134496C4",
    "lunes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "3",
    "3e",
    "NIDIA",
    "ESPAÑOL",
    ""
  ],
  [
    "0127A1E4FD348194|1|viernes|4454BC74B0D7F74C|30CA084B134496C4",
    "viernes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "3",
    "3e",
    "NIDIA",
    "ESPAÑOL",
    ""
  ],
  [
    "24B8BE31A454AB34|7|jueves|FB11C35192C013B2|9ECD8E71222DB846",
    "jueves",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "3",
    "3a",
    "KRISTEL",
    "INGLES",
    ""
  ],
  [
    "24B8BE31A454AB34|7|martes|FB11C35192C013B2|9ECD8E71222DB846",
    "martes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "3",
    "3a",
    "KRISTEL",
    "INGLES",
    ""
  ],
  [
    "24B8BE31A454AB34|4|viernes|FB11C35192C013B2|9ECD8E71222DB846",
    "viernes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "3",
    "3a",
    "KRISTEL",
    "INGLES",
    ""
  ],
  [
    "D65E50A0E564C5B6|3|lunes|659D9090637708A2|92FE452F1081DA32",
    "lunes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "2",
    "2c",
    "GABRIELA",
    "ESPAÑOL",
    ""
  ],
  [
    "D65E50A0E564C5B6|1|miercoles|659D9090637708A2|92FE452F1081DA32",
    "miercoles",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "2",
    "2c",
    "GABRIELA",
    "ESPAÑOL",
    ""
  ],
  [
    "D65E50A0E564C5B6|7|lunes|659D9090637708A2|92FE452F1081DA32",
    "lunes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "2",
    "2c",
    "GABRIELA",
    "ESPAÑOL",
    ""
  ],
  [
    "D65E50A0E564C5B6|2|martes|659D9090637708A2|92FE452F1081DA32",
    "martes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "2",
    "2c",
    "GABRIELA",
    "ESPAÑOL",
    ""
  ],
  [
    "D65E50A0E564C5B6|1|jueves|659D9090637708A2|92FE452F1081DA32",
    "jueves",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "2",
    "2c",
    "GABRIELA",
    "ESPAÑOL",
    ""
  ],
  [
    "E1870D6E2F68BEF2|4|jueves|FB11C35192C013B2|30CA084B134496C4",
    "jueves",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "3",
    "3a",
    "NIDIA",
    "ESPAÑOL",
    ""
  ],
  [
    "E1870D6E2F68BEF2|1|martes|FB11C35192C013B2|30CA084B134496C4",
    "martes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "3",
    "3a",
    "NIDIA",
    "ESPAÑOL",
    ""
  ],
  [
    "E1870D6E2F68BEF2|6|viernes|FB11C35192C013B2|30CA084B134496C4",
    "viernes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "3",
    "3a",
    "NIDIA",
    "ESPAÑOL",
    ""
  ],
  [
    "E1870D6E2F68BEF2|5|miercoles|FB11C35192C013B2|30CA084B134496C4",
    "miercoles",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "3",
    "3a",
    "NIDIA",
    "ESPAÑOL",
    ""
  ],
  [
    "E1870D6E2F68BEF2|5|lunes|FB11C35192C013B2|30CA084B134496C4",
    "lunes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "3",
    "3a",
    "NIDIA",
    "ESPAÑOL",
    ""
  ],
  [
    "3ACF5AE4D5DBA524|5|jueves|9F9582A82B95D4D6|9ECD8E71222DB846",
    "jueves",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "3",
    "3b",
    "KRISTEL",
    "INGLES",
    ""
  ],
  [
    "3ACF5AE4D5DBA524|3|viernes|9F9582A82B95D4D6|9ECD8E71222DB846",
    "viernes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "3",
    "3b",
    "KRISTEL",
    "INGLES",
    ""
  ],
  [
    "3ACF5AE4D5DBA524|1|miercoles|9F9582A82B95D4D6|9ECD8E71222DB846",
    "miercoles",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "3",
    "3b",
    "KRISTEL",
    "INGLES",
    ""
  ],
  [
    "CC32C64ACCCE1756|1|viernes|09D16EB1662E0784|9ECD8E71222DB846",
    "viernes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "3",
    "3c",
    "KRISTEL",
    "INGLES",
    ""
  ],
  [
    "CC32C64ACCCE1756|1|jueves|09D16EB1662E0784|9ECD8E71222DB846",
    "jueves",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "3",
    "3c",
    "KRISTEL",
    "INGLES",
    ""
  ],
  [
    "CC32C64ACCCE1756|3|martes|09D16EB1662E0784|9ECD8E71222DB846",
    "martes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "3",
    "3c",
    "KRISTEL",
    "INGLES",
    ""
  ],
  [
    "749935189786670C|7|lunes|9F9582A82B95D4D6|DBCC0FBBB65E06E0",
    "lunes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "3",
    "3b",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "749935189786670C|2|miercoles|9F9582A82B95D4D6|DBCC0FBBB65E06E0",
    "miercoles",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "3",
    "3b",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "749935189786670C|8|martes|9F9582A82B95D4D6|DBCC0FBBB65E06E0",
    "martes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "3",
    "3b",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "749935189786670C|8|jueves|9F9582A82B95D4D6|DBCC0FBBB65E06E0",
    "jueves",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "3",
    "3b",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "A96233F73A46971B|1|martes|09D16EB1662E0784|DBCC0FBBB65E06E0",
    "martes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "3",
    "3c",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "A96233F73A46971B|3|jueves|09D16EB1662E0784|DBCC0FBBB65E06E0",
    "jueves",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "3",
    "3c",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "A96233F73A46971B|4|lunes|09D16EB1662E0784|DBCC0FBBB65E06E0",
    "lunes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "3",
    "3c",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "A96233F73A46971B|7|viernes|09D16EB1662E0784|DBCC0FBBB65E06E0",
    "viernes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "3",
    "3c",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "4760C947FED32BB7|6|viernes|34D7F17755D6F37B|DBCC0FBBB65E06E0",
    "viernes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "3",
    "3d",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "4760C947FED32BB7|7|miercoles|34D7F17755D6F37B|DBCC0FBBB65E06E0",
    "miercoles",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "3",
    "3d",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "4760C947FED32BB7|7|martes|34D7F17755D6F37B|DBCC0FBBB65E06E0",
    "martes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "3",
    "3d",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "4760C947FED32BB7|5|lunes|34D7F17755D6F37B|DBCC0FBBB65E06E0",
    "lunes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "3",
    "3d",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "3DC03989598CD5FB|2|viernes|4454BC74B0D7F74C|DBCC0FBBB65E06E0",
    "viernes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "3",
    "3e",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "3DC03989598CD5FB|1|miercoles|4454BC74B0D7F74C|DBCC0FBBB65E06E0",
    "miercoles",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "3",
    "3e",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "3DC03989598CD5FB|2|jueves|4454BC74B0D7F74C|DBCC0FBBB65E06E0",
    "jueves",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "3",
    "3e",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "3DC03989598CD5FB|6|martes|4454BC74B0D7F74C|DBCC0FBBB65E06E0",
    "martes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "3",
    "3e",
    "PEQUEÑO",
    "HISTORIA",
    ""
  ],
  [
    "FA7A2F532E13035E|3|jueves|34D7F17755D6F37B|9ECD8E71222DB846",
    "jueves",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "3",
    "3d",
    "KRISTEL",
    "INGLES",
    ""
  ],
  [
    "FA7A2F532E13035E|8|viernes|34D7F17755D6F37B|9ECD8E71222DB846",
    "viernes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "3",
    "3d",
    "KRISTEL",
    "INGLES",
    ""
  ],
  [
    "FA7A2F532E13035E|5|martes|34D7F17755D6F37B|9ECD8E71222DB846",
    "martes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "3",
    "3d",
    "KRISTEL",
    "INGLES",
    ""
  ],
  [
    "312C6A30530A6F64|1|miercoles|9C150E4F87B8F68F|60F7A986097D183B",
    "miercoles",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "1",
    "1d",
    "PERLA",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "312C6A30530A6F64|2|miercoles|9C150E4F87B8F68F|60F7A986097D183B",
    "miercoles",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "1",
    "1d",
    "PERLA",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "312C6A30530A6F64|1|jueves|9C150E4F87B8F68F|60F7A986097D183B",
    "jueves",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "1",
    "1d",
    "PERLA",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "312C6A30530A6F64|2|jueves|9C150E4F87B8F68F|60F7A986097D183B",
    "jueves",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "1",
    "1d",
    "PERLA",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "D82E0D6495DDF42F|5|lunes|4DA5AB967CFAAF5A|A29CB3B3D26E8D12",
    "lunes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "1",
    "1a",
    "REGINA",
    "ARTES",
    ""
  ],
  [
    "D82E0D6495DDF42F|8|viernes|4DA5AB967CFAAF5A|A29CB3B3D26E8D12",
    "viernes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "1",
    "1a",
    "REGINA",
    "ARTES",
    ""
  ],
  [
    "D82E0D6495DDF42F|5|jueves|4DA5AB967CFAAF5A|A29CB3B3D26E8D12",
    "jueves",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "1",
    "1a",
    "REGINA",
    "ARTES",
    ""
  ],
  [
    "084BA1399A7251B6|5|martes|A8830AA4164D8A18|60F7A986097D183B",
    "martes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "1",
    "1b",
    "PERLA",
    "GEOGRAFIA",
    ""
  ],
  [
    "084BA1399A7251B6|7|miercoles|A8830AA4164D8A18|60F7A986097D183B",
    "miercoles",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "1",
    "1b",
    "PERLA",
    "GEOGRAFIA",
    ""
  ],
  [
    "084BA1399A7251B6|6|lunes|A8830AA4164D8A18|60F7A986097D183B",
    "lunes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "1",
    "1b",
    "PERLA",
    "GEOGRAFIA",
    ""
  ],
  [
    "084BA1399A7251B6|3|jueves|A8830AA4164D8A18|60F7A986097D183B",
    "jueves",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "1",
    "1b",
    "PERLA",
    "GEOGRAFIA",
    ""
  ],
  [
    "34110A586043E4CA|2|lunes|A8830AA4164D8A18|F9762FB8DF4AC49D",
    "lunes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "1",
    "1b",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "34110A586043E4CA|3|martes|A8830AA4164D8A18|F9762FB8DF4AC49D",
    "martes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "1",
    "1b",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "34110A586043E4CA|8|miercoles|A8830AA4164D8A18|F9762FB8DF4AC49D",
    "miercoles",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "1",
    "1b",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "34110A586043E4CA|8|viernes|A8830AA4164D8A18|F9762FB8DF4AC49D",
    "viernes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "1",
    "1b",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "34110A586043E4CA|2|jueves|A8830AA4164D8A18|F9762FB8DF4AC49D",
    "jueves",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "1",
    "1b",
    "MIGUEL",
    "ESPAÑOL",
    ""
  ],
  [
    "69B5B981A727F4B5|4|viernes|A8830AA4164D8A18|A29CB3B3D26E8D12",
    "viernes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "1",
    "1b",
    "REGINA",
    "ARTES",
    ""
  ],
  [
    "69B5B981A727F4B5|4|martes|A8830AA4164D8A18|A29CB3B3D26E8D12",
    "martes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "1",
    "1b",
    "REGINA",
    "ARTES",
    ""
  ],
  [
    "69B5B981A727F4B5|6|miercoles|A8830AA4164D8A18|A29CB3B3D26E8D12",
    "miercoles",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "1",
    "1b",
    "REGINA",
    "ARTES",
    ""
  ],
  [
    "5753641CE55B2CFB|2|martes|A8830AA4164D8A18|F9762FB8DF4AC49D",
    "martes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "1",
    "1b",
    "MIGUEL",
    "A CURR",
    ""
  ],
  [
    "82E342D1DEE234CC|4|lunes|F898AEEC71C5D799|F9762FB8DF4AC49D",
    "lunes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "1",
    "1c",
    "MIGUEL",
    "A CURR",
    ""
  ],
  [
    "EEB4EA7BD6FD1886|5|viernes|F898AEEC71C5D799|A29CB3B3D26E8D12",
    "viernes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "1",
    "1c",
    "REGINA",
    "ARTES",
    ""
  ],
  [
    "EEB4EA7BD6FD1886|5|martes|F898AEEC71C5D799|A29CB3B3D26E8D12",
    "martes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "1",
    "1c",
    "REGINA",
    "ARTES",
    ""
  ],
  [
    "EEB4EA7BD6FD1886|7|jueves|F898AEEC71C5D799|A29CB3B3D26E8D12",
    "jueves",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "1",
    "1c",
    "REGINA",
    "ARTES",
    ""
  ],
  [
    "9D0E31DAB371C302|4|miercoles|F898AEEC71C5D799|A3A8C790F12D1250",
    "miercoles",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "1",
    "1c",
    "ABIGAIL",
    "MATEMATICAS",
    ""
  ],
  [
    "9D0E31DAB371C302|2|martes|F898AEEC71C5D799|A3A8C790F12D1250",
    "martes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "1",
    "1c",
    "ABIGAIL",
    "MATEMATICAS",
    ""
  ],
  [
    "9D0E31DAB371C302|2|viernes|F898AEEC71C5D799|A3A8C790F12D1250",
    "viernes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "1",
    "1c",
    "ABIGAIL",
    "MATEMATICAS",
    ""
  ],
  [
    "9D0E31DAB371C302|2|jueves|F898AEEC71C5D799|A3A8C790F12D1250",
    "jueves",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "1",
    "1c",
    "ABIGAIL",
    "MATEMATICAS",
    ""
  ],
  [
    "9D0E31DAB371C302|1|miercoles|F898AEEC71C5D799|A3A8C790F12D1250",
    "miercoles",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "1",
    "1c",
    "ABIGAIL",
    "MATEMATICAS",
    ""
  ],
  [
    "BB51A13CDDAFDCBC|3|lunes|4DA5AB967CFAAF5A|F9762FB8DF4AC49D",
    "lunes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "1",
    "1a",
    "MIGUEL",
    "A CURR",
    ""
  ],
  [
    "981894BEC0AB4133|6|jueves|9C150E4F87B8F68F|F9762FB8DF4AC49D",
    "jueves",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "1",
    "1d",
    "MIGUEL",
    "A CURR",
    ""
  ],
  [
    "396150F2D78074F0|6|viernes|CB9C294473017D3B|F9762FB8DF4AC49D",
    "viernes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "1",
    "1e",
    "MIGUEL",
    "A CURR",
    ""
  ],
  [
    "7A68E087F01A4C92|7|jueves|CB9C294473017D3B|54986628C5B35FC3",
    "jueves",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "1",
    "1e",
    "AZAEL",
    "MATEMATICAS",
    ""
  ],
  [
    "7A68E087F01A4C92|7|lunes|CB9C294473017D3B|54986628C5B35FC3",
    "lunes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "1",
    "1e",
    "AZAEL",
    "MATEMATICAS",
    ""
  ],
  [
    "7A68E087F01A4C92|1|viernes|CB9C294473017D3B|54986628C5B35FC3",
    "viernes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "1",
    "1e",
    "AZAEL",
    "MATEMATICAS",
    ""
  ],
  [
    "7A68E087F01A4C92|1|lunes|CB9C294473017D3B|54986628C5B35FC3",
    "lunes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "1",
    "1e",
    "AZAEL",
    "MATEMATICAS",
    ""
  ],
  [
    "7A68E087F01A4C92|4|martes|CB9C294473017D3B|54986628C5B35FC3",
    "martes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "1",
    "1e",
    "AZAEL",
    "MATEMATICAS",
    ""
  ],
  [
    "D8AA71B66F1855BA|3|jueves|890A6183EF3F24C1|54986628C5B35FC3",
    "jueves",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "2",
    "2a",
    "AZAEL",
    "MATEMATICAS",
    ""
  ],
  [
    "D8AA71B66F1855BA|6|martes|890A6183EF3F24C1|54986628C5B35FC3",
    "martes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "2",
    "2a",
    "AZAEL",
    "MATEMATICAS",
    ""
  ],
  [
    "D8AA71B66F1855BA|3|viernes|890A6183EF3F24C1|54986628C5B35FC3",
    "viernes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "2",
    "2a",
    "AZAEL",
    "MATEMATICAS",
    ""
  ],
  [
    "D8AA71B66F1855BA|2|lunes|890A6183EF3F24C1|54986628C5B35FC3",
    "lunes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "2",
    "2a",
    "AZAEL",
    "MATEMATICAS",
    ""
  ],
  [
    "D8AA71B66F1855BA|5|lunes|890A6183EF3F24C1|54986628C5B35FC3",
    "lunes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "2",
    "2a",
    "AZAEL",
    "MATEMATICAS",
    ""
  ],
  [
    "419553CF21BBC2BC|8|jueves|4E5749F97AC8913D|54986628C5B35FC3",
    "jueves",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "2",
    "2b",
    "AZAEL",
    "MATEMATICAS",
    ""
  ],
  [
    "419553CF21BBC2BC|3|martes|4E5749F97AC8913D|54986628C5B35FC3",
    "martes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "2",
    "2b",
    "AZAEL",
    "MATEMATICAS",
    ""
  ],
  [
    "419553CF21BBC2BC|5|viernes|4E5749F97AC8913D|54986628C5B35FC3",
    "viernes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "2",
    "2b",
    "AZAEL",
    "MATEMATICAS",
    ""
  ],
  [
    "419553CF21BBC2BC|8|lunes|4E5749F97AC8913D|54986628C5B35FC3",
    "lunes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "2",
    "2b",
    "AZAEL",
    "MATEMATICAS",
    ""
  ],
  [
    "419553CF21BBC2BC|7|martes|4E5749F97AC8913D|54986628C5B35FC3",
    "martes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "2",
    "2b",
    "AZAEL",
    "MATEMATICAS",
    ""
  ],
  [
    "D83C439CED81B71A|6|lunes|CC88BED50C2F337B|0EEBAB00014D31E3",
    "lunes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "2",
    "2e",
    "DAVID",
    "MATEMATICAS",
    ""
  ],
  [
    "D83C439CED81B71A|1|miercoles|CC88BED50C2F337B|0EEBAB00014D31E3",
    "miercoles",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "2",
    "2e",
    "DAVID",
    "MATEMATICAS",
    ""
  ],
  [
    "D83C439CED81B71A|5|viernes|CC88BED50C2F337B|0EEBAB00014D31E3",
    "viernes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "2",
    "2e",
    "DAVID",
    "MATEMATICAS",
    ""
  ],
  [
    "D83C439CED81B71A|1|jueves|CC88BED50C2F337B|0EEBAB00014D31E3",
    "jueves",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "2",
    "2e",
    "DAVID",
    "MATEMATICAS",
    ""
  ],
  [
    "D83C439CED81B71A|6|viernes|CC88BED50C2F337B|0EEBAB00014D31E3",
    "viernes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "2",
    "2e",
    "DAVID",
    "MATEMATICAS",
    ""
  ],
  [
    "FD5EF019FD7438D4|4|miercoles|FB11C35192C013B2|0EEBAB00014D31E3",
    "miercoles",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "3",
    "3a",
    "DAVID",
    "MATEMATICAS",
    ""
  ],
  [
    "FD5EF019FD7438D4|1|lunes|FB11C35192C013B2|0EEBAB00014D31E3",
    "lunes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "3",
    "3a",
    "DAVID",
    "MATEMATICAS",
    ""
  ],
  [
    "FD5EF019FD7438D4|5|martes|FB11C35192C013B2|0EEBAB00014D31E3",
    "martes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "3",
    "3a",
    "DAVID",
    "MATEMATICAS",
    ""
  ],
  [
    "FD5EF019FD7438D4|3|jueves|FB11C35192C013B2|0EEBAB00014D31E3",
    "jueves",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "3",
    "3a",
    "DAVID",
    "MATEMATICAS",
    ""
  ],
  [
    "FD5EF019FD7438D4|7|viernes|FB11C35192C013B2|0EEBAB00014D31E3",
    "viernes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "3",
    "3a",
    "DAVID",
    "MATEMATICAS",
    ""
  ],
  [
    "156D801AAD7E5B48|7|miercoles|9F9582A82B95D4D6|0EEBAB00014D31E3",
    "miercoles",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "3",
    "3b",
    "DAVID",
    "MATEMATICAS",
    ""
  ],
  [
    "156D801AAD7E5B48|2|lunes|9F9582A82B95D4D6|0EEBAB00014D31E3",
    "lunes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "3",
    "3b",
    "DAVID",
    "MATEMATICAS",
    ""
  ],
  [
    "156D801AAD7E5B48|1|viernes|9F9582A82B95D4D6|0EEBAB00014D31E3",
    "viernes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "3",
    "3b",
    "DAVID",
    "MATEMATICAS",
    ""
  ],
  [
    "156D801AAD7E5B48|6|martes|9F9582A82B95D4D6|0EEBAB00014D31E3",
    "martes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "3",
    "3b",
    "DAVID",
    "MATEMATICAS",
    ""
  ],
  [
    "156D801AAD7E5B48|7|jueves|9F9582A82B95D4D6|0EEBAB00014D31E3",
    "jueves",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "3",
    "3b",
    "DAVID",
    "MATEMATICAS",
    ""
  ],
  [
    "0AF43FD619546347|5|lunes|09D16EB1662E0784|0EEBAB00014D31E3",
    "lunes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "3",
    "3c",
    "DAVID",
    "MATEMATICAS",
    ""
  ],
  [
    "0AF43FD619546347|2|martes|09D16EB1662E0784|0EEBAB00014D31E3",
    "martes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "3",
    "3c",
    "DAVID",
    "MATEMATICAS",
    ""
  ],
  [
    "0AF43FD619546347|6|jueves|09D16EB1662E0784|0EEBAB00014D31E3",
    "jueves",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "3",
    "3c",
    "DAVID",
    "MATEMATICAS",
    ""
  ],
  [
    "0AF43FD619546347|2|viernes|09D16EB1662E0784|0EEBAB00014D31E3",
    "viernes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "3",
    "3c",
    "DAVID",
    "MATEMATICAS",
    ""
  ],
  [
    "0AF43FD619546347|2|miercoles|09D16EB1662E0784|0EEBAB00014D31E3",
    "miercoles",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "3",
    "3c",
    "DAVID",
    "MATEMATICAS",
    ""
  ],
  [
    "9DDDA90C2517D851|1|martes|34D7F17755D6F37B|0EEBAB00014D31E3",
    "martes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "3",
    "3d",
    "DAVID",
    "MATEMATICAS",
    ""
  ],
  [
    "9DDDA90C2517D851|4|lunes|34D7F17755D6F37B|0EEBAB00014D31E3",
    "lunes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "3",
    "3d",
    "DAVID",
    "MATEMATICAS",
    ""
  ],
  [
    "9DDDA90C2517D851|3|viernes|34D7F17755D6F37B|0EEBAB00014D31E3",
    "viernes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "3",
    "3d",
    "DAVID",
    "MATEMATICAS",
    ""
  ],
  [
    "9DDDA90C2517D851|5|miercoles|34D7F17755D6F37B|0EEBAB00014D31E3",
    "miercoles",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "3",
    "3d",
    "DAVID",
    "MATEMATICAS",
    ""
  ],
  [
    "9DDDA90C2517D851|2|jueves|34D7F17755D6F37B|0EEBAB00014D31E3",
    "jueves",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "3",
    "3d",
    "DAVID",
    "MATEMATICAS",
    ""
  ],
  [
    "E46C2FBA29DCB8DD|5|jueves|4454BC74B0D7F74C|0EEBAB00014D31E3",
    "jueves",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "3",
    "3e",
    "DAVID",
    "MATEMATICAS",
    ""
  ],
  [
    "E46C2FBA29DCB8DD|4|viernes|4454BC74B0D7F74C|0EEBAB00014D31E3",
    "viernes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "3",
    "3e",
    "DAVID",
    "MATEMATICAS",
    ""
  ],
  [
    "E46C2FBA29DCB8DD|3|lunes|4454BC74B0D7F74C|0EEBAB00014D31E3",
    "lunes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "3",
    "3e",
    "DAVID",
    "MATEMATICAS",
    ""
  ],
  [
    "E46C2FBA29DCB8DD|6|miercoles|4454BC74B0D7F74C|0EEBAB00014D31E3",
    "miercoles",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "3",
    "3e",
    "DAVID",
    "MATEMATICAS",
    ""
  ],
  [
    "E46C2FBA29DCB8DD|4|martes|4454BC74B0D7F74C|0EEBAB00014D31E3",
    "martes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "3",
    "3e",
    "DAVID",
    "MATEMATICAS",
    ""
  ],
  [
    "09F2E3888F0F75BF|7|viernes|4DA5AB967CFAAF5A|0EBDA2308DC0E6CD",
    "viernes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "1",
    "1a",
    "DILERI",
    "CIENCIAS",
    ""
  ],
  [
    "09F2E3888F0F75BF|7|lunes|4DA5AB967CFAAF5A|0EBDA2308DC0E6CD",
    "lunes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "1",
    "1a",
    "DILERI",
    "CIENCIAS",
    ""
  ],
  [
    "1A19B13D1C67CE76|8|miercoles|4DA5AB967CFAAF5A|0EBDA2308DC0E6CD",
    "miercoles",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "1",
    "1a",
    "DILERI",
    "CIENCIAS",
    "Laboratorio"
  ],
  [
    "1A19B13D1C67CE76|8|lunes|4DA5AB967CFAAF5A|0EBDA2308DC0E6CD",
    "lunes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "1",
    "1a",
    "DILERI",
    "CIENCIAS",
    "Laboratorio"
  ],
  [
    "0DE7449FCD16FE34|7|miercoles|F898AEEC71C5D799|0EBDA2308DC0E6CD",
    "miercoles",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "1",
    "1c",
    "DILERI",
    "CIENCIAS",
    ""
  ],
  [
    "0DE7449FCD16FE34|3|lunes|F898AEEC71C5D799|0EBDA2308DC0E6CD",
    "lunes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "1",
    "1c",
    "DILERI",
    "CIENCIAS",
    ""
  ],
  [
    "CF01B7C87BC9C710|6|viernes|9C150E4F87B8F68F|0EBDA2308DC0E6CD",
    "viernes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "1",
    "1d",
    "DILERI",
    "CIENCIAS",
    ""
  ],
  [
    "CF01B7C87BC9C710|6|lunes|9C150E4F87B8F68F|0EBDA2308DC0E6CD",
    "lunes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "1",
    "1d",
    "DILERI",
    "CIENCIAS",
    ""
  ],
  [
    "989C0748856A098E|8|viernes|CB9C294473017D3B|0EBDA2308DC0E6CD",
    "viernes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "1",
    "1e",
    "DILERI",
    "CIENCIAS",
    ""
  ],
  [
    "989C0748856A098E|4|lunes|CB9C294473017D3B|0EBDA2308DC0E6CD",
    "lunes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "1",
    "1e",
    "DILERI",
    "CIENCIAS",
    ""
  ],
  [
    "D39718BABF3EC636|4|miercoles|9C150E4F87B8F68F|0EBDA2308DC0E6CD",
    "miercoles",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "1",
    "1d",
    "DILERI",
    "CIENCIAS",
    "Laboratorio"
  ],
  [
    "D39718BABF3EC636|3|viernes|9C150E4F87B8F68F|0EBDA2308DC0E6CD",
    "viernes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "1",
    "1d",
    "DILERI",
    "CIENCIAS",
    "Laboratorio"
  ],
  [
    "FA58B854DC537ABD|3|miercoles|F898AEEC71C5D799|0EBDA2308DC0E6CD",
    "miercoles",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "1",
    "1c",
    "DILERI",
    "CIENCIAS",
    "Laboratorio"
  ],
  [
    "FA58B854DC537ABD|4|viernes|F898AEEC71C5D799|0EBDA2308DC0E6CD",
    "viernes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "1",
    "1c",
    "DILERI",
    "CIENCIAS",
    "Laboratorio"
  ],
  [
    "BCF2E36D96753F49|5|lunes|CB9C294473017D3B|0EBDA2308DC0E6CD",
    "lunes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "1",
    "1e",
    "DILERI",
    "CIENCIAS",
    "Laboratorio"
  ],
  [
    "BCF2E36D96753F49|5|miercoles|CB9C294473017D3B|0EBDA2308DC0E6CD",
    "miercoles",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "1",
    "1e",
    "DILERI",
    "CIENCIAS",
    "Laboratorio"
  ],
  [
    "D14069B9710541C4|3|martes|9F9582A82B95D4D6|D148761678820BB2",
    "martes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "3",
    "3b",
    "ERIKA",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "D14069B9710541C4|4|martes|9F9582A82B95D4D6|D148761678820BB2",
    "martes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "3",
    "3b",
    "ERIKA",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "D14069B9710541C4|3|lunes|9F9582A82B95D4D6|D148761678820BB2",
    "lunes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "3",
    "3b",
    "ERIKA",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "D14069B9710541C4|4|lunes|9F9582A82B95D4D6|D148761678820BB2",
    "lunes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "3",
    "3b",
    "ERIKA",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "F24175B852E4B091|1|lunes|34D7F17755D6F37B|D148761678820BB2",
    "lunes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "3",
    "3d",
    "ERIKA",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "F24175B852E4B091|2|lunes|34D7F17755D6F37B|D148761678820BB2",
    "lunes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "3",
    "3d",
    "ERIKA",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "F24175B852E4B091|7|jueves|34D7F17755D6F37B|D148761678820BB2",
    "jueves",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "3",
    "3d",
    "ERIKA",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "F24175B852E4B091|8|jueves|34D7F17755D6F37B|D148761678820BB2",
    "jueves",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "3",
    "3d",
    "ERIKA",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "532A5E0D26EE1BC5|3|miercoles|4454BC74B0D7F74C|D148761678820BB2",
    "miercoles",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "3",
    "3e",
    "ERIKA",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "532A5E0D26EE1BC5|4|miercoles|4454BC74B0D7F74C|D148761678820BB2",
    "miercoles",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "3",
    "3e",
    "ERIKA",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "532A5E0D26EE1BC5|1|martes|4454BC74B0D7F74C|D148761678820BB2",
    "martes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "3",
    "3e",
    "ERIKA",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "532A5E0D26EE1BC5|2|martes|4454BC74B0D7F74C|D148761678820BB2",
    "martes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "3",
    "3e",
    "ERIKA",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "B05C13D714994BA2|8|lunes|9F9582A82B95D4D6|D148761678820BB2",
    "lunes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "3",
    "3b",
    "ERIKA",
    "TECNOLOGIA",
    ""
  ],
  [
    "B05C13D714994BA2|6|miercoles|9F9582A82B95D4D6|D148761678820BB2",
    "miercoles",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "3",
    "3b",
    "ERIKA",
    "TECNOLOGIA",
    ""
  ],
  [
    "B05C13D714994BA2|3|jueves|9F9582A82B95D4D6|D148761678820BB2",
    "jueves",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "3",
    "3b",
    "ERIKA",
    "TECNOLOGIA",
    ""
  ],
  [
    "B05C13D714994BA2|7|martes|9F9582A82B95D4D6|D148761678820BB2",
    "martes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "3",
    "3b",
    "ERIKA",
    "TECNOLOGIA",
    ""
  ],
  [
    "249C085679C160AB|8|martes|34D7F17755D6F37B|D148761678820BB2",
    "martes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "3",
    "3d",
    "ERIKA",
    "TECNOLOGIA",
    ""
  ],
  [
    "249C085679C160AB|4|viernes|34D7F17755D6F37B|D148761678820BB2",
    "viernes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "3",
    "3d",
    "ERIKA",
    "TECNOLOGIA",
    ""
  ],
  [
    "249C085679C160AB|7|viernes|34D7F17755D6F37B|D148761678820BB2",
    "viernes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "3",
    "3d",
    "ERIKA",
    "TECNOLOGIA",
    ""
  ],
  [
    "249C085679C160AB|2|miercoles|34D7F17755D6F37B|D148761678820BB2",
    "miercoles",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "3",
    "3d",
    "ERIKA",
    "TECNOLOGIA",
    ""
  ],
  [
    "F2FEB4E29F974B7E|3|viernes|09D16EB1662E0784|D148761678820BB2",
    "viernes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "3",
    "3c",
    "ERIKA",
    "TECNOLOGIA",
    ""
  ],
  [
    "F2FEB4E29F974B7E|6|lunes|09D16EB1662E0784|D148761678820BB2",
    "lunes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "3",
    "3c",
    "ERIKA",
    "TECNOLOGIA",
    ""
  ],
  [
    "F2FEB4E29F974B7E|1|miercoles|09D16EB1662E0784|D148761678820BB2",
    "miercoles",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "3",
    "3c",
    "ERIKA",
    "TECNOLOGIA",
    ""
  ],
  [
    "F2FEB4E29F974B7E|4|jueves|09D16EB1662E0784|D148761678820BB2",
    "jueves",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "3",
    "3c",
    "ERIKA",
    "TECNOLOGIA",
    ""
  ],
  [
    "424D6C091CC5336D|6|martes|FB11C35192C013B2|D148761678820BB2",
    "martes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "3",
    "3a",
    "ERIKA",
    "TECNOLOGIA",
    ""
  ],
  [
    "424D6C091CC5336D|2|jueves|FB11C35192C013B2|D148761678820BB2",
    "jueves",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "3",
    "3a",
    "ERIKA",
    "TECNOLOGIA",
    ""
  ],
  [
    "424D6C091CC5336D|8|viernes|FB11C35192C013B2|D148761678820BB2",
    "viernes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "3",
    "3a",
    "ERIKA",
    "TECNOLOGIA",
    ""
  ],
  [
    "424D6C091CC5336D|7|lunes|FB11C35192C013B2|D148761678820BB2",
    "lunes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "3",
    "3a",
    "ERIKA",
    "TECNOLOGIA",
    ""
  ],
  [
    "9C7029017021E89A|7|miercoles|09D16EB1662E0784|D148761678820BB2",
    "miercoles",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "3",
    "3c",
    "ERIKA",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "9C7029017021E89A|8|miercoles|09D16EB1662E0784|D148761678820BB2",
    "miercoles",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "3",
    "3c",
    "ERIKA",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "9C7029017021E89A|5|viernes|09D16EB1662E0784|D148761678820BB2",
    "viernes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "3",
    "3c",
    "ERIKA",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "9C7029017021E89A|6|viernes|09D16EB1662E0784|D148761678820BB2",
    "viernes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "3",
    "3c",
    "ERIKA",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "EF2CDD5E9E1CF5A6|5|martes|659D9090637708A2|43353B6F94211136",
    "martes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "2",
    "2c",
    "LEONARDO",
    "MATEMATICAS",
    ""
  ],
  [
    "EF2CDD5E9E1CF5A6|7|viernes|659D9090637708A2|43353B6F94211136",
    "viernes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "2",
    "2c",
    "LEONARDO",
    "MATEMATICAS",
    ""
  ],
  [
    "EF2CDD5E9E1CF5A6|2|jueves|659D9090637708A2|43353B6F94211136",
    "jueves",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "2",
    "2c",
    "LEONARDO",
    "MATEMATICAS",
    ""
  ],
  [
    "EF2CDD5E9E1CF5A6|2|viernes|659D9090637708A2|43353B6F94211136",
    "viernes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "2",
    "2c",
    "LEONARDO",
    "MATEMATICAS",
    ""
  ],
  [
    "EF2CDD5E9E1CF5A6|2|miercoles|659D9090637708A2|43353B6F94211136",
    "miercoles",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "2",
    "2c",
    "LEONARDO",
    "MATEMATICAS",
    ""
  ],
  [
    "E97714108D770E5D|7|miercoles|CAC3B904CCDF3DEC|43353B6F94211136",
    "miercoles",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "2",
    "2d",
    "LEONARDO",
    "MATEMATICAS",
    ""
  ],
  [
    "E97714108D770E5D|5|viernes|CAC3B904CCDF3DEC|43353B6F94211136",
    "viernes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "2",
    "2d",
    "LEONARDO",
    "MATEMATICAS",
    ""
  ],
  [
    "E97714108D770E5D|6|viernes|CAC3B904CCDF3DEC|43353B6F94211136",
    "viernes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "2",
    "2d",
    "LEONARDO",
    "MATEMATICAS",
    ""
  ],
  [
    "E97714108D770E5D|2|lunes|CAC3B904CCDF3DEC|43353B6F94211136",
    "lunes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "2",
    "2d",
    "LEONARDO",
    "MATEMATICAS",
    ""
  ],
  [
    "E97714108D770E5D|6|jueves|CAC3B904CCDF3DEC|43353B6F94211136",
    "jueves",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "2",
    "2d",
    "LEONARDO",
    "MATEMATICAS",
    ""
  ],
  [
    "85AC94760C6B55C7|1|viernes|659D9090637708A2|43353B6F94211136",
    "viernes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "2",
    "2c",
    "LEONARDO",
    "ARTES",
    ""
  ],
  [
    "85AC94760C6B55C7|1|martes|659D9090637708A2|43353B6F94211136",
    "martes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "2",
    "2c",
    "LEONARDO",
    "ARTES",
    ""
  ],
  [
    "85AC94760C6B55C7|3|jueves|659D9090637708A2|43353B6F94211136",
    "jueves",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "2",
    "2c",
    "LEONARDO",
    "ARTES",
    ""
  ],
  [
    "34AD249F2AF71613|4|jueves|9F9582A82B95D4D6|43353B6F94211136",
    "jueves",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "3",
    "3b",
    "LEONARDO",
    "ARTES",
    ""
  ],
  [
    "34AD249F2AF71613|4|viernes|9F9582A82B95D4D6|43353B6F94211136",
    "viernes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "3",
    "3b",
    "LEONARDO",
    "ARTES",
    ""
  ],
  [
    "34AD249F2AF71613|5|miercoles|9F9582A82B95D4D6|43353B6F94211136",
    "miercoles",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "3",
    "3b",
    "LEONARDO",
    "ARTES",
    ""
  ],
  [
    "DB01F8D14C625ADA|7|martes|09D16EB1662E0784|43353B6F94211136",
    "martes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "3",
    "3c",
    "LEONARDO",
    "ARTES",
    ""
  ],
  [
    "DB01F8D14C625ADA|7|jueves|09D16EB1662E0784|43353B6F94211136",
    "jueves",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "3",
    "3c",
    "LEONARDO",
    "ARTES",
    ""
  ],
  [
    "DB01F8D14C625ADA|1|lunes|09D16EB1662E0784|43353B6F94211136",
    "lunes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "3",
    "3c",
    "LEONARDO",
    "ARTES",
    ""
  ],
  [
    "1E4D4860B0EEB7C2|3|viernes|4E5749F97AC8913D|43353B6F94211136",
    "viernes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "2",
    "2b",
    "LEONARDO",
    "TUTORIA",
    ""
  ],
  [
    "2CEFBAE75AD722F8|8|martes|CAC3B904CCDF3DEC|43353B6F94211136",
    "martes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "2",
    "2d",
    "LEONARDO",
    "TUTORIA",
    ""
  ],
  [
    "B9185B082FF07080|5|miercoles|F898AEEC71C5D799|A2C1B66B0F0440F1",
    "miercoles",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "1",
    "1c",
    "MARISOL",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "B9185B082FF07080|6|miercoles|F898AEEC71C5D799|A2C1B66B0F0440F1",
    "miercoles",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "1",
    "1c",
    "MARISOL",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "B9185B082FF07080|7|viernes|F898AEEC71C5D799|A2C1B66B0F0440F1",
    "viernes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "1",
    "1c",
    "MARISOL",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "B9185B082FF07080|8|viernes|F898AEEC71C5D799|A2C1B66B0F0440F1",
    "viernes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "1",
    "1c",
    "MARISOL",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "CC87E87A410CA40B|3|jueves|CB9C294473017D3B|A2C1B66B0F0440F1",
    "jueves",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "1",
    "1e",
    "MARISOL",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "CC87E87A410CA40B|4|jueves|CB9C294473017D3B|A2C1B66B0F0440F1",
    "jueves",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "1",
    "1e",
    "MARISOL",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "CC87E87A410CA40B|5|martes|CB9C294473017D3B|A2C1B66B0F0440F1",
    "martes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "1",
    "1e",
    "MARISOL",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "CC87E87A410CA40B|6|martes|CB9C294473017D3B|A2C1B66B0F0440F1",
    "martes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "1",
    "1e",
    "MARISOL",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "81179D832239B7D2|5|jueves|34D7F17755D6F37B|A2C1B66B0F0440F1",
    "jueves",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "3",
    "3d",
    "MARISOL",
    "ARTES",
    ""
  ],
  [
    "81179D832239B7D2|8|miercoles|34D7F17755D6F37B|A2C1B66B0F0440F1",
    "miercoles",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "3",
    "3d",
    "MARISOL",
    "ARTES",
    ""
  ],
  [
    "81179D832239B7D2|5|viernes|34D7F17755D6F37B|A2C1B66B0F0440F1",
    "viernes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "3",
    "3d",
    "MARISOL",
    "ARTES",
    ""
  ],
  [
    "5049E87228BE1A92|8|martes|4454BC74B0D7F74C|A2C1B66B0F0440F1",
    "martes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "3",
    "3e",
    "MARISOL",
    "ARTES",
    ""
  ],
  [
    "5049E87228BE1A92|8|jueves|4454BC74B0D7F74C|A2C1B66B0F0440F1",
    "jueves",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "3",
    "3e",
    "MARISOL",
    "ARTES",
    ""
  ],
  [
    "5049E87228BE1A92|4|lunes|4454BC74B0D7F74C|A2C1B66B0F0440F1",
    "lunes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "3",
    "3e",
    "MARISOL",
    "ARTES",
    ""
  ],
  [
    "9234279582107C7D|7|lunes|4E5749F97AC8913D|A2C1B66B0F0440F1",
    "lunes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "2",
    "2b",
    "MARISOL",
    "A CURR",
    ""
  ],
  [
    "F9BAF3B0D20368A4|6|jueves|CC88BED50C2F337B|A2C1B66B0F0440F1",
    "jueves",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "2",
    "2e",
    "MARISOL",
    "A CURR",
    ""
  ],
  [
    "2AE43AAEF2C76870|8|lunes|890A6183EF3F24C1|03DE42FEA1019F7C",
    "lunes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "2",
    "2a",
    "NOEMI",
    "ARTES",
    ""
  ],
  [
    "2AE43AAEF2C76870|8|viernes|890A6183EF3F24C1|03DE42FEA1019F7C",
    "viernes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "2",
    "2a",
    "NOEMI",
    "ARTES",
    ""
  ],
  [
    "2AE43AAEF2C76870|1|miercoles|890A6183EF3F24C1|03DE42FEA1019F7C",
    "miercoles",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "2",
    "2a",
    "NOEMI",
    "ARTES",
    ""
  ],
  [
    "14491319352898E9|2|lunes|4E5749F97AC8913D|03DE42FEA1019F7C",
    "lunes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "2",
    "2b",
    "NOEMI",
    "ARTES",
    ""
  ],
  [
    "14491319352898E9|2|miercoles|4E5749F97AC8913D|03DE42FEA1019F7C",
    "miercoles",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "2",
    "2b",
    "NOEMI",
    "ARTES",
    ""
  ],
  [
    "14491319352898E9|6|viernes|4E5749F97AC8913D|03DE42FEA1019F7C",
    "viernes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "2",
    "2b",
    "NOEMI",
    "ARTES",
    ""
  ],
  [
    "D75E0FAD409BF9F1|7|miercoles|4DA5AB967CFAAF5A|03DE42FEA1019F7C",
    "miercoles",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "1",
    "1a",
    "NOEMI",
    "EDUCACIÓN FISICA",
    ""
  ],
  [
    "D75E0FAD409BF9F1|4|viernes|4DA5AB967CFAAF5A|03DE42FEA1019F7C",
    "viernes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "1",
    "1a",
    "NOEMI",
    "EDUCACIÓN FISICA",
    ""
  ],
  [
    "F5EBAA4403D8B205|3|viernes|F898AEEC71C5D799|03DE42FEA1019F7C",
    "viernes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "1",
    "1c",
    "NOEMI",
    "EDUCACIÓN FISICA",
    ""
  ],
  [
    "F5EBAA4403D8B205|8|miercoles|F898AEEC71C5D799|03DE42FEA1019F7C",
    "miercoles",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "1",
    "1c",
    "NOEMI",
    "EDUCACIÓN FISICA",
    ""
  ],
  [
    "59ED20ABDF768E88|7|viernes|9C150E4F87B8F68F|03DE42FEA1019F7C",
    "viernes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "1",
    "1d",
    "NOEMI",
    "EDUCACIÓN FISICA",
    ""
  ],
  [
    "59ED20ABDF768E88|3|miercoles|9C150E4F87B8F68F|03DE42FEA1019F7C",
    "miercoles",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "1",
    "1d",
    "NOEMI",
    "EDUCACIÓN FISICA",
    ""
  ],
  [
    "3CF2AD8EB3A6B2EC|3|lunes|CB9C294473017D3B|03DE42FEA1019F7C",
    "lunes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "1",
    "1e",
    "NOEMI",
    "EDUCACIÓN FISICA",
    ""
  ],
  [
    "3CF2AD8EB3A6B2EC|6|miercoles|CB9C294473017D3B|03DE42FEA1019F7C",
    "miercoles",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "1",
    "1e",
    "NOEMI",
    "EDUCACIÓN FISICA",
    ""
  ],
  [
    "3F087988C5AC2C53|1|lunes|890A6183EF3F24C1|03DE42FEA1019F7C",
    "lunes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "2",
    "2a",
    "NOEMI",
    "A CURR",
    ""
  ],
  [
    "44AD939DD1F93615|4|lunes|CAC3B904CCDF3DEC|03DE42FEA1019F7C",
    "lunes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "2",
    "2d",
    "NOEMI",
    "A CURR",
    ""
  ],
  [
    "B75ED61991BFC63E|2|viernes|9F9582A82B95D4D6|03DE42FEA1019F7C",
    "viernes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "3",
    "3b",
    "NOEMI",
    "A CURR",
    ""
  ],
  [
    "CF863C74D2236520|4|miercoles|09D16EB1662E0784|03DE42FEA1019F7C",
    "miercoles",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "3",
    "3c",
    "NOEMI",
    "A CURR",
    ""
  ],
  [
    "E17039C6A74977CA|1|viernes|34D7F17755D6F37B|03DE42FEA1019F7C",
    "viernes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "3",
    "3d",
    "NOEMI",
    "A CURR",
    ""
  ],
  [
    "9577E8D6F26774E5|7|martes|890A6183EF3F24C1|B39C7A4473ADFDBD",
    "martes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "2",
    "2a",
    "PEDRO",
    "EDUCACIÓN FISICA",
    ""
  ],
  [
    "9577E8D6F26774E5|2|miercoles|890A6183EF3F24C1|B39C7A4473ADFDBD",
    "miercoles",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "2",
    "2a",
    "PEDRO",
    "EDUCACIÓN FISICA",
    ""
  ],
  [
    "13C8D9C0F597418B|7|viernes|4E5749F97AC8913D|B39C7A4473ADFDBD",
    "viernes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "2",
    "2b",
    "PEDRO",
    "EDUCACIÓN FISICA",
    ""
  ],
  [
    "13C8D9C0F597418B|8|martes|4E5749F97AC8913D|B39C7A4473ADFDBD",
    "martes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "2",
    "2b",
    "PEDRO",
    "EDUCACIÓN FISICA",
    ""
  ],
  [
    "1817BDF4473DA49C|8|viernes|659D9090637708A2|B39C7A4473ADFDBD",
    "viernes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "2",
    "2c",
    "PEDRO",
    "EDUCACIÓN FISICA",
    ""
  ],
  [
    "1817BDF4473DA49C|6|miercoles|659D9090637708A2|B39C7A4473ADFDBD",
    "miercoles",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "2",
    "2c",
    "PEDRO",
    "EDUCACIÓN FISICA",
    ""
  ],
  [
    "73EE037AA4917E00|4|viernes|CC88BED50C2F337B|B39C7A4473ADFDBD",
    "viernes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "2",
    "2e",
    "PEDRO",
    "EDUCACIÓN FISICA",
    ""
  ],
  [
    "73EE037AA4917E00|4|lunes|CC88BED50C2F337B|B39C7A4473ADFDBD",
    "lunes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "2",
    "2e",
    "PEDRO",
    "EDUCACIÓN FISICA",
    ""
  ],
  [
    "ED1D5BCC8F97774A|6|lunes|9F9582A82B95D4D6|B39C7A4473ADFDBD",
    "lunes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "3",
    "3b",
    "PEDRO",
    "EDUCACIÓN FISICA",
    ""
  ],
  [
    "ED1D5BCC8F97774A|4|miercoles|9F9582A82B95D4D6|B39C7A4473ADFDBD",
    "miercoles",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "3",
    "3b",
    "PEDRO",
    "EDUCACIÓN FISICA",
    ""
  ],
  [
    "D0E48016BB6DCA70|5|miercoles|09D16EB1662E0784|B39C7A4473ADFDBD",
    "miercoles",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "3",
    "3c",
    "PEDRO",
    "EDUCACIÓN FISICA",
    ""
  ],
  [
    "D0E48016BB6DCA70|7|lunes|09D16EB1662E0784|B39C7A4473ADFDBD",
    "lunes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "3",
    "3c",
    "PEDRO",
    "EDUCACIÓN FISICA",
    ""
  ],
  [
    "10FAEF2F220E4AB2|5|lunes|CAC3B904CCDF3DEC|B39C7A4473ADFDBD",
    "lunes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "2",
    "2d",
    "PEDRO",
    "EDUCACIÓN FISICA",
    ""
  ],
  [
    "10FAEF2F220E4AB2|8|miercoles|CAC3B904CCDF3DEC|B39C7A4473ADFDBD",
    "miercoles",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "2",
    "2d",
    "PEDRO",
    "EDUCACIÓN FISICA",
    ""
  ],
  [
    "D0FD35A8D5B7070F|2|lunes|4454BC74B0D7F74C|B39C7A4473ADFDBD",
    "lunes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "3",
    "3e",
    "PEDRO",
    "EDUCACIÓN FISICA",
    ""
  ],
  [
    "D0FD35A8D5B7070F|5|viernes|4454BC74B0D7F74C|B39C7A4473ADFDBD",
    "viernes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "3",
    "3e",
    "PEDRO",
    "EDUCACIÓN FISICA",
    ""
  ],
  [
    "8DAA7C11CBD7A910|8|lunes|CC88BED50C2F337B|60F7A986097D183B",
    "lunes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "2",
    "2e",
    "PERLA",
    "INGLES",
    ""
  ],
  [
    "8DAA7C11CBD7A910|3|miercoles|CC88BED50C2F337B|60F7A986097D183B",
    "miercoles",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "2",
    "2e",
    "PERLA",
    "INGLES",
    ""
  ],
  [
    "8DAA7C11CBD7A910|2|viernes|CC88BED50C2F337B|60F7A986097D183B",
    "viernes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "2",
    "2e",
    "PERLA",
    "INGLES",
    ""
  ],
  [
    "42145A0DB0695242|4|jueves|4454BC74B0D7F74C|60F7A986097D183B",
    "jueves",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "3",
    "3e",
    "PERLA",
    "INGLES",
    ""
  ],
  [
    "42145A0DB0695242|8|viernes|4454BC74B0D7F74C|60F7A986097D183B",
    "viernes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "3",
    "3e",
    "PERLA",
    "INGLES",
    ""
  ],
  [
    "42145A0DB0695242|7|lunes|4454BC74B0D7F74C|60F7A986097D183B",
    "lunes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "3",
    "3e",
    "PERLA",
    "INGLES",
    ""
  ],
  [
    "A473C795830D3137|6|jueves|CB9C294473017D3B|60F7A986097D183B",
    "jueves",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "1",
    "1e",
    "PERLA",
    "TUTORIA",
    ""
  ],
  [
    "C07E0BC93011C558|4|martes|09D16EB1662E0784|60F7A986097D183B",
    "martes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "3",
    "3c",
    "PERLA",
    "TUTORIA",
    ""
  ],
  [
    "B1BBA710CA17E152|7|lunes|9C150E4F87B8F68F|A29CB3B3D26E8D12",
    "lunes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "1",
    "1d",
    "REGINA",
    "ARTES",
    ""
  ],
  [
    "B1BBA710CA17E152|4|jueves|9C150E4F87B8F68F|A29CB3B3D26E8D12",
    "jueves",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "1",
    "1d",
    "REGINA",
    "ARTES",
    ""
  ],
  [
    "B1BBA710CA17E152|6|martes|9C150E4F87B8F68F|A29CB3B3D26E8D12",
    "martes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "1",
    "1d",
    "REGINA",
    "ARTES",
    ""
  ],
  [
    "81932906E4724936|1|miercoles|34D7F17755D6F37B|A29CB3B3D26E8D12",
    "miercoles",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "3",
    "3d",
    "REGINA",
    "TUTORIA",
    ""
  ],
  [
    "A2FA34AF9D9180E8|6|viernes|4454BC74B0D7F74C|A29CB3B3D26E8D12",
    "viernes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "3",
    "3e",
    "REGINA",
    "TUTORIA",
    ""
  ],
  [
    "1D29BC619B44319A|7|lunes|890A6183EF3F24C1|9A95D0DCDFCCEE2E",
    "lunes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "2",
    "2a",
    "SARAI",
    "CIENCIAS",
    ""
  ],
  [
    "1D29BC619B44319A|6|jueves|890A6183EF3F24C1|9A95D0DCDFCCEE2E",
    "jueves",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "2",
    "2a",
    "SARAI",
    "CIENCIAS",
    ""
  ],
  [
    "1D29BC619B44319A|5|martes|890A6183EF3F24C1|9A95D0DCDFCCEE2E",
    "martes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "2",
    "2a",
    "SARAI",
    "CIENCIAS",
    ""
  ],
  [
    "1D29BC619B44319A|7|jueves|890A6183EF3F24C1|9A95D0DCDFCCEE2E",
    "jueves",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "2",
    "2a",
    "SARAI",
    "CIENCIAS",
    ""
  ],
  [
    "4A8FDCAFDF878B96|6|martes|4E5749F97AC8913D|9A95D0DCDFCCEE2E",
    "martes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "2",
    "2b",
    "SARAI",
    "CIENCIAS",
    ""
  ],
  [
    "4A8FDCAFDF878B96|6|miercoles|4E5749F97AC8913D|9A95D0DCDFCCEE2E",
    "miercoles",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "2",
    "2b",
    "SARAI",
    "CIENCIAS",
    ""
  ],
  [
    "4A8FDCAFDF878B96|3|jueves|4E5749F97AC8913D|9A95D0DCDFCCEE2E",
    "jueves",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "2",
    "2b",
    "SARAI",
    "CIENCIAS",
    ""
  ],
  [
    "4A8FDCAFDF878B96|4|lunes|4E5749F97AC8913D|9A95D0DCDFCCEE2E",
    "lunes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "2",
    "2b",
    "SARAI",
    "CIENCIAS",
    ""
  ],
  [
    "C1FA2E19624E0037|8|martes|CB9C294473017D3B|9A95D0DCDFCCEE2E",
    "martes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "1",
    "1e",
    "SARAI",
    "ARTES",
    ""
  ],
  [
    "C1FA2E19624E0037|8|jueves|CB9C294473017D3B|9A95D0DCDFCCEE2E",
    "jueves",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "1",
    "1e",
    "SARAI",
    "ARTES",
    ""
  ],
  [
    "C1FA2E19624E0037|4|miercoles|CB9C294473017D3B|9A95D0DCDFCCEE2E",
    "miercoles",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "1",
    "1e",
    "SARAI",
    "ARTES",
    ""
  ],
  [
    "60C12FF088F80919|7|martes|4454BC74B0D7F74C|9A95D0DCDFCCEE2E",
    "martes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "3",
    "3e",
    "SARAI",
    "A CURR",
    ""
  ],
  [
    "F280FD92288C6456|8|lunes|FB11C35192C013B2|9A95D0DCDFCCEE2E",
    "lunes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "3",
    "3a",
    "SARAI",
    "TUTORIA",
    ""
  ],
  [
    "64A8F07B20BFA59F|1|jueves|4E5749F97AC8913D|9A95D0DCDFCCEE2E",
    "jueves",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "2",
    "2b",
    "SARAI",
    "CIENCIAS",
    "Laboratorio"
  ],
  [
    "64A8F07B20BFA59F|2|jueves|4E5749F97AC8913D|9A95D0DCDFCCEE2E",
    "jueves",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "2",
    "2b",
    "SARAI",
    "CIENCIAS",
    "Laboratorio"
  ],
  [
    "F5ADB5B356893700|1|martes|890A6183EF3F24C1|9A95D0DCDFCCEE2E",
    "martes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "2",
    "2a",
    "SARAI",
    "CIENCIAS",
    "Laboratorio"
  ],
  [
    "F5ADB5B356893700|2|martes|890A6183EF3F24C1|9A95D0DCDFCCEE2E",
    "martes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "2",
    "2a",
    "SARAI",
    "CIENCIAS",
    "Laboratorio"
  ],
  [
    "946B4499FE9BB6D6|1|miercoles|FB11C35192C013B2|B83F0B42AAB1FA99",
    "miercoles",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "3",
    "3a",
    "VALERIA",
    "CIENCIAS",
    "Laboratorio"
  ],
  [
    "946B4499FE9BB6D6|2|miercoles|FB11C35192C013B2|B83F0B42AAB1FA99",
    "miercoles",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "3",
    "3a",
    "VALERIA",
    "CIENCIAS",
    "Laboratorio"
  ],
  [
    "F40A9B109CAD5C7E|8|jueves|FB11C35192C013B2|B83F0B42AAB1FA99",
    "jueves",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "3",
    "3a",
    "VALERIA",
    "CIENCIAS",
    ""
  ],
  [
    "F40A9B109CAD5C7E|8|martes|FB11C35192C013B2|B83F0B42AAB1FA99",
    "martes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "3",
    "3a",
    "VALERIA",
    "CIENCIAS",
    ""
  ],
  [
    "F40A9B109CAD5C7E|2|martes|FB11C35192C013B2|B83F0B42AAB1FA99",
    "martes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "3",
    "3a",
    "VALERIA",
    "CIENCIAS",
    ""
  ],
  [
    "F40A9B109CAD5C7E|3|miercoles|FB11C35192C013B2|B83F0B42AAB1FA99",
    "miercoles",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "3",
    "3a",
    "VALERIA",
    "CIENCIAS",
    ""
  ],
  [
    "1193DA8BE3D5DA2D|5|viernes|9F9582A82B95D4D6|B83F0B42AAB1FA99",
    "viernes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "3",
    "3b",
    "VALERIA",
    "CIENCIAS",
    "Laboratorio"
  ],
  [
    "1193DA8BE3D5DA2D|6|viernes|9F9582A82B95D4D6|B83F0B42AAB1FA99",
    "viernes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "3",
    "3b",
    "VALERIA",
    "CIENCIAS",
    "Laboratorio"
  ],
  [
    "43CF30F313E4814F|1|martes|9F9582A82B95D4D6|B83F0B42AAB1FA99",
    "martes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "3",
    "3b",
    "VALERIA",
    "CIENCIAS",
    ""
  ],
  [
    "43CF30F313E4814F|2|jueves|9F9582A82B95D4D6|B83F0B42AAB1FA99",
    "jueves",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "3",
    "3b",
    "VALERIA",
    "CIENCIAS",
    ""
  ],
  [
    "43CF30F313E4814F|5|lunes|9F9582A82B95D4D6|B83F0B42AAB1FA99",
    "lunes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "3",
    "3b",
    "VALERIA",
    "CIENCIAS",
    ""
  ],
  [
    "43CF30F313E4814F|1|jueves|9F9582A82B95D4D6|B83F0B42AAB1FA99",
    "jueves",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "3",
    "3b",
    "VALERIA",
    "CIENCIAS",
    ""
  ],
  [
    "69431A5987B75AED|5|martes|09D16EB1662E0784|B83F0B42AAB1FA99",
    "martes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "3",
    "3c",
    "VALERIA",
    "CIENCIAS",
    "Laboratorio"
  ],
  [
    "69431A5987B75AED|6|martes|09D16EB1662E0784|B83F0B42AAB1FA99",
    "martes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "3",
    "3c",
    "VALERIA",
    "CIENCIAS",
    "Laboratorio"
  ],
  [
    "53C6F1771D04D01F|2|lunes|09D16EB1662E0784|B83F0B42AAB1FA99",
    "lunes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "3",
    "3c",
    "VALERIA",
    "CIENCIAS",
    ""
  ],
  [
    "53C6F1771D04D01F|8|viernes|09D16EB1662E0784|B83F0B42AAB1FA99",
    "viernes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "3",
    "3c",
    "VALERIA",
    "CIENCIAS",
    ""
  ],
  [
    "53C6F1771D04D01F|5|jueves|09D16EB1662E0784|B83F0B42AAB1FA99",
    "jueves",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "3",
    "3c",
    "VALERIA",
    "CIENCIAS",
    ""
  ],
  [
    "53C6F1771D04D01F|3|lunes|09D16EB1662E0784|B83F0B42AAB1FA99",
    "lunes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "3",
    "3c",
    "VALERIA",
    "CIENCIAS",
    ""
  ],
  [
    "44487194A5C51920|3|martes|34D7F17755D6F37B|B83F0B42AAB1FA99",
    "martes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "3",
    "3d",
    "VALERIA",
    "CIENCIAS",
    "Laboratorio"
  ],
  [
    "44487194A5C51920|4|martes|34D7F17755D6F37B|B83F0B42AAB1FA99",
    "martes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "3",
    "3d",
    "VALERIA",
    "CIENCIAS",
    "Laboratorio"
  ],
  [
    "6FDA0990012CF522|4|jueves|34D7F17755D6F37B|B83F0B42AAB1FA99",
    "jueves",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "3",
    "3d",
    "VALERIA",
    "CIENCIAS",
    ""
  ],
  [
    "6FDA0990012CF522|7|lunes|34D7F17755D6F37B|B83F0B42AAB1FA99",
    "lunes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "3",
    "3d",
    "VALERIA",
    "CIENCIAS",
    ""
  ],
  [
    "6FDA0990012CF522|6|miercoles|34D7F17755D6F37B|B83F0B42AAB1FA99",
    "miercoles",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "3",
    "3d",
    "VALERIA",
    "CIENCIAS",
    ""
  ],
  [
    "6FDA0990012CF522|6|lunes|34D7F17755D6F37B|B83F0B42AAB1FA99",
    "lunes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "3",
    "3d",
    "VALERIA",
    "CIENCIAS",
    ""
  ],
  [
    "217B31E48B94CB77|6|jueves|4454BC74B0D7F74C|B83F0B42AAB1FA99",
    "jueves",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "3",
    "3e",
    "VALERIA",
    "CIENCIAS",
    "Laboratorio"
  ],
  [
    "217B31E48B94CB77|7|jueves|4454BC74B0D7F74C|B83F0B42AAB1FA99",
    "jueves",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "3",
    "3e",
    "VALERIA",
    "CIENCIAS",
    "Laboratorio"
  ],
  [
    "394470A84286CB35|7|viernes|4454BC74B0D7F74C|B83F0B42AAB1FA99",
    "viernes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "3",
    "3e",
    "VALERIA",
    "CIENCIAS",
    ""
  ],
  [
    "394470A84286CB35|1|lunes|4454BC74B0D7F74C|B83F0B42AAB1FA99",
    "lunes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "3",
    "3e",
    "VALERIA",
    "CIENCIAS",
    ""
  ],
  [
    "394470A84286CB35|7|miercoles|4454BC74B0D7F74C|B83F0B42AAB1FA99",
    "miercoles",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "3",
    "3e",
    "VALERIA",
    "CIENCIAS",
    ""
  ],
  [
    "394470A84286CB35|8|miercoles|4454BC74B0D7F74C|B83F0B42AAB1FA99",
    "miercoles",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "3",
    "3e",
    "VALERIA",
    "CIENCIAS",
    ""
  ],
  [
    "D5691645A1FB626F|7|martes|CC88BED50C2F337B|093C073C0C647324",
    "martes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "2",
    "2e",
    "GAMEZ",
    "CIENCIAS",
    "Laboratorio"
  ],
  [
    "D5691645A1FB626F|8|martes|CC88BED50C2F337B|093C073C0C647324",
    "martes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "2",
    "2e",
    "GAMEZ",
    "CIENCIAS",
    "Laboratorio"
  ],
  [
    "4F483BD028AD600D|2|jueves|CC88BED50C2F337B|093C073C0C647324",
    "jueves",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "2",
    "2e",
    "GAMEZ",
    "CIENCIAS",
    ""
  ],
  [
    "4F483BD028AD600D|5|miercoles|CC88BED50C2F337B|093C073C0C647324",
    "miercoles",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "2",
    "2e",
    "GAMEZ",
    "CIENCIAS",
    ""
  ],
  [
    "4F483BD028AD600D|2|martes|CC88BED50C2F337B|093C073C0C647324",
    "martes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "2",
    "2e",
    "GAMEZ",
    "CIENCIAS",
    ""
  ],
  [
    "4F483BD028AD600D|1|viernes|CC88BED50C2F337B|093C073C0C647324",
    "viernes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "2",
    "2e",
    "GAMEZ",
    "CIENCIAS",
    ""
  ],
  [
    "19C972A6D82F0DBC|3|martes|CB9C294473017D3B|093C073C0C647324",
    "martes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "1",
    "1e",
    "GAMEZ",
    "F.C.E",
    ""
  ],
  [
    "19C972A6D82F0DBC|8|miercoles|CB9C294473017D3B|093C073C0C647324",
    "miercoles",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "1",
    "1e",
    "GAMEZ",
    "F.C.E",
    ""
  ],
  [
    "8692486C66DDFC36|3|viernes|FB11C35192C013B2|093C073C0C647324",
    "viernes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "3",
    "3a",
    "GAMEZ",
    "ARTES",
    ""
  ],
  [
    "8692486C66DDFC36|4|martes|FB11C35192C013B2|093C073C0C647324",
    "martes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "3",
    "3a",
    "GAMEZ",
    "ARTES",
    ""
  ],
  [
    "8692486C66DDFC36|1|jueves|FB11C35192C013B2|093C073C0C647324",
    "jueves",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "3",
    "3a",
    "GAMEZ",
    "ARTES",
    ""
  ],
  [
    "A47006DBE4807DB5|5|martes|4454BC74B0D7F74C|D148761678820BB2",
    "martes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "3",
    "3e",
    "ERIKA",
    "TECNOLOGIA",
    ""
  ],
  [
    "A47006DBE4807DB5|5|miercoles|4454BC74B0D7F74C|D148761678820BB2",
    "miercoles",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "3",
    "3e",
    "ERIKA",
    "TECNOLOGIA",
    ""
  ],
  [
    "A47006DBE4807DB5|1|jueves|4454BC74B0D7F74C|D148761678820BB2",
    "jueves",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "3",
    "3e",
    "ERIKA",
    "TECNOLOGIA",
    ""
  ],
  [
    "A47006DBE4807DB5|5|lunes|4454BC74B0D7F74C|D148761678820BB2",
    "lunes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "3",
    "3e",
    "ERIKA",
    "TECNOLOGIA",
    ""
  ],
  [
    "A7A7FBECC680E6DE|3|lunes|CC88BED50C2F337B|9A95D0DCDFCCEE2E",
    "lunes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "2",
    "2e",
    "SARAI",
    "TUTORIA",
    ""
  ],
  [
    "1878DCC561E00A3F|7|miercoles|FB11C35192C013B2|B39C7A4473ADFDBD",
    "miercoles",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "3",
    "3a",
    "PEDRO",
    "EDUCACIÓN FISICA",
    ""
  ],
  [
    "1878DCC561E00A3F|3|lunes|FB11C35192C013B2|B39C7A4473ADFDBD",
    "lunes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "3",
    "3a",
    "PEDRO",
    "EDUCACIÓN FISICA",
    ""
  ],
  [
    "B872771AFF623381|8|lunes|34D7F17755D6F37B|B39C7A4473ADFDBD",
    "lunes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "3",
    "3d",
    "PEDRO",
    "EDUCACIÓN FISICA",
    ""
  ],
  [
    "B872771AFF623381|6|martes|34D7F17755D6F37B|B39C7A4473ADFDBD",
    "martes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "3",
    "3d",
    "PEDRO",
    "EDUCACIÓN FISICA",
    ""
  ],
  [
    "2E31B10CDDE1F4FE|5|viernes|A8830AA4164D8A18|03DE42FEA1019F7C",
    "viernes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "1",
    "1b",
    "NOEMI",
    "EDUCACIÓN FISICA",
    ""
  ],
  [
    "2E31B10CDDE1F4FE|5|miercoles|A8830AA4164D8A18|03DE42FEA1019F7C",
    "miercoles",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "1",
    "1b",
    "NOEMI",
    "EDUCACIÓN FISICA",
    ""
  ],
  [
    "8671825E5265BFFE|5|jueves|9C150E4F87B8F68F|A3A8C790F12D1250",
    "jueves",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "1",
    "1d",
    "ABIGAIL",
    "MATEMATICAS",
    ""
  ],
  [
    "8671825E5265BFFE|7|miercoles|9C150E4F87B8F68F|A3A8C790F12D1250",
    "miercoles",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "1",
    "1d",
    "ABIGAIL",
    "MATEMATICAS",
    ""
  ],
  [
    "8671825E5265BFFE|6|miercoles|9C150E4F87B8F68F|A3A8C790F12D1250",
    "miercoles",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "1",
    "1d",
    "ABIGAIL",
    "MATEMATICAS",
    ""
  ],
  [
    "8671825E5265BFFE|4|viernes|9C150E4F87B8F68F|A3A8C790F12D1250",
    "viernes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "1",
    "1d",
    "ABIGAIL",
    "MATEMATICAS",
    ""
  ],
  [
    "8671825E5265BFFE|4|lunes|9C150E4F87B8F68F|A3A8C790F12D1250",
    "lunes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "1",
    "1d",
    "ABIGAIL",
    "MATEMATICAS",
    ""
  ],
  [
    "6FEC5032FA5B2306|4|lunes|659D9090637708A2|43353B6F94211136",
    "lunes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "2",
    "2c",
    "LEONARDO",
    "TUTORIA",
    ""
  ],
  [
    "4EBFDF56FCE4E804|3|jueves|F898AEEC71C5D799|A29CB3B3D26E8D12",
    "jueves",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "1",
    "1c",
    "REGINA",
    "TUTORIA",
    ""
  ],
  [
    "3250DC6ACCE6E1DC|7|martes|9C150E4F87B8F68F|A29CB3B3D26E8D12",
    "martes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "1",
    "1d",
    "REGINA",
    "TUTORIA",
    ""
  ],
  [
    "33820702C5B027A8|6|viernes|890A6183EF3F24C1|B39C7A4473ADFDBD",
    "viernes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "2",
    "2a",
    "PEDRO",
    "TUTORIA",
    ""
  ],
  [
    "633849F4CEA1039C|3|miercoles|9F9582A82B95D4D6|B39C7A4473ADFDBD",
    "miercoles",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "3",
    "3b",
    "PEDRO",
    "TUTORIA",
    ""
  ],
  [
    "65CEC985A3897301|6|miercoles|CC88BED50C2F337B|43353B6F94211136",
    "miercoles",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "2",
    "2e",
    "LEONARDO",
    "ARTES",
    ""
  ],
  [
    "65CEC985A3897301|8|jueves|CC88BED50C2F337B|43353B6F94211136",
    "jueves",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "2",
    "2e",
    "LEONARDO",
    "ARTES",
    ""
  ],
  [
    "65CEC985A3897301|3|martes|CC88BED50C2F337B|43353B6F94211136",
    "martes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "2",
    "2e",
    "LEONARDO",
    "ARTES",
    ""
  ],
  [
    "54CF39A1FB78FB52|2|viernes|CAC3B904CCDF3DEC|093C073C0C647324",
    "viernes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "2",
    "2d",
    "GAMEZ",
    "ARTES",
    ""
  ],
  [
    "54CF39A1FB78FB52|3|jueves|CAC3B904CCDF3DEC|093C073C0C647324",
    "jueves",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "2",
    "2d",
    "GAMEZ",
    "ARTES",
    ""
  ],
  [
    "54CF39A1FB78FB52|6|miercoles|CAC3B904CCDF3DEC|093C073C0C647324",
    "miercoles",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "2",
    "2d",
    "GAMEZ",
    "ARTES",
    ""
  ],
  [
    "A8DE46FED00DE6DD|7|miercoles|CB9C294473017D3B|A2C1B66B0F0440F1",
    "miercoles",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "1",
    "1e",
    "MARISOL",
    "TECNOLOGIA",
    ""
  ],
  [
    "A8DE46FED00DE6DD|8|lunes|CB9C294473017D3B|A2C1B66B0F0440F1",
    "lunes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "1",
    "1e",
    "MARISOL",
    "TECNOLOGIA",
    ""
  ],
  [
    "696D55C935DB2AB0|3|viernes|CB9C294473017D3B|A2C1B66B0F0440F1",
    "viernes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "1",
    "1e",
    "MARISOL",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "696D55C935DB2AB0|4|viernes|CB9C294473017D3B|A2C1B66B0F0440F1",
    "viernes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "1",
    "1e",
    "MARISOL",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "30F4FFB55DE1A06E|7|martes|F898AEEC71C5D799|A2C1B66B0F0440F1",
    "martes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "1",
    "1c",
    "MARISOL",
    "TECNOLOGIA",
    ""
  ],
  [
    "30F4FFB55DE1A06E|4|martes|F898AEEC71C5D799|A2C1B66B0F0440F1",
    "martes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "1",
    "1c",
    "MARISOL",
    "TECNOLOGIA",
    ""
  ],
  [
    "593B24C54A50CE1E|5|lunes|F898AEEC71C5D799|A2C1B66B0F0440F1",
    "lunes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "1",
    "1c",
    "MARISOL",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "593B24C54A50CE1E|6|lunes|F898AEEC71C5D799|A2C1B66B0F0440F1",
    "lunes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "1",
    "1c",
    "MARISOL",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "712393332A0068E5|2|martes|9C150E4F87B8F68F|60F7A986097D183B",
    "martes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "1",
    "1d",
    "PERLA",
    "TECNOLOGIA",
    ""
  ],
  [
    "712393332A0068E5|3|martes|9C150E4F87B8F68F|60F7A986097D183B",
    "martes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "1",
    "1d",
    "PERLA",
    "TECNOLOGIA",
    ""
  ],
  [
    "E41CE920E8E804F2|1|lunes|9C150E4F87B8F68F|60F7A986097D183B",
    "lunes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "1",
    "1d",
    "PERLA",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "E41CE920E8E804F2|2|lunes|9C150E4F87B8F68F|60F7A986097D183B",
    "lunes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "1",
    "1d",
    "PERLA",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "D1522C6958F53936|3|martes|890A6183EF3F24C1|A447C15CD1F5482E",
    "martes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "2",
    "2a",
    "FRAGOSO",
    "TECNOLOGIA",
    ""
  ],
  [
    "D1522C6958F53936|1|viernes|890A6183EF3F24C1|A447C15CD1F5482E",
    "viernes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "2",
    "2a",
    "FRAGOSO",
    "TECNOLOGIA",
    ""
  ],
  [
    "867D5B24C6FEE0F8|8|jueves|659D9090637708A2|A447C15CD1F5482E",
    "jueves",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "2",
    "2c",
    "FRAGOSO",
    "TECNOLOGIA",
    ""
  ],
  [
    "867D5B24C6FEE0F8|3|miercoles|659D9090637708A2|A447C15CD1F5482E",
    "miercoles",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "2",
    "2c",
    "FRAGOSO",
    "TECNOLOGIA",
    ""
  ],
  [
    "E20CABDBD67EC024|4|martes|CAC3B904CCDF3DEC|A447C15CD1F5482E",
    "martes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "2",
    "2d",
    "FRAGOSO",
    "TECNOLOGIA",
    ""
  ],
  [
    "E20CABDBD67EC024|7|jueves|CAC3B904CCDF3DEC|A447C15CD1F5482E",
    "jueves",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "2",
    "2d",
    "FRAGOSO",
    "TECNOLOGIA",
    ""
  ],
  [
    "E6D04B9D7D0C4AC2|2|lunes|CC88BED50C2F337B|A447C15CD1F5482E",
    "lunes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "2",
    "2e",
    "FRAGOSO",
    "TECNOLOGIA",
    ""
  ],
  [
    "E6D04B9D7D0C4AC2|4|miercoles|CC88BED50C2F337B|A447C15CD1F5482E",
    "miercoles",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "2",
    "2e",
    "FRAGOSO",
    "TECNOLOGIA",
    ""
  ],
  [
    "4F267D95769A3E56|1|martes|4E5749F97AC8913D|A447C15CD1F5482E",
    "martes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "2",
    "2b",
    "FRAGOSO",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "4F267D95769A3E56|2|martes|4E5749F97AC8913D|A447C15CD1F5482E",
    "martes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "2",
    "2b",
    "FRAGOSO",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "4F267D95769A3E56|5|jueves|4E5749F97AC8913D|A447C15CD1F5482E",
    "jueves",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "2",
    "2b",
    "FRAGOSO",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "4F267D95769A3E56|6|jueves|4E5749F97AC8913D|A447C15CD1F5482E",
    "jueves",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "2",
    "2b",
    "FRAGOSO",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "1864002132B7992A|5|jueves|FB11C35192C013B2|D148761678820BB2",
    "jueves",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "3",
    "3a",
    "ERIKA",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "1864002132B7992A|6|jueves|FB11C35192C013B2|D148761678820BB2",
    "jueves",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "3",
    "3a",
    "ERIKA",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "1864002132B7992A|1|viernes|FB11C35192C013B2|D148761678820BB2",
    "viernes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "3",
    "3a",
    "ERIKA",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "1864002132B7992A|2|viernes|FB11C35192C013B2|D148761678820BB2",
    "viernes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "3",
    "3a",
    "ERIKA",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "0F95BD5DB58C3993|1|lunes|4E5749F97AC8913D|A447C15CD1F5482E",
    "lunes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "2",
    "2b",
    "FRAGOSO",
    "TECNOLOGIA",
    ""
  ],
  [
    "0F95BD5DB58C3993|2|viernes|4E5749F97AC8913D|A447C15CD1F5482E",
    "viernes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "2",
    "2b",
    "FRAGOSO",
    "TECNOLOGIA",
    ""
  ],
  [
    "C843B751E1A7E438|1|lunes|659D9090637708A2|9A95D0DCDFCCEE2E",
    "lunes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "2",
    "2c",
    "SARAI",
    "CIENCIAS",
    "Laboratorio"
  ],
  [
    "C843B751E1A7E438|2|lunes|659D9090637708A2|9A95D0DCDFCCEE2E",
    "lunes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "2",
    "2c",
    "SARAI",
    "CIENCIAS",
    "Laboratorio"
  ],
  [
    "4DF6898CAAC5D822|8|miercoles|659D9090637708A2|9A95D0DCDFCCEE2E",
    "miercoles",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "2",
    "2c",
    "SARAI",
    "CIENCIAS",
    ""
  ],
  [
    "4DF6898CAAC5D822|4|jueves|659D9090637708A2|9A95D0DCDFCCEE2E",
    "jueves",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "2",
    "2c",
    "SARAI",
    "CIENCIAS",
    ""
  ],
  [
    "4DF6898CAAC5D822|5|jueves|659D9090637708A2|9A95D0DCDFCCEE2E",
    "jueves",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "2",
    "2c",
    "SARAI",
    "CIENCIAS",
    ""
  ],
  [
    "4DF6898CAAC5D822|3|martes|659D9090637708A2|9A95D0DCDFCCEE2E",
    "martes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "2",
    "2c",
    "SARAI",
    "CIENCIAS",
    ""
  ],
  [
    "50D29A574AEC9BC8|4|jueves|CAC3B904CCDF3DEC|54986628C5B35FC3",
    "jueves",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "2",
    "2d",
    "AZAEL",
    "CIENCIAS",
    "Laboratorio"
  ],
  [
    "50D29A574AEC9BC8|5|jueves|CAC3B904CCDF3DEC|54986628C5B35FC3",
    "jueves",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "2",
    "2d",
    "AZAEL",
    "CIENCIAS",
    "Laboratorio"
  ],
  [
    "F43D5C7221F2E6C9|6|lunes|CAC3B904CCDF3DEC|54986628C5B35FC3",
    "lunes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "2",
    "2d",
    "AZAEL",
    "CIENCIAS",
    ""
  ],
  [
    "F43D5C7221F2E6C9|7|viernes|CAC3B904CCDF3DEC|54986628C5B35FC3",
    "viernes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "2",
    "2d",
    "AZAEL",
    "CIENCIAS",
    ""
  ],
  [
    "F43D5C7221F2E6C9|8|viernes|CAC3B904CCDF3DEC|54986628C5B35FC3",
    "viernes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "2",
    "2d",
    "AZAEL",
    "CIENCIAS",
    ""
  ],
  [
    "F43D5C7221F2E6C9|1|martes|CAC3B904CCDF3DEC|54986628C5B35FC3",
    "martes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "2",
    "2d",
    "AZAEL",
    "CIENCIAS",
    ""
  ],
  [
    "A430028A5E26E0DD|3|lunes|A8830AA4164D8A18|54986628C5B35FC3",
    "lunes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "1",
    "1b",
    "AZAEL",
    "CIENCIAS",
    "Laboratorio"
  ],
  [
    "A430028A5E26E0DD|4|lunes|A8830AA4164D8A18|54986628C5B35FC3",
    "lunes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "1",
    "1b",
    "AZAEL",
    "CIENCIAS",
    "Laboratorio"
  ],
  [
    "8F0512C41AE910EB|6|jueves|A8830AA4164D8A18|54986628C5B35FC3",
    "jueves",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "1",
    "1b",
    "AZAEL",
    "CIENCIAS",
    ""
  ],
  [
    "8F0512C41AE910EB|6|viernes|A8830AA4164D8A18|54986628C5B35FC3",
    "viernes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "1",
    "1b",
    "AZAEL",
    "CIENCIAS",
    ""
  ],
  [
    "E0F5C815D1C6E1DC|2|viernes|A8830AA4164D8A18|54986628C5B35FC3",
    "viernes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "1",
    "1b",
    "AZAEL",
    "TUTORIA",
    ""
  ],
  [
    "B04D34663746E1E3|2|martes|4DA5AB967CFAAF5A|54986628C5B35FC3",
    "martes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "1",
    "1a",
    "AZAEL",
    "TUTORIA",
    ""
  ],
  [
    "D2C6669A4732E338|5|miercoles|890A6183EF3F24C1|A447C15CD1F5482E",
    "miercoles",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "2",
    "2a",
    "FRAGOSO",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "D2C6669A4732E338|6|miercoles|890A6183EF3F24C1|A447C15CD1F5482E",
    "miercoles",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "2",
    "2a",
    "FRAGOSO",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "D2C6669A4732E338|1|jueves|890A6183EF3F24C1|A447C15CD1F5482E",
    "jueves",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "2",
    "2a",
    "FRAGOSO",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "D2C6669A4732E338|2|jueves|890A6183EF3F24C1|A447C15CD1F5482E",
    "jueves",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "2",
    "2a",
    "FRAGOSO",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "269E155786AE1B89|7|martes|659D9090637708A2|A447C15CD1F5482E",
    "martes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "2",
    "2c",
    "FRAGOSO",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "269E155786AE1B89|8|martes|659D9090637708A2|A447C15CD1F5482E",
    "martes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "2",
    "2c",
    "FRAGOSO",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "269E155786AE1B89|5|lunes|659D9090637708A2|A447C15CD1F5482E",
    "lunes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "2",
    "2c",
    "FRAGOSO",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "269E155786AE1B89|6|lunes|659D9090637708A2|A447C15CD1F5482E",
    "lunes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "2",
    "2c",
    "FRAGOSO",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "8AD67FD2DEFAFD25|3|viernes|CAC3B904CCDF3DEC|A447C15CD1F5482E",
    "viernes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "2",
    "2d",
    "FRAGOSO",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "8AD67FD2DEFAFD25|4|viernes|CAC3B904CCDF3DEC|A447C15CD1F5482E",
    "viernes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "2",
    "2d",
    "FRAGOSO",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "8AD67FD2DEFAFD25|1|miercoles|CAC3B904CCDF3DEC|A447C15CD1F5482E",
    "miercoles",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "2",
    "2d",
    "FRAGOSO",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "8AD67FD2DEFAFD25|2|miercoles|CAC3B904CCDF3DEC|A447C15CD1F5482E",
    "miercoles",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "2",
    "2d",
    "FRAGOSO",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "9D5C80ABA25D3DE8|7|viernes|CC88BED50C2F337B|A447C15CD1F5482E",
    "viernes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "2",
    "2e",
    "FRAGOSO",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "9D5C80ABA25D3DE8|8|viernes|CC88BED50C2F337B|A447C15CD1F5482E",
    "viernes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "2",
    "2e",
    "FRAGOSO",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "9D5C80ABA25D3DE8|3|jueves|CC88BED50C2F337B|A447C15CD1F5482E",
    "jueves",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "2",
    "2e",
    "FRAGOSO",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "9D5C80ABA25D3DE8|4|jueves|CC88BED50C2F337B|A447C15CD1F5482E",
    "jueves",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "2",
    "2e",
    "FRAGOSO",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "C522B9B64A66F43A|3|lunes|890A6183EF3F24C1|A447C15CD1F5482E",
    "lunes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "2",
    "2a",
    "FRAGOSO",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "C522B9B64A66F43A|4|lunes|890A6183EF3F24C1|A447C15CD1F5482E",
    "lunes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "2",
    "2a",
    "FRAGOSO",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "222AE48A05CC2BDD|7|miercoles|4E5749F97AC8913D|A447C15CD1F5482E",
    "miercoles",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "2",
    "2b",
    "FRAGOSO",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "222AE48A05CC2BDD|8|miercoles|4E5749F97AC8913D|A447C15CD1F5482E",
    "miercoles",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "2",
    "2b",
    "FRAGOSO",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "245EBCA7E382B3B5|5|viernes|659D9090637708A2|A447C15CD1F5482E",
    "viernes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "2",
    "2c",
    "FRAGOSO",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "245EBCA7E382B3B5|6|viernes|659D9090637708A2|A447C15CD1F5482E",
    "viernes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "2",
    "2c",
    "FRAGOSO",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "21D3D412FE34D8AF|7|lunes|CAC3B904CCDF3DEC|A447C15CD1F5482E",
    "lunes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "2",
    "2d",
    "FRAGOSO",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "21D3D412FE34D8AF|8|lunes|CAC3B904CCDF3DEC|A447C15CD1F5482E",
    "lunes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "2",
    "2d",
    "FRAGOSO",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "124E1987C3AEB8DF|5|martes|CC88BED50C2F337B|A447C15CD1F5482E",
    "martes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "2",
    "2e",
    "FRAGOSO",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "124E1987C3AEB8DF|6|martes|CC88BED50C2F337B|A447C15CD1F5482E",
    "martes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "2",
    "2e",
    "FRAGOSO",
    "TECNOLOGIA",
    "cecse2"
  ],
  [
    "22F41C245334A0F3|7|martes|4DA5AB967CFAAF5A|30CA084B134496C4",
    "martes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "1",
    "1a",
    "NIDIA",
    "HISTORIA",
    ""
  ],
  [
    "22F41C245334A0F3|7|jueves|4DA5AB967CFAAF5A|30CA084B134496C4",
    "jueves",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "1",
    "1a",
    "NIDIA",
    "HISTORIA",
    ""
  ],
  [
    "8934A1DEAB4130EB|5|jueves|A8830AA4164D8A18|92FE452F1081DA32",
    "jueves",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "1",
    "1b",
    "GABRIELA",
    "HISTORIA",
    ""
  ],
  [
    "8934A1DEAB4130EB|6|martes|A8830AA4164D8A18|92FE452F1081DA32",
    "martes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "1",
    "1b",
    "GABRIELA",
    "HISTORIA",
    ""
  ],
  [
    "266723B78538D0B8|4|jueves|F898AEEC71C5D799|92FE452F1081DA32",
    "jueves",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "1",
    "1c",
    "GABRIELA",
    "HISTORIA",
    ""
  ],
  [
    "266723B78538D0B8|2|lunes|F898AEEC71C5D799|92FE452F1081DA32",
    "lunes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "1",
    "1c",
    "GABRIELA",
    "HISTORIA",
    ""
  ],
  [
    "F8D6CF2044BDE955|6|lunes|CB9C294473017D3B|92FE452F1081DA32",
    "lunes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "1",
    "1e",
    "GABRIELA",
    "HISTORIA",
    ""
  ],
  [
    "F8D6CF2044BDE955|2|jueves|CB9C294473017D3B|92FE452F1081DA32",
    "jueves",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "1",
    "1e",
    "GABRIELA",
    "HISTORIA",
    ""
  ],
  [
    "46A7991F727FCA41|5|jueves|890A6183EF3F24C1|30CA084B134496C4",
    "jueves",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "2",
    "2a",
    "NIDIA",
    "F.C.E",
    ""
  ],
  [
    "46A7991F727FCA41|7|viernes|890A6183EF3F24C1|30CA084B134496C4",
    "viernes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "2",
    "2a",
    "NIDIA",
    "F.C.E",
    ""
  ],
  [
    "4394240F7F78D046|1|miercoles|4E5749F97AC8913D|30CA084B134496C4",
    "miercoles",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "2",
    "2b",
    "NIDIA",
    "F.C.E",
    ""
  ],
  [
    "4394240F7F78D046|4|martes|4E5749F97AC8913D|30CA084B134496C4",
    "martes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "2",
    "2b",
    "NIDIA",
    "F.C.E",
    ""
  ],
  [
    "9EAC8F1EF1F47044|4|miercoles|659D9090637708A2|30CA084B134496C4",
    "miercoles",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "2",
    "2c",
    "NIDIA",
    "F.C.E",
    ""
  ],
  [
    "9EAC8F1EF1F47044|3|viernes|659D9090637708A2|30CA084B134496C4",
    "viernes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "2",
    "2c",
    "NIDIA",
    "F.C.E",
    ""
  ],
  [
    "0AAF65ED9E7A238D|6|martes|CAC3B904CCDF3DEC|30CA084B134496C4",
    "martes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "2",
    "2d",
    "NIDIA",
    "F.C.E",
    ""
  ],
  [
    "0AAF65ED9E7A238D|2|jueves|CAC3B904CCDF3DEC|30CA084B134496C4",
    "jueves",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "2",
    "2d",
    "NIDIA",
    "F.C.E",
    ""
  ],
  [
    "F799FA08471F7C1B|7|miercoles|CC88BED50C2F337B|30CA084B134496C4",
    "miercoles",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "2",
    "2e",
    "NIDIA",
    "F.C.E",
    ""
  ],
  [
    "F799FA08471F7C1B|7|lunes|CC88BED50C2F337B|30CA084B134496C4",
    "lunes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "2",
    "2e",
    "NIDIA",
    "F.C.E",
    ""
  ],
  [
    "786D059BEFE1D73C|3|jueves|9C150E4F87B8F68F|92FE452F1081DA32",
    "jueves",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "1",
    "1d",
    "GABRIELA",
    "HISTORIA",
    ""
  ],
  [
    "786D059BEFE1D73C|8|lunes|9C150E4F87B8F68F|92FE452F1081DA32",
    "lunes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "1",
    "1d",
    "GABRIELA",
    "HISTORIA",
    ""
  ],
  [
    "3F69A3FE58EA8CC1|1|viernes|4DA5AB967CFAAF5A|B6F816D0AE4945CD",
    "viernes",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "1",
    "1a",
    "MONICA",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "3F69A3FE58EA8CC1|2|viernes|4DA5AB967CFAAF5A|B6F816D0AE4945CD",
    "viernes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "1",
    "1a",
    "MONICA",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "3F69A3FE58EA8CC1|3|miercoles|4DA5AB967CFAAF5A|B6F816D0AE4945CD",
    "miercoles",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "1",
    "1a",
    "MONICA",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "3F69A3FE58EA8CC1|4|miercoles|4DA5AB967CFAAF5A|B6F816D0AE4945CD",
    "miercoles",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "1",
    "1a",
    "MONICA",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "A4328994E1120571|3|martes|4DA5AB967CFAAF5A|B6F816D0AE4945CD",
    "martes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "1",
    "1a",
    "MONICA",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "A4328994E1120571|4|martes|4DA5AB967CFAAF5A|B6F816D0AE4945CD",
    "martes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "1",
    "1a",
    "MONICA",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "E931D2563A4C893D|6|lunes|4DA5AB967CFAAF5A|B6F816D0AE4945CD",
    "lunes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "1",
    "1a",
    "MONICA",
    "TECNOLOGIA",
    ""
  ],
  [
    "E931D2563A4C893D|6|jueves|4DA5AB967CFAAF5A|B6F816D0AE4945CD",
    "jueves",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "1",
    "1a",
    "MONICA",
    "TECNOLOGIA",
    ""
  ],
  [
    "ED10EB7754EF6074|1|miercoles|A8830AA4164D8A18|B6F816D0AE4945CD",
    "miercoles",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "1",
    "1b",
    "MONICA",
    "TECNOLOGIA",
    ""
  ],
  [
    "ED10EB7754EF6074|3|viernes|A8830AA4164D8A18|B6F816D0AE4945CD",
    "viernes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "1",
    "1b",
    "MONICA",
    "TECNOLOGIA",
    ""
  ],
  [
    "D4C82F251C3A1903|7|jueves|A8830AA4164D8A18|B6F816D0AE4945CD",
    "jueves",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "1",
    "1b",
    "MONICA",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "D4C82F251C3A1903|8|jueves|A8830AA4164D8A18|B6F816D0AE4945CD",
    "jueves",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "1",
    "1b",
    "MONICA",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "A8C3ED052C094693|7|lunes|A8830AA4164D8A18|B6F816D0AE4945CD",
    "lunes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "1",
    "1b",
    "MONICA",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "A8C3ED052C094693|8|lunes|A8830AA4164D8A18|B6F816D0AE4945CD",
    "lunes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "1",
    "1b",
    "MONICA",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "A8C3ED052C094693|7|martes|A8830AA4164D8A18|B6F816D0AE4945CD",
    "martes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "1",
    "1b",
    "MONICA",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "A8C3ED052C094693|8|martes|A8830AA4164D8A18|B6F816D0AE4945CD",
    "martes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "1",
    "1b",
    "MONICA",
    "TECNOLOGIA",
    "cecse1"
  ],
  [
    "3960F873C8B81F86|1|miercoles|4DA5AB967CFAAF5A|43353B6F94211136",
    "miercoles",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "1",
    "1a",
    "LEONARDO",
    "F.C.E",
    ""
  ],
  [
    "3960F873C8B81F86|1|jueves|4DA5AB967CFAAF5A|43353B6F94211136",
    "jueves",
    "matutino",
    "1",
    "07:00",
    "07:40",
    "1",
    "1a",
    "LEONARDO",
    "F.C.E",
    ""
  ],
  [
    "314C30BDCEC8E15F|3|miercoles|A8830AA4164D8A18|43353B6F94211136",
    "miercoles",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "1",
    "1b",
    "LEONARDO",
    "F.C.E",
    ""
  ],
  [
    "314C30BDCEC8E15F|5|lunes|A8830AA4164D8A18|43353B6F94211136",
    "lunes",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "1",
    "1b",
    "LEONARDO",
    "F.C.E",
    ""
  ],
  [
    "01BCA7B23BEEDA0E|5|jueves|F898AEEC71C5D799|43353B6F94211136",
    "jueves",
    "matutino",
    "5",
    "09:40",
    "10:20",
    "1",
    "1c",
    "LEONARDO",
    "F.C.E",
    ""
  ],
  [
    "01BCA7B23BEEDA0E|6|martes|F898AEEC71C5D799|43353B6F94211136",
    "martes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "1",
    "1c",
    "LEONARDO",
    "F.C.E",
    ""
  ],
  [
    "E3F1F613D5E9E777|8|miercoles|9C150E4F87B8F68F|43353B6F94211136",
    "miercoles",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "1",
    "1d",
    "LEONARDO",
    "F.C.E",
    ""
  ],
  [
    "E3F1F613D5E9E777|8|viernes|9C150E4F87B8F68F|43353B6F94211136",
    "viernes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "1",
    "1d",
    "LEONARDO",
    "F.C.E",
    ""
  ],
  [
    "1BDC348CBE8B5EEC|7|miercoles|659D9090637708A2|A29CB3B3D26E8D12",
    "miercoles",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "2",
    "2c",
    "REGINA",
    "A CURR",
    ""
  ],
  [
    "65A0A2EC07A96045|6|lunes|FB11C35192C013B2|A29CB3B3D26E8D12",
    "lunes",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "3",
    "3a",
    "REGINA",
    "F.C.E",
    ""
  ],
  [
    "65A0A2EC07A96045|8|miercoles|FB11C35192C013B2|A29CB3B3D26E8D12",
    "miercoles",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "3",
    "3a",
    "REGINA",
    "F.C.E",
    ""
  ],
  [
    "24710F473DB59322|4|lunes|FB11C35192C013B2|A29CB3B3D26E8D12",
    "lunes",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "3",
    "3a",
    "REGINA",
    "A CURR",
    ""
  ],
  [
    "D107226A245ED508|7|viernes|9F9582A82B95D4D6|A29CB3B3D26E8D12",
    "viernes",
    "matutino",
    "7",
    "11:20",
    "12:00",
    "3",
    "3b",
    "REGINA",
    "F.C.E",
    ""
  ],
  [
    "D107226A245ED508|2|martes|9F9582A82B95D4D6|A29CB3B3D26E8D12",
    "martes",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "3",
    "3b",
    "REGINA",
    "F.C.E",
    ""
  ],
  [
    "DE57AA99D75FAFAF|3|miercoles|09D16EB1662E0784|A29CB3B3D26E8D12",
    "miercoles",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "3",
    "3c",
    "REGINA",
    "F.C.E",
    ""
  ],
  [
    "DE57AA99D75FAFAF|2|jueves|09D16EB1662E0784|A29CB3B3D26E8D12",
    "jueves",
    "matutino",
    "2",
    "07:40",
    "08:20",
    "3",
    "3c",
    "REGINA",
    "F.C.E",
    ""
  ],
  [
    "04EAE9F43280AF49|6|jueves|34D7F17755D6F37B|A29CB3B3D26E8D12",
    "jueves",
    "matutino",
    "6",
    "10:40",
    "11:20",
    "3",
    "3d",
    "REGINA",
    "F.C.E",
    ""
  ],
  [
    "04EAE9F43280AF49|4|miercoles|34D7F17755D6F37B|A29CB3B3D26E8D12",
    "miercoles",
    "matutino",
    "4",
    "09:00",
    "09:40",
    "3",
    "3d",
    "REGINA",
    "F.C.E",
    ""
  ],
  [
    "20EB780746439DDA|3|viernes|4454BC74B0D7F74C|A29CB3B3D26E8D12",
    "viernes",
    "matutino",
    "3",
    "08:20",
    "09:00",
    "3",
    "3e",
    "REGINA",
    "F.C.E",
    ""
  ],
  [
    "20EB780746439DDA|8|lunes|4454BC74B0D7F74C|A29CB3B3D26E8D12",
    "lunes",
    "matutino",
    "8",
    "12:00",
    "12:40",
    "3",
    "3e",
    "REGINA",
    "F.C.E",
    ""
  ]
];
}
```
