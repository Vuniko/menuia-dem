# Recuperación del chat — 12 de octubre de 2026

El usuario informa fallos después de varios mensajes. Se reprodujo una causa concreta sin leer claves ni cambiar el servidor: el cliente enviaba diez mensajes previos completos, pero /api/chat rechaza JSON de más de 4.000 caracteres antes de consultar Gemini. Además, el servidor solo acepta entradas de historial de hasta 700 caracteres. Una conversación con respuestas largas puede exceder el tamaño del cuerpo aunque la pregunta nueva sea corta.

La prueba invoca el endpoint actual: historial anterior grande → 400; misma pregunta de IPA con contexto acotado → 200, respuesta de reglas S/19. No demuestra que todos los fallos reportados tengan esa causa; pueden existir límites de consultas, cortes de red o interrupciones del proveedor.

## Cambios

- `assets/chat-transport.mjs`: contexto compuesto de pares user/assistant recientes; entradas limitadas a 700 caracteres y cuerpo UTF-8 a 3.800 bytes para la demo, 7.600 para KB. Se descartan primero pares antiguos. Las preguntas y mensajes visibles no se recortan por este proceso.
- `assets/premium-dark.js`: conserva la pregunta fallida en el campo, mantiene la conversación y evita duplicar la burbuja al reintentar la misma pregunta. Mensajes claros para cortes, respuestas incompletas, servidor temporalmente ocupado y cuota 429.
- Cuota: cooldown de 60 segundos cuando no se recibe Retry-After; los controles se recuperan al finalizar o al volver Internet. No se alteran límites del servidor.
- No hay reenvío automático de POST tras un timeout/corte: la primera llamada podría haber consumido Gemini. El usuario decide cuándo reintentar.
- El timeout existente de 55 segundos permanece; no se modifica proveedor, modelo, prompt, Gemini key, backend, API, Production, RLS ni datos remotos. El contexto del modelo prioriza turnos recientes; la conversación completa sigue visible durante la sesión de página. No se añade almacenamiento persistente de chats.

## Pruebas

78 pruebas Node aprobadas, cinco nuevas: reproducción 400/200 con el endpoint actual, UTF-8 y pares/historial sin mutación, contrato KB, cuota/JSON incompleto y ausencia de POST duplicado por red/timeout/503. Las simulaciones no usan claves reales ni hacen llamadas a Google.

```sh
node --test --test-isolation=none server/chat-resilience.test.mjs server/demo-v2.test.mjs server/admin.test.mjs server/knowledge.test.mjs server/public-menu.test.mjs server/training.test.mjs server/preview.test.mjs training-lab/csv.test.cjs training-lab/evaluation.test.cjs
```

La comprobación visual usa el fixture explícito de la V2 para error/reintento. El Preview de la rama recibe la clave que el usuario ya configuró; no se copió ni modificó su valor. La validación del nuevo despliegue se registra en el PR #5. No se garantiza disponibilidad continua del proveedor o de la conexión del dispositivo.
