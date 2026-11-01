# Radiografía técnica — Suite Escolar ST90

**Institución:** Escuela Secundaria Técnica N.° 90  
**Nombre del producto:** ST90 (el repositorio y la carpeta de Drive siguen llamándose Lectura)  
**Versión de plataforma:** `v418` · `build-564` (`VERSION_APP` y `BUILD_APP` en `00_Constantes.gs`)  
**Commit leído:** `1f54c0d` en `main` de `secutec90/Lectura`  
**Hora de esa versión:** 31 de octubre de 2026, 23:12, hora del centro de México  
**Hora de esta radiografía:** 31 de octubre de 2026, 23:26, hora del centro de México  
**Proyecto Apps Script (clasp):** `1ZEO8UIBu91bDGSV8WPM9J5M3JvvXLgJb7ICqGVulYjnDeJHarSLRvkik`  
**Despliegue de clase hablada:** `ID_DEPLOY_CLASE` en `00_Constantes.gs`  
**Despliegue de asistencia para Google Sites:** `ID_DEPLOY_ASISTENCIA` en `00_Constantes.gs`  
**Zona del script:** `America/Mexico_City`  
**Stack:** Google Apps Script (motor V8) + Google Sheets + HTML5 / CSS / JavaScript propio. El aula hablada y el asistente de planeación usan Web Speech API. DeepSeek solo entra si hay clave en las propiedades del script.

Esta radiografía sustituye la de `v417` (`02-DOCS/wiki/ftd/Lectura_RADIOGRAFIA_v417.md`). El servidor ya no es un solo `Codigo.gs`. La bitácora `ESTADO_COORDINACION.md` todavía escribe «última versión desplegada `@562` / `v417`»: el fuente de `main` ya declara `v418` · `build-564`.

---

## 1. Qué es

ST90 es la suite de la Secundaria Técnica 90. En un mismo script conviven:

- comprensión lectora (textos, reactivos, PPM, calificación 70 % comprensión y 30 % velocidad);
- pase de lista de alumnos y de docentes;
- clase hablada (aula accesible, con audio y guion);
- planeación didáctica de la Nueva Escuela Mexicana, Fase 6;
- censo y encuestas;
- biblioteca de recursos (libros SEP y archivos del docente).

La entrada web es una sola: `doGet` en `02_Rutas.gs`. `include()` arma el HTML. No hay `doPost`.

`appsscript.json` publica la aplicación para cualquiera, de forma anónima, ejecutando como quien despliega. Los alcances OAuth son hojas de cálculo, Drive y peticiones externas (DeepSeek).

---

## 2. Mapa del servidor

Archivos `.gs` en la raíz del repositorio, leídos esta noche. No se volvió a contar líneas ni se repitió `node --check`. El conteo de 22 archivos y 22 088 líneas pertenece a la lectura del 28 de octubre; desde entonces entró `Biblioteca.gs` y el fuente siguió creciendo hasta `build-564`.

| Archivo | Responsabilidad |
| --- | --- |
| `00_Constantes.gs` | Versión, escuela, pesos, metas por grado, encabezados, identificadores de despliegue |
| `01_Hoja.gs` | Apertura del libro, caché, `celdaSegura_` y separación pruebas / producción |
| `02_Rutas.gs` | `doGet`, portal e `include` |
| `03_Setup.gs` | Pestañas, migraciones y configuración |
| `04_Sesiones.gs` | Login unificado, hash del administrador, tokens y revocación |
| `05_Panel.gs` | Resúmenes del panel y detalle de lecturas |
| `06_Alumnos.gs` | Padrón, grupos, cupos e intentos |
| `07_Preguntas.gs` | Reactivos del banco |
| `08_Trimestral.gs` | Calendario trimestral y evaluación del alumno |
| `09_IA.gs` | Clave de DeepSeek, clasificación de niveles y respaldos |
| `10_Resultados.gs` | PPM, calificación global y guardado del examen |
| `11_Lecturas.gs` | Banco de lecturas y generación asistida |
| `12_Importacion.gs` | Alta de alumnos desde Excel |
| `13_BancoLocal.gs` | Textos de respaldo del banco |
| `14_Simulados.gs` | Resultados de prueba |
| `15_DirectorioEncuentas.gs` | Directorio de encuestas y resumen con IA |
| `16_EncuestasDemo.gs` | Siembra y borrado de encuestas de demostración |
| `Asistencia.gs` | Pase de lista, prefectos e importación de horario |
| `ClaseLogica.gs` | Sesión de clase, claves de docentes y alumnos, contenidos |
| `Encuestas.gs` | Formulario público, respuestas y banco de reactivos |
| `PlaneacionNEM.gs` | Planeaciones, sesiones, publicación, clonado y asistencia DeepSeek |
| `HorarioOficial.gs` | Las 600 clases del horario aSc embebidas como respaldo |
| `Biblioteca.gs` | Catálogo de libros SEP y alta, listado y baja de recursos |

