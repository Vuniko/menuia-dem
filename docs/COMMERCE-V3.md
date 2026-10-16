# MenuIA Commerce V3 — Minimalista Premium

## Base auditada y alcance

Fecha de trabajo: 15 de octubre de 2026, America/Lima. Repositorio Vuniko/menuia-dem. HEAD remoto de `feature/menuia-demo-v2-premium-dark`: **8fb1a37948b20b9b651c22cb12558c04ab31faf8**. Últimos commits: 8fb1a37 y a5172bf (contexto de promociones), a5f69f1 (móvil), 9bd5547 (promociones compartidas), 95c6459 (respuestas completas), c1dc192 (catálogo/presupuestos), adab7dc (historial acotado). Comparación de GitHub: 43 commits por delante de main, cero por detrás; main **09624a0a74ded8d536adcaf0ecd1f699859c0c39**.

La rama nueva `feature/menuia-commerce-v3-premium` nace exactamente de 8fb1a37. Se creó una copia aislada `menuia-commerce-v3`; se preservó íntegro el checkout sucio `menuia-demo-v2`. Esa copia contiene los trabajos Commerce/retail publicados en tareas anteriores, que NO forman parte del HEAD remoto obligatorio. V3 sigue la base solicitada; no importa esos cambios ni altera su despliegue de Production. La regresión se evalúa contra Premium Dark remoto, no contra los cambios locales sin commit.

Antes de editar se revisaron index, menú conectado, premium-dark.js, modelos, transporte, API y servidor. Contratos heredados: POST /api/chat {message,history}; POST /api/kb-menu {message,history,slug,requestId}; panel y Training Lab usan /api/kb-admin con JWT en cookie, pertenencia y roles. KB pública restringida al slug cerveceria-demo y deshabilitada en Production. Panel de esta base también permanece deshabilitado en Production. No se cambia ninguno de esos contratos, sus prompts ni cuotas.

Se revisó el PR #4 y su informe SECURITY-FOLLOWUP: filtración de un booleano privado en promotion_now mediante una entrada compuesta sin comprobar acceso a negocio/promoción. V3 no invoca esa RPC ni añade operaciones administrativas. Corrección remota pendiente fuera de este alcance.

## Implementación

Storefront blanco #FFFFFF, superficies #F7F7F5, texto #181818, acento #B8A58B, bordes #E7E7E4, Manrope/DM Sans. Inicio en /#inicio, catálogo en /#catalogo, colecciones y promociones. Header con búsqueda y accesos a favoritos/carrito/asesor, hero editorial, cinco categorías, selección destacada, dos colecciones, promoción vigente ficticia y footer con datos disponibles. No se inventan entregas gratis, métodos de pago ni anuncios comerciales: el anuncio solo aparece con verificación y fechas válidas.

20 productos ficticios y 60 variantes para ropa, calzado, tecnología, accesorios y hogar. Marcas de ejemplo opcionales. Precio en céntimos y PEN; atributos definidos por producto, no campos de ropa obligatorios. Dos encuadres de fotografía por producto, galería, selección de variantes, cantidad, disponibilidad de fixture, productos relacionados de la misma categoría y consulta contextual. Imágenes ilustrativas externas con lazy loading y placeholder ante error.

Filtros combinados por categoría, intervalo de precio, marca y atributos, con una misma variante que satisfaga precio/atributos. Búsqueda normaliza mayúsculas, tildes y espacios repetidos. Orden por precio y nombre, carga progresiva de doce productos, favoritos locales, estado vacío, carga y error recuperable. Precio anterior solo cuando una promoción vigente aplica a la variante y reduce su precio. Oferta vencida de fixture incluida para probar su exclusión.

Carrito local por negocio: agregar, fusionar variante, modificar cantidades, quitar, revalidar datos, disponibilidad y calcular subtotal con precios actuales. No reserva ni modifica stock, no confirma pedidos ni cobra. No se comparte carrito entre negocios. Los montos no incluyen costes comerciales no registrados.

Identidad, portada, colores, categorías, marcas y atributos proceden del adaptador. URLs validadas y colores limitados a hex; contenido externo se inserta mediante textContent y nodos, sin innerHTML. El adaptador excluye entidades de otro negocio y rechaza IDs duplicados, importes inválidos o variantes incoherentes. Es una barrera de presentación para fixtures, no una autorización de servidor.

## Estado del vendedor IA

Integración visual **pendiente de conexión comercial**. Panel accesible desde todas las vistas, flotante en escritorio y completo en móvil, sugerencias, tarjeta de producto clicable y consulta preparada desde ficha. Enviar está deshabilitado; no se genera conversación ni se envía información al endpoint gastronómico. No hay respuestas simuladas presentadas como IA real. No se afirma que los productos recomendados por IA funcionen: solo se muestra el producto seleccionado para preparar contexto.

commerce-v3-chat.mjs define una frontera explícita pendiente, consulta contextual e historial futuro acotado. Los controles de errores, reintentos, cuotas y procedencia del backend/transportes heredados quedan intactos y probados. No se inventa un transporte comercial activo: requiere el endpoint separado descrito en el diseño futuro.

Ver [COMMERCE-V3-SCHEMA-PROPOSAL.md](COMMERCE-V3-SCHEMA-PROPOSAL.md): modelo futuro, FKs por negocio, RLS, permisos, contexto seguro de Gemini, cuotas y tratamiento de datos no verificados. Es documentación, no migración ejecutable.

