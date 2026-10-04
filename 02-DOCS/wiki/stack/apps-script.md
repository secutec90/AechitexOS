---
type: stack
title: Apps Script — stack mechanics
description: Convenciones y checklist de humo para ARCHITEX OS en Google Apps Script.
tags: [stack, apps-script, clasp]
timestamp: 2026-10-03T00:00:00Z
topic: stack
---

# Apps Script — mecánica del stack

Canon del proyecto: Google Apps Script (runtime V8), UI HTML vía `HtmlService`, persistencia en Google Sheets, respaldos/auditoría en Google Drive, despliegue local con [clasp](https://github.com/google/clasp).

## Layout relevante

| Artefacto | Rol |
| --- | --- |
| `Codigo.gs` | Backend / API del script |
| `index.html` | UI servida por `doGet` |
| `appsscript.json` | Manifest (timezone, runtime, webapp) |
| `.clasp.json` | Enlace al `scriptId` remoto |

## Checklist de humo (pre-merge / pre-deploy)

Ejecutar en orden y marcar en la PR o en la nota de release:

1. Abrir la webapp desplegada (o vista previa) y cargar la UI sin error de consola bloqueante.
2. Crear o actualizar un proyecto de prueba; verificar fila en `_ARCHITEX_PROYECTOS`.
3. Recargar / listar proyectos; el guardado aparece.
4. Si aplica auditoría Drive: lanzar un escaneo de carpeta de prueba y ver resultado sin excepción no capturada.
5. `clasp push` (o el flujo de deploy acordado) termina sin error.

## Secretos

Credenciales y tokens no van en el repo. Plantilla y notas: `01-TOOLS/_TEMPLATE/` (o proveedor concreto bajo `01-TOOLS/<provider>/`). Archivos `.env` deben estar gitignored.