`Biblioteca.gs` expone `catalogoLibrosSEPOficiales_`, `subirRecursoBiblioteca`, `listarRecursosBiblioteca` y `eliminarRecursoBiblioteca`.

---

## 3. Pantallas

`doGet` lee `pagina`, `p`, `modo`, `view` o `modulo`.

| Vista | Parámetro | Plantilla |
| --- | --- | --- |
| Estilo de interfaz | `estilo`, `ui`, `guia-ui`, `estiloui` | `EstiloUiSt90.html` |
| Censo | `encuesta`, `censo`, `formulario`, `diagnostico` | `FormularioEncuesta.html` |
| Administración | `admin`, `administracion`, `administrador` | `Admin.html` |
| Docente | `docente`, `docentes`, `maestro`, `maestros` | `Admin.html` |
| Asistencia | la resuelve `esVistaAsistencia_` | `Admin.html` |
| Alumno | `alumno`, `estudiante`, o el parámetro `mat` | `Interfaz.html` |
| Clase hablada | la resuelve `esVistaClase_` | `Clase.html` |
| Portal | vacío, `login`, `portal`, `inicio` | `Admin.html` |

El título de cada vista lleva `VERSION_APP`. El portal también inyecta `BUILD_APP`.

`doGet` rechaza por URL las siembras y las mutaciones sin sesión (`st90sim`, `sembrar`, `cargarSimulados`, `repararResultados`).

### Cinta del panel

`Admin.html` reúne `ComunCSS`, `AdminCSS`, `AdminPlaneacionCSS`, `AdminEncuestasCSS`, `AdminUsuarios`, `AdminAsistencia`, `AdminLecturas`, `AdminPlaneacion`, `AdminEncuestas`, `ComunJS`, `AyudaJS.html` y los fragmentos `AdminJS_*`, `AdminPlanJS_*` y `AdminEncJS_*`.

| Pestaña | Botón | Módulo |
| --- | --- | --- |
| Usuarios | `#btnTabMat` | `AdminUsuarios.html` |
| Asistencia | `#btnTabAsi` | `AdminAsistencia.html` |
| Lecturas | `#btnTabLec` | `AdminLecturas.html` |
| Planeación didáctica | `#btnTabPlan` | `AdminPlaneacion.html`, con `#cintaPlan` |
| Diagnóstico y encuestas | `#btnTabEnc` | `AdminEncuestas.html` |

La cinta de planeación tiene cuatro estaciones: horario oficial, banco personal, repositorio global y formulario de proyecto. El formulario es un stepper de cuatro pasos (`#tabPasoPlan1` … `#tabPasoPlan4`).

Los documentos de estilo van atrás del código: `ESTILO_UI_ST90.md` sigue en la referencia v303, `PROMPT_UI_ST90.md` en v293, `ENLACES_UI.md` marcado `@409`. `REGLA_UI_CINTA.md` se declara obsoleto.

### Clase hablada

`Clase.html` más `ClaseCSS.html` y `ClaseJS_01.html` … `ClaseJS_09.html`. En `build-564`, `ClaseJS_05.html` recibió las tarjetas de contenido que acompañan la etapa 2 de planeación.

### Constructor de encuestas

La carpeta `constructor/` sigue en el repositorio, con su propio script y su propia hoja. No forma parte del `doGet` de ST90.

---

## 4. Roles y sesión

El login unificado está en `iniciarSesionUnificada` (`04_Sesiones.gs`). El token dura 21 600 segundos (6 horas) en `CacheService`, bajo `sesion_<token>`. La revocación existe.

