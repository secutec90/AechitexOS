# Control de cambios

## Intent
Dejar en Cursor la regla que, al cerrar un cambio, entrega el bloque para `CONTROL_CAMBIOS.md`.

## Scope
Entra `.cursor/rules/control-cambios.mdc` y el archivo destino `CONTROL_CAMBIOS.md`. No entra modificar `avances.md` ni el código de la aplicación.

## Checklist
- [x] `.cursor/rules/control-cambios.mdc` existe, con `alwaysApply: true`, fecha de America/Monterrey y un bloque por cambio. Comprobado al leer el archivo.
- [x] `CONTROL_CAMBIOS.md` existe y no mezcla el formato con `avances.md`. Comprobado al leer el archivo.

## Evidence
Archivos creados en la rama `cursor/regla-control-cambios-4709`.

## Next
Al cerrar el siguiente cambio de producto, pegar el bloque en `CONTROL_CAMBIOS.md`.
