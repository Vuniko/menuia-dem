# Commerce V3 — diseño de esquema futuro (NO APLICAR)

Este documento es una propuesta de arquitectura; no es una migración ejecutable. No se consultó ni modificó Supabase durante V3. Debe contrastarse con el esquema real y con las tablas de Commerce publicadas en tareas anteriores antes de generar una migración. No crear tablas duplicadas por copiar esta propuesta.

| Entidad | Datos | Integridad y acceso propuestos |
|---|---|---|
| Business | id, slug único, nombre, descripción, logo, portada, tema y publicación | Propietario desde identidad autenticada; miembros y roles en una relación independiente. Slug no autoriza acceso privado. |
| BusinessMember | businessId, userId, rol owner/editor/viewer | Lectura propia; asignación de roles solo por owner verificado en servidor. Nunca desde user_metadata. |
| Category | id, businessId, nombre, descripción, orden | FK compuesta (businessId,id), lectura pública solo si negocio y categoría están publicados. |
| Product | id, businessId, categoryId, nombre, marca opcional, descripción, priceCents, currency, estado | Todas las FKs deben incluir businessId para impedir referencias entre negocios. Céntimos enteros no negativos y moneda PEN. |
| ProductImage | businessId, productId, URL, orden, texto alternativo | URL validada; permisos de almacenamiento por propietario/ruta. Prohibir SVG activo y revisar MIME, tamaño y firma. |
| AttributeDefinition | id, businessId, productId, nombre, tipo, opciones | No imponer talla/color a tecnología u hogar. Definir opciones válidas y evitar claves de prototipo. |
| Variant | id, businessId, productId, SKU, atributos, precio opcional, estado y verificación de stock | Combinación de atributos única por producto; SKU único por negocio. Unidades por variante. Información vencida se presenta por confirmar. |
| Promotion | id, businessId, condiciones, vigencia y precio/descuento | Productos y variantes vinculados mediante FKs compuestas. Calcular con registros almacenados y accesibles. Nunca aceptar un objeto de promoción del cliente como autoridad. |
| Collection | id, businessId, nombre, imagen, productos relacionados | Relaciones acotadas al mismo negocio y publicaciones visibles. |
| AssistantConfig | businessId, estado, versión de política y cuota | Privada. Referencias a secretos exclusivamente en servidor, nunca sus valores en tablas públicas o cliente. |
| Conversation | id, businessId, usuario/sesión, fecha, retención | RLS por identidad y membresía; historial separado por negocio y sesión. No compartir localStorage global. |

## Autorización y consultas

Para operaciones privadas: verificar JWT en servidor, cargar la membresía desde datos confiables y exigir el rol apropiado. Aplicar filtros businessId en cada consulta y RLS con USING y WITH CHECK. Un businessId enviado por el navegador es un selector, nunca una autorización. Dar permisos SQL mínimos, fijar search_path en funciones y evitar funciones definer accesibles sin necesidad. Validar permisos antes de leer datos y antes de llamar al modelo.

Para tienda pública: resolver slug a un negocio publicado desde el servidor y retornar solo una proyección pública explícita. No mezclar fixtures como respaldo si la consulta real falla. Precios, disponibilidad y promociones deben tener procedencia y vigencia. No devolver contactos privados, miembros, credenciales, documentos internos ni conversaciones.

## Contexto de Gemini futuro

Un nuevo endpoint comercial separado debe cargar datos frescos, ya acotados al negocio autorizado, y serializar una lista permitida de campos: id/nombre/descripcion/marca/céntimos/moneda/atributos/variantes/stock vigente/promociones calculadas. Aislar instrucciones del sistema frente a descripciones y mensajes no confiables. El modelo devuelve IDs y una intención estructurada; el servidor valida cada ID y presenta precios desde la base, sin aceptar precios del texto generado. Producto ausente: «no figura en el catálogo publicado». Stock vencido: «disponibilidad por confirmar». Precio no verificado: no cotizar ni habilitar compra. No confirmar pedidos desde el chat.

Aplicar cuotas persistentes por negocio y sesión, límites de concurrencia, tiempo y tamaño; devolver 429 con Retry-After. Usar requestId idempotente para reservas de cuota, historial acotado por pares completos y no repetir POST automáticamente ante respuestas ambiguas. Mantener preguntas y mensajes sin duplicados al reintentar. Guardar solo los datos necesarios con retención definida. Pruebas con dos negocios, owner/editor/viewer y acceso anónimo preceden cualquier migración remota.

## Hallazgo del PR #4

promotion_now aceptaba una fila compuesta proporcionada por el llamador y podía revelar un booleano sobre productos privados. La nueva experiencia V3 no la invoca. La futura implementación debe resolver una promoción persistida por id y negocio, comprobar visibilidad/pertenencia antes de consultar vínculos privados, y verificar también sus productos. El borrador de endurecimiento del PR #4 no se aplicó ni se incluye como migración de V3.

## Conexión progresiva

1. Inventariar el esquema existente en un entorno de pruebas autorizado; reconciliar Commerce previo y KB sin duplicar datos.
2. Probar migración y RLS en copia local, roles y dos negocios. Revisar el hallazgo #4.
3. Implementar proyección pública comercial y endpoint Gemini separado con cuotas y respuestas estructuradas.
4. Conectar el adaptador de V3 a esa proyección con fallo explícito y sin fallback ficticio.
5. Probar stock/variantes/precios reales, aislamiento y límites en Preview. Solo una autorización posterior permite cambios remotos o Production.
