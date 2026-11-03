/**********************************************************************
 * ASISTENCIA ST90 (módulo aparte de Academia)
 * Alumnos: una toma al iniciar el turno (matrícula + fecha + turno).
 * Docentes: una toma por cambio de hora.
 * Prefecto: solo grupos asignados; admin ve todos.
 **********************************************************************/

var ESTADOS_ALUMNO_ASI = [
  { id: "P", nombre: "Presente" },
  { id: "T", nombre: "Tarde" },
  { id: "A", nombre: "Ausente" },
  { id: "J", nombre: "Justificado" },
  { id: "PE", nombre: "Permiso" }
];

var ESTADOS_MAESTRO_ASI = [
  { id: "presente", nombre: "Presente" },
  { id: "retardo", nombre: "Retardo" },
  { id: "falta", nombre: "Falta" }
];

function sesionAsistencia_(token) {
  let ses = obtenerSesionValida_(token);
  if (!ses) {
    // La vista de Clase emite su propio token (clase_<token>); se acepta aquí
    // para que el docente pueda pasar lista desde su módulo de asistencia.
    try { ses = sesionClase_(token); } catch (eClase) { ses = null; }
  }
  if (!ses) {
    throw new Error("Sesión inválida o expirada");
  }
  const rol = String(ses.rol || "").toLowerCase();
  if (rol === "admin") {
    return ses;
  }
  if (rol === "prefecto" || rol === "apoyo" || rol === "maestro" || rol === "docente") {
    return ses;
  }
  throw new Error("Acceso denegado: rol sin permisos de asistencia (" + rol + ")");
}

function normalizarNombrePref_(s) {
  return String(s || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function slugUsuarioPref_(nombre) {
  const n = normalizarNombrePref_(nombre);
  const primero = (n.split(/\s+/)[0] || n).replace(/[^a-z0-9]/g, "");
  return primero;
}

function usuarioPrefLibre_(deseado, ignorarId) {
  let base = slugUsuarioPref_(deseado);
  if (!base || esUsuarioAdminAsistencia_(base)) base = "prefecta";
  const filas = _leerFilas_("Prefectos");
  const usados = {};
  filas.forEach(function (f) {
    if (ignorarId && String(f["Id"] || "").trim() === String(ignorarId)) return;
    const u = normalizarNombrePref_(f["Usuario"] || "");
    if (u) usados[u] = true;
  });
  let u = base;
  let n = 2;
  while (usados[u] || esUsuarioAdminAsistencia_(u)) {
    u = base + n;
    n++;
  }
  return u;
}

function asegurarColumnaUsuarioPrefectos_() {
  const libro = _obtenerLibro_();
  if (!libro) return;
  const p = libro.getSheetByName("Prefectos");
  if (!p) return;
  const lastCol = Math.max(p.getLastColumn(), 1);
  const enc = p.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
    return String(h || "").trim();
  });
  let colUsuario = -1;
  for (let i = 0; i < enc.length; i++) {
    if (normalizarNombrePref_(enc[i]) === "usuario") {
      colUsuario = i;
      break;
    }
  }
  if (colUsuario < 0) {
    p.insertColumnAfter(2);
    p.getRange(1, 3).setValue("Usuario").setFontWeight("bold");
    SpreadsheetApp.flush();
  }
  const filas = _leerFilas_("Prefectos");
  const usados = {};
  filas.forEach(function (f) {
    const u = normalizarNombrePref_(f["Usuario"] || "");
    if (u) usados[u] = true;
  });
  filas.forEach(function (f) {
    if (String(f["Usuario"] || "").trim()) return;
    let base = slugUsuarioPref_(f["Nombre"]);
    if (!base || esUsuarioAdminAsistencia_(base)) base = "prefecta";
    let u = base;
    let n = 2;
    while (usados[u] || esUsuarioAdminAsistencia_(u)) {
      u = base + n;
      n++;
    }
    usados[u] = true;
    const encAhora = p.getRange(1, 1, 1, Math.max(p.getLastColumn(), 1)).getValues()[0];
    let col = 3;
    for (let c = 0; c < encAhora.length; c++) {
      if (normalizarNombrePref_(encAhora[c]) === "usuario") {
        col = c + 1;
        break;
      }
    }
    p.getRange(Number(f._fila), col).setValue(u);
  });
  SpreadsheetApp.flush();
}

function coincideUsuarioPref_(fila, nom) {
  if (!nom) return false;
  const usuarioF = normalizarNombrePref_(fila["Usuario"] || "");
  const nombreF = normalizarNombrePref_(fila["Nombre"] || "");
  const primero = nombreF.split(/\s+/)[0] || "";
  return usuarioF === nom || nombreF === nom || (primero && primero === nom);
}

function buscarPrefectoLogin_(clave, nombre) {
  asegurarColumnaUsuarioPrefectos_();
  const filas = _leerFilas_("Prefectos");
  const nom = normalizarNombrePref_(nombre);
  if (!nom || !String(clave || "").trim()) return null;
  const candidatos = [];
  filas.forEach(function (f) {
    const activo = String(f["Activo"] || "SI").trim().toUpperCase();
    if (activo === "NO") return;
    if (!coincideUsuarioPref_(f, nom)) return;
    candidatos.push(f);
  });
  if (!candidatos.length) return null;
  if (candidatos.length > 1) {
    const exactoUsuario = candidatos.filter(function (f) {
      return normalizarNombrePref_(f["Usuario"] || "") === nom;
    });
    if (exactoUsuario.length === 1) {
      candidatos.length = 0;
      candidatos.push(exactoUsuario[0]);
    } else {
      const exactoNombre = candidatos.filter(function (f) {
        return normalizarNombrePref_(f["Nombre"] || "") === nom;
      });
      if (exactoNombre.length === 1) {
        candidatos.length = 0;
        candidatos.push(exactoNombre[0]);
      } else {
        return {
          varios: true,
          nombres: candidatos.map(function (f) {
            return String(f["Usuario"] || f["Nombre"] || "").trim();
          })
        };
      }
    }
  }
  const f = candidatos[0];
  const salt = String(f["Salt"] || "");
  const hash = String(f["Hash"] || "");
  if (!salt || !hash || hashClave(clave, salt) !== hash) return null;
  return {
    id: String(f["Id"] || "").trim(),
    nombre: String(f["Nombre"] || "").trim(),
    usuario: String(f["Usuario"] || "").trim()
  };
}

function claveGrupoAsi_(grado, grupo) {
  const gr = String(grado || "").trim();
  let gp = String(grupo || "").trim().toLowerCase();
  if (gr && gp.indexOf(gr) === 0) {
    gp = gp.slice(gr.length);
  }
  gp = gp.replace(/^[-°º\s]+/, "");
  return gr + "|" + gp;
}

function turnoDe_(v) {
  const t = String(v || "").trim().toLowerCase();
  if (t.indexOf("vesp") === 0) return "vespertino";
  return "matutino";
}

function fechaHoyAsi_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "America/Mexico_City", "yyyy-MM-dd");
}

function horaAhoraAsi_() {
  return Utilities.formatDate(new Date(), "America/Mexico_City", "HH:mm");
}

function exigirGrupoDelPrefecto_(sesion, grado, grupo) {
  if (sesion.rol === "admin") return;
  const k = claveGrupoAsi_(grado, grupo);
  let asignados = [];
  if (sesion.rol === "prefecto") {
    asignados = asignacionesPrefecto_(sesion.prefectoId);
  } else if (sesion.rol === "apoyo") {
    asignados = asignacionesApoyo_(sesion.apoyoId);
  } else if (sesion.rol === "maestro" || sesion.rol === "docente") {
    // Un docente solo pasa lista de los grupos que tiene en su horario.
    const nom = normalizarNombrePref_(sesion.maestroNombre || sesion.nombre || "");
    const imparte = _leerFilas_("Horarios").some(function (h) {
      if (normalizarNombrePref_(h["Maestro"] || "") !== nom) return false;
      const hg = String(h["Grado"] || "").trim();
      const hgp = normalizarGrupoLetra_(hg, String(h["Grupo"] || "").trim().toLowerCase());
      return claveGrupoAsi_(hg, hgp) === k;
    });
    if (imparte) return;
    throw new Error("Ese grupo no está en tu horario.");
  }
  for (let i = 0; i < asignados.length; i++) {
    if (claveGrupoAsi_(asignados[i].grado, asignados[i].grupo) === k) return;
  }
  throw new Error("Ese grupo no está asignado a tu usuario.");
}

function asignacionesPrefecto_(prefectoId) {
  const id = String(prefectoId || "").trim();
  if (!id) return [];
  return _leerFilas_("PrefectoGrupos").filter(function (f) {
    return String(f["Id prefecto"] || "").trim() === id;
  }).map(function (f) {
    return {
      grado: String(f["Grado"] || "").trim(),
      grupo: String(f["Grupo"] || "").trim().toLowerCase(),
      turno: turnoDe_(f["Turno"])
    };
  });
}

function asignacionesApoyo_(apoyoId) {
  const id = String(apoyoId || "").trim();
  if (!id) return [];
  try {
    return _leerFilas_("ApoyoGrupos").filter(function (f) {
      const idFila = String(f["Id apoyo"] || f["Id personal"] || "").trim();
      return idFila && idFila === id;
    }).map(function (f) {
      return {
        grado: String(f["Grado"] || "").trim(),
        grupo: String(f["Grupo"] || "").trim().toLowerCase(),
        turno: turnoDe_(f["Turno"])
      };
    });
  } catch (e) {
    return [];
  }
}

function gruposVisiblesAsistencia_(sesion) {
  const todos = leerGruposHoja_().filter(function (g) {
    return String(g.activo || "SI").toUpperCase() !== "NO";
  });
  if (sesion.rol === "admin") {
    return todos.map(function (g) {
      return {
        grado: String(g.grado || ""),
        grupo: String(g.grupo || ""),
        turno: turnoDe_(g.turno)
      };
    });
  }
  let asig = [];
  if (sesion.rol === "prefecto") {
    asig = asignacionesPrefecto_(sesion.prefectoId);
  } else if (sesion.rol === "apoyo") {
    asig = asignacionesApoyo_(sesion.apoyoId);
  }
  const mapaAsig = {};
  asig.forEach(function (a) { mapaAsig[claveGrupoAsi_(a.grado, a.grupo)] = a; });
  return todos.filter(function (g) {
    return mapaAsig[claveGrupoAsi_(g.grado, g.grupo)];
  }).map(function (g) {
    const extra = mapaAsig[claveGrupoAsi_(g.grado, g.grupo)];
    return {
      grado: String(g.grado || ""),
      grupo: String(g.grupo || ""),
      turno: extra && extra.turno ? extra.turno : turnoDe_(g.turno)
    };
  });
}

function formatearHoraAsi_(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return Utilities.formatDate(valor, Session.getScriptTimeZone() || "America/Mexico_City", "H:mm");
  }
  const s = String(valor || "").trim();
  if (!s) return "";
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (m) return String(Number(m[1])) + ":" + m[2];
  return "";
}

