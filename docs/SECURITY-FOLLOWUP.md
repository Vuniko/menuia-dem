# Auditoría desplegada — 12 de octubre de 2026

Continuación del PR #4, sin fusionarlo. El usuario eligió mantener pendiente la autenticación y completar la auditoría. Solo se ejecutaron SELECT sobre catálogos y advisors en `menuia-piloto` (`secknmhqqzjlirwwnsnf`); no se leyeron filas de negocios ni usuarios, no se enviaron correos, no se obtuvieron claves ni se cambiaron datos, roles, Auth o políticas remotas.

## Preview actualizado

Vercel confirma READY para `dpl_9QAd3obvUkMT912z6MwKg1BUccqf`, commit `98f0eba31be77fb3b0f38458a86549e2f862ebb9`, target null (Preview), rama `fix/menuia-admin-validation`.
URL inspeccionada: https://menuia-euqntw5f5-vuniko.vercel.app/admin/ .
El navegador muestra Ingresar deshabilitado y: «Este Preview todavía necesita la configuración de Supabase. Tu cuenta y contraseña no se enviarán hasta que esté listo.» Es una limitación de configuración confirmada; no se intentó autenticar ni se cambiaron variables. No se trasladó ninguna prueba a Production.

## Catálogos y advisors reales

| Comprobación | Resultado |
|---|---|
| Tablas públicas ordinarias | 21; las 21 con RLS activada |
| Creación de objetos en public | anon=false; authenticated=false |
| Políticas de edición | categories/products/promotions y recursos KB usan can_edit; UPDATE incluye USING/WITH CHECK; pertenencias solo permiten leer user_id=auth.uid() |
| Helpers de pertenencia | is_member/can_edit consultan auth.uid(); can_edit exige owner/editor; definer, search_path=public |
| RPC administrativas definer | kb_create_restaurant y kb_reserve_assistant no ejecutables por anon, ejecutables por authenticated; exigen identidad y control correspondiente; search_path vacío |
| Tablas internas | kb_assistant_reservations y menuia_kb_migrations: anon sin SELECT/INSERT/UPDATE/DELETE; RLS sin políticas intencional |
| Tablas heredadas | anon conserva INSERT/UPDATE/DELETE en 13 tablas, incluido rate_limits. RLS bloquea las operaciones actuales; no se demostró escritura anónima. Recomendación de mínimo privilegio, no prueba de bypass |
| Trigger touch_updated | SECURITY INVOKER; proconfig=null, search_path sin fijar. Advertencia de advisor confirmada; no se demostró escalación de privilegios |
| Protección de contraseñas filtradas | Advisor informa deshabilitada. Se documenta, sin cambiar Auth ni contraseñas |

Los avisos de definer no equivalen automáticamente a un bypass: is_member y can_edit anónimos devuelven control basado en identidad; is_public y kb_reserve_public_assistant tienen propósito público. Revocar EXECUTE indiscriminadamente rompería políticas públicas. Los helpers con search_path public no son secuestrables mediante CREATE de anon/authenticated según los privilegios consultados, aunque es recomendable usar nombres cualificados.

Advisors: [search_path mutable](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [definer ejecutable por anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [protección de contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Sin avisos ERROR en la respuesta recibida. Las tres advertencias INFO de RLS sin políticas corresponden a reservas, historial de migraciones y rate_limits; para esta última conviene retirar también los grants heredados.

## Hallazgo: promotion_now revela estado privado mediante RPC

**Prioridad P2: filtración de un booleano, sin escritura demostrada.** La función desplegada es SECURITY DEFINER, accesible por anon, recibe un objeto `promotions` y consulta enlaces/productos por su id sin comprobar pertenencia o publicación del negocio ni vincular la entrada a una fila autorizada. Un llamador que conozca o adivine identificadores puede construir el argumento y obtener señales sobre el estado de productos privados. No se enumeraron UUID ni se sondearon registros reales.

Reproducción **solo offline**, con el mismo cuerpo de función de la base local de referencia y los grants compatibles con el catálogo remoto:

1. Crear negocio privado, categoría/producto privados y promoción activa ficticios.
2. Bajo rol anon, SELECT no devuelve la promoción privada.
3. Invocar la función con una entrada compuesta proporcionada por el llamador: false cuando el producto no está disponible/publicado.
4. Cambiar el producto/categoría ficticios a disponibles/publicados, manteniendo privado el negocio: SELECT sigue sin devolver filas, pero la RPC retorna true.

El borrador `supabase/review/admin-hardening-draft.sql` verifica acceso al negocio y carga una promoción almacenada por id+restaurant_id antes de calcular vigencia; no confía en los demás campos proporcionados por el llamador. La reproducción retorna false en ambos estados privados y true al publicar el negocio, sin romper las promociones públicas.

## Corrección preparada, sin aplicación remota

`supabase/review/admin-hardening-draft.sql` es un **borrador de revisión, no una migración aprobada**:

- Fija search_path vacío en touch_updated.
- Retira escrituras de anon en tablas heredadas y todo acceso cliente a rate_limits, conservando roles internos y RLS.
- Acota promotion_now al negocio accesible y a una promoción existente. Conserva EXECUTE público porque las políticas lo necesitan.

Se probó exclusivamente en PGlite. Las seis suites SQL existentes siguen aprobadas: **65 comprobaciones**, además de las aserciones de la reproducción privada/pública. No se cambió la lógica de stock vigente de la carta; el borrador conserva el cálculo histórico de promotion_now. No sustituye una migración generada con CLI y validada contra un clon de esquema real, ni una revisión de dependencias, sesiones y comportamiento en Supabase. Antes de aplicarlo deben revisarse clientes anónimos heredados e integración; no se considera corregida la base remota.

Reproducir el hallazgo local:

```sh
node server/admin-db-test.mjs --baseline /ruta/esquema-inicial.sql --pglite /ruta/node_modules/@electric-sql/pglite/dist/index.js --security-probe
```

Probar el borrador local:

```sh
node server/admin-db-test.mjs --baseline /ruta/esquema-inicial.sql --pglite /ruta/node_modules/@electric-sql/pglite/dist/index.js --security-probe --hardening-review
```

Ambos comandos trabajan en memoria; no leen .env ni contactan Supabase. La reproducción usa fixtures con rollback. No debe ejecutarse el archivo de reproducción en una base remota.

## Pendientes que permanecen

La inspección de políticas, grants y funciones **ya se realizó contra catálogos desplegados**; reemplaza esa limitación del informe anterior, pero no acredita comportamiento Auth/CRUD end-to-end. Siguen pendientes: variables de Preview en la rama corregida (sin enviar claves al chat), sesión ficticia, owner/editor/viewer con dos negocios de prueba, persistencia remota, expiración real, recuperación y móvil autenticado. No se modificará la base para cerrar estos pendientes durante una auditoría de solo lectura. Main y Production permanecen intactos.
