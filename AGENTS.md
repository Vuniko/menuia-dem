# AGENTS.md — MenuIA Commerce: agente ejecutor Codex

## Misión persistente
Desarrollar MenuIA Commerce como una plataforma e-commerce SaaS minimalista premium, configurable por negocio, con catálogo comercial y vendedor IA sustentado en datos reales, orientada a ropa, zapatillas, tecnología, accesorios, hogar y cualquier rubro minorista. Trabajar incrementalmente, con pruebas, documentación y aislamiento estricto de Production.

## Repositorio y punto de partida
- Repositorio: https://github.com/Vuniko/menuia-dem
- Rama de trabajo existente: `feature/menuia-commerce-v3-premium`. **No crearla otra vez ni borrar/sobrescribir sus avances.**
- Rama de referencia histórica: `feature/menuia-demo-v2-premium-dark`; `main` está atrasada respecto de los desarrollos recientes.
- Tecnologías presentes: HTML/CSS/JavaScript nativos, Node ESM, funciones Vercel, Supabase/Knowledge Base, Gemini, integración Ollama experimental. No migrar a frameworks sin autorización y justificación.
- Leer primero `docs/COMMERCE-V3.md`, `docs/COMMERCE-V3-SCHEMA-PROPOSAL.md` si existe, y los tests actuales. Auditar estado Git real y últimos cambios ANTES de editar.

## Estado confirmado al 15-10-2026
- Commerce V3 **ya implementó** storefront minimalista blanco/marfil, inicio `#inicio`, catálogo `#catalogo`, colecciones, promociones, fichas, filtros, búsqueda, favoritos y carrito local.
- Demo ficticia Atelier Store: ~20 productos, ~60 variantes, cinco rubros; precios, imágenes y stock ilustrativos, identificados como tales.
- Integración visual del asesor IA preparada, pero **el vendedor comercial real NO está conectado**. No simular éxito ni enviar preguntas comerciales al antiguo endpoint gastronómico.
- Código gastronómico previo se conserva en rutas separadas; no romper `/gastronomia/`, `/menu/`, `/admin/`, `/training-lab/`, ni contratos heredados.
- Knowledge Base y panel administrativo tienen avances, pero Auth/CRUD remoto multiempresa aún requieren validación; la función `promotion_now` tiene un hallazgo de seguridad documentado en PR #4, con corrección pendiente de aprobación/aplicación.
- Último despliegue de Production revisado usó un commit histórico `b84a641` y no constituye prueba de que Commerce V3 esté publicado.
- Se prioriza comercio minorista; no volver a centrar el producto en gastronomía.

## Diseño aprobado
- Estilo minimalista premium universal: blanco #FFFFFF, marfil #F7F7F5, carbón #181818, arena #B8A58B, bordes #E7E7E4.
- Fuentes Manrope para títulos y DM Sans para lectura; espaciado generoso, imágenes grandes, grid adaptable, controles claros, experiencia mobile-first.
- Personalización por negocio: marca, logo, portada, colores, categorías, productos y atributos opcionales.
- Catálogo flexible: talles/colores solo donde corresponda; otros rubros pueden tener capacidad, dimensiones, etc.
- La IA debe recomendar solo productos publicados del tenant correcto y nunca inventar precios, stock, variantes, promociones, métodos de pago, envíos ni pedidos.

## Plan de trabajo por etapas
### Fase 0: auditoría y respaldo lógico (obligatoria)
1. Revisar branch HEAD, commits, PRs, archivos y tests. Identificar código ya implementado para no repetir ni romper.
2. Confirmar que el checkout está limpio o preservar cualquier trabajo local; no usar reset/force-push.
3. Validar diferencias con rama Premium Dark y entorno Preview/Production sin cambios.
4. Registrar evidencia en `docs/COMMERCE-AGENT-STATUS.md`.

### Fase 1: estabilizar Commerce V3
1. Completar QA de inicio, catálogo, búsqueda, filtros, variantes, stock ilustrativo, promociones, favoritos, carrito, responsive y accesibilidad.
2. Corregir fallos reproductibles solamente en la rama aislada.
3. Pruebas Node y visuales a 320, 375, 390, 414, 430, 768 y 1280 px. No equiparar emulación con pruebas físicas.
4. No añadir checkout/pagos/pedidos reales de manera implícita.