function horaAMinutos_(hhmm) {
  const f = formatearHoraAsi_(hhmm);
  const p = String(f || "").split(":");
  const h = Number(p[0] || 0);
  const m = Number(p[1] || 0);
  if (!isFinite(h) || !isFinite(m)) return 0;
  return h * 60 + m;
}

function fechaCortaAsi_(v) {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, Session.getScriptTimeZone() || "America/Mexico_City", "yyyy-MM-dd");
  }
  const s = String(v || "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s.slice(0, 10);
}

function asegurarColumnaObservacionAsi_(libroOpt) {
  const libro = libroOpt || _obtenerLibro_();
  if (!libro) {
    throw new Error("No se pudo obtener el libro de cálculo para asegurar columnas de observación de asistencia.");
  }
  const props = PropertiesService.getScriptProperties();
  const entorno = String(props.getProperty("ENTORNO") || "").trim().toUpperCase();
  const idLibro = typeof libro.getId === "function" ? String(libro.getId() || "").trim() : "";
  const ID_PRODUCCION = "1ZxCuV_6O3JcX9E-7y165Q6ofAZRERk9-xj5rYeUhaYU";
  if (entorno === "PRUEBAS" && idLibro === ID_PRODUCCION) {
    const msg = "BLOQUEO DE SEGURIDAD: intento de modificar libro de producción en entorno de PRUEBAS en asegurarColumnaObservacionAsi_. Operación detenida.";
    Logger.log(msg);
    throw new Error(msg);
  }
  ["AsistenciaAlumnos", "AsistenciaMaestros"].forEach(function (nombre) {
    const p = libro.getSheetByName(nombre);
    if (!p) return;
    const lastCol = Math.max(p.getLastColumn(), 1);
    const enc = p.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h || "").trim(); });
    if (enc.indexOf("Observación") >= 0) return;
    p.getRange(1, enc.length + 1).setValue("Observación").setFontWeight("bold");
  });
}

function bloquesDesdeHorarios_(grupos, fecha) {
  const clavesGrupo = {};
  grupos.forEach(function (g) { clavesGrupo[claveGrupoAsi_(g.grado, g.grupo)] = g; });
  const d = new Date(String(fecha || fechaHoyAsi_()) + "T12:00:00");
  const dias = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  const dia = dias[d.getDay()];
  const filas = _leerFilas_("Horarios");
  const mapaBloque = {};
  const mapaMaestros = {};
  filas.forEach(function (f) {
    const grado = String(f["Grado"] || "").trim();
    const grupo = String(f["Grupo"] || "").trim().toLowerCase();
    if (!clavesGrupo[claveGrupoAsi_(grado, grupo)]) return;
    const diaFila = String(f["Dia"] || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (diaFila && diaFila !== dia && diaFila !== "todos") return;
    const m = String(f["Maestro"] || "").trim();
    if (m) mapaMaestros[m] = true;
    const bloque = String(f["Bloque"] || "").trim();
    if (!bloque) return;
    if (!mapaBloque[bloque]) {
      mapaBloque[bloque] = {
        bloque: bloque,
        horaInicio: formatearHoraAsi_(f["Hora inicio"]),
        horaFin: formatearHoraAsi_(f["Hora fin"]),
        turno: turnoDe_(f["Turno"])
      };
    }
  });
  const lista = Object.keys(mapaBloque).map(function (k) { return mapaBloque[k]; });
  lista.sort(function (a, b) {
    return horaAMinutos_(a.horaInicio) - horaAMinutos_(b.horaInicio);
  });
  const ahora = horaAMinutos_(horaAhoraAsi_());
  let bloqueActual = "";
  let siguiente = "";
  for (let i = 0; i < lista.length; i++) {
    const ini = horaAMinutos_(lista[i].horaInicio);
    let fin = horaAMinutos_(lista[i].horaFin);
    if (!fin || fin <= ini) fin = ini + 40;
    if (ahora >= ini && ahora < fin) {
      bloqueActual = lista[i].bloque;
      break;
    }
    if (!siguiente && ahora < ini) siguiente = lista[i].bloque;
  }
  if (!bloqueActual) bloqueActual = siguiente || (lista.length ? lista[lista.length - 1].bloque : "");
  return { bloques: lista, bloqueActual: bloqueActual, maestros: Object.keys(mapaMaestros).sort() };
}

function asistenciaContexto(token, fecha) {
  const sesion = sesionAsistencia_(token);
  const fechaUso = String(fecha || fechaHoyAsi_()).slice(0, 10);
  const grupos = gruposVisiblesAsistencia_(sesion);
  const mapaGruposVisibles = {};
  grupos.forEach(function (g) {
    mapaGruposVisibles[claveGrupoAsi_(g.grado, g.grupo)] = true;
  });

  const todosAlumnos = _leerAlumnosResumen_() || [];
  const alumnosAutorizados = todosAlumnos.filter(function (a) {
    if (String(a.activo || "SI").toUpperCase() === "NO") return false;
    const k = claveGrupoAsi_(a.grado, a.grupo);
    return !!mapaGruposVisibles[k];
  });

  const conteo = {};
  alumnosAutorizados.forEach(function (a) {
    const k = claveGrupoAsi_(a.grado, a.grupo);
    conteo[k] = (conteo[k] || 0) + 1;
  });

  const gruposOut = grupos.map(function (g) {
    return {
      grado: g.grado,
      grupo: g.grupo,
      turno: g.turno,
      alumnos: conteo[claveGrupoAsi_(g.grado, g.grupo)] || 0
    };
  }).sort(function (a, b) {
    return String(a.grupo || "").localeCompare(String(b.grupo || ""), "es", { numeric: true, sensitivity: "base" });
  });
  const bl = bloquesDesdeHorarios_(grupos, fechaUso);
  return {
    ok: true,
    rol: sesion.rol,
    nombre: sesion.nombre,
    prefectoId: sesion.prefectoId || sesion.apoyoId || "",
    fecha: fechaUso,
    grupos: gruposOut,
    alumnos: alumnosAutorizados.map(function (a) {
      return {
        matricula: a.matricula || "",
        nombre: a.nombre || "",
        grado: String(a.grado || ""),
        grupo: String(a.grupo || "").toLowerCase()
      };
    }).sort(function (a, b) {
      const g = String(a.grupo || "").localeCompare(String(b.grupo || ""), "es", { numeric: true, sensitivity: "base" });
      if (g) return g;
      return String(a.nombre || "").localeCompare(String(b.nombre || ""), "es", { sensitivity: "base" });
    }),
    bloques: bl.bloques,
    bloqueActual: bl.bloqueActual,
    maestros: bl.maestros || [],
    estadosAlumno: ESTADOS_ALUMNO_ASI,
    estadosMaestro: ESTADOS_MAESTRO_ASI
  };
}

function asistenciaAlumnosGrupo(token, grado, grupo, fecha) {
  const sesion = sesionAsistencia_(token);
  const g = String(grupo || "").trim().toLowerCase();
  const gr = String(grado || "").trim();
  exigirGrupoDelPrefecto_(sesion, gr, g);
  const fechaUso = String(fecha || fechaHoyAsi_()).slice(0, 10);
  const grupos = gruposVisiblesAsistencia_(sesion);
  let turno = "matutino";
  for (let i = 0; i < grupos.length; i++) {
    if (claveGrupoAsi_(grupos[i].grado, grupos[i].grupo) === claveGrupoAsi_(gr, g)) {
      turno = grupos[i].turno;
      break;
    }
  }
  const alumnos = (_leerAlumnosResumen_() || []).filter(function (a) {
    if (String(a.activo || "SI").toUpperCase() === "NO") return false;
    return String(a.grado || "").trim() === gr && String(a.grupo || "").trim().toLowerCase() === g;
  });
  const previos = {};
  _leerFilas_("AsistenciaAlumnos").forEach(function (f) {
    if (fechaCortaAsi_(f["Fecha"]) !== fechaUso) return;
    if (turnoDe_(f["Turno"]) !== turno) return;
    const mat = String(f["Matrícula"] || f["Matricula"] || "").trim();
    if (mat) {
      previos[mat] = {
        estado: String(f["Estado"] || "").trim(),
        observacion: String(f["Observación"] || f["Observacion"] || "").trim()
      };
    }
  });
  const lista = alumnos.map(function (a) {
    const mat = String(a.matricula || a.Matrícula || "").trim();
    const prev = previos[mat] || {};
    return {
      matricula: mat,
      nombre: String(a.nombre || a.nombreCompleto || "").trim(),
      estado: prev.estado || "",
      observacion: prev.observacion || ""
    };
  });
  lista.sort(function (a, b) {
    return String(a.nombre).localeCompare(String(b.nombre), "es");
  });
  return {
    ok: true,
    grado: gr,
    grupo: g,
    turno: turno,
    fecha: fechaUso,
    tomada: lista.some(function (a) { return a.estado; }),
    alumnos: lista
  };
}

/** Turno real del grupo, tomado de la hoja Grupos. */
function turnoDelGrupoAsi_(grado, grupo) {
  const k = claveGrupoAsi_(grado, grupo);
  try {
    const g = _leerFilas_("Grupos").filter(function (f) {
      return claveGrupoAsi_(f["Grado"], f["Grupo"]) === k;
    })[0];
    if (g) return turnoDe_(g["Turno"]);
  } catch (e) {}
  return "matutino";
}

/**
 * Valida el pase de lista contra el padrón y el catálogo de estados.
 * Rechaza matrículas que no pertenecen al grupo y estados fuera del catálogo,
 * en lugar de escribir lo que llegue del cliente.
 */
function validarRegistrosAsistencia_(grado, grupo, registros) {
  const estadosValidos = {};
  ESTADOS_ALUMNO_ASI.forEach(function (e) { estadosValidos[e.id] = true; });
  const k = claveGrupoAsi_(grado, grupo);
  const padron = {};
  _leerFilas_("Alumnos").forEach(function (a) {
    if (claveGrupoAsi_(a["Grado"], a["Grupo"]) !== k) return;
    const m = String(a["Matrícula"] || "").trim();
    if (m) padron[m] = String(a["Nombre Completo"] || a["Nombre"] || "").trim();
  });
  const salida = [];
  const vistos = {};
  (registros || []).forEach(function (r) {
    const mat = String((r && r.matricula) || "").trim();
    if (!mat || vistos[mat]) return;
    if (!padron[mat]) {
      throw new Error("La matrícula " + mat + " no pertenece al grupo " + grado + "° " + String(grupo).toUpperCase() + ".");
    }
    const estado = String((r && r.estado) || "").trim().toUpperCase();
    if (!estadosValidos[estado]) throw new Error("Estado de asistencia no válido: " + estado + ".");
    vistos[mat] = true;
    salida.push({
      matricula: mat,
      nombre: padron[mat],
      estado: estado,
      observacion: String((r && r.observacion) || "").trim()
    });
  });
  if (!salida.length) throw new Error("No hay alumnos para guardar.");
  return salida;
}

function guardarAsistenciaAlumnos(token, payload) {
  const sesion = sesionAsistencia_(token);
  payload = payload || {};
  const grado = String(payload.grado || "").trim();
  const grupo = String(payload.grupo || "").trim().toLowerCase();
  if (!grado || !grupo) throw new Error("Grado y grupo son obligatorios.");
  exigirGrupoDelPrefecto_(sesion, grado, grupo);
  const fechaUso = String(payload.fecha || fechaHoyAsi_()).slice(0, 10);
  const turno = turnoDelGrupoAsi_(grado, grupo);
  const registros = validarRegistrosAsistencia_(grado, grupo, payload.registros);

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (eLock) {
    throw new Error("El sistema de asistencia está ocupado registrando otro grupo. Intenta nuevamente en unos segundos.");
  }
  let locked = true;
  try {
    const libro = _obtenerLibro_();
    if (!libro) throw new Error("No se pudo abrir la hoja.");
    _verificarYCrearPestanas_();
    asegurarColumnaObservacionAsi_();
    const p = libro.getSheetByName("AsistenciaAlumnos");
    const enc = ENCABEZADOS.AsistenciaAlumnos;
    const existentes = _leerFilas_("AsistenciaAlumnos");
    const indice = {};
    existentes.forEach(function (f) {
      if (fechaCortaAsi_(f["Fecha"]) !== fechaUso) return;
      if (turnoDe_(f["Turno"]) !== turno) return;
      const mat = String(f["Matrícula"] || "").trim();
      if (mat) indice[mat] = f._fila;
    });

    const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "America/Mexico_City", "yyyy-MM-dd HH:mm:ss");
    const quien = sesion.nombre || sesion.rol;
    let guardados = 0;
    registros.forEach(function (r) {
      const mat = String(r.matricula || "").trim();
      const estado = String(r.estado || "").trim().toUpperCase();
      if (!mat || !estado) return;
      const nombre = String(r.nombre || "").trim();
      const obs = String(r.observacion || "").trim();
      const filaVal = [fechaUso, turno, grado, grupo, mat, nombre, estado, quien, ts, obs];
      if (indice[mat]) {
        p.getRange(indice[mat], 1, 1, enc.length).setValues([filaVal]);
      } else {
        p.appendRow(filaVal);
      }
      guardados++;
    });
    SpreadsheetApp.flush();
    lock.releaseLock();
    locked = false;
    return { ok: true, guardados: guardados, mensaje: "Se guardó la lista de " + guardados + " alumno(s)." };
  } finally {
    if (locked) {
      try { lock.releaseLock(); } catch (e) {}
    }
  }
}

