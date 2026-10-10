# Seguridad y flujo operativo

## Lecturas

1. Inicia `POST /api/auth/connect` si el chat no tiene una sesión activa.
2. Muestra el enlace devuelto y espera la aprobación explícita del usuario mediante Clerk.
3. Canjea la solicitud una sola vez y usa `X-Encuadre-Session`.
4. Selecciona el endpoint más específico y verifica el recurso devuelto.
5. No incluyas PII innecesaria en la respuesta final.

## Escrituras sensibles

Actualizaciones, cambios de personas, fotos y eliminaciones pueden responder HTTP `428`:

```json
{
  "error": "AUTH_REQUIRED",
  "message": "Recent user authentication is required.",
  "authUrl": "https://prod.encuadre.muxp.art/auth/agent?request=...",
  "expiresAt": "..."
}
```

Muestra el `authUrl`, espera la reautenticación Clerk, recibe el `grantId` y repite la solicitud HTTP original con `X-Authorization-Grant`. El servidor vincula el grant al método y recurso; un grant para `PATCH /contacts/A` no autoriza `DELETE /contacts/A` ni otro recurso.

## Errores

- `401 CONNECTION_REQUIRED`: inicia una conexión nueva y muestra su enlace.
- `409 CONNECTION_PENDING`: espera aprobación y vuelve a canjear después de dos segundos.
- `400 CONNECTION_EXPIRED` / `CONNECTION_UNAVAILABLE`: inicia una conexión nueva.
- `400 VALIDATION_ERROR`: corrige el cuerpo; no repitas sin cambios.
- `401 UNAUTHORIZED`: credencial ausente o inválida; no adivines credenciales.
- `401 INVALID_GRANT`: solicita un grant nuevo.
- `403 FORBIDDEN`: falta permiso.
- `404 NOT_FOUND`: verifica ID y estado.
- `413 FILE_TOO_LARGE`: reduce la imagen bajo 5 MB.
- `429 RATE_LIMITED`: reintenta después con backoff.
- `503 API_NOT_CONFIGURED` / `AUTH_NOT_CONFIGURED`: reporta configuración operativa.

Las mutaciones generan registros de auditoría con actor, usuario autenticado cuando corresponde, acción, recurso y cambios saneados. Nunca agregues contraseñas, tokens completos, API keys o secretos Clerk a cuerpos, notas o resúmenes.
