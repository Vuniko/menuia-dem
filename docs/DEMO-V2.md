# MenuIA Demo V2 — Premium Dark

## Auditoría y base

Fecha: 12 de octubre de 2026. Rama `feature/menuia-demo-v2-premium-dark`, desde `feature/menuia-knowledge-base-v1` / `b84a64180277e01b91035fe7db8bb1a0bb565fea`.

El repositorio real es estático: HTML, CSS y JavaScript nativos; funciones Vercel en Node ESM, sin Next.js/React/Tailwind ni dependencias de build. Se mantienen DM Sans/Manrope y el estilo nativo. No se instala un framework nuevo.

`main` está en `09624a0`; la rama móvil en `1b2a6aa`; Training Lab en `5684c38`. La base KB incluye las mejoras anteriores, panel, menú público y entrenamiento por negocio; no implica que estén integrados en Production. `/api/chat` utiliza la carta ilustrativa codificada del servidor y Gemini/reglas; `/api/kb-menu` consulta información publicada y Knowledge Base en Preview, restringida al slug ficticio `cerveceria-demo`, y responde 404 en Production. El PR #4 de auditoría administrativa permanece separado, no fusionado ni incluido en esta base.

Se detectaron cambios locales en el checkout `menuia-admin-audit`. Se preservaron sin checkout/reset/commit; la V2 se trabajó en una copia Git nueva `menuia-demo-v2`. No se modifica sources.

## Experiencia implementada

- Bienvenida con identidad del establecimiento, fotografía grande, carta destacada y accesos a carta/chat.
- Paleta #111111 / #1B1B1B / #252525 / #D69A42 / #F5EFE6 / #B9B3AA / #393633.
- Carta con categorías, búsqueda por nombre que ignora tildes, contador y estado vacío.
- Detalles en diálogo nativo, precio, categoría, ingredientes/alérgenos solo cuando existen, cautela de trazas y consulta contextual del producto.
- Promociones: vacío explícito sin inventar descuentos. Si la API aporta ofertas vigentes, se muestran descripción/precio/condiciones y fechas cuando estén incluidas. El contrato KB actual no devuelve fechas de promociones, logo, portada ni datos de negocio completos: no se simulan.
- Chat con burbujas, preguntas sugeridas, carga, error/reintento, procedencia y tarjetas de productos mencionados. Las tarjetas usan el precio de la fuente, no el texto generado; no muestran productos ajenos ni agotados. Menciones no se presentan como recomendaciones confirmadas.
- Navegación inferior en móvil; chat a pantalla completa fuera de su área, scroll independiente, safe areas y altura con visualViewport. Diálogos nativos para foco/teclado; reduced motion; sin librería nueva.

## Fuentes y contratos conservados

`/` (incluido `/#demo`) usa `assets/demo-menu.json`: exactamente los doce productos, imágenes, descripciones y precios heredados; datos ilustrativos separados y etiquetados. Monograma derivado del nombre ficticio, no un logo de un negocio real. Fotografías identificadas como ilustrativas, conservadas de Unsplash/SVG existentes.

`/menu/?negocio=cerveceria-demo` comparte presentación pero consulta **solo** `/api/kb-menu`. Error de carga no cambia a datos ilustrativos. No lee tablas privadas ni claves desde el navegador. No se anuncia soporte para otros negocios: el backend sigue limitado al piloto ficticio.

Contrato de chat sin cambios: demo POST `/api/chat` con `{message,history}`; KB POST `/api/kb-menu` con `{message,history,slug,requestId}`. La consulta de producto incluye el nombre seleccionado desde su registro, con una pregunta prudente; no inventa un nuevo campo que el servidor ignore. No se modifica prompt, proveedor, cuotas, historial del servidor ni respuestas del backend. Respuestas de respaldo del servidor se identifican. No hay fallback cliente que oculte una falla real con texto inventado.

La demo raíz **no está conectada a KB**: conserva su Gemini y carta ilustrativa histórica. La ruta /menu ya tiene la integración KB de la base. El rediseño no mezcla ambas fuentes, ni copia datos del panel/Training Lab. La antigua landing comercial se reemplaza deliberadamente por una experiencia de cliente QR; las rutas admin y Training Lab permanecen. La configuración opcional local conserva la clave existente `menuia_ai_endpoint` y una dirección HTTPS validada; aparece solo fuera de Vercel y no se usa en /menu. La API y el backend Ollama se conservan sin cambios; un fallo no genera una respuesta cliente simulada.

## Validación inicial

- 65 pruebas Node de aplicación aprobadas: 58 existentes y siete nuevas de datos/búsqueda/seguridad de imágenes/contexto/tarjetas/conexión local.
- 34 comprobaciones legacy del motor de carta aprobadas.
- 8 pruebas de CSV/evaluación Training Lab aprobadas.
- Sintaxis JavaScript aprobada. No existen scripts lint/typecheck/build en esta base estática; no se reportan como ejecutados.
- Browser fixture local: búsqueda Limonada S/10, detalle, consulta desde el artículo, tarjetas de respuesta, retorno detalle→chat, error 503 simulado, reintento y búsqueda vacía. Las respuestas de este fixture muestran «Respuesta simulada · fixture local»; **no demuestran Gemini real**.
- Ejecución final combinada: **73/73 pruebas Node** (65 aplicación + 8 Training Lab); 34 comprobaciones legacy adicionales. Se usó `--test-isolation=none` por la restricción de procesos del entorno.

