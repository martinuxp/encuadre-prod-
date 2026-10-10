# Encuadre Production API Skill

Skill para agentes que necesitan consultar o modificar información del Portal de Producción de Encuadre mediante la API REST desplegada en Firebase Functions.

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

No hay API key ni variables de entorno para agentes. El agente crea una conexión temporal, muestra el enlace de autorización al usuario y espera su aprobación mediante Clerk. Después canjea la conexión por una sesión temporal de API que vence a los 30 minutos.

Los secretos temporales de canje, sesiones y grants no deben incluirse en frontend, prompts, logs, commits ni respuestas del agente.

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
