# Security and operating workflow

## Read flow

1. Start `POST /api/auth/connect` if no current session exists.
2. Present its `authUrl` to the user and wait for explicit approval through Clerk.
3. Exchange the approved request exactly once, then send `X-Encuadre-Session`.
4. Select the narrowest endpoint for the task and validate the returned resource.
5. Do not expose unnecessary PII in the agent's final response.

## Sensitive write flow

Updates, project-person changes, photo uploads, and deletes require a grant. When called without one, the API returns HTTP `428`:

```json
{
  "error": "AUTH_REQUIRED",
  "message": "Recent user authentication is required.",
  "authUrl": "https://prod.encuadre.muxp.art/auth/agent?request=...",
  "expiresAt": "..."
}
```

1. Present `authUrl` to the internal Encuadre user.
2. The user authenticates through the existing Clerk login.
3. The web page calls `POST /api/auth/agent/approve` with the Clerk session token.
4. Receive a random `grantId` with an expiry of approximately 30 minutes.
5. Retry the exact original HTTP request with `X-Authorization-Grant: <grantId>`.
6. Never alter the resource ID, method, or intended action during retry.

The server binds a grant to the resource and method. A grant for `PATCH /contacts/A` cannot authorize `DELETE /contacts/A` or any operation on another resource.

## Connection flow

1. `POST /api/auth/connect` creates a random request ID and a separate exchange secret. The request expires in 10 minutes.
2. The agent shows the returned `authUrl`; only an internal Encuadre user can approve it through Clerk.
3. The agent keeps the exchange secret outside the URL and calls `POST /api/auth/connect/:requestId/exchange` after approval.
4. The server consumes the request once and returns a random API session valid for 30 minutes.
5. After expiry, `CONNECTION_REQUIRED` means the agent must create and approve a new connection.

The 30-minute expiry applies at the API boundary. The Clerk browser-login duration is configured separately in the Clerk Dashboard and is not exposed as direct API access.

## Permission model

The API exposes a conservative baseline to agents and authenticated production users:

- Read: projects, contacts, people, project context, files included in context.
- Create: projects, contacts.
- Sensitive update: projects, contacts, project people.
- Upload: contact photo, with recent grant and a 5 MB limit.
- Delete: projects, contacts, and person associations only as soft delete, with recent grant.

The server uses Firebase Admin SDK only inside the Function. The agent never receives Firebase Admin credentials.

## Error handling

- `400 VALIDATION_ERROR`: fix the request body; do not retry unchanged.
- `401 CONNECTION_REQUIRED`: no active approved connection; start the connection flow and show the new link.
- `401 UNAUTHORIZED`: an exchange secret is missing or invalid; do not guess it.
- `409 CONNECTION_PENDING`: wait for the user to approve the link, then retry exchange with the same request.
- `400 CONNECTION_EXPIRED` or `CONNECTION_UNAVAILABLE`: start a new connection.
- `401 INVALID_GRANT`: request a new grant; do not reuse or alter the old one.
- `403 FORBIDDEN`: the credential lacks the endpoint permission.
- `404 NOT_FOUND`: verify the ID and current project state.
- `413 FILE_TOO_LARGE`: reduce the image below 5 MB.
- `428 AUTH_REQUIRED`: follow the reauthentication flow above.
- `429 RATE_LIMITED`: back off and retry later.
- `503 API_NOT_CONFIGURED` or `AUTH_NOT_CONFIGURED`: stop and report an operator configuration issue.

## Audit expectations

Mutations create `audit_logs` entries with actor, authenticated user when available, action, resource ID, and scrubbed changes. Never add passwords, complete tokens, API keys, or Clerk secrets to request bodies, notes, or generated summaries.
