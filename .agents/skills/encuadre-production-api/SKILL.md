---
name: encuadre-production-api
description: Use the Encuadre production portal API to safely read and modify production projects, contacts, people, files, and audit-relevant data through the deployed REST API.
---

# Encuadre Production API

Use this skill whenever an agent needs to interact with the Encuadre production portal rather than Firebase directly.

## Non-negotiable boundaries

- Base URL: `https://prod.encuadre.muxp.art/api`.
- Never connect an agent directly to Firestore, Storage, Clerk Admin APIs, or Firebase Admin SDK. Use the REST API only.
- Never put `CLERK_SECRET_KEY`, connection exchange secrets, temporary sessions, or grants in frontend code, prompts, logs, commits, or chat messages.
- Treat contact data, project data, notes, phone numbers, emails, and media references as internal production information.
- Do not invent Firestore paths, fields, roles, or endpoints. Use only the contract in `references/api-reference.md`.
- Do not send arbitrary Firestore documents. Every write must use an explicit endpoint and validated fields.
- Ask for user confirmation before a consequential write when the user has not clearly requested it. A `DELETE` is always soft delete, but still requires recent user authentication.

## Connection flow

There is no API key or environment secret for agents. Before every first API call in a chat, start a connection with `POST /auth/connect` and retain its `requestId` and `exchangeSecret` only in the tool state. Show the returned `authUrl` to the user and wait for their explicit approval through Clerk.

After the user confirms, call `POST /auth/connect/:requestId/exchange` with `X-Connection-Secret`. It returns a temporary `X-Encuadre-Session` that expires server-side after 30 minutes. Use it for all data endpoints. Do not print the exchange secret, session token, or grant in a chat response.

If `exchange` returns `CONNECTION_PENDING`, wait at least the returned two-second interval before trying again. If it returns `CONNECTION_EXPIRED`, `CONNECTION_UNAVAILABLE`, or an API call returns `CONNECTION_REQUIRED`, start a new connection and show its new link. Clerk bearer tokens are accepted only by the web approval routes; never send one from an agent to a data endpoint.

Updates, person associations, photo uploads, and deletes also require a recent authorization grant. Never ask the user to paste any secret into a browser.

## Cloud and ChatGPT mode

This skill is cloud-first. Do not use PowerShell, Firebase CLI, local files, environment variables, or a user-provided API key to access the API.

For a normal ChatGPT cloud conversation, use the remote MCP connector at `https://prod.encuadre.muxp.art/mcp`. It uses OAuth authorization code flow with PKCE. ChatGPT owns the OAuth state and bearer token: the user is redirected to Encuadre, signs in with Clerk, and explicitly approves access. The MCP access token is opaque, server-side validated, and expires after 30 minutes; do not request or create refresh access.

The MCP connector exposes reads and all supported production writes: projects, contacts, project people, contact photos, and soft deletes. Every MCP write has its own Clerk approval link and is bound to the exact operation and validated payload. The agent must show that link, wait, and retry the same tool with the returned `approvalRequestId`.

Read `references/cloud-chatgpt.md` before configuring the connector and `references/mcp-tools.md` before making an MCP write. Never ask the user to paste an OAuth code, PKCE verifier, exchange secret, session token, or approval code into chat.

## Standard tool contract

Expose or emulate these agent tools using HTTP calls described in the reference:

- `list_projects(search?, includeArchived?)`
- `get_project(id)`
- `get_project_context(id)`
- `search_contacts(query)`
- `list_contacts(search?)`
- `get_contact(id)`
- `create_project(data)`
- `update_project(id, data)`
- `create_contact(data)`
- `update_contact(id, data)`
- `list_project_people(projectId)`
- `add_person_to_project(projectId, type, person)`
- `update_project_person(projectId, personId, type, updates)`
- `remove_person_from_project(projectId, personId, type)`
- `upload_contact_photo(contactId, contentBase64, mimeType)`
- `delete_project(id)`
- `delete_contact(id)`

Read `references/api-reference.md` before using a tool that writes, deletes, uploads, or handles a new resource type. Read `references/security-and-workflow.md` whenever a request returns `AUTH_REQUIRED`, `INVALID_GRANT`, or involves a destructive/sensitive action.
Read `references/cloud-chatgpt.md` before configuring or using this skill in a ChatGPT cloud conversation.

## Required response behavior

- Preserve the API's structured error fields: `error`, `message`, and any `authUrl`/`expiresAt`.
- If the API returns `CONNECTION_REQUIRED`, start a connection and show the returned `authUrl`; do not attempt an unauthenticated retry.
- If the API returns `AUTH_REQUIRED`, show the user the returned `authUrl`, explain that it is a short-lived Clerk reauthentication link, and wait for the user to complete it before retrying the exact same operation.
- Retry only with the returned `grantId`, never with a guessed, reused, or client-invented grant.
- Report the resulting resource ID and operation outcome, but do not echo credentials or complete tokens.
- If a requested operation is not in the contract, state that it is not currently exposed by the API instead of falling back to direct Firebase access.