| Rol | Dónde vive la credencial | Alcance |
| --- | --- | --- |
| Administrador | Hash y sal en propiedades del script (`CLAVE_ADMIN_HASH`, `CLAVE_ADMIN_SALT`) | Panel completo |
| Prefectura | Hoja `Prefectos` | Grupos de `PrefectoGrupos` |
| Docente | Hoja `MaestrosClase` | Horario, banco personal, repositorio y clase |
| Alumno de clase | Hoja `AccesoClaseAlumnos` | Clase hablada |
| Alumno de lectura | Padrón `Alumnos` y token ya emitido | Examen, PPM, historial y boleta |
| Personal de apoyo | Hoja `PersonalApoyo` | Declarada en encabezados; en la lectura del 28 de octubre no tenía filas |

La calificación de lectura usa `PESO_COMPRENSION = 0.7` y `PESO_VELOCIDAD = 0.3`. Las metas de palabras, PPM y número de preguntas están en `ESPECIFICACIONES_GRADO` para 1.°, 2.° y 3.°.

Asignaturas por defecto: Español, Historia, Ciencias, Formación Cívica y Ética, Tecnología, Matemáticas.

---

## 5. Libro de cálculo

El identificador de producción está en `01_Hoja.gs` (`ID_HOJA_DEFAULT`): `1ZxCuV_6O3JcX9E-7y165Q6ofAZRERk9-xj5rYeUhaYU`. Si no hay propiedades, el script se inicializa en `PRODUCCION` con ese libro. Un entorno `PRUEBAS` no puede abrirlo.

Encabezados que declara `ENCABEZADOS` esta noche:

| Hoja | Columnas |
| --- | --- |
| `Alumnos` | Matrícula, Nombre Completo, Grado, Grupo, Activo, Intentos extra |
| `Grupos` | Grado, Grupo, Activo, Intentos extra, Turno |
| `Prefectos` | Id, Nombre, Usuario, Salt, Hash, Activo, Clave |
| `PrefectoGrupos` | Id prefecto, Grado, Grupo, Turno |
| `Horarios` | Id, Día, Turno, Bloque, Hora inicio, Hora fin, Grado, Grupo, Maestro, Asignatura, Salón |
| `MaestrosClase` | Id, Nombre, Usuario, Salt, Hash, Activo, Clave |
| `AccesoClaseAlumnos` | Matrícula, Nombre, Grado, Grupo, Usuario, Salt, Hash, Activo, Clave |
| `PersonalApoyo` | Id, Nombre, Usuario, Área, Salt, Hash, Activo, Clave |
| `ContenidosClase` | Id, Id horario, Maestro, Asignatura, Grado, Grupo, Día, Bloque, Fecha, Título, Texto, UrlAudio, Publicado, Timestamp |
| `AsistenciaAlumnos` | Fecha, Turno, Grado, Grupo, Matrícula, Nombre, Estado, Prefecto, Timestamp, Observación |
| `AsistenciaMaestros` | Fecha, Turno, Bloque, Id horario, Maestro, Grado, Grupo, Asignatura, Estado, Prefecto, Timestamp, Observación |
| `Lecturas` | ID Lectura, Grado, Asignatura, Tema, Texto, Palabras, Preguntas JSON, Activa, Origen |
| `Preguntas` | ID Lectura, Orden, Enunciado, seis opciones, Respuesta correcta, Nivel |
| `Resultados` | Marca temporal, escuela, alumno, tiempos, aciertos, PPM, intento, trimestre, token de examen |
| `Config` | Clave, Valor |
| `PlaneacionesNEM` | 24 columnas, de `Id` a `EsCopiaDe` (incluye `ContenidoSintetico`, `PDA`, periodo, horario y dueño) |
| `SesionesNEM` | 20 columnas: cuatro momentos, recursos visuales, guion docente, guion accesible, horario y fecha |
| `BibliotecaRecursos` | Id, Título, Tipo, Asignatura, Grado, Trimestre, URL_Drive, Autor, Fecha |

El módulo de encuestas usa además `Formulario`, `Respuestas` y `DirectorioEncuestas`. Esas tres no están en `ENCABEZADOS`.

