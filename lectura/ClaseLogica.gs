/**********************************************************************
 * CLASE HABLADA ST90
 * Maestro publica el texto de cada hora. El alumno oye la clase en curso
 * según el horario aSc (hoja Horarios). Acceso con usuario y contraseña.
 **********************************************************************/

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

function diaHoyClase_() {
  const dias = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  const d = new Date(fechaHoyAsi_() + "T12:00:00");
  return dias[d.getDay()];
}

function slugUsuarioClase_(nombre) {
  return slugUsuarioPref_(nombre);
}

function usuarioClaseLibre_(deseado, ignorarTipo, ignorarClave) {
  let base = slugUsuarioClase_(deseado);
  if (!base || esUsuarioAdminAsistencia_(base)) base = "usuario";
  const usados = {};
  _leerFilas_("MaestrosClase").forEach(function (f) {
    if (ignorarTipo === "maestro" && String(f["Id"] || "") === String(ignorarClave || "")) return;
    const u = normalizarNombrePref_(f["Usuario"] || "");
    if (u) usados[u] = true;
  });
  _leerFilas_("AccesoClaseAlumnos").forEach(function (f) {
    if (ignorarTipo === "alumno" && String(f["Matrícula"] || "") === String(ignorarClave || "")) return;
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

function usuarioAleatorioNuevo_(nombre, ignorarTipo, ignorarClave) {
  const base = slugUsuarioClase_(nombre) || "usuario";
  const suf = String(100 + Math.floor(Math.random() * 900));
  return usuarioClaseLibre_(base + suf, ignorarTipo, ignorarClave);
}

function iniciarSesionClase(usuario, clave) {
  const usu = String(usuario || "").trim();
  const claveIngresada = String(clave || "").trim();
  if (!usu) return { ok: false, mensaje: "Escribe tu usuario." };
  if (!claveIngresada) return { ok: false, mensaje: "Escribe tu contraseña." };

  if (esUsuarioAdminAsistencia_(usu)) {
    const creds = obtenerCredencialesAdminAutoritativas_();
    if (!creds.configurada) {
      return { ok: false, mensaje: "Credenciales de administrador no configuradas en el entorno." };
    }
    const claveAdminOk = (hashClave(claveIngresada, creds.salt) === creds.hash);
    if (!claveAdminOk) return { ok: false, mensaje: "Usuario o contraseña incorrectos." };
    return emitirSesionClase_({
      rol: "admin",
      nombre: "Administrador",
      usuario: USUARIO_ADMIN_ASISTENCIA,
      maestroNombre: ""
    });
  }

  const mae = buscarMaestroClaseLogin_(usu, claveIngresada);
  if (mae) {
    return emitirSesionClase_({
      rol: "maestro",
      nombre: mae.nombre,
      usuario: mae.usuario,
      maestroId: mae.id,
      maestroNombre: mae.nombre
    });
  }

  const alu = buscarAlumnoClaseLogin_(usu, claveIngresada);
  if (alu) {
    return emitirSesionClase_({
      rol: "alumno",
      nombre: alu.nombre,
      usuario: alu.usuario,
      matricula: alu.matricula,
      grado: alu.grado,
      grupo: alu.grupo
    });
  }

  return { ok: false, mensaje: "Usuario o contraseña incorrectos." };
}

function emitirSesionClase_(sesion) {
  const token = Utilities.getUuid();
  const cache = CacheService.getScriptCache();
  cache.put("clase_" + token, JSON.stringify(sesion), 21600);
  if (sesion.rol === "admin") {
    cache.put("admin_" + token, "1", 21600);
  }
  return {
    ok: true,
    token: token,
    rol: sesion.rol,
    nombre: sesion.nombre,
    usuario: sesion.usuario,
    grado: sesion.grado || "",
    grupo: sesion.grupo || "",
    version: VERSION_APP
  };
}

function cerrarSesionClase(token) {
  const t = String(token || "").trim();
  if (!t) return { ok: false, revocado: false, mensaje: "Token no proporcionado." };
  const cache = CacheService.getScriptCache();
  const rawClase = cache.get("clase_" + t);
  if (!rawClase) {
    return { ok: true, revocado: false, mensaje: "Sesión de clase inexistente o ya revocada." };
  }

  const rawSes = cache.get("sesion_" + t);
  if (rawClase === "datos_docente" && rawSes === "sesion_docente") {
    cache.remove("clase_" + t);
    cache.remove("sesion_" + t);
    return { ok: true, revocado: true };
  }

  let sesClase = null;
  try {
    sesClase = JSON.parse(rawClase);
  } catch (eParseClase) {
    cache.remove("clase_" + t);
    Logger.log("Aviso de seguridad en cerrarSesionClase: clave de clase corrupta. Purgada de forma segura.");
    return { ok: false, revocado: false, mensaje: "Sesión de clase corrupta o no verificable." };
  }

  if (!sesClase || typeof sesClase !== "object") {
    cache.remove("clase_" + t);
    return { ok: false, revocado: false, mensaje: "Sesión de clase no verificable." };
  }

  if (rawSes) {
    let sesGeneral = null;
    try {
      sesGeneral = JSON.parse(rawSes);
    } catch (eParseSes) {
      sesGeneral = null;
    }

    if (sesGeneral && typeof sesGeneral === "object") {
      let coincidenciaIdentidad = true;

      const rolClase = String(sesClase.rol || "").toLowerCase();
      const rolGen = String(sesGeneral.rol || "").toLowerCase();
      if (rolClase === "alumno" && rolGen && rolGen !== "alumno") {
        coincidenciaIdentidad = false;
      }

      const matClase = String(sesClase.matricula || "").trim().toLowerCase();
      const matGen = String(sesGeneral.matricula || "").trim().toLowerCase();
      if (matClase && matGen && matClase !== matGen) {
        coincidenciaIdentidad = false;
      }

      const uClase = String(sesClase.usuario || "").trim().toLowerCase();
      const uGen = String(sesGeneral.usuario || "").trim().toLowerCase();
      if (uClase && uGen && uClase !== uGen) {
        coincidenciaIdentidad = false;
      }

      if (coincidenciaIdentidad) {
        cache.remove("sesion_" + t);
      } else {
        Logger.log("Aviso de seguridad en cerrarSesionClase: intento de revocar sesión general ajena con token de clase no coincidente.");
        cache.remove("clase_" + t);
        if (sesClase.rol === "admin" || sesClase.admin) {
          cache.remove("admin_" + t);
        }
        return { ok: false, revocado: false, mensaje: "Relación de identidad entre sesión de clase y sesión general no verificable." };
      }
    }
  }

  if (sesClase.rol === "admin" || sesClase.admin) {
    cache.remove("admin_" + t);
  }
  cache.remove("clase_" + t);
  return { ok: true, revocado: true };
}

function buscarMaestroClaseLogin_(usuario, clave) {
  const uBus = normalizarNombrePref_(usuario);
  const claveIng = String(clave || "").trim();
  const filas = _leerFilas_("MaestrosClase");
  for (let i = 0; i < filas.length; i++) {
    const f = filas[i];
    if (String(f["Activo"] || "SI").toUpperCase() === "NO") continue;
    const uFila = normalizarNombrePref_(f["Usuario"] || "");
    const nomFila = normalizarNombrePref_(f["Nombre"] || "");
    if (uFila !== uBus && nomFila !== uBus) continue;
    const salt = String(f["Salt"] || "");
    const hash = String(f["Hash"] || "");
    const clavePlana = String(f["Clave"] || "").trim();
    let claveOk = false;
    if (salt && hash && hashClave(claveIng, salt) === hash) claveOk = true;
    else if (clavePlana && clavePlana === claveIng) claveOk = true;
    if (!claveOk) continue;
    return {
      id: String(f["Id"] || ""),
      nombre: String(f["Nombre"] || ""),
      usuario: String(f["Usuario"] || "")
    };
  }
  return null;
}

function buscarAlumnoClaseLogin_(usuario, clave) {
  const uBus = normalizarNombrePref_(usuario);
  const claveIng = String(clave || "").trim();
  const filas = _leerFilas_("AccesoClaseAlumnos");
  for (let i = 0; i < filas.length; i++) {
    const f = filas[i];
    if (String(f["Activo"] || "SI").toUpperCase() === "NO") continue;
    const uFila = normalizarNombrePref_(f["Usuario"] || "");
    const matFila = normalizarNombrePref_(f["Matrícula"] || f["Matricula"] || "");
    if (uFila !== uBus && matFila !== uBus) continue;
    const salt = String(f["Salt"] || "");
    const hash = String(f["Hash"] || "");
    const clavePlana = String(f["Clave"] || "").trim();
    let claveOk = false;
    if (salt && hash && hashClave(claveIng, salt) === hash) claveOk = true;
    else if (clavePlana && clavePlana === claveIng) claveOk = true;
    if (!claveOk) continue;
    return {
      matricula: String(f["Matrícula"] || f["Matricula"] || "").trim(),
      nombre: String(f["Nombre"] || ""),
      usuario: String(f["Usuario"] || ""),
      grado: String(f["Grado"] || "").trim(),
      grupo: String(f["Grupo"] || "").trim().toLowerCase()
    };
  }
  return null;
}

function sincronizarMaestrosClase(token) {
  exigirClaseRol_(token, ["admin"]);
  _verificarYCrearPestanas_();
  const nombres = {};
  _leerFilas_("Horarios").forEach(function (f) {
    const n = String(f["Maestro"] || "").trim();
    if (n) nombres[n] = true;
  });
  const existentes = _leerFilas_("MaestrosClase");
  const porNombre = {};
  existentes.forEach(function (f) {
    porNombre[normalizarNombrePref_(f["Nombre"] || "")] = f;
  });
  const libro = _obtenerLibro_();
  const p = libro.getSheetByName("MaestrosClase");
  const enc = ENCABEZADOS.MaestrosClase;
  let alta = 0;
  Object.keys(nombres).sort(function (a, b) {
    return a.localeCompare(b, "es");
  }).forEach(function (nom) {
    if (porNombre[normalizarNombrePref_(nom)]) return;
    const id = "M-" + Utilities.getUuid().slice(0, 8);
    const usuario = usuarioClaseLibre_(nom, "maestro", id);
    p.appendRow([id, nom, usuario, "", "", "SI"]);
    alta++;
  });
  return { ok: true, alta: alta, total: _leerFilas_("MaestrosClase").length, mensaje: alta ? ("Se agregaron " + alta + " maestros del horario.") : "Los maestros del horario ya estaban dados de alta." };
}

function asegurarColumnaClaveMaestrosClase_() {
  const libro = _obtenerLibro_();
  if (!libro) return;
  const p = libro.getSheetByName("MaestrosClase");
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
}

function generarClaveAleatoriaMaestro_() {
  const letras = "abcdefghjkmnpqrstuvwxyz";
  const nums = "23456789";
  let p = "m";
  p += letras.charAt(Math.floor(Math.random() * letras.length));
  for (let i = 0; i < 4; i++) {
    p += nums.charAt(Math.floor(Math.random() * nums.length));
  }
  return p;
}

function listarMaestrosClase(token) {
  exigirClaseRol_(token, ["admin"]);
  asegurarColumnaClaveMaestrosClase_();

  const infoHorarios = {};
  _leerFilas_("Horarios").forEach(function (f) {
    const nom = normalizarNombrePref_(f["Maestro"] || "");
    if (!nom) return;
    if (!infoHorarios[nom]) {
      infoHorarios[nom] = { grupos: {}, asignaturas: {} };
    }
    const gr = String(f["Grado"] || "").trim();
    const gp = String(f["Grupo"] || "").trim();
    if (gr && gp) {
      infoHorarios[nom].grupos[etiquetaGrupoClase_(gr, gp)] = true;
    }
    const asig = String(f["Asignatura"] || "").trim();
    if (asig) {
      infoHorarios[nom].asignaturas[asig] = true;
    }
  });

  const maestros = _leerFilas_("MaestrosClase").map(function (f) {
    const nomNorm = normalizarNombrePref_(f["Nombre"] || "");
    const info = infoHorarios[nomNorm] || { grupos: {}, asignaturas: {} };
    const gruposList = Object.keys(info.grupos).sort();
    const asigList = Object.keys(info.asignaturas).sort();
    return {
      id: String(f["Id"] || ""),
      nombre: String(f["Nombre"] || ""),
      usuario: String(f["Usuario"] || ""),
      clave: "",
      grupos: gruposList,
      asignaturas: asigList,
      activo: String(f["Activo"] || "SI").toUpperCase() !== "NO"
    };
  });

  maestros.sort(function (a, b) {
    return String(a.nombre).localeCompare(String(b.nombre), "es");
  });

  return { ok: true, maestros: maestros };
}

function generarClavesMaestrosClase(token, modo, maestroId) {
  exigirClaseRol_(token, ["admin"]);
  asegurarColumnaClaveMaestrosClase_();

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    throw new Error("El sistema está ocupado. Intenta de nuevo en unos momentos.");
  }

  try {
    const libro = _obtenerLibro_();
    const p = libro.getSheetByName("MaestrosClase");
    if (!p) throw new Error("No se encontró la pestaña MaestrosClase.");

    const idFilt = String(maestroId || "").trim();
    const filas = _leerFilas_("MaestrosClase").filter(function (f) {
      if (String(f["Activo"] || "SI").toUpperCase() === "NO") return false;
      if (modo === "maestro") {
        return String(f["Id"] || "").trim() === idFilt;
      }
      return true;
    });

    if (!filas.length) {
      return { ok: false, total: 0, mensaje: "No se encontraron maestros para generar contraseña." };
    }

    const lastCol = Math.max(p.getLastColumn(), 7);
    const enc = p.getRange(1, 1, 1, lastCol).getValues()[0];
    let colUsu = 3, colSalt = 4, colHash = 5, colActivo = 6, colClave = 7;
    enc.forEach(function (h, i) {
      const n = normalizarNombrePref_(h);
      if (n === "usuario") colUsu = i + 1;
      else if (n === "salt") colSalt = i + 1;
      else if (n === "hash") colHash = i + 1;
      else if (n === "activo") colActivo = i + 1;
      else if (n === "clave") colClave = i + 1;
    });

    let contador = 0;
    filas.forEach(function (f) {
      const nom = String(f["Nombre"] || "");
      const usu = (modo === "maestro" && f["Usuario"])
        ? String(f["Usuario"]).trim()
        : usuarioAleatorioNuevo_(nom, "maestro", f["Id"]);
      const claveNueva = generarClaveAleatoriaMaestro_();
      const salt = Utilities.getUuid();
      const hash = hashClave(claveNueva, salt);

      p.getRange(f._fila, colUsu).setValue(usu);
      p.getRange(f._fila, colSalt).setValue(salt);
      p.getRange(f._fila, colHash).setValue(hash);
      p.getRange(f._fila, colActivo).setValue("SI");
      p.getRange(f._fila, colClave).setNumberFormat("@").setValue("");
      contador++;
    });

    return {
      ok: true,
      total: contador,
      mensaje: (modo === "maestro")
        ? "Contraseña aleatoria generada exitosamente para el maestro."
        : ("Se generaron usuario y contraseña para " + contador + " docentes.")
    };
  } finally {
    lock.releaseLock();
  }
}

function asignarClaveMaestroClase(token, id, usuario, clave) {
  exigirClaseRol_(token, ["admin"]);
  asegurarColumnaClaveMaestrosClase_();
  const claveUso = String(clave || "").trim();
  if (claveUso.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
  const idUso = String(id || "").trim();
  const libro = _obtenerLibro_();
  const p = libro.getSheetByName("MaestrosClase");
  const filas = _leerFilas_("MaestrosClase");
  const fila = filas.filter(function (f) { return String(f["Id"] || "") === idUso; })[0];
  if (!fila) throw new Error("No se encontró al maestro.");
  const usu = usuarioClaseLibre_(usuario || fila["Usuario"] || fila["Nombre"], "maestro", idUso);
  const salt = Utilities.getUuid();
  const hash = hashClave(claveUso, salt);

  const lastCol = Math.max(p.getLastColumn(), 7);
  const enc = p.getRange(1, 1, 1, lastCol).getValues()[0];
  let colUsu = 3, colSalt = 4, colHash = 5, colActivo = 6, colClave = 7;
  enc.forEach(function (h, i) {
    const n = normalizarNombrePref_(h);
    if (n === "usuario") colUsu = i + 1;
    else if (n === "salt") colSalt = i + 1;
    else if (n === "hash") colHash = i + 1;
    else if (n === "activo") colActivo = i + 1;
    else if (n === "clave") colClave = i + 1;
  });

  p.getRange(fila._fila, colUsu).setValue(usu);
  p.getRange(fila._fila, colSalt).setValue(salt);
  p.getRange(fila._fila, colHash).setValue(hash);
  p.getRange(fila._fila, colActivo).setValue("SI");
  p.getRange(fila._fila, colClave).setNumberFormat("@").setValue("");

  return { ok: true, usuario: usu, clave: claveUso, mensaje: "Acceso listo para " + fila["Nombre"] + ". Usuario: " + usu + " · Contraseña: " + claveUso };
}

function normalizarGrupoLetra_(grado, grupo) {
  let g = String(grupo || "").trim().toUpperCase();
  const gr = String(grado || "").trim();
  if (gr && g.indexOf(gr) === 0) {
    g = g.substring(gr.length).replace(/^[-_°\s]+/, "");
  }
  return g;
}

function coincideGrupoClase_(grAlumno, gpAlumno, grFiltro, gpFiltro) {
  const grA = String(grAlumno || "").trim();
  const gpA = String(gpAlumno || "").trim();
  const grF = String(grFiltro || "").trim();
  let gpF = String(gpFiltro || "").trim();

  if (grF && grA !== grF) return false;
  if (!gpF) return true;

  if (gpF.indexOf("|") >= 0) {
    const partes = gpF.split("|");
    const grPart = partes[0].trim();
    if (grPart && grA !== grPart) return false;
    gpF = partes[1].trim();
  }

  const letraA = normalizarGrupoLetra_(grA, gpA).toUpperCase();
  const letraF = normalizarGrupoLetra_(grF || grA, gpF).toUpperCase();
  const etqA = etiquetaGrupoClase_(grA, gpA).toUpperCase();
  const etqF = etiquetaGrupoClase_(grF || grA, gpF).toUpperCase();
  const rawA = gpA.toUpperCase();
  const rawF = gpF.toUpperCase();

  return (letraA && letraA === letraF) ||
         (etqA && etqA === etqF) ||
         (rawA && rawA === rawF);
}

function listarAlumnosParaClase(token, grado, grupo) {
  const ses = exigirClaseRol_(token, ["admin", "maestro"]);
  asegurarColumnaClaveAccesoClase_();
  const gFilt = String(grado || "").trim();
  const gpFilt = String(grupo || "").trim();
  let gruposOk = null;
  if (ses.rol === "maestro") {
    gruposOk = {};
    _leerFilas_("Horarios").forEach(function (f) {
      if (normalizarNombrePref_(f["Maestro"] || "") !== normalizarNombrePref_(ses.maestroNombre || "")) return;
      gruposOk[claveGrupoAsi_(f["Grado"], f["Grupo"])] = true;
    });
  }
  const accesos = {};
  _leerFilas_("AccesoClaseAlumnos").forEach(function (f) {
    accesos[String(f["Matrícula"] || f["Matricula"] || "").trim()] = f;
  });
  const alumnos = _leerFilas_("Alumnos").filter(function (a) {
    if (String(a["Activo"] || "SI").toUpperCase() === "NO") return false;
    const gr = String(a["Grado"] || "").trim();
    const gp = String(a["Grupo"] || "").trim();
    if (!coincideGrupoClase_(gr, gp, gFilt, gpFilt)) return false;
    if (gruposOk && !gruposOk[claveGrupoAsi_(gr, gp)]) return false;
    return true;
  }).map(function (a) {
    const mat = String(a["Matrícula"] || a["Matricula"] || "").trim();
    const acc = accesos[mat];
    const gr = String(a["Grado"] || "").trim();
    const gp = String(a["Grupo"] || "").trim();
    const letra = normalizarGrupoLetra_(gr, gp);
    const etq = etiquetaGrupoClase_(gr, gp);
    return {
      matricula: mat,
      nombre: String(a["Nombre Completo"] || a["Nombre"] || ""),
      grado: gr,
      grupo: letra || gp.toUpperCase(),
      grupoEtq: etq,
      grupoClave: claveGrupoAsi_(gr, gp),
      usuario: acc ? String(acc["Usuario"] || "") : "",
      clave: "",
      conClave: !!(acc && (String(acc["Hash"] || "").trim() || String(acc["Clave"] || "").trim() || String(acc["Usuario"] || "").trim())),
      activo: acc ? String(acc["Activo"] || "SI").toUpperCase() !== "NO" : false
    };
  });
  alumnos.sort(function (a, b) {
    return String(a.nombre).localeCompare(String(b.nombre), "es");
  });
  return { ok: true, alumnos: alumnos };
}

function asignarClaveAlumnoClase(token, matricula, usuario, clave) {
  const ses = exigirClaseRol_(token, ["admin", "maestro"]);
  asegurarColumnaClaveAccesoClase_();
  const mat = String(matricula || "").trim();
  const claveUso = String(clave || "").trim();
  if (!mat) throw new Error("Falta la matrícula.");
  if (claveUso.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
  const alu = _leerFilas_("Alumnos").filter(function (a) {
    return String(a["Matrícula"] || a["Matricula"] || "").trim() === mat;
  })[0];
  if (!alu) throw new Error("No se encontró al alumno.");
  if (ses.rol === "maestro") {
    const k = claveGrupoAsi_(alu["Grado"], alu["Grupo"]);
    let okG = false;
    _leerFilas_("Horarios").forEach(function (f) {
      if (normalizarNombrePref_(f["Maestro"] || "") !== normalizarNombrePref_(ses.maestroNombre || "")) return;
      if (claveGrupoAsi_(f["Grado"], f["Grupo"]) === k) okG = true;
    });
    if (!okG) throw new Error("Ese alumno no está en tus grupos.");
  }
  const usu = usuarioClaseLibre_(usuario || alu["Nombre Completo"] || mat, "alumno", mat);
  const salt = Utilities.getUuid();
  const hash = hashClave(claveUso, salt);
  const libro = _obtenerLibro_();
  const p = libro.getSheetByName("AccesoClaseAlumnos");
  const filas = _leerFilas_("AccesoClaseAlumnos");
  const previa = filas.filter(function (f) {
    return String(f["Matrícula"] || f["Matricula"] || "").trim() === mat;
  })[0];
  const nombre = String(alu["Nombre Completo"] || alu["Nombre"] || "");
  const grado = String(alu["Grado"] || "").trim();
  const grupo = String(alu["Grupo"] || "").trim().toLowerCase();
  if (previa) {
    p.getRange(previa._fila, 1, 1, ENCABEZADOS.AccesoClaseAlumnos.length).setValues([[
      celdaSegura_(mat), celdaSegura_(nombre), celdaSegura_(grado), celdaSegura_(grupo), celdaSegura_(usu), salt, hash, "SI", ""
    ]]);
    p.getRange(previa._fila, 9).setNumberFormat("@");
  } else {
    p.appendRow([celdaSegura_(mat), celdaSegura_(nombre), celdaSegura_(grado), celdaSegura_(grupo), celdaSegura_(usu), salt, hash, "SI", ""]);
    p.getRange(p.getLastRow(), 9).setNumberFormat("@");
  }
  return { ok: true, usuario: usu, clave: claveUso, mensaje: "Acceso listo. Usuario: " + usu + " · Contraseña: " + claveUso };
}

function generarClaveAleatoriaAlumno_() {
  const letras = "abcdefghjkmnpqrstuvwxyz";
  const nums = "23456789";
  let p = "";
  for (let i = 0; i < 2; i++) {
    p += letras.charAt(Math.floor(Math.random() * letras.length));
  }
  for (let i = 0; i < 4; i++) {
    p += nums.charAt(Math.floor(Math.random() * nums.length));
  }
  return p;
}

function generarClavesAlumnosClase(token, grado, grupo, modo, matriculaEspecifica) {
  const ses = exigirClaseRol_(token, ["admin", "maestro"]);
  asegurarColumnaClaveAccesoClase_();

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    throw new Error("El sistema está ocupado. Intenta de nuevo en unos momentos.");
  }

  try {
    const libro = _obtenerLibro_();
    const sheetAcc = libro.getSheetByName("AccesoClaseAlumnos");
    if (!sheetAcc) throw new Error("No se encontró la pestaña AccesoClaseAlumnos.");

    let gruposOk = null;
    if (ses.rol === "maestro") {
      gruposOk = {};
      _leerFilas_("Horarios").forEach(function (f) {
        if (normalizarNombrePref_(f["Maestro"] || "") !== normalizarNombrePref_(ses.maestroNombre || "")) return;
        gruposOk[claveGrupoAsi_(f["Grado"], f["Grupo"])] = true;
      });
    }

    const gFilt = String(grado || "").trim();
    const gpFilt = String(grupo || "").trim();
    const matFilt = String(matriculaEspecifica || "").trim();

    const alumnos = _leerFilas_("Alumnos").filter(function (a) {
      if (String(a["Activo"] || "SI").toUpperCase() === "NO") return false;
      const mat = String(a["Matrícula"] || a["Matricula"] || "").trim();
      const gr = String(a["Grado"] || "").trim();
      const gp = String(a["Grupo"] || "").trim();

      if (modo === "alumno") {
        return mat === matFilt;
      }
      if (modo === "grupo") {
        if (!coincideGrupoClase_(gr, gp, gFilt, gpFilt)) return false;
      }
      if (gruposOk && !gruposOk[claveGrupoAsi_(gr, gp)]) return false;
      return true;
    });

    if (!alumnos.length) {
      return { ok: false, total: 0, mensaje: "No se encontraron alumnos para el grado/grupo seleccionado." };
    }

    const filasAcc = _leerFilas_("AccesoClaseAlumnos");
    const accPorMat = {};
    filasAcc.forEach(function (f) {
      const m = String(f["Matrícula"] || f["Matricula"] || "").trim();
      if (m) accPorMat[m] = f;
    });

    const lastCol = Math.max(sheetAcc.getLastColumn(), 9);
    const enc = sheetAcc.getRange(1, 1, 1, lastCol).getValues()[0];
    let colMat = 1, colNom = 2, colGrado = 3, colGrupo = 4, colUsu = 5, colSalt = 6, colHash = 7, colActivo = 8, colClave = 9;
    enc.forEach(function (h, i) {
      const n = normalizarNombrePref_(h);
      if (n === "matricula") colMat = i + 1;
      else if (n === "nombre") colNom = i + 1;
      else if (n === "grado") colGrado = i + 1;
      else if (n === "grupo") colGrupo = i + 1;
      else if (n === "usuario") colUsu = i + 1;
      else if (n === "salt") colSalt = i + 1;
      else if (n === "hash") colHash = i + 1;
      else if (n === "activo") colActivo = i + 1;
      else if (n === "clave") colClave = i + 1;
    });

    let contador = 0;
    const nuevasFilas = [];

    let ultimoUsuario = "";
    let ultimaClave = "";

    alumnos.forEach(function (alu) {
      const mat = String(alu["Matrícula"] || alu["Matricula"] || "").trim();
      const nom = String(alu["Nombre Completo"] || alu["Nombre"] || "");
      const gr = String(alu["Grado"] || "").trim();
      const gp = String(alu["Grupo"] || "").trim().toLowerCase();

      const previa = accPorMat[mat];
      const usu = (modo === "alumno" && previa && previa["Usuario"])
        ? String(previa["Usuario"]).trim()
        : usuarioAleatorioNuevo_(nom || mat, "alumno", mat);
      const claveNueva = generarClaveAleatoriaAlumno_();
      ultimoUsuario = usu;
      ultimaClave = claveNueva;
      const salt = Utilities.getUuid();
      const hash = hashClave(claveNueva, salt);

      if (previa && previa._fila) {
        sheetAcc.getRange(previa._fila, colUsu).setValue(usu);
        sheetAcc.getRange(previa._fila, colSalt).setValue(salt);
        sheetAcc.getRange(previa._fila, colHash).setValue(hash);
        sheetAcc.getRange(previa._fila, colActivo).setValue("SI");
        sheetAcc.getRange(previa._fila, colClave).setNumberFormat("@").setValue("");
        contador++;
      } else {
        const filaData = new Array(lastCol);
        for (let k = 0; k < lastCol; k++) filaData[k] = "";
        filaData[colMat - 1] = mat;
        filaData[colNom - 1] = nom;
        filaData[colGrado - 1] = gr;
        filaData[colGrupo - 1] = gp;
        filaData[colUsu - 1] = usu;
        filaData[colSalt - 1] = salt;
        filaData[colHash - 1] = hash;
        filaData[colActivo - 1] = "SI";
        filaData[colClave - 1] = "";
        nuevasFilas.push(filaData);
        contador++;
      }
    });

    if (nuevasFilas.length > 0) {
      const startRow = sheetAcc.getLastRow() + 1;
      sheetAcc.getRange(startRow, 1, nuevasFilas.length, lastCol).setValues(nuevasFilas);
      sheetAcc.getRange(startRow, colClave, nuevasFilas.length, 1).setNumberFormat("@");
    }

    try { invalidarCachesDatos_(); } catch (eInv) {}

    return {
      ok: true,
      total: contador,
      usuario: ultimoUsuario,
      clave: ultimaClave,
      mensaje: (modo === "alumno")
        ? "Contraseña aleatoria generada correctamente."
        : ("Se generaron usuario y contraseña para " + contador + " alumnos.")
    };
  } finally {
    lock.releaseLock();
  }
}

function filaHorarioClase_(f) {
  return {
    idHorario: idHorarioClase_(f["Id"] || ""),
    dia: String(f["Dia"] || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
    turno: turnoDe_(f["Turno"]),
    bloque: String(f["Bloque"] || "").trim(),
    horaInicio: formatearHoraAsi_(f["Hora inicio"]),
    horaFin: formatearHoraAsi_(f["Hora fin"]),
    grado: String(f["Grado"] || "").trim(),
    grupo: String(f["Grupo"] || "").trim().toLowerCase(),
    maestro: String(f["Maestro"] || "").trim(),
    asignatura: String(f["Asignatura"] || "").trim(),
    salon: String(f["Salon"] || f["Salón"] || "").trim()
  };
}

function horarioDeMaestroClase_(nombreMaestro, fecha) {
  const nom = normalizarNombrePref_(nombreMaestro);
  const d = new Date(String(fecha || fechaHoyAsi_()) + "T12:00:00");
  const dias = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  const dia = dias[d.getDay()];
  const lista = [];
  _leerFilas_("Horarios").forEach(function (f) {
    if (normalizarNombrePref_(f["Maestro"] || "") !== nom) return;
    const h = filaHorarioClase_(f);
    if (h.dia && h.dia !== dia && h.dia !== "todos") return;
    lista.push(h);
  });
  lista.sort(function (a, b) {
    return horaAMinutos_(a.horaInicio) - horaAMinutos_(b.horaInicio);
  });
  return lista;
}

function horarioDeGrupoClase_(grado, grupo, fecha) {
  const k = claveGrupoAsi_(grado, grupo);
  const d = new Date(String(fecha || fechaHoyAsi_()) + "T12:00:00");
  const dias = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  const dia = dias[d.getDay()];
  const lista = [];
  _leerFilas_("Horarios").forEach(function (f) {
    if (claveGrupoAsi_(f["Grado"], f["Grupo"]) !== k) return;
    const h = filaHorarioClase_(f);
    if (h.dia && h.dia !== dia && h.dia !== "todos") return;
    lista.push(h);
  });
  lista.sort(function (a, b) {
    return horaAMinutos_(a.horaInicio) - horaAMinutos_(b.horaInicio);
  });
  return lista;
}

function claseEnCursoDe_(lista) {
  const ahora = horaAMinutos_(horaAhoraAsi_());
  let actual = null;
  let siguiente = null;
  for (let i = 0; i < lista.length; i++) {
    const ini = horaAMinutos_(lista[i].horaInicio);
    const fin = horaAMinutos_(lista[i].horaFin);
    if (fin <= ini) continue;
    if (ahora >= ini && ahora < fin) {
      actual = lista[i];
      siguiente = lista[i + 1] || null;
      break;
    }
    if (!siguiente && ahora < ini) siguiente = lista[i];
  }
  return { actual: actual, siguiente: siguiente };
}

function buscarContenidoClase_(h, fecha) {
  if (!h) return null;
  const fe = fechaIsoClase_(fecha || fechaHoyAsi_());
  const dia = String(h.dia || "").trim();
  const filas = _leerFilas_("ContenidosClase").filter(function (f) {
    return String(f["Publicado"] || "SI").toUpperCase() !== "NO";
  });
  function coincide(f, exigirFecha) {
    const idH = idHorarioClase_(f["Id horario"]);
    const feF = fechaIsoClase_(f["Fecha"]);
    if (h.idHorario && idH && idH === idHorarioClase_(h.idHorario)) {
      if (exigirFecha) return feF === fe;
      return !feF;
    }
    const mismoGrupo = claveGrupoAsi_(f["Grado"], f["Grupo"]) === claveGrupoAsi_(h.grado, h.grupo);
    const mismaAsig = normalizarNombrePref_(f["Asignatura"] || "") === normalizarNombrePref_(h.asignatura || "");
    const mismoBloque = String(f["Bloque"] || "").trim() === String(h.bloque || "").trim();
    if (!mismoGrupo || !mismaAsig || !mismoBloque) return false;
    if (exigirFecha) return feF === fe;
    if (feF) return false;
    const diaF = String(f["Dia"] || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return !diaF || diaF === dia || diaF === "todos";
  }
  let hit = filas.filter(function (f) { return coincide(f, true); })[0];
  if (!hit) hit = filas.filter(function (f) { return coincide(f, false); })[0];
  if (!hit) return null;
  return {
    id: String(hit["Id"] || ""),
    titulo: String(hit["Titulo"] || hit["Título"] || ""),
    texto: String(hit["Texto"] || ""),
    publicado: true,
    fecha: String(hit["Fecha"] || "")
  };
}

function contenidoDeSlotClase_(h, fecha) {
  const fe = String(fecha || fechaHoyAsi_());
  const filas = _leerFilas_("ContenidosClase");
  let hit = null;
  filas.forEach(function (f) {
    const idH = idHorarioClase_(f["Id horario"]);
    if (h.idHorario && idH === idHorarioClase_(h.idHorario)) {
      const feF = fechaIsoClase_(f["Fecha"]);
      if (feF === fe || !feF) hit = f;
    }
  });
  if (!hit) return { id: "", titulo: "", texto: "", publicado: true, fecha: fe };
  return {
    id: String(hit["Id"] || ""),
    titulo: String(hit["Titulo"] || hit["Título"] || ""),
    texto: String(hit["Texto"] || ""),
    publicado: String(hit["Publicado"] || "SI").toUpperCase() !== "NO",
    fecha: String(hit["Fecha"] || fe)
  };
}

function asegurarColumnaClaveAccesoClase_() {
  const libro = _obtenerLibro_();
  if (!libro) return;
  const p = libro.getSheetByName("AccesoClaseAlumnos");
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
}

function alumnosConAccesoClase_(ses, grado, grupo) {
  asegurarColumnaClaveAccesoClase_();
  const g = String(grado || "").trim();
  const gp = String(grupo || "").trim().toLowerCase();
  let gruposOk = null;
  if (ses && ses.rol === "maestro") {
    gruposOk = {};
    _leerFilas_("Horarios").forEach(function (f) {
      if (normalizarNombrePref_(f["Maestro"] || "") !== normalizarNombrePref_(ses.maestroNombre || "")) return;
      gruposOk[claveGrupoAsi_(f["Grado"], f["Grupo"])] = true;
    });
  }
  return _leerFilas_("AccesoClaseAlumnos").filter(function (f) {
    if (String(f["Activo"] || "SI").toUpperCase() === "NO") return false;
    const gr = String(f["Grado"] || "").trim();
    const gpf = String(f["Grupo"] || "").trim().toLowerCase();
    if (g && gp && claveGrupoAsi_(gr, gpf) !== claveGrupoAsi_(g, gp)) return false;
    if (gruposOk && !gruposOk[claveGrupoAsi_(gr, gpf)]) return false;
    return !!(String(f["Usuario"] || "").trim() || String(f["Hash"] || "").trim());
  }).map(function (f) {
    const gr = String(f["Grado"] || "").trim();
    const gpf = String(f["Grupo"] || "").trim().toLowerCase();
    return {
      matricula: String(f["Matrícula"] || f["Matricula"] || "").trim(),
      nombre: String(f["Nombre"] || ""),
      usuario: String(f["Usuario"] || ""),
      clave: "",
      grado: gr,
      grupo: gpf,
      grupoClave: claveGrupoAsi_(gr, gpf),
      grupoEtq: etiquetaGrupoClase_(gr, gpf),
      conClave: true
    };
  }).sort(function (a, b) {
    return String(a.nombre).localeCompare(String(b.nombre), "es");
  });
}

function etiquetaGrupoClase_(grado, grupo) {
  const gr = String(grado || "").trim();
  const gp = String(grupo || "").trim().toLowerCase();
  const etq = (gr && gp.indexOf(gr) !== 0) ? (gr + gp) : gp;
  return String(etq).toUpperCase();
}

function filasHorarioUso_() {
  const filasH = _leerFilas_("Horarios");
  if (filasH && filasH.length) return filasH;
  if (typeof obtenerFilasHorarioOficialAsc_ !== "function") return [];
  const enc = ENCABEZADOS.Horarios;
  return obtenerFilasHorarioOficialAsc_().map(function (row) {
    const obj = {};
    enc.forEach(function (h, idx) { obj[h] = row[idx]; });
    return obj;
  });
}

function turnosPresentesHorario_(filas) {
  const mapa = {};
  (filas || []).forEach(function (f) {
    mapa[turnoDe_(f["Turno"] || f["turno"])] = true;
  });
  const out = [];
  if (mapa.matutino) out.push("matutino");
  if (mapa.vespertino) out.push("vespertino");
  return out;
}

function turnoPedidoHorario_(pedido, filas) {
  const t = String(pedido || "").trim().toLowerCase();
  if (t.indexOf("vesp") === 0) return "vespertino";
  if (t.indexOf("mat") === 0) return "matutino";
  const presentes = turnosPresentesHorario_(filas);
  return presentes[0] || "matutino";
}

function normalizarVistaHorario_(vista) {
  const v = String(vista || "").trim().toLowerCase();
  if (v === "docente" || v === "maestro") return "docente";
  if (v === "aula" || v === "aulas" || v === "salon") return "aula";
  if (v === "concentrado") return "concentrado";
  return "grupo";
}

function porDiaFiltradoHorario_(filas, turno, predicado) {
  const porDia = {
    lunes: [], martes: [], miercoles: [], jueves: [], viernes: [], sabado: [], domingo: [], todos: []
  };
  (filas || []).forEach(function (f) {
    const h = filaHorarioClase_(f);
    if (turno && h.turno !== turno) return;
    if (predicado && !predicado(h)) return;
    const dia = h.dia || "todos";
    if (!porDia[dia]) porDia[dia] = [];
    porDia[dia].push(h);
  });
  Object.keys(porDia).forEach(function (dia) {
    porDia[dia].sort(function (a, b) {
      return horaAMinutos_(a.horaInicio) - horaAMinutos_(b.horaInicio);
    });
  });
  return porDia;
}

function catalogoVistaHorario_(filas, turno, ses, nomMae) {
  const docentes = {};
  const aulas = {};
  const grupos = {};
  const clases = [];
  const vistos = {};
  (filas || []).forEach(function (f) {
    const h = filaHorarioClase_(f);
    if (h.turno !== turno) return;
    const kG = claveGrupoAsi_(h.grado, h.grupo);
    if (kG && kG !== "|") {
      grupos[kG] = { clave: kG, grado: h.grado, grupo: h.grupo, etq: etiquetaGrupoClase_(h.grado, h.grupo) };
    }
    const propio = !ses || ses.rol === "admin" || !nomMae || normalizarNombrePref_(h.maestro) === nomMae;
    if (propio && h.maestro) docentes[h.maestro] = true;
    if (propio && h.salon) aulas[h.salon] = true;
    if (!propio) return;
    const id = h.idHorario || [h.dia, h.bloque, kG, h.asignatura].join("|");
    if (vistos[id]) return;
    vistos[id] = true;
    const gpLetra = String(h.grupo || "").replace(/^\d+/, "").toUpperCase();
    clases.push({
      idHorario: h.idHorario,
      dia: h.dia,
      bloque: h.bloque,
      horaInicio: h.horaInicio,
      horaFin: h.horaFin,
      grado: h.grado,
      grupo: gpLetra,
      grupoClave: kG,
      asignatura: h.asignatura,
      maestro: h.maestro,
      salon: h.salon,
      turno: h.turno,
      etiqueta: etiquetaGrupoClase_(h.grado, h.grupo) + " · " + (h.asignatura || "Clase") +
        (h.dia ? (" (" + h.dia + (h.bloque ? (" · Hora " + h.bloque) : "") + ")") : "") +
        (h.maestro ? (" · " + h.maestro) : "")
    });
  });
  function ordenarClaves(obj) {
    return Object.keys(obj).sort(function (a, b) { return a.localeCompare(b, "es"); });
  }
  const gruposLista = Object.keys(grupos).sort(function (a, b) {
    return grupos[a].etq.localeCompare(grupos[b].etq, "es");
  }).map(function (k) { return grupos[k]; });
  return {
    docentes: ordenarClaves(docentes),
    aulas: ordenarClaves(aulas),
    gruposTurno: gruposLista,
    clases: clases
  };
}

function gruposDeSesionClase_(ses, turno) {
  const mapa = {};
  const filasH = filasHorarioUso_();
  const turnoFiltro = turno ? turnoDe_(turno) : "";

  filasH.forEach(function (f) {
    if (turnoFiltro && turnoDe_(f["Turno"] || f["turno"]) !== turnoFiltro) return;
    if (ses.rol === "maestro" && normalizarNombrePref_(f["Maestro"] || f["maestro"] || "") !== normalizarNombrePref_(ses.maestroNombre || "")) return;
    const gr = String(f["Grado"] || f["grado"] || "").trim();
    const gp = String(f["Grupo"] || f["grupo"] || "").trim().toLowerCase();
    if (!gr || !gp) return;
    const k = claveGrupoAsi_(gr, gp);
    mapa[k] = { clave: k, grado: gr, grupo: gp, etq: etiquetaGrupoClase_(gr, gp) };
  });

  // Sin filas del turno vespertino no se inventan grupos. El matutino vacío conserva 1A–3E para poder planear.
  if (Object.keys(mapa).length === 0 && turnoFiltro !== "vespertino") {
    ["1", "2", "3"].forEach(function (gr) {
      ["a", "b", "c", "d", "e"].forEach(function (letra) {
        const k = claveGrupoAsi_(gr, letra);
        mapa[k] = { clave: k, grado: gr, grupo: letra, etq: etiquetaGrupoClase_(gr, letra) };
      });
    });
  }

  return Object.keys(mapa).sort(function (a, b) {
    return mapa[a].etq.localeCompare(mapa[b].etq, "es");
  }).map(function (k) { return mapa[k]; });
}

function alumnosDeGrupoClase_(grado, grupo) {
  const k = claveGrupoAsi_(grado, grupo);
  if (!String(grado || "").trim() || !String(grupo || "").trim()) return [];
  return _leerFilas_("Alumnos").filter(function (a) {
    if (String(a["Activo"] || "SI").toUpperCase() === "NO") return false;
    return claveGrupoAsi_(a["Grado"], a["Grupo"]) === k;
  }).map(function (a) {
    return {
      matricula: String(a["Matrícula"] || a["Matricula"] || "").trim(),
      nombre: String(a["Nombre Completo"] || a["Nombre"] || "")
    };
  }).sort(function (a, b) {
    return String(a.nombre).localeCompare(String(b.nombre), "es");
  });
}

function isoFechaClase_(d) {
  const y = d.getFullYear();
  const m = ("0" + (d.getMonth() + 1)).slice(-2);
  const dia = ("0" + d.getDate()).slice(-2);
  return y + "-" + m + "-" + dia;
}

function lunesSemanaClase_(fecha) {
  const d = new Date(String(fecha || fechaHoyAsi_()) + "T12:00:00");
  const dow = d.getDay();
  const delta = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + delta);
  return d;
}

function diasSemanaClase_(fecha, incluirSabado) {
  const lunes = lunesSemanaClase_(fecha);
  const nombres = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  const cortos = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const n = incluirSabado ? 6 : 5;
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(lunes.getTime());
    d.setDate(lunes.getDate() + i);
    out.push({
      fecha: isoFechaClase_(d),
      dia: nombres[i],
      etqCorta: cortos[i],
      etqNum: String(d.getDate())
    });
  }
  return out;
}

function diasPeriodoClase_(fecha, modo, incluirSabado) {
  modo = String(modo || "semana").toLowerCase();
  const nombres = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  const cortos = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  if (modo === "dia") {
    const d = new Date(String(fecha || fechaHoyAsi_()) + "T12:00:00");
    const dow = d.getDay();
    return [{
      fecha: isoFechaClase_(d),
      dia: nombres[dow],
      etqCorta: cortos[dow],
      etqNum: String(d.getDate())
    }];
  }
  if (modo === "mes") {
    const ref = new Date(String(fecha || fechaHoyAsi_()) + "T12:00:00");
    const y = ref.getFullYear();
    const m = ref.getMonth();
    const ultimoDia = new Date(y, m + 1, 0).getDate();
    const out = [];
    for (let i = 1; i <= ultimoDia; i++) {
      const d = new Date(y, m, i, 12, 0, 0);
      const dow = d.getDay();
      if (dow === 0) continue;
      if (dow === 6 && !incluirSabado) continue;
      out.push({
        fecha: isoFechaClase_(d),
        dia: nombres[dow],
        etqCorta: cortos[dow],
        etqNum: String(d.getDate())
      });
    }
    return out;
  }
  return diasSemanaClase_(fecha, incluirSabado);
}

function etiquetaSemanaClase_(fechaIni, fechaFin) {
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const a = new Date(String(fechaIni) + "T12:00:00");
  const b = new Date(String(fechaFin) + "T12:00:00");
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return a.getDate() + " – " + b.getDate() + " de " + meses[a.getMonth()] + " de " + a.getFullYear();
  }
  return a.getDate() + " de " + meses[a.getMonth()] + " – " + b.getDate() + " de " + meses[b.getMonth()] + " de " + b.getFullYear();
}

function horarioSemanaDeGrupoClase_(grado, grupo, turno) {
  const k = claveGrupoAsi_(grado, grupo);
  const turnoFiltro = turno ? turnoDe_(turno) : "";
  return porDiaFiltradoHorario_(filasHorarioUso_(), turnoFiltro, function (h) {
    return claveGrupoAsi_(h.grado, h.grupo) === k;
  });
}

function idHorarioClase_(v) {
  let s = String(v == null ? "" : v).trim();
  if (/^\d+\.0$/.test(s)) s = s.slice(0, -2);
  return s;
}

function fechaIsoClase_(v) {
  const tz = Session.getScriptTimeZone() || "America/Mexico_City";
  if (v instanceof Date && !isNaN(v.getTime())) {
    if (v.getUTCHours() === 0 && v.getUTCMinutes() === 0 && v.getUTCSeconds() === 0) {
      const d = new Date(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate(), 12, 0, 0);
      return Utilities.formatDate(d, tz, "yyyy-MM-dd");
    }
    return Utilities.formatDate(v, tz, "yyyy-MM-dd");
  }
  const s = String(v || "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const dm = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (dm) {
    const a = Number(dm[1]);
    const b = Number(dm[2]);
    const y = dm[3];
    const day = a > 12 ? a : (b > 12 ? b : a);
    const month = a > 12 ? b : (b > 12 ? a : b);
    return y + "-" + ("0" + month).slice(-2) + "-" + ("0" + day).slice(-2);
  }
  const t = Date.parse(s);
  if (!isNaN(t)) {
    return Utilities.formatDate(new Date(t + 12 * 3600 * 1000), tz, "yyyy-MM-dd");
  }
  return fechaCortaAsi_(v);
}

function claveAltContenidoClase_(grado, grupo, asig, bloque, fecha) {
  return [
    claveGrupoAsi_(grado, grupo),
    normalizarNombrePref_(asig),
    String(bloque || "").trim(),
    fechaIsoClase_(fecha)
  ].join("#");
}

function mapaContenidosClase_() {
  const mapa = {};
  _leerFilas_("ContenidosClase").forEach(function (f) {
    const idH = idHorarioClase_(f["Id horario"]);
    const feF = fechaIsoClase_(f["Fecha"]);
    const c = {
      id: String(f["Id"] || ""),
      titulo: String(f["Titulo"] || f["Título"] || ""),
      texto: String(f["Texto"] || ""),
      publicado: String(f["Publicado"] || "SI").toUpperCase() !== "NO",
      fecha: feF
    };
    if (idH) {
      mapa[idH + "|" + feF] = c;
      if (!feF) mapa[idH + "|"] = c;
    }
    const alt = claveAltContenidoClase_(f["Grado"], f["Grupo"], f["Asignatura"], f["Bloque"], feF);
    if (alt && feF) mapa[alt] = c;
  });
  return mapa;
}

function contenidoDeMapaClase_(mapa, h, fecha) {
  const fe = fechaIsoClase_(fecha);
  const idH = idHorarioClase_(h && h.idHorario);
  const vacio = { id: "", titulo: "", texto: "", publicado: true, fecha: fe || "" };
  if (!h) return vacio;
  const alt = claveAltContenidoClase_(h.grado, h.grupo, h.asignatura, h.bloque, fe);
  return (idH && (mapa[idH + "|" + fe] || mapa[idH + "|"])) || mapa[alt] || vacio;
}

function bloquesEstandarSecundaria_() {
  return [
    { bloque: "1", horaInicio: "07:00", horaFin: "07:40" },
    { bloque: "2", horaInicio: "07:40", horaFin: "08:20" },
    { bloque: "3", horaInicio: "08:20", horaFin: "09:00" },
    { bloque: "4", horaInicio: "09:00", horaFin: "09:40" },
    { bloque: "5", horaInicio: "09:40", horaFin: "10:20" },
    { bloque: "6", horaInicio: "10:40", horaFin: "11:20" },
    { bloque: "7", horaInicio: "11:20", horaFin: "12:00" },
    { bloque: "8", horaInicio: "12:00", horaFin: "12:40" }
  ];
}

function horarioBaseSecundariaParaGrupo_(grado, grupo) {
  const gr = String(grado || "1").trim();
  const gp = String(grupo || "a").trim().toLowerCase();
  const dias = ["lunes", "martes", "miercoles", "jueves", "viernes"];
  const bloques = bloquesEstandarSecundaria_();
  const materiasGrado = {
    "1": [
      ["ESPAÑOL", "ABIGAIL", "Aula 1"],
      ["MATEMÁTICAS", "DAVID", "Aula 1"],
      ["CIENCIAS (BIOLOGÍA)", "FRAGOSO", "Lab 1"],
      ["GEOGRAFÍA", "GABRIELA", "Aula 1"],
      ["INGLÉS", "ERIKA", "Aula 1"],
      ["EDUCACIÓN FÍSICA", "AZAEL", "Patio"],
      ["ARTES", "DILERI", "Taller"],
      ["TUTORÍA", "GAMEZ", "Aula 1"]
    ],
    "2": [
      ["ESPAÑOL", "ABIGAIL", "Aula 2"],
      ["MATEMÁTICAS", "DAVID", "Aula 2"],
      ["CIENCIAS (FÍSICA)", "FRAGOSO", "Lab 2"],
      ["HISTORIA", "GABRIELA", "Aula 2"],
      ["INGLÉS", "ERIKA", "Aula 2"],
      ["EDUCACIÓN FÍSICA", "AZAEL", "Patio"],
      ["F.C.E", "DILERI", "Aula 2"],
      ["TECNOLOGÍA", "GAMEZ", "Taller 2"]
    ],
    "3": [
      ["ESPAÑOL", "ABIGAIL", "Aula 3"],
      ["MATEMÁTICAS", "DAVID", "Aula 3"],
      ["CIENCIAS (QUÍMICA)", "FRAGOSO", "Lab 3"],
      ["HISTORIA", "GABRIELA", "Aula 3"],
      ["INGLÉS", "ERIKA", "Aula 3"],
      ["EDUCACIÓN FÍSICA", "AZAEL", "Patio"],
      ["F.C.E", "DILERI", "Aula 3"],
      ["TECNOLOGÍA", "GAMEZ", "Taller 3"]
    ]
  };
  const listaMat = materiasGrado[gr] || materiasGrado["1"];
  const out = { lunes: [], martes: [], miercoles: [], jueves: [], viernes: [], sabado: [], domingo: [], todos: [] };
  dias.forEach(function (dia, dIdx) {
    bloques.forEach(function (bl, bIdx) {
      const matIdx = (bIdx + dIdx) % listaMat.length;
      const mat = listaMat[matIdx];
      const idH = "HOR-" + gr + gp.toUpperCase() + "-" + dia.slice(0, 2).toUpperCase() + "-B" + bl.bloque;
      out[dia].push({
        idHorario: idH,
        dia: dia,
        turno: "matutino",
        bloque: bl.bloque,
        horaInicio: bl.horaInicio,
        horaFin: bl.horaFin,
        grado: gr,
        grupo: gp,
        maestro: mat[1],
        asignatura: mat[0],
        salon: mat[2]
      });
    });
  });
  return out;
}

/**
 * Carga inicial del horario oficial, SOLO si la hoja está completamente vacía.
 *
 * Antes esta función decidía que el horario "no era oficial" cuando tenía menos
 * de 500 filas o no contenía los nombres MIGUEL o KRISTEL, y entonces borraba la
 * hoja con clearContents() para reescribir las 600 clases estáticas. Se llamaba
 * al abrir el panel de cualquier maestro, así que un horario legítimo de otro
 * plantel o una importación parcial se destruían con un clic normal, arrastrando
 * además las referencias de ContenidosClase y AsistenciaMaestros.
 *
 * Ahora es estrictamente aditiva: si la hoja tiene una sola fila de datos, no
 * hace nada. Nunca borra y nunca sobrescribe.
 */
function sembrarHorarioDemoSiVacio_() {
  const libro = _obtenerLibro_();
  if (!libro) return;
  let p = libro.getSheetByName("Horarios");
  if (!p) p = libro.getSheetByName("Horario");
  if (!p) {
    _verificarYCrearPestanas_();
    p = libro.getSheetByName("Horarios");
  }
  if (!p) return;

  // Si ya hay datos, se respeta lo que haya: esta función no es correctiva.
  if (p.getLastRow() > 1) return;

  const filasOficiales = typeof obtenerFilasHorarioOficialAsc_ === "function" ? obtenerFilasHorarioOficialAsc_() : [];
  if (!filasOficiales || !filasOficiales.length) return;

  if (p.getLastRow() === 0) p.appendRow(ENCABEZADOS.Horarios);
  const filaInicio = p.getLastRow() + 1;
  p.getRange(filaInicio, 1, filasOficiales.length, ENCABEZADOS.Horarios.length).setValues(filasOficiales);
  SpreadsheetApp.flush();
}

function horarioMaestroClase(token, fecha, grupoClave, asignatura, modo, turno, vista, sujeto) {
  const ses = exigirClaseRol_(token, ["admin", "maestro"]);
  sembrarHorarioDemoSiVacio_();
  const fe = String(fecha || fechaHoyAsi_());
  const hoy = fechaHoyAsi_();
  const esMaestro = ses.rol === "maestro";
  const nomMae = normalizarNombrePref_(ses.maestroNombre || "");
  const filasTodas = filasHorarioUso_();
  const turnosDisponibles = turnosPresentesHorario_(filasTodas);
  const turnoUso = turnoPedidoHorario_(turno, filasTodas);
  const vistaUso = normalizarVistaHorario_(vista);
  const catalogo = catalogoVistaHorario_(filasTodas, turnoUso, ses, nomMae);

  const grupos = gruposDeSesionClase_(ses, turnoUso);
  let gUso = String(grupoClave || "").trim();
  if (vistaUso === "grupo" && !gUso && grupos.length > 0) {
    gUso = grupos[0].clave;
  }
  const partes = gUso.split("|");
  const grado = String(partes[0] || "").trim();
  const grupo = String(partes[1] || "").trim().toLowerCase();
  let sujetoUso = String(sujeto || "").trim();
  if (vistaUso === "docente") {
    if (esMaestro && (ses.maestroNombre || ses.nombre)) sujetoUso = ses.maestroNombre || ses.nombre;
    if (!sujetoUso && catalogo.docentes.length) sujetoUso = catalogo.docentes[0];
  }
  // Sin aula elegida, o el valor "todas", la hoja muestra cada salón del turno lado a lado.
  if (vistaUso === "aula") {
    const pedidoAula = sujetoUso.toLowerCase();
    if (!pedidoAula || pedidoAula === "todas") sujetoUso = "todas";
  }
  const alumnos = (vistaUso === "grupo") ? alumnosConAccesoClase_(ses, grado, grupo) : [];
  let porDia = { lunes: [], martes: [], miercoles: [], jueves: [], viernes: [], sabado: [], domingo: [], todos: [] };
  if (vistaUso === "grupo" && grado && grupo) {
    porDia = horarioSemanaDeGrupoClase_(grado, grupo, turnoUso);
  } else if (vistaUso === "docente" && sujetoUso) {
    porDia = porDiaFiltradoHorario_(filasTodas, turnoUso, function (h) {
      return normalizarNombrePref_(h.maestro) === normalizarNombrePref_(sujetoUso);
    });
  } else if (vistaUso === "aula" && sujetoUso !== "todas") {
    porDia = porDiaFiltradoHorario_(filasTodas, turnoUso, function (h) {
      return normalizarNombrePref_(h.salon) === normalizarNombrePref_(sujetoUso);
    });
  } else if (vistaUso === "aula" && esMaestro) {
    const aulasPropias = {};
    (catalogo.aulas || []).forEach(function (a) { aulasPropias[normalizarNombrePref_(a)] = true; });
    porDia = porDiaFiltradoHorario_(filasTodas, turnoUso, function (h) {
      return !!aulasPropias[normalizarNombrePref_(h.salon)];
    });
  } else if (vistaUso === "aula" || vistaUso === "concentrado") {
    porDia = porDiaFiltradoHorario_(filasTodas, turnoUso, null);
  }
  const haySab = ((porDia.sabado || []).length > 0);
  const puedeDias = vistaUso !== "grupo" || (grado && grupo);
  // La hoja impresa es la semana del día elegido, aunque el control siga en día o mes.
  const diasSem = puedeDias ? diasPeriodoClase_(fe, "semana", haySab) : [];

  const mapaAsig = {};
  Object.keys(porDia).forEach(function (dia) {
    (porDia[dia] || []).forEach(function (h) {
      const n = String(h.asignatura || "").trim();
      if (n) mapaAsig[n] = true;
    });
  });
  const asignaturas = Object.keys(mapaAsig).sort(function (a, b) {
    return a.localeCompare(b, "es");
  });
  const asPedida = String(asignatura || "").trim();
  const asExiste = asignaturas.some(function (n) {
    return normalizarNombrePref_(n) === normalizarNombrePref_(asPedida);
  });
  const asUso = asExiste ? asPedida : "";
  const mapaCont = mapaContenidosClase_();

  function enriquecer_(lista, fechaDia) {
    let uso = lista.slice();
    if (asUso) {
      uso = uso.filter(function (h) {
        return normalizarNombrePref_(h.asignatura) === normalizarNombrePref_(asUso);
      });
    }
    const curso = (fechaDia === hoy) ? claseEnCursoDe_(uso) : { actual: null };
    return uso.map(function (h) {
      const c = contenidoDeMapaClase_(mapaCont, h, fechaDia);
      const propia = ses.rol === "admin" || normalizarNombrePref_(h.maestro) === nomMae;
      return Object.assign({}, h, {
        fecha: fechaDia,
        grupoEtq: etiquetaGrupoClase_(h.grado, h.grupo),
        contenido: c,
        enCurso: !!(curso.actual && curso.actual.idHorario === h.idHorario),
        propia: propia
      });
    });
  }

  const calendario = diasSem.map(function (d) {
    let lista = (porDia[d.dia] || []).concat(porDia.todos || []);
    lista.sort(function (a, b) {
      return horaAMinutos_(a.horaInicio) - horaAMinutos_(b.horaInicio);
    });
    return Object.assign({}, d, {
      hoy: d.fecha === hoy,
      horario: enriquecer_(lista, d.fecha)
    });
  });

  const bloquesMap = {};
  // El docente solo ve los periodos donde él tiene clase. Grupo, aula y concentrado
  // usan todos los periodos del turno, para que la columna vacía del impreso siga ahí.
  const fuenteBloques = (vistaUso === "docente") ? porDia : porDiaFiltradoHorario_(filasTodas, turnoUso, null);
  Object.keys(fuenteBloques).forEach(function (dia) {
    (fuenteBloques[dia] || []).forEach(function (h) {
      const k = String(h.horaInicio || "") + "|" + String(h.horaFin || "");
      if (!bloquesMap[k]) {
        bloquesMap[k] = {
          clave: k,
          horaInicio: h.horaInicio,
          horaFin: h.horaFin,
          bloque: h.bloque
        };
      }
    });
  });
  // 2. Si no hubiera bloques registrados, proveer los 8 bloques de secundaria
  if (Object.keys(bloquesMap).length === 0) {
    bloquesEstandarSecundaria_().forEach(function (b) {
      const k = b.horaInicio + "|" + b.horaFin;
      bloquesMap[k] = {
        clave: k,
        horaInicio: b.horaInicio,
        horaFin: b.horaFin,
        bloque: b.bloque
      };
    });
  }
  const bloques = Object.keys(bloquesMap).sort(function (a, b) {
    return horaAMinutos_(bloquesMap[a].horaInicio) - horaAMinutos_(bloquesMap[b].horaInicio);
  }).map(function (k) { return bloquesMap[k]; });

  const horarioHoy = (calendario.filter(function (d) { return d.fecha === fe; })[0] ||
    calendario.filter(function (d) { return d.hoy; })[0] ||
    { horario: [] }).horario;

  const semanaIni = diasSem.length ? diasSem[0].fecha : fe;
  const semanaFin = diasSem.length ? diasSem[diasSem.length - 1].fecha : fe;

  let concentrado = null;
  if (vistaUso === "concentrado") {
    const diasConc = diasSem.map(function (d) {
      const celdas = {};
      const lista = (porDia[d.dia] || []).concat(porDia.todos || []);
      lista.forEach(function (h) {
        const k = claveGrupoAsi_(h.grado, h.grupo);
        const bk = String(h.horaInicio || "") + "|" + String(h.horaFin || "");
        if (!celdas[k]) celdas[k] = {};
        if (!celdas[k][bk]) celdas[k][bk] = [];
        const c = contenidoDeMapaClase_(mapaCont, h, d.fecha);
        const propia = ses.rol === "admin" || normalizarNombrePref_(h.maestro) === nomMae;
        celdas[k][bk].push(Object.assign({}, h, {
          fecha: d.fecha,
          grupoEtq: etiquetaGrupoClase_(h.grado, h.grupo),
          contenido: c,
          propia: propia
        }));
      });
      return Object.assign({}, d, { hoy: d.fecha === hoy, celdas: celdas });
    });
    concentrado = { grupos: catalogo.gruposTurno, bloques: bloques, dias: diasConc };
  }

  return {
    ok: true,
    fecha: fe,
    modo: modo || "semana",
    dia: diaHoyClase_(),
    hora: horaAhoraAsi_(),
    rol: ses.rol,
    nombre: ses.nombre,
    grupos: grupos,
    grupoClave: gUso,
    alumnos: alumnos,
    asignaturas: asignaturas,
    asignatura: asUso,
    semanaInicio: semanaIni,
    semanaFin: semanaFin,
    semanaEtq: diasSem.length ? etiquetaSemanaClase_(semanaIni, semanaFin) : "",
    bloques: bloques,
    calendario: calendario,
    horario: horarioHoy,
    turno: turnoUso,
    turnosDisponibles: turnosDisponibles,
    vista: vistaUso,
    sujeto: sujetoUso,
    docentes: catalogo.docentes,
    aulas: catalogo.aulas,
    clasesTurno: catalogo.clases,
    concentrado: concentrado
  };
}

function guardarContenidoClase(token, payload) {
  const ses = exigirClaseRol_(token, ["admin", "maestro"]);
  payload = payload || {};
  const idHorario = String(payload.idHorario || "").trim();
  if (!idHorario) throw new Error("Falta la clase del horario.");
  const filaH = _leerFilas_("Horarios").filter(function (f) {
    return idHorarioClase_(f["Id"]) === idHorarioClase_(idHorario);
  })[0];
  if (!filaH) throw new Error("No se encontró esa hora en el horario.");
  const h = filaHorarioClase_(filaH);
  if (ses.rol === "maestro" && normalizarNombrePref_(h.maestro) !== normalizarNombrePref_(ses.maestroNombre || "")) {
    throw new Error("Esa clase no es tuya.");
  }
  const titulo = String(payload.titulo || "").trim();
  const texto = String(payload.texto || "").trim();
  if (!texto) throw new Error("Escribe el contenido que el alumno va a escuchar.");
  const fecha = fechaIsoClase_(payload.fecha || fechaHoyAsi_());
  const publicado = payload.publicado === false || String(payload.publicado) === "NO" ? "NO" : "SI";

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (eLock) {
    throw new Error("El sistema de contenidos está ocupado. Intenta nuevamente en unos segundos.");
  }
  let locked = true;
  try {
    const libro = _obtenerLibro_();
    const p = libro.getSheetByName("ContenidosClase");
    const filas = _leerFilas_("ContenidosClase");
    let previa = filas.filter(function (f) {
      return idHorarioClase_(f["Id horario"]) === idHorarioClase_(idHorario) && fechaIsoClase_(f["Fecha"]) === fechaIsoClase_(fecha);
    })[0];
    if (!previa) {
      previa = filas.filter(function (f) {
        return idHorarioClase_(f["Id horario"]) === idHorarioClase_(idHorario) && !fechaIsoClase_(f["Fecha"]);
      })[0];
    }
    const id = (previa && String(previa["Id"] || "")) || ("C-" + Utilities.getUuid().slice(0, 10));
    const filaVal = [
      id, idHorario, h.maestro, h.asignatura, h.grado, h.grupo, h.dia, h.bloque,
      fecha, titulo, texto, "", publicado, new Date()
    ];
    if (previa) p.getRange(previa._fila, 1, 1, ENCABEZADOS.ContenidosClase.length).setValues([filaVal]);
    else p.appendRow(filaVal);
    const filaEscrita = previa ? previa._fila : p.getLastRow();
    p.getRange(filaEscrita, 9).setNumberFormat("@").setValue(fecha);
    SpreadsheetApp.flush();
    lock.releaseLock();
    locked = false;
    return { ok: true, id: id, mensaje: publicado === "SI" ? "Contenido publicado." : "Borrador guardado." };
  } finally {
    if (locked) {
      try { lock.releaseLock(); } catch (e) {}
    }
  }
}

function contextoClaseAlumno(token, fecha) {
  const ses = exigirClaseRol_(token, ["alumno"]);
  const hoy = fechaHoyAsi_();
  const fe = String(fecha || hoy);
  const porDia = horarioSemanaDeGrupoClase_(ses.grado, ses.grupo);
  const haySab = ((porDia.sabado || []).length > 0);
  const diasSem = diasSemanaClase_(fe, haySab);
  const mapaCont = mapaContenidosClase_();
  const listaHoy = horarioDeGrupoClase_(ses.grado, ses.grupo, hoy);
  const curso = claseEnCursoDe_(listaHoy);
  const actualHoy = curso.actual;

  function enriquecer_(lista, fechaDia) {
    return lista.map(function (h) {
      const cRaw = contenidoDeMapaClase_(mapaCont, h, fechaDia);
      const hay = !!(cRaw && cRaw.publicado !== false && String(cRaw.texto || "").trim());
      return Object.assign({}, h, {
        fecha: fechaDia,
        grupoEtq: etiquetaGrupoClase_(h.grado, h.grupo),
        contenido: hay ? cRaw : { id: "", titulo: "", texto: "", publicado: true, fecha: fechaDia },
        publicado: hay,
        enCurso: !!(actualHoy && fechaDia === hoy && actualHoy.idHorario === h.idHorario)
      });
    });
  }

  const calendario = diasSem.map(function (d) {
    const lista = (porDia[d.dia] || []).concat(porDia.todos || []);
    lista.sort(function (a, b) {
      return horaAMinutos_(a.horaInicio) - horaAMinutos_(b.horaInicio);
    });
    return Object.assign({}, d, {
      hoy: d.fecha === hoy,
      horario: enriquecer_(lista, d.fecha)
    });
  });

  const bloquesMap = {};
  calendario.forEach(function (d) {
    d.horario.forEach(function (h) {
      const k = String(h.horaInicio || "") + "|" + String(h.horaFin || "");
      if (!bloquesMap[k]) {
        bloquesMap[k] = { clave: k, horaInicio: h.horaInicio, horaFin: h.horaFin, bloque: h.bloque };
      }
    });
  });
  const bloques = Object.keys(bloquesMap).sort(function (a, b) {
    return horaAMinutos_(bloquesMap[a].horaInicio) - horaAMinutos_(bloquesMap[b].horaInicio);
  }).map(function (k) { return bloquesMap[k]; });

  const semanaIni = diasSem.length ? diasSem[0].fecha : fe;
  const semanaFin = diasSem.length ? diasSem[diasSem.length - 1].fecha : fe;
  const actual = actualHoy ? Object.assign({}, actualHoy, {
    fecha: hoy,
    grupoEtq: etiquetaGrupoClase_(actualHoy.grado, actualHoy.grupo),
    enCurso: true,
    contenido: (function () {
      const cRaw = contenidoDeMapaClase_(mapaCont, actualHoy, hoy);
      const hay = !!(cRaw && cRaw.publicado !== false && String(cRaw.texto || "").trim());
      return hay ? cRaw : { id: "", titulo: "", texto: "", publicado: true, fecha: hoy };
    })(),
    publicado: !!(function () {
      const cRaw = contenidoDeMapaClase_(mapaCont, actualHoy, hoy);
      return cRaw && cRaw.publicado !== false && String(cRaw.texto || "").trim();
    })()
  }) : null;

  return {
    ok: true,
    alumno: {
      nombre: ses.nombre,
      grado: ses.grado,
      grupo: etiquetaGrupoClase_(ses.grado, ses.grupo)
    },
    fecha: fe,
    dia: diaHoyClase_(),
    hora: horaAhoraAsi_(),
    clase: actual,
    siguiente: curso.siguiente ? Object.assign({}, curso.siguiente, {
      fecha: hoy,
      grupoEtq: etiquetaGrupoClase_(curso.siguiente.grado, curso.siguiente.grupo)
    }) : null,
    contenido: actual ? actual.contenido : null,
    semanaInicio: semanaIni,
    semanaFin: semanaFin,
    semanaEtq: diasSem.length ? etiquetaSemanaClase_(semanaIni, semanaFin) : "",
    bloques: bloques,
    calendario: calendario
  };
}

function textoPruebaAsignaturaClase_(asig, indiceDia, maestro, fecha, bloque) {
  const n = normalizarNombrePref_(asig);
  const mae = String(maestro || "tu maestra o maestro").trim() || "tu maestra o maestro";
  const hora = String(bloque || "").trim();
  const temas = [];
  if (n.indexOf("matemat") >= 0) {
    temas.push(
      { titulo: "Números naturales", texto: "Hoy en Matemáticas vamos a recordar los números naturales. Son los que usamos para contar: uno, dos, tres, y así sucesivamente. Practicaremos leer cantidades en voz alta y comparar cuál es mayor." },
      { titulo: "Suma y resta", texto: "En esta clase de Matemáticas practicamos sumas y restas. La suma junta cantidades. La resta quita una cantidad de otra. Escucha cada ejemplo y trata de resolverlo en tu mente antes de oír el resultado." },
      { titulo: "Multiplicación", texto: "Hoy el tema es la multiplicación. Multiplicar es sumar el mismo número varias veces. Por ejemplo, tres por cuatro es tres más tres más tres más tres, y eso da doce." },
      { titulo: "Fracciones", texto: "Vamos a hablar de fracciones. Una fracción representa una parte de un entero. Un medio es la mitad. Un cuarto es una de cuatro partes iguales. Imagina una manzana partida en partes iguales." },
      { titulo: "Problemas de la vida diaria", texto: "Cerramos la semana de Matemáticas con problemas. Si compras dos cuadernos de veinte pesos, gastas cuarenta. Si pagas con un billete de cincuenta, te regresan diez. Así usamos las matemáticas todos los días." }
    );
  } else if (n.indexOf("espanol") >= 0 || n.indexOf("lengua") >= 0) {
    temas.push(
      { titulo: "Escuchar un cuento", texto: "Hoy en Español vamos a escuchar un cuento corto. Presta atención a quiénes son los personajes, dónde ocurre la historia y qué problema tienen que resolver." },
      { titulo: "Idea principal", texto: "En esta clase de Español practicamos encontrar la idea principal de un texto. La idea principal es lo más importante que el autor quiere decir. Los detalles solo apoyan esa idea." },
      { titulo: "Sustantivos y verbos", texto: "Hoy repasamos sustantivos y verbos. El sustantivo nombra personas, animales o cosas. El verbo dice la acción. En la frase El alumno escucha, alumno es sustantivo y escucha es verbo." },
      { titulo: "Acentuación", texto: "Esta clase de Español es sobre el acento. Algunas palabras se pronuncian con más fuerza en una sílaba. Escuchar bien esa sílaba ayuda a entender y a escribir después con tilde cuando hace falta." },
      { titulo: "Resumen oral", texto: "Al final de la semana, en Español, hacemos un resumen oral. Un resumen dice lo esencial con pocas palabras: de qué trata el texto, quién participa y cómo termina." }
    );
  } else if (n.indexOf("geograf") >= 0) {
    temas.push(
      { titulo: "¿Qué estudia la Geografía?", texto: "Hoy en Geografía vamos a entender qué estudia esta materia. La Geografía describe la Tierra: montañas, ríos, climas, países y cómo vivimos las personas en cada lugar." },
      { titulo: "Mapas y puntos cardinales", texto: "En esta clase de Geografía hablamos de mapas. Un mapa es un dibujo de un lugar visto desde arriba. Los puntos cardinales son norte, sur, este y oeste. El norte queda arriba en la mayoría de los mapas." },
      { titulo: "Relieve de México", texto: "Hoy el tema es el relieve de México. Nuestro país tiene sierras, mesetas y llanuras. Las sierras son montañas largas. Las llanuras son terrenos más planos, buenos para cultivar." },
      { titulo: "Climas de México", texto: "Esta clase de Geografía trata del clima. En México hay lugares calurosos, templados y fríos. Cerca del mar suele hacer más calor. En las montañas altas el aire es más frío." },
      { titulo: "Estados y capital", texto: "Cerramos la semana de Geografía con la organización del país. México se divide en estados. La capital es la Ciudad de México. Cada estado tiene ciudades, pueblos y tradiciones propias." }
    );
  } else if (n.indexOf("historia") >= 0) {
    temas.push(
      { titulo: "¿Qué es la Historia?", texto: "Hoy en Historia vamos a entender para qué sirve. La Historia cuenta lo que ocurrió antes, para comprender el presente. Escuchamos relatos de personas, pueblos y fechas importantes." },
      { titulo: "Línea del tiempo", texto: "En esta clase armamos una línea del tiempo. Primero suceden unos hechos y después otros. Antes, durante y después nos ayudan a ordenar la historia." },
      { titulo: "Culturas mesoamericanas", texto: "Hoy hablamos de las culturas mesoamericanas. En el territorio de México vivieron pueblos como los olmecas, mayas y mexicas. Cada uno dejó templos, calendarios y costumbres." },
      { titulo: "La Conquista", texto: "Esta clase trata de la Conquista. En el siglo dieciséis llegaron los españoles. Hubo encuentros, alianzas y guerras. Ese proceso cambió la lengua, la religión y la forma de vivir." },
      { titulo: "México independiente", texto: "Cerramos la semana de Historia con la Independencia. En mil ochocientos diez comenzó el movimiento para que México fuera un país libre. El dieciséis de septiembre lo recordamos cada año." }
    );
  } else if (n.indexOf("ciencia") >= 0 || n.indexOf("biolog") >= 0 || n.indexOf("quimic") >= 0) {
    temas.push(
      { titulo: "Los seres vivos", texto: "Hoy en Ciencias hablamos de los seres vivos. Los seres vivos nacen, crecen, se alimentan, se relacionan y mueren. Las plantas, los animales y las personas somos seres vivos." },
      { titulo: "El cuerpo humano", texto: "En esta clase de Ciencias repasamos el cuerpo humano. Tenemos huesos que nos sostienen, músculos que nos mueven y órganos como el corazón y los pulmones que trabajan todo el tiempo." },
      { titulo: "Estados de la materia", texto: "Hoy el tema es la materia. La materia puede ser sólida, líquida o gaseosa. El hielo es sólido, el agua es líquida y el vapor es gas. El mismo material puede cambiar de estado." },
      { titulo: "El agua", texto: "Esta clase de Ciencias trata del agua. El agua es indispensable para la vida. Circula en la naturaleza: se evapora, forma nubes y cae como lluvia. Hay que cuidarla y no desperdiciarla." },
      { titulo: "Cuidado del ambiente", texto: "Cerramos la semana de Ciencias cuidando el ambiente. Separar basura, no tirar plásticos y ahorrar agua son acciones simples. Si cada persona ayuda, el entorno de la escuela y del pueblo mejora." }
    );
  } else if (n.indexOf("civica") >= 0 || n.indexOf("etica") >= 0 || n.indexOf("formacion") >= 0) {
    temas.push(
      { titulo: "Convivir en la escuela", texto: "Hoy en Formación Cívica y Ética hablamos de convivir. En la escuela todos merecemos respeto. Escuchar, pedir la palabra y ayudar a un compañero hace el salón más seguro y amable." },
      { titulo: "Derechos y responsabilidades", texto: "En esta clase repasamos derechos y responsabilidades. Tienes derecho a aprender y a ser tratado con dignidad. También tienes la responsabilidad de cumplir las reglas y cuidar el material." },
      { titulo: "La empatía", texto: "Hoy el tema es la empatía. Empatía es ponerte en el lugar de otra persona. Si alguien no ve bien, como algunos compañeros, podemos describirle el salón y leerle en voz alta." },
      { titulo: "Reglas justas", texto: "Esta clase trata de las reglas. Las reglas no son para molestar: sirven para que nadie salga lastimado y todos puedan participar. Si una regla no se entiende, se puede preguntar con calma." },
      { titulo: "Ciudadanía", texto: "Cerramos la semana pensando en ciudadanía. Ser ciudadano es cuidar lo común: el patio, el agua, las ideas de los demás. Desde primero de secundaria ya practicamos esa responsabilidad." }
    );
  } else if (n.indexOf("tecnolog") >= 0) {
    temas.push(
      { titulo: "¿Qué es la tecnología?", texto: "Hoy en Tecnología vemos que no solo son computadoras. Una silla, un lápiz o un reloj también son tecnología: objetos hechos para resolver un problema de la vida diaria." },
      { titulo: "Materiales", texto: "En esta clase clasificamos materiales. Hay materiales duros como el metal, flexibles como la tela y frágiles como el vidrio. Elegir el material correcto hace que un objeto dure y sea seguro." },
      { titulo: "El proceso técnico", texto: "Hoy seguimos un proceso técnico: pensar el problema, imaginar una solución, hacerla y probar si funciona. Si no funciona, se corrige. Así se inventan las cosas." },
      { titulo: "Seguridad en el taller", texto: "Esta clase es de seguridad. En el taller se camina con cuidado, se usan las herramientas como indica el maestro y no se juega con materiales. Cuidarnos es parte del trabajo técnico." },
      { titulo: "Proyecto de la semana", texto: "Cerramos Tecnología describiendo un proyecto simple: un organizador o un objeto útil para el salón. Primero se dice para qué sirve, luego de qué está hecho y al final cómo se usa." }
    );
  } else if (n.indexOf("ingles") >= 0 || n.indexOf("english") >= 0) {
    temas.push(
      { titulo: "Greetings", texto: "Today in English we practice greetings. Hello, good morning, good afternoon, good bye. Also: my name is, and how are you. Repeat each phrase slowly after you hear it." },
      { titulo: "The alphabet", texto: "In this English class we listen to the alphabet. A, B, C, D. We spell simple names. Spelling helps you say your name clearly in English." },
      { titulo: "Colors and numbers", texto: "Today we practice colors and numbers. Red, blue, green, yellow. One to ten. Listen and repeat: one, two, three, four, five." },
      { titulo: "The classroom", texto: "This class is about classroom words. Door, window, chair, book, teacher, student. Imagine each object as you hear the word." },
      { titulo: "A short dialogue", texto: "We finish the week with a short dialogue. Hello, how are you. I am fine, thank you. What is your name. My name is Alejandro. Nice to meet you." }
    );
  } else if (n.indexOf("educacion fisica") >= 0 || (n.indexOf("fisica") >= 0 && n.indexOf("educacion") >= 0)) {
    temas.push(
      { titulo: "Calentamiento", texto: "Hoy en Educación Física empezamos con calentamiento. Mover cuello, hombros, brazos y piernas despacio evita lesiones. Respira profundo antes de cualquier juego." },
      { titulo: "Coordinación", texto: "En esta clase practicamos coordinación. Saltar, girar y cambiar de dirección con control. Escucha las indicaciones del maestro y cuenta los tiempos en voz alta si te ayuda." },
      { titulo: "Trabajo en equipo", texto: "Hoy el tema es el trabajo en equipo. En un juego se gana y se pierde, pero siempre se respeta al compañero. Animar a los demás es parte del deporte." },
      { titulo: "Hábitos saludables", texto: "Esta clase habla de hábitos. Dormir suficiente, tomar agua y moverse cada día cuida el cuerpo. El receso también sirve para activarse." },
      { titulo: "Juego limpio", texto: "Cerramos la semana con juego limpio. Seguir las reglas, aceptar al árbitro y dar la mano al terminar. Así el deporte enseña respeto." }
    );
  } else if (n.indexOf("arte") >= 0 || n.indexOf("musica") >= 0 || n.indexOf("artist") >= 0) {
    temas.push(
      { titulo: "Los sentidos y el arte", texto: "Hoy en Artes exploramos cómo sentimos una obra. El arte se ve, se oye y a veces se toca. Vamos a describir sonidos, ritmos y formas con palabras claras." },
      { titulo: "Ritmo", texto: "En esta clase practicamos el ritmo. Palmas suaves: uno, dos, tres, cuatro. El ritmo ordena la música. Puedes marcarlo con las manos sobre las rodillas." },
      { titulo: "Colores y emociones", texto: "Hoy relacionamos colores y emociones. El azul puede sentirse calma. El rojo, energía. Aunque no veas el color, puedes imaginar la emoción que nombra el maestro." },
      { titulo: "Una canción tradicional", texto: "Esta clase escuchamos una canción tradicional mexicana. Pon atención a la letra, al coro y a los instrumentos. Después di qué parte te gustó más." },
      { titulo: "Crear en equipo", texto: "Cerramos Artes creando en equipo. Cada quien aporta una idea: un verso, un ritmo o una descripción. Juntos armamos una pieza breve para el grupo 1C." }
    );
  } else if (n.indexOf("tutor") >= 0) {
    temas.push(
      { titulo: "Bienvenida a la semana", texto: "Hoy en Tutoría saludamos la semana. ¿Cómo llegaste a la escuela? Si algo te preocupa, se puede decir con respeto. Este espacio es para acompañarte." },
      { titulo: "Organizar el tiempo", texto: "En esta clase organizamos el tiempo. Primero las tareas importantes, luego el descanso. Un horario hablado te ayuda a saber qué sigue." },
      { titulo: "Pedir ayuda", texto: "Hoy hablamos de pedir ayuda. Pedir ayuda no es debilidad. Si no escuchaste una instrucción, se puede repetir. Maestros y compañeros pueden apoyarte." },
      { titulo: "Cuidar la convivencia", texto: "Esta tutoría trata de la convivencia. Burlas y gritos lastiman. Si alguien te molesta, cuéntalo a un adulto de confianza en la escuela." },
      { titulo: "Cierre de la semana", texto: "Cerramos la tutoría de la semana. Piensa una cosa que aprendiste y una que quieres mejorar. El lunes empezamos de nuevo, con calma." }
    );
  }
  const i = Math.abs(Number(indiceDia) || 0) % (temas.length || 1);
  const base = temas.length ? temas[i] : {
    titulo: "Clase de " + (asig || "hoy"),
    texto: "Esta es una clase de prueba de " + (asig || "la materia") + " para el grupo 1C. Escucha con atención la explicación y las indicaciones de " + mae + "."
  };
  let t = "Grupo 1C. ";
  if (hora) t += "Hora " + hora + ". ";
  t += "Con " + mae + ". ";
  t += base.texto;
  t += " Este es un contenido de prueba para la semana del 21 al 25 de septiembre de 2026.";
  return { titulo: base.titulo, texto: t };
}

/**
 * Siembra contenidos de prueba para el grupo 1C en la semana 21-25 sep 2026.
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
function _sembrarContenidoPrueba1C_(token) {
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

  // Tanto con token como sin token, la siembra demo está estrictamente restringida al entorno y libro de pruebas autorizado.
  if (entorno !== "PRUEBAS") {
    throw new Error("Acceso denegado: _sembrarContenidoPrueba1C_ está estrictamente restringida a ENTORNO=PRUEBAS.");
  }
  if (!idConfig || idConfig === ID_PRODUCCION) {
    throw new Error("Acceso denegado: _sembrarContenidoPrueba1C_ requiere un ID de libro de pruebas explícito y no puede ser el libro de producción.");
  }

  const libro = _obtenerLibro_();
  if (!libro) throw new Error("No se pudo abrir la hoja.");
  const idReal = typeof libro.getId === "function" ? String(libro.getId() || "").trim() : "";
  if (idReal === ID_PRODUCCION) {
    throw new Error("BLOQUEO DE SEGURIDAD: _sembrarContenidoPrueba1C_ no puede ejecutarse sobre el libro de producción.");
  }
  if (!idReal || idReal !== idConfig) {
    throw new Error("BLOQUEO DE SEGURIDAD: el libro abierto (" + idReal + ") no coincide con el libro de pruebas configurado (" + idConfig + ").");
  }

  let p = libro.getSheetByName("ContenidosClase");
  if (!p) {
    p = libro.insertSheet("ContenidosClase");
    const cols = ENCABEZADOS.ContenidosClase || [];
    if (cols.length > 0) {
      p.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight("bold");
    }
  }

  const fechasPorDia = {
    lunes: "2026-09-21",
    martes: "2026-09-22",
    miercoles: "2026-09-23",
    jueves: "2026-09-24",
    viernes: "2026-09-25"
  };
  const indiceDia = { lunes: 0, martes: 1, miercoles: 2, jueves: 3, viernes: 4 };
  const existentes = {};
  const existentesAlt = {};
  _leerFilas_("ContenidosClase").forEach(function (f) {
    const idH = idHorarioClase_(f["Id horario"]);
    const fe = fechaIsoClase_(f["Fecha"]);
    if (idH && fe) existentes[idH + "|" + fe] = f;
    const alt = claveAltContenidoClase_(f["Grado"], f["Grupo"], f["Asignatura"], f["Bloque"], fe);
    if (alt && fe) existentesAlt[alt] = f;
  });
  let alta = 0;
  let actualizados = 0;
  const asignaturas = {};
  const vistos = {};
  _leerFilas_("Horarios").forEach(function (f) {
    if (etiquetaGrupoClase_(f["Grado"], f["Grupo"]) !== "1C") return;
    const h = filaHorarioClase_(f);
    const idH = h.idHorario || [h.dia, h.bloque, h.grado, h.grupo, h.asignatura].join("|");
    if (!h.asignatura) return;
    const dias = (h.dia === "todos" || !h.dia) ? Object.keys(fechasPorDia) : [h.dia];
    dias.forEach(function (dia) {
      const fecha = fechasPorDia[dia];
      if (!fecha) return;
      const clave = idH + "|" + fecha;
      if (vistos[clave]) return;
      vistos[clave] = true;
      asignaturas[h.asignatura] = true;
      const tema = textoPruebaAsignaturaClase_(h.asignatura, indiceDia[dia] || 0, h.maestro, fecha, h.bloque);
      const alt = claveAltContenidoClase_(h.grado, h.grupo, h.asignatura, h.bloque, fecha);
      const previa = existentes[clave] || existentesAlt[alt];
      const id = (previa && String(previa["Id"] || "")) || ("C-" + Utilities.getUuid().slice(0, 10));
      const filaVal = [
        id, idH, h.maestro, h.asignatura, h.grado, h.grupo, h.dia, h.bloque,
        fecha, tema.titulo, tema.texto, "", "SI", new Date()
      ];
      if (previa) {
        p.getRange(previa._fila, 1, 1, ENCABEZADOS.ContenidosClase.length).setValues([filaVal]);
        p.getRange(previa._fila, 9).setNumberFormat("@").setValue(fecha);
        actualizados++;
      } else {
        p.appendRow(filaVal);
        p.getRange(p.getLastRow(), 9).setNumberFormat("@").setValue(fecha);
        alta++;
      }
    });
  });
  const listaAsig = Object.keys(asignaturas).sort(function (a, b) { return a.localeCompare(b, "es"); });
  return {
    ok: true,
    alta: alta,
    actualizados: actualizados,
    asignaturas: listaAsig,
    mensaje: "Contenido de prueba listo para 1C, semana del 21 al 25 de septiembre de 2026. " +
      (alta + actualizados) + " clases. Materias: " + listaAsig.join(", ") + "."
  };
}
