# Validación administrativa — 12 de octubre de 2026

Actualización: la inspección de catálogos desplegados y advisors se completó en [SECURITY-FOLLOWUP.md](SECURITY-FOLLOWUP.md). Las limitaciones de este informe describen la primera validación; Auth/CRUD remoto sigue pendiente.

Base: `feature/menuia-knowledge-base-v1`, commit `b84a64180277e01b91035fe7db8bb1a0bb565fea`.
Rama de trabajo: `fix/menuia-admin-validation`. Sin cambios en main, Production, variables, credenciales o bases remotas. No se ejecutaron solicitudes reales a Gemini, correos de recuperación ni escrituras en Supabase.

## Flujo y resultados

El usuario ingresa al panel → cookie HttpOnly → identidad verificada por Auth → pertenencia al negocio → consultas/escrituras con JWT y filtro de negocio → RLS → recarga de la interfaz.

| Área | Evidencia y alcance |
|---|---|
| Preview | El navegador muestra el formulario de ingreso en `/admin/`. No existe sesión MenuIA autenticada en esta validación. HTTP directo devuelve 302 hacia SSO de Vercel: el HTML final con 200 es la protección, no una respuesta válida de la API. |
| Sesión | Cookie local persiste al recargar; cierre devuelve al login. Tests verifican identidad en cada solicitud, expiración 401 y cookie eliminada; en hosted, Secure, prefijo __Host, SameSite=Strict y duración del token hasta 60 minutos. No hay refresh automático: al vencer se requiere ingreso. No se esperaron 60 minutos ni se probó Auth remoto. |
| Roles | Owner en navegador: edición habilitada. Viewer en otro negocio ficticio: sin controles de edición. API: viewer rechazado antes de escribir; editor admite altas; usuario ajeno recibe 403. |
| Negocios | Selector cambia correctamente a negocio ficticio de solo lectura. Ante fallo de carga se descarta el bundle anterior y se ocultan sus controles. |
| Categorías | Alta de `Bebidas QA ficticias`, guardada como borrador. Edición validada por las mismas reglas del endpoint; no se completó una edición de categoría en navegador. |
| Productos | Alta de `Jugo QA ficticio` a S/12,50. Ediciones a S/14,75 y S/15,25; guardar/recargar y marcar agotado comprobados con fixture en memoria. No hay persistencia de fixture entre reinicios del servidor. |
| Verificaciones | Con stock confirmado, editar solo precio conserva su vigencia. Tests: cambio de alérgenos o disponibilidad invalida su verificación; confirmación explícita la renueva. |
| Promociones | Alta ficticia con dos productos y S/30; final anterior al inicio produce error visible sin cerrar formulario; fechas válidas guardan. Tests SQL: RPC atómica, rollback de precio/enlaces ante producto ajeno y conflicto por versión antigua. Tests de conocimiento cubren medianoche, vencimiento y stock. |
| Errores | Tests para 401, 403, 409, cuerpos excesivos, precio negativo/decimales inválidos, asignación de tenant, campos arbitrarios y URLs de configuración inválidas. Fixture visual no reproduce red real, timeout ni todos los códigos del servicio. |
| Móvil | 320, 375, 390, 414, 430 y 1280 px sin desbordamiento horizontal en vista viewer; formulario promoción de 282 px en viewport 320. Se comprobó scroll del diálogo y botones de guardar/cancelar. Es emulación de ancho, no prueba en dispositivos físicos. |

## Problemas comprobados y cambios

1. **Edición de precio invalidaba verificaciones ajenas**: `readValues()` enviaba ingredientes, alérgenos y disponibilidad sin cambios junto con casillas de confirmación desmarcadas. El servidor borraba los timestamps. Ahora se omiten los campos verificados sin cambios durante edición, conservando la invalidación al modificar el dato y la renovación explícita. El mismo tratamiento aplica a métodos de pago y contenido de documentos.
2. **Datos privados persistían tras logout/401**: ocultar el workspace no eliminaba sus registros ni cerraba el asistente. Ahora se limpian registros, formularios y diálogos, y se descartan respuestas del asistente que llegan después del cierre de sesión.
3. **Bundle anterior durante cambio fallido de negocio**: se descarta antes de cargar el siguiente, para que no queden permisos ni contenido anteriores reutilizables.
4. **Configuración falsa positiva**: una URL no válida/de otro proyecto con una clave publicable hacía que `config` anunciara que se podía ingresar. Ahora aplica la misma validación de URL que las solicitudes al backend, sin hacer llamadas externas.

