# Validación Commercial Skills V1 + Resolve Variants / Guide Cart

**Rama:** `feature/menuia-commercial-skills-v2-validate`.
**Base de PR:** `feature/menuia-commercial-skills-v1`. **Sin cambios en Production ni bases remotas.**

## Alcance
1. Revisadas las 5 skills iniciales: discoverNeeds, retrieveCatalog, recommendProducts, compareProducts y handleObjection.
2. Reforzado `safeRows`: proyecta exclusivamente productos y variantes canónicos del catálogo validado, nunca acepta como autoridad nombres, precio o stock aportados por `candidates`. Rechaza variantes ajenas, agotadas, IDs inconsistentes o valores inválidos.
3. Nueva `resolveVariants`: exige producto de la sesión, verifica atributos de talla/color y stock de una misma variante, distingue opción inequívoca, opciones múltiples, agotado y producto no indicado. No reserva unidades.
4. Nueva `guideCart`: identifica cuándo se debe seleccionar una variante o abrir la ficha; devuelve estado `ready_for_product_page` para una variante inequívoca. El campo `canAdd` se mantiene **false**: el servidor no autoriza ni escribe el carrito. No crea pedidos ni pagos.
5. Orquestador consume las dos nuevas skills para respuestas basadas en catálogo, sin cambiar los contratos de red.

## Validación automatizada
- `server/commercial-skills.test.mjs`: ocho casos iniciales para las cinco skills.
- `server/commercial-skills-v2.test.mjs`: nueve casos de selección de variante, stock, carrito sin side effects, rechazo de candidatos adulterados y enrutamiento.
- `server/sales-orchestrator.test.mjs`: pruebas de descubrimiento, presupuesto, precio y memoria entre tenants.
- Flujo CI añadido: `.github/workflows/commercial-skills.yml` para Node 22 y ejecución de pruebas focalizadas y regresión total.

## Criterios pendientes
Hasta contar con resultado explícito de GitHub Actions, no declarar las pruebas aprobadas. También faltan validaciones del navegador y Gemini real en esta rama; por ahora el flujo de Gemini sigue usando `salesReply` y la mayoría de skills especializadas están integradas en la respuesta de catálogo/fallback. Para habilitar compras con un CTA desde el chat deberá añadirse una interacción de UI autorizada, validando nuevamente la variante y stock antes de añadir al carrito local.

## Seguridad
No se modificaron secretos, variables, Supabase remoto, Production ni `main`. No se hicieron escrituras comerciales ni reservas. El motor continúa siendo una ayuda de compra.
