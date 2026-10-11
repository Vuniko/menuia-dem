# Asistente por negocio: prueba administrativa

El panel incorpora **Probar mi asistente**. Requiere una sesión válida y pertenencia al negocio; permanece deshabilitado en Production. Usa un snapshot nuevo de Supabase en cada pregunta, con el JWT del usuario y filtros explícitos de restaurante. No cambia /api/chat, sus prompts, la carta de demostración ni el Training Lab.

Solo se usan productos/categorías publicados, FAQs publicadas y documentos activos/publicados. Los borradores y documentos privados no se incluyen. El restaurante puede seguir siendo borrador para que su administrador pruebe la carta antes de compartirla.

Precios, consultas de presupuesto de un producto, horarios, promociones, pagos y alérgenos tienen respuestas estructuradas. Las promociones se evalúan con hora del servidor en Perú: cierre exclusivo, día de inicio para franjas nocturnas y stock verificado cuando lo requieren. Stock sin fechas vigentes permanece por confirmar. Una lista vacía de alérgenos nunca certifica seguridad.

Para otras preguntas Gemini selecciona como máximo dos IDs de fuentes del mismo negocio. El servidor valida esos IDs y presenta datos guardados; no muestra precios o productos inventados por el modelo. No se ejecutan instrucciones documentales ni se permiten herramientas del modelo. Esto reduce generación libre, pero no garantiza que toda selección semántica sea acertada ni que el contenido publicado por el administrador sea verdadero. La revisión humana sigue siendo necesaria.

Se conserva la conexión HTTP directa existente a Gemini, con x-goog-api-key, modelo del entorno o el mismo valor predeterminado que el chat anterior. No se añadió SDK ni servicio nuevo. Claves y JWT no se devuelven al navegador ni se registran. No hay respaldo con la carta ficticia de la demo cuando falla Supabase/Gemini.

La migración 202610110003 añade reservas privadas y una función restringida a miembros autenticados. Bloquea el registro del restaurante para aplicar un límite duradero compartido: 20 llamadas/día de Perú y 45 segundos entre reservas. Un request_id no se puede reutilizar. Los errores posteriores a reservar consumen cuota; no hay reintento automático. Las respuestas estructuradas no reservan ni llaman al modelo. La cuota limita llamadas, no garantiza un precio monetario; no se habilitaron servicios pagos.

Aplicada únicamente al piloto mediante el editor SQL. Pruebas SQL reales: PASS 7, datos ficticios revertidos. Una primera sustitución de texto en Monaco conservó la consulta anterior y fue rechazada por tabla existente, sin cambios; se sustituyó el editor completo y la prueba correcta pasó.

Validación: 38 pruebas Node (28 de panel/recuperación/endpoints y 10 del motor), 4 pruebas de regresión de endpoints Gemini anteriores. Prueba visual local aislada con datos ficticios: consulta del precio guardado; sin desbordamiento horizontal en 320, 375, 390, 414, 430 y 1280 píxeles. No se afirma que esta prueba use datos reales de Supabase. Gemini está simulado en las pruebas unitarias; la comprobación del proveedor real requiere una sesión de administrador en Preview y fuentes publicadas.

Pendientes para completar toda la Fase D: menú público por slug y su chat, maridajes estructurados, más cobertura de intenciones y recorridos con usuarios/JWT reales. Fase E: conectar Training Lab y persistir evaluaciones. Esta entrega permite probar la conexión desde el panel antes de exponer el nuevo flujo a clientes. No se fusionó el PR ni se promovió a producción.
