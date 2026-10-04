/**
 * ARCHITEX OS V-36 — RSC-3: SCRIPT DE GENERACIÓN FÍSICA
 *
 * Lee el estado base real del proyecto, normaliza a ContextoCanonicoArchitex (RSC-2),
 * genera las proyecciones físicas (RSC-3) y las escribe en el disco.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { normalizarContextoArchitex } from './normalizadorContexto.mjs';
import { generarProyeccionesRsc3, escribirProyeccionesFisicas } from './generadorProyecciones.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const raizProyecto = resolve(__dirname, '..');

console.log('--- INICIO GENERACIÓN FÍSICA RSC-3 ---');

// 1. Cargar datosProyecto reales de ARCHITEX OS
const rutaEstadoRaw = resolve(raizProyecto, 'architex_os_architex_v4.json');
const raw = JSON.parse(readFileSync(rutaEstadoRaw, 'utf8'));
const estadoProyecto = raw.datosProyecto || {};

console.log('Estado cargado desde:', rutaEstadoRaw);
console.log('Proyecto:', estadoProyecto.nombreProyecto, '(', estadoProyecto.idProyecto, ')');

// 2. Normalizar a ContextoCanonicoArchitex (RSC-2)
const contextoCanonico = normalizarContextoArchitex(estadoProyecto, {
  contextVersion: '1.0.0',
  tenantId: null
});
console.log('Contexto Canónico normalizado.');
console.log('Content Hash:', contextoCanonico.contentHash);

// 3. Generar proyecciones (RSC-3)
const proyecciones = generarProyeccionesRsc3(contextoCanonico);
console.log('Proyecciones en memoria listas.');

// 4. Escribir físicamente en el repositorio
const archivos = escribirProyeccionesFisicas(proyecciones, raizProyecto);
console.log('Archivos proyectados físicamente:');
archivos.forEach(a => console.log(' ->', a));

console.log('\n--- GENERACIÓN FÍSICA RSC-3 COMPLETADA CON ÉXITO ---');
