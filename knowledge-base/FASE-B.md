# Knowledge Base V1 — Datos y acceso

## Alcance

Se amplió el proyecto de pruebas `menuia-piloto`, referencia `secknmhqqzjlirwwnsnf`, reutilizando restaurants/products y sus miembros/políticas existentes. La web publicada y las variables de Production no se modificaron. Esta entrega es la Fase B; todavía no incluye panel, nuevo motor ni persistencia del Training Lab en la interfaz.

## Migración

`supabase/migrations/202610110001_knowledge_base.sql` aplicada mediante el editor SQL de Supabase, en una transacción con límite de bloqueo/ejecución. Se registra la versión en menuia_kb_migrations; no se afirma que esté en el historial del CLI de Supabase, porque la aplicación fue manual.

Se añadieron:

- Contacto, dirección, tipo, redes, pagos y políticas del restaurante.
- Fechas de verificación de ingredientes/alérgenos y ventana explícita de disponibilidad. Los registros anteriores permanecen sin verificación; available=true por sí solo no confirma vigencia.
- product_pairings: relaciones con claves foráneas compuestas que impiden mezclar negocios.
- business_hours: turnos semanales, incluyendo horarios que cruzan medianoche.
- knowledge_documents: documentos privados por defecto, con publicación/desactivación y fechas.
- training_runs: usuario creador, clave de idempotencia única por negocio, máximo diez preguntas, estado y snapshot inmutable.
- training_results: respuesta, expectativa, datos utilizados, veredicto, criticidad, motivo, sugerencia, proveedor y tiempo. No se puede vincular un resultado a una ejecución de otro restaurante ni exceder su número declarado de preguntas.
- RLS, índices, privilegios explícitos y triggers de actualización/inmutabilidad para tablas nuevas.

No se borraron, renombraron ni recrearon tablas existentes. No se modificó la función promotion_now ni las políticas anteriores. ai_interactions sigue sin admitir gemini como mode: el motor nuevo deberá decidir una ampliación versionada antes de escribir allí.

## Políticas

Se reutilizan is_member/can_edit y la identidad auth.uid(). Miembros leen información de su negocio, owner/editor editan. Anónimos solo leen documentos activos/publicados, horarios activos y combinaciones públicas de restaurantes publicados. Usuarios anónimos no tienen acceso a training_runs/training_results. Usuarios viewer no escriben. Claves de servicio no se utilizaron.

Las cartas publicadas son información pública por diseño; el aislamiento probado protege datos privados y escrituras. Las pruebas se ejecutan con roles PostgreSQL authenticated/anon y claims sintéticas: comprueban RLS y constraints, pero no sustituyen la futura validación HTTP de JWT, administración ni pruebas del chat.

## Pruebas

`supabase/tests/knowledge_base_rls.sql` crea dos restaurantes, tres identidades y datos ficticios dentro de BEGIN/ROLLBACK. No envía correos ni solicitudes al modelo. El resultado inicial fue PASS: 18 checks. Se amplió la batería para verificar idempotencia, creador, snapshot, tamaño de ejecución y vigencia del stock; registrar su resultado final en VALIDACION.json.

Resultado final: **PASS: 24 checks; synthetic data rolled back**. También se comprobaron snapshot inmutable, máximo declarado de resultados, idempotencia, suplantación del creador y fechas inválidas del stock.

La transacción revierte las identidades y datos de prueba. En caso de error de una prueba se aborta la transacción; antes de repetir debe asegurarse su rollback. No debe quitarse el ROLLBACK final.

## Reversibilidad

No se incluye un rollback destructivo automático. Las tablas y columnas añadidas pueden contener datos cuando se use el panel; eliminarlas borraría ese trabajo. Si hay un problema, conservarlas y deshabilitar el flujo nuevo mediante configuración, y preparar una migración correctiva hacia adelante. La aplicación existente no depende de estas nuevas tablas.

## Próximas fases

1. Configurar el proyecto de pruebas en local/Preview con SUPABASE_URL y clave pública publishable; ninguna clave secreta en el cliente. El panel debe autenticar al usuario y el servidor validar su identidad; RLS debe mantenerse al realizar las consultas.
2. Crear panel para cargar negocio, productos, horarios, promociones y documentos. La alta de negocio/miembros requiere una operación controlada: el esquema actual no concede INSERT público a restaurants ni edición de restaurant_members.
3. Motor por slug con consultas estructuradas, fechas del servidor y un contexto acotado para Gemini. Mantener la demo existente y evitar su carta fija como respaldo de un negocio real.
4. Evaluaciones persistidas, cuotas atómicas de consumo por negocio/usuario, concurrencia e idempotencia en el servidor; el máximo diez filas en la base NO es un límite global de costos.
5. Verificar cambios de precio, vigencia/medianoche, datos desconocidos, inyección, dos JWT reales y regresión móvil antes de publicar.

No aplicar esta migración de nuevo al mismo piloto: es versionada y no está diseñada como script idempotente de reinstalación. Un entorno nuevo necesita primero el esquema base ya auditado; esta migración no intenta reconstruirlo.
