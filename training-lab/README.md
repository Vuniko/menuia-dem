# MenuIA Training Lab V1

Panel estático para inspeccionar bancos de preguntas CSV desde celular o computadora.

## Uso
Abrir `training-lab/index.html` en el navegador (o servirlo con cualquier servidor estático), elegir uno o varios archivos CSV y pulsar **Importar archivos**.

Funciones: importación CSV UTF-8 con delimitadores coma/punto y coma/tabulación; campos entrecomillados; búsqueda; filtro de categorías; paginación de 25 registros; métricas de completitud; exportación normalizada. Los CSV se procesan en el navegador, sin enviarse a un servidor.

Campos reconocidos (se admiten sinónimos en inglés): `pregunta`, `respuesta`, `intencion`, `categoria`, `variante`. El importador solo requiere una columna de pregunta; los demás campos ausentes se marcan para revisión.

**Limitaciones:** no ejecuta IA, no mide precisión semántica, no se conecta a Supabase ni persiste importaciones entre recargas. La métrica «completas» solo indica presencia de pregunta, respuesta, intención y categoría. Los ejemplos son demostrativos. No hay datos de los bancos originales incluidos en el repositorio.

## Próximos pasos
1. Validar estructura de los CSV reales y mapear columnas adicionales.
2. Crear runner de pruebas por lotes sobre `server/eval-menuia.mjs` sin bloquear la interfaz.
3. Registrar correcciones y revisar alucinaciones de precios, ingredientes, alergias y promociones.
4. Añadir persistencia y acceso autenticado antes de habilitar Supabase en producción.

## Fase 2: importación y revisión

- Se rechaza completo cada archivo con columnas desalineadas, encabezados vacíos, duplicados o ambiguos, o comillas inválidas. Los demás archivos del lote se importan normalmente.
- Las filas idénticas se omiten, incluso al reimportar. La comparación conserva diferencias de respuesta, variante y campos adicionales (por ejemplo, identificadores). No fusiona preguntas similares.
- El panel muestra cantidades por categoría, incluida «Sin categoría», y permite filtrar por pendientes, revisadas e incompletas.
- «Completa» mide presencia de campos; «Revisada» es una marca manual independiente. No representa un acierto de IA. Toda nueva fila comienza pendiente.
- La exportación conserva campos normalizados, procedencia, línea física y estado de revisión. Las columnas originales se guardan con prefijo `original:`. Al reimportar esta exportación se recuperan los datos y estados sin acumular prefijos.
- Exportar incluye todo el banco, aunque haya filtros activos. No se adapta automáticamente a un esquema de Supabase: deben seleccionarse/mapearse las columnas de la tabla de destino.
- Se conserva el contenido literal de las celdas. Para abrir archivos no confiables en Excel, importarlos como texto para evitar que Excel interprete fórmulas.
- Datos y revisiones siguen en memoria; exportar antes de recargar. El backend y los evaluadores permanecen sin cambios.

Validación automatizada desde la raíz: `node --test training-lab/*.test.cjs`.
Los bancos CSV reales no estaban disponibles durante esta fase; su validación sigue pendiente. No se probaron llamadas a Gemini ni despliegues.

## Evaluación local desde el panel

Desde la raíz ejecutar `node server/index.js` y abrir `http://127.0.0.1:8787/training-lab/`. El servidor conserva su escucha en loopback y admite el origen local exacto además de `ALLOWED_ORIGIN`. La vista estática independiente sigue permitiendo importar y revisar, pero no evaluar.

El botón toma las primeras diez preguntas del filtro actual, sin historial entre preguntas, reutilizando `/api/chat` y las mismas expectativas del evaluador CSV. Usa pausa de 5,5 segundos, espera máxima de 55 segundos por pregunta, cancelación y exportación JSON de resultados. No introduce un segundo prompt ni un calificador por palabras clave. Los resultados quedan pendientes de revisión, y muestran proveedor, modelo, respuesta de respaldo si corresponde, errores y tiempos. Las respuestas deterministas se identifican como `reglas`.

Gemini requiere `GEMINI_API_KEY` en el entorno del **servidor local**, o en el futuro servidor Preview. La variable de Vercel no se transfiere automáticamente al PC. No introducir claves en el panel ni en archivos del repositorio. Para una prueba exclusiva de Gemini en el servidor, configurar `AI_PROVIDER=gemini` y `GEMINI_FALLBACK=false`; las reglas deterministas continúan respondiendo antes del modelo. Sin Gemini configurado se conserva el proveedor Ollama del backend existente.

La carta sigue siendo demostrativa, y evaluar no entrena ni modifica los modelos. No hay persistencia ni autenticación para publicar esta herramienta. No se creó un despliegue ni se verificó una llamada real a Gemini durante la implementación.

## Preview Vercel para validar Gemini

Las funciones `api/chat.mjs` y `api/gemini-check.mjs` reutilizan el backend y responden únicamente cuando `VERCEL_ENV=preview`; en producción devuelven 404. El backend mantiene su ejecución local directa. Las funciones reciben tanto cuerpos JSON procesados por Vercel como solicitudes Node locales.

Preview requiere `GEMINI_API_KEY` secreta para la rama `feature/menuia-training-lab-v1`; Gemini no usa respaldo Ollama en ese entorno. El botón **Validar conexión Gemini** envía una pregunta directa al modelo, evitando las respuestas deterministas. Una respuesta marcada `provider=gemini` confirma una llamada real; no demuestra precisión semántica. El servidor admite los orígenes HTTPS exactos declarados por Vercel para este Preview.

Mantener Vercel Authentication habilitada para Preview antes de publicar. Los límites en memoria son por instancia, no una protección global contra abuso. No subir CSV reales, reportes ni archivos `.env`; `.vercelignore` los excluye del despliegue.
