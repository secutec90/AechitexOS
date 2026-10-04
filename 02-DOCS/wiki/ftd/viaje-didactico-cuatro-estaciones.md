# Viaje didáctico en cuatro estaciones

## Intent
Hacer que la primera pantalla explique el sistema en lenguaje cotidiano y que el menú, el avance y el siguiente paso se entiendan sin recorrer una lista larga.

## Scope
Dentro: un solo panel de bienvenida, stepper de 4 estaciones, menú en 4 carpetas, botones de continuar y cabecera reducida a nombre, progreso y Acciones.
Fuera: no se eliminan secciones, voz, copiar, Sheets ni el catálogo.

## Checklist
- [x] Un solo panel de inicio con tres entradas y semáforo. Prueba: la página servida muestra el título pedido y, con el ejemplo cargado, el aviso verde «El plano está listo para programar».
- [x] Stepper que cambia con la sección. Prueba: al pulsar Estación 2 se abre Actores y esa estación queda marcada.
- [x] Menú por fases y Acciones con importar, exportar, auditar y reiniciar. Prueba: el menú Acciones lista esas cuatro acciones y las 23 vistas siguen en el HTML.
- [x] Sintaxis del script. Prueba: `node --check` del bloque script terminó válido.

## Evidence
Servidor local en el puerto 8765. Recorrido: inicio con semáforo verde; Estación 2 abre Actores; Acciones muestra Importar, Exportar, Auditar Drive y Reiniciar. Conteo: 23 secciones abiertas y 23 cerradas, cada id del menú tiene su vista.

## Next
Revisar el mismo flujo en el teléfono, donde el menú lateral queda fuera de la pantalla hasta pulsar ☰.
