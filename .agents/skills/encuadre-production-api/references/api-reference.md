# Encuadre Production API reference

Base URL: `https://prod.encuadre.muxp.art/api`

All successful responses use `{ "data": ... }`. Errors use `{ "error": "CODE", "message": "..." }` and may include `authUrl`, `expiresAt`, or `issues`.

## Connection and headers

There is no API key. Start every new agent/chat connection with:

```http
POST /auth/connect
Content-Type: application/json

{ "clientName": "Optional agent name" }
```

The response contains `requestId`, `exchangeSecret`, `authUrl`, `expiresAt`, and `pollAfterSeconds`. Show only `authUrl` to the user. Once the user approves it through Clerk, exchange it once:

```http
POST /auth/connect/:requestId/exchange
X-Connection-Secret: <exchangeSecret>
```

The response contains a 30-minute `sessionToken`. Send it on every data endpoint:

```http
X-Encuadre-Session: <temporary API session token>
Content-Type: application/json
```

`exchangeSecret` and `sessionToken` are transient tool state, never user-provided settings or chat output. Direct Clerk bearer tokens are rejected for data access and are used only by the production web approval page.

Sensitive retry:

```http
X-Authorization-Grant: <grantId>
```

## Projects

| Tool | HTTP | Endpoint | Notes |
|---|---|---|---|
| `list_projects` | GET | `/projects?search=<text>&includeArchived=true` | Maximum 200; archived excluded by default |
| `get_project` | GET | `/projects/:id` | Single project |
| `get_project_context` | GET | `/projects/:id/context` | Project, cast, crew, files, documents, calendar, tasks |
| `create_project` | POST | `/projects` | Validated project fields |
| `update_project` | PATCH | `/projects/:id` | Requires recent grant |

Create/update project fields:

```json
{
  "name": "string",
  "description": "string",
  "type": "film | tv | commercial | music_video | photography | corporate | documentary | other",
  "status": "draft | pre_production | production | post_production | completed | archived",
  "startDate": "ISO datetime",
  "endDate": "ISO datetime",
  "coverImage": "URL",
  "responsibleId": "string",
  "templateId": "string",
  "tags": ["string"],
  "metadata": {},
  "driveFolderId": "string"
}
```

## Contacts

| Tool | HTTP | Endpoint | Notes |
|---|---|---|---|
| `list_contacts` / `search_contacts` | GET | `/contacts?search=<text>` | Maximum 200; soft-deleted contacts excluded |
| `get_contact` | GET | `/contacts/:id` | Single contact |
| `create_contact` | POST | `/contacts` | Uses the existing `contacts` model |
| `update_contact` | PATCH | `/contacts/:id` | Requires recent grant |
| `upload_contact_photo` | POST | `/contacts/:id/photo` | Requires recent grant; max 5 MB |

Contact fields follow the existing portal model:

```json
{
  "name": "string",
  "category": "actor | crew",
  "role": "string",
  "department": "string",
  "email": "string email",
  "phone": "string",
  "whatsapp": "string",
  "instagram": "string",
  "avatarUrl": "URL",
  "agency": "string",
  "notes": "string",
  "portfolioUrl": "URL",
  "ratePerDay": "string",
  "availability": "available | busy | favorite | inactive",
  "tags": ["string"],
  "actorDetails": {}
}
```

Photo upload body:

```json
{
  "contentBase64": "base64 without a data URL prefix",
  "mimeType": "image/jpeg | image/png | image/webp"
}
```

The response contains a signed URL valid for approximately 15 minutes. Do not persist the signed URL as a permanent credential.

## People attached to projects

The current model intentionally reuses the existing subcollections:

- Crew: `projects/{projectId}/members`
- Cast: `projects/{projectId}/talentProfiles`

| Tool | HTTP | Endpoint |
|---|---|---|
| `list_project_people` | GET | `/projects/:id/people` |
| `add_person_to_project` | POST | `/projects/:id/people` |
| `update_project_person` | PATCH | `/projects/:projectId/people/:personId` |
| `remove_person_from_project` | DELETE | `/projects/:projectId/people/:personId?type=crew` or `type=cast` |

Add body:

```json
{ "type": "crew", "person": { "name": "...", "role": "...", "department": "..." } }
```

Use `type: "cast"` for talent profiles. Add, update, and remove person operations require recent user authorization.

## Deletes

| Tool | HTTP | Endpoint |
|---|---|---|
| `delete_project` | DELETE | `/projects/:id` |
| `delete_contact` | DELETE | `/contacts/:id` |

Both are soft deletes. They require `X-Authorization-Grant` and never permanently remove the document. The API records `deleted`, `deletedAt`, and `deletedBy` and creates an audit log.

## Not currently exposed

There is no generic arbitrary file upload endpoint, generic file deletion endpoint, or direct Firestore query endpoint in the current API. Do not simulate one by calling Firebase directly.
