# Horario por turno

## Intent
Al importar un XML de aSc, detectar si cada clase es matutino o vespertino y guardarla en la hoja `Horarios` sin borrar el otro turno. En Planeación, elegir el turno y ver solo esas clases: por grupo, por docente, de aulas o en concentrado.

## Scope
El comportamiento vive en el proyecto de Apps Script `secutec90/Lectura`. Entra la importación (`Asistencia.gs`), la lectura (`ClaseLogica.gs`, `PlaneacionNEM.gs`) y los selectores de Planeación y del calendario, en el panel de administración y en el del docente.
No entra una validación que rechace un maestro o un salón repetido a la misma hora. El portal del alumno sigue leyendo el horario de su grupo.
Esta rama de AechitexOS guarda la copia aplicable en `lectura/`, con las mismas rutas que en Lectura. El push directo a `secutec90/Lectura` respondió 403 para este agente.

## Checklist
- [x] De 7:00 a 12:59 es matutino; de 1:00 a 6:59 y desde las 13:00 es vespertino. Si el modal fuerza un turno, ese gana. Prueba: `node .rsc/test_horario_turno.js` dentro de Lectura imprimió `test_horario_turno: ok`.
- [x] La escritura reemplaza solo los turnos presentes en el XML y conserva el resto, con `LockService`. La misma prueba exige el filtro y el candado en `Asistencia.gs`.
- [x] Los scripts de la vista (turno, horario, grupo, docente, aulas, concentrado) compilan. La misma prueba los pasó por `compileFunction`.
- [ ] Recorrer la app publicada en el navegador. No hay despliegue de Apps Script en este entorno, así que el clic real quedó sin observar.

## Evidence
`node .rsc/test_horario_turno.js` → `test_horario_turno: ok`.

## Next
Copiar `lectura/` sobre el repositorio Lectura, publicar el Apps Script e importar `Horario.xml` y después `vespertino.xml` para ver los dos turnos en Planeación.
