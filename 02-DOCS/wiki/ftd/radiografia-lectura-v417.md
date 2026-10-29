# Radiografía v417

## Intent
Reescribir la radiografía de Lectura para que describa el código vivo en v417, partido en archivos `00_` a `16_`, y deje constancia de lo que se observó en el libro de producción. El texto queda en `02-DOCS/wiki/ftd/Lectura_RADIOGRAFIA_v417.md` porque esta cuenta no puede escribir en `secutec90/Lectura`.

## Scope
Entra el texto de la radiografía. No entra cambiar código de Lectura, rotar claves, cerrar el libro ni actualizar `ENLACES_UI.md`, `ESTILO_UI_ST90.md` ni `PROMPT_UI_ST90.md`.

## Checklist
- [x] Sintaxis de los 22 `.gs`: `node --check` sobre una copia `.js` de cada uno. Observado: 22 correctos, 0 errores.
- [x] El texto deja de citar `Codigo.gs` y la versión v409 como si fueran el estado actual. Comprobado en `Lectura_RADIOGRAFIA_v417.md`.
- [ ] El libro de producción deja de ser descargable sin sesión. No se hizo en este cambio: es una acción sobre la hoja, no sobre el documento.

## Evidence
`node --check` el 28 de octubre de 2026 (hora del centro de México): 22 archivos, 0 fallos. Conteos del libro leídos ese mismo día, sin copiar nombres ni claves. `wc -l` de los `.gs`: 22 088 líneas. Funciones `function`: 444.

## Next
Restringir el libro a la cuenta que ejecuta el script y vaciar la columna `Clave` después de rotar las contraseñas.
