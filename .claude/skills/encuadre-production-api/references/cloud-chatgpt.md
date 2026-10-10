# Conector MCP remoto (ChatGPT y Claude)

Servidor MCP remoto (Streamable HTTP, sin estado):

```text
https://prod.encuadre.muxp.art/mcp
```

Metadatos OAuth: `https://prod.encuadre.muxp.art/.well-known/oauth-protected-resource/mcp` y `/.well-known/oauth-authorization-server`.

El cliente (ChatGPT o Claude) inicia OAuth con PKCE y registro dinámico. El usuario entra a `prod.encuadre.muxp.art`, inicia sesión con Clerk y aprueba. El token es opaco, dura 30 minutos y no hay refresh token: al vencer hay que reconectar.

## Claude

- **Claude Code**: `claude mcp add --transport http encuadre https://prod.encuadre.muxp.art/mcp` (o usar el `.mcp.json` del proyecto) y luego `/mcp` → Authenticate.
- **Claude.ai / Desktop / móvil**: Configuración → Conectores → Añadir conector personalizado → URL del servidor anterior.

## Herramientas

Lecturas: `list_projects`, `get_project`, `get_project_context`, `list_contacts`, `get_contact`, `list_project_people`.
Escrituras (cada una requiere aprobación Clerk): `create_project`, `update_project`, `delete_project`, `create_contact`, `update_contact`, `delete_contact`, `add_person_to_project`, `update_project_person`, `remove_person_from_project`, `upload_contact_photo`.

En toda escritura la primera llamada devuelve `authUrl` y `approvalRequestId`. Muestra el enlace, espera la aprobación y repite la misma herramienta con el mismo payload y ese `approvalRequestId`. Ver `mcp-tools.md`.
