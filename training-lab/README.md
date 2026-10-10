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