### Fase 2: catálogo real y panel
1. Proponer y validar modelo multiempresa genérico (business, category, product, variant, attribute, image, promotion, collection, stock).
2. Evaluar compatibilidad con Supabase piloto y RLS; crear migraciones PROPUESTAS en archivos, no aplicarlas remotamente.
3. Reutilizar panel admin; diseñar flujo para altas, edición, publicación y stock por variante, roles owner/editor/viewer.
4. Corregir/planificar hallazgos RLS y `promotion_now`, con tests de aislamiento antes de cualquier implementación remota.

### Fase 3: vendedor comercial IA
1. Implementar endpoint comercial separado del antiguo `/api/chat`, con autenticación/autorización y scope de negocio donde corresponda.
2. Construir contexto Gemini desde catálogo verificado del tenant; sin usar prompt hardcodeado gastronómico.
3. Manejar presupuesto, talles, colores, marca, disponibilidad, alternativas, seguimiento y tarjetas de productos con precio derivado de fuente.
4. Mantener historial acotado, cuotas, seguridad frente a prompt injection, rechazos por ausencia de datos y errores/reintentos.
5. Reutilizar Training Lab y generar batería de preguntas comerciales; medir exactitud, alucinaciones y aislamiento entre tenants.
6. No declarar IA comercial operativa hasta comprobar extremo a extremo con catálogo real autorizado de Preview.

### Fase 4: CRM y conversión
1. Diseñar leads, conversaciones, productos consultados, estados y seguimiento.
2. Respetar consentimiento y minimización de datos; definir retención y controles por tenant.
3. Futuras integraciones de pedidos, WhatsApp, Instagram y pagos deben presupuestarse/autorizarse por separado.
4. Probar pilotos con comercios antes de afirmar readiness comercial.

## Seguridad y límites no negociables
- **No modificar `main`, Production, dominios productivos, variables, secretos, credenciales ni datos reales.**
- **No hacer deploy/promotion/rollback a Production ni merge de PR sin autorización expresa del usuario.**
- **No aplicar SQL/migraciones/políticas RLS a Supabase remoto sin autorización expresa.**
- Se puede trabajar, hacer commits y abrir PR draft en la rama de desarrollo; Preview automático solo si no toca servicios/datos productivos. Verificar esto antes de publicar.
- No revelar claves ni registrarlas en logs o documentación.
- No confiar en `businessId`/slug enviado por cliente para autorización; validar identidad, pertenencia y permisos en servidor.
- No usar datos del negocio A para el negocio B; probar acceso ajeno con fixtures/usuarios ficticios.
- No afirmar que un mock es integración real.
- Mantener rutas y contratos anteriores, y proteger documentación/comportamiento legado.

## Forma de ejecutar cada tarea
1. Empezar leyendo este archivo y `docs/COMMERCE-V3.md`.
2. Identificar la primera fase INCOMPLETA y hacer el cambio más pequeño que produzca una mejora verificable.
3. Mostrar plan, riesgos y archivos afectados antes de cambios importantes.
4. Implementar en rama no productiva; incluir tests, documentación y evidencia de resultado.
5. Entregar resumen: qué cambió, SHA, tests, URL Preview/PR si existen, qué falta, impacto Production (debe ser ninguno).
6. Si se requieren secretos, credenciales, cambios remotos o publicación productiva, detener esa acción y solicitar autorización, pero avanzar en documentación, fixtures y pruebas seguras.

## Criterio de terminado del MVP comercial
Un propietario ficticio de Preview puede iniciar sesión, crear una tienda, cargar y publicar productos/variantes, y un cliente puede navegar y preguntar al vendedor IA por productos de ESA tienda obteniendo precios y disponibilidad verificados, sin fuga entre empresas. Deben existir pruebas documentadas de ese flujo. Carrito sin cobro es aceptable para MVP; no declarar pedidos ni pagos confirmados sin infraestructura específica.
