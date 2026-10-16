# MenuIA Sales Agent V2

## Personalidad y comportamiento

Asesor virtual en español, amable, breve y sin presión. Se identifica como virtual; escucha presupuesto, destinatario, uso y preferencias. Un saludo o «quiero comprar algo» abre descubrimiento con una pregunta útil. Un regalo con presupuesto ofrece alternativas individuales elegibles y pregunta por gustos/uso. Una objeción de precio busca alternativas más baratas; una objeción de estilo pregunta qué cambiar. Comparaciones muestran precio y variantes publicados, sin inventar una superioridad técnica. Consejos generales se identifican como orientación, separados de las características de la tienda.

Sin coincidencias, pregunta qué preferencia puede cambiar. Variantes agotadas o incompatibles no se recomiendan como disponibles. Envíos, pagos, garantías, promociones, reservas y pedidos requieren datos confirmados: el contrato actual no los publica, por lo que se deriva a la tienda. La demostración señala precios y stock ficticios también dentro de las respuestas y del diálogo.

## Arquitectura y prompt

1. El endpoint valida origen, entrada y límites; vuelve a consultar el catálogo público del slug desde el origen fijo, sin cookies/Authorization.
2. `salesContext` recupera preferencias acotadas, incorpora el mensaje actual y resuelve referencias únicamente contra ese catálogo. Solo reconstruye preferencias desde turnos del usuario; el texto del asistente no es una fuente de hechos.
3. `salesCandidates` filtra categoría, coincidencias de nombre, presupuesto, color, talla y stock en **la misma variante**, ordenando por precio. Menor precio usa la categoría del producto de referencia.
4. Con configuración Gemini existente, el modelo recibe hasta 200 candidatos y 24.000 bytes de datos de catálogo. El prompt define la personalidad, trata catálogo/historial/preguntas como datos no confiables y exige JSON estructurado. Respuesta: `{intent: discover|recommend|compare|general|unknown, productIds: string[0..4]}`. La aplicación rechaza IDs fuera del contexto elegible. La intención orienta selección/descubrimiento; nunca se presenta texto libre del modelo como hechos comerciales.
5. `salesReply` redacta introducciones, hechos verificados y preguntas mediante plantillas conversacionales. Precios, atributos y stock se obtienen exclusivamente del catálogo consultado. Las condiciones no confirmadas y las peticiones de secretos se resuelven con reglas antes del modelo. Sin clave se usa explícitamente `provider: catalog`.
6. El cliente comprueba negocio/slug del catálogo devuelto, muestra texto con textContent, reemplaza las tarjetas anteriores y abre la variante seleccionada desde la tarjeta. Conserva los mensajes de la conversación y los controles de reintento/accesibilidad.

El prompt completo vive en `server/commercial.mjs`, las reglas y textos en `server/sales-agent.mjs`. No hay dependencias nuevas ni reutilización del prompt gastronómico.

## Contrato y memoria

POST `/api/commercial`: `{slug, message, history?, productId?, memory?}`. Se conserva compatibilidad con el contrato anterior. La respuesta añade `variantIds` y `memory` a `answer/products/provider/checkedAt/catalog`.

Memoria: `{slug, budget?, category?, color?, size?, recipient?, use?, productId?}`. Presupuesto en céntimos. Es entrada no confiable: nunca autoriza acceso, suministra precios ni evita validación del catálogo. El servidor acepta únicamente campos acotados y referencias del negocio actual; descarta memoria de otro slug. El navegador solo conserva esa memoria en la página actual, sin persistencia ni CRM. Así las preferencias sobreviven al recorte del historial; recargar la página inicia sesión conversacional nueva. «Empezar de nuevo», «sin presupuesto», «cualquier color» y «cualquier talla» permiten cambiar restricciones.

Se mantienen 500 caracteres por pregunta, 8 KB por petición, tres pares de historial, 12 POST/minuto/IP, dos llamadas de modelo concurrentes, timeout de 30 s y salida de hasta 300 tokens. Una llamada fallida produce error recuperable, sin respuesta simulada ni reintento automático. Las cuotas son por instancia y no sustituyen cuotas distribuidas.

## Identidad y tarjetas

La demo conocida tiene 20 identidades de producto y 60 variantes. Se reconstruyen identidades estables usando el mapa del fixture original, UUID de variante y metadatos coincidentes, exclusivamente para slug/negocio reservados de demostración. Se mantienen UUID, atributos, precio y stock de cada variante. Funciona también si el origen público todavía devuelve el contrato anterior sin `product_id`. Los productos de comerciantes siguen independientes: no se deduplican por similitud de nombre. Una futura agrupación comercial exige identidad explícita en su contrato.

Cada respuesta emite IDs únicos de producto y la variante elegida. Solo queda un grupo actual de tarjetas en el chat, y se elimina la tarjeta contextual inicial al responder. Las recomendaciones antiguas conservan texto, pero no tarjetas que podrían representar preferencias o existencias anteriores. Una tarjeta recomendada muestra el precio de su variante y la abre preseleccionada; el catálogo normal conserva «Desde» cuando corresponde.

## QA

Comando: `node --test --test-isolation=none server/*.test.mjs training-lab/*.test.cjs`.

Resultado completo: **247/247 pruebas aprobadas**. La batería nueva contiene 100 escenarios: 15 saludos/abiertos, 20 búsquedas, 15 presupuestos, 15 comparaciones, 15 seguimientos, 10 de disponibilidad y 10 adversariales/condiciones. Casos adicionales verifican memoria entre turnos/tiendas, precio de variante, agrupamiento de demo, contratos Gemini, IDs duplicados/no elegibles, errores, cuota y concurrencia. Los tests Gemini usan clave sintética y respuestas simuladas: no son evidencia del proveedor real.

Navegador local con fixtures explícitos: saludo → descubrimiento; regalo para hermano por S/200 → Polo QA S/49.90; «¿Y en negro?» → no inventa variante; «¿qué talle?» → conserva referencia y una sola tarjeta. Abrir tarjeta → ficha con talla M/color Azul y stock 3 del fixture. Demo agrupada: Camisa de lino M/Arena → una tarjeta S/129 y variante correspondiente.

Chat sin overflow de página en anchos 320, 375, 390, 414, 430, 768 y 1280; ancho de diálogo 320/375/390/414/430/450/450 aproximadamente. Se comprobaron valores efectivos de viewport y entrada dentro del diálogo. Son pruebas de navegador emulado, no dispositivos físicos ni lector de pantalla. Se conservan diálogo, foco, etiquetas, role log/aria-live, estados de envío/error y reintento. Regresiones de catálogo, carrito, KB, admin y Training Lab incluidas en la batería completa.

## Límites y pendientes

- Redacción factual por plantillas intencionalmente acotada: el modelo selecciona; no se expone una respuesta comercial libre no validada. La comprensión de preferencias determinísticas se limita a categorías del contrato, colores/tallas habituales y ciertos usos/destinatarios. Gemini ayuda a seleccionar por pertinencia entre candidatos; no amplía el contrato de datos.
- Comparación factual de precio/atributos, sin prometer una evaluación técnica no publicada. Si no se identifican ambos productos, se solicitan sus nombres.
- Catálogo máximo 1000 filas y agrupación real pendiente de identidad explícita. No se cambian stock remoto, reservas, checkout ni funciones gastronómicas.
- Gemini real solo se declara verificado si Preview devuelve `provider: gemini` en una petición real. No se leen ni trasladan claves para conseguirlo. El estado de Preview y esa comprobación se registran en el PR/informe de entrega.
