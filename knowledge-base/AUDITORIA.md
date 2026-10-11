# MenuIA Knowledge Base V1 — Fase A

Auditoría del 11 de octubre de 2026. No se modificó la aplicación pública, ningún registro del negocio, ninguna política de acceso ni ninguna variable de producción. En Supabase se ejecutaron exclusivamente SELECT sobre catálogos del sistema; el editor creó su borrador de consulta privado automáticamente.

## Diagnóstico

La web existente es estática: HTML, CSS y JavaScript en `index.html`, con mejoras móviles en `assets/mobile-ux.css` y `assets/mobile-ux.js`. No existen Next.js, React, TypeScript, Tailwind, un package.json raíz ni dependencias externas en el servidor. `server/package.json` declara módulos ESM y Node >=20. No conviene migrar el framework para este MVP.

La aplicación publicada NO consulta Supabase. Sin embargo, el proyecto de pruebas proporcionado por el usuario, `menuia-piloto` (referencia `secknmhqqzjlirwwnsnf`), ya tiene un esquema multiempresa aprovechable. La etiqueta de rama `main Production` de Supabase no establece una conexión con Vercel. El usuario identifica este proyecto como pruebas; no se presume que esté vacío ni se borrarán datos.

## Base y protección del trabajo

- Base estable publicada: `1b2a6aaebd3456e708d75c8bf446ddd5953c3691`, en `feature/menuia-mobile-ux-v1`.
- Rama nueva creada: `feature/menuia-knowledge-base-v1`, desde ese commit exacto.
- `main`: `09624a0a74ded8d536adcaf0ecd1f699859c0c39`; carece de los avances publicados posteriormente por promoción de Vercel.
- PR 1 abierto: Training Lab/Gemini, base main.
- PR 2 borrador abierto: mejoras móviles, base feature/menuia-training-lab-v1.
- El checkout local anterior contiene modificaciones y archivos sin seguimiento, sobre un historial local anterior al remoto. Se conservó intacto. No cambiar de rama ni hacer un commit masivo de ese directorio.
- Producción usa la versión promovida desde la rama móvil: despliegue `A4vdNbUooHGXDcULe5DEJjvWAbKy`. Una publicación posterior desde main podría sobrescribir estos avances.
- No se fusionaron PR. La creación de la nueva rama no publica código en producción. Preview requiere configuración independiente para esta rama.

## Asistente y carta actuales

`api/chat.mjs` delega en `server/index.js`. Admite Preview y Production. `api/gemini-check.mjs` valida exclusivamente Gemini en Preview.

El servidor resuelve algunas preguntas de productos y seguimiento de cervezas mediante reglas deterministas; el resto usa Gemini en Vercel. El entorno local puede usar Ollama. La clave GEMINI_API_KEY se obtiene del entorno del servidor, nunca del cliente.

La carta de doce productos está codificada en el navegador, en el servidor y en el evaluador anterior. Las reglas y el prompt contienen nombres/precios fijos. Para un establecimiento real habrá que reemplazar la fuente de esos datos en un flujo nuevo; enviar solamente un identificador al prompt no crea aislamiento.

La demo pública mantiene su carta ilustrativa y su comportamiento. El nuevo menú por slug utilizará datos autorizados de Supabase y un motor compartido con las evaluaciones.

## Training Lab comprobado

Importación CSV, detección de duplicados, búsqueda, filtros, paginación, revisión manual y exportación. Evaluación serial de hasta diez preguntas, pausa de 5,5 segundos, timeout de 55 segundos, cancelación y exportación JSON. Reutiliza /api/chat y muestra proveedor/modelo.

No hay autenticación ni persistencia. Las respuestas quedan pendientes de revisión; no existe porcentaje de aprobación automática válido. El evaluador CLI antiguo usa expectativas por coincidencia de texto y contiene su propia carta fija.

No se encontraron los bancos originales de 300 preguntas, 900 variantes y 1.000 preguntas sintéticas en el árbol remoto ni en sources local. No se afirmará que están importados. Sources está vacío en este entorno. Reutilizar el importador cuando los bancos estén disponibles, sin regenerarlos ni duplicarlos.

El README tiene secciones históricas que contradicen el código actual: afirma que no evalúa y que /api/chat no funciona en producción. Debe actualizarse.

## Supabase existente, inspeccionado sin datos personales

Trece tablas públicas con RLS activada: restaurants, restaurant_members, categories, products, beer_details, promotions, promotion_products, restaurant_faqs, ai_interactions, ai_usage, menu_views, product_events y rate_limits.

Correspondencias a reutilizar:

| Requisito | Tabla existente / ampliación |
| --- | --- |
| Establecimientos | restaurants |
| Miembros | restaurant_members |
| Categorías/productos | categories / products |
| Ingredientes/alérgenos | arrays en products; conservar antes de normalizar |
| Promociones y productos | promotions / promotion_products |
| Preguntas frecuentes | restaurant_faqs |
| Consumo y límites | ai_usage / rate_limits, revisar RPC antes de reutilizar |
| Documentos | nueva knowledge_documents |
| Horarios estructurados | nueva business_hours; conservar restaurants.hours |
| Evaluaciones | nuevas training_runs / training_results |

