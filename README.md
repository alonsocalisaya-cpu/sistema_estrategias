# Órbita — Gestión de estrategias

El dashboard actual muestra el flujograma a la izquierda y el cronograma a la derecha, en columnas de igual ancho. La tarjeta de cronograma integra las pestañas Cronograma y Entregables; el acceso Entregables del menú abre esa misma pestaña. El equipo mantiene su tarjeta. Documentación y Registros están agrupados como dos pestañas en una única tarjeta de Documentación del proyecto; ambos accesos del menú abren su pestaña correspondiente. Se retiraron las tarjetas superiores de indicadores y la tarjeta de visión compartida.

## Flujo Studio integrado

El botón **Editar en Flujo Studio** abre el editor original en una ventana del dashboard. Permite crear y mover figuras, conectar desde los bordes o con el modo Conectar, editar texto con doble clic, cambiar tamaños, seleccionar varias figuras, alinear, deshacer/rehacer, validar decisiones e importar/exportar JSON o SVG. La vista de consulta del dashboard es estática y no selecciona actividades.

La implementación está en `src/flow-studio/`: `editor/` conserva el editor reutilizado; `model.js` valida el modelo y define la plantilla y las rutas; `preview.js` dibuja la vista de consulta; `integration.js` comunica ambos documentos mediante mensajes con comprobación de origen y ventana emisora. `editor/bridge.js` mantiene las rutas compartidas y notifica cambios. Los atajos del editor quedan aislados dentro de su documento.

Se propone una plantilla con las actividades de las tres áreas y validaciones ilustrativas Sí/No. El diagrama se guarda automáticamente en la clave local `orbita-flow-studio-v1`, separada del editor anterior y de las actividades del cronograma. Su edición no reprograma actividades ni modifica entregables. Puedes importar un JSON del Flujo Studio anterior desde **Abrir**. Para comprobar modelos y conexiones: `node tests/flow-studio.test.mjs`.

### Conectores, carriles y biblioteca ampliada

- Las flechas admiten ángulos rectos, líneas libres y curvas. Al seleccionar una conexión aparecen puntos morados para modificar su recorrido y extremos blancos para reconectar. El inspector permite añadir/quitar puntos, ajustar coordenadas X/Y, elegir puertos de entrada/salida, mover etiquetas, cambiar color, grosor, trazo y puntas. Restablecer recorrido recupera la ruta automática.
- La biblioteca tiene 17 elementos, incluidos subprocesos, preparación, operación manual, espera, entrada/salida, conectores, anotaciones, varios documentos, carriles horizontales/verticales y secciones. Se pueden buscar figuras y cambiar el tipo desde el inspector.
- Los carriles y secciones se dibujan detrás de las conexiones y las actividades. Al mover un carril se desplazan sus actividades y los puntos manuales de las conexiones internas. Separar por áreas crea carriles para las actividades reconocidas de Calidad, Digital y Marketing. Eliminar un contenedor conserva sus actividades; las figuras se pueden editar y redimensionar por separado.
- El selector de elementos del inspector permite localizar conexiones y figuras con precisión incluso con poco zoom. Los modelos anteriores siguen siendo compatibles. JSON conserva los estilos, puntos y contenedores; SVG exporta el diagrama sin tiradores, incluyendo rutas que salgan del área ocupada por las figuras.

`shapes.js` centraliza las figuras y `routing.js` los puertos, rutas y límites del diagrama, compartidos por editor, vista de consulta y exportación. Las extensiones del editor están separadas en `palette.js`, `connectors.js`, `containers.js` y `advanced.js`. La descarga se realiza desde el dashboard tras verificar el origen y la ventana emisora del editor.

Documentación y Registros permiten adjuntar archivos de hasta 25 MB o enlaces HTTP/HTTPS, con título, descripción, área y fecha. Incluyen búsqueda, filtros, descarga y retirada con opción de deshacer. Los archivos se almacenan en IndexedDB de este navegador, separados de los datos del cronograma. No se sincronizan con otros equipos ni se suben a GitHub; al borrar el almacenamiento del navegador se pierden las copias locales. Los enlaces abren la fuente original y mantienen sus permisos de acceso. Para verificar la validación de enlaces: `node tests/resources-store.test.mjs`.

Dashboard local con cronograma, entregables, procesos y organigrama. Datos de ejemplo inspirados en el esquema proporcionado.

Ejecutar `npm start` y abrir http://localhost:5000. Requiere Node.js; no necesita instalar dependencias.

Permite filtrar áreas, crear actividades, consultar detalles, actualizar estados y exportar CSV. Los cambios se conservan en localStorage del navegador. El cronograma usa diciembre 2025 a julio 2026 como período ilustrativo. No incluye backend de datos ni sincronización entre usuarios.

Diseño actualizado a partir de la referencia visual de Mooncamp: indicadores con gráficos, resultados por área y barras de avance de entregables. Es una aplicación independiente, sin conexión con Mooncamp.

El avance asigna 0% a pendientes, 50% a actividades en curso y 100% a completadas, con el mismo peso por actividad. El gráfico distribuye el estado actual según el mes de inicio y lo compara con la finalización planificada; no representa un historial de mediciones. Los indicadores se recalculan al filtrar o cambiar estados.

El backlog permite alternar lista/tablero, buscar entregables o responsables, ordenar por prioridad/inicio/nombre y actualizar estados mediante selector o arrastre entre columnas. La prioridad se edita desde el detalle de cada actividad. Los entregables existentes reciben una prioridad inicial de ejemplo sin eliminar sus datos.

El flujograma muestra las secuencias por área, inicio/fin y validaciones de ejemplo con retornos a la última actividad. Esas decisiones son propuestas ilustrativas, no reglas confirmadas del proceso. La vista ampliada adapta el diagrama al ancho disponible. Las actividades del diagrama abren el mismo detalle que el backlog y el cronograma.

El cronograma tipo Project muestra una fila por actividad, tabla fija de nombre/duración/inicio, barras con avance y conectores de secuencia propuesta. Sus escalas mensual, semanal y diaria usan días calendario reales; Ajustar permite ver el período completo. El período ilustrativo abarca del 1 de diciembre de 2025 al 31 de julio de 2026, con 243 días. Los meses fraccionarios se convierten en días del mes correspondiente, redondeando al día más cercano. Las fechas exactas pueden editarse desde el detalle; el fin mostrado está incluido en la duración. No implementa un motor de reprogramación automática ni calendario de días laborables.

El flujograma incluye ajuste automático al contenedor y controles de zoom. Para verificar fechas, conversiones y proporcionalidad de barras en las cuatro escalas: `node test-project.cjs`.
