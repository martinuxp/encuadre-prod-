---
name: encuadre-production-api
description: Usa la API REST de producción de Encuadre para consultar y modificar proyectos, contactos, personas y fotos con controles de seguridad y auditoría.
---

# Encuadre Production API

Usa esta skill cuando necesites interactuar con el Portal de Producción de Encuadre. Todas las operaciones deben pasar por la API REST; nunca accedas directamente a Firestore, Firebase Storage, Clerk Admin APIs ni Firebase Admin SDK.

## Límites obligatorios

- URL base: `https://prod.encuadre.muxp.art/api`.
- Usa solo endpoints y campos descritos en `references/api-reference.md`.
- Nunca expongas `CLERK_SECRET_KEY`, secretos de canje, sesiones temporales o grants en frontend, prompts, logs, commits o respuestas.
- Trata nombres, correos, teléfonos, notas, datos de proyectos y referencias multimedia como información interna.
- Confirma con el usuario antes de una escritura consecuencial si no la solicitó claramente. Un `DELETE` siempre es soft delete, pero requiere autenticación reciente.

## Conexión

No existe API key ni variable de entorno para agentes. Al iniciar un chat, llama `POST /auth/connect`, conserva `requestId` y `exchangeSecret` únicamente como estado temporal de la herramienta y muestra el `authUrl` al usuario. Espera su aprobación Clerk y canjea una vez la solicitud en `POST /auth/connect/:requestId/exchange` con `X-Connection-Secret`.

El canje devuelve `X-Encuadre-Session`, válido 30 minutos para endpoints de datos. Si expira o recibes `CONNECTION_REQUIRED`, crea una conexión nueva. Nunca muestres el secreto de canje ni la sesión en el chat. Las actualizaciones, asociaciones de personas, subidas de fotos y eliminaciones requieren además `X-Authorization-Grant` emitido tras una reautenticación reciente.

## Operaciones cubiertas

`list_projects`, `get_project`, `get_project_context`, `search_contacts`, `list_contacts`, `get_contact`, `create_project`, `update_project`, `create_contact`, `update_contact`, `list_project_people`, `add_person_to_project`, `update_project_person`, `remove_person_from_project`, `upload_contact_photo`, `delete_project` y `delete_contact`.

Lee `references/api-reference.md` antes de escribir, eliminar, subir fotos o trabajar con un tipo de recurso nuevo. Lee `references/security-and-workflow.md` ante `AUTH_REQUIRED`, `INVALID_GRANT` o cualquier acción sensible/destructiva.

## Flujo de errores sensibles

Conserva los campos `error`, `message`, `authUrl`, `expiresAt` e `issues` cuando existan. Si recibes `AUTH_REQUIRED`, muestra el `authUrl` devuelto, explica que es un enlace breve de reautenticación Clerk y espera a que el usuario lo complete. Reintenta exactamente la misma operación usando únicamente el `grantId` devuelto; nunca inventes, reutilices o cambies un grant.

Si una operación no está en el contrato, indícalo y no la sustituyas por acceso directo a Firebase.
