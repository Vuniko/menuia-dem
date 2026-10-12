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

La demo raíz **no está conectada a KB**: conserva su Gemini y carta ilustrativa histórica. La ruta /menu ya tiene la integración KB de la base. El rediseño no mezcla ambas fuentes, ni copia datos del panel/Training Lab. La antigua landing comercial se reemplaza deliberadamente por una experiencia de cliente QR; las rutas admin y Training Lab permanecen. Los controles de configuración de túnel local de la landing antigua no forman parte de la nueva interfaz; la API y el backend Ollama se conservan sin cambios.

## Validación inicial

- 64 pruebas Node aprobadas: 58 existentes y seis nuevas de datos/búsqueda/seguridad de imágenes/contexto/tarjetas.
- 34 comprobaciones legacy del motor de carta aprobadas.
- 8 pruebas de CSV/evaluación Training Lab aprobadas.
- Sintaxis JavaScript aprobada. No existen scripts lint/typecheck/build en esta base estática; no se reportan como ejecutados.
- Browser fixture local: búsqueda Limonada S/10, detalle, consulta desde el artículo, tarjetas de respuesta, retorno detalle→chat, error 503 simulado, reintento y búsqueda vacía. Las respuestas de este fixture muestran «Respuesta simulada · fixture local»; **no demuestran Gemini real**.
- Revisión responsive y Preview desplegado: en curso, se registrará el resultado definitivo antes de entregar.

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
