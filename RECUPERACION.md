# Recuperación de acceso — Preview MenuIA

El panel añade «Olvidé mi contraseña» y `/admin/recovery.html`. El servidor solicita el correo a Supabase con un destino fijo, no controlado por el navegador:

https://menuia-dem-git-feature-menuia-knowledge-base-v1-vuniko.vercel.app/admin/recovery.html

Ese destino exacto debe estar autorizado en Authentication → URL Configuration → Redirect URLs del piloto. No se cambia el Site URL predeterminado ni se habilitan comodines, producción u otros dominios.

El enlace de correo verifica la identidad en Supabase y vuelve con una sesión de recuperación en el fragmento. El código elimina inmediatamente ese fragmento de la URL y entrega el access token al servidor para verificarlo en `/auth/v1/user`. La cookie de recuperación es HttpOnly/SameSite=Strict/Secure en Vercel, dura diez minutos y es distinta de la cookie administrativa. No se almacena refresh token ni se renueva esta sesión automáticamente.

El usuario debe ingresar y confirmar personalmente una contraseña nueva de 12 a 128 caracteres. El servidor la actualiza únicamente para la identidad verificada, usando el JWT del propio usuario, y elimina la cookie de recuperación cuando Supabase confirma el cambio. No se usa una clave de servicio ni un identificador de usuario elegido por el navegador.

La respuesta de solicitud de correo es genérica para evitar enumerar cuentas. El destino es fijo y el proveedor conserva sus límites de correo; ante 429 no se reintenta automáticamente. No registrar cuerpos de estas solicitudes ni tokens. Supabase confirma la aceptación del correo, no su llegada a la bandeja de entrada.

Pruebas: 25 pruebas de servidor pasaron, incluyendo cinco nuevas sobre destino fijo, separación de cookies, validación de sesión, tokens vencidos y actualización de contraseña exclusivamente en un proveedor simulado. No se cambió la contraseña real durante esas pruebas. En Preview sin enlace válido, la pantalla no habilita el formulario.

Referencias oficiales: https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail y https://supabase.com/docs/reference/javascript/auth-updateuser
