# MenuIA · Backend local Ollama (Windows)

Requisitos: Node.js 20+ y Ollama con Qwen3 4B instalado. No publiques Ollama (puerto 11434) directamente.

1. Abrí PowerShell en la carpeta `server`.
2. Comprobá `ollama list`. Si el modelo no aparece: `ollama pull qwen3:4b`.
3. Ejecutá `npm start`. El backend escucha SOLO en `127.0.0.1:8787`.
4. En otra terminal, comprobá `curl.exe http://127.0.0.1:8787/health`.
5. Instalá cloudflared desde https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
6. Para prueba temporal: `cloudflared tunnel --url http://127.0.0.1:8787`. Copiá la URL HTTPS `https://...trycloudflare.com`. El túnel temporal cambia al reiniciar y no tiene garantía de disponibilidad.
7. Abrí la landing y en la pestaña Asistente IA pulsá **Configurar IA local**. Pegá esa URL HTTPS, sin barra final, y guardá. La URL queda guardada únicamente en el navegador (localStorage). La landing conserva el modo demo si el servidor no está disponible.

Para una implementación comercial usá un túnel nombrado de Cloudflare con dominio propio, protección contra abuso, controles de acceso, registro de uso y supervisión. Este ejemplo es un piloto, no producción. El backend restringe el origen web, pero CORS **no es autenticación**; el túnel público puede recibir tráfico directo. No lo mantengas expuesto indefinidamente sin autenticación y límites adicionales.

Si `ollama list` muestra otro nombre, ejecutá `$env:OLLAMA_MODEL="nombre-exacto"` antes de `npm start`.