/**
 * Pase de lista rápido desde el módulo de Asistencia de la vista de Clase.
 * Recibe la lista en memoria del docente y la traduce al contrato de
 * guardarAsistenciaAlumnos. Antes esta llamada apuntaba a una función que
 * nunca existió, así que el botón "Guardar" no guardaba nada.
 */
function guardarAsistenciaGrupo(token, grado, grupo, fecha, lista) {
  if (!Array.isArray(lista) || !lista.length) throw new Error("No hay alumnos para guardar.");
  const registros = lista.map(function (a) {
    return {
      matricula: String((a && (a.matricula || a["Matrícula"])) || "").trim(),
      nombre: String((a && (a.nombre || a["Nombre"] || a["Nombre Completo"])) || "").trim(),
      estado: String((a && (a.estado || a["Estado"])) || "P").trim(),
      observacion: String((a && (a.observacion || a["Observación"])) || "").trim()
    };
  }).filter(function (r) { return r.matricula; });
  if (!registros.length) throw new Error("La lista no tiene matrículas válidas.");

  return guardarAsistenciaAlumnos(token, {
    grado: String(grado || "").trim(),
    grupo: String(grupo || "").trim().toLowerCase(),
    fecha: String(fecha || "").trim(),
    registros: registros
  });
}

function asistenciaMaestrosBloque(token, fecha, bloque, turno) {
  const sesion = sesionAsistencia_(token);
  const fechaUso = String(fecha || fechaHoyAsi_()).slice(0, 10);
  const bloqueUso = String(bloque || "").trim();
  const turnoUso = turnoDe_(turno);
  const grupos = gruposVisiblesAsistencia_(sesion);
  const claves = {};
  grupos.forEach(function (g) { claves[claveGrupoAsi_(g.grado, g.grupo)] = true; });

  const d = new Date(fechaUso + "T12:00:00");
  const dias = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  const dia = dias[d.getDay()];

  const filasH = _leerFilas_("Horarios").filter(function (f) {
    const grado = String(f["Grado"] || "").trim();
    const grupo = String(f["Grupo"] || "").trim().toLowerCase();
    if (!claves[claveGrupoAsi_(grado, grupo)]) return false;
    if (String(f["Bloque"] || "").trim() !== bloqueUso) return false;
    const t = turnoDe_(f["Turno"]);
    if (turnoUso && t !== turnoUso) return false;
    const diaFila = String(f["Dia"] || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (diaFila && diaFila !== dia && diaFila !== "todos") return false;
    return true;
  });

  const previos = {};
  _leerFilas_("AsistenciaMaestros").forEach(function (f) {
    if (fechaCortaAsi_(f["Fecha"]) !== fechaUso) return;
    if (String(f["Bloque"] || "").trim() !== bloqueUso) return;
    const idh = String(f["Id horario"] || "").trim();
    if (idh) {
      previos[idh] = {
        estado: String(f["Estado"] || "").trim(),
        observacion: String(f["Observación"] || f["Observacion"] || "").trim()
      };
    }
  });

  const lista = filasH.map(function (f) {
    const idh = String(f["Id"] || "").trim() || [
      String(f["Dia"] || ""), String(f["Turno"] || ""), String(f["Bloque"] || ""),
      String(f["Grado"] || ""), String(f["Grupo"] || ""), String(f["Maestro"] || "")
    ].join("|");
    const prev = previos[idh] || {};
    return {
      idHorario: idh,
      maestro: String(f["Maestro"] || "").trim(),
      grado: String(f["Grado"] || "").trim(),
      grupo: String(f["Grupo"] || "").trim().toLowerCase(),
      asignatura: String(f["Asignatura"] || "").trim(),
      salon: String(f["Salon"] || "").trim(),
      estado: prev.estado || "",
      observacion: prev.observacion || ""
    };
  });

  return {
    ok: true,
    fecha: fechaUso,
    bloque: bloqueUso,
    turno: turnoUso,
    maestros: lista
  };
}

function guardarAsistenciaMaestro(token, payload) {
  const sesion = sesionAsistencia_(token);
  payload = payload || {};
  const idHorario = String(payload.idHorario || "").trim();
  if (!idHorario) throw new Error("Falta el bloque de horario.");
  const filaH = _leerFilas_("Horarios").filter(function (h) {
    return String(h["Id"] || "").trim() === idHorario;
  })[0];
  if (!filaH) throw new Error("El bloque de horario no existe en la escuela.");

  // Grado, grupo, turno, bloque, maestro y asignatura se toman del horario:
  // así una prefecta no puede sobrescribir la asistencia de otro grupo.
  const grado = String(filaH["Grado"] || "").trim();
  const grupo = String(filaH["Grupo"] || "").trim().toLowerCase();
  exigirGrupoDelPrefecto_(sesion, grado, grupo);
  const fechaUso = String(payload.fecha || fechaHoyAsi_()).slice(0, 10);
  const turno = turnoDe_(filaH["Turno"]);
  const bloque = String(filaH["Bloque"] || "").trim();
  const maestro = String(filaH["Maestro"] || "").trim();
  const asignatura = String(filaH["Asignatura"] || "").trim();
  const estado = String(payload.estado || "").trim().toLowerCase();
  const estadosMae = {};
  ESTADOS_MAESTRO_ASI.forEach(function (e) { estadosMae[e.id] = true; });
  if (!estado || !estadosMae[estado]) throw new Error("Estado de asistencia no válido: " + estado + ".");
  const obs = String(payload.observacion || "").trim();

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (eLock) {
    throw new Error("El sistema de asistencia está ocupado. Intenta nuevamente en unos segundos.");
  }
  let locked = true;
  try {
    _verificarYCrearPestanas_();
    asegurarColumnaObservacionAsi_();
    const libro = _obtenerLibro_();
    const p = libro.getSheetByName("AsistenciaMaestros");
    const enc = ENCABEZADOS.AsistenciaMaestros;
    const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "America/Mexico_City", "yyyy-MM-dd HH:mm:ss");
    const filaVal = [
      fechaUso, turno, bloque, idHorario, maestro, grado, grupo,
      asignatura, estado, sesion.nombre || sesion.rol, ts, obs
    ];
    const existentes = _leerFilas_("AsistenciaMaestros");
    let filaN = 0;
    let obsPrev = "";
    for (let i = 0; i < existentes.length; i++) {
      if (fechaCortaAsi_(existentes[i]["Fecha"]) !== fechaUso) continue;
      if (String(existentes[i]["Id horario"] || "").trim() !== idHorario) continue;
      filaN = existentes[i]._fila;
      obsPrev = String(existentes[i]["Observación"] || existentes[i]["Observacion"] || "").trim();
      break;
    }
    if (payload.observacion == null && filaN) filaVal[11] = obsPrev;
    if (filaN) p.getRange(filaN, 1, 1, enc.length).setValues([filaVal]);
    else p.appendRow(filaVal);
    SpreadsheetApp.flush();
    lock.releaseLock();
    locked = false;
    return { ok: true, mensaje: "Asistencia de " + maestro + " guardada." };
  } finally {
    if (locked) {
      try { lock.releaseLock(); } catch (e) {}
    }
  }
}

