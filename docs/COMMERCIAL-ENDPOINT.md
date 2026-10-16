# Endpoint comercial separado y revisión de diseño

## Alcance

Continuación de `feature/menuia-commerce-v3-premium` / PR #6. La demo Atelier sigue disponible sin parámetros. Una tienda publicada se abre en `/?negocio=slug#inicio`, mediante el enlace preparado por el usuario o con «Abrir mi tienda publicada» en el footer. No se modifica Production ni se integra checkout en esta vista. Sin cambios de variables, secretos, Auth, políticas o esquemas remotos.

**Estado real de los datos:** una consulta de solo lectura a nombres y slugs de negocios con `published=true` devolvió cero registros. No existe aún una tienda publicada que permita verificar el flujo con productos reales de un negocio elegido. La portada anterior contiene productos ilustrativos, no stock de comerciantes. El usuario debe crear/publicar su tienda y productos en el portal existente y facilitar su enlace. No se creó un negocio ficticio en remoto para fingir esta comprobación.

## Contrato

- `GET /api/commercial?slug=mi-tienda`: catálogo normalizado y proyectado públicamente, identidad, productos, variantes y existencias al consultar.
- `POST /api/commercial`: JSON `{slug,message,history?,productId?}`. Solo datos publicados del slug resuelto por el servidor. No admite businessId, URL de origen ni precios enviados por el navegador.
- No crea pedidos, reservas, sesiones, pagos ni tickets; no ejecuta escrituras de inventario.

El servidor hace exclusivamente un **GET sin cookies ni Authorization** al origen fijo `https://menuia-dem.vercel.app/api/commerce?action=catalog&slug=...`, que ya existe y publica solo tiendas/productos visibles. No reutiliza el chat gastronómico ni el POST comercial de Production. Un slug desconocido o una tienda sin publicación devuelve 404, sin sustituir datos por la demo. Sin redirecciones de origen ni URLs arbitrarias.

Se valida slug, UUID de negocio, coincidencia del slug, pertenencia de cada producto, IDs únicos, publicación, categoría admitida, precios enteros en céntimos, stock no negativo y límites de tamaño. Se devuelve una lista permitida de campos. Se descartan borradores; imágenes inseguras no se usan. No se inventan marcas, promociones, colecciones, capacidades, condiciones ni características que la fuente real no tenga. Cada fila actual de inventario se conserva como un producto con una variante, sin agrupar por nombre ni perder SKU/stock. Una evolución del esquema puede permitir agrupar modelos explícitamente.

La cifra de stock es una **instantánea publicada**, no una reserva ni una garantía. Es válida para selección durante dos minutos; después se indica disponibilidad por confirmar y se puede actualizar el catálogo. Al preguntar, el endpoint vuelve a cargar la fuente. La respuesta lleva el catálogo normalizado consultado, y las tarjetas usan sus precios y unidades, en lugar de datos viejos o precios del texto del modelo.

## Asesor comercial

Las consultas de precio, talla, color, productos y presupuesto se responden con reglas y datos publicados; se identifican como `provider: catalog`. El historial está acotado a pares completos y las consultas contextuales se validan contra los productos públicos de esa tienda.

Si `GEMINI_API_KEY` ya existe en el entorno, Gemini puede clasificar consultas abiertas y devolver únicamente intención e IDs, con contexto acotado del catálogo correspondiente. La aplicación valida todos los IDs y vuelve a presentar nombres, precios y existencias desde la fuente. No acepta precios ni texto factual generados libremente. Sin configuración, no se finge una llamada de IA: se indican las capacidades de consulta del catálogo. No se añadieron ni trasladaron claves o variables para habilitar Gemini en Preview.

Se restringe origen de POST a las URLs Vercel del propio despliegue y al servidor local de prueba, JSON y tamaño (8 KB), pregunta (500 caracteres), historial (tres pares), tiempo, frecuencia por IP y concurrencia de modelo. El transporte hace un POST por acción; el usuario decide reintentar, conserva la pregunta y no duplica el mensaje. Respuestas 429 incluyen Retry-After. Los límites en memoria por instancia no sustituyen una cuota distribuida; desplegar a escala requiere cuotas persistentes y supervisión de costes en una tarea posterior autorizada.

## Revisión visual

- Tipografía de producto, marca, stock y precio más legible; controles táctiles preservados.
- Filtros horizontales sin barra visual invasiva; marca oculta si no existe ese atributo.
- Identidades largas se ajustan sin desbordamiento. Botón del asesor con nombre accesible también en móvil.
- Sin portada publicada se usa un hero de texto, sin inventar una fotografía.
- Categorías sin foto tienen tarjetas de texto; no se muestran colecciones inexistentes ni bloques de relacionados vacíos.
- Si existe una sola combinación de atributos se selecciona automáticamente, respetando talla/color del registro.
- Identidad, leyendas y asesor cambian al modo de catálogo publicado; la demo permanece explícita en su propia ruta.
- Conexión mediante enlace público o slug validado, con retorno explícito a la demo si falla; sin fallback automático.

## Pruebas y límites

119/119 pruebas de lógica y regresión aprobadas, incluidas nueve nuevas sobre fuente fija de solo lectura, adaptador real, pertenencia, precios/stock/variantes, errores, origen, contexto ajeno, contrato Gemini estructurado y transporte sin duplicación. Los tests de Gemini usan respuestas simuladas explícitas y una clave sintética; NO verifican el proveedor real.

Navegador local con fixture identificado «Fixture · Comercio local QA»: carga desde el endpoint separado, identidad propia, consulta Polo QA S/49.90/talla M/color Azul/stock 3, tarjeta de producto clicable, consulta tecnología Laptop QA S/1899.00 y manejo de un 503 explícito. El reintento conservó una sola pregunta y emitió una solicitud adicional, sin duplicación automática. Los endpoints de fixtures solo existen en `server/commercial-preview.test.mjs`, excluido del despliegue.

Se comprobaron los siete anchos 320/375/390/414/430/768/1280 con nombre largo de tienda: scrollWidth 305/360/375/399/415/753/1265, sin overflow. No se usaron dispositivos físicos. El catálogo de demostración y el backend gastronómico/KB/Training Lab mantienen sus pruebas. No se declara una tienda real ni Gemini real verificados hasta contar con tienda publicada y configuración existente válida.

Límites de la fuente actual: hasta 1000 productos por respuesta (la API heredada necesita paginación para catálogos mayores), cuatro categorías de inventario existentes, talla/color por fila y sin marcas, promociones o colecciones comerciales en su contrato. Gemini recibe como máximo 200 productos; las respuestas determinísticas y el catálogo consideran el conjunto disponible. La API pública de origen debe seguir disponible; sustituirla por acceso directo a una proyección Supabase requiere autorización y revisión propia. No es un contrato de autorización privada ni una ampliación del panel administrativo.

## Siguiente paso

Publicar la primera tienda con sus productos en el portal existente, abrir su enlace desde «Abrir mi tienda publicada» en Preview y verificar datos reales sin escrituras desde V3. Después, según autorización explícita, revisar cuotas persistentes, proyección comercial directa, agrupación de variantes y conexión del checkout/tickets existentes. Mantener separado el PR del cambio de Production.
