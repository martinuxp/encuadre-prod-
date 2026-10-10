# Uso desde ChatGPT móvil y cloud

El plugin contiene la skill para Codex/ChatGPT. La API no usa una API key: cada chat debe abrir una conexión temporal que el usuario aprueba con Clerk.

## Connector MCP

Para un chat de ChatGPT con soporte de conectores, usa el endpoint MCP remoto:

```text
https://prod.encuadre.muxp.art/mcp
```

El connector usa OAuth con Clerk y PKCE. ChatGPT conserva el estado OAuth y el token temporal; el usuario solo inicia sesión y aprueba la conexión en el portal. El acceso es de solo lectura y vence después de 30 minutos.

## API REST para runtimes especializados

1. Crea un Custom GPT con una Action e importa `mobile/encuadre-api.openapi.yaml`.
2. Configura la autenticación de la Action como **None**. No agregues API key, bearer token ni variable de entorno.
3. El agente llama `POST /auth/connect`, muestra `authUrl` y espera la aprobación en Producción de Encuadre.
4. Canjea la solicitud una vez y conserva la sesión de 30 minutos solo en el estado temporal privado de la herramienta.
5. Envía esa sesión mediante `X-Encuadre-Session` para consultas posteriores.

El esquema expone lecturas y creaciones de proyectos y contactos, además de contexto y personas de un proyecto. No expone actualizaciones, eliminaciones, asociaciones de personas ni fotos porque esas operaciones requieren un `X-Authorization-Grant` ligado a una reautenticación reciente. No se debe pedir al usuario que pegue ese grant en el chat.

Una conversación normal sin Action, app o conector HTTPS no puede llamar la API. Si el runtime de la Action no conserva estado temporal privado o no puede reenviar la cabecera dinámica, no se debe pedir al usuario que pegue secretos: se necesita un conector stateful u OAuth. No configures una API key en ChatGPT.
