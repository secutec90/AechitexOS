---
type: constitution
title: ARCHITEX OS — Constitution
description: The non-negotiable principles every rsc-sdd phase obeys.
tags: [sdd, constitution]
timestamp: 2026-10-03T18:15:00Z
topic: sdd
version: v1.0.0
status: pending_ratification
---

# ARCHITEX OS — Constitution

> Version: v1.0.0 · Ratified: **pending** · Last amended: —
> The non-negotiable principles every rsc-sdd phase obeys. Stack mechanics live in
> `02-DOCS/wiki/stack/*`; this file ratifies the principle and links the detail.

## 1. Stack canon

1. Primary runtime: **Google Apps Script V8** with UI HTML via `HtmlService`, persistence in **Google Sheets**, backups/audit in **Google Drive**. Pinned in `appsscript.json` (`runtimeVersion: V8`). Detail: `02-DOCS/wiki/stack/apps-script.md`.
2. Frameworks fixed: Apps Script + clasp for local sync/deploy. Changing the primary runtime or storage substrate is a **MAJOR** amendment.
3. Delivery tooling: **clasp** against `.clasp.json`. No alternate package manager for the script runtime; lock the clasp workflow, not an npm/pnpm lockfile.

## 2. Quality bar

4. Before merge or deploy, the **smoke checklist** in `02-DOCS/wiki/stack/apps-script.md` is completed and recorded (PR description or release note). `clasp push` (or the agreed deploy command) must finish without error.
5. Public `.gs` entry points (`doGet`, `doPost`, and exported project/audit APIs) carry **JSDoc** stating params and return shape. No separate TypeScript typecheck is required on this stack.
6. Automated unit-test coverage is **not** a merge gate in v1.0.0. Regressions caught by the smoke checklist (principle 4) gate the merge. Raising a coverage floor requires a MINOR amendment.

## 3. Conventions

7. Naming & structure: backend logic lives in `Codigo.gs` (or clearly named `.gs` modules); UI in `index.html` (and related HTML). Prefer Spanish identifiers for domain APIs already established (`guardarProyectoEnHoja`, etc.). Persistence sheet/tab names that start with `_ARCHITEX_` stay reserved.
8. API & errors: server functions return structured objects with an explicit success/failure signal (e.g. `ok` / `error` or equivalent); user-visible failures must not dump raw stack traces into the UI.
9. Commit messages: Conventional Commits (`type(scope): subject`), Spanish or English subject allowed; one logical change per commit when practical.

## 4. Branching & shipping

10. Work happens on a branch off `main`; merge via pull request. Direct pushes to `main` are not allowed.
11. **Git authorship is the human's.** No `Co-Authored-By` an AI, no "generated with" footer. Enforced at the `ship` phase.

## 5. Security & privacy floor

12. No secret is ever committed. Secrets load from `01-TOOLS/<provider>/.env` (gitignored). Baseline notes: `02-DOCS/wiki/stack/apps-script.md` and `01-TOOLS/_TEMPLATE/`.
13. Webapp access may remain **anyone / anonymous** (`appsscript.json` webapp access) for v1. Tightening to domain-only or custom auth is a MINOR amendment. Project JSON may contain business data — treat Sheets/Drive contents as sensitive even if the URL is open.

## 6. UX floor

14. The HTML UI must remain usable on mobile viewport (existing `viewport` meta intent) and keep primary actions reachable without hover-only affordances. Stricter WCAG AA is not a gate in v1.0.0.

## 7. Knowledge & decisions

15. Every significant decision is appended to `02-DOCS/wiki/sdd/decisions.md` (date, options, why). The constitution is the highest-order decision record.

## Definition of Done (the merge bar `verify` runs against)

A change ships only when ALL hold:

- [ ] Smoke checklist completed; clasp deploy command clean (principle 4).
- [ ] Public `.gs` APIs touched have JSDoc (principle 5).
- [ ] Conventions followed (principles 7–9).
- [ ] On a branch, merged via PR, authored by the human (principles 10–11).
- [ ] No secret committed; webapp/access assumptions unchanged unless amended (principles 12–13).
- [ ] Mobile-reachable primary actions where UI changed (principle 14).
- [ ] Significant decisions logged (principle 15).

## Amendment log (append-only)

| Date | Version | Change | Why |
|------|---------|--------|-----|
| 2026-10-03 | v1.0.0 | Draft initial constitution (pending ratification). | SDD kickoff; choices 1A/2A/3A/4A. |