function catalogoReporteAsistencia(token) {
  const sesion = sesionAsistencia_(token);
  const grupos = gruposVisiblesAsistencia_(sesion);
  const claves = {};
  grupos.forEach(function (g) { claves[claveGrupoAsi_(g.grado, g.grupo)] = true; });
  const alumnos = (_leerAlumnosResumen_() || []).filter(function (a) {
    if (String(a.activo || "SI").toUpperCase() === "NO") return false;
    return claves[claveGrupoAsi_(a.grado, a.grupo)];
  }).map(function (a) {
    return {
      matricula: String(a.matricula || a.Matrícula || "").trim(),
      nombre: String(a.nombre || a.nombreCompleto || "").trim(),
      grado: String(a.grado || "").trim(),
      grupo: String(a.grupo || "").trim().toLowerCase()
    };
  }).filter(function (a) { return a.matricula; });
  alumnos.sort(function (a, b) {
    return String(a.nombre).localeCompare(String(b.nombre), "es");
  });
  const maestrosMap = {};
  _leerFilas_("Horarios").forEach(function (f) {
    const gr = String(f["Grado"] || "").trim();
    const gp = String(f["Grupo"] || "").trim().toLowerCase();
    if (!claves[claveGrupoAsi_(gr, gp)]) return;
    const n = String(f["Maestro"] || "").trim();
    if (!n) return;
    if (!maestrosMap[n]) maestrosMap[n] = { nombre: n, grupos: {} };
    maestrosMap[n].grupos[claveGrupoAsi_(gr, gp)] = { grado: gr, grupo: gp };
  });
  const maestros = Object.keys(maestrosMap).sort(function (a, b) {
    return a.localeCompare(b, "es");
  }).map(function (n) {
    return {
      nombre: n,
      grupos: Object.keys(maestrosMap[n].grupos).map(function (k) {
        return maestrosMap[n].grupos[k];
      })
    };
  });
  let trimestres = {};
  try {
    const cfgT = leerCfgTrimestral_();
    ["1", "2", "3"].forEach(function (n) {
      const t = (cfgT.trimestres && cfgT.trimestres[n]) || {};
      trimestres[n] = {
        inicio: String(t.inicio || ""),
        fin: String(t.fin || ""),
        etiqueta: etiquetaTrimestre_(n)
      };
    });
  } catch (eT) {}
  return {
    ok: true,
    rol: sesion.rol,
    grupos: grupos.map(function (g) {
      return { grado: g.grado, grupo: g.grupo, turno: g.turno };
    }),
    alumnos: alumnos,
    maestros: maestros,
    trimestres: trimestres
  };
}

function vacioContAsiAlu_() {
  return { P: 0, T: 0, A: 0, J: 0, PE: 0 };
}

function vacioContAsiMae_() {
  return { presente: 0, retardo: 0, falta: 0 };
}

function sumarContAsi_(cont, estado, mapa) {
  const e = String(estado || "").trim();
  const k = mapa && mapa[e] ? mapa[e] : e;
  if (cont[k] == null) return;
  cont[k]++;
}

function pctDe_(ok, n) {
  if (!n) return 0;
  return Math.round((1000 * ok) / n) / 10;
}

function etiquetaHoraAsi_(bloque, ini, fin) {
  const num = String(bloque || "").replace(/[^\d].*$/, "") || String(bloque || "");
  const rango = (ini && fin) ? (ini + "–" + fin) : (ini || "");
  if (num && rango) return num + " · " + rango;
  return rango || num;
}

function mapaHorasHorario_() {
  const porId = {};
  const porBloque = {};
  _leerFilas_("Horarios").forEach(function (f) {
    const id = String(f["Id"] || "").trim();
    const bloque = String(f["Bloque"] || "").trim();
    const ini = formatearHoraAsi_(f["Hora inicio"]);
    const fin = formatearHoraAsi_(f["Hora fin"]);
    const rec = {
      bloque: bloque,
      horaInicio: ini,
      horaFin: fin,
      hora: etiquetaHoraAsi_(bloque, ini, fin),
      min: horaAMinutos_(ini)
    };
    if (id) porId[id] = rec;
    if (bloque && (porBloque[bloque] == null || rec.min < (porBloque[bloque].min || 9999))) {
      porBloque[bloque] = rec;
    }
  });
  return { porId: porId, porBloque: porBloque };
}

function horaDeFilaMae_(f, mapa) {
  const id = String(f["Id horario"] || "").trim();
  const bloque = String(f["Bloque"] || "").trim();
  if (id && mapa.porId[id]) return mapa.porId[id];
  if (bloque && mapa.porBloque[bloque]) return mapa.porBloque[bloque];
  return {
    bloque: bloque,
    horaInicio: "",
    horaFin: "",
    hora: etiquetaHoraAsi_(bloque, "", ""),
    min: Number(String(bloque).replace(/[^\d]/g, "") || 0)
  };
}

function normalizarGruposPayload_(payload) {
  payload = payload || {};
  const out = [];
  const visto = {};
  const add = function (gr, gp) {
    gp = String(gp || "").trim().toLowerCase();
    gr = String(gr || "").trim();
    if (!gp) return;
    const k = gr + "|" + gp;
    if (visto[k]) return;
    visto[k] = true;
    out.push({ grado: gr, grupo: gp });
  };
  const arr = payload.grupos;
  if (arr && arr.length) {
    arr.forEach(function (g) {
      if (g && typeof g === "object") add(g.grado, g.grupo);
      else {
        const s = String(g || "");
        const p = s.split("|");
        if (p.length > 1) add(p[0], p[1]);
        else add(payload.grado, s);
      }
    });
  }
  const uno = String(payload.grupo || "").trim().toLowerCase();
  if (uno && !out.length) add(payload.grado, uno);
  return out;
}

function clavesFiltroRepAsi_(clavesVisibles, grado, gruposSel) {
  const out = {};
  if (gruposSel && gruposSel.length) {
    gruposSel.forEach(function (g) {
      const gr = String(g.grado || grado || "").trim();
      const gp = String(g.grupo || "").trim().toLowerCase();
      if (!gp) return;
      if (gr) {
        const k = claveGrupoAsi_(gr, gp);
        if (clavesVisibles[k]) out[k] = true;
      } else {
        Object.keys(clavesVisibles).forEach(function (ck) {
          if (ck.split("|")[1] === gp) out[ck] = true;
        });
      }
    });
    return Object.keys(out).length ? out : clavesVisibles;
  }
  if (grado) {
    Object.keys(clavesVisibles).forEach(function (k) {
      if (k.indexOf(String(grado) + "|") === 0) out[k] = true;
    });
    return Object.keys(out).length ? out : clavesVisibles;
  }
  return clavesVisibles;
}

function reporteAsistencia(token, payload) {
  const sesion = sesionAsistencia_(token);
  payload = payload || {};
  let tipo = String(payload.tipo || "grupo").toLowerCase();
  if (tipo === "escuela" && sesion.rol !== "admin") tipo = "grupo";
  const ini = fechaCortaAsi_(payload.fechaIni || fechaHoyAsi_());
  const fin = fechaCortaAsi_(payload.fechaFin || fechaHoyAsi_());
  const grupos = gruposVisiblesAsistencia_(sesion);
  const claves = {};
  grupos.forEach(function (g) { claves[claveGrupoAsi_(g.grado, g.grupo)] = true; });
  const grado = String(payload.grado || "").trim();
  const gruposSel = normalizarGruposPayload_(payload);
  gruposSel.forEach(function (g) {
    if (g.grado && g.grupo) exigirGrupoDelPrefecto_(sesion, g.grado, g.grupo);
  });
  const clavesUso = clavesFiltroRepAsi_(claves, grado, gruposSel);
  const grupo = gruposSel.length === 1 ? gruposSel[0].grupo : "";
  const matFiltro = String(payload.matricula || "").trim();
  const maeFiltro = String(payload.maestro || "").trim();
  const soloMae = tipo === "maestro" || !!maeFiltro;
  if (soloMae) tipo = "maestro";
  else if (matFiltro) tipo = "alumno";
  const tipoAlu = matFiltro ? "alumno" : tipo;
  const alu = soloMae ? null : reporteAsistenciaAlumnos_(sesion, clavesUso, ini, fin, "", "", matFiltro, tipoAlu);
  const mae = soloMae ? reporteAsistenciaMaestros_(sesion, clavesUso, ini, fin, "", "", maeFiltro) : null;

  const etqsG = gruposSel.map(function (g) { return String(g.grupo || "").toUpperCase(); });
  let titulo = "Grupo";
  if (soloMae) {
    titulo = maeFiltro || "Maestros";
    if (etqsG.length) titulo += " · " + etqsG.join(" · ");
    else if (grado) titulo += " · " + grado + "°";
  } else if (tipo === "alumno") titulo = "Alumno";
  else if (etqsG.length > 1) titulo = "Comparativa " + etqsG.join(" · ");
  else if (tipo === "escuela" && !etqsG.length && !grado) titulo = "Toda la escuela";
  else if (etqsG.length === 1) titulo = "Grupo " + etqsG[0];
  else if (grado) titulo = "Grado " + grado + "°";
  else titulo = sesion.rol === "admin" ? "Todos los grupos" : "Mis grupos";

  const primario = soloMae ? mae : alu;
  return {
    ok: true,
    tipo: tipo,
    titulo: titulo,
    rol: sesion.rol,
    periodo: { ini: ini, fin: fin },
    soloMaestros: soloMae,
    maestroFiltro: maeFiltro,
    kpis: (primario && primario.kpis) || {},
    distribucion: primario && primario.distribucion,
    serieDias: (primario && primario.serieDias) || [],
    seriesGrupos: (primario && primario.seriesGrupos) || [],
    ranking: (alu && alu.ranking) || (mae && mae.ranking) || [],
    rankingGrupos: (alu && alu.rankingGrupos) || [],
    detalle: tipo === "alumno"
      ? ((alu && alu.detalle) || [])
      : (soloMae ? ((mae && mae.detalleHoras) || []) : ((alu && alu.ranking) || [])),
    observaciones: (alu && alu.observaciones) || (mae && mae.observaciones) || [],
    alumnos: alu,
    maestros: mae
  };
}

