<img width="261" height="40" alt="ENCDRE API" src="https://github.com/user-attachments/assets/4953bb18-b04e-4c37-956a-2860b5ab778c" />
</svg>

# Skill API - ENCDRE Prod. Portal

Skill para agentes que necesitan consultar o modificar información del Portal de Producción de Encuadre mediante la API REST desplegada en Firebase Functions.

## Instalación

Instala la skill con `npx skills`:

```bash
npx skills add https://github.com/martinuxp/encdreAPI-Skill.git
```

Para instalarla sin interacción:

```bash
npx skills add https://github.com/martinuxp/encdreAPI-Skill.git -y
```

Después de instalarla, invócala con:

```text
$encuadre-production-api
```

## API

Base URL:

```text
https://prod.encuadre.muxp.art/api
```

La skill define herramientas para trabajar con:

- Proyectos y contexto de producción.
- Contactos.
- Personas asociadas a proyectos, elenco y crew.
- Roles y departamentos.
- Fotografías de contactos.
- Soft delete y auditoría.

## Autenticación

No hay API key ni una variable de entorno que configurar. El agente inicia una conexión y muestra el enlace temporal que devuelve la API. El usuario inicia sesión y aprueba mediante Clerk. Después, el agente canjea la solicitud por una sesión temporal de API:

```http
X-Encuadre-Session: <TEMPORARY_API_SESSION_TOKEN>
```

La sesión de API vence en el servidor después de 30 minutos. Los valores temporales de canje y sesión no se incluyen en frontend, prompts, logs, commits ni respuestas del agente.

## ChatGPT en nube

No requiere variables locales, terminal ni API key. Configura el conector MCP remoto con esta URL:

```text
https://prod.encuadre.muxp.art/mcp
```

ChatGPT abre el flujo OAuth, envía al usuario al portal de Encuadre para iniciar sesión en Clerk y obtiene un token temporal. No hay secretos que copiar al chat. El token vence a los 30 minutos y requiere conectar nuevamente. El connector expone consultas, creación y edición de proyectos, contactos, personas asociadas y fotos; las eliminaciones son soft delete.

Cada escritura requiere una aprobación Clerk adicional. La herramienta devuelve un enlace temporal y un `approvalRequestId`; el agente muestra el enlace, espera la aprobación y reintenta exactamente la misma herramienta con ese identificador. Consulta [mcp-tools.md](./references/mcp-tools.md) para el contrato completo.

## Operaciones sensibles

Las actualizaciones, cambios de personas, subidas de fotos y eliminaciones requieren un authorization grant emitido después de una reautenticación Clerk.

El grant:

- Se solicita mediante `AUTH_REQUIRED`.
- Se aprueba en `/auth/agent`.
- Dura aproximadamente 30 minutos.
- Está ligado al método y recurso solicitado.
- No permite reutilizarlo para otra operación.

Las eliminaciones son soft delete. No se elimina permanentemente el documento de Firestore.

## Herramientas cubiertas

```text
list_projects
get_project
get_project_context
list_contacts
search_contacts
get_contact
create_project
update_project
create_contact
update_contact
list_project_people
add_person_to_project
update_project_person
remove_person_from_project
upload_contact_photo
delete_project
delete_contact
```

## Referencias

- [SKILL.md](./SKILL.md): instrucciones de uso para el agente.
- [api-reference.md](./references/api-reference.md): endpoints, campos y cuerpos de request.
- [security-and-workflow.md](./references/security-and-workflow.md): autenticación, permisos y manejo de errores.

La skill no permite acceso directo a Firestore, Firebase Storage ni Firebase Admin SDK. Todas las operaciones deben pasar por la API definida.