La última cuenta de filas es la del 28 de octubre de 2026 (padrón, 600 horarios, 7 planeaciones, 21 sesiones, entre otras). Esta noche no se volvieron a contar filas. La bitácora de `build-562` reporta 14 planeaciones; eso no se recontó aquí.

---

## 6. Planeación didáctica NEM

Reglas de `PlaneacionNEM.gs`, vigentes en `build-564`:

1. **Propiedad.** `exigirPropietarioPlaneacion_` deja pasar al administrador. Un docente solo modifica la planeación cuyo `DocentePropietario` (o `Docente`) coincide con su nombre. Si la fila vieja no trae dueño, el código la deja pasar.
2. **Lectura.** `exigirLecturaPlaneacion_` permite leer lo `PUBLICADA`, `APROBADO` o `TERMINADA`. El borrador de otro docente no se lee.
3. **Estados.** El alta queda en `BORRADOR`. Editar una planeación `APROBADO` la regresa a `EN_REVISION`. Publicar escribe `PUBLICADA`.
4. **Clonado.** `clonarPlaneacionAGlobal` copia la planeación y sus sesiones con identificadores nuevos, dueño de quien clona, estado `BORRADOR` y `EsCopiaDe` apuntando al original.
5. **Publicación.** `publicarPlaneacionEnRepositorio` exige autoría (o administrador), el número de sesiones declarado, y en cada sesión apertura, desarrollo, actividad, cierre y guion accesible.
6. **Borrado.** `eliminarPlaneacionNEM` solo lo hace el autor o el administrador, y borra también las sesiones.
7. **Sesión.** Cada sesión es de 40 minutos, en cuatro momentos. El guion accesible alimenta el aula hablada.
8. **Candado.** `LockService` cubre `crearOActualizarPlaneacionNEM`. No cubre clonar, publicar, borrar ni guardar sesión.

Funciones de esa fase: `contextoInicialPlaneacionNEM`, `crearOActualizarPlaneacionNEM`, `listarPlaneacionesNEM`, `clonarPlaneacionAGlobal`, `publicarPlaneacionEnRepositorio`, `eliminarPlaneacionNEM`, `obtenerPlaneacionCompletaNEM`, `guardarSesionNEM`.

### Lo que ya está en el formulario

Etapa 1 (esbozo NEM Fase 6): título, campo formativo, metodología sociocrítica, problema de la comunidad, propósito, producto y número de sesiones. El docente elige metodología y campo; el código ya no los deja bloqueados (`build-560`). Hay sugerencia de título con un clic (`build-562`).

Etapa 2 (contenidos sintéticos y PDA), integrada en `build-564` dentro de `AdminPlanJS_03.html`:

- matriz de contenidos por campo (`matrizActivaEtapa2_`);
- trimestre calculado o elegido (`#selTrimestrePDA`, `trimestreActivoPlan_`);
- tarjetas de contenido y contador `#badgeContadorPDA`;
- buscador de contenidos y botón de sugerir PDA junto a `#planPDA`;
- autoguardado en `localStorage` (catálogo CTE bajo `ST90_CATALOGO_CTE_CUSTOM`, más los campos del esbozo);
- las mismas tarjetas llegan a la clase por `ClaseJS_05.html`.

El asistente de la etapa vive en `AyudaJS.html`: modal de ayuda, avatar de la asesora pedagógica (`AVATAR_ASESOR_NEM_B64_`, reparado en `build-563` para que la imagen base64 cierre bien) y voz DUA con Web Speech API (`build-561`). La bitácora pide que el botón de voz quede en el modal y en el cajón de IA, no junto a cada etiqueta del formulario.

---

## 7. Quién toca qué

Tres agentes, una sola persona que autoriza el despliegue (Antigravity).

| Agente | Toca | Entrega |
| --- | --- | --- |
| Antigravity | `.gs`, `LockService`, `CacheService`, `git`, `clasp`, `CONTROL_CAMBIOS.md` | Despliegue |
| DeepSeek | CSS y estructura visual (`ComunCSS.html`, `AdminPlaneacionCSS.html` y afines) | `ENTREGA_DEEPSEEK.md` |
| Cursor | JavaScript de interfaz (`AdminPlanJS_*`, `AdminEncJS_*`, `AyudaJS.html`, `ClaseJS_*`) | `ENTREGA_CURSOR.md` |

