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

  const todasHoras = filasHorarioUso_();

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
      hora: f["Hora"] || f["hora"] || f["Hora inicio"] || "",
      bloque: String(f["Bloque"] || f["bloque"] || ""),
      horaInicio: String(f["Hora inicio"] || ""),
      horaFin: String(f["Hora fin"] || ""),
      grado: gr,
      grupo: gp,
      asignatura: asig,
      maestro: f["Maestro"] || f["maestro"] || "",
      salon: String(f["Salon"] || f["Salón"] || ""),
      turno: turnoDe_(f["Turno"] || f["turno"])
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
  const idFila = String(filaPlan["Id"] || filaPlan["id"] || filaPlan["ID"] || "").trim();
  if (idFila.indexOf("PLN-DEMO-") === 0) return true;
  const dueno = normalizarNombrePref_(filaPlan["DocentePropietario"] || filaPlan["docentepropietario"] || filaPlan["Docente"] || filaPlan["docente"] || "");
  if (!dueno || dueno === "administrador" || dueno === "docente st90" || dueno === "docente" || dueno.indexOf("admin") >= 0) return true;
  const yo = normalizarNombrePref_((ses && (ses.maestroNombre || ses.nombre)) || "");
  if (yo && (dueno === yo || dueno.indexOf(yo) >= 0 || yo.indexOf(dueno) >= 0)) return true;
  throw new Error("No tienes autorización para modificar la planeación de otro docente.");
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
    const ejes = p["EjesArticuladores"] || p["ejesarticuladores"] || "";
    const prop = p["Proposito"] || p["proposito"] || "";
    const prob = p["ProblemaComunidad"] || p["problemacomunidad"] || "";
    const prod = p["ProductoFinal"] || p["productofinal"] || "";
    const ajus = p["AjustesRazonables"] || p["ajustesrazonables"] || "";
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
      ejesArticuladores: ejes,
      EjesArticuladores: ejes,
      proposito: prop,
      Proposito: prop,
      problemaComunidad: prob,
      ProblemaComunidad: prob,
      productoFinal: prod,
      ProductoFinal: prod,
      ajustesRazonables: ajus,
      AjustesRazonables: ajus,
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
  let ses = null;
  try {
    ses = exigirClaseRol_(token, ["admin", "maestro"]);
  } catch (eRol) {
    const sVal = (typeof obtenerSesionValida_ === "function") ? obtenerSesionValida_(token) : null;
    if (sVal && (sVal.rol === "admin" || sVal.rol === "maestro" || sVal.rol === "docente")) {
      ses = sVal;
      if (ses.rol === "docente") ses.rol = "maestro";
    } else {
      throw eRol;
    }
  }
  const idPlan = String(idPlaneacion || "").trim();
  if (!idPlan) throw new Error("ID de planeación no especificado.");

  const libro = _obtenerLibro_();
  _obtenerHojaRobusta_(libro, "PlaneacionesNEM");
  _obtenerHojaRobusta_(libro, "SesionesNEM");

  const pFila = _leerFilas_("PlaneacionesNEM").filter(function (f) {
    return String(f["Id"] || f["id"] || f["ID"] || "").trim() === idPlan;
  })[0];
  if (!pFila) throw new Error("Planeación no encontrada.");
  exigirLecturaPlaneacion_(ses, pFila);

  let sesionesFilas = _leerFilas_("SesionesNEM").filter(function (s) {
    return String(s["IdPlaneacion"] || s["idplaneacion"] || s["IDPLANEACION"] || "").trim() === idPlan;
  });

  if (!sesionesFilas.length) {
    try {
      const nSesInit = Number(pFila["NumSesiones"] || pFila["numsesiones"] || 3);
      const titInit = String(pFila["Titulo"] || pFila["titulo"] || "Proyecto Didáctico");
      desglosarSesionesInicialesNEM_(libro, idPlan, nSesInit, titInit);
      sesionesFilas = _leerFilas_("SesionesNEM").filter(function (s) {
        return String(s["IdPlaneacion"] || s["idplaneacion"] || s["IDPLANEACION"] || "").trim() === idPlan;
      });
    } catch (eAutoSes) {}
  }

  function _fmtFechaStr_(v) {
    if (!v) return "";
    if (v instanceof Date) {
      try {
        return Utilities.formatDate(v, "America/Mexico_City", "yyyy-MM-dd");
      } catch (eFmt) {
        return v.toISOString ? v.toISOString().slice(0, 10) : String(v);
      }
    }
    return String(v);
  }

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
    const idHor = String(s["IdHorario"] || s["idhorario"] || "");
    const fecProg = _fmtFechaStr_(s["FechaProgramada"] || s["fechaprogramada"]);

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
  const pPeriodo = String(pFila["Periodo"] || pFila["periodo"] || "");
  const pFechaInicio = _fmtFechaStr_(pFila["FechaInicio"] || pFila["fechainicio"]);
  const pIdHorario = String(pFila["IdHorario"] || pFila["idhorario"] || "");
  const pFechaCreacion = _fmtFechaStr_(pFila["FechaCreacion"] || pFila["fechacreacion"]);
  const pFechaAprobacion = _fmtFechaStr_(pFila["FechaAprobacion"] || pFila["fechaaprobacion"]);
  const pAjustes = String(pFila["AjustesRazonables"] || pFila["ajustesrazonables"] || "");

  return JSON.parse(JSON.stringify({
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
      ajustesRazonables: pAjustes,
      AjustesRazonables: pAjustes,
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
  }));
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

  // Adecuación curricular obligatoria para Tecnología (CECSE - Aula de Cómputo)
  if (asignatura.toLowerCase().indexOf("tecnolog") !== -1) {
    let enfoqueGrado = "";
    if (grado === "1") {
      enfoqueGrado = "1er Grado: Enfocar el proyecto al uso de procesadores de texto (Word) y ofimática básica.";
    } else if (grado === "2") {
      enfoqueGrado = "2do Grado: Enfocar el proyecto al uso de hojas de cálculo (Excel) y análisis de datos.";
    } else {
      enfoqueGrado = "3er Grado: Enfocar el proyecto a presentaciones digitales (PowerPoint) e introducción práctica a herramientas de Inteligencia Artificial (IA). En el producto final y justificación DEBES mencionar explícitamente 'PowerPoint', 'IA' y el 'CECSE'.";
    }
    instruccion += "\n\nDIRECTIVA PEDAGÓGICA Y CURRICULAR OBLIGATORIA PARA TECNOLOGÍA (CECSE - AULA DE CÓMPUTO):\n" +
      "- Esta asignatura se imparte con una distribución horaria estricta de 2 horas de Teoría en aula y 6 horas de Práctica en el CECSE (Aula de Cómputo).\n" +
      "- Enfoque formativo por grado:\n  " + enfoqueGrado + "\n" +
      "- El problema comunitario, el propósito formativo y el producto final deben reflejar la aplicación práctica y situada en el CECSE.";
  }

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

