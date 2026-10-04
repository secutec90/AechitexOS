---
name: lockservice-concurrency
description: Pautas de concurrencia obligatoria con LockService según ADR-001 de ARCHITEX OS V-36
---

# Skill: lockservice-concurrency
# Context Hash: f1ac370dcaf885050882b2a2ddd6da142c93567f8e054b4534a36a76db33d70e

## Propósito
Establece el patrón obligatorio de sincronización y escritura concurrente en Google Sheets para desarrolladores y agentes en ARCHITEX OS V-36.

## Patrón Técnico Obligatorio (ADR-001)
Todo acceso de escritura a Google Sheets en backend debe seguir esta secuencia estricta:
```javascript
const lock = LockService.getScriptLock();
try {
  const tieneBloqueo = lock.tryLock(10000); // 10 segundos máximo
  if (!tieneBloqueo) {
    throw new Error('Servidor ocupado: no se pudo obtener el bloqueo de persistencia.');
  }
  // Operaciones de lectura y escritura en SpreadsheetApp...
} finally {
  lock.releaseLock();
}
```

## Restricciones
- No ejecutar escrituras directas sin tryLock.
- Liberar siempre el bloqueo en el bloque finally.
- Mantener costo $0 USD respetando los límites de cuota de Google Apps Script.
