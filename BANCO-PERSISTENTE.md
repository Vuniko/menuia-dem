# Banco de preguntas persistente por negocio

La versión inicial de Fase E guardaba evaluaciones pero no el banco CSV. Esta corrección añade training_question_banks, con RLS privada por membresía, escritura de owner/editor, protección de versión exacta y copia de la versión anterior. No hay acceso anónimo ni nuevas claves.

El modo por negocio recupera el banco al abrir o cambiar establecimiento y guarda automáticamente tras importar, cargar ejemplos, limpiar o cambiar revisión del banco. Mantiene preguntas, respuestas esperadas, intención, categoría, variante, procedencia, filas originales y campos adicionales del CSV como JSON. Guardar no llama a Gemini ni evalúa preguntas.

Los avisos distinguen cambios pendientes, guardado correcto y error. Esperar Banco guardado antes de recargar. Si falla el guardado, exportar CSV; no se afirma que un error de conexión haya guardado datos. Recuperar banco guardado carga la copia de Supabase. Restaurar versión anterior permite deshacer la última sustitución, incluida una limpieza. No se promete un historial ilimitado de versiones del banco.

Límite por banco: 5000 registros y 1,8 MB de JSON por la API, con constraints en la base. El límite mayor de solicitud solo se aplica a trainingBankSave; los demás formularios conservan 40 KB. Los snapshots de evaluaciones previas y sus revisiones no cambian. La demo anterior sigue en memoria; persistencia requiere modo por negocio y sesión válida.

Migración 007 aplicada al piloto. Recupera únicamente las preguntas presentes en el último snapshot de Cervecería Demo MenuIA: diez preguntas ya guardadas. No reconstruye archivos CSV antiguos que solo estuvieran en memoria. Las pruebas SQL de metadatos, versión anterior, edición obsoleta, otro negocio y anónimos pasan con rollback. Pruebas Node: 54 pasan, incluidas límites/roles y conservación exacta de metadatos/versiones.

FASE-E.md describe la entrega inicial. Esta corrección sustituye su limitación de banco en memoria para el modo por negocio. Producción y el comportamiento del chat no se modificaron.
