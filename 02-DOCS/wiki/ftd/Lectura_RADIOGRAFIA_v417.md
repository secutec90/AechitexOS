# Radiografía técnica — Suite Escolar ST90 (Lectura)

**Institución:** Escuela Secundaria Técnica N.° 90  
**Versión de plataforma:** `v417` (`VERSION_APP` en `00_Constantes.gs`)  
**Lectura:** 28 de octubre de 2026, hora del centro de México  
**Proyecto Apps Script (clasp):** `1ZEO8UIBu91bDGSV8WPM9J5M3JvvXLgJb7ICqGVulYjnDeJHarSLRvkik`  
**Despliegue de panel, clase y censo:** `ID_DEPLOY_CLASE` en `00_Constantes.gs`  
**Despliegue de asistencia para Google Sites:** `ID_DEPLOY_ASISTENCIA` en `00_Constantes.gs`  
**Stack:** Google Apps Script (motor V8) + Google Sheets + HTML5 / CSS / JavaScript propio. El aula hablada usa Web Speech API. DeepSeek solo entra si hay clave en las propiedades del script.

Esta radiografía sustituye la de `v409`. Aquella citaba `Codigo.gs` y números de línea que ya no existen: el servidor está partido en los archivos de abajo. Los enlaces `file:///g:/...` de esa versión tampoco aplican.

---

## 1. Mapa del servidor

22 archivos `.gs`, 22 088 líneas (`wc -l`) y 444 funciones. La entrada web es una sola: `doGet` en `02_Rutas.gs`. `include()` arma el HTML.

| Archivo | Responsabilidad |
| --- | --- |
| `00_Constantes.gs` | Versión, pesos de calificación, especificaciones por grado, encabezados de hoja, despliegues |
| `01_Hoja.gs` | Apertura del libro, caché, `celdaSegura_` y separación pruebas / producción |
| `02_Rutas.gs` | `doGet`, portal y `include` |
| `03_Setup.gs` | Pestañas, migraciones y configuración |
| `04_Sesiones.gs` | Login unificado, hash del administrador, tokens y revocación |
| `05_Panel.gs` | Resúmenes del panel y detalle de lecturas |
| `06_Alumnos.gs` | Padrón, grupos, cupos e intentos |
| `07_Preguntas.gs` | Reactivos del banco |
| `08_Trimestral.gs` | Calendario trimestral y evaluación del alumno |
| `09_IA.gs` | Clave de DeepSeek, clasificación de niveles y respaldos |
| `10_Resultados.gs` | PPM, calificación global y `guardarResultadosExamen` |
| `11_Lecturas.gs` | Banco de lecturas y generación asistida |
| `12_Importacion.gs` | Alta de alumnos desde Excel |
| `13_BancoLocal.gs` | Textos de respaldo del banco |
| `14_Simulados.gs` | Resultados de prueba |
| `15_DirectorioEncuentas.gs` | Directorio de encuestas y resumen con IA |
| `16_EncuestasDemo.gs` | Siembra y borrado de encuestas de demostración |
| `Asistencia.gs` | Pase de lista, prefectos e importación de horario |
| `ClaseLogica.gs` | Sesión de clase, claves de docentes y alumnos, contenidos |
| `Encuestas.gs` | Formulario público, respuestas y banco de reactivos |
| `PlaneacionNEM.gs` | Planeaciones, sesiones, publicación y asistencia DeepSeek |
| `HorarioOficial.gs` | 7 808 líneas: las 600 clases del horario aSc embebidas en una función |

`appsscript.json` publica la aplicación para cualquiera, de forma anónima, ejecutando como quien despliega. `doGet` permite incrustar la página en un marco (`ALLOWALL`), porque el panel vive también dentro de Google Sites.

Comprobación de sintaxis de esta lectura: cada `.gs` se copió a `.js` y se pasó por `node --check`. Resultado: 22 correctos, 0 errores. Eso no reejecuta la suite de comportamiento de `.rsc/test_cierre_definitivo.js`. Esa suite apuntaba a `Codigo.gs` y no se volvió a correr aquí. No debe citarse como evidencia vigente.

---

## 2. Rutas y roles

`doGet` lee `pagina`, `p`, `modo`, `view` o `modulo`.

