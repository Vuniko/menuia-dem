# Dos promociones ilustrativas — 12 de octubre de 2026

Fuente única: `assets/demo-promotions.json`, leída por la interfaz pública y el servidor. Los productos y precios normales mantienen la carta existente. Sin escrituras en Supabase, migraciones, RLS, claves o main.

| Oferta de ejemplo | Incluye | Normal | Promo | Ahorro |
|---|---|---:|---:|---:|
| Combo cervecero | 1 Hamburguesa clásica + 1 Golden Ale | S/45 | S/39 | S/6 |
| Combo refrescante | 1 Papas de la casa + 1 Maracuyá frozen | S/29 | S/25 | S/4 |

Precios por combo, no acumulables. Oferta ficticia disponible durante la demo, sin horarios especiales ni vencimiento inventado; no válida en negocios reales. El combo con cerveza incluye condición para mayores de 18 años. Disponibilidad, ingredientes y trazas deben confirmarse con el personal.

La sección Promos muestra los dos combos, precios normales, ahorro y condiciones. El chat responde a «promos», «promociones», «ofertas» y consultas de presupuesto: S/30 ofrece solo el combo S/25; S/40 admite ambos. Filtros sin alcohol y contexto de menor excluyen la oferta con cerveza. No se inventan 2x1 ni happy hour. Los combos con comida no se sustituyen por cerveza sola cuando el usuario pide solo bebidas.

El contexto enviado a Gemini y al backend local incluye los mismos registros, con precio normal y precio total promocional. No se cambian precios individuales de productos. Las respuestas de catálogo/promociones se resuelven con datos registrados y están identificadas como respuestas de la carta; Gemini sigue atendiendo conversación abierta.

97 pruebas Node y 34 comprobaciones legacy aprobadas. Cinco pruebas nuevas verifican igualdad de fuente UI/servidor, cantidades y ahorros, listado de ambos combos, presupuestos/filtros, descarte de ofertas inválidas/inactivas y el endpoint/prompt real sin llamadas externas. La verificación visual y el resultado de Preview/publicación se registran en el PR #5. Esta modificación afecta la demo ilustrativa; no agrega ofertas a los negocios de Knowledge Base.
