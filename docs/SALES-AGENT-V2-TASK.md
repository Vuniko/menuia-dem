# Tarea preparada para Codex: MenuIA Sales Agent V2

**Estado:** LISTA PARA EJECUTAR CUANDO HAYA CUPO DE CODEX (no iniciada automáticamente).
**Repositorio:** Vuniko/menuia-dem
**Rama base:** feature/menuia-commerce-v3-premium
**Rama de implementación sugerida:** feature/menuia-sales-agent-v2

## Instrucción inicial para Codex
Leé AGENTS.md y este documento. Inspeccioná el HEAD remoto de la rama base y cualquier PR/rama sales-agent existente antes de crear ramas. Conservá cambios no fusionados y no sobrescribas trabajo previo. Trabajá solo en una rama aislada. Auditá, implementá y probá MenuIA Sales Agent V2; abrí PR borrador sin fusionarlo. No modificar Production, main, variables, claves, dominio, despliegues productivos ni bases remotas.

## Propósito
Transformar el chat e-commerce actual en un asesor de compras con Gemini que:
1. Responda de forma humana y natural a saludos y peticiones abiertas (ej. «Quiero comprar algo»), sin responder que no hay información.
2. Descubra necesidades con preguntas breves y pertinentes; recuerde categoría, persona destinataria, presupuesto, variantes y producto mencionado durante la sesión.
3. Recomiende y compare productos y variantes REALES del catálogo de la tienda correcta; no invente stock, precio, promociones, garantías, plazos, pagos, pedidos ni descuentos.
4. Responda dudas generales sin fingir que son atributos confirmados de un negocio.
5. Muestre tarjetas deduplicadas por producto, con precio obtenido del servidor y selección de variante/stock adecuado.
6. Mantenga accesibilidad, chat móvil, estados de carga/errores/reintento, límites y aislamiento multiempresa.

## Hallazgos técnicos iniciales
- server/commercial.mjs implementa GET/POST /api/commercial; POST puede responder con groundedAnswer determinístico o usar Gemini para clasificar intención/IDs. El backend compone textos estructurados rígidos, no respuesta libre validada.
- assets/commerce-v3-chat.mjs prepara historial acotado y POST; assets/commerce-v3.js presenta chat.
- La fuente comercial publicada pasa por la API comercial, y el servidor valida UUID, negocio, precio, stock, categorías y productos. Revisar actualidad de contrato antes de cambios.
- Para pruebas usar catálogo ficticio y fixtures. El antiguo chat gastronómico (/api/chat) no es el asistente comercial.
- No dar por confirmada respuesta real de Gemini V2 solo por clave existente: comprobar el proveedor en Preview mediante request real autorizado, nunca mostrar secretos.
- Mantener la seguridad del PR #4 como pendiente; no aplicar parches SQL remotos.

## Etapas de ejecución
### A. Auditoría
- Leer AGENTS.md, docs/COMMERCE-V3.md y docs/COMMERCIAL-ENDPOINT.md; inspeccionar pruebas, PRs, SHA y código del cliente/servidor.
- Identificar rutas que bypassan Gemini y causa de tarjetas duplicadas; documentar riesgos.
### B. Diseño de agente
- Separar: intención y contexto -> recuperación de catálogo -> selección estructurada -> redacción natural -> verificación y renderizado.
- Mantener Gemini y claves en servidor.
- Usar esquema estructurado para IDs e intención; generar respuesta conversacional sin confiar en el modelo para hechos comerciales. Cualquier respuesta con afirmaciones de precios, variantes o disponibilidad debe componerse exclusivamente con datos verificados o pasar validación robusta y ser rechazada si es inconsistente.
- Gestionar caso sin coincidencias preguntando una preferencia útil, sin inventar ofertas.
- Distinguir características generales de datos de la tienda; nunca fingir identidad humana.
### C. Implementación
- Mejorar handling de saludos, compra genérica, regalos, preferencias, presupuestos, objeciones, comparaciones, respuestas de seguimiento, variantes y agotados.
- Dedupe por productId para tarjetas, evitando colapsar variantes comercialmente distintas.
- Historial acotado con separación de tenant; límites de tokens, concurrencia, uso, coste y errores 429/503.
- No reutilizar prompt gastronómico ni introducir nuevas dependencias sin justificación.
### D. QA
- Al menos 100 escenarios: 15 saludos/abiertos, 20 búsquedas, 15 presupuestos, 15 comparaciones, 15 seguimiento, 10 disponibilidad, 10 adversariales.
- Reglas unitarias, integración con fixtures, accesibilidad y regresiones de catálogo/carrito/KB/admin/Training Lab.
- Probar respuestas Gemini reales en Preview si la configuración de esa rama lo permite; si falta, informar bloqueo sin cambiar variables.
### E. Entrega
- docs/SALES-AGENT-V2.md con arquitectura, prompts, contratos, riesgos, test coverage y resultados.
- PR draft hacia feature/menuia-commerce-v3-premium, no merge.
- Informe con SHA, archivos, pruebas, qué fue mock, qué fue Gemini real, demo Preview y pendientes.

## Criterios de aceptación
- «Hola, quiero comprar algo» obtiene conversación útil, no error por ausencia de producto.
- «Regalo para mi hermano por S/200» guía búsqueda y respeta presupuesto en las recomendaciones concretas.
- «¿Y en negro?», «¿algo más barato?», «¿qué talle?» mantienen referencia correcta.
- No duplica la misma ficha de producto en tarjetas.
- No recomienda productos agotados como disponibles; no mezcla tenants; no inventa promociones.
- Error de Gemini es transparente; no se presume que se hizo un pedido ni un pago.
- Production, main, secretos, Supabase remoto intactos.

## Texto para iniciar cuando se renueve el cupo
«En Vuniko/menuia-dem, revisá AGENTS.md y docs/SALES-AGENT-V2-TASK.md de la rama feature/menuia-commerce-v3-premium. Ejecutá la tarea de Sales Agent V2 en una rama aislada con pruebas y PR draft. No cambies Production, main, variables ni Supabase remoto. Avisame del resultado y limitaciones».

**Nota:** Este archivo NO programa una ejecución de Codex ni detecta automáticamente la renovación de cuota. Se requiere iniciar una tarea cuando haya cupo.