## Rutas preservadas y dependencias

La portada gastronómica previa se conserva como copia exacta en /gastronomia/. /menu/, /admin/, /training-lab/, api/, módulos del servidor y todas las migraciones heredadas siguen idénticos al HEAD base. No se instala framework, paquete ni dependencia nueva. Requiere navegador moderno con ES modules, dialog, visualViewport opcional, localStorage opcional y CSS :has; se respetan reduced motion, foco visible y tamaños táctiles. Google Fonts y Unsplash requieren conexión y pueden fallar; las fotos tienen placeholder. No hay integración de pagos ni pedidos en V3.

## Verificación

**110/110 pruebas Node aprobadas**: catálogo/adaptador, categorías/filtros/búsqueda, precios/orden, variantes/stock, carrito/totalización, promociones, datos extranjeros, URLs/temas, estado local, límites pendientes del asesor, estructura accesible; regresión de administración/KB/backend gastronómico/transporte/promociones y Training Lab. Los mocks de Gemini son fixtures explícitos, no pruebas de Gemini real. No se consultó Gemini para V3.

Navegador local: ficha Camisa de lino → talla M / Arena → precio promocional S/109.00 (anterior S/129.00) → carrito una unidad S/109.00 → dos unidades S/218.00. Tarjeta de carrito abre ficha. Consulta a IA abre panel pendiente con tarjeta y pregunta, sin enviar. Galería de dos encuadres. Comprobaciones reales de viewport tras descartar una emulación que no se aplicaba a la pestaña de fondo.

Anchos comprobados 320/375/390/414/430/768/1280. Inicio y catálogo: scrollWidth 305/360/375/399/415/753/1265 (barra vertical incluida), siempre <= innerWidth. Ficha: anchos 286/341/356/380/396/728/1040, sin overflow interno. Carrito: 320/375/390/414/430/470/470, sin overflow de página. Chat: 320/375/390/414/430/450/450, input dentro del diálogo. Revisión adicional del chat a 390x540 como altura reducida; no es prueba de teclado de un dispositivo físico.

No se probó iPhone/Android físico ni lector de pantalla. Emulación y diálogo nativo para teclado/foco. Se documentarán por separado los resultados de navegación, filtros y publicación de Preview al terminar.

## Seguridad y publicación

Solo la rama V3 puede publicarse. No se cambian main, Production, variables, credenciales, secretos ni bases remotas. No se aplican migraciones, no se borran datos y no se fusionan PR. Publicación prevista mediante push de rama y Preview automático, con PR en borrador hacia Premium Dark. Comprobar los identificadores y el estado de Preview antes de comunicar su URL.

## Riesgos y próximo paso

El catálogo es ficticio; los datos de stock y promociones del fixture caducan (stock al 1 enero 2027). No convertir esos valores en promesas comerciales. La demo nunca debe usarse como fuente para compras reales. Funciones comerciales publicadas en tareas anteriores no están incorporadas en la base Git de V3; conciliarlas requiere revisión específica de diffs, esquema real y permisos. El hallazgo #4 sigue fuera de corrección aquí.

El siguiente paso es revisar el diseño y el adaptador en Preview; después conectar un endpoint comercial nuevo y una proyección publicada por negocio en un entorno de pruebas autorizado, con contexto fresco y respuestas estructuradas validadas. No reutilizar el catálogo de cervecería para esta tienda.

Comando de validación: `node --test --test-isolation=none server/commerce-v3.test.mjs server/demo-v2.test.mjs server/admin.test.mjs server/knowledge.test.mjs server/public-menu.test.mjs server/training.test.mjs server/preview.test.mjs server/chat-resilience.test.mjs server/demo-promotions.test.mjs server/menu-answers.test.mjs training-lab/csv.test.cjs training-lab/evaluation.test.cjs`.

### Comprobaciones adicionales de navegador

Búsqueda `  AUDIFONOS   INALAMBRICOS  ` devolvió un producto; texto inexistente mostró cero productos y acción para restablecer. Filtro Tecnología / capacidad 128 GB / máximo S/800 devolvió cero productos, respetando el precio de esa variante (S/899), en lugar del precio base de 64 GB. Fallo HTTP 503 del catálogo en un fixture local explícito mostró error recuperable sin productos de respaldo. Tras cambios de cantidad se conserva el foco en el control recreado del carrito.

La portada pública de Production se registró antes de publicar la rama en `commerce-v3-production-baseline.json`; la verificación final debe compararla sin modificar esa web. El único archivo heredado modificado es index.html; la copia gastronómica conserva su contenido y rutas absolutas. El resto de cambios son archivos nuevos aislados de V3.

## Continuación: catálogo publicado y endpoint separado

La revisión e integración posterior se documenta en [COMMERCIAL-ENDPOINT.md](COMMERCIAL-ENDPOINT.md). Se añade modo `?negocio=slug` y `/api/commercial`, de solo lectura sobre la API pública comercial existente. La demo sin parámetros mantiene su asesor pendiente. No hay tiendas publicadas actualmente, por lo que la comprobación con productos reales de un negocio está pendiente; los fixtures y mocks no se presentan como esa comprobación. Se mantienen las restricciones de Production, variables y cambios remotos.
