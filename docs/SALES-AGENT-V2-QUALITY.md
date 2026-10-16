# Revisión de calidad comercial — 16 octubre 2026

## Hallazgos

En el Preview anterior, «Quiero comprar algo, pero no sé qué. Es para mi hermano» produjo cuatro recomendaciones heterogéneas sin conocer presupuesto ni intereses. El texto enumeraba Polo, Teclado, Audífonos y Parlante; las tarjetas mostraban Polo, Audífonos, Teclado y Parlante. Esa diferencia hacía ambigua una selección como «el segundo». La revisión de reglas también encontró que un presupuesto corto («200») no se interpretaba, las opciones anteriores no quedaban disponibles para «compara ambos» y una negación de color podía interpretarse como preferencia positiva.

## Cambios

- Descubrimiento por pasos: pregunta por presupuesto cuando falta; acepta un número suelto solo después de esa pregunta; después pregunta por interés o tipo de producto. Un regalo genérico no dispara recomendaciones arbitrarias aunque el modelo devuelva IDs.
- Presupuesto, destinatario y preferencia musical sobreviven entre turnos. Para música se recuperan productos cuyos nombres/descripciones publicados mencionan audífonos, parlantes, música o sonido; no se asignan características técnicas no publicadas.
- Hasta tres recomendaciones iniciales. Se mantienen hasta cuatro IDs de las opciones mostradas para comparaciones y referencias ordinales. Texto y tarjetas comparten el mismo orden y las tarjetas siguen deduplicadas.
- «Compara ambos», «el primero», «el segundo» y «el último» resuelven exclusivamente productos presentados del negocio actual. Una referencia ambigua («ese») pide aclaración en lugar de elegir por el cliente.
- «No en negro» y «no me gusta en negro» excluyen ese color sin descartar el producto. Una preferencia positiva posterior puede volver a elegirlo. Cambiar de rubro limpia la talla y color del rubro anterior.
- Rechazar un producto lo excluye de las siguientes alternativas. Si se nombra otro producto en el rechazo, se excluye el nombrado. Precio, color y estilo abren preguntas breves; se conserva la preferencia declarada. El estilo ayuda a orientar la selección del modelo, pero no se presenta como un atributo certificado del catálogo.
- El seguimiento de una variante no repite la pregunta genérica de uso. Elegir una opción invita a abrir la ficha y aclara que no confirma un pedido. «Gracias, ¿y en negro?» atiende la pregunta; una cortesía aislada conserva su respuesta breve.

## Memoria y límites

Se añaden `pending`, `shownProductIds`, `excludedProductIds`, `excludedColors` y `style` a la memoria no confiable ya existente. Estados pendientes limitados a enumeraciones, IDs filtrados contra el catálogo actual (máximo cuatro) y colores acotados (máximo tres). Ningún campo aporta hechos comerciales ni autoriza acceso. Se conservan los límites de entrada, el historial acotado, la separación por slug y las comprobaciones de precio/variante/stock.

La intención, los IDs de Gemini y las preferencias no sustituyen la redacción factual del servidor. La política de recuperación de errores y el aviso explícito cuando Gemini no está disponible se mantienen.

## Pruebas

290/290 pruebas Node aprobadas: 19 nuevas comprobaciones de calidad conversacional y regresiones anteriores. Incluyen regalo → importe corto → música; descubrimiento obligatorio aunque Gemini seleccione IDs; comparación y selección ordinal; ambigüedad; negación de color; cambio de rubro; rechazo → precio → importe; rechazo nombrado; estilo; cortesía con seguimiento; orden de tarjetas y memoria ajena/malformada.

Se actualizaron dos entradas de pruebas de contrato Gemini para especificar ropa: siguen comprobando precios del servidor, deduplicación y rechazo de IDs inventados, sin exigir que un regalo sin preferencias salte el descubrimiento.

Comando: `node --test --test-isolation=none server/*.test.mjs training-lab/*.test.cjs`.

Las conversaciones reales del Preview actualizado y su proveedor se registran en el PR #7 con SHA/despliegue. Esta revisión no constituye una medición de conversión ni una prueba con compradores reales. No se cambian Production, variables, claves, datos, SQL ni Supabase remoto.

Preview fcceeb6: comprobación real de cinco turnos con proveedor Gemini — regalo sin idea → pregunta de presupuesto; «200» → pregunta por gustos; «Le gusta la música» → Audífonos S/159 y Parlante S/189; «Compara ambos» → esas mismas dos opciones; «Me quedo con el segundo» → Parlante y una sola tarjeta, sin confirmar pedido. Se completó además el reconocimiento contextual de todos los colores admitidos (no solo negro), con prueba de Camisa Arena → no Arena → Blanco y rechazo correcto de Gris no publicado. El resultado del Preview final está en el PR.