function reporteAsistenciaAlumnos_(sesion, claves, ini, fin, grado, grupo, matricula, tipo) {
  const filas = _leerFilas_("AsistenciaAlumnos").filter(function (f) {
    const fe = fechaCortaAsi_(f["Fecha"]);
    if (fe < ini || fe > fin) return false;
    const gr = String(f["Grado"] || "").trim();
    const gp = String(f["Grupo"] || "").trim().toLowerCase();
    if (!claves[claveGrupoAsi_(gr, gp)]) return false;
    if (grado && gr !== grado) return false;
    if (grupo && gp !== grupo) return false;
    if (matricula && String(f["Matrícula"] || "").trim() !== matricula) return false;
    return true;
  });

  const porAlumno = {};
  const porDia = {};
  const porGrupo = {};
  const porGrupoDia = {};
  const dist = vacioContAsiAlu_();
  const observaciones = [];
  const incidencias = [];
  filas.forEach(function (f) {
    const mat = String(f["Matrícula"] || "").trim();
    const nombre = String(f["Nombre"] || "").trim();
    const est = String(f["Estado"] || "").trim().toUpperCase();
    const fe = fechaCortaAsi_(f["Fecha"]);
    const obs = String(f["Observación"] || f["Observacion"] || "").trim();
    const gr = String(f["Grado"] || "").trim();
    const gp = String(f["Grupo"] || "").trim().toLowerCase();
    if (!porAlumno[mat]) {
      porAlumno[mat] = {
        matricula: mat, nombre: nombre, grado: gr, grupo: gp, cont: vacioContAsiAlu_(), n: 0
      };
    }
    sumarContAsi_(porAlumno[mat].cont, est);
    porAlumno[mat].n++;
    const gk = claveGrupoAsi_(gr, gp);
    if (!porGrupo[gk]) porGrupo[gk] = { grado: gr, grupo: gp, cont: vacioContAsiAlu_(), n: 0 };
    sumarContAsi_(porGrupo[gk].cont, est);
    porGrupo[gk].n++;
    if (!porGrupoDia[gk]) porGrupoDia[gk] = {};
    if (!porGrupoDia[gk][fe]) porGrupoDia[gk][fe] = { fecha: fe, cont: vacioContAsiAlu_(), n: 0 };
    sumarContAsi_(porGrupoDia[gk][fe].cont, est);
    porGrupoDia[gk][fe].n++;
    if (!porDia[fe]) porDia[fe] = { fecha: fe, cont: vacioContAsiAlu_(), n: 0 };
    sumarContAsi_(porDia[fe].cont, est);
    porDia[fe].n++;
    sumarContAsi_(dist, est);
    if (obs) {
      observaciones.push({
        fecha: fe, matricula: mat, nombre: nombre,
        grupo: String(gp).toUpperCase(), estado: est, observacion: obs
      });
    }
    incidencias.push({
      fecha: fe, matricula: mat, nombre: nombre,
      grupo: String(gp).toUpperCase(), estado: est, observacion: obs
    });
  });

  const ranking = Object.keys(porAlumno).map(function (k) {
    const a = porAlumno[k];
    const ok = (a.cont.P || 0) + (a.cont.T || 0);
    return {
      matricula: a.matricula,
      nombre: a.nombre,
      grupo: String(a.grupo || "").toUpperCase(),
      presentes: a.cont.P || 0,
      tardes: a.cont.T || 0,
      ausentes: a.cont.A || 0,
      justificados: a.cont.J || 0,
      permisos: a.cont.PE || 0,
      sesiones: a.n,
      pct: pctDe_(ok, a.n)
    };
  }).sort(function (a, b) {
    if (b.pct !== a.pct) return b.pct - a.pct;
    return String(a.nombre).localeCompare(String(b.nombre), "es");
  });

  const rankingGrupos = Object.keys(porGrupo).map(function (k) {
    const g = porGrupo[k];
    const okG = (g.cont.P || 0) + (g.cont.T || 0);
    return {
      grado: g.grado,
      grupo: String(g.grupo || "").toUpperCase(),
      presentes: g.cont.P || 0,
      tardes: g.cont.T || 0,
      ausentes: g.cont.A || 0,
      justificados: g.cont.J || 0,
      permisos: g.cont.PE || 0,
      sesiones: g.n,
      pct: pctDe_(okG, g.n)
    };
  }).sort(function (a, b) {
    return String(a.grupo).localeCompare(String(b.grupo), "es");
  });

  const serieDias = Object.keys(porDia).sort().map(function (fe) {
    const d = porDia[fe];
    const ok = (d.cont.P || 0) + (d.cont.T || 0);
    return {
      fecha: fe,
      P: d.cont.P || 0, T: d.cont.T || 0, A: d.cont.A || 0, J: d.cont.J || 0, PE: d.cont.PE || 0,
      n: d.n,
      pct: pctDe_(ok, d.n)
    };
  });

  const seriesGrupos = Object.keys(porGrupo).sort().map(function (gk) {
    const g = porGrupo[gk];
    const dias = porGrupoDia[gk] || {};
    const puntos = Object.keys(dias).sort().map(function (fe) {
      const d = dias[fe];
      const okG = (d.cont.P || 0) + (d.cont.T || 0);
      return { fecha: fe, pct: pctDe_(okG, d.n), n: d.n };
    });
    return {
      etiqueta: String(g.grupo || "").toUpperCase(),
      grado: g.grado,
      grupo: String(g.grupo || "").toUpperCase(),
      puntos: puntos
    };
  });

  const n = filas.length;
  const ok = (dist.P || 0) + (dist.T || 0);
  const detalle = tipo === "alumno"
    ? filas.map(function (f) {
      return {
        fecha: fechaCortaAsi_(f["Fecha"]),
        grupo: String(f["Grupo"] || "").toUpperCase(),
        estado: String(f["Estado"] || "").trim().toUpperCase(),
        observacion: String(f["Observación"] || f["Observacion"] || "").trim()
      };
    }).sort(function (a, b) { return String(a.fecha).localeCompare(String(b.fecha)); })
    : ranking;

  return {
    ok: true,
    tipo: tipo,
    titulo: tipo === "alumno" ? "Alumno" : "Grupo",
    periodo: { ini: ini, fin: fin },
    kpis: {
      sesiones: n,
      presentes: dist.P || 0,
      tardes: dist.T || 0,
      ausentes: dist.A || 0,
      justificados: dist.J || 0,
      permisos: dist.PE || 0,
      pct: pctDe_(ok, n)
    },
    distribucion: dist,
    serieDias: serieDias,
    seriesGrupos: seriesGrupos,
    ranking: ranking,
    rankingGrupos: rankingGrupos,
    detalle: detalle,
    observaciones: observaciones,
    incidencias: incidencias.sort(function (a, b) {
      if (a.fecha !== b.fecha) return String(b.fecha).localeCompare(String(a.fecha));
      return String(a.nombre).localeCompare(String(b.nombre), "es");
    })
  };
}

function reporteAsistenciaMaestros_(sesion, claves, ini, fin, grado, grupo, maestro) {
  const filas = _leerFilas_("AsistenciaMaestros").filter(function (f) {
    const fe = fechaCortaAsi_(f["Fecha"]);
    if (fe < ini || fe > fin) return false;
    const gr = String(f["Grado"] || "").trim();
    const gp = String(f["Grupo"] || "").trim().toLowerCase();
    if (!claves[claveGrupoAsi_(gr, gp)]) return false;
    if (grado && gr !== grado) return false;
    if (grupo && gp !== grupo) return false;
    if (maestro && String(f["Maestro"] || "").trim() !== maestro) return false;
    return true;
  });

  const mapaHoras = mapaHorasHorario_();
  const porMae = {};
  const porDia = {};
  const porHora = {};
  const porGrupoDia = {};
  const dist = vacioContAsiMae_();
  const observaciones = [];
  const detalleHoras = [];
  filas.forEach(function (f) {
    const nom = String(f["Maestro"] || "").trim();
    const est = String(f["Estado"] || "").trim().toLowerCase();
    const fe = fechaCortaAsi_(f["Fecha"]);
    const obs = String(f["Observación"] || f["Observacion"] || "").trim();
    const gp = String(f["Grupo"] || "").toUpperCase();
    const gr = String(f["Grado"] || "").trim();
    const grupoEtq = (gr && gp.indexOf(gr) !== 0) ? (gr + gp) : gp;
    const asignatura = String(f["Asignatura"] || "");
    const recH = horaDeFilaMae_(f, mapaHoras);
    if (!porMae[nom]) porMae[nom] = { maestro: nom, cont: vacioContAsiMae_(), n: 0 };
    sumarContAsi_(porMae[nom].cont, est);
    porMae[nom].n++;
    if (!porDia[fe]) porDia[fe] = { fecha: fe, cont: vacioContAsiMae_(), n: 0 };
    sumarContAsi_(porDia[fe].cont, est);
    porDia[fe].n++;
    const hk = recH.hora || recH.bloque || "—";
    if (!porHora[hk]) {
      porHora[hk] = {
        hora: hk, bloque: recH.bloque, min: recH.min || 0, cont: vacioContAsiMae_(), n: 0
      };
    }
    sumarContAsi_(porHora[hk].cont, est);
    porHora[hk].n++;
    sumarContAsi_(dist, est);
    const gk = claveGrupoAsi_(gr, String(f["Grupo"] || "").trim().toLowerCase());
    if (!porGrupoDia[gk]) porGrupoDia[gk] = { etiqueta: grupoEtq, dias: {} };
    if (!porGrupoDia[gk].dias[fe]) porGrupoDia[gk].dias[fe] = { fecha: fe, cont: vacioContAsiMae_(), n: 0 };
    sumarContAsi_(porGrupoDia[gk].dias[fe].cont, est);
    porGrupoDia[gk].dias[fe].n++;
    detalleHoras.push({
      fecha: fe,
      hora: recH.hora || recH.bloque,
      bloque: recH.bloque,
      min: recH.min || 0,
      maestro: nom,
      grado: gr,
      grupo: gp,
      grupoEtq: grupoEtq,
      asignatura: asignatura,
      estado: est,
      observacion: obs
    });
    if (obs) {
      observaciones.push({
        fecha: fe, maestro: nom, grupo: gp,
        bloque: recH.bloque, hora: recH.hora, asignatura: asignatura,
        estado: est, observacion: obs
      });
    }
  });

  const ranking = Object.keys(porMae).map(function (k) {
    const a = porMae[k];
    const okM = (a.cont.presente || 0) + (a.cont.retardo || 0);
    return {
      maestro: a.maestro,
      presentes: a.cont.presente || 0,
      retardos: a.cont.retardo || 0,
      faltas: a.cont.falta || 0,
      bloques: a.n,
      pct: pctDe_(okM, a.n)
    };
  }).sort(function (a, b) {
    if (b.pct !== a.pct) return b.pct - a.pct;
    return String(a.maestro).localeCompare(String(b.maestro), "es");
  });

  const serieDias = Object.keys(porDia).sort().map(function (fe) {
    const d = porDia[fe];
    const okD = (d.cont.presente || 0) + (d.cont.retardo || 0);
    return {
      fecha: fe,
      presente: d.cont.presente || 0,
      retardo: d.cont.retardo || 0,
      falta: d.cont.falta || 0,
      n: d.n,
      pct: pctDe_(okD, d.n)
    };
  });

  const serieHoras = Object.keys(porHora).map(function (k) {
    const d = porHora[k];
    const okH = (d.cont.presente || 0) + (d.cont.retardo || 0);
    return {
      hora: d.hora,
      bloque: d.bloque,
      etiqueta: d.hora,
      presente: d.cont.presente || 0,
      retardo: d.cont.retardo || 0,
      falta: d.cont.falta || 0,
      n: d.n,
      pct: pctDe_(okH, d.n),
      min: d.min || 0
    };
  }).sort(function (a, b) { return (a.min || 0) - (b.min || 0); });

  detalleHoras.sort(function (a, b) {
    const cf = String(a.fecha).localeCompare(String(b.fecha));
    if (cf) return cf;
    if ((a.min || 0) !== (b.min || 0)) return (a.min || 0) - (b.min || 0);
    return String(a.maestro).localeCompare(String(b.maestro), "es");
  });

  const n = filas.length;
  const ok = (dist.presente || 0) + (dist.retardo || 0);
  return {
    ok: true,
    tipo: "maestro",
    titulo: "Maestro",
    periodo: { ini: ini, fin: fin },
    kpis: {
      sesiones: n,
      presentes: dist.presente || 0,
      tardes: dist.retardo || 0,
      ausentes: dist.falta || 0,
      justificados: 0,
      permisos: 0,
      pct: pctDe_(ok, n)
    },
    distribucion: dist,
    serieDias: serieDias,
    serieHoras: serieHoras,
    seriesGrupos: Object.keys(porGrupoDia).sort().map(function (gk) {
      const g = porGrupoDia[gk];
      const puntos = Object.keys(g.dias).sort().map(function (fe) {
        const d = g.dias[fe];
        const okG = (d.cont.presente || 0) + (d.cont.retardo || 0);
        return { fecha: fe, pct: pctDe_(okG, d.n), n: d.n };
      });
      return { etiqueta: g.etiqueta, puntos: puntos };
    }),
    ranking: ranking,
    detalleHoras: detalleHoras,
    detalle: detalleHoras,
    observaciones: observaciones
  };
}

