# MenuIA — Validación real de Gemini en Preview (Fase 1)

**Estado:** protocolo preparado, ejecución real de Gemini pendiente.
**Entorno:** Preview del commit merge de PR #13: `83b0ab54c14a7dad9a08a6d23bdf54abc2030308`.
**URL de Preview identificada en Vercel:** https://menuia-44v60jbzr-vuniko.vercel.app/?negocio=menuia-demo#inicio
**Rama:** `feature/menuia-commercial-skills-v2-validate`.
**Restricciones:** No usar Production para hacer pruebas; no leer, modificar ni registrar secretos. No cambiar variables de entorno ni políticas de protección de Preview. Nunca pegar tokens/API keys en capturas, tickets, consola o logs.

## Precondiciones
1. Abrir la URL Preview con acceso autorizado de Vercel si está protegida. Si la URL devuelve 401/403 o página de protección, detenerse y documentar el bloqueo; NO desactivar protección.
2. Confirmar que el catálogo demuestra `menuia-demo` y que el aviso señala explícitamente productos, precios y stock ficticios.
3. Verificar en el navegador (sin acceder a valores secretos) que la respuesta de la API incluya `provider`, `modelStatus`, `nextAction`, `products`, `variantIds` y `catalog.business.slug`. El frontend muestra «Selección con Gemini» únicamente cuando `provider='gemini'`.
4. Si la API indica `provider:'catalog'` con `modelStatus:'unavailable'`, registrar el código de error del modelo, no declarar integración Gemini probada. Si no se ha configurado el proveedor en Preview, el flujo se considera bloqueado; solicitar autorización por separado antes de cualquier cambio de configuración.

## Guion mínimo (nueva conversación)
A. «Hola, quiero comprar algo.» — Debe descubrir necesidades, sin recomendar productos inventados.
B. «Tengo S/200 para regalarle algo a mi hermano.» — Debe guardar presupuesto, destinatario y una sola pregunta de descubrimiento.
C. «Le gusta la música.» — Debe recomendar 1–3 productos publicados compatibles, todos dentro del presupuesto.
D. «Compara los dos primeros.» — Comparación con precio y atributos presentes, sin atribuir cualidades no registradas.
E. «¿Tenés otro color?» — No perder el producto de referencia; pedir aclaración si se mencionaron varios.
F. «Me quedo con el primero.» — Resolver la referencia a un ID de producto de la última lista válida.
G. «Me lo llevo.» — Mostrar botón «Ver ficha y elegir opciones» solamente si hay variante inequívoca publicada con stock; en caso contrario exigir elección de variante. No declarar pedidos confirmados.

## Verificación de interfaz
- Confirmar en móviles 390px y escritorio 1280px que el botón está visible cuando corresponda, tiene texto claro y es navegable por teclado.
- Pulsar el botón; comprobar ficha, atributos preseleccionados, precio y disponibilidad según el catálogo devuelto por esa solicitud.
- Agregar una unidad a carrito **local**; verificar contador y subtotal. No se deben cobrar pagos, reservar stock ni crear pedidos.
- Reabrir el chat: verificar que se conservan las preferencias de sesión. Probar «empezar de nuevo» y comprobar que las restablece.
- Probar catálogo agotado o sin coincidencias; no permitir accionamiento indebido del botón.
- Comprobar que las respuestas de dos tenants distintos nunca mezclan sus IDs, memoria o productos (con fixtures/autorización apropiados, nunca datos privados de terceros).

## Evidencia mínima aceptable
- URL de Preview y SHA exacto.
- Captura del intercambio y la ficha (censurar cualquier información sensible).
- Campos no sensibles de la respuesta `provider`, `modelStatus`, `modelErrorCode` si existe, `products`, `variantIds` y `nextAction` (sin headers ni tokens).
- Resultado PASS/FAIL por paso, diferencias observadas, anchura de viewport y si las respuestas provinieron de Gemini real o fallback de catálogo.
- En caso de fallo, abrir incidencia y corregir en rama de QA, repetir CI y Preview antes de cualquier fusión.

## Criterio de cierre de Fase 1
(1) QA automatizada Node y navegador en verde (confirmado en PR #13), (2) Preview accesible por navegador autorizado, (3) prueba real con al menos una respuesta `provider:'gemini'` y selección grounded a catálogo, (4) variantes y botón ficha y carrito local verificados visualmente, (5) no hay fugas entre tiendas ni acciones de pago ficticias.

**Nota:** READY en Vercel y pruebas con Gemini simulado no satisfacen el criterio (3). La Fase 1 no debe considerarse terminada hasta contar con esa evidencia.