restaurants contiene slug, nombre, descripción, imágenes, color, horarios/servicios como texto, timezone, published y fechas. Faltan datos estructurados de dirección, contacto, pagos, redes y políticas.

products ya contiene precio numeric, ingredientes, alérgenos, etiquetas alimentarias, imagen, available, published y updated_at. No existe una verificación explícita de vigencia del stock ni certificación de alérgenos: arrays vacíos no significan ausencia de alérgenos. Añadir campos de verificación, sin asumir confirmación sobre registros antiguos.

Las claves foráneas de products/category, beer_details/product y promotion_products/product/promotion incluyen restaurant_id. Eso evita referencias cruzadas entre negocios a nivel de base.

Las políticas existentes permiten lectura pública de información publicada y edición a miembros con roles owner/editor. restaurant_members permite al usuario leer su propia pertenencia. Las funciones is_member y can_edit usan auth.uid(); son SECURITY DEFINER con search_path fijado a public. Falta verificar grants de funciones/esquema, operaciones de alta de restaurante/miembros y probar con dos usuarios reales antes de declarar aislamiento completo.

promotion_now filtra active, fechas, días, franjas horarias y disponibilidad de productos cuando require_available está activado. Maneja franjas nocturnas. Usa America/Lima fija, aunque restaurants tiene timezone. Deben probarse los límites exactos, medianoche, franjas vacías y promociones sin productos. No se sustituirá sin pruebas.

Compatibilidad concreta: ai_interactions.mode admite structured/ollama/error, pero no gemini. La integración deberá ampliar el CHECK de forma controlada o registrar proveedor en una columna separada.

## Riesgos prioritarios

1. Publicar desde main puede volver al código antiguo. Desarrollar sobre el commit publicado y no fusionar por ahora.
2. Lectura pública de cartas publicadas es esperada; documentos privados, miembros, pruebas y resultados deben seguir protegidos. Verificar con JWT, RLS y servidor; un restaurant_id del cliente no concede acceso.
3. Los límites de /api/chat son por instancia y memoria. CORS no sustituye autorización ni impide abuso desde clientes ajenos al navegador. Incorporar contadores atómicos duraderos por negocio y ejecución antes de habilitar lotes reales.
4. No mezclar la demo fija con datos del establecimiento cuando Supabase falla. El nuevo flujo debe devolver error/limitación, nunca la carta ficticia como respaldo.
5. Nunca tomar historial, documentos o preguntas como instrucciones de sistema. Datos documentales publicados tampoco verifican precios ni stock.
6. No ejecutar 2.200 llamadas; limitar lotes, concurrencia, duplicados y presupuesto desde el servidor.
7. RLS habilitada y claves compuestas son buena base, pero todavía no prueban por sí solas el aislamiento completo.

## Plan adaptado y archivos propuestos

B — Migraciones versionadas en supabase/migrations: ampliar restaurants/products sin borrar datos; añadir documentos, horarios y tablas de evaluación; RLS basada en las funciones existentes; revisar grants y cuotas. No crear establishments/menu_products duplicadas. No ejecutar un rollback que borre datos de un piloto usado.

C — Panel mobile-first en admin/: acceso Supabase Auth, selección entre negocios autorizados, información, carta, promociones y documentos. Rutas administrativas validan identidad en servidor y conservan RLS. No usar service_role para operaciones habituales de usuarios.

D — Módulos server/knowledge/ y nuevas rutas de menú/chat por slug: consultas estructuradas, snapshot de datos y comprobación de vigencia; reglas deterministas para precios, presupuestos, horarios y promociones; reutilizar el proveedor Gemini con contexto del negocio. Menú público independiente de la landing para preservar el chat actual. Sin búsqueda vectorial inicial; documentos cortos publicados con selección acotada.

E — Training Lab conserva importador y vistas. Añadir modo autenticado por negocio, motor compartido, registro de snapshot/resultados y categorías solicitadas. Los casos sin criterio verificable quedan pendientes de revisión; no convertir coincidencias de palabras en aprobación semántica.

F — Pruebas Node para reglas, endpoints y cuotas; SQL/RLS con dos negocios y usuarios; pruebas reales controladas de precios cambiados, promociones vencidas, alérgenos desconocidos, inyección y datos privados. Verificación visual 320/375/390/414/430 y escritorio. Preservar las doce pruebas anteriores.

## Configuración pendiente

Proyecto de pruebas identificado. Aún no se obtuvieron ni configuraron credenciales de Supabase; no se leyeron secretos. Para la integración se necesitará SUPABASE_URL y la clave pública publishable del proyecto de pruebas en configuración de Preview/local. Las claves secretas administrativas no van en frontend, logs ni GitHub. GEMINI_API_KEY de Preview requiere un ámbito propio para la rama Knowledge Base; no alterar Production.

No se aplicaron migraciones, no se crearon usuarios y no se cargaron productos ficticios. Antes de hacerlo debe existir una migración concreta revisable y una prueba de seguridad. El MVP completo de las fases B–F todavía no está implementado.

## Evidencia y referencias

- Árbol/ramas/PR consultados mediante GitHub en el repositorio real.
- Supabase: SELECT de columnas, flags RLS, políticas, funciones y constraints. Sin consultas a registros de clientes ni exportación de usuarios.
- Pruebas existentes: doce pasaron antes de iniciar este desarrollo.
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/reference/javascript/auth-getuser
