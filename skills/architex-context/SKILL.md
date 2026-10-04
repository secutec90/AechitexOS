---
name: architex-context
description: Guía canónica para consultar e interpretar ARCHITEX_STATE.json y las proyecciones de ARCHITEX OS V-36
---

# Skill: architex-context
# Context Hash: fe48761c3a9ace1ad55a401a3a9fcd0289339aa12e40c30ca4d8382c5c0b1b01

## Propósito
Permite a los agentes de IA comprender la estructura de las 25 dimensiones canónicas de ARCHITEX OS V-36 generadas mediante normalizarContextoArchitex().

## Reglas de Interpretación
1. **Fuente de Verdad:** estadoProyecto es la única fuente de verdad; ARCHITEX_STATE.json es una proyección de sólo lectura.
2. **No-Invención:** Si una dimensión tiene status = "NO_IMPLEMENTADO", el agente NO debe inventar datos, suponer requerimientos ni fabricar usuarios.
3. **Identidad Hash:** Verificar que el contentHash coincida entre ARCHITEX_STATE.json y las proyecciones Markdown.
4. **Seguridad:** Ninguna skill otorga permisos de ejecución en GobernanzaAgente.gs ni acceso a herramientas restringidas.
