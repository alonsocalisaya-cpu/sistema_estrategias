# Órbita — Gestión de estrategias

Dashboard local con cronograma, entregables, procesos y organigrama. Datos de ejemplo inspirados en el esquema proporcionado.

Ejecutar `npm start` y abrir http://localhost:5000. Requiere Node.js; no necesita instalar dependencias.

Permite filtrar áreas, crear actividades, consultar detalles, actualizar estados y exportar CSV. Los cambios se conservan en localStorage del navegador. El cronograma usa diciembre 2025 a julio 2026 como período ilustrativo. No incluye backend de datos ni sincronización entre usuarios.

Diseño actualizado a partir de la referencia visual de Mooncamp: indicadores con gráficos, resultados por área y barras de avance de entregables. Es una aplicación independiente, sin conexión con Mooncamp.

El avance asigna 0% a pendientes, 50% a actividades en curso y 100% a completadas, con el mismo peso por actividad. El gráfico distribuye el estado actual según el mes de inicio y lo compara con la finalización planificada; no representa un historial de mediciones. Los indicadores se recalculan al filtrar o cambiar estados.

El backlog permite alternar lista/tablero, buscar entregables o responsables, ordenar por prioridad/inicio/nombre y actualizar estados mediante selector o arrastre entre columnas. La prioridad se edita desde el detalle de cada actividad. Los entregables existentes reciben una prioridad inicial de ejemplo sin eliminar sus datos.

El flujograma muestra las secuencias por área, inicio/fin y validaciones de ejemplo con retornos a la última actividad. Esas decisiones son propuestas ilustrativas, no reglas confirmadas del proceso. La vista ampliada adapta el diagrama al ancho disponible. Las actividades del diagrama abren el mismo detalle que el backlog y el cronograma.

El cronograma tipo Project muestra una fila por actividad, tabla fija de nombre/duración/inicio, barras con avance y conectores de secuencia propuesta. Sus escalas mensual, semanal y diaria usan días calendario reales; Ajustar permite ver el período completo. El período ilustrativo abarca del 1 de diciembre de 2025 al 31 de julio de 2026, con 243 días. Los meses fraccionarios se convierten en días del mes correspondiente, redondeando al día más cercano. Las fechas exactas pueden editarse desde el detalle; el fin mostrado está incluido en la duración. No implementa un motor de reprogramación automática ni calendario de días laborables.

El flujograma incluye ajuste automático al contenedor y controles de zoom. Para verificar fechas, conversiones y proporcionalidad de barras en las cuatro escalas: `node test-project.cjs`.
