# Auditoría Sales Agent V2 — 16 octubre 2026

- Base remota verificada: `feature/menuia-commerce-v3-premium`, `1beb383c89567890d8769477271808614df7a96e`.
- La rama remota `feature/menuia-sales-agent-v2` no existía; la búsqueda de PRs `sales-agent` devolvió cero resultados. Checkout original limpio, conservado en su rama; implementación en un worktree independiente.
- Leídos AGENTS.md, SALES-AGENT-V2-TASK.md, COMMERCE-V3.md, COMMERCIAL-ENDPOINT.md, COMMERCE-V3-SCHEMA-PROPOSAL.md y pruebas existentes.
- Causa de respuestas rígidas: groundedAnswer interceptaba saludos, catálogo, presupuesto y seguimiento antes de Gemini. El modelo solo elegía IDs para consultas restantes; la redacción era una concatenación de fichas.
- Causa de duplicados: la fuente demo representa 60 variantes como filas/productos independientes. El cliente además acumulaba grupos de tarjetas y conservaba la tarjeta de contexto tras responder.
- El agrupamiento nuevo reconoce únicamente identidades del fixture demo conocido; no fusiona productos reales por nombre, SKU, foto o precio.
- Preview automático: vercel.json solo configura duración de funciones. No hay build/install en package.json raíz, hooks ni workflow de publicación en esta rama. Publicar la rama no requiere comandos contra datos remotos. El endpoint de catálogo conserva exclusivamente GET público al origen existente; Gemini es la única llamada POST externa del asesor.
- No se modifica main, Production, configuración Vercel, entorno, secretos, dominios, SQL ni Supabase remoto. El hallazgo de PR #4 sigue pendiente y fuera de alcance.

Resultados, contratos y limitaciones en [SALES-AGENT-V2.md](SALES-AGENT-V2.md).