| Vista | Parámetro | Plantilla | Quién entra |
| --- | --- | --- | --- |
| Estilo de interfaz | `estilo`, `ui`, `guia-ui`, `estiloui` | `EstiloUiSt90.html` | Sin login. Es la guía visual. |
| Censo | `encuesta`, `censo`, `formulario`, `diagnostico` | `FormularioEncuesta.html` | Público. Escribe en la hoja de respuestas. |
| Administración | `admin`, `administracion`, `administrador` | `Admin.html` con `modoVista=admin` | Administrador |
| Docente | `docente`, `docentes`, `maestro`, `maestros` | `Admin.html` con `modoVista=docente` | Docente |
| Asistencia | la resuelve `esVistaAsistencia_` | `Admin.html` con `modoVista=asistencia` | Prefectura |
| Alumno | `alumno`, `estudiante`, o el parámetro `mat` | `Interfaz.html` | Alumno de comprensión lectora |
| Clase hablada | la resuelve `esVistaClase_` | `Clase.html` | Alumno o docente, según `esVistaClaseMaestro_` |
| Portal | vacío, `login`, `portal`, `inicio` | `Admin.html` con `modoVista=portal` | Login unificado |

`doGet` rechaza por URL las siembras y las mutaciones sin sesión (`st90sim`, `sembrar`, `cargarSimulados`, `repararResultados`). No hay `doPost`.

El login unificado está en `iniciarSesionUnificada` (`04_Sesiones.gs`). El token dura 21 600 segundos (6 horas) en `CacheService`, bajo `sesion_<token>` y una clave por rol. La revocación existe.

| Rol | Credencial | Alcance |
| --- | --- | --- |
| Administrador | Hash y sal en propiedades del script (`CLAVE_ADMIN_HASH`, `CLAVE_ADMIN_SALT`). Se fija a mano con `fijarClaveAdminInicial_`. | Panel completo. |
| Prefectura | Hoja `Prefectos`. El login compara sal y hash. | Solo los grupos de `PrefectoGrupos`. |
| Docente | Hoja `MaestrosClase`, vía `buscarMaestroClaseLogin_`. | Horario, banco personal, repositorio y clase. |
| Alumno de clase | Hoja `AccesoClaseAlumnos`, por usuario o matrícula. | Clase hablada y, con el mismo login unificado, la sesión de alumno. |
| Alumno de lectura | La plantilla `Interfaz.html` acepta matrícula y token ya emitidos. El padrón vive en `Alumnos`. | Examen, PPM, historial y boleta. |

La calificación de lectura usa 70 % comprensión y 30 % velocidad (`PESO_COMPRENSION`, `PESO_VELOCIDAD`). Las metas de palabras, PPM y número de preguntas están en `ESPECIFICACIONES_GRADO` para 1.°, 2.° y 3.°.

---

## 3. Panel administrador

`Admin.html` incluye, en este orden: `ComunCSS`, `AdminCSS`, `AdminPlaneacionCSS`, `AdminEncuestasCSS`, `AdminUsuarios`, `AdminAsistencia`, `AdminLecturas`, `AdminPlaneacion`, `AdminEncuestas`, `ComunJS`, los fragmentos `AdminPlanJS_*`, `AdminEncJS_*` y `AdminJS_*`.

La cinta de primer nivel tiene cinco pestañas:

| Pestaña | Botón | Módulo |
| --- | --- | --- |
| Usuarios | `#btnTabMat` | `AdminUsuarios.html` |
| Asistencia | `#btnTabAsi` | `AdminAsistencia.html` |
| Lecturas | `#btnTabLec` | `AdminLecturas.html` |
| Planeación didáctica | `#btnTabPlan` | `AdminPlaneacion.html`, con `#cintaPlan` |
| Diagnóstico y encuestas | `#btnTabEnc` | `AdminEncuestas.html` |

`#cintaEnc` está en el HTML y forzada a `display:none`. La navegación de encuestas vive en la barra del propio módulo (gráficas, datos, editor). Configuración (`#btnTabCfg`) no es una sexta pestaña de primer nivel: abre velocidad lectora, intentos, PDA, contraseña, sitio, identidad, datos de prueba, inteligencia artificial y hoja de datos.