function asegurarColumnaClavePrefectos_() {
  const libro = _obtenerLibro_();
  if (!libro) return;
  const p = libro.getSheetByName("Prefectos");
  if (!p) return;
  const lastCol = Math.max(p.getLastColumn(), 1);
  const enc = p.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
    return String(h || "").trim();
  });
  const hay = enc.some(function (h) {
    return normalizarNombrePref_(h) === "clave";
  });
  if (hay) return;
  p.getRange(1, lastCol + 1).setValue("Clave").setFontWeight("bold");
  SpreadsheetApp.flush();
}

function listarPrefectos(token) {
  const sesion = sesionAsistencia_(token);
  if (sesion.rol !== "admin") throw new Error("Solo el administrador puede ver prefectos.");
  asegurarColumnaUsuarioPrefectos_();
  asegurarColumnaClavePrefectos_();
  const asig = _leerFilas_("PrefectoGrupos");
  return {
    ok: true,
    prefectos: _leerFilas_("Prefectos").map(function (f) {
      const id = String(f["Id"] || "").trim();
      const grupos = asig.filter(function (a) {
        return String(a["Id prefecto"] || "").trim() === id;
      }).map(function (a) {
        return String(a["Grado"] || "") + String(a["Grupo"] || "").toLowerCase();
      });
      return {
        id: id,
        nombre: String(f["Nombre"] || "").trim(),
        usuario: String(f["Usuario"] || "").trim(),
        clave: "",
        activo: String(f["Activo"] || "SI").trim().toUpperCase(),
        grupos: grupos
      };
    })
  };
}

function altaPrefecto(token, nombre, clave, usuario) {
  const sesion = sesionAsistencia_(token);
  if (sesion.rol !== "admin") throw new Error("Solo el administrador puede dar de alta prefectos.");
  nombre = String(nombre || "").trim();
  clave = String(clave || "").trim();
  usuario = String(usuario || "").trim();
  if (!nombre) throw new Error("Escribe el nombre del prefecto.");
  if (clave.length < 6) throw new Error("La clave debe tener al menos 6 caracteres.");
  _verificarYCrearPestanas_();
  asegurarColumnaUsuarioPrefectos_();
  const usuarioUso = usuarioPrefLibre_(usuario || nombre);
  if (esUsuarioAdminAsistencia_(usuarioUso)) {
    throw new Error("Ese usuario está reservado para el administrador.");
  }
  const id = "P" + String(new Date().getTime()).slice(-8);
  const salt = Utilities.getUuid();
  const libro = _obtenerLibro_();
  asegurarColumnaClavePrefectos_();
  libro.getSheetByName("Prefectos").appendRow([id, celdaSegura_(nombre), celdaSegura_(usuarioUso), salt, hashClave(clave, salt), "SI", ""]);
  SpreadsheetApp.flush();
  return { ok: true, id: id, usuario: usuarioUso, clave: clave, mensaje: "Prefecta " + nombre + " creada. Usuario: " + usuarioUso };
}

function asignarClavePrefecto(token, id, usuario, clave) {
  const sesion = sesionAsistencia_(token);
  if (sesion.rol !== "admin") throw new Error("Solo el administrador puede editar prefectas.");
  id = String(id || "").trim();
  usuario = String(usuario || "").trim();
  clave = String(clave || "").trim();
  if (!id) throw new Error("Falta el identificador.");
  if (clave && clave.length < 6) throw new Error("La clave debe tener al menos 6 caracteres.");
  _verificarYCrearPestanas_();
  asegurarColumnaUsuarioPrefectos_();
  asegurarColumnaClavePrefectos_();
  const libro = _obtenerLibro_();
  const p = libro.getSheetByName("Prefectos");
  if (!p) throw new Error("No se encontró la hoja Prefectos.");
  const filas = _leerFilas_("Prefectos");
  let f = null;
  filas.forEach(function (row) {
    if (String(row["Id"] || "").trim() === id) f = row;
  });
  if (!f) throw new Error("No se encontró a esa prefecta.");
  const lastCol = Math.max(p.getLastColumn(), 1);
  const enc = p.getRange(1, 1, 1, lastCol).getValues()[0];
  let colUsu = 0, colSalt = 0, colHash = 0, colClave = 0;
  enc.forEach(function (h, i) {
    const n = normalizarNombrePref_(h);
    if (n === "usuario") colUsu = i + 1;
    if (n === "salt") colSalt = i + 1;
    if (n === "hash") colHash = i + 1;
    if (n === "clave") colClave = i + 1;
  });
  if (usuario) {
    const usuarioUso = usuarioPrefLibre_(usuario, id);
    if (colUsu) p.getRange(f._fila, colUsu).setValue(usuarioUso);
  }
  if (clave) {
    const salt = Utilities.getUuid();
    if (colSalt) p.getRange(f._fila, colSalt).setValue(salt);
    if (colHash) p.getRange(f._fila, colHash).setValue(hashClave(clave, salt));
    if (colClave) p.getRange(f._fila, colClave).setNumberFormat("@").setValue("");
  }
  SpreadsheetApp.flush();
  return { ok: true, mensaje: "Datos actualizados para " + String(f["Nombre"] || "") + "." };
}

function generarClavePrefecto(token, id) {
  return asignarClavePrefecto(token, id, "", generarClaveAleatoriaMaestro_());
}

function generarClavesPrefectos(token) {
  const sesion = sesionAsistencia_(token);
  if (sesion.rol !== "admin") throw new Error("Solo el administrador puede generar claves.");
  asegurarColumnaUsuarioPrefectos_();
  asegurarColumnaClavePrefectos_();
  const filas = _leerFilas_("Prefectos").filter(function (f) {
    return String(f["Activo"] || "SI").toUpperCase() !== "NO";
  });
  if (!filas.length) return { ok: false, total: 0, mensaje: "No hay prefectas activas." };
  let n = 0;
  filas.forEach(function (f) {
    const id = String(f["Id"] || "").trim();
    const nom = String(f["Nombre"] || "");
    const usu = usuarioPrefLibre_(slugUsuarioPref_(nom) + String(100 + Math.floor(Math.random() * 900)), id);
    const clave = generarClaveAleatoriaMaestro_();
    asignarClavePrefecto(token, id, usu, clave);
    n++;
  });
  return { ok: true, total: n, mensaje: "Se generaron usuario y contraseña para " + n + " prefectas." };
}

function guardarAsignacionPrefecto(token, prefectoId, grupos) {
  const sesion = sesionAsistencia_(token);
  if (sesion.rol !== "admin") throw new Error("Solo el administrador puede asignar grupos.");
  prefectoId = String(prefectoId || "").trim();
  if (!prefectoId) throw new Error("Elige un prefecto.");
  grupos = grupos || [];

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (eLock) {
    throw new Error("El sistema está ocupado. Intenta nuevamente en unos segundos.");
  }
  let locked = true;
  try {
    _verificarYCrearPestanas_();
    const libro = _obtenerLibro_();
    const p = libro.getSheetByName("PrefectoGrupos");
    const filas = _leerFilas_("PrefectoGrupos");
    const conservar = [];
    filas.forEach(function (f) {
      if (String(f["Id prefecto"] || "").trim() === prefectoId) return;
      conservar.push([
        f["Id prefecto"], f["Grado"], f["Grupo"], f["Turno"] || "matutino"
      ]);
    });
    grupos.forEach(function (g) {
      conservar.push([
        prefectoId,
        String(g.grado || "").trim(),
        String(g.grupo || "").trim().toLowerCase(),
        turnoDe_(g.turno)
      ]);
    });
    p.clearContents();
    p.getRange(1, 1, 1, ENCABEZADOS.PrefectoGrupos.length).setValues([ENCABEZADOS.PrefectoGrupos]).setFontWeight("bold");
    if (conservar.length) {
      p.getRange(2, 1, conservar.length, ENCABEZADOS.PrefectoGrupos.length).setValues(conservar);
    }
    SpreadsheetApp.flush();
    lock.releaseLock();
    locked = false;
    return { ok: true, mensaje: "Se asignaron " + grupos.length + " grupo(s)." };
  } finally {
    if (locked) {
      try { lock.releaseLock(); } catch (e) {}
    }
  }
}

function xmlAttr_(el, nombre) {
  if (!el) return "";
  const a = el.getAttribute(nombre);
  return a ? String(a.getValue() || "").trim() : "";
}

function xmlHijos_(padre, nombre) {
  if (!padre) return [];
  return padre.getChildren(nombre) || [];
}

function xmlMapaId_(padre, hijo, idAttr, campos) {
  const mapa = {};
  xmlHijos_(padre, hijo).forEach(function (el) {
    const id = xmlAttr_(el, idAttr || "id");
    if (!id) return;
    const fila = {};
    (campos || []).forEach(function (c) { fila[c] = xmlAttr_(el, c); });
    mapa[id] = fila;
  });
  return mapa;
}

function diasDeBitsAsi_(bits) {
  const b = String(bits || "").replace(/,/g, "");
  const nombres = ["lunes", "martes", "miercoles", "jueves", "viernes"];
  const out = [];
  for (let i = 0; i < 5; i++) {
    if (b.charAt(i) === "1") out.push(nombres[i]);
  }
  return out;
}

function partirIdsAsi_(s) {
  return String(s || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean);
}

function turnoDesdeHoraAsi_(hhmm) {
  const m = String(hhmm || "").trim().match(/(\d{1,2})\s*:\s*(\d{2})/);
  const h = m ? Number(m[1]) : 7;
  if (h >= 13) return "vespertino";
  if (h >= 1 && h <= 6) return "vespertino";
  return "matutino";
}

function turnoDeFilaImportada_(inicio, turnoForzado) {
  const forzado = String(turnoForzado || "").trim().toLowerCase();
  if (forzado === "matutino" || forzado === "vespertino") return forzado;
  return turnoDesdeHoraAsi_(inicio);
}

function gradoGrupoDeClaseAsi_(nombre) {
  const n = String(nombre || "").trim().toLowerCase();
  const m = n.match(/^([123])\s*[-°oº]?\s*([a-z])$/i) || n.match(/^([123])([a-z])$/i);
  if (m) return { grado: m[1], grupo: (m[1] + m[2]).toLowerCase() };
  return { grado: normalizarGradoServer(n) || "1", grupo: n };
}