/**
 * Consulta interactiva con el Asistente IA (DeepSeek) desde el Drawer flotante en tiempo real.
 * Asesora al docente según la sección activa del formulario y reglas pedagógicas NEM / CECSE.
 */
function consultarAsistenteIAPaso(token, contextoSeccion, preguntaDocente) {
  const ses = exigirClaseRol_(token, ["admin", "maestro"]);
  const clave = typeof obtenerClaveDeepSeek_ === "function" ? obtenerClaveDeepSeek_() : "";
  if (!clave) {
    return {
      ok: false,
      sinClave: true,
      error: "No hay clave de DeepSeek configurada en el sistema. Solicita al administrador registrarla en Configuración."
    };
  }

  const pregunta = String(preguntaDocente || "").trim();
  if (!pregunta) {
    return { ok: false, error: "La pregunta no puede estar vacía." };
  }

  // Parsear contexto (puede venir como JSON enriquecido o como string plano)
  let datosCtx = {
    asignatura: "",
    grado: "1",
    grupo: "A",
    campoFormativo: "",
    metodologia: "",
    tituloProyecto: "",
    pasoNombre: "Metadatos y ejes"
  };

  const rawCtx = String(contextoSeccion || "").trim();
  try {
    if (rawCtx.startsWith("{") && rawCtx.endsWith("}")) {
      const obj = JSON.parse(rawCtx);
      datosCtx = Object.assign(datosCtx, obj);
    } else {
      datosCtx.pasoNombre = rawCtx || "Planeación NEM";
      // Intentar extraer asignatura si viene en formato "Geografía 1° · Metadatos"
      const matchAsig = rawCtx.match(/^([A-Za-zÁÉÍÓÚáéíóúñÑ\s]+)\s+([123])°/);
      if (matchAsig) {
        datosCtx.asignatura = matchAsig[1].trim();
        datosCtx.grado = matchAsig[2].trim();
      }
    }
  } catch (err) {
    datosCtx.pasoNombre = rawCtx || "Planeación NEM";
  }

  const asignatura = String(datosCtx.asignatura || "").trim();
  const grado = String(datosCtx.grado || "1").trim();
  const campo = String(datosCtx.campoFormativo || "").trim();
  const metodologia = String(datosCtx.metodologia || "").trim();
  const paso = String(datosCtx.pasoNombre || "Diseño General").trim();
  const escuelaNom = typeof NOMBRE_ESCUELA !== "undefined" ? NOMBRE_ESCUELA : "Secundaria Técnica 90";

  // Determinar Trimestre y Fecha según Calendario Oficial SEP
  let trimestre = Number(datosCtx.trimestre) || 1;
  let periodo = String(datosCtx.periodo || "").trim();
  const fecha = String(datosCtx.fecha || "").trim();

  if (!periodo && fecha) {
    let mes = 0;
    if (/^\d{4}-\d{2}-\d{2}/.test(fecha)) {
      mes = parseInt(fecha.substring(5, 7), 10);
    } else {
      const d = new Date(fecha.indexOf('T') === -1 ? (fecha + 'T12:00:00') : fecha);
      if (!isNaN(d.getTime())) mes = d.getMonth() + 1;
    }
    if (mes >= 8 && mes <= 11) {
      trimestre = 1;
      periodo = "Trimestre 1 (Ago - Nov)";
    } else if (mes === 12 || (mes >= 1 && mes <= 3)) {
      trimestre = 2;
      periodo = "Trimestre 2 (Dic - Mar)";
    } else if (mes >= 4 && mes <= 7) {
      trimestre = 3;
      periodo = "Trimestre 3 (Abr - Jul)";
    }
  } else if (periodo && !datosCtx.trimestre) {
    const m = periodo.match(/([123])/);
    if (m) trimestre = parseInt(m[1], 10);
  }
  if (!periodo) {
    periodo = "Trimestre " + trimestre;
  }

  // Directiva de Planes y Programas SEP por Trimestre (Fase 6 Secundaria):
  const directivaSEP =
    "ALINEACIÓN ESTRICTA A PLANES Y PROGRAMAS DE ESTUDIO OFICIALES SEP (FASE 6 SECUNDARIA):\n" +
    "- Temporalidad en Calendario Escolar: " + periodo + (fecha ? " (Fecha de inicio: " + fecha + ")" : "") + ".\n" +
    "- REQUISITO CURRICULAR: Todas las propuestas didácticas, proyectos comunitarios, contenidos sintéticos y PDA deben pertenecer RIGUROSAMENTE al programa de estudio oficial de la SEP para el TRIMESTRE " + trimestre + " de " + (asignatura || "la materia") + " en " + grado + "° de secundaria.\n" +
    "- PROHIBIDO proponer contenidos o PDA correspondientes a otros trimestres o grados escolares distintos a " + grado + "°.\n" +
    "- Articula la propuesta con problemáticas de la comunidad escolar, los 7 Ejes Articuladores y el enfoque socio-crítico de la Nueva Escuela Mexicana.";

  // Directiva disciplinar estricta:
  let directivaDisciplina = "";
  if (/tecnolog/i.test(asignatura)) {
    directivaDisciplina = "ASIGNATURA: TECNOLOGÍA (" + grado + "° de secundaria). Vinculada al aula de cómputo (CECSE).\n" +
      "- Distribución horaria: 2 horas de teoría en aula + 6 horas de práctica en el CECSE.\n" +
      "- Enfoque de software por grado: 1° Word/Ofimática básica, 2° Excel/Análisis de datos, 3° PowerPoint/IA aplicada.";
  } else {
    directivaDisciplina = "ASIGNATURA: " + (asignatura ? asignatura.toUpperCase() : "GENERAL DE SECUNDARIA") +
      " (" + grado + "° de secundaria)" + (campo ? " · Campo Formativo: " + campo : "") +
      (metodologia ? " · Metodología: " + metodologia : "") + ".\n" +
      "- TODAS tus sugerencias, ejemplos y proyectos deben pertenecer ESTRICTAMENTE al programa de " + (asignatura || "esta disciplina") + " de la Nueva Escuela Mexicana (Fase 6).\n" +
      "- PROHIBIDO sugerir contenidos de Tecnología, procesadores de texto, hojas de cálculo, PowerPoint ni horas de CECSE para esta clase, a menos que el docente lo pida expresamente.";
  }

  const promptSistema = "Te llamas Lucy y eres la Asesora Pedagógica Inteligente de la Suite Escolar ST90 para la " + escuelaNom + " (Fase 6 de la Nueva Escuela Mexicana - SEP).\n" +
    "Tu misión es asesorar y acompañar al docente de secundaria en tiempo real con calidez, empatía y rigor curricular según el trimestre activo del calendario escolar y la clase seleccionada.\n\n" +
    "DATOS DE LA CLASE ACTIVA DEL DOCENTE:\n" +
    "- Asignatura: " + (asignatura || "No especificada") + "\n" +
    "- Grado y Grupo: " + grado + "° \"" + (datosCtx.grupo || "A") + "\"\n" +
    "- Trimestre y Calendario Escolar: " + periodo + (fecha ? " · Fecha: " + fecha : "") + "\n" +
    (campo ? "- Campo Formativo: " + campo + "\n" : "") +
    (metodologia ? "- Metodología: " + metodologia + "\n" : "") +
    (datosCtx.contenidoSintetico ? "- Contenido Sintético SEP: " + datosCtx.contenidoSintetico + "\n" : "") +
    (datosCtx.pda ? "- PDA Seleccionado: " + datosCtx.pda + "\n" : "") +
    (datosCtx.problema ? "- Problema Comunitario: " + datosCtx.problema + "\n" : "") +
    (datosCtx.tituloProyecto ? "- Título del Proyecto: " + datosCtx.tituloProyecto + "\n" : "") +
    "- Sección o Paso actual: " + paso + "\n\n" +
    "DIRECTIVAS PEDAGÓGICAS Y DISCIPLINARES:\n" +
    directivaSEP + "\n" +
    directivaDisciplina + "\n" +
    "- Proporciona sugerencias prácticas, concretas, adaptadas al grado (" + grado + "°) y al Trimestre " + trimestre + ", con enfoque DUA e inclusivo.\n" +
    "- Responde de manera cálida, concisa (máximo 120 palabras) y estructurada con viñetas claras.";

  try {
    const r = UrlFetchApp.fetch(URL_BASE_DEEPSEEK, {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + clave },
      payload: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: promptSistema },
          { role: "user", content: pregunta }
        ],
        temperature: 0.4,
        max_tokens: 350
      }),
      muteHttpExceptions: true
    });

    const code = r.getResponseCode();
    if (code !== 200) {
      const errTxt = r.getContentText();
      return { ok: false, error: "Error de la API de DeepSeek (" + code + "): " + errTxt.slice(0, 150) };
    }

    const json = JSON.parse(r.getContentText());
    const respuesta = json.choices && json.choices[0] && json.choices[0].message ? json.choices[0].message.content : "";
    return {
      ok: true,
      respuesta: String(respuesta).trim(),
      contexto: paso
    };
  } catch (e) {
    return { ok: false, error: "Excepción al consultar asistente IA: " + e.message };
  }
}

