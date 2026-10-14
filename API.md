# Encuadre Production API

Base URL: `https://prod.encuadre.muxp.art/api`

La API se ejecuta en Firebase Functions y usa Firebase Admin SDK solamente en el servidor. Reutiliza `projects`, `contacts` y sus subcolecciones existentes. No existe una API key permanente ni acceso directo de agentes a Firebase.

## Conectar un agente

1. El agente llama `POST /api/auth/connect` sin credenciales. Puede enviar `{ "clientName": "Nombre opcional" }`.
2. Recibe `authUrl`, `requestId`, `exchangeSecret` y una expiración de 10 minutos.
3. Muestra solamente `authUrl` al usuario. El usuario inicia sesión en Clerk y confirma la conexión en Producción de Encuadre.
4. El agente canjea una vez la solicitud con `POST /api/auth/connect/:requestId/exchange` y `X-Connection-Secret`.
5. Recibe una sesión temporal que debe enviar como `X-Encuadre-Session` en los endpoints de datos. Vence en 30 minutos.

`exchangeSecret`, `sessionToken` y grants son secretos efímeros: no se ponen en variables de entorno, frontend, links, logs, commits ni respuestas de chat. El canje es de una sola vez. Una conexión no aprobada no entrega datos.

## Endpoints

Todos los endpoints de datos requieren `X-Encuadre-Session`.

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/connect` | Inicia una conexión por enlace |
| POST | `/api/auth/connect/:id/exchange` | Canjea una conexión aprobada una sola vez |
| GET | `/api/projects?search=` | Lista o busca proyectos |
| GET | `/api/projects/:id` | Obtiene un proyecto |
| GET | `/api/projects/:id/context` | Obtiene contexto completo de producción |
| GET | `/api/projects/:id/people` | Lista crew y cast |
| POST | `/api/projects` | Crea proyecto |
| PATCH | `/api/projects/:id` | Actualiza proyecto, requiere grant |
| POST | `/api/projects/:id/people` | Añade persona, requiere grant |
| PATCH | `/api/projects/:projectId/people/:personId` | Actualiza persona, requiere grant |
| DELETE | `/api/projects/:projectId/people/:personId?type=crew\|cast` | Soft delete, requiere grant |
| GET | `/api/contacts?search=` | Lista o busca contactos |
| GET | `/api/contacts/:id` | Obtiene contacto |
| POST | `/api/contacts` | Crea contacto |
| PATCH | `/api/contacts/:id` | Actualiza contacto, requiere grant |
| POST | `/api/contacts/:id/photo` | Sube foto, requiere grant, máximo 5 MB |
| DELETE | `/api/projects/:id` | Soft delete, requiere grant |
| DELETE | `/api/contacts/:id` | Soft delete, requiere grant |

## Encuadre Script (app de escritorio)

La app de escritorio usa el mismo flujo de conexión por enlace, enviando `{ "clientName": "Encuadre Script", "clientType": "desktop" }` en `POST /api/auth/connect`. La sesión resultante:

- dura 30 días y se puede cerrar con `DELETE /api/auth/session`;
- solo tiene los permisos `projects:read`, `scripts:read` y `scripts:write` (no puede leer contactos ni modificar o borrar proyectos);
- publica versiones de guion sin aprobación adicional por operación, porque cada versión es aditiva y queda en `audit_logs`.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/auth/connect/:id` | Datos públicos de la solicitud (cliente, tipo, estado) |
| GET | `/api/auth/session` | Usuario, permisos y expiración de la sesión actual |
| DELETE | `/api/auth/session` | Revoca la sesión actual |
| GET | `/api/projects/:id/scripts` | Lista los guiones (documentos tipo `script`) |
| POST | `/api/projects/:id/scripts` | Crea un guion `{ name, description?, tags? }` |
| GET | `/api/projects/:id/scripts/:documentId/versions` | Historial de versiones |
| POST | `/api/projects/:id/scripts/:documentId/versions` | Paso 1: reserva una versión y devuelve URLs de subida |
| POST | `/api/projects/:id/scripts/:documentId/versions/:uploadId/commit` | Paso 2: valida los archivos y registra la versión |
| GET | `/api/projects/:id/scripts/:documentId/versions/:versionId/download?file=pdf\|source` | Enlace de descarga temporal (15 min) |

### Publicar una versión

Cada versión lleva siempre dos archivos: el PDF (máx. 50 MB) y el proyecto `.encdre` (máx. 200 MB).

1. `POST .../versions` con `{ "versionNumber"?: "2.0", "tag": "draft|review|approved|final", "notes": "", "pdf": { "fileName": "guion.pdf", "size": 123 }, "source": { "fileName": "guion.encdre", "size": 456 }, "appVersion"?: "0.8.4" }`.
2. La respuesta trae `uploadId` y, para `pdf` y `source`, `{ uploadUrl, method: "PUT", headers }`. Hay que subir cada archivo con `PUT` enviando exactamente esos headers. Las URLs vencen en 15 minutos.
3. `POST .../versions/:uploadId/commit` crea la versión. Si no se envió `versionNumber` se asigna `N.0` según el número de versiones existentes.

La versión guarda `fileUrl` (PDF, compatible con el portal) y además `sourceFileUrl`, `sourceFileName`, `storagePath` y `sourceStoragePath`.

## Acciones sensibles

Actualizaciones, asociaciones de personas, fotos y eliminaciones requieren una aprobación adicional por operación. La API devuelve `428 AUTH_REQUIRED` con un `authUrl`. El usuario debe abrirlo y confirmar con Clerk; el agente reintenta exactamente la misma operación con el `grantId` emitido. El grant vence en 30 minutos y se liga al usuario que abrió la conexión, recurso y método.

## Seguridad y auditoría

- Las solicitudes y sesiones se guardan en Firestore con hashes de los secretos; nunca se guardan tokens completos.
- Las solicitudes de conexión duran 10 minutos; las sesiones de API duran 30 minutos.
- Cada canje se consume una sola vez.
- Las mutaciones crean registros en `audit_logs` sin secretos.
- Las listas están limitadas a 200 registros, fotos a 5 MB y hay rate limiting básico.