/**
 * Importa un XML de aSc Timetables a la hoja Horarios.
 * Detecta el turno por la hora de cada bloque y reemplaza solo esos turnos.
 */
function importarHorarioAsc(token, xmlTexto, turnoForzado) {
  const sesion = sesionAsistencia_(token);
  if (sesion.rol !== "admin") throw new Error("Solo el administrador puede importar el horario.");
  xmlTexto = String(xmlTexto || "").trim();
  if (!xmlTexto) throw new Error("El archivo XML está vacío.");
  if (xmlTexto.indexOf("<timetable") < 0 && xmlTexto.indexOf("<cards") < 0) {
    throw new Error("No parece un XML de aSc Timetables.");
  }

  let root;
  try {
    root = XmlService.parse(xmlTexto).getRootElement();
  } catch (eParse) {
    throw new Error("No se pudo leer el XML: " + (eParse.message || eParse));
  }

  const periodos = {};
  xmlHijos_(root.getChild("periods"), "period").forEach(function (el) {
    const n = xmlAttr_(el, "period") || xmlAttr_(el, "name");
    if (!n) return;
    periodos[n] = {
      bloque: n,
      inicio: xmlAttr_(el, "starttime") || xmlAttr_(el, "start"),
      fin: xmlAttr_(el, "endtime") || xmlAttr_(el, "end")
    };
  });
  const maestros = xmlMapaId_(root.getChild("teachers"), "teacher", "id", ["name", "short", "firstname", "lastname"]);
  const materias = xmlMapaId_(root.getChild("subjects"), "subject", "id", ["name", "short"]);
  const clases = xmlMapaId_(root.getChild("classes"), "class", "id", ["name", "short"]);
  const salones = xmlMapaId_(root.getChild("classrooms"), "classroom", "id", ["name", "short"]);
  const lecciones = {};
  xmlHijos_(root.getChild("lessons"), "lesson").forEach(function (el) {
    const id = xmlAttr_(el, "id");
    if (!id) return;
    lecciones[id] = {
      classids: xmlAttr_(el, "classids"),
      subjectid: xmlAttr_(el, "subjectid"),
      teacherids: xmlAttr_(el, "teacherids"),
      classroomids: xmlAttr_(el, "classroomids")
    };
  });

  const filasNuevas = [];
  xmlHijos_(root.getChild("cards"), "card").forEach(function (el) {
    const lessonid = xmlAttr_(el, "lessonid");
    const lec = lecciones[lessonid];
    if (!lec) return;
    const period = xmlAttr_(el, "period");
    const per = periodos[period] || { bloque: period, inicio: "", fin: "" };
    const dias = diasDeBitsAsi_(xmlAttr_(el, "days"));
    const salonId = partirIdsAsi_(xmlAttr_(el, "classroomids") || lec.classroomids)[0] || "";
    const salon = salonId && salones[salonId] ? (salones[salonId].name || salones[salonId].short) : "";
    const materia = materias[lec.subjectid] ? (materias[lec.subjectid].name || materias[lec.subjectid].short) : "";
    const teacherIds = partirIdsAsi_(lec.teacherids);
    const classIds = partirIdsAsi_(lec.classids);
    dias.forEach(function (dia) {
      classIds.forEach(function (cid) {
        const cla = clases[cid] || { name: cid, short: cid };
        const gg = gradoGrupoDeClaseAsi_(cla.name || cla.short);
        teacherIds.forEach(function (tid) {
          const t = maestros[tid] || {};
          const maestro = String(t.name || t.short || (String(t.firstname || "") + " " + String(t.lastname || ""))).trim();
          const idH = [lessonid, period, dia, cid, tid].join("|");
          const turnoFila = turnoDeFilaImportada_(per.inicio, turnoForzado);
          filasNuevas.push([
            idH,
            dia,
            turnoFila,
            String(per.bloque || period),
            formatearHoraAsi_(per.inicio) || String(per.inicio || ""),
            formatearHoraAsi_(per.fin) || String(per.fin || ""),
            gg.grado,
            gg.grupo,
            maestro,
            String(materia || "").trim(),
            String(salon || "").trim()
          ]);
        });
      });
    });
  });

  if (!filasNuevas.length) throw new Error("El XML no trae cards (clases colocadas en el horario).");

  const conteoTurnos = {};
  filasNuevas.forEach(function (f) {
    conteoTurnos[f[2]] = (conteoTurnos[f[2]] || 0) + 1;
  });

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (eLock) {
    throw new Error("La hoja de horarios está ocupada. Intenta de nuevo en unos segundos.");
  }
  let locked = true;
  try {
    _verificarYCrearPestanas_();
    const libro = _obtenerLibro_();
    const p = libro.getSheetByName("Horarios");
    const enc = ENCABEZADOS.Horarios;
    const viejas = _leerFilas_("Horarios").filter(function (f) {
      return !conteoTurnos[turnoDe_(f["Turno"])];
    }).map(function (f) {
      return enc.map(function (h) { return f[h] == null ? "" : f[h]; });
    });
    const salida = viejas.concat(filasNuevas);
    p.clearContents();
    p.getRange(1, 1, 1, enc.length).setValues([enc]).setFontWeight("bold");
    const TAM = 400;
    for (let i = 0; i < salida.length; i += TAM) {
      const trozo = salida.slice(i, i + TAM);
      p.getRange(2 + i, 1, trozo.length, enc.length).setValues(trozo);
    }
    if (salida.length) {
      p.getRange(2, 5, salida.length, 2).setNumberFormat("@");
    }
    SpreadsheetApp.flush();
    lock.releaseLock();
    locked = false;
  } finally {
    if (locked) {
      try { lock.releaseLock(); } catch (eRel) {}
    }
  }

  const resumen = Object.keys(conteoTurnos).map(function (t) {
    return conteoTurnos[t] + " clases de " + t;
  }).join(" y ");
  const turnos = Object.keys(conteoTurnos);
  return {
    ok: true,
    turno: turnos.length === 1 ? turnos[0] : turnos.join(","),
    turnos: turnos,
    conteoTurnos: conteoTurnos,
    filas: filasNuevas.length,
    bloques: Object.keys(periodos).length,
    mensaje: "Horario guardado por turno: " + resumen + " (" + Object.keys(periodos).length + " bloques). El otro turno, si ya estaba en la hoja, se conserva."
  };
}

function catalogoPrefectasDemo_() {
  return [
    { id: "P-LAURA", nombre: "Laura Méndez", usuario: "laura", grupos: ["1a", "1b", "1c"] },
    { id: "P-PATRICIA", nombre: "Patricia Solís", usuario: "patricia", grupos: ["1d", "1e", "2a"] },
    { id: "P-CARMEN", nombre: "Carmen Ríos", usuario: "carmen", grupos: ["2b", "2c", "2d"] },
    { id: "P-ELENA", nombre: "Elena Vargas", usuario: "elena", grupos: ["2e", "3a", "3b"] },
    { id: "P-ROCIO", nombre: "Rocío Peña", usuario: "rocio", grupos: ["3c", "3d", "3e"] }
  ];
}

/**
 * Crea 5 prefectas de prueba y les asigna 3 grupos a cada una.
 * Clave de entrada mientras se desarrolla: memo2
 */
function sembrarPrefectasDemo_(token) {
  const props = PropertiesService.getScriptProperties();
  const entorno = String(props.getProperty("ENTORNO") || "").trim().toUpperCase();
  const idConfig = String(props.getProperty("HOJA_ID") || "").trim();
  const ID_PRODUCCION = "1ZxCuV_6O3JcX9E-7y165Q6ofAZRERk9-xj5rYeUhaYU";

  let esAdmin = false;
  if (typeof token !== "undefined" && token !== null && String(token).trim() !== "") {
    const ses = obtenerSesionValida_(token);
    if (!ses || String(ses.rol || "").toLowerCase() !== "admin") {
      throw new Error("Acceso denegado: token de sesión inválido o sin privilegios de administrador.");
    }
    esAdmin = true;
  }

  // Tanto con token como sin token, la siembra demo de prefectas está estrictamente restringida al entorno y libro de pruebas autorizado.
  if (entorno !== "PRUEBAS") {
    throw new Error("Acceso denegado: sembrarPrefectasDemo está estrictamente restringida a ENTORNO=PRUEBAS.");
  }
  if (!idConfig || idConfig === ID_PRODUCCION) {
    throw new Error("Acceso denegado: sembrarPrefectasDemo requiere un ID de libro de pruebas explícito y no puede ser el libro de producción.");
  }

  const libro = _obtenerLibro_();
  if (!libro) throw new Error("No se pudo abrir la hoja.");
  const idReal = typeof libro.getId === "function" ? String(libro.getId() || "").trim() : "";
  if (idReal === ID_PRODUCCION) {
    throw new Error("BLOQUEO DE SEGURIDAD: sembrarPrefectasDemo no puede ejecutarse sobre el libro de producción.");
  }
  if (!idReal || idReal !== idConfig) {
    throw new Error("BLOQUEO DE SEGURIDAD: el libro abierto (" + idReal + ") no coincide con el libro de pruebas configurado (" + idConfig + ").");
  }

  _verificarYCrearPestanas_();
  const pPref = libro.getSheetByName("Prefectos");
  const pAsig = libro.getSheetByName("PrefectoGrupos");
  if (!pPref || !pAsig) throw new Error("No se encontraron las pestañas de prefectura.");
  const clave = "memo2";
  const demo = catalogoPrefectasDemo_();
  const idsDemo = {};
  demo.forEach(function (d) { idsDemo[d.id] = true; });

  const prefs = _leerFilas_("Prefectos").filter(function (f) {
    return !idsDemo[String(f["Id"] || "").trim()];
  });
  const filasPref = prefs.map(function (f) {
    return [
      f["Id"],
      f["Nombre"],
      String(f["Usuario"] || "").trim() || slugUsuarioPref_(f["Nombre"]),
      f["Salt"],
      f["Hash"],
      f["Activo"] || "SI"
    ];
  });
  demo.forEach(function (d) {
    const salt = Utilities.getUuid();
    filasPref.push([d.id, d.nombre, d.usuario || slugUsuarioPref_(d.nombre), salt, hashClave(clave, salt), "SI"]);
  });
  pPref.clearContents();
  pPref.getRange(1, 1, 1, ENCABEZADOS.Prefectos.length).setValues([ENCABEZADOS.Prefectos]).setFontWeight("bold");
  if (filasPref.length) {
    pPref.getRange(2, 1, filasPref.length, ENCABEZADOS.Prefectos.length).setValues(filasPref);
  }

  const asigs = _leerFilas_("PrefectoGrupos").filter(function (f) {
    return !idsDemo[String(f["Id prefecto"] || "").trim()];
  });
  const filasAsig = asigs.map(function (f) {
    return [f["Id prefecto"], f["Grado"], f["Grupo"], f["Turno"] || "matutino"];
  });
  demo.forEach(function (d) {
    d.grupos.forEach(function (g) {
      const gg = gradoGrupoDeClaseAsi_(g);
      filasAsig.push([d.id, gg.grado, gg.grupo, "matutino"]);
    });
  });
  pAsig.clearContents();
  pAsig.getRange(1, 1, 1, ENCABEZADOS.PrefectoGrupos.length).setValues([ENCABEZADOS.PrefectoGrupos]).setFontWeight("bold");
  if (filasAsig.length) {
    pAsig.getRange(2, 1, filasAsig.length, ENCABEZADOS.PrefectoGrupos.length).setValues(filasAsig);
  }
  SpreadsheetApp.flush();
  return {
    ok: true,
    clave: clave,
    prefectas: demo.map(function (d) {
      return { nombre: d.nombre, grupos: d.grupos.join(", ") };
    }),
    mensaje: "5 prefectas listas en libro de pruebas. Clave de cada una: memo2"
  };
}

