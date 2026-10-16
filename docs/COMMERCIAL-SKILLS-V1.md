# MenuIA — Commercial Skills V1

## Estado
Implementación inicial, aislada, **pendiente de ejecutar la batería completa de pruebas y de validar Preview**. Rama `feature/menuia-commercial-skills-v1`, base `feature/menuia-sales-orchestrator-v2-core`. No desplegar en Production ni fusionar automáticamente.

## Funciones implementadas
En `server/commercial-skills.mjs` se exporta un registro cerrado y sin llamadas externas:
- `discoverNeeds`: identifica ausencia de categoría/uso y presupuesto, propone una pregunta.
- `retrieveCatalog`: proyecta hasta cuatro fichas elegibles con precio, atributos y stock del catálogo.
- `recommendProducts`: máximo tres alternativas elegibles, agrupadas por ID de producto, sin stock agotado y dentro del presupuesto de la sesión.
- `compareProducts`: compara hasta dos productos elegibles en precios y atributos de sus variantes. Si falta alguno, solicita aclaración; no inventa calidad técnica.
- `handleObjection`: busca opciones más baratas de la misma categoría del producto referido; si no hay, ofrece reconsiderar preferencias, sin crear descuentos.

## Integración
`server/sales-orchestrator.mjs` llama a `executeCommercialSkill` durante `createSalesPlan`; devuelve `skillResult` para la orquestación interna. `respondWithSalesPlan` utiliza una comparación completa para producir texto y tarjetas validados; el resto mantiene `salesReply` existente, preservando su comportamiento y evitando regresiones innecesarias.
El endpoint `server/commercial.mjs` ya usa el orquestador a partir del PR anterior. Gemini sigue seleccionando intenciones e IDs bajo su contrato original, sin transformar el texto generado en hechos verificados.

## Seguridad y límites
- Información fuente: catálogo validado del servidor; memoria del cliente nunca sirve como autorización.
- Skills puras sin efectos secundarios, no escriben pedidos, inventario o pagos.
- Descarta variantes agotadas y deduplica recomendaciones por productId.
- No realiza llamadas nuevas a Gemini, Supabase ni APIs externas.
- `skillResult` es interno, no modifica el contrato HTTP.
- Estas cinco skills no cubren todavía políticas publicadas, carrito, CRM ni seguimiento a leads.
- Revisar el manejo de referencias en Gemini: las skills se ejecutan en el plan, pero no todas sustituyen todavía la composición final de `salesReply`.

## QA
`server/commercial-skills.test.mjs` incluye ocho casos de descubrimiento, stock, presupuesto, comparación, rechazo de variantes agotadas, objeciones, registro cerrado e integración.

Ejecutar antes de cualquier merge:

```bash
node --test --test-isolation=none server/commercial-skills.test.mjs server/sales-orchestrator.test.mjs
node --test --test-isolation=none server/*.test.mjs training-lab/*.test.cjs
```

No se declara aprobación de tests ni validación real de Gemini/Preview hasta observar esos resultados.