## Preview y revisión final

Preview verificado: https://menuia-64oiy9boi-vuniko.vercel.app/#demo . Deployment `dpl_BzyhEuRXettV1abrdqNBHnYJaoHe`, READY, target null, commit `ccc4e887a71df78821039a5c644589b73319a772`. PR borrador #5, base Knowledge Base, sin merge. Los ajustes finales mantienen contratos y se guardan en un segundo commit; el Preview inmutable citado recoge la primera validación del diseño y las llamadas reales.

| Validación | Resultado |
|---|---|
| Demo pública V2 | Carga nombre ficticio, bienvenida, fotografías, doce productos y precios ilustrativos; datos separados de KB |
| Búsqueda/precio | Limonada S/10 y detalle en fixture; IPA artesanal S/19 en carta, detalle y respuesta del backend real de Preview |
| Navegación/diálogos | Inicio/Carta/Promos/Chat; detalle→consulta, tarjeta de chat→detalle→chat; cierre y foco; error/reintento y búsqueda vacía comprobados |
| Promociones | Vacío explícito; no se incorporaron descuentos inventados |
| Responsive | Inicio: 320/375/390/414/430/768/1280 px, scrollWidth≤innerWidth; detalle a 320, ancho 296 px; chat a 390, input 16 px y sin solapamiento de navegación |
| Stock | Fixture conectado: Golden Ale figura Agotado; tarjetas de respuesta excluyen agotados según test; no se certifica stock remoto |
| Fallo de carta | Fixture de slug desconocido y Preview sin configuración muestran error; no aparecen productos de ejemplo como sustitución |
| Gemini real | **Pendiente/no aprobada**: pregunta «¿Qué puedo pedir por S/40?» devolvió error del backend; el cliente mostró error y reintento sin simulación oculta. Una pregunta de precio sí respondió mediante reglas del servidor. No se confunden reglas ni fixture con Gemini |
| Diagnóstico Gemini | Lectura de logs por MCP rechazada 403; CLI Vercel no disponible. La causa concreta no está confirmada. No se cambiaron claves, proveedor, modelo ni variables |
| KB real | **Pendiente/no aprobada**: /api/kb-menu de esta rama indica «Falta configurar el proyecto de pruebas». La integración existente se mantiene sin alterar su configuración |
| Panel | Ruta /admin abre; ingreso deshabilitado por configuración Supabase ausente. Código intacto y pruebas existentes aprobadas; sesión/CRUD remoto no verificados |
| Training Lab | /training-lab carga la interfaz original; ocho pruebas CSV/evaluación aprobadas; no se dispararon evaluaciones reales ni escrituras |
| Secretos/base | Sin referencias a claves de Gemini/Supabase en los clientes nuevos ni cambios en api/admin/Training/KB/supabase/backend/vercel.json; main comprobada en 09624a0 y sin promociones a Production |

Se guardaron capturas locales de inicio móvil/escritorio, carta, detalle, promociones y chat real (respuesta de reglas y error de Gemini): `docs/screenshots/home-preview-390.png`, `home-preview-desktop.png`, `carta-preview-375.png`, `detalle-preview-320.png`, `promos-preview-320.png`, `chat-preview-390.png`. No se incluyen en Git ni en el deployment por las reglas existentes para PNG. La tipografía usa los recursos ya existentes de Google Fonts; las fotografías externas dependen de disponibilidad de Unsplash, con placeholder ante error.

Limitaciones: teclado virtual y safe areas se implementan con visualViewport/env y emulación; no hubo prueba en iPhone/Android físicos ni con lector de pantalla. La V2 está lista para revisión visual, **no se declara integración Gemini/KB ni readiness de Production aprobadas**. Diagnosticar Gemini de esta rama y habilitar las variables Preview existentes requiere un trabajo posterior autorizado, respetando la prohibición actual de modificar secretos.

Archivos modificados/añadidos: `index.html`, `menu/index.html`, `assets/premium-dark.css`, `assets/premium-dark.js`, `assets/menu-model.mjs`, `assets/demo-menu.json`, `server/demo-v2.test.mjs`, `server/demo-v2-visual.test.mjs`, `docs/DEMO-V2.md`. Ningún archivo del servidor real o esquema fue editado.

Repetir pruebas:

```sh
node --test --test-isolation=none server/demo-v2.test.mjs server/admin.test.mjs server/knowledge.test.mjs server/public-menu.test.mjs server/training.test.mjs server/preview.test.mjs training-lab/csv.test.cjs training-lab/evaluation.test.cjs
node server/test-menuia.mjs
```

Fixture visual explícito, sin IA real ni conexión a Supabase:

```sh
node server/demo-v2-visual.test.mjs --visual
```

Abrir `http://127.0.0.1:8813/`. Escribir `error QA` produce un error identificado para revisar el reintento. Fixtures/tests excluidos del despliegue por .vercelignore.

## Restricciones verificadas

No se cambian api/, admin/, training-lab/, knowledge-base/, supabase/, server/index.js, server/admin.mjs, server/knowledge.mjs, server/training.mjs ni server/public-menu.mjs. Solo presentación pública, fuente ilustrativa, tests nuevos e informe. Sin migraciones, RLS, variables, secretos, credenciales, datos remotos, merges, push a main o promoción de Production. El push a esta rama puede generar automáticamente un Preview; no se despliega manualmente a Production.
