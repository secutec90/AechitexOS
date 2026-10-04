# ARCHITEX OS V-36

# RSC-5 — ESPECIFICACIÓN Y IMPLEMENTACIÓN DE REGENERACIÓN CONTROLADA

## Orquestación Segura de Proyecciones (`ejecutarRegeneracionControlada`)

---

## 1. RESUMEN EJECUTIVO

* **Fase:** RSC-5 (Regeneración y Sincronización Controlada de Proyecciones).
* **Ecosistema:** ARCHITEX OS V-36.
* **Módulo Orquestador:** `rsc/regeneradorProyecciones.mjs`.
* **Suite de Pruebas:** `rsc/pruebasRsc5Regeneracion.mjs`.
* **Objetivo:** Implementar una capa aislada de regeneración controlada para las proyecciones RSC-3 gobernada por pre-flight, autorización explícita vinculada al `contentHash`, generación en staging y verificación obligatoria mediante RSC-4 antes de permitir cualquier reemplazo físico.

> [!IMPORTANT]
> **REGLA FUNDAMENTAL:** `RSC-5 NO modifica estadoProyecto`. La fuente única de verdad primaria continúa siendo inmutable frente a las proyecciones.

---

## 2. FRONTERAS Y JERARQUÍA ARQUITECTÓNICA

Se mantiene la separación inquebrantable entre Contexto, Gobernanza y Ejecución:

```text
       estadoProyecto  (Única Fuente de Verdad Primaria)
             ↓
normalizarContextoArchitex()  (RSC-2: Normalizador Canónico Puro)
             ↓
  ContextoCanonicoArchitex    (Representación Intermedia Oficial)
             ↓
     RSC-4 / Pre-flight       (RSC-4: Diagnóstico y Verificación)
             ↓
   Detectar DESACTUALIZADO
             ↓
 Autorización Humana Explícita (Vinculada a tenantId, projectId y contentHash)
             ↓
     Generación en Staging     (RSC-3: Artefactos en Aislamiento Temporal)
             ↓
   Verificación de Staging     (RSC-4: Validación de Integridad y Seguridad)
             ↓
  Reemplazo Físico Controlado  (Solo tras dictamen VALIDO)
```

### Prohibiciones Inviolables
1. **Nunca `Proyecciones → estadoProyecto`:** Las proyecciones son derivadas de sólo lectura.
2. **Nunca `Auto-Sync Silencioso`:** No se permiten watchers, file listeners, triggers automáticos ni reemplazos sin autorización humana.
3. **Nunca Reemplazo sin Staging Validado:** La versión anterior permanece intacta en el disco hasta que la nueva versión es verificada como `VALIDO` por RSC-4.
4. **Cero Gobernanza / Cero Ejecución:** RSC-5 no otorga permisos de ejecución, no modifica `GobernanzaAgente.gs` ni genera tokens `idDecision`.

---

## 3. ESTADOS DE OPERACIÓN RSC-5

RSC-5 define sus propios estados operacionales, estrictamente desacoplados de los estados de validación de contexto de RSC-4:

| Estado RSC-5 | Significado Operativo |
|---|---|
| `READY` | Subsistema inicializado y listo para pre-flight. |
| `NO_CHANGES` | `hashActual === hashProyectado`. No hay cambios; ningún archivo es modificado. |
| `AUTHORIZATION_REQUIRED` | `hashActual !== hashProyectado`. Se detectó desactualización y se exige autorización explícita. |
| `AUTHORIZED` | La autorización suministrada coincide exactamente con `tenantId`, `projectId` y `contentHash`. |
| `CONTEXT_CHANGED` | El contexto mutó tras emitirse la autorización (`hashAutorizado !== hashActual`). Se aborta la operación. |
| `GENERATING` | Generación física aislada en el directorio de staging temporal. |
| `VERIFYING` | Auditoría de los artefactos de staging mediante RSC-4. |
| `REPLACED` | Staging fue verificado como `VALIDO` y transferido con éxito al destino activo. |
| `REJECTED` | Staging falló la verificación RSC-4 (`INVALIDO`, `INCOMPLETO`, `NO_VERIFICABLE`); staging se descarta y la versión anterior se conserva. |
| `ABORTED` | Error de ejecución, falta de argumentos o excepción durante el proceso. |

---

## 4. API DE REGENERACIÓN CONTROLADA (`rsc/regeneradorProyecciones.mjs`)

### 4.1. `prepararRegeneracion(contextoActual, proyeccionActivaODirectorio, opciones = {})`
Realiza el pre-flight de comparación entre el contexto canónico actual y la proyección física activa:
* Si los hashes coinciden: Devuelve `NO_CHANGES`.
* Si los hashes difieren: Devuelve `AUTHORIZATION_REQUIRED` con los datos necesarios para autorizar.

### 4.2. `crearSolicitudAutorizacion(preparacion)`
Emite la estructura formal de autorización requerida para autorizar la regeneración:
```json
{
  "operation": "REGENERATE_PROJECTIONS",
  "tenantId": "...",
  "projectId": "...",
  "authorizedContentHash": "<64-caracteres-SHA-256>",
  "authorized": true,
  "timestamp": "2026-10-04T..."
}
```

