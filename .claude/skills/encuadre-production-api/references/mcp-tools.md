# Herramientas MCP

Servidor: `https://prod.encuadre.muxp.art/mcp`.

El conector usa OAuth con Clerk. La sesión MCP dura 30 minutos. No hay API key, token manual ni variables de entorno.

## Lecturas

- `list_projects(search?, includeArchived?)`: lista proyectos; `search` busca texto y `includeArchived` incluye archivados.
- `get_project(id)`: devuelve un proyecto.
- `get_project_context(id)`: devuelve proyecto, cast, crew, archivos, documentos, calendario y tareas.
- `list_project_people(projectId)`: devuelve `crew` y `cast` del proyecto.
- `list_contacts(search?)`: lista contactos activos; `search` busca texto.
- `get_contact(id)`: devuelve un contacto.

## Escrituras y autorización

Todas estas herramientas requieren una autorización reciente por operación, incluso crear. La primera llamada devuelve:

```json
{
  "error": "AUTH_REQUIRED",
  "approvalRequestId": "...",
  "authUrl": "https://prod.encuadre.muxp.art/auth/mcp-operation?request=...",
  "expiresAt": "..."
}
```

El agente debe mostrar solo `authUrl`, esperar la aprobación Clerk y repetir la misma herramienta con los mismos datos más `approvalRequestId`. La aprobación dura 30 minutos y queda ligada al usuario, la operación, el recurso y el contenido validado. No se deben mostrar códigos, tokens ni secretos.

- `create_project(data, approvalRequestId?)`
- `update_project(id, data, approvalRequestId?)`
- `delete_project(id, approvalRequestId?)`: soft delete.
- `create_contact(data, approvalRequestId?)`
- `update_contact(id, data, approvalRequestId?)`
- `delete_contact(id, approvalRequestId?)`: soft delete.
- `add_person_to_project(projectId, type, person, approvalRequestId?)`, donde `type` es `crew` o `cast`.
- `update_project_person(projectId, personId, type, data, approvalRequestId?)`
- `remove_person_from_project(projectId, personId, type, approvalRequestId?)`: soft delete.
- `upload_contact_photo(contactId, contentBase64, mimeType, approvalRequestId?)`: `mimeType` puede ser `image/jpeg`, `image/png` o `image/webp`; máximo 5 MB.

Los campos de `data` y `person` se validan con el mismo contrato REST. Consulta `api-reference.md` antes de crear o editar: no se aceptan campos desconocidos.

## Comportamiento del agente

Pide confirmación conversacional antes de iniciar una escritura que el usuario no haya solicitado claramente. Nunca intentes ejecutar un documento arbitrario de Firestore, llames Firebase directo ni conviertas una autorización en otra acción. Para una eliminación, explica que es soft delete antes de solicitar la aprobación Clerk.
