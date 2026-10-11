# Menú público de demostración en Preview

Ruta: `/menu/?negocio=cerveceria-demo`. No requiere sesión. API nueva `/api/kb-menu`: GET de carta y POST de preguntas. El panel anterior y la landing conservan sus rutas.

Se habilitó published=true únicamente para Cervecería Demo MenuIA, con información ficticia identificada. La API admite exclusivamente ese slug en este piloto y devuelve 404 en Production. La URL del piloto Supabase y el tipo de clave pública se validan; no se usan claves administrativas, cookies del panel ni JWT del administrador para leer el menú público.

Las consultas usan el rol anónimo y RLS, filtros explícitos de negocio/publicación/actividad y campos seleccionados. No incluyen documentos privados, borradores, miembros ni registros de entrenamiento. La carta y el chat leen datos nuevos por solicitud. La página incluye actualización manual, categorías, precios, stock, ofertas vigentes, horarios y un chat de pantalla completa en móvil. No se añadieron servicios, dependencias, pedidos, pagos ni reservas.

El chat reutiliza buildKnowledge/answerKnowledge del panel, incluidos precios, promociones, horarios de Perú y maridajes. La migración 005 incorpora kb_reserve_public_assistant para el negocio público de demostración. Reservas públicas tienen created_by NULL; las tablas de reservas siguen sin SELECT/INSERT directo para anon/authenticated. La función está limitada al slug publicado, comparte las mismas reservas del panel, bloquea la fila del negocio y conserva 500 llamadas/día y 5 segundos entre reservas. No establece límites nuevos independientes ni duplica el cupo. El endpoint POST exige Origin exacto, UUID de solicitud, tamaño y longitud acotados. Origin no sustituye una cuota ni autenticación; el menú es deliberadamente público.

Comprobaciones iniciales: 48 pruebas Node (5 nuevas de API pública), 6 pruebas SQL reales de cuota/duplicación/cooldown/negocios ajenos/publicación/permisos, con rollback de todos los cambios de prueba. La migración se aplicó exclusivamente al piloto.

Este paso habilita un menú para la demo ficticia, no una publicación de toda Knowledge Base V1 en producción. Training Lab todavía no se conecta al flujo por negocio; quedan pendientes su persistencia y el soporte de otros slugs.