La partitura está en `ESTADO_COORDINACION.md`. Hay un centinela de buzón cada 60 segundos (`herramientas/centinela_buzon.js`) desde el commit `185a263`.

### Cierre de esta noche en `main`

| Build | Qué entró | Commit |
| --- | --- | --- |
| `build-560` | Selectores de metodología y campo formativo | `9f7d6f5` |
| `build-561` | Voz accesible: narración en ayudas y dictado hacia la IA | `c465619` |
| `build-562` | Avatar de la asesora, sugerir título e insertarlo en `#planTitulo` | `961dd5c` |
| `build-563` | Menos saturación visual en etapas 1 y 2, avatar íntegro, autoguardado local | `07e4cd2` |
| `build-564` | `AdminPlanJS_03` y `ClaseJS_05`: tarjetas de contenido, PDA por trimestre, autoguardado. `VERSION_APP` pasa a `v418` | `1f54c0d` |

`ESTADO_COORDINACION.md` no se actualizó en esos dos últimos commits. Su sección 4 sigue en `@562` / `v417` y su sección 5 todavía describe como tarea activa el trabajo que `build-563` y `build-564` ya registran en el fuente.

---

## 8. Hallazgos que siguen abiertos

### El libro se abre sin sesión

Esta noche, 31 de octubre de 2026, una consulta anónima a la hoja `Alumnos` respondió HTTP 200 y devolvió el encabezado. No se volvió a exportar el padrón ni las claves. La lectura completa del 28 de octubre ya había mostrado padrón, asistencia, resultados, respuestas de censo y columnas `Clave` en texto en `Config`, `Prefectos`, `MaestrosClase` y `AccesoClaseAlumnos`. Hasta que el libro deje de ser «cualquiera con el enlace», el hash de la aplicación no protege esos datos: el identificador está escrito en `01_Hoja.gs`.

### Concurrencia incompleta

Hay candado en el guardado del examen, en parte de la asistencia, en el formulario de encuestas y en crear o actualizar una planeación. No hay candado en clonar, publicar, borrar o guardar sesión, ni en varias altas de alumnos y de horario.

### Horario en dos sitios

Las 600 clases están en la hoja `Horarios` y otra vez dentro de `HorarioOficial.gs`. Un cambio de horario hay que hacerlo en los dos lados.

### Documentos de versión desfasados

`ESTADO_COORDINACION.md` (cierre en `v417`), `ENLACES_UI.md` (`@409`), `ESTILO_UI_ST90.md` (v303) y `PROMPT_UI_ST90.md` (v293) no describen `v418` · `build-564`.

---

## 9. Lo que el código ya cuida

- La contraseña de administración no está escrita en el fuente. El hash usa sal y SHA-256.
- `doGet` no ejecuta siembras anónimas por la URL.
- `01_Hoja.gs` no deja que el entorno de pruebas abra el libro de producción.
- `celdaSegura_` antepone un apóstrofo si el texto parece una fórmula.
- Las sesiones se pueden revocar.
- El aula hablada y la planeación distinguen borrador personal de lo publicado.
- La etapa 2 de contenidos y PDA ya tiene selector de trimestre, contador y respaldo local en el navegador.

---

## 10. Pendiente que esta radiografía deja

1. Quitar el acceso de «cualquiera con el enlace» al libro. Solo debe abrirlo la cuenta que ejecuta el script.
2. Rotar la clave de administración, las de docentes, las de prefectos y las de alumnos. Vaciar la columna `Clave` y dejar de aceptarla cuando el hash no coincide.
3. Poner `LockService` en clonar, publicar, borrar y guardar sesión.
4. Reescribir el cierre de `ESTADO_COORDINACION.md` a `v418` · `build-564` y decidir cuál es la tarea siguiente, porque la etapa 2 que esa bitácora pedía ya está en el commit `1f54c0d`.
5. Alinear `ENLACES_UI.md` y `ESTILO_UI_ST90.md` con esta versión.

Hasta que el punto 1 esté hecho, el hash y los roles no protegen los datos: el libro se lee por fuera de la aplicación.
