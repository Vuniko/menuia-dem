# Panel administrativo MenuIA — Fase C

## Funciones

- Inicio de sesión con la cuenta existente de Supabase Auth (correo/contraseña), cierre de sesión y comprobación de identidad en servidor.
- Selección únicamente entre negocios con pertenencia autorizada. Propietario/editor pueden editar; viewer tiene solo lectura.
- Crear un negocio como borrador y asignar al usuario autenticado como propietario, de manera atómica. Máximo diez negocios propios por usuario en este piloto.
- Información comercial, contacto, redes, métodos de pago, servicios, políticas e imágenes por URL HTTPS.
- Crear/editar categorías, productos, precios, imágenes, ingredientes, alérgenos y etiquetas; marcar agotado/publicado y verificar stock por 1 a 24 horas.
- Crear/editar promociones, seleccionar productos participantes, precio, vigencia, días, horario y estado. Promoción y relaciones se guardan juntas en una transacción.
- Gestionar turnos semanales (incluyendo madrugada), preguntas frecuentes, documentos privados/publicados y notas de combinaciones.
- Mostrar datos incompletos, stock sin verificación vigente, promociones vencidas, borradores y fechas de actualización. No se afirma detectar todas las contradicciones semánticas.
- Formularios accesibles, etiquetas, estados de carga/error, prevención de doble envío, diálogo nativo y control de cambios sin guardar.
- Evitar sobrescribir ediciones concurrentes mediante comparación exacta de updated_at, conservando los microsegundos de PostgreSQL.

## Seguridad

El backend es `server/admin.mjs`, servido por `api/kb-admin.mjs`. No se añadieron dependencias ni otro proveedor de identidad. Se consulta `/auth/v1/user` para comprobar la identidad, se verifica membership y se reenvía el JWT del usuario a Supabase; RLS conserva su contexto. No se utiliza service_role.

La clave pública solo se lee en el servidor. El código rechaza claves sb_secret y tokens legacy con rol distinto de anon como configuración. El proyecto admitido está limitado explícitamente a `secknmhqqzjlirwwnsnf` para evitar apuntar por accidente a otra base.

La sesión se guarda en una cookie HttpOnly, SameSite=Strict, Secure en Vercel, de hasta una hora. No se devuelven access_token/refresh_token al JavaScript del panel, ni se almacenan en localStorage. No hay renovación automática: al vencer se requiere ingresar de nuevo. El servidor valida el Origin exacto para mutaciones JSON, además de sesión, pertenencia y rol. CORS no es la autorización.

Cada recurso tiene campos admitidos y límites. El cliente no puede asignar restaurant_id, user_id, role ni columnas arbitrarias en un formulario. Las actualizaciones siempre incluyen el restaurante autorizado y el registro. Precios y fechas se validan; fechas de verificación las establece el servidor con confirmación explícita del administrador.

No se registra contenido de formularios, credenciales ni respuestas Auth en logs. Errores de Supabase se traducen a mensajes acotados en español. Las APIs administrativas devuelven 404 en VERCEL_ENV=production: esta fase se habilita únicamente en Preview/local.

## Base de datos

`supabase/migrations/202610110002_admin_panel.sql` añade:

- kb_create_restaurant: SECURITY DEFINER, search_path vacío, auth.uid obligatorio, alta privada y pertenencia owner en una sola transacción. No admite crear miembros para terceros ni modificar miembros existentes.
- kb_save_promotion: SECURITY INVOKER, permisos existentes/RLS, bloqueo de edición obsoleta y transacción para relaciones con productos. Claves compuestas siguen impidiendo cruces entre negocios.

Aplicada solo al piloto. No se modificaron políticas existentes ni se ejecutaron borrados de datos; el DELETE dentro de la función solo sustituye relaciones de una promoción autorizada cuando su administrador la guarda.

## Configuración y uso local

Crear `.env.local` a partir del ejemplo y configurar la URL del piloto y su clave pública publishable. El archivo está excluido de Git y del despliegue. No usar una clave administrativa. Node 20+:

```powershell
node --env-file=.env.local server/admin-local.mjs
```

Abrir `http://127.0.0.1:8810/admin/`. El servidor local escucha únicamente en loopback y sirve una lista fija de archivos. El checkout aislado contiene los nuevos archivos; la demo previa se conserva en su directorio anterior.

En Vercel se configuraron SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY únicamente para Preview, rama feature/menuia-knowledge-base-v1. No se modificó Production ni GEMINI_API_KEY. Esta fase no hace llamadas al modelo.

## Validación y límites

- 20 pruebas Node de autenticación, permisos, asignación de campos, conflictos, precisión de versiones, cookies, validaciones y protección de Production.
- 10 pruebas SQL reales de alta, propiedad, estado privado, promociones, rollback atómico de relaciones inválidas, bloqueo de edición obsoleta, vencimiento y rechazo de anónimos. Los datos ficticios se revirtieron.
- Las pruebas SQL de la fase anterior ya cubren RLS entre dos restaurantes; no sustituyen la prueba de acceso con cuentas reales a través del navegador.
- Las doce pruebas de regresión anteriores de chat y Training Lab pasaron.
- Prueba visual con fixture aislada (sin conexión a Supabase) en 320, 375, 390, 414, 430 y 1280 píxeles: sin desbordamientos horizontales. Se comprobó editar precio/agotado, guardar una promoción y su selección de productos, guardar documentos como texto literal y cambiar a un negocio de solo lectura. El contenido HTML introducido no creó elementos ejecutables.
- El helper server/admin-visual.test.mjs solo arranca con --visual y está excluido del despliegue por .vercelignore. No añade una vía de acceso ficticia al Preview real.
- Pendiente que el usuario ingrese con su cuenta para confirmar el recorrido real de administración en el Preview. No se leyó ni pidió su contraseña.

No incluye invitaciones de miembros, recuperación/alta de contraseña, carga binaria de fotos, eliminaciones masivas, pedidos, pagos ni IA evaluadora. Las imágenes se registran como URLs HTTPS. Las listas admiten hasta 500 registros por sección y 100 negocios; si se supera ese límite se informa, sin truncar silenciosamente.

La asociación con el chat y el Training Lab pertenece a las fases D/E. Guardar aquí cambia el piloto Supabase, pero todavía no cambia la carta fija del chat público.

No fusionar ni publicar en producción sin autorización expresa.