function fechasLaboralesAsi_(ini, fin) {
  const out = [];
  const tz = Session.getScriptTimeZone() || "America/Mexico_City";
  const d = new Date(String(ini) + "T12:00:00");
  const hasta = new Date(String(fin) + "T12:00:00");
  const dias = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  while (d.getTime() <= hasta.getTime()) {
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) {
      out.push({
        fecha: Utilities.formatDate(d, tz, "yyyy-MM-dd"),
        dia: dias[dow]
      });
    }
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function enteroAsi_(clave, mod) {
  let h = 2166136261;
  const s = String(clave || "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const n = Math.abs(h);
  return n % (mod || 100);
}

function estadoAluDemo_(mat, fecha) {
  const n = enteroAsi_(mat + "|" + fecha, 100);
  const perfil = enteroAsi_(mat, 9);
  if (perfil === 0) {
    if (n < 58) return "P";
    if (n < 72) return "T";
    if (n < 90) return "A";
    if (n < 96) return "J";
    return "PE";
  }
  if (n < 84) return "P";
  if (n < 91) return "T";
  if (n < 96) return "A";
  if (n < 98) return "J";
  return "PE";
}

function obsAluDemo_(est, mat, fecha) {
  if (est === "P") return enteroAsi_("p|" + mat + fecha, 25) === 0 ? "Participó en la formación" : "";
  if (est === "T") return "Llegó tarde a la formación";
  if (est === "A") return enteroAsi_("a|" + mat, 2) === 0 ? "No se presentó" : "Falta sin aviso";
  if (est === "J") return "Justificante médico";
  if (est === "PE") return "Permiso de prefectura";
  return "";
}

function estadoMaeDemo_(idH, fecha) {
  const n = enteroAsi_(idH + "|" + fecha, 100);
  if (n < 86) return "presente";
  if (n < 94) return "retardo";
  return "falta";
}

function obsMaeDemo_(est, maestro, fecha) {
  if (est === "presente") return enteroAsi_("mp|" + maestro + fecha, 22) === 0 ? "Cubrió el bloque completo" : "";
  if (est === "retardo") return "Llegó después del timbre";
  return enteroAsi_("mf|" + maestro, 2) === 0 ? "No cubrió el bloque" : "Comisión fuera del plantel";
}

/**
 * Inventa asistencia de alumnos y maestros (1–24 sep 2026, lunes a viernes)
 * para poder ver reportes con datos y gráficas.
 *
 * POLÍTICA DE SEGURIDAD Y CONTROL DE ACCESO:
 * 1. Con token: Se exige sesión válida con rol 'admin'. Cualquier sesión inválida,
 *    expirada o con rol distinto de 'admin' es rechazada de inmediato con error.
 *    No se permite que un token no administrativo caiga a la modalidad sin token.
 * 2. Sin token: Permitida exclusivamente si ENTORNO === 'PRUEBAS', con un HOJA_ID
 *    de pruebas explícitamente configurado (distinto al libro de producción).
 * 3. En ambos casos, se verifica antes de cualquier escritura que el libro abierto
 *    sea accesible, que su ID real no sea el libro de producción y que coincida
 *    con el ID autorizado.
 */
function sembrarAsistenciaDemo(token) {
  const props = PropertiesService.getScriptProperties();
  const entorno = String(props.getProperty("ENTORNO") || "").trim().toUpperCase();
  const idConfig = String(props.getProperty("HOJA_ID") || "").trim();
  const ID_PRODUCCION = "1ZxCuV_6O3JcX9E-7y165Q6ofAZRERk9-xj5rYeUhaYU";

  if (typeof token !== "undefined" && token !== null && String(token).trim() !== "") {
    const ses = obtenerSesionValida_(token);
    if (!ses || String(ses.rol || "").toLowerCase() !== "admin") {
      throw new Error("Acceso denegado: token de sesión inválido o sin privilegios de administrador.");
    }
  }

  // Tanto con token como sin token, la siembra demo de asistencia está estrictamente restringida al entorno y libro de pruebas autorizado.
  if (entorno !== "PRUEBAS") {
    throw new Error("Acceso denegado: sembrarAsistenciaDemo está estrictamente restringida a ENTORNO=PRUEBAS.");
  }
  if (!idConfig || idConfig === ID_PRODUCCION) {
    throw new Error("Acceso denegado: sembrarAsistenciaDemo requiere un ID de libro de pruebas explícito y no puede ser el libro de producción.");
  }

  const libro = _obtenerLibro_();
  if (!libro) throw new Error("No se pudo abrir la hoja.");
  const idReal = typeof libro.getId === "function" ? String(libro.getId() || "").trim() : "";
  if (idReal === ID_PRODUCCION) {
    throw new Error("BLOQUEO DE SEGURIDAD: sembrarAsistenciaDemo no puede ejecutarse sobre el libro de producción.");
  }
  if (!idReal || idReal !== idConfig) {
    throw new Error("BLOQUEO DE SEGURIDAD: el libro abierto (" + idReal + ") no coincide con el libro de pruebas configurado (" + idConfig + ").");
  }

  ["AsistenciaAlumnos", "AsistenciaMaestros"].forEach(function(nom) {
    let p = libro.getSheetByName(nom);
    if (!p) {
      p = libro.insertSheet(nom);
      const cols = ENCABEZADOS[nom] || [];
      if (cols.length > 0) {
        p.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight("bold");
      }
    }
  });

  asegurarColumnaObservacionAsi_(libro);
  const tz = Session.getScriptTimeZone() || "America/Mexico_City";
  const fechas = fechasLaboralesAsi_("2026-09-01", "2026-09-24");
  const ts = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd HH:mm:ss");

  const mapaTurno = {};
  leerGruposHoja_().forEach(function (g) {
    mapaTurno[claveGrupoAsi_(g.grado, g.grupo)] = turnoDe_(g.turno);
  });
  const mapaPref = {};
  _leerFilas_("PrefectoGrupos").forEach(function (f) {
    const k = claveGrupoAsi_(f["Grado"], f["Grupo"]);
    mapaPref[k] = String(f["Id prefecto"] || "").trim();
  });
  const mapaNomPref = {};
  _leerFilas_("Prefectos").forEach(function (f) {
    mapaNomPref[String(f["Id"] || "").trim()] = String(f["Nombre"] || "").trim();
  });

  const alumnos = (_leerAlumnosResumen_() || []).filter(function (a) {
    return String(a.activo || "SI").toUpperCase() !== "NO";
  });
  const filasAlu = [];
  alumnos.forEach(function (a) {
    const mat = String(a.matricula || a.Matrícula || "").trim();
    const nombre = String(a.nombre || a.nombreCompleto || "").trim();
    const grado = String(a.grado || "").trim();
    const grupo = String(a.grupo || "").trim().toLowerCase();
    if (!mat) return;
    const k = claveGrupoAsi_(grado, grupo);
    const turno = mapaTurno[k] || "matutino";
    const pref = mapaNomPref[mapaPref[k] || ""] || "Prefecto demo";
    fechas.forEach(function (d) {
      const est = estadoAluDemo_(mat, d.fecha);
      filasAlu.push([
        d.fecha, turno, grado, grupo, mat, nombre, est, pref, ts, obsAluDemo_(est, mat, d.fecha)
      ]);
    });
  });

  const pAlu = libro.getSheetByName("AsistenciaAlumnos");
  pAlu.clearContents();
  pAlu.getRange(1, 1, 1, ENCABEZADOS.AsistenciaAlumnos.length).setValues([ENCABEZADOS.AsistenciaAlumnos]).setFontWeight("bold");
  const TAM = 400;
  for (let i = 0; i < filasAlu.length; i += TAM) {
    const trozo = filasAlu.slice(i, i + TAM);
    pAlu.getRange(2 + i, 1, trozo.length, ENCABEZADOS.AsistenciaAlumnos.length).setValues(trozo);
  }

  const filasMae = [];
  const vistos = {};
  _leerFilas_("Horarios").forEach(function (f) {
    const diaFila = String(f["Dia"] || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const grado = String(f["Grado"] || "").trim();
    const grupo = String(f["Grupo"] || "").trim().toLowerCase();
    const bloque = String(f["Bloque"] || "").trim();
    const maestro = String(f["Maestro"] || "").trim();
    if (!maestro || !bloque) return;
    const idH = String(f["Id"] || "").trim() || [diaFila, f["Turno"], bloque, grado, grupo, maestro].join("|");
    const turno = turnoDe_(f["Turno"]);
    const pref = mapaNomPref[mapaPref[claveGrupoAsi_(grado, grupo)] || ""] || "Prefecto demo";
    const asignatura = String(f["Asignatura"] || "").trim();
    fechas.forEach(function (d) {
      if (diaFila && diaFila !== d.dia && diaFila !== "todos") return;
      const clave = d.fecha + "|" + idH;
      if (vistos[clave]) return;
      vistos[clave] = true;
      const est = estadoMaeDemo_(idH, d.fecha);
      filasMae.push([
        d.fecha, turno, bloque, idH, maestro, grado, grupo, asignatura, est, pref, ts, obsMaeDemo_(est, maestro, d.fecha)
      ]);
    });
  });

  const pMae = libro.getSheetByName("AsistenciaMaestros");
  pMae.clearContents();
  pMae.getRange(1, 1, 1, ENCABEZADOS.AsistenciaMaestros.length).setValues([ENCABEZADOS.AsistenciaMaestros]).setFontWeight("bold");
  for (let j = 0; j < filasMae.length; j += TAM) {
    const trozo = filasMae.slice(j, j + TAM);
    pMae.getRange(2 + j, 1, trozo.length, ENCABEZADOS.AsistenciaMaestros.length).setValues(trozo);
  }
  SpreadsheetApp.flush();
  return {
    ok: true,
    alumnos: filasAlu.length,
    maestros: filasMae.length,
    dias: fechas.length,
    periodo: "2026-09-01 a 2026-09-24",
    mensaje: "Asistencia de prueba: " + filasAlu.length + " registros de alumnos y " + filasMae.length + " de maestros (" + fechas.length + " días hábiles)."
  };
}