### 4.3. `validarAutorizacion(autorizacion, contextoActual)`
Valida de forma atómica:
1. `operation === 'REGENERATE_PROJECTIONS'`
2. `authorized === true`
3. `tenantId === contextoActual.tenantId`
4. `projectId === contextoActual.projectId`
5. `authorizedContentHash === contextoActual.contentHash` (Garantiza que no se aplique sobre un contexto que cambió).

### 4.4. `generarEnStaging(contextoActual, directorioStaging)`
Materializa las proyecciones RSC-3 en un directorio temporal aislado (`tmpdir()`) antes de tocar cualquier archivo del repositorio activo.

### 4.5. `verificarStaging(directorioStaging, contextoActual)`
Ejecuta `verificarContextoRsc4` y `verificarConjuntoProyecciones` sobre los archivos físicos de staging. Solo dictamina éxito si el resultado es `VALIDO`.

### 4.6. `reemplazarControlado(directorioStaging, directorioDestino)`
Copia los archivos verificados hacia las rutas canónicas del proyecto:
- `ARCHITEX_STATE.json`
- `.antigravity/context.md`
- `.cursorrules`
- `CLAUDE.md`
- `skills/architex-context/SKILL.md`
- `skills/lockservice-concurrency/SKILL.md`

### 4.7. `ejecutarRegeneracionControlada(contextoActual, directorioDestino, opciones = {})`
Función orquestadora de alto nivel que encadena Pre-flight → Autorización → Staging → Verificación → Reemplazo con limpieza garantizada.

---

## 5. AISLAMIENTO MULTI-TENANT Y DETERMINISMO

* **Multi-Tenant:** La tupla `(tenantId, projectId)` forma parte inseparable del payload semántico. Una autorización para el Tenant A no es aceptada bajo ninguna circunstancia para el Tenant B (comprobado en TEST 12).
* **Determinismo e Idempotencia:** Dos ejecuciones sucesivas sobre el mismo contexto canónico producen `REPLACED` en la primera y estrictamente `NO_CHANGES` en la segunda sin tocar los archivos (comprobado en TEST 10).
* **Independencia de `generatedAt`:** Variaciones temporales en `generatedAt` no alteran el `contentHash` y mantienen el estado en `NO_CHANGES` (comprobado en TEST 11).

---

## 6. SUITE DE PRUEBAS RSC-5 (`rsc/pruebasRsc5Regeneracion.mjs`)

Se validaron los 14 escenarios obligatorios con 100% de éxito:

| # | Prueba | Verificación Técnica Real | Resultado |
|---|---|---|---|
| **TEST 01** | Contexto sin cambios | `hashActual === hashProyectado` produce `NO_CHANGES` sin tocar disco | PASS |
| **TEST 02** | Contexto desactualizado | `hashActual !== hashProyectado` produce `AUTHORIZATION_REQUIRED` | PASS |
| **TEST 03** | Autorización válida | Token con hash coincidente permite generación (`AUTHORIZED`) | PASS |
| **TEST 04** | Autorización obsoleta | Hash autorizado desalineado produce `CONTEXT_CHANGED` y aborta | PASS |
| **TEST 05** | Staging válido | RSC-4 dictamina `VALIDO` y permite reemplazo (`REPLACED`) | PASS |
| **TEST 06** | Staging con secreto | RSC-4 detecta `INVALIDO`, descarta staging y conserva versión previa | PASS |
| **TEST 07** | Staging incompleto | Dimensión faltante produce `INCOMPLETO` y descarta staging | PASS |
| **TEST 08** | Staging no verificable | JSON corrupto produce `NO_VERIFICABLE` y cancela reemplazo | PASS |
| **TEST 09** | Inmutabilidad de estado | `estadoProyecto` se mantiene byte a byte idéntico antes y después | PASS |
| **TEST 10** | Idempotencia | Segunda ejecución consecutiva retorna `NO_CHANGES` | PASS |
| **TEST 11** | generatedAt independiente | Cambio exclusivo de timestamp mantiene `NO_CHANGES` | PASS |
| **TEST 12** | Multi-tenant | Autorización de Tenant A rechazada en Tenant B (`REJECTED`) | PASS |
| **TEST 13** | Fallo en generación | Error en generador aborta y conserva archivos activos intactos | PASS |
| **TEST 14** | Fallo en verificación | Hash fraudulento es rechazado y versión anterior se preserva | PASS |

---

## 7. AUDITORÍA DE SEGURIDAD Y INTEGRIDAD

* **Archivos Protegidos:** `index.html`, `GobernanzaAgente.gs`, `Codigo.gs`, `ConfiguracionBase.gs`, `appsscript.json`, `rsc/normalizadorContexto.mjs` y `rsc/generadorProyecciones.mjs` no sufrieron alteración alguna.
* **Dependencias:** Cero paquetes agregados a `package.json` o `node_modules`.
* **Gobernanza:** Frontera intacta; ninguna lógica de RSC-5 accede a `LockService`, `HERRAMIENTAS_AGENTES` ni ejecución de servidor.
* **Despliegue:** Cero comandos de `clasp push`, `git commit` o `git push`.
