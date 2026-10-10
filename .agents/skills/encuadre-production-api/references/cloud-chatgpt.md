# ChatGPT cloud setup

Use the remote MCP server instead of a Custom GPT Action:

```text
https://prod.encuadre.muxp.art/mcp
```

The connector advertises OAuth metadata at:

```text
https://prod.encuadre.muxp.art/.well-known/oauth-protected-resource/mcp
```

ChatGPT starts OAuth automatically. The user is sent to `prod.encuadre.muxp.art`, signs in with their Encuadre Clerk account, and explicitly approves the connection. The callback and PKCE verifier remain inside ChatGPT. Do not copy them into a prompt or ask a user to handle them.

Access covers the published project, contact, person, and file scopes. The opaque bearer token expires after 30 minutes and the server does not issue a refresh token; connecting again is required after expiry.

Current MCP tools:

- `list_projects(search?, includeArchived?)`
- `get_project(id)`
- `get_project_context(id)`
- `list_contacts(search?)`
- `get_contact(id)`
- `create_project(data, approvalRequestId?)`
- `update_project(id, data, approvalRequestId?)`
- `delete_project(id, approvalRequestId?)`
- `create_contact(data, approvalRequestId?)`
- `update_contact(id, data, approvalRequestId?)`
- `delete_contact(id, approvalRequestId?)`
- `list_project_people(projectId)`
- `add_person_to_project(projectId, type, person, approvalRequestId?)`
- `update_project_person(projectId, personId, type, data, approvalRequestId?)`
- `remove_person_from_project(projectId, personId, type, approvalRequestId?)`
- `upload_contact_photo(contactId, contentBase64, mimeType, approvalRequestId?)`

For every write, the first MCP call returns an `authUrl` and `approvalRequestId`. Show the URL, wait for Clerk approval, then retry the same tool with the same payload and that identifier. See `mcp-tools.md` for the required behavior and fields.