`ESTILO_UI_ST90.md` sigue describiendo solo Usuarios, Asistencia y Lecturas, en la referencia v303. `PROMPT_UI_ST90.md` está en v293. `ENLACES_UI.md` sigue marcado `@409`. `REGLA_UI_CINTA.md` ya se declara obsoleto. Esta radiografía es la que corresponde al código `v417`.

---

## 4. Libro de cálculo

El identificador de producción está en `01_Hoja.gs` (`ID_HOJA_DEFAULT`). Si no hay propiedades, el script se inicializa solo en `PRODUCCION` con ese libro. Un entorno `PRUEBAS` no puede abrir el libro de producción.

Encabezados canónicos en `ENCABEZADOS` (`00_Constantes.gs`):

| Hoja | Columnas que declara el código | Filas con datos el 28 oct 2026 |
| --- | --- | --- |
| `Alumnos` | Matrícula, Nombre Completo, Grado, Grupo, Activo, Intentos extra | 75 |
| `Grupos` | Grado, Grupo, Activo, Intentos extra, Turno | 15 |
| `Prefectos` | Id, Nombre, Usuario, Salt, Hash, Activo, Clave | 5 |
| `PrefectoGrupos` | Id prefecto, Grado, Grupo, Turno | 15 |
| `Horarios` | Id, Día, Turno, Bloque, horas, Grado, Grupo, Maestro, Asignatura, Salón | 600 |
| `MaestrosClase` | Id, Nombre, Usuario, Salt, Hash, Activo, Clave | 21 |
| `AccesoClaseAlumnos` | Matrícula, Nombre, Grado, Grupo, Usuario, Salt, Hash, Activo, Clave | 75 |
| `PersonalApoyo` | Id, Nombre, Usuario, Área, Salt, Hash, Activo, Clave | 0 |
| `ContenidosClase` | Id, horario, maestro, texto, audio, publicado | 45 |
| `AsistenciaAlumnos` | Fecha, turno, grupo, matrícula, estado, prefecto | 1 360 |
| `AsistenciaMaestros` | Fecha, bloque, maestro, estado | 2 160 |
| `Lecturas` | ID, Grado, Asignatura, Tema, Texto, Palabras, Preguntas JSON, Activa, Origen | 85 |
| `Preguntas` | ID Lectura, Orden, Enunciado, opciones, Respuesta correcta, Nivel | 1 404 |
| `Resultados` | Marca, alumno, tiempos, aciertos, PPM, intento, trimestre, token | 392 |
| `Config` | Clave, Valor | 10 |
| `PlaneacionesNEM` | 24 columnas: de `Id` a `EsCopiaDe` | 7 |
| `SesionesNEM` | 20 columnas: cuatro momentos, guion docente, guion accesible, horario | 21 |

El mismo libro tiene además `Formulario` (8 filas), `Respuestas` (200) y `DirectorioEncuestas` (3). Esas tres no están en `ENCABEZADOS`; las usa el módulo de encuestas.

Los conteos son una fotografía de ese día. No se copian nombres, matrículas ni claves en este documento.

---

## 5. Planeación didáctica NEM

Reglas leídas en `PlaneacionNEM.gs`, no en la radiografía anterior.

1. **Propiedad.** `exigirPropietarioPlaneacion_` deja pasar al administrador. Un docente solo modifica la planeación cuyo `DocentePropietario` (o `Docente`) coincide con su nombre. Si la fila vieja no trae dueño, el código la deja pasar para no romper datos heredados.
2. **Lectura.** `exigirLecturaPlaneacion_` permite leer lo `PUBLICADA`, `APROBADO` o `TERMINADA`. El borrador de otro docente no se lee.
3. **Estados.** El alta queda en `BORRADOR`. Editar una planeación `APROBADO` la regresa a `EN_REVISION`. Publicar escribe `PUBLICADA`.
4. **Clonado.** `clonarPlaneacionAGlobal` copia la planeación y sus sesiones con identificadores nuevos, dueño = quien clona, estado `BORRADOR` y `EsCopiaDe` apuntando al original.
5. **Publicación.** `publicarPlaneacionEnRepositorio` exige autoría (o administrador), el número de sesiones declarado, y en cada sesión apertura, desarrollo, actividad, cierre y guion accesible.
6. **Borrado.** `eliminarPlaneacionNEM` solo lo hace el autor o el administrador, y borra también las sesiones.
7. **Sesión.** Cada sesión es de 40 minutos, en cuatro momentos. El guion accesible alimenta el aula hablada.