/* ============================================================
   MEMBRETE INSTITUCIONAL CONFIGURABLE (OLA 1 · build-568)
   ============================================================ */

/**
 * Obtiene la configuración global del membrete institucional para documentos oficiales.
 * Si algún campo no está personalizado, el cliente usa los escudos y textos oficiales de Nuevo León.
 */
function obtenerMembreteInstitucionalNEM() {
  try {
    const props = PropertiesService.getScriptProperties();
    return {
      ok: true,
      membrete: {
        logoIzq: props.getProperty("ST90_CFG_LOGO_IZQ") || "",
        logoDer: props.getProperty("ST90_CFG_LOGO_DER") || "",
        linea1: props.getProperty("ST90_CFG_ENC_L1") || "SECRETARÍA DE EDUCACIÓN DEL ESTADO DE NUEVO LEÓN",
        linea2: props.getProperty("ST90_CFG_ENC_L2") || "SUBSECRETARÍA DE EDUCACIÓN BÁSICA · DIRECCIÓN DE EDUCACIÓN SECUNDARIA",
        linea3: props.getProperty("ST90_CFG_ENC_L3") || "ESCUELA SECUNDARIA TÉCNICA N° 90 \"MIGUEL ÁNGEL GRANADOS CHAPA\""
      }
    };
  } catch (e) {
    return {
      ok: true,
      membrete: {
        logoIzq: "",
        logoDer: "",
        linea1: "SECRETARÍA DE EDUCACIÓN DEL ESTADO DE NUEVO LEÓN",
        linea2: "SUBSECRETARÍA DE EDUCACIÓN BÁSICA · DIRECCIÓN DE EDUCACIÓN SECUNDARIA",
        linea3: "ESCUELA SECUNDARIA TÉCNICA N° 90 \"MIGUEL ÁNGEL GRANADOS CHAPA\""
      }
    };
  }
}

