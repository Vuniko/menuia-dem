# Registro de comercios

## Recorrido
Desde /negocios/, Crear mi tienda abre directamente registro: correo, contraseña (10 caracteres como mínimo), repetición. Se confirma mediante enlace o código del correo, con reenvío y espera de 60 segundos. Al volver desde un enlace confirmado se eliminan de la dirección los fragmentos de sesión y se pide ingresar; no se persisten tokens ni contraseñas en almacenamiento del navegador. El paso 3 solicita nombre, enlace sugerido y editable, descripción y contacto público. La tienda empieza como borrador salvo decisión explícita de publicarla. El panel invita a cargar el primer producto. La portada pública incluye Crear mi comercio.

El servidor normaliza el correo, fija el destino de confirmación a https://menuia-dem.vercel.app/negocios/?confirmado=1, limita reenvíos, rechaza enlaces de verificación ajenos y exige email_confirmed_at para crear/editar comercios. Asigna owner_id desde la identidad autenticada y reserva menuia-demo. No altera políticas, tablas, credenciales ni configuración remota.

## Comprobación
- 32 pruebas focalizadas aprobadas: registro, verificación, reenvío, bloqueo sin confirmar, propietario asignado, origen, catálogos y regresiones V3.
- Navegador local con fixture explícito (sin correo ni escrituras remotas): contraseñas distintas, paso 2, reenvío con espera, código sintético, nombre/enlace sugerido, tienda en borrador y panel de productos vacío.
- GET público de Auth settings: email habilitado, auto-confirmación deshabilitada y registro habilitado. No se leyeron claves privadas.
- La entrega real y el enlace del correo requieren la prueba del usuario. El destino debe estar permitido en Auth URL Configuration; este trabajo no cambió esa lista. Restricciones SMTP y cuotas de envío del proveedor siguen aplicando. No se afirma la recepción del correo ni un registro real completo antes de esa prueba.