Las dos primeras regresiones se reprodujeron con tests fallidos antes del arreglo. Las otras dos tienen tests dedicados. No se modificaron políticas SQL ni migraciones.

## Auditoría de seguridad

- API Preview: Production responde 404; solo GET/POST; escrituras exigen origen exacto y JSON; cuerpos limitados; identidad consultada en `/auth/v1/user` antes de pertenencias. El JWT del usuario se transmite a PostgREST: no se usa service role.
- Mutaciones: lista permitida de recursos/campos; IDs UUID; restaurant_id impuesto por servidor; filtros de negocio e identidad del registro; timestamp con microsegundos para concurrencia. Promociones guardadas en una sola RPC invoker.
- SQL versionado: tablas nuevas con RLS; lectura privada para miembros y edición para owner/editor mediante helpers existentes. Escrituras incluyen USING/WITH CHECK. Claves compuestas evitan enlaces cruzados. RPC definer de creación exige auth.uid(), search_path vacío y EXECUTE restringido; límites de diez negocios bajo bloqueo por usuario. Tablas de cuotas y migraciones no expuestas al cliente. Tests confirman aislamiento/rollback en la base local de referencia.
- El esquema inicial **no está versionado en este repositorio**: las migraciones KB presuponen `restaurants`, `products`, `is_member`, `can_edit`, `is_public`, políticas y grants existentes. No se verificó su definición desplegada ni se ejecutaron advisors en Supabase. No equivale a certificación RLS remota. Cualquier revisión posterior debe comprobar grants, políticas y funciones reales con dos usuarios ficticios y anon.
- Recuperación usa URL fija del Preview de la rama original. Un Preview de esta rama nueva necesita validación de la configuración permitida antes de probar recuperación. No se cambiaron destinos ni contraseñas.
- La referencia de Supabase está fijada en código al piloto. Una etiqueta Preview no demuestra que la base esté aislada de datos reales: no se accedió a filas remotas.

Referencia metodológica: [RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Pruebas ejecutadas

- Node: **66/66** pruebas, incluyendo cuatro regresiones UI ejecutadas con código real del panel en un DOM simulado. Resultados: `admin-validation/node-tests.txt`.
- PostgreSQL offline PGlite: **65 comprobaciones** en seis suites (10 admin, 7 cuotas, 24 KB/RLS, 6 público, 8 banco, 10 training). Las transacciones revierten fixtures. Auth y Storage simulados; SQL de migraciones/RLS real.
- Base offline explícita: archivo local preexistente `menuia/supabase/migrations/001_initial.sql`, **referencia de compatibilidad, no export de la base desplegada**. SHA256: `F995D6116034C189D6F3096A582473849F5A93EC303DFE07C63CE9F66E21693F`. Se carga solo en memoria, sin seed real. Demo `cerveceria-demo` ficticia creada en memoria porque la suite pública requiere ese slug.
- Restricción del entorno: runner Node con procesos aislados falló `spawn EPERM`; se ejecutó con `--test-isolation=none`, sin elevar permisos. Mensajes Gemini 503 proceden de mocks esperados.
- No hay build de framework en esta rama estática. Se verificó sintaxis de archivos cambiados.

Repetir tests de aplicación desde raíz:

```sh
node --test --test-isolation=none server/admin-ui.test.mjs server/admin.test.mjs server/knowledge.test.mjs server/public-menu.test.mjs server/training.test.mjs server/preview.test.mjs
```

Repetir SQL offline, con un esquema inicial auditado explícito y PGlite instalado:

```sh
node server/admin-db-test.mjs --baseline /ruta/esquema-inicial.sql --pglite /ruta/node_modules/@electric-sql/pglite/dist/index.js
```

Fixture visual: `node server/admin-visual.test.mjs --visual`, abrir `http://127.0.0.1:8811/admin/`; cualquier identidad ficticia sirve, porque Auth es un mock. No representa credenciales válidas ni una garantía de Auth remoto.

## Pendiente de validación del Preview

El usuario eligió seguir con fixtures y documentar la limitación. Pendientes: ingreso/logout/expiración real en Supabase, CRUD autenticado con usuarios ficticios owner/editor/viewer, persistencia remota, políticas y grants desplegados, recuperación y vista móvil con datos del Preview. El acceso HTTP automatizado está protegido por SSO de Vercel; no se alteró Deployment Protection ni se solicitaron secretos. No declarar el panel listo para Production hasta completar esa integración. No se publicó ni se promovió ningún deployment de forma manual.