`LockService` cubre `crearOActualizarPlaneacionNEM`. No cubre clonar, publicar, borrar, guardar sesión, aprobar ni calendarizar. Dos docentes guardando a la vez pueden pisarse la fila.

---

## 6. Hallazgos de esta lectura

### El libro se descarga sin sesión

El 28 de octubre de 2026 el libro de producción respondió a una exportación sin cuenta de Google. Quien tiene el enlace de la carpeta de código también tiene el identificador, porque está escrito en `01_Hoja.gs`.

Eso alcanza padrón, asistencia, resultados (incluye género), 200 respuestas de censo con nombre de estudiante, y las columnas de acceso. Son datos de menores.

### Las contraseñas también están en la hoja

| Hoja | Qué se observó |
| --- | --- |
| `Config` | La primera fila trae la contraseña de administración en texto legible. Más abajo están `CLAVE_ADMIN_SALT` y `CLAVE_ADMIN_HASH`. |
| `Prefectos` | Las 5 filas tienen sal, hash y la columna `Clave` llena. El login de prefectura solo compara el hash. |
| `MaestrosClase` | Las 21 filas tienen hash y `Clave` en texto. |
| `AccesoClaseAlumnos` | Las 75 filas tienen hash y `Clave` en texto. |

`buscarMaestroClaseLogin_` y `buscarAlumnoClaseLogin_` aceptan la columna `Clave` cuando el hash no coincide. Al asignar una clave nueva, el código intenta dejar esa celda vacía. El libro observado no está vacío, así que las claves ya guardadas siguen sirviendo para entrar y siguen siendo legibles.

La clave de DeepSeek no está en `Config`. `09_IA.gs` la guarda en propiedades del script y, si la encuentra en la hoja, la mueve y borra la celda.

### Concurrencia incompleta

Hay candado en el guardado del examen, en la clasificación de niveles, en la importación de alumnos, en parte de la asistencia, en el guardado de formulario y en crear o actualizar una planeación.

No hay candado en el alta y la baja de alumnos, en cambiar grupo, en clonar o publicar planeaciones, ni en varias rutinas de siembra y de horario. `LockService` es la regla del proyecto para no perder filas cuando dos personas escriben a la vez. Esas rutas todavía no la cumplen.

### Dos proyectos de encuestas

`avances.md` dice que el constructor quedó unido al script de Lectura en `@395`. La carpeta `constructor/` sigue en el repositorio, con otro Script ID, otra hoja y su propio `LEEME.md`. Ese léeme deja pendiente cambiar la contraseña de panel por defecto.

### Horario duplicado

Las 600 clases están en la hoja `Horarios` y, otra vez, dentro de `HorarioOficial.gs`. Cualquier cambio de horario hay que hacerlo en los dos lados o el embebido miente.

---

## 7. Lo que el código ya cuida

- La contraseña de administración no está hardcodeada en el fuente. El hash usa sal y SHA-256 (`hashClave`).
- `doGet` no ejecuta siembras anónimas.
- `01_Hoja.gs` no deja que el entorno de pruebas abra el libro de producción.
- `celdaSegura_` antepone un apóstrofo si el texto parece una fórmula.
- Las sesiones se pueden revocar, y una sesión de clase no revoca la de otra persona.
- El aula hablada y la planeación distinguen borrador personal de lo ya publicado.

---

## 8. Cierre que esta radiografía deja pendiente

1. Quitar el acceso de «cualquiera con el enlace» al libro. Solo debe abrirlo la cuenta que ejecuta el script.
2. Rotar la clave de administración, las de docentes, las de prefectos y las de alumnos. Vaciar la columna `Clave`.
3. Dejar de aceptar la clave en texto dentro de `buscarMaestroClaseLogin_` y `buscarAlumnoClaseLogin_`.
4. Dejar de publicar la carpeta del código con el enlace abierto, o sacar de ella el identificador del libro.
5. Poner `LockService` en las escrituras que faltan, y alinear `ENLACES_UI.md` y `ESTILO_UI_ST90.md` con `v417`.

Hasta que el punto 1 esté hecho, el hash y los roles no protegen los datos: el libro se lee por fuera de la aplicación.
