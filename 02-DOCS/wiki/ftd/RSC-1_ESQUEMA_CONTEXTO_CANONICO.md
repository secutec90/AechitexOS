# ARCHITEX OS V-36

# RSC-1 — ESQUEMA CONCEPTUAL DEL CONTEXTO CANÓNICO
## ESPECIFICACIÓN TÉCNICA DE `ContextoCanonicoArchitex`

---

## 1. ESQUEMA TYPESCRIPT CONCEPTUAL

```typescript
/**
 * Esquema Canónico Unificado de Contexto de Arquitectura en ARCHITEX OS.
 * Define la estructura normalizada intermedia generada por normalizarContextoArchitex().
 */
export interface ContextoCanonicoArchitex {
  // Metadatos de Control del Contexto
  schemaVersion: "1.0.0";
  contextVersion: string; // ej: "4.0.1"
  projectVersion: string; // ej: "V-36"
  generatedAt: string;    // Timestamp ISO-8601
  projectId: string;      // ej: "proyecto_architex"
  source: "ARCHITEX_OS_V36";

  // 1. Identidad del Sistema
  identity: {
    projectId: string;              // [IMPLEMENTADO]: estadoProyecto.idProyecto
    projectName: string;            // [IMPLEMENTADO]: estadoProyecto.nombreProyecto
    projectType: TipoEcosistema;    // [IMPLEMENTADO]: estadoProyecto.selectorTipoProyecto
    tagline?: string;               // [NO IMPLEMENTADO]
  };

  // 2. Definición del Problema
  problem: {
    centralProblem: string;         // [IMPLEMENTADO]: estadoProyecto.campoProblema
    contextDescription?: string;    // [NO IMPLEMENTADO]
  };

  // 3. Objetivos
  objectives: {
    primaryObjective: string;       // [IMPLEMENTADO]: estadoProyecto.campoObjetivo
    successMetrics?: string[];      // [NO IMPLEMENTADO]
  };

  // 4. Audiencia y Usuarios Clave
  audience: {
    targetAudience: string;         // [IMPLEMENTADO]: estadoProyecto.campoPublico
    stakeholders?: string[];        // [NO IMPLEMENTADO]
  };

  // 5. Entorno Operativo y Plataforma
  environment: {
    targetPlatform: string;         // [IMPLEMENTADO]: estadoProyecto.campoEntorno
    supportedDevices: string;       // [IMPLEMENTADO]: estadoProyecto.campoDispositivos
    offlineStrategy: string;        // [IMPLEMENTADO]: estadoProyecto.campoManejoOffline
  };

  // 6. Límites del MVP (Producto Mínimo Viable)
  mvp: {
    scopeDefinition: string;        // [IMPLEMENTADO]: estadoProyecto.campoMvp
    includedFeatures: string[];     // [IMPLEMENTADO]: Derivado de campoMvp
  };

  // 7. Alcance Futuro
  future: {
    roadmapDescription: string;     // [IMPLEMENTADO]: estadoProyecto.campoFuturo
    backlogItems?: string[];        // [NO IMPLEMENTADO]
  };

  // 8. Restricciones Técnicas Innegociables
  constraints: {
    mandatoryRules: string;         // [IMPLEMENTADO]: estadoProyecto.campoRestricciones
    zeroCostPolicy: boolean;        // [IMPLEMENTADO]: Derivado ($0 USD)
    namingLanguage: "ES_MX";        // [IMPLEMENTADO]: Español estricto
    concurrencyControl: "LOCK_SERVICE"; // [IMPLEMENTADO]: LockService
    terminalTarget: "WINDOWS_POWERSHELL_CMD"; // [IMPLEMENTADO]: Terminal Windows
  };

  // 9. Roles y Permisos de Acceso
  roles: {
    rolesDefinition: string;        // [IMPLEMENTADO]: estadoProyecto.campoRoles
    rolesList: string[];            // [IMPLEMENTADO]: Derivado de campoRoles
    permissionsMatrix?: Record<string, string[]>; // [NO IMPLEMENTADO en estadoProyecto]
  };

  // 10. Usuarios del Sistema
  users: {
    userProfiles?: UserProfile[];   // [NO IMPLEMENTADO]
  };

  // 11. Entidades y Modelado de Datos
  entities: {
    summary: string;                // [IMPLEMENTADO]: estadoProyecto.campoEntidades
    registeredEntities: EntityDefinition[]; // [IMPLEMENTADO]: estadoProyecto.entidadesRegistradas
  };

  // 12. Requisitos Formales de Software
  requirements: {
    userFlows: string;              // [IMPLEMENTADO]: estadoProyecto.campoFlujos
    functionalRequirements?: any[]; // [NO IMPLEMENTADO]
  };

  // 13. Datos y Persistencia
  data: {
    storageEngine: "GOOGLE_SHEETS" | "MYSQL" | "POSTGRESQL" | "SQLITE"; // [IMPLEMENTADO]: selectorTipoProyecto
    sheetsTables: string[];         // [IMPLEMENTADO]: "_ARCHITEX_PROYECTOS", "_ARCHITEX_HISTORIAL"
    entityRelationshipType?: string;// [IMPLEMENTADO]: Renderizado al vuelo
  };

  // 14. Diseño de Interfaz y Vistas
  design: {
    screensStructure: string;       // [IMPLEMENTADO]: estadoProyecto.campoPantallas
    navigationStrategy: string;     // [IMPLEMENTADO]: estadoProyecto.campoNavegacion
    uiFramework?: string;           // [IMPLEMENTADO]: Vanilla CSS + HTML5
  };

  // 15. Arquitectura Técnica y Topología
  architecture: {
    topologyType: string;           // [IMPLEMENTADO]: selectorTipoProyecto
    keyComponentsStatus: Record<string, boolean>; // [IMPLEMENTADO]: estadoProyecto.componentesClaveEstado
    layers: string[];               // [IMPLEMENTADO]: Vistas, Controladores, Servicios, Repositorios
  };

  // 16. Tecnología y Stack Seleccionado
  technology: {
    selectedEcosystem: TipoEcosistema; // [IMPLEMENTADO]: selectorTipoProyecto
    runtime: string;                // [IMPLEMENTADO]: V8 / PHP / C++ FreeRTOS
    dependencies?: Record<string, string>; // [NO IMPLEMENTADO en estadoProyecto]
  };

  // 17. Decisiones de Arquitectura (ADRs)
  decisions: {
    registeredAdrs: ArchitectureDecisionRecord[]; // [IMPLEMENTADO]: estadoProyecto.decisionesRegistradas
  };

  // 18. Habilidades de Agentes (Skills)
  skills: {
    requiredSkills?: string[];      // [NO IMPLEMENTADO en estadoProyecto; visual en UI]
  };

  // 19. Trazabilidad de Requisitos
  traceability: {
    matrix: TraceabilityItem[];     // [IMPLEMENTADO]: estadoProyecto.elementosTrazabilidad
  };

  // 20. Pruebas y Validación
  tests: {
    testStrategy?: string;          // [NO IMPLEMENTADO como bloque dedicado]
  };

  // 21. Configuración de Producción
  production: {
    deploymentMethod?: string;      // [NO IMPLEMENTADO en estadoProyecto]
  };

  // 22. Mantenimiento y Operación
  maintenance: {
    operatingGuidelines?: string;   // [NO IMPLEMENTADO en estadoProyecto]
  };

  // 23. Estado de Completitud
  state: {
    radarScore?: number;            // [NO IMPLEMENTADO como campo persistido; calculado en UI]
    gateStatus?: "BLOQUEADA" | "APROBADA"; // [NO IMPLEMENTADO como campo persistido; evaluado en UI]
  };

  // 24. Procedencia de Atributos
  provenance: {
    sourceMap?: Record<string, "USER" | "ARCHITEX" | "DEEPSEEK" | "AGENT" | "SYSTEM" | "IMPORTED">; // [NO IMPLEMENTADO]
  };

  // 25. Verificación de Integridad
  integrity: {
    algorithm: "SHA-256";
    hash?: string;                  // [NO IMPLEMENTADO en estadoProyecto]
  };
}

export type TipoEcosistema = 
  | "web_appsscript" 
  | "web_laravel" 
  | "iot_mqtt" 
  | "movil_apk" 
  | "hibrido";

export interface EntityDefinition {
  nombre: string;
  campos: string; // ej: "id, nombre, correo, fecha_registro"
}

export interface ArchitectureDecisionRecord {
  titulo: string;   // ej: "ADR-001: Persistencia con LockService"
  problema: string;
  opciones?: string;
  motivo: string;
  fecha: string;
}

export interface TraceabilityItem {
  requisito: string;
  actor: string;
  destino: string;
  prueba: string;
}
```

---

## 2. REGLA DE NO-INVENCIÓN Y CAMPOS NO IMPLEMENTADOS

El compilador de contexto (RSC-2) debe ceñirse a las propiedades reales persistidas en `estadoProyecto`. Para cualquier dimensión marcada como `[NO IMPLEMENTADO]`:
1. El compilador **no debe inventar datos ficticios ni simularlos**.
2. Asignará `null` o un arreglo vacío `[]`, indicando la ausencia explícita del bloque.
3. Esto garantiza que las proyecciones para Antigravity, Cursor y Claude reflejen con estricta honestidad técnica el nivel actual de madurez del proyecto en ARCHITEX OS.
