# Referencia de la API de Producción de Encuadre

URL base: `https://prod.encuadre.muxp.art/api`.

Las respuestas exitosas usan `{ "data": ... }`. Los errores usan `{ "error": "CODE", "message": "..." }` y pueden incluir `authUrl`, `expiresAt` o `issues`.

## Conexión y cabeceras

Inicia una conexión sin credenciales con `POST /auth/connect`. La respuesta entrega `requestId`, `exchangeSecret`, `authUrl` y una expiración de 10 minutos. El usuario abre y aprueba `authUrl` con Clerk. Canjea una vez con `POST /auth/connect/:requestId/exchange` y `X-Connection-Secret: <exchangeSecret>`.

Las llamadas de datos usan `X-Encuadre-Session: <sessionToken>`. La sesión vence en 30 minutos. El secreto de canje y la sesión son estado efímero de la herramienta, no configuración del usuario. Operación sensible: `X-Authorization-Grant: <grantId>`.

## Proyectos

- `list_projects(search?, includeArchived?)`: `GET /projects?search=<text>&includeArchived=true`; máximo 200, archivados excluidos por defecto.
- `get_project(id)`: `GET /projects/:id`.
- `get_project_context(id)`: `GET /projects/:id/context`; incluye proyecto, elenco, equipo, archivos, documentos, calendario y tareas.
- `create_project(data)`: `POST /projects`.
- `update_project(id, data)`: `PATCH /projects/:id`; requiere grant reciente.

Campos de proyecto: `name`, `description`, `type` (`film|tv|commercial|music_video|photography|corporate|documentary|other`), `status` (`draft|pre_production|production|post_production|completed|archived`), `startDate`, `endDate`, `coverImage`, `responsibleId`, `templateId`, `tags`, `metadata`, `driveFolderId`.

## Contactos

- `list_contacts(search?)` / `search_contacts(query)`: `GET /contacts?search=<text>`; máximo 200, excluye soft delete.
- `get_contact(id)`: `GET /contacts/:id`.
- `create_contact(data)`: `POST /contacts`.
- `update_contact(id, data)`: `PATCH /contacts/:id`; requiere grant reciente.
- `upload_contact_photo(contactId, contentBase64, mimeType)`: `POST /contacts/:id/photo`; requiere grant y máximo 5 MB.

Campos: `name`, `category` (`actor|crew`), `role`, `department`, `email`, `phone`, `whatsapp`, `instagram`, `avatarUrl`, `agency`, `notes`, `portfolioUrl`, `ratePerDay`, `availability` (`available|busy|favorite|inactive`), `tags`, `actorDetails`.

La foto usa `{ "contentBase64": "...", "mimeType": "image/jpeg|image/png|image/webp" }`. La respuesta contiene una URL firmada válida aproximadamente 15 minutos; no la guardes como credencial permanente.

## Personas en proyectos

- `list_project_people(projectId)`: `GET /projects/:id/people`.
- `add_person_to_project(projectId, type, person)`: `POST /projects/:id/people` con `{ "type": "crew|cast", "person": {...} }`.
- `update_project_person(projectId, personId, type, updates)`: `PATCH /projects/:projectId/people/:personId`.
- `remove_person_from_project(projectId, personId, type)`: `DELETE /projects/:projectId/people/:personId?type=crew|cast`.

Los cambios de personas requieren grant reciente. El modelo existente usa `members` para crew y `talentProfiles` para cast.

## Eliminaciones y límites

- `delete_project(id)`: `DELETE /projects/:id`.
- `delete_contact(id)`: `DELETE /contacts/:id`.

Ambas son soft delete, requieren `X-Authorization-Grant` y generan auditoría. No existe endpoint genérico para subir o borrar archivos ni para consultas Firestore arbitrarias.
