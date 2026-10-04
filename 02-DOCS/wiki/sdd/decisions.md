---
type: decisions
title: ARCHITEX OS — SDD decisions
description: Append-only log of significant project decisions.
tags: [sdd, decisions]
timestamp: 2026-10-03T18:15:00Z
topic: sdd
---

# SDD decisions

## 2026-10-03 — Constitution v1.0.0 options

| Dimension | Options | Choice | Why |
| --- | --- | --- | --- |
| Stack canon | A fixed GAS+Sheets/Drive+clasp · B amendable migration · C multi-runtime | **A** | Code and clasp layout already live there; changing runtime is MAJOR later. |
| Quality bar | A smoke + clean clasp · B automated tests+CI · C human-only | **A** | Fits current Apps Script maturity; tests can become a MINOR later. |
| Branching | A branch+PR · B direct main · C main+clasp no PR | **A** | Keeps reviewable history as the system grows. |
| Access / secrets | A anonymous OK + no secrets in repo · B domain-restricted · C custom auth | **A** | Matches current `ANYONE_ANONYMOUS` webapp; secrets stay in `01-TOOLS`. |

Status: constitution draft written; awaiting explicit user ratification.

## 2026-10-04 — Fase 2.1 no ratifica la constitución

La fase pidió cambiar el estado a `ratified` solo si el contrato ya estaba aprobado.
Este registro seguía en «awaiting explicit user ratification» y el archivo en `pending_ratification`.
No se inventó la aprobación. Sigue pendiente una frase humana que ratifique la v1.0.0 y las opciones 1A, 2A, 3A y 4A.