/**
 * Guarda la configuración del membrete institucional (logos y encabezados).
 */
function guardarMembreteInstitucionalNEM(token, payload) {
  try {
    exigirClaseRol_(token, ["admin", "maestro"]);
  } catch (eRol) {
    const sVal = (typeof obtenerSesionValida_ === "function") ? obtenerSesionValida_(token) : null;
    if (!sVal || (sVal.rol !== "admin" && sVal.rol !== "maestro" && sVal.rol !== "docente")) {
      throw eRol;
    }
  }
  const p = payload || {};
  const props = PropertiesService.getScriptProperties();
  props.setProperties({
    "ST90_CFG_LOGO_IZQ": String(p.logoIzq || "").trim(),
    "ST90_CFG_LOGO_DER": String(p.logoDer || "").trim(),
    "ST90_CFG_ENC_L1": String(p.linea1 || "SECRETARÍA DE EDUCACIÓN DEL ESTADO DE NUEVO LEÓN").trim(),
    "ST90_CFG_ENC_L2": String(p.linea2 || "SUBSECRETARÍA DE EDUCACIÓN BÁSICA · DIRECCIÓN DE EDUCACIÓN SECUNDARIA").trim(),
    "ST90_CFG_ENC_L3": String(p.linea3 || "ESCUELA SECUNDARIA TÉCNICA N° 90 \"MIGUEL ÁNGEL GRANADOS CHAPA\"").trim()
  }, false);
  return obtenerMembreteInstitucionalNEM();
}



