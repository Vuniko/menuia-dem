# Investigación de estabilidad — 16 octubre 2026

## Evidencia

Base de esta investigación: 5eeeaf2, rama feature/menuia-sales-agent-v2, PR borrador #7. Se conservaron las conversaciones abiertas del usuario; las pruebas se hicieron en una pestaña independiente con catálogo demo ficticio.

El despliegue de diagnóstico e08d59d / dpl_66xrTBFU16y1MjancFYQrAYTDYAX reprodujo el error para «Polo esencial talla M en negro por S/200». El registro seguro del servidor mostró:

```json
{"event":"commercial_failure","requestId":"9e80886d-892d-435b-92ac-f7efaec95dbb","stage":"model","code":"MODEL_UPSTREAM","status":503,"upstreamStatus":503,"finishReason":null,"elapsedMs":391}
```

La fuente pública de catálogo respondió HTTP 200. El fallo observado proviene de la llamada a Google, antes de validar JSON o IDs. Esta muestra permite atribuir ese fallo concreto a HTTP 503 del proveedor; no prueba que todas las interrupciones históricas tuvieran la misma causa, ni diagnostica el motivo interno de Google.

## Corrección

- Clasificación separada de HTTP del proveedor, límite de uso, configuración, red/timeout, bloqueo, truncamiento, JSON inválido e IDs no elegibles. Las salidas inválidas siguen rechazándose; no se presentan como datos comerciales.
- Un único reintento de servidor para respuestas HTTP transitorias explícitas 408/500/502/503/504, con espera de 500–999 ms y respeto de Retry-After corto. Retry-After mayor a dos segundos no se reintenta de inmediato. Se mantiene una única petición del navegador.
- Sin reintento automático ante red/timeout ambiguos, errores de configuración o HTTP 429. La señal de timeout de 30 s se comparte entre ambos intentos; máximo dos llamadas Google por petición.
- Ante agotamiento transitorio, respuesta útil con catálogo recién consultado, `provider: catalog`, `modelStatus: unavailable`, código y aviso explícito. El chat muestra «Gemini no disponible · respuesta basada en el catálogo publicado». No se etiqueta una respuesta de respaldo como Gemini.
- Después de dos peticiones fallidas consecutivas se pausa el modelo durante 30 s por instancia. Un HTTP 429 activa pausa inmediata según Retry-After, acotado a 120 s. Durante la pausa se sigue cargando catálogo fresco y no se llama al modelo. Un éxito verificado restablece el circuito.
- La concurrencia de modelo sigue limitada a dos; una tercera petición recibe orientación verificada de catálogo con aviso, sin llamada adicional al proveedor.
- No hay cambio de modelo, claves, variables, Production, SQL, datos ni Supabase remoto.

La política de reintento se basa en la [guía oficial de errores de Gemini](https://ai.google.dev/gemini-api/docs/troubleshooting). La validación estructurada sigue siendo obligatoria: [documentación oficial](https://ai.google.dev/gemini-api/docs/structured-output).

## Diagnósticos y privacidad

Se registran únicamente evento, UUID de petición, etapa, código permitido, status HTTP, status del proveedor, motivo de finalización permitido, intento y duración. No se registran preguntas, historial, nombres de productos, respuesta del modelo, URL autenticada, cabeceras, claves, cuerpo de errores ni contenido de razonamiento. El logger no puede interrumpir la respuesta si falla. Los códigos y UUID de referencia no autorizan acceso.

## Validación

271/271 pruebas Node aprobadas. Incluyen recuperación 503→200 con exactamente un reintento, dos 503 que agotan el límite, ausencia de reintentos en HTTP 400/401/403/404/429 y red ambigua, Retry-After largo, clasificación de truncamiento/bloqueos/JSON/IDs, minimización de registros, circuito y respuesta con catálogo fresco durante la pausa. Regresiones de comercio, administración, KB, carrito y Training Lab incluidas.

Comando: `node --test --test-isolation=none server/*.test.mjs training-lab/*.test.cjs`.

La comprobación real posterior se registra en el PR #7, identificando SHA y despliegue. Una muestra finita de Preview no es una garantía de disponibilidad de Google ni una prueba de carga. El circuito y las cuotas son por instancia; límites distribuidos, métricas persistentes y alertas requieren un trabajo posterior. La aplicación puede seguir respondiendo desde catálogo durante una indisponibilidad del modelo, sin fingir integración real exitosa.
