# Respuestas completas de la carta — 12 de octubre de 2026

El usuario solicita las cuatro cervezas y mejores respuestas frecuentes. Problemas comprobados: `mentionedProducts()` recortaba las tarjetas a tres; el modelo también había propuesto una combinación por encima del presupuesto antes de dar otra válida. La demo pública usa doce registros ilustrativos, no inventario de un negocio real.

Cambios en la rama V2:

- Se elimina el límite de tres tarjetas. Cuadrícula de dos columnas, con todas las coincidencias válidas visibles mediante scroll vertical, sin ocultar la cuarta fuera de una tira horizontal.
- `server/menu-answers.mjs` recibe los productos del servidor existente; no añade otra tabla de precios. Resuelve listas completas de cervezas, platos, bebidas sin alcohol y toda la carta antes del contexto de un producto anterior.
- IPA artesanal S/19, Golden Ale S/17, Stout S/20 y Red Ale S/18 se enumeran para preguntas de catálogo. Una recomendación de estilo («una suave») mantiene el tratamiento especializado anterior.
- Presupuestos: opciones calculadas en centavos; ninguna opción propuesta supera el monto. Presupuestos específicos de cerveza listan todas las cervezas que caben, sin sustituirlas por comidas. Restricciones dietarias no se resuelven con el algoritmo de combos: se conserva el manejo prudente anterior.
- Gemini sigue disponible para conversación abierta y solicitudes no cubiertas por reglas; `/api/gemini-check` mantiene sus llamadas directas. El cliente identifica las respuestas de la carta como tales, sin presentarlas como Gemini.
- No se modifican claves, cuotas, contratos HTTP, Knowledge Base, RLS, esquemas ni datos remotos. El alcance de estas reglas es la carta ilustrativa de `/api/chat`; no constituye una conexión nueva de negocios reales.

Validación: **91 pruebas Node y 34 comprobaciones legacy aprobadas**. Incluyen diferentes formulaciones del catálogo, las cuatro tarjetas y precios, doce productos, cuatro comidas/bebidas, listas mixtas de ocho bebidas, presupuesto solo cerveza, límites/céntimos, preferencias y dieta; prueba del endpoint real con historial de Stout y sin llamadas al modelo. Se mantienen las pruebas de ingredientes/precios/memoria anteriores. Resultados de Preview y publicación se registran en el PR #5.

Esto cubre preguntas frecuentes concretas con datos de la carta. No representa un porcentaje de exactitud de Gemini sobre preguntas arbitrarias ni garantiza disponibilidad, alérgenos o información que no esté registrada. Las respuestas abiertas siguen requiriendo revisión conforme al contexto.
