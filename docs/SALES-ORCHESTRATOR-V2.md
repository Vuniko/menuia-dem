# MenuIA — Sales Orchestrator V2 (propuesta de arquitectura)

**Estado:** DISEÑO, NO IMPLEMENTADO NI DESPLEGADO.
**Base:** feature/menuia-commerce-v3-premium. **Implementación funcional V2 existente:** feature/menuia-sales-agent-v2, PR #7. **Nunca sobrescribir la rama V2 ni sus cambios.**
**Objetivo:** coordinar capacidades de ventas, memoria y herramientas de un vendedor especializado por negocio, sin convertir Gemini en fuente de verdad de catálogo.

## 0. Qué ya existe
La rama V2 contiene server/sales-agent.mjs (salesContext, salesCandidates, salesReply), server/commercial.mjs, memoria acotada por slug, productos/candidatos, integración Gemini con selección estructurada, deduplicación de tarjetas y 248 tests según docs/SALES-AGENT-V2.md. Documenta también pruebas reales Gemini en Preview. Este diseño es **una continuación y no una reimplementación**. Antes de programar, auditar PR #7 y escoger explícitamente la versión base de código; de preferencia integrar después de revisar V2.

## 1. Responsabilidad única del orquestador
Coordinar la petición del comprador con este flujo:
1. Resolver tenant a partir de slug público validado por el servidor; obtener catálogo publicado, inventario y políticas permitidas.
2. Normalizar petición e historial, construir memoria segura únicamente dentro de la sesión del tenant.
3. Clasificar intención: greeting, discovery, browse, recommend, compare, product_detail, variant, objection_price, objection_other, cart_help, policy, general, unknown.
4. Elegir skill/herramienta por intención; resolver productos y variantes con filtros deterministas.
5. Consultar Gemini para lenguaje o selección cuando aporte valor, sin confiar en sus referencias a precios, stock o políticas.
6. Validar productIds/variantIds y condiciones de negocio contra snapshot de catálogo fresco; deduplicar tarjetas.
7. Renderizar respuesta y próximo paso útil; registrar métricas sin almacenar secretos ni mensajes personales innecesarios.

## 2. Skills desacopladas (funciones JS, NO agentes independientes)
- discoverNeeds: detecta información imprescindible faltante; 1 pregunta máxima.
- retrieveCatalog: búsqueda por nombre, categoría, atributos, presupuesto; catálogo del tenant.
- recommendProducts: puntúa compatibilidad + stock + precio y explica con hechos válidos.
- compareProducts: compara atributos existentes; no inventa superioridad.
- resolveVariants: talla/color/SKU, stock e incompatibilidades.
- handleObjection: precio, incertidumbre, disponibilidad, confianza.
- answerStorePolicies: solo condiciones comerciales publicadas y verificadas.
- guideCart: orienta hacia ficha/carrito existente; NO crea pagos, pedidos ni reservas.
- answerGeneral: separa conocimientos generales de atributos comerciales confirmados.
- safeFallback: ante Gemini caído/desconocido, mantiene continuidad y explica límites.

## 3. Contrato conceptual
Entrada interna:
{
  tenantSlug, message, history, sessionMemory, contextProductId
}
Salida interna:
{
  intent, selectedSkill, memoryPatch, eligibleProductIds, eligibleVariantIds,
  replyPlan: {facts, question, cta}, confidence, requiresGemini
}
Respuesta HTTP compatible:
{
  answer, products, variantIds, memory, provider, checkedAt, catalog,
  orchestration?: {intent, skill, phase}
}
Los campos internos NO exponen razonamiento privado ni prompts. Campos nuevos opcionales, preservar clientes antiguos.

## 4. Memoria
Estado mínimo: slug, conversationStage, category, budgetMaxCents, color, size, recipient, use, selectedProductId, shownProductIds, explicitExclusions, pendingQuestion.
- Aceptar solo allowlist de claves/tipos y límites; memoria del cliente no autoriza datos.
- TTL de sesión y política de privacidad en implementación posterior; evitar datos sensibles.
- Correcciones del usuario reemplazan preferencias; «empezar de nuevo» restablece todo salvo tenant.
- Resolver «el segundo» contra el orden exacto de IDs de la última recomendación validada; no contra una respuesta anterior o productos de otra tienda.
- Separar memoria conversacional efímera de historial comercial/CRM (no creado aún).

## 5. Máquina de estados flexible
discovery -> consideration -> selection -> cart_guidance, con saltos permitidos.
- Hola/«quiero comprar algo»: preguntar categoría o finalidad, no mostrar error.
- Presupuesto sin categoría: pedir interés o sugerir 2-3 opciones verificadas solo si ayuda.
- Comparación: si faltan identificadores, aclarar; si están, comparar hechos.
- «Más barato»: usar referencia anterior, stock y variante; si no hay, declararlo y ofrecer ampliar categoría o presupuesto.
- Compra: seleccionar variante y guiar al carrito; no prometer checkout.

## 6. Gemini y seguridad
- Gemini del lado del servidor, credenciales jamás en navegador.
- Preferir salida estructurada para intención/IDs/plan; el texto comercial final se genera o valida mediante hechos autorizados.
- Descripciones de productos, historial y preguntas son datos no confiables: no pueden redefinir reglas, skills ni tenant.
- Nunca dejar que el modelo autorice escrituras, cambie precio, anuncie descuentos inexistentes, acceda a otra tienda o ejecute acciones externas.
- Límites de tiempo, tamaño, coste y concurrencia. Degradación transparente a catálogo cuando falla.
- Condiciones comerciales desconocidas: explicitar que requieren confirmación.

## 7. Observabilidad y calidad
Registrar requestId, slug pseudonimizado cuando corresponda, intención, skill, provider, duración, cantidad de recomendaciones, error, sin API key ni mensajes completos por defecto.
Métricas: finalización de recomendaciones, compatibilidad de catálogo, tasa de fallback, respuestas inexactas, consistencia de memoria y errores 429/503.
Training Lab V2: al menos 100 conversaciones multi-turno y pruebas de:
- «quiero comprar algo» sin presupuesto
- presupuesto + categoría y preferencias, corrección posterior
- «el segundo», «¿y en negro?», «más barato»
- producto/variante agotada
- promociones no verificadas
- dos tiendas con IDs similares
- fallos Gemini, timeout y catálogo vacío
- prompt injection en descripción y mensaje

## 8. Fases futuras (sin ejecutar todavía)
1. Auditar V2 y congelar contratos API existentes.
2. Extraer orchestrator puro (Node ESM) que componga sales-agent.mjs sin duplicar reglas.
3. Registrar skills en catálogo cerrado de funciones, sin ejecución arbitraria.
4. Implementar selección por intención y memoria validada.
5. Conectar en server/commercial.mjs con feature flag en Preview, sin alterar Production.
6. Añadir pruebas de regresión y evaluación real Gemini con casos de usuarios.
7. PR draft separado hacia rama revisada de V2; nunca fusionar automáticamente.

## Regla operativa
La existencia de este documento y rama solo prueba que el diseño está guardado. No implica que un nuevo motor esté integrado en el endpoint, que se haya probado Gemini, ni que esté activo en Production.
