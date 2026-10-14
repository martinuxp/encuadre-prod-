"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.productionApi = void 0;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const https_1 = require("firebase-functions/v2/https");
const options_1 = require("firebase-functions/v2/options");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
const backend_1 = require("@clerk/backend");
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const zod_1 = require("zod");
const node_crypto_1 = __importDefault(require("node:crypto"));
(0, options_1.setGlobalOptions)({ region: 'us-central1', maxInstances: 10 });
if (!(0, app_1.getApps)().length)
    (0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const bucket = (0, storage_1.getStorage)().bucket();
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: false }));
app.use(express_1.default.json({ limit: '7mb' }));
app.use(express_1.default.urlencoded({ extended: false, limit: '32kb' }));
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const APP_URL = process.env.AGENT_AUTH_BASE_URL || 'https://prod.encuadre.muxp.art';
const GRANT_TTL_MS = 30 * 60 * 1000;
const REQUEST_TTL_MS = 10 * 60 * 1000;
const CONNECTION_REQUEST_TTL_MS = 10 * 60 * 1000;
const API_SESSION_TTL_MS = 30 * 60 * 1000;
// Encuadre Script (app de escritorio): sesión larga, revocable y limitada a proyectos y guiones.
const DESKTOP_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SCRIPT_UPLOAD_TTL_MS = 15 * 60 * 1000;
const SCRIPT_PDF_MAX_BYTES = 50 * 1024 * 1024;
const SCRIPT_SOURCE_MAX_BYTES = 200 * 1024 * 1024;
const MCP_ACCESS_TOKEN_TTL_MS = 30 * 60 * 1000;
const MCP_AUTHORIZATION_CODE_TTL_MS = 60 * 1000;
const MCP_URL = `${APP_URL}/mcp`;
const MCP_SCOPES = [
    'projects:read', 'projects:create', 'projects:update', 'projects:delete',
    'contacts:read', 'contacts:create', 'contacts:update', 'contacts:delete',
    'files:read', 'files:upload', 'files:delete',
];
const rateWindow = new Map();
const error = (res, status, code, message, extra = {}) => res.status(status).json({ error: code, message, ...extra });
function rateLimit(req, res, next) {
    const key = req.header('x-encuadre-session') || req.ip || 'unknown';
    const now = Date.now();
    const current = rateWindow.get(key);
    if (!current || now - current.startedAt >= 60_000)
        rateWindow.set(key, { startedAt: now, count: 1 });
    else if (current.count >= 120)
        return error(res, 429, 'RATE_LIMITED', 'Too many requests. Try again later.');
    else
        current.count += 1;
    return next();
}
const asJson = (value) => {
    if (value instanceof firestore_1.Timestamp)
        return value.toDate().toISOString();
    if (value instanceof Date)
        return value.toISOString();
    if (Array.isArray(value))
        return value.map(asJson);
    if (value && typeof value === 'object')
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, asJson(v)]));
    return value;
};
const docData = (value) => asJson(value || {});
const scrub = (value) => {
    if (Array.isArray(value))
        return value.map(scrub);
    if (value && typeof value === 'object') {
        const result = {};
        for (const [key, item] of Object.entries(value)) {
            if (!/password|token|secret|authorization|apiKey/i.test(key))
                result[key] = scrub(item);
        }
        return result;
    }
    return value;
};
async function clerkActor(req) {
    if (!CLERK_SECRET_KEY)
        return null;
    const authorization = req.header('authorization');
    if (!authorization?.startsWith('Bearer '))
        return null;
    try {
        const payload = await (0, backend_1.verifyToken)(authorization.slice(7), { secretKey: CLERK_SECRET_KEY });
        const permissions = payload.metadata?.apiPermissions || [];
        return { kind: 'clerk', id: String(payload.sub), email: typeof payload.email === 'string' ? payload.email : undefined, permissions };
    }
    catch {
        return null;
    }
}
const apiPermissions = [
    'projects:read', 'contacts:read', 'files:read',
    'projects:create', 'projects:update', 'contacts:create', 'contacts:update', 'files:upload',
    'scripts:read',
];
const desktopPermissions = ['projects:read', 'scripts:read', 'scripts:write'];
function hashOpaqueValue(value) {
    return node_crypto_1.default.createHash('sha256').update(value).digest('hex');
}
function hashesMatch(left, right) {
    const a = Buffer.from(left);
    const b = Buffer.from(right);
    return a.length === b.length && node_crypto_1.default.timingSafeEqual(a, b);
}
async function apiSessionActor(req) {
    const session = req.header('x-encuadre-session');
    if (!session || !/^ecs1_[A-Za-z0-9_-]{43}$/.test(session))
        return null;
    const snap = await db.doc(`apiSessions/${hashOpaqueValue(session)}`).get();
    const data = snap.data();
    const expiresAt = data?.expiresAt;
    if (!snap.exists || !data || data.status !== 'active' || !expiresAt?.toDate || expiresAt.toDate() <= new Date())
        return null;
    const client = data.client === 'desktop' ? 'desktop' : 'agent';
    return { kind: 'connection-session', id: String(data.userId), email: typeof data.email === 'string' ? data.email : undefined, permissions: client === 'desktop' ? desktopPermissions : apiPermissions, client, sessionHash: snap.id, sessionExpiresAt: expiresAt.toDate() };
}
async function authenticate(req, res, next) {
    if (!CLERK_SECRET_KEY)
        return error(res, 503, 'AUTH_NOT_CONFIGURED', 'Clerk server authentication is not configured.');
    const actor = await apiSessionActor(req);
    if (!actor)
        return error(res, 401, 'CONNECTION_REQUIRED', 'Connect this agent with an Encuadre production account before calling the API.', { connectEndpoint: `${APP_URL}/api/auth/connect` });
    req.actor = actor;
    return next();
}
async function requirePermission(req, res, permission) {
    if (!req.actor?.permissions.includes(permission)) {
        error(res, 403, 'FORBIDDEN', `Missing permission: ${permission}.`);
        return false;
    }
    return true;
}
async function audit(req, action, resourceId, changes) {
    await db.collection('audit_logs').add({
        timestamp: firestore_1.FieldValue.serverTimestamp(),
        actor: req.actor?.kind || 'unknown',
        authenticatedUser: req.grant?.approvedBy || (req.actor?.kind === 'clerk' || req.actor?.kind === 'connection-session' ? req.actor.id : null),
        action,
        resourceId,
        changes: scrub(changes || {}),
    });
}
const idSchema = zod_1.z.string().regex(/^[A-Za-z0-9_-]{1,150}$/);
const searchSchema = zod_1.z.string().trim().max(100).optional();
const projectCreate = zod_1.z.object({ name: zod_1.z.string().trim().min(1).max(200), description: zod_1.z.string().max(5000).default(''), type: zod_1.z.string().max(50), status: zod_1.z.string().max(50).optional(), startDate: zod_1.z.string().datetime(), endDate: zod_1.z.string().datetime().optional(), coverImage: zod_1.z.string().url().max(2000).optional(), responsibleId: zod_1.z.string().max(150), templateId: zod_1.z.string().max(150).optional(), tags: zod_1.z.array(zod_1.z.string().max(80)).max(50).default([]), metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}), driveFolderId: zod_1.z.string().max(200).optional() }).strict();
const contactCreate = zod_1.z.object({ name: zod_1.z.string().trim().min(1).max(200), category: zod_1.z.enum(['actor', 'crew']), role: zod_1.z.string().max(150), department: zod_1.z.string().max(150), email: zod_1.z.string().email().max(320).optional(), phone: zod_1.z.string().max(60).optional(), whatsapp: zod_1.z.string().max(60).optional(), instagram: zod_1.z.string().max(200).optional(), avatarUrl: zod_1.z.string().url().max(2000).optional(), agency: zod_1.z.string().max(200).optional(), notes: zod_1.z.string().max(5000).optional(), portfolioUrl: zod_1.z.string().url().max(2000).optional(), ratePerDay: zod_1.z.string().max(100).optional(), availability: zod_1.z.enum(['available', 'busy', 'favorite', 'inactive']).default('available'), tags: zod_1.z.array(zod_1.z.string().max(80)).max(50).default([]), actorDetails: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional() }).strict();
const projectPatch = projectCreate.partial().strict();
const contactPatch = contactCreate.partial().strict();
const crewCreate = zod_1.z.object({ name: zod_1.z.string().trim().min(1).max(200), email: zod_1.z.string().email().max(320).optional(), phone: zod_1.z.string().max(60).optional(), role: zod_1.z.string().max(150), department: zod_1.z.string().max(150), permissions: zod_1.z.array(zod_1.z.unknown()).max(20).default([]), userId: zod_1.z.string().max(150).optional() }).strict();
const castCreate = zod_1.z.object({ name: zod_1.z.string().trim().min(1).max(200), role: zod_1.z.string().max(150), characterName: zod_1.z.string().max(200).optional(), email: zod_1.z.string().email().max(320).optional(), phone: zod_1.z.string().max(60).optional(), agency: zod_1.z.string().max(200).optional(), notes: zod_1.z.string().max(5000).default('') }).strict();
const personPatch = zod_1.z.object({ name: zod_1.z.string().trim().min(1).max(200).optional(), email: zod_1.z.string().email().max(320).optional(), phone: zod_1.z.string().max(60).optional(), role: zod_1.z.string().max(150).optional(), department: zod_1.z.string().max(150).optional(), characterName: zod_1.z.string().max(200).optional(), notes: zod_1.z.string().max(5000).optional(), permissions: zod_1.z.array(zod_1.z.unknown()).max(20).optional() }).strict();
async function readCollection(collection, search) {
    const snap = await db.collection(collection).orderBy('createdAt', 'desc').limit(200).get();
    const rows = snap.docs.map((d) => ({ id: d.id, ...docData(d.data()) }));
    if (!search)
        return rows;
    const needle = search.toLowerCase();
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(needle));
}
function oauthError(res, status, code, description) {
    return res.status(status).json({ error: code, error_description: description });
}
function sha256Base64Url(value) {
    return node_crypto_1.default.createHash('sha256').update(value).digest('base64url');
}
const MCP_CLIENT_HOSTS = new Set(['chatgpt.com', 'chat.openai.com', 'claude.ai', 'claude.com']);
function allowedMcpRedirectUri(value) {
    try {
        const url = new URL(value);
        if (url.username || url.password || url.hash)
            return false;
        if (url.protocol === 'https:') {
            const host = url.hostname.toLowerCase();
            return [...MCP_CLIENT_HOSTS].some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
        }
        // Clientes de escritorio/CLI (Claude Code, Claude Desktop) usan loopback con puerto efimero (RFC 8252).
        return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    }
    catch {
        return false;
    }
}
function oauthScope(value) {
    const requested = typeof value === 'string' ? value.split(' ').filter(Boolean) : [];
    if (requested.some((scope) => !MCP_SCOPES.includes(scope)))
        return null;
    return requested.length ? requested : [...MCP_SCOPES];
}
function normalizedMcpResource(value) {
    if (value === undefined)
        return MCP_URL;
    if (typeof value !== 'string')
        return null;
    try {
        const url = new URL(value);
        const expected = new URL(MCP_URL);
        if (url.origin !== expected.origin || url.pathname.replace(/\/+$/, '') !== expected.pathname || url.search || url.hash)
            return null;
        return MCP_URL;
    }
    catch {
        return null;
    }
}
async function requireMcpOperationApproval(actor, operation, resourceId, payload, approvalRequestId) {
    const fingerprint = hashOpaqueValue(JSON.stringify(asJson(payload)));
    if (approvalRequestId) {
        const snap = await db.doc(`mcpOperationApprovals/${approvalRequestId}`).get();
        const data = snap.data();
        const expiresAt = data?.expiresAt;
        if (snap.exists && data?.status === 'approved' && data.requestedBy === actor.id && data.operation === operation && data.resourceId === resourceId && data.fingerprint === fingerprint && expiresAt?.toDate && expiresAt.toDate() > new Date())
            return { approved: true };
    }
    const requestId = node_crypto_1.default.randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + REQUEST_TTL_MS);
    await db.doc(`mcpOperationApprovals/${requestId}`).set({ requestId, requestedBy: actor.id, operation, resourceId, fingerprint, status: 'pending', createdAt: firestore_1.FieldValue.serverTimestamp(), expiresAt: firestore_1.Timestamp.fromDate(expiresAt) });
    return { approved: false, requestId, authUrl: `${APP_URL}/auth/mcp-operation?request=${encodeURIComponent(requestId)}`, expiresAt: expiresAt.toISOString() };
}
async function mcpActor(req) {
    const authorization = req.header('authorization');
    if (!authorization?.startsWith('Bearer '))
        return null;
    const accessToken = authorization.slice(7);
    if (!/^mcp1_[A-Za-z0-9_-]{43}$/.test(accessToken))
        return null;
    const snap = await db.doc(`mcpAccessTokens/${hashOpaqueValue(accessToken)}`).get();
    const data = snap.data();
    const expiresAt = data?.expiresAt;
    if (!snap.exists || !data || data.status !== 'active' || data.resource !== MCP_URL || !expiresAt?.toDate || expiresAt.toDate() <= new Date())
        return null;
    const scopes = Array.isArray(data.scopes) ? data.scopes.filter((scope) => MCP_SCOPES.includes(scope)) : [];
    // Tokens emitidos antes de publicar los scopes de escritura solo contenían lectura.
    // Conservamos compatibilidad por su breve TTL; cada escritura sigue exigiendo aprobación Clerk.
    const permissions = data.mcpScopeVersion === 2 ? scopes : [...MCP_SCOPES];
    return { kind: 'mcp', id: String(data.userId), permissions: permissions };
}
function mcpUnauthorized(res) {
    res.set('WWW-Authenticate', `Bearer resource_metadata="${APP_URL}/.well-known/oauth-protected-resource/mcp", scope="${MCP_SCOPES.join(' ')}"`);
    return res.status(401).json({ error: 'unauthorized', error_description: 'Connect an Encuadre production account to continue.' });
}
function toolResult(data) {
    return { content: [{ type: 'text', text: JSON.stringify({ data: asJson(data) }) }], structuredContent: { data: asJson(data) } };
}
function createMcpServer(actor) {
    const server = new mcp_js_1.McpServer({ name: 'Encuadre Production', version: '1.0.0' });
    const requireScope = (scope) => {
        if (!actor.permissions.includes(scope))
            throw new Error(`Missing OAuth scope: ${scope}`);
    };
    server.registerTool('list_projects', {
        title: 'List projects', description: 'Lists current Encuadre production projects. Optionally filters by text.',
        inputSchema: { search: zod_1.z.string().trim().max(100).optional(), includeArchived: zod_1.z.boolean().optional() }, annotations: { readOnlyHint: true },
    }, async ({ search, includeArchived }) => {
        requireScope('projects:read');
        const rows = await readCollection('projects', search);
        return toolResult(rows.filter((project) => project.deleted !== true && (includeArchived || project.status !== 'archived')));
    });
    server.registerTool('get_project', {
        title: 'Get project', description: 'Gets one production project by its identifier.',
        inputSchema: { id: idSchema }, annotations: { readOnlyHint: true },
    }, async ({ id }) => {
        requireScope('projects:read');
        const snap = await db.doc(`projects/${id}`).get();
        if (!snap.exists || snap.data()?.deleted === true)
            return { content: [{ type: 'text', text: JSON.stringify({ error: 'NOT_FOUND', message: 'Project not found.' }) }], isError: true };
        return toolResult({ id: snap.id, ...docData(snap.data()) });
    });
    server.registerTool('get_project_context', {
        title: 'Get project context', description: 'Returns a project with its cast, crew, files, documents, calendar, and tasks in one response.',
        inputSchema: { id: idSchema }, annotations: { readOnlyHint: true },
    }, async ({ id }) => {
        requireScope('projects:read');
        const project = await db.doc(`projects/${id}`).get();
        if (!project.exists || project.data()?.deleted === true)
            return { content: [{ type: 'text', text: JSON.stringify({ error: 'NOT_FOUND', message: 'Project not found.' }) }], isError: true };
        const [members, talents, files, documents, calendar, tasks] = await Promise.all([
            db.collection(`projects/${id}/members`).limit(200).get(), db.collection(`projects/${id}/talentProfiles`).limit(200).get(),
            db.collection(`projects/${id}/mediaFiles`).limit(200).get(), db.collection(`projects/${id}/documents`).limit(200).get(),
            db.collection(`projects/${id}/calendar`).limit(200).get(), db.collection(`projects/${id}/tasks`).limit(200).get(),
        ]);
        const rows = (snap) => snap.docs.map((doc) => ({ id: doc.id, ...docData(doc.data()) }));
        return toolResult({ project: { id: project.id, ...docData(project.data()) }, cast: rows(talents), crew: rows(members), files: rows(files), documents: rows(documents), calendar: rows(calendar), tasks: rows(tasks) });
    });
    server.registerTool('list_contacts', {
        title: 'List contacts', description: 'Lists internal production contacts. Optionally filters by text.',
        inputSchema: { search: zod_1.z.string().trim().max(100).optional() }, annotations: { readOnlyHint: true },
    }, async ({ search }) => {
        requireScope('contacts:read');
        const rows = await readCollection('contacts', search);
        return toolResult(rows.filter((contact) => contact.deleted !== true));
    });
    server.registerTool('get_contact', {
        title: 'Get contact', description: 'Gets one internal production contact by its identifier.',
        inputSchema: { id: idSchema }, annotations: { readOnlyHint: true },
    }, async ({ id }) => {
        requireScope('contacts:read');
        const snap = await db.doc(`contacts/${id}`).get();
        if (!snap.exists || snap.data()?.deleted === true)
            return { content: [{ type: 'text', text: JSON.stringify({ error: 'NOT_FOUND', message: 'Contact not found.' }) }], isError: true };
        return toolResult({ id: snap.id, ...docData(snap.data()) });
    });
    const needsApproval = async (operation, resourceId, payload, approvalRequestId) => {
        const approval = await requireMcpOperationApproval(actor, operation, resourceId, payload, approvalRequestId);
        if (approval.approved)
            return null;
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'AUTH_REQUIRED', message: 'Approve this operation with your Encuadre account, then retry the same tool with approvalRequestId.', approvalRequestId: approval.requestId, authUrl: approval.authUrl, expiresAt: approval.expiresAt }) }], isError: true };
    };
    server.registerTool('list_project_people', {
        title: 'List project people', description: 'Lists crew and cast associated with a project.', inputSchema: { projectId: idSchema }, annotations: { readOnlyHint: true },
    }, async ({ projectId }) => {
        requireScope('projects:read');
        const [crew, cast] = await Promise.all([db.collection(`projects/${projectId}/members`).limit(200).get(), db.collection(`projects/${projectId}/talentProfiles`).limit(200).get()]);
        return toolResult({ crew: crew.docs.map((doc) => ({ id: doc.id, ...docData(doc.data()) })), cast: cast.docs.map((doc) => ({ id: doc.id, ...docData(doc.data()) })) });
    });
    server.registerTool('create_project', {
        title: 'Create project', description: 'Creates a production project after Clerk approval.', inputSchema: { data: projectCreate, approvalRequestId: idSchema.optional() }, annotations: { readOnlyHint: false },
    }, async ({ data, approvalRequestId }) => {
        requireScope('projects:create');
        const approval = await needsApproval('project.create', 'projects', data, approvalRequestId);
        if (approval)
            return approval;
        const ref = db.collection('projects').doc();
        const now = firestore_1.FieldValue.serverTimestamp();
        await ref.set({ ...data, startDate: firestore_1.Timestamp.fromDate(new Date(data.startDate)), ...(data.endDate ? { endDate: firestore_1.Timestamp.fromDate(new Date(data.endDate)) } : {}), status: data.status || 'draft', createdAt: now, updatedAt: now, createdBy: actor.id });
        await audit({ actor }, 'mcp.project.create', ref.id, data);
        return toolResult({ id: ref.id });
    });
    server.registerTool('update_project', {
        title: 'Update project', description: 'Updates validated project fields after Clerk approval.', inputSchema: { id: idSchema, data: projectPatch, approvalRequestId: idSchema.optional() }, annotations: { readOnlyHint: false },
    }, async ({ id, data, approvalRequestId }) => {
        requireScope('projects:update');
        const approval = await needsApproval('project.update', id, data, approvalRequestId);
        if (approval)
            return approval;
        const updates = { ...data, updatedAt: firestore_1.FieldValue.serverTimestamp() };
        if (data.startDate)
            updates.startDate = firestore_1.Timestamp.fromDate(new Date(data.startDate));
        if (data.endDate)
            updates.endDate = firestore_1.Timestamp.fromDate(new Date(data.endDate));
        await db.doc(`projects/${id}`).update(updates);
        await audit({ actor }, 'mcp.project.update', id, data);
        return toolResult({ id });
    });
    server.registerTool('delete_project', {
        title: 'Delete project', description: 'Soft-deletes a project after Clerk approval. This action is recoverable but destructive.', inputSchema: { id: idSchema, approvalRequestId: idSchema.optional() }, annotations: { readOnlyHint: false, destructiveHint: true },
    }, async ({ id, approvalRequestId }) => {
        requireScope('projects:delete');
        const approval = await needsApproval('project.delete.soft', id, {}, approvalRequestId);
        if (approval)
            return approval;
        await db.doc(`projects/${id}`).update({ deleted: true, deletedAt: firestore_1.FieldValue.serverTimestamp(), deletedBy: actor.id, status: 'archived', updatedAt: firestore_1.FieldValue.serverTimestamp() });
        await audit({ actor }, 'mcp.project.delete.soft', id);
        return toolResult({ id, deleted: true });
    });
    server.registerTool('create_contact', {
        title: 'Create contact', description: 'Creates a validated actor or crew contact after Clerk approval.', inputSchema: { data: contactCreate, approvalRequestId: idSchema.optional() }, annotations: { readOnlyHint: false },
    }, async ({ data, approvalRequestId }) => {
        requireScope('contacts:create');
        const approval = await needsApproval('contact.create', 'contacts', data, approvalRequestId);
        if (approval)
            return approval;
        const ref = db.collection('contacts').doc();
        const now = firestore_1.FieldValue.serverTimestamp();
        await ref.set({ ...data, createdAt: now, updatedAt: now, createdBy: actor.id });
        await audit({ actor }, 'mcp.contact.create', ref.id, data);
        return toolResult({ id: ref.id });
    });
    server.registerTool('update_contact', {
        title: 'Update contact', description: 'Updates validated contact fields after Clerk approval.', inputSchema: { id: idSchema, data: contactPatch, approvalRequestId: idSchema.optional() }, annotations: { readOnlyHint: false },
    }, async ({ id, data, approvalRequestId }) => {
        requireScope('contacts:update');
        const approval = await needsApproval('contact.update', id, data, approvalRequestId);
        if (approval)
            return approval;
        await db.doc(`contacts/${id}`).update({ ...data, updatedAt: firestore_1.FieldValue.serverTimestamp() });
        await audit({ actor }, 'mcp.contact.update', id, data);
        return toolResult({ id });
    });
    server.registerTool('delete_contact', {
        title: 'Delete contact', description: 'Soft-deletes a contact after Clerk approval. This action is recoverable but destructive.', inputSchema: { id: idSchema, approvalRequestId: idSchema.optional() }, annotations: { readOnlyHint: false, destructiveHint: true },
    }, async ({ id, approvalRequestId }) => {
        requireScope('contacts:delete');
        const approval = await needsApproval('contact.delete.soft', id, {}, approvalRequestId);
        if (approval)
            return approval;
        await db.doc(`contacts/${id}`).update({ deleted: true, deletedAt: firestore_1.FieldValue.serverTimestamp(), deletedBy: actor.id, updatedAt: firestore_1.FieldValue.serverTimestamp() });
        await audit({ actor }, 'mcp.contact.delete.soft', id);
        return toolResult({ id, deleted: true });
    });
    server.registerTool('add_person_to_project', {
        title: 'Add person to project', description: 'Adds crew or cast to a project after Clerk approval.', inputSchema: { projectId: idSchema, type: zod_1.z.enum(['crew', 'cast']), person: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()), approvalRequestId: idSchema.optional() }, annotations: { readOnlyHint: false },
    }, async ({ projectId, type, person, approvalRequestId }) => {
        requireScope('projects:update');
        const data = type === 'crew' ? crewCreate.parse(person) : castCreate.parse(person);
        const payload = { type, person: data };
        const approval = await needsApproval('project.person.add', projectId, payload, approvalRequestId);
        if (approval)
            return approval;
        const collection = type === 'crew' ? 'members' : 'talentProfiles';
        const ref = db.collection(`projects/${projectId}/${collection}`).doc();
        const now = firestore_1.FieldValue.serverTimestamp();
        await ref.set({ ...data, projectId, createdAt: now, updatedAt: now, createdBy: actor.id });
        await audit({ actor }, 'mcp.project.person.add', `${projectId}/${collection}/${ref.id}`, payload);
        return toolResult({ id: ref.id, type });
    });
    server.registerTool('update_project_person', {
        title: 'Update project person', description: 'Updates a cast or crew record after Clerk approval.', inputSchema: { projectId: idSchema, personId: idSchema, type: zod_1.z.enum(['crew', 'cast']), data: personPatch, approvalRequestId: idSchema.optional() }, annotations: { readOnlyHint: false },
    }, async ({ projectId, personId, type, data, approvalRequestId }) => {
        requireScope('projects:update');
        const payload = { type, data };
        const approval = await needsApproval('project.person.update', `${projectId}/${personId}`, payload, approvalRequestId);
        if (approval)
            return approval;
        const collection = type === 'crew' ? 'members' : 'talentProfiles';
        await db.doc(`projects/${projectId}/${collection}/${personId}`).update({ ...data, updatedAt: firestore_1.FieldValue.serverTimestamp() });
        await audit({ actor }, 'mcp.project.person.update', `${projectId}/${collection}/${personId}`, payload);
        return toolResult({ id: personId, type });
    });
    server.registerTool('remove_person_from_project', {
        title: 'Remove person from project', description: 'Soft-removes a cast or crew record after Clerk approval.', inputSchema: { projectId: idSchema, personId: idSchema, type: zod_1.z.enum(['crew', 'cast']), approvalRequestId: idSchema.optional() }, annotations: { readOnlyHint: false, destructiveHint: true },
    }, async ({ projectId, personId, type, approvalRequestId }) => {
        requireScope('projects:delete');
        const payload = { type };
        const approval = await needsApproval('project.person.delete.soft', `${projectId}/${personId}`, payload, approvalRequestId);
        if (approval)
            return approval;
        const collection = type === 'crew' ? 'members' : 'talentProfiles';
        await db.doc(`projects/${projectId}/${collection}/${personId}`).update({ deleted: true, deletedAt: firestore_1.FieldValue.serverTimestamp(), deletedBy: actor.id, updatedAt: firestore_1.FieldValue.serverTimestamp() });
        await audit({ actor }, 'mcp.project.person.delete.soft', `${projectId}/${collection}/${personId}`, payload);
        return toolResult({ id: personId, type, deleted: true });
    });
    server.registerTool('upload_contact_photo', {
        title: 'Upload contact photo', description: 'Uploads a JPEG, PNG, or WebP contact image (maximum 5 MB) after Clerk approval.', inputSchema: { contactId: idSchema, contentBase64: zod_1.z.string().max(6_500_000), mimeType: zod_1.z.enum(['image/jpeg', 'image/png', 'image/webp']), approvalRequestId: idSchema.optional() }, annotations: { readOnlyHint: false },
    }, async ({ contactId, contentBase64, mimeType, approvalRequestId }) => {
        requireScope('files:upload');
        const bytes = Buffer.from(contentBase64, 'base64');
        if (bytes.length > 5 * 1024 * 1024)
            return { content: [{ type: 'text', text: JSON.stringify({ error: 'FILE_TOO_LARGE', message: 'Maximum photo size is 5 MB.' }) }], isError: true };
        const payload = { mimeType, bytes: bytes.length, contentHash: hashOpaqueValue(contentBase64) };
        const approval = await needsApproval('contact.photo.upload', contactId, payload, approvalRequestId);
        if (approval)
            return approval;
        const path = `contacts/${contactId}/avatar_${node_crypto_1.default.randomUUID()}`;
        const file = bucket.file(path);
        await file.save(bytes, { metadata: { contentType: mimeType } });
        const [url] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 15 * 60 * 1000 });
        await db.doc(`contacts/${contactId}`).update({ avatarUrl: url, avatarStoragePath: path, updatedAt: firestore_1.FieldValue.serverTimestamp() });
        await audit({ actor }, 'mcp.contact.photo.upload', contactId, { mimeType, bytes: bytes.length });
        return toolResult({ url, expiresInSeconds: 900 });
    });
    return server;
}
app.get('/.well-known/oauth-protected-resource/mcp', (_req, res) => {
    res.json({ resource: MCP_URL, authorization_servers: [APP_URL], scopes_supported: MCP_SCOPES, bearer_methods_supported: ['header'] });
});
app.get('/.well-known/oauth-authorization-server', (_req, res) => {
    res.json({ issuer: APP_URL, authorization_endpoint: `${APP_URL}/oauth/authorize`, token_endpoint: `${APP_URL}/oauth/token`, registration_endpoint: `${APP_URL}/oauth/register`, response_types_supported: ['code'], grant_types_supported: ['authorization_code'], code_challenge_methods_supported: ['S256'], token_endpoint_auth_methods_supported: ['none'], scopes_supported: MCP_SCOPES });
});
app.post('/oauth/register', rateLimit, async (req, res) => {
    const input = zod_1.z.object({ redirect_uris: zod_1.z.array(zod_1.z.string().url()).min(1).max(5), client_name: zod_1.z.string().trim().min(1).max(120).optional() }).passthrough().parse(req.body);
    if (input.redirect_uris.some((uri) => !allowedMcpRedirectUri(uri)))
        return oauthError(res, 400, 'invalid_client_metadata', 'Only HTTPS callback URLs operated by ChatGPT or Claude, or loopback callbacks, are supported.');
    const clientId = `mcp_client_${node_crypto_1.default.randomBytes(24).toString('base64url')}`;
    await db.doc(`mcpOAuthClients/${clientId}`).set({ clientId, redirectUris: input.redirect_uris, clientName: input.client_name || 'MCP client', createdAt: firestore_1.FieldValue.serverTimestamp() });
    res.status(201).json({ client_id: clientId, client_name: input.client_name || 'MCP client', redirect_uris: input.redirect_uris, token_endpoint_auth_method: 'none', grant_types: ['authorization_code'], response_types: ['code'] });
});
app.get('/oauth/authorize', rateLimit, async (req, res) => {
    const input = zod_1.z.object({ response_type: zod_1.z.literal('code'), client_id: zod_1.z.string().min(1).max(200), redirect_uri: zod_1.z.string().url(), state: zod_1.z.string().min(1).max(4000), code_challenge: zod_1.z.string().regex(/^[A-Za-z0-9_-]{43,128}$/), code_challenge_method: zod_1.z.literal('S256'), resource: zod_1.z.string().url().optional(), scope: zod_1.z.string().max(200).optional() }).passthrough().safeParse(req.query);
    if (!input.success)
        return oauthError(res, 400, 'invalid_request', 'The authorization request is invalid.');
    const client = await db.doc(`mcpOAuthClients/${input.data.client_id}`).get();
    if (!client.exists || !Array.isArray(client.data()?.redirectUris) || !client.data()?.redirectUris.includes(input.data.redirect_uri))
        return oauthError(res, 400, 'invalid_client', 'The OAuth client or redirect URI is not registered.');
    const resource = normalizedMcpResource(input.data.resource);
    if (!resource)
        return oauthError(res, 400, 'invalid_target', 'The requested OAuth resource is not supported.');
    const scopes = oauthScope(input.data.scope);
    if (!scopes)
        return oauthError(res, 400, 'invalid_scope', 'Only Encuadre read scopes are available.');
    const requestId = node_crypto_1.default.randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + CONNECTION_REQUEST_TTL_MS);
    await db.doc(`mcpOAuthRequests/${requestId}`).set({ requestId, clientId: input.data.client_id, redirectUri: input.data.redirect_uri, state: input.data.state, codeChallenge: input.data.code_challenge, resource, scopes, status: 'pending', createdAt: firestore_1.FieldValue.serverTimestamp(), expiresAt: firestore_1.Timestamp.fromDate(expiresAt) });
    res.redirect(302, `${APP_URL}/auth/mcp?request=${encodeURIComponent(requestId)}`);
});
app.post('/api/mcp/authorize/:requestId/approve', async (req, res) => {
    if (!CLERK_SECRET_KEY)
        return error(res, 503, 'AUTH_NOT_CONFIGURED', 'Clerk server authentication is not configured.');
    const actor = await clerkActor(req);
    if (!actor)
        return error(res, 401, 'UNAUTHORIZED', 'A valid Clerk session token is required.');
    const requestId = idSchema.parse(req.params.requestId);
    const requestRef = db.doc(`mcpOAuthRequests/${requestId}`);
    const requestSnap = await requestRef.get();
    const request = requestSnap.data();
    if (!requestSnap.exists || !request || request.status !== 'pending' || !request.expiresAt?.toDate || request.expiresAt.toDate() <= new Date())
        return error(res, 400, 'INVALID_REQUEST', 'The authorization request is invalid or expired.');
    const authorizationCode = `mcpcode_${node_crypto_1.default.randomBytes(32).toString('base64url')}`;
    const codeExpiresAt = new Date(Date.now() + MCP_AUTHORIZATION_CODE_TTL_MS);
    await db.runTransaction(async (transaction) => {
        const latest = await transaction.get(requestRef);
        const data = latest.data();
        if (!latest.exists || data?.status !== 'pending')
            throw new Error('MCP_REQUEST_ALREADY_APPROVED');
        transaction.create(db.doc(`mcpOAuthCodes/${hashOpaqueValue(authorizationCode)}`), { status: 'active', requestId, clientId: data.clientId, redirectUri: data.redirectUri, codeChallenge: data.codeChallenge, resource: data.resource, scopes: data.scopes, userId: actor.id, createdAt: firestore_1.FieldValue.serverTimestamp(), expiresAt: firestore_1.Timestamp.fromDate(codeExpiresAt) });
        transaction.update(requestRef, { status: 'approved', approvedBy: actor.id, approvedAt: firestore_1.FieldValue.serverTimestamp() });
    });
    await db.collection('audit_logs').add({ timestamp: firestore_1.FieldValue.serverTimestamp(), actor: 'clerk', authenticatedUser: actor.id, action: 'mcp.oauth.approve', resourceId: requestId, changes: { clientId: request.clientId, scopes: request.scopes } });
    const redirect = new URL(String(request.redirectUri));
    redirect.searchParams.set('code', authorizationCode);
    redirect.searchParams.set('state', String(request.state));
    res.json({ data: { redirectUrl: redirect.toString() } });
});
app.post('/api/mcp/operations/:requestId/approve', async (req, res) => {
    if (!CLERK_SECRET_KEY)
        return error(res, 503, 'AUTH_NOT_CONFIGURED', 'Clerk server authentication is not configured.');
    const actor = await clerkActor(req);
    if (!actor)
        return error(res, 401, 'UNAUTHORIZED', 'A valid Clerk session token is required.');
    const requestId = idSchema.parse(req.params.requestId);
    const requestRef = db.doc(`mcpOperationApprovals/${requestId}`);
    const requestSnap = await requestRef.get();
    const request = requestSnap.data();
    if (!requestSnap.exists || !request || request.status !== 'pending' || request.requestedBy !== actor.id || !request.expiresAt?.toDate || request.expiresAt.toDate() <= new Date())
        return error(res, 400, 'INVALID_REQUEST', 'The operation approval request is invalid, expired, or belongs to another user.');
    const expiresAt = new Date(Date.now() + GRANT_TTL_MS);
    await requestRef.update({ status: 'approved', approvedBy: actor.id, approvedAt: firestore_1.FieldValue.serverTimestamp(), expiresAt: firestore_1.Timestamp.fromDate(expiresAt) });
    await db.collection('audit_logs').add({ timestamp: firestore_1.FieldValue.serverTimestamp(), actor: 'clerk', authenticatedUser: actor.id, action: 'mcp.operation.approve', resourceId: requestId, changes: { operation: request.operation, target: request.resourceId } });
    res.json({ data: { approved: true, expiresAt: expiresAt.toISOString() } });
});
app.post('/oauth/token', rateLimit, async (req, res) => {
    const input = zod_1.z.object({ grant_type: zod_1.z.literal('authorization_code'), code: zod_1.z.string().regex(/^mcpcode_[A-Za-z0-9_-]{43}$/), client_id: zod_1.z.string().min(1).max(200), redirect_uri: zod_1.z.string().url(), code_verifier: zod_1.z.string().min(43).max(128), resource: zod_1.z.string().url().optional() }).passthrough().safeParse(req.body);
    if (!input.success)
        return oauthError(res, 400, 'invalid_request', 'The token request is invalid.');
    const resource = normalizedMcpResource(input.data.resource);
    if (!resource)
        return oauthError(res, 400, 'invalid_target', 'The requested OAuth resource is not supported.');
    const codeRef = db.doc(`mcpOAuthCodes/${hashOpaqueValue(input.data.code)}`);
    const codeSnap = await codeRef.get();
    const code = codeSnap.data();
    if (!codeSnap.exists || !code || code.status !== 'active' || !code.expiresAt?.toDate || code.expiresAt.toDate() <= new Date() || code.clientId !== input.data.client_id || code.redirectUri !== input.data.redirect_uri || code.resource !== resource || !hashesMatch(sha256Base64Url(input.data.code_verifier), String(code.codeChallenge || '')))
        return oauthError(res, 400, 'invalid_grant', 'The authorization code is invalid, expired, or does not match this client.');
    const accessToken = `mcp1_${node_crypto_1.default.randomBytes(32).toString('base64url')}`;
    const expiresAt = new Date(Date.now() + MCP_ACCESS_TOKEN_TTL_MS);
    try {
        await db.runTransaction(async (transaction) => {
            const latest = await transaction.get(codeRef);
            const data = latest.data();
            if (!latest.exists || data?.status !== 'active')
                throw new Error('MCP_CODE_ALREADY_USED');
            transaction.create(db.doc(`mcpAccessTokens/${hashOpaqueValue(accessToken)}`), { status: 'active', mcpScopeVersion: 2, userId: data.userId, clientId: data.clientId, resource: data.resource, scopes: data.scopes, createdAt: firestore_1.FieldValue.serverTimestamp(), expiresAt: firestore_1.Timestamp.fromDate(expiresAt) });
            transaction.update(codeRef, { status: 'used', usedAt: firestore_1.FieldValue.serverTimestamp() });
        });
    }
    catch (err) {
        if (err instanceof Error && err.message === 'MCP_CODE_ALREADY_USED')
            return oauthError(res, 400, 'invalid_grant', 'The authorization code was already used.');
        throw err;
    }
    res.json({ access_token: accessToken, token_type: 'Bearer', expires_in: Math.floor(MCP_ACCESS_TOKEN_TTL_MS / 1000), scope: code.scopes.join(' ') });
});
app.post('/mcp', rateLimit, async (req, res, next) => {
    try {
        const actor = await mcpActor(req);
        if (!actor)
            return mcpUnauthorized(res);
        const server = createMcpServer(actor);
        const transport = new streamableHttp_js_1.StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        res.on('close', () => { void transport.close(); void server.close(); });
    }
    catch (err) {
        next(err);
    }
});
app.get('/mcp', (_req, res) => res.status(405).json({ error: 'method_not_allowed', message: 'Use POST for MCP requests.' }));
app.delete('/mcp', (_req, res) => res.status(405).json({ error: 'method_not_allowed', message: 'Use POST for MCP requests.' }));
app.use('/api', rateLimit, (req, res, next) => {
    // Estas rutas inician o aprueban una conexión; las rutas de datos requieren sesión temporal.
    if (req.path === '/auth/connect' || req.path.startsWith('/auth/connect/') || req.path === '/auth/agent/approve' || req.path.startsWith('/mcp/authorize/') || req.path.startsWith('/mcp/operations/'))
        return next();
    return authenticate(req, res, next);
});
app.get('/api/projects', async (req, res) => {
    if (!await requirePermission(req, res, 'projects:read'))
        return;
    const rows = await readCollection('projects', searchSchema.parse(req.query.search));
    res.json({ data: rows.filter((p) => p.deleted !== true && (req.query.includeArchived === 'true' || p.status !== 'archived')) });
});
app.get('/api/projects/:id', async (req, res) => {
    if (!await requirePermission(req, res, 'projects:read'))
        return;
    const id = idSchema.parse(req.params.id);
    const snap = await db.doc(`projects/${id}`).get();
    if (!snap.exists)
        return error(res, 404, 'NOT_FOUND', 'Project not found.');
    res.json({ data: { id: snap.id, ...docData(snap.data()) } });
});
app.get('/api/projects/:id/context', async (req, res) => {
    if (!await requirePermission(req, res, 'projects:read'))
        return;
    const id = idSchema.parse(req.params.id);
    const project = await db.doc(`projects/${id}`).get();
    if (!project.exists)
        return error(res, 404, 'NOT_FOUND', 'Project not found.');
    const [members, talents, files, documents, calendar, tasks] = await Promise.all([
        db.collection(`projects/${id}/members`).limit(200).get(), db.collection(`projects/${id}/talentProfiles`).limit(200).get(),
        db.collection(`projects/${id}/mediaFiles`).limit(200).get(), db.collection(`projects/${id}/documents`).limit(200).get(),
        db.collection(`projects/${id}/calendar`).limit(200).get(), db.collection(`projects/${id}/tasks`).limit(200).get(),
    ]);
    res.json({ data: { project: { id: project.id, ...docData(project.data()) }, cast: talents.docs.map((d) => ({ id: d.id, ...docData(d.data()) })), crew: members.docs.map((d) => ({ id: d.id, ...docData(d.data()) })), files: files.docs.map((d) => ({ id: d.id, ...docData(d.data()) })), documents: documents.docs.map((d) => ({ id: d.id, ...docData(d.data()) })), calendar: calendar.docs.map((d) => ({ id: d.id, ...docData(d.data()) })), tasks: tasks.docs.map((d) => ({ id: d.id, ...docData(d.data()) })) } });
});
app.get('/api/projects/:id/people', async (req, res) => {
    if (!await requirePermission(req, res, 'projects:read'))
        return;
    const id = idSchema.parse(req.params.id);
    const [members, talents] = await Promise.all([db.collection(`projects/${id}/members`).limit(200).get(), db.collection(`projects/${id}/talentProfiles`).limit(200).get()]);
    res.json({ data: { crew: members.docs.map((d) => ({ id: d.id, ...docData(d.data()) })), cast: talents.docs.map((d) => ({ id: d.id, ...docData(d.data()) })) } });
});
app.post('/api/projects/:id/people', async (req, res) => {
    const projectId = idSchema.parse(req.params.id);
    const input = zod_1.z.object({ type: zod_1.z.enum(['crew', 'cast']), person: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()) }).strict().parse(req.body);
    if (!await requireRecentGrant(req, res, 'projects', projectId))
        return;
    if (!await requirePermission(req, res, 'projects:update'))
        return;
    const data = input.type === 'crew' ? crewCreate.parse(input.person) : castCreate.parse(input.person);
    const collection = input.type === 'crew' ? 'members' : 'talentProfiles';
    const ref = db.collection(`projects/${projectId}/${collection}`).doc();
    const now = firestore_1.FieldValue.serverTimestamp();
    await ref.set({ ...data, projectId, createdAt: now, updatedAt: now, createdBy: req.actor?.id });
    await audit(req, 'project.person.add', `${projectId}/${collection}/${ref.id}`, { type: input.type, data });
    res.status(201).json({ data: { id: ref.id, type: input.type } });
});
app.patch('/api/projects/:projectId/people/:personId', async (req, res) => {
    const projectId = idSchema.parse(req.params.projectId);
    if (!await requireRecentGrant(req, res, 'projects', projectId))
        return;
    if (!await requirePermission(req, res, 'projects:update'))
        return;
    const personId = idSchema.parse(req.params.personId);
    const input = zod_1.z.object({ type: zod_1.z.enum(['crew', 'cast']), updates: personPatch }).strict().parse(req.body);
    const collection = input.type === 'crew' ? 'members' : 'talentProfiles';
    await db.doc(`projects/${projectId}/${collection}/${personId}`).update({ ...input.updates, updatedAt: firestore_1.FieldValue.serverTimestamp() });
    await audit(req, 'project.person.update', `${projectId}/${collection}/${personId}`, input.updates);
    res.json({ data: { id: personId, type: input.type } });
});
app.delete('/api/projects/:projectId/people/:personId', async (req, res) => {
    const apiReq = req;
    const projectId = idSchema.parse(req.params.projectId);
    const personId = idSchema.parse(req.params.personId);
    const type = zod_1.z.enum(['crew', 'cast']).parse(req.query.type);
    if (!await requireRecentGrant(apiReq, res, 'projects', projectId))
        return;
    if (!await requirePermission(apiReq, res, 'projects:delete'))
        return;
    const collection = type === 'crew' ? 'members' : 'talentProfiles';
    await db.doc(`projects/${projectId}/${collection}/${personId}`).update({ deleted: true, deletedAt: firestore_1.FieldValue.serverTimestamp(), deletedBy: apiReq.grant?.approvedBy, updatedAt: firestore_1.FieldValue.serverTimestamp() });
    await audit(apiReq, 'project.person.delete.soft', `${projectId}/${collection}/${personId}`);
    res.json({ data: { id: personId, deleted: true } });
});
app.post('/api/projects', async (req, res) => {
    if (!await requirePermission(req, res, 'projects:create'))
        return;
    const data = projectCreate.parse(req.body);
    const now = firestore_1.FieldValue.serverTimestamp();
    const ref = db.collection('projects').doc();
    await ref.set({ ...data, startDate: firestore_1.Timestamp.fromDate(new Date(data.startDate)), ...(data.endDate ? { endDate: firestore_1.Timestamp.fromDate(new Date(data.endDate)) } : {}), status: data.status || 'draft', createdAt: now, updatedAt: now, createdBy: req.actor?.id });
    await audit(req, 'project.create', ref.id, data);
    res.status(201).json({ data: { id: ref.id } });
});
app.patch('/api/projects/:id', async (req, res) => {
    const id = idSchema.parse(req.params.id);
    if (!await requireRecentGrant(req, res, 'projects', id))
        return;
    if (!await requirePermission(req, res, 'projects:update'))
        return;
    const data = projectPatch.parse(req.body);
    const updates = { ...data, updatedAt: firestore_1.FieldValue.serverTimestamp() };
    if (data.startDate)
        updates.startDate = firestore_1.Timestamp.fromDate(new Date(data.startDate));
    if (data.endDate)
        updates.endDate = firestore_1.Timestamp.fromDate(new Date(data.endDate));
    await db.doc(`projects/${id}`).update(updates);
    await audit(req, 'project.update', id, data);
    res.json({ data: { id } });
});
app.get('/api/contacts', async (req, res) => {
    if (!await requirePermission(req, res, 'contacts:read'))
        return;
    res.json({ data: (await readCollection('contacts', searchSchema.parse(req.query.search))).filter((contact) => contact.deleted !== true) });
});
app.get('/api/contacts/:id', async (req, res) => {
    if (!await requirePermission(req, res, 'contacts:read'))
        return;
    const id = idSchema.parse(req.params.id);
    const snap = await db.doc(`contacts/${id}`).get();
    if (!snap.exists)
        return error(res, 404, 'NOT_FOUND', 'Contact not found.');
    res.json({ data: { id: snap.id, ...docData(snap.data()) } });
});
app.post('/api/contacts', async (req, res) => {
    if (!await requirePermission(req, res, 'contacts:create'))
        return;
    const data = contactCreate.parse(req.body);
    const ref = db.collection('contacts').doc();
    const now = firestore_1.FieldValue.serverTimestamp();
    await ref.set({ ...data, createdAt: now, updatedAt: now, createdBy: req.actor?.id });
    await audit(req, 'contact.create', ref.id, data);
    res.status(201).json({ data: { id: ref.id } });
});
app.patch('/api/contacts/:id', async (req, res) => {
    const id = idSchema.parse(req.params.id);
    if (!await requireRecentGrant(req, res, 'contacts', id))
        return;
    if (!await requirePermission(req, res, 'contacts:update'))
        return;
    const data = contactPatch.parse(req.body);
    await db.doc(`contacts/${id}`).update({ ...data, updatedAt: firestore_1.FieldValue.serverTimestamp() });
    await audit(req, 'contact.update', id, data);
    res.json({ data: { id } });
});
async function requireRecentGrant(req, res, resource, id) {
    const grantId = req.header('x-authorization-grant');
    if (!grantId) {
        const requestId = node_crypto_1.default.randomBytes(24).toString('base64url');
        const expiresAt = new Date(Date.now() + REQUEST_TTL_MS);
        await db.doc(`agentAuthRequests/${requestId}`).set({ requestId, requestedBy: req.actor?.id, operation: `${req.method.toLowerCase()}_${resource}`, resourceId: id, createdAt: firestore_1.FieldValue.serverTimestamp(), expiresAt, status: 'pending' });
        return error(res, 428, 'AUTH_REQUIRED', 'Recent user authentication is required.', { authUrl: `${APP_URL}/auth/agent?request=${requestId}`, expiresAt: expiresAt.toISOString() });
    }
    const snap = await db.doc(`agentAuthGrants/${grantId}`).get();
    const data = snap.data();
    if (!snap.exists || !data || data.status !== 'approved' || !data.expiresAt?.toDate || data.expiresAt.toDate() < new Date() || data.resourceId !== id || data.operation !== `${req.method.toLowerCase()}_${resource}` || data.approvedBy !== req.actor?.id)
        return error(res, 401, 'INVALID_GRANT', 'The authorization grant is invalid, expired, or scoped to another operation, resource, or session user.');
    req.grant = { id: grantId, approvedBy: String(data.approvedBy), expiresAt: data.expiresAt.toDate() };
    req.actor = { ...req.actor, permissions: [...(req.actor?.permissions || []), `${resource}:delete`] };
    return true;
}
app.delete('/api/projects/:id', async (req, res) => { const id = idSchema.parse(req.params.id); if (!await requireRecentGrant(req, res, 'projects', id))
    return; if (!await requirePermission(req, res, 'projects:delete'))
    return; await db.doc(`projects/${id}`).update({ deleted: true, deletedAt: firestore_1.FieldValue.serverTimestamp(), deletedBy: req.grant?.approvedBy, status: 'archived', updatedAt: firestore_1.FieldValue.serverTimestamp() }); await audit(req, 'project.delete.soft', id); res.json({ data: { id, deleted: true } }); });
app.delete('/api/contacts/:id', async (req, res) => { const id = idSchema.parse(req.params.id); if (!await requireRecentGrant(req, res, 'contacts', id))
    return; if (!await requirePermission(req, res, 'contacts:delete'))
    return; await db.doc(`contacts/${id}`).update({ deleted: true, deletedAt: firestore_1.FieldValue.serverTimestamp(), deletedBy: req.grant?.approvedBy, updatedAt: firestore_1.FieldValue.serverTimestamp() }); await audit(req, 'contact.delete.soft', id); res.json({ data: { id, deleted: true } }); });
app.post('/api/auth/connect', async (req, res) => {
    if (!CLERK_SECRET_KEY)
        return error(res, 503, 'AUTH_NOT_CONFIGURED', 'Clerk server authentication is not configured.');
    const input = zod_1.z.object({ clientName: zod_1.z.string().trim().min(1).max(120).optional(), clientType: zod_1.z.enum(['agent', 'desktop']).default('agent') }).strict().parse(req.body || {});
    const requestId = node_crypto_1.default.randomBytes(24).toString('base64url');
    const exchangeSecret = `ecx1_${node_crypto_1.default.randomBytes(32).toString('base64url')}`;
    const expiresAt = new Date(Date.now() + CONNECTION_REQUEST_TTL_MS);
    await db.doc(`apiConnectionRequests/${requestId}`).set({
        requestId, exchangeSecretHash: hashOpaqueValue(exchangeSecret), requestedClient: input.clientName || (input.clientType === 'desktop' ? 'Encuadre Script' : 'AI agent'), clientType: input.clientType,
        status: 'pending', createdAt: firestore_1.FieldValue.serverTimestamp(), expiresAt: firestore_1.Timestamp.fromDate(expiresAt),
    });
    res.status(201).json({ data: { requestId, exchangeSecret, authUrl: `${APP_URL}/auth/connect?request=${encodeURIComponent(requestId)}`, expiresAt: expiresAt.toISOString(), pollAfterSeconds: 2 } });
});
// Datos públicos de una solicitud para que la página de aprobación muestre qué se está autorizando.
app.get('/api/auth/connect/:requestId', async (req, res) => {
    const requestId = idSchema.parse(req.params.requestId);
    const snap = await db.doc(`apiConnectionRequests/${requestId}`).get();
    const request = snap.data();
    if (!snap.exists || !request)
        return error(res, 404, 'NOT_FOUND', 'Connection request not found.');
    const clientType = request.clientType === 'desktop' ? 'desktop' : 'agent';
    res.json({ data: { clientName: String(request.requestedClient || ''), clientType, status: String(request.status), expiresAt: request.expiresAt.toDate().toISOString(), sessionTtlSeconds: Math.floor((clientType === 'desktop' ? DESKTOP_SESSION_TTL_MS : API_SESSION_TTL_MS) / 1000) } });
});
app.post('/api/auth/connect/:requestId/approve', async (req, res) => {
    if (!CLERK_SECRET_KEY)
        return error(res, 503, 'AUTH_NOT_CONFIGURED', 'Clerk server authentication is not configured.');
    const actor = await clerkActor(req);
    if (!actor)
        return error(res, 401, 'UNAUTHORIZED', 'A valid Clerk session token is required.');
    const requestId = idSchema.parse(req.params.requestId);
    const requestRef = db.doc(`apiConnectionRequests/${requestId}`);
    const requestSnap = await requestRef.get();
    const request = requestSnap.data();
    if (!requestSnap.exists || !request || request.status !== 'pending' || !request.expiresAt?.toDate || request.expiresAt.toDate() <= new Date())
        return error(res, 400, 'INVALID_CONNECTION_REQUEST', 'The connection request is invalid or expired.');
    await requestRef.update({ status: 'approved', approvedBy: actor.id, ...(actor.email ? { approvedEmail: actor.email } : {}), approvedAt: firestore_1.FieldValue.serverTimestamp() });
    await db.collection('audit_logs').add({ timestamp: firestore_1.FieldValue.serverTimestamp(), actor: 'clerk', authenticatedUser: actor.id, action: 'api.connection.approve', resourceId: requestId, changes: { clientName: request.requestedClient } });
    res.json({ data: { approved: true, expiresAt: request.expiresAt.toDate().toISOString() } });
});
app.post('/api/auth/connect/:requestId/exchange', async (req, res) => {
    const requestId = idSchema.parse(req.params.requestId);
    const exchangeSecret = req.header('x-connection-secret');
    if (!exchangeSecret || !/^ecx1_[A-Za-z0-9_-]{43}$/.test(exchangeSecret))
        return error(res, 401, 'UNAUTHORIZED', 'A valid connection exchange secret is required.');
    const requestRef = db.doc(`apiConnectionRequests/${requestId}`);
    const requestSnap = await requestRef.get();
    const request = requestSnap.data();
    if (!requestSnap.exists || !request || !hashesMatch(hashOpaqueValue(exchangeSecret), String(request.exchangeSecretHash || '')))
        return error(res, 401, 'UNAUTHORIZED', 'The connection request is invalid.');
    if (!request.expiresAt?.toDate || request.expiresAt.toDate() <= new Date())
        return error(res, 400, 'CONNECTION_EXPIRED', 'The connection request has expired. Start a new connection.');
    if (request.status === 'pending')
        return error(res, 409, 'CONNECTION_PENDING', 'Waiting for the user to approve the connection.');
    if (request.status !== 'approved')
        return error(res, 400, 'CONNECTION_UNAVAILABLE', 'This connection request is no longer available.');
    const sessionToken = `ecs1_${node_crypto_1.default.randomBytes(32).toString('base64url')}`;
    const sessionHash = hashOpaqueValue(sessionToken);
    const isDesktop = request.clientType === 'desktop';
    const sessionTtl = isDesktop ? DESKTOP_SESSION_TTL_MS : API_SESSION_TTL_MS;
    const expiresAt = new Date(Date.now() + sessionTtl);
    try {
        await db.runTransaction(async (transaction) => {
            const latest = await transaction.get(requestRef);
            const data = latest.data();
            if (!latest.exists || data?.status !== 'approved')
                throw new Error('CONNECTION_ALREADY_EXCHANGED');
            transaction.create(db.doc(`apiSessions/${sessionHash}`), { status: 'active', userId: data.approvedBy, ...(data.approvedEmail ? { email: data.approvedEmail } : {}), permissions: isDesktop ? desktopPermissions : apiPermissions, client: isDesktop ? 'desktop' : 'agent', clientName: String(data.requestedClient || ''), createdAt: firestore_1.FieldValue.serverTimestamp(), expiresAt: firestore_1.Timestamp.fromDate(expiresAt) });
            transaction.update(requestRef, { status: 'exchanged', exchangedAt: firestore_1.FieldValue.serverTimestamp() });
        });
    }
    catch (err) {
        if (err instanceof Error && err.message === 'CONNECTION_ALREADY_EXCHANGED')
            return error(res, 400, 'CONNECTION_UNAVAILABLE', 'This connection request was already exchanged.');
        throw err;
    }
    await db.collection('audit_logs').add({ timestamp: firestore_1.FieldValue.serverTimestamp(), actor: 'agent-connection', authenticatedUser: String(request.approvedBy), action: 'api.connection.exchange', resourceId: requestId, changes: {} });
    res.json({ data: { sessionToken, expiresAt: expiresAt.toISOString(), expiresInSeconds: Math.floor(sessionTtl / 1000) } });
});
app.post('/api/auth/agent/approve', async (req, res) => {
    if (!CLERK_SECRET_KEY)
        return error(res, 503, 'AUTH_NOT_CONFIGURED', 'Clerk server authentication is not configured.');
    const actor = await clerkActor(req);
    if (!actor)
        return error(res, 401, 'UNAUTHORIZED', 'A valid Clerk session token is required.');
    const requestId = idSchema.parse(req.body?.requestId);
    const requestRef = db.doc(`agentAuthRequests/${requestId}`);
    const requestSnap = await requestRef.get();
    const request = requestSnap.data();
    if (!requestSnap.exists || !request || request.status !== 'pending' || request.requestedBy !== actor.id || request.expiresAt.toDate() < new Date())
        return error(res, 400, 'INVALID_REQUEST', 'The authentication request is invalid, expired, or belongs to another user.');
    const grantId = node_crypto_1.default.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + GRANT_TTL_MS);
    await db.doc(`agentAuthGrants/${grantId}`).set({ grantId, requestId, operation: request.operation, resourceId: request.resourceId, approvedBy: actor.id, approvedAt: firestore_1.FieldValue.serverTimestamp(), expiresAt: firestore_1.Timestamp.fromDate(expiresAt), status: 'approved' });
    await requestRef.update({ status: 'approved', approvedBy: actor.id, approvedAt: firestore_1.FieldValue.serverTimestamp() });
    res.json({ data: { grantId, expiresAt: expiresAt.toISOString() } });
});
app.post('/api/contacts/:id/photo', async (req, res) => {
    const apiReq = req;
    const id = idSchema.parse(req.params.id);
    if (!await requireRecentGrant(apiReq, res, 'contacts', id))
        return;
    if (!await requirePermission(apiReq, res, 'files:upload'))
        return;
    const input = zod_1.z.object({ contentBase64: zod_1.z.string().max(6_500_000), mimeType: zod_1.z.enum(['image/jpeg', 'image/png', 'image/webp']) }).strict().parse(req.body);
    const bytes = Buffer.from(input.contentBase64, 'base64');
    if (bytes.length > 5 * 1024 * 1024)
        return error(res, 413, 'FILE_TOO_LARGE', 'Maximum photo size is 5 MB.');
    const path = `contacts/${id}/avatar_${node_crypto_1.default.randomUUID()}`;
    const file = bucket.file(path);
    await file.save(bytes, { metadata: { contentType: input.mimeType } });
    const [url] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 15 * 60 * 1000 });
    await db.doc(`contacts/${id}`).update({ avatarUrl: url, avatarStoragePath: path, updatedAt: firestore_1.FieldValue.serverTimestamp() });
    await audit(apiReq, 'contact.photo.upload', id, { mimeType: input.mimeType, bytes: bytes.length });
    res.status(201).json({ data: { url, expiresInSeconds: 900 } });
});
// ── Sesión actual (Encuadre Script) ──
app.get('/api/auth/session', async (req, res) => {
    const actor = req.actor;
    res.json({ data: { userId: actor.id, email: actor.email || null, client: actor.client || 'agent', permissions: actor.permissions, expiresAt: actor.sessionExpiresAt?.toISOString() || null } });
});
app.delete('/api/auth/session', async (req, res) => {
    const actor = req.actor;
    if (!actor.sessionHash)
        return error(res, 400, 'INVALID_REQUEST', 'This credential is not an API session.');
    await db.doc(`apiSessions/${actor.sessionHash}`).update({ status: 'revoked', revokedAt: firestore_1.FieldValue.serverTimestamp() });
    await audit(req, 'api.session.revoke', actor.sessionHash.slice(0, 12));
    res.json({ data: { revoked: true } });
});
// ── Guiones (documentos tipo "script" y sus versiones) ──
// Cada versión publicada desde Encuadre Script lleva dos archivos: el PDF y el proyecto .encdre.
// Los archivos se suben directo a Storage con URLs firmadas; la API solo valida y registra.
const scriptCreate = zod_1.z.object({ name: zod_1.z.string().trim().min(1).max(200), description: zod_1.z.string().max(5000).optional(), tags: zod_1.z.array(zod_1.z.string().max(80)).max(50).default([]) }).strict();
const scriptFile = (maxBytes) => zod_1.z.object({ fileName: zod_1.z.string().trim().min(1).max(200), size: zod_1.z.number().int().positive().max(maxBytes) }).strict();
const scriptVersionBegin = zod_1.z.object({
    versionNumber: zod_1.z.string().trim().min(1).max(40).optional(),
    tag: zod_1.z.enum(['draft', 'review', 'approved', 'final']).default('draft'),
    notes: zod_1.z.string().max(5000).default(''),
    pdf: scriptFile(SCRIPT_PDF_MAX_BYTES),
    source: scriptFile(SCRIPT_SOURCE_MAX_BYTES),
    appVersion: zod_1.z.string().max(60).optional(),
}).strict();
const safeFileName = (value) => value.replace(/[^A-Za-z0-9._ -]/g, '_').replace(/\s+/g, ' ').slice(0, 150);
const storageDownloadUrl = (path, token) => `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
async function findProject(res, projectId) {
    const snap = await db.doc(`projects/${projectId}`).get();
    if (!snap.exists || snap.data()?.deleted === true) {
        error(res, 404, 'NOT_FOUND', 'Project not found.');
        return null;
    }
    return snap;
}
async function findScript(res, projectId, documentId) {
    const snap = await db.doc(`projects/${projectId}/documents/${documentId}`).get();
    const data = snap.data();
    if (!snap.exists || !data || data.deleted === true || data.type !== 'script') {
        error(res, 404, 'NOT_FOUND', 'Script not found.');
        return null;
    }
    return snap;
}
app.get('/api/projects/:id/scripts', async (req, res) => {
    if (!await requirePermission(req, res, 'scripts:read'))
        return;
    const projectId = idSchema.parse(req.params.id);
    if (!await findProject(res, projectId))
        return;
    const snap = await db.collection(`projects/${projectId}/documents`).where('type', '==', 'script').limit(200).get();
    const rows = snap.docs.filter((d) => d.data().deleted !== true).map((d) => ({ id: d.id, ...docData(d.data()) }));
    res.json({ data: rows });
});
app.post('/api/projects/:id/scripts', async (req, res) => {
    if (!await requirePermission(req, res, 'scripts:write'))
        return;
    const projectId = idSchema.parse(req.params.id);
    if (!await findProject(res, projectId))
        return;
    const input = scriptCreate.parse(req.body);
    const ref = db.collection(`projects/${projectId}/documents`).doc();
    const now = firestore_1.FieldValue.serverTimestamp();
    await ref.set({ ...input, type: 'script', status: 'draft', projectId, currentVersionId: '', versions: [], createdAt: now, updatedAt: now, createdBy: req.actor.id });
    await audit(req, 'script.create', `${projectId}/documents/${ref.id}`, input);
    res.status(201).json({ data: { id: ref.id } });
});
app.get('/api/projects/:id/scripts/:documentId/versions', async (req, res) => {
    if (!await requirePermission(req, res, 'scripts:read'))
        return;
    const projectId = idSchema.parse(req.params.id);
    const documentId = idSchema.parse(req.params.documentId);
    if (!await findScript(res, projectId, documentId))
        return;
    const snap = await db.collection(`projects/${projectId}/documents/${documentId}/versions`).orderBy('createdAt', 'desc').limit(200).get();
    res.json({ data: snap.docs.map((d) => ({ id: d.id, ...docData(d.data()) })) });
});
// Paso 1: reservar la versión y obtener las URLs de subida (PUT) para el PDF y el .encdre.
app.post('/api/projects/:id/scripts/:documentId/versions', async (req, res) => {
    if (!await requirePermission(req, res, 'scripts:write'))
        return;
    const projectId = idSchema.parse(req.params.id);
    const documentId = idSchema.parse(req.params.documentId);
    if (!await findScript(res, projectId, documentId))
        return;
    const input = scriptVersionBegin.parse(req.body);
    if (!/\.pdf$/i.test(input.pdf.fileName))
        return error(res, 400, 'VALIDATION_ERROR', 'The pdf file must have a .pdf extension.');
    if (!/\.encdre$/i.test(input.source.fileName))
        return error(res, 400, 'VALIDATION_ERROR', 'The source file must have a .encdre extension.');
    const uploadId = node_crypto_1.default.randomBytes(18).toString('base64url');
    const stamp = Date.now();
    const base = `projects/${projectId}/documents/${documentId}`;
    const expiresAt = new Date(stamp + SCRIPT_UPLOAD_TTL_MS);
    const files = {
        pdf: { path: `${base}/${stamp}_${safeFileName(input.pdf.fileName)}`, contentType: 'application/pdf', size: input.pdf.size, fileName: input.pdf.fileName, maxBytes: SCRIPT_PDF_MAX_BYTES },
        source: { path: `${base}/${stamp}_${safeFileName(input.source.fileName)}`, contentType: 'application/octet-stream', size: input.source.size, fileName: input.source.fileName, maxBytes: SCRIPT_SOURCE_MAX_BYTES },
    };
    const sign = async (file) => {
        const headers = { 'Content-Type': file.contentType, 'x-goog-content-length-range': `1,${file.maxBytes}` };
        const [uploadUrl] = await bucket.file(file.path).getSignedUrl({ version: 'v4', action: 'write', expires: expiresAt, contentType: file.contentType, extensionHeaders: { 'x-goog-content-length-range': headers['x-goog-content-length-range'] } });
        return { uploadUrl, method: 'PUT', headers };
    };
    const [pdf, source] = await Promise.all([sign(files.pdf), sign(files.source)]);
    await db.doc(`scriptUploads/${uploadId}`).set({ projectId, documentId, requestedBy: req.actor.id, status: 'pending', versionNumber: input.versionNumber || null, tag: input.tag, notes: input.notes, appVersion: input.appVersion || null, files, createdAt: firestore_1.FieldValue.serverTimestamp(), expiresAt: firestore_1.Timestamp.fromDate(expiresAt) });
    res.status(201).json({ data: { uploadId, expiresAt: expiresAt.toISOString(), pdf, source } });
});
// Paso 2: confirmar que ambos archivos llegaron y registrar la versión.
app.post('/api/projects/:id/scripts/:documentId/versions/:uploadId/commit', async (req, res) => {
    if (!await requirePermission(req, res, 'scripts:write'))
        return;
    const projectId = idSchema.parse(req.params.id);
    const documentId = idSchema.parse(req.params.documentId);
    const uploadId = idSchema.parse(req.params.uploadId);
    const uploadRef = db.doc(`scriptUploads/${uploadId}`);
    const uploadSnap = await uploadRef.get();
    const upload = uploadSnap.data();
    if (!uploadSnap.exists || !upload || upload.projectId !== projectId || upload.documentId !== documentId || upload.requestedBy !== req.actor.id)
        return error(res, 404, 'NOT_FOUND', 'Upload not found.');
    if (upload.status !== 'pending')
        return error(res, 409, 'UPLOAD_UNAVAILABLE', 'This upload was already committed.');
    if (upload.expiresAt.toDate() <= new Date())
        return error(res, 400, 'UPLOAD_EXPIRED', 'The upload has expired. Start a new one.');
    const stored = { pdf: { url: '', size: 0 }, source: { url: '', size: 0 } };
    for (const key of ['pdf', 'source']) {
        const info = upload.files[key];
        const file = bucket.file(info.path);
        const [exists] = await file.exists();
        if (!exists)
            return error(res, 400, 'FILE_MISSING', `The ${key} file has not been uploaded.`);
        const [metadata] = await file.getMetadata();
        const size = Number(metadata.size);
        if (!size || size > info.maxBytes) {
            await file.delete({ ignoreNotFound: true });
            return error(res, 413, 'FILE_TOO_LARGE', `The ${key} file exceeds the allowed size.`);
        }
        const fileName = String(upload.files[key].fileName || '').replace(/[^A-Za-z0-9._ ()-]/g, '_');
        const token = node_crypto_1.default.randomUUID();
        await file.setMetadata({ contentDisposition: `${key === 'pdf' ? 'inline' : 'attachment'}; filename="${fileName}"`, metadata: { firebaseStorageDownloadTokens: token } });
        stored[key] = { url: storageDownloadUrl(info.path, token), size };
    }
    const documentRef = db.doc(`projects/${projectId}/documents/${documentId}`);
    const versionRef = documentRef.collection('versions').doc();
    let versionNumber = '';
    try {
        versionNumber = await db.runTransaction(async (transaction) => {
            const [latestUpload, document] = await Promise.all([transaction.get(uploadRef), transaction.get(documentRef)]);
            if (latestUpload.data()?.status !== 'pending')
                throw new Error('UPLOAD_ALREADY_COMMITTED');
            const versions = Array.isArray(document.data()?.versions) ? document.data().versions : [];
            const number = typeof upload.versionNumber === 'string' && upload.versionNumber ? upload.versionNumber : `${versions.length + 1}.0`;
            const now = firestore_1.FieldValue.serverTimestamp();
            transaction.set(versionRef, {
                documentId, projectId, versionNumber: number, tag: upload.tag, notes: upload.notes,
                fileUrl: stored.pdf.url, fileSize: stored.pdf.size, mimeType: 'application/pdf', storagePath: upload.files.pdf.path, fileName: upload.files.pdf.fileName,
                sourceFileUrl: stored.source.url, sourceFileSize: stored.source.size, sourceStoragePath: upload.files.source.path, sourceFileName: upload.files.source.fileName,
                isLocked: false, ...(document.data()?.currentVersionId ? { parentVersionId: document.data().currentVersionId } : {}),
                createdAt: now, createdBy: req.actor.id, metadata: { client: 'encuadre-script', ...(upload.appVersion ? { appVersion: upload.appVersion } : {}) },
            });
            transaction.update(documentRef, { currentVersionId: versionRef.id, versions: [...versions, versionRef.id], updatedAt: now });
            transaction.update(uploadRef, { status: 'committed', versionId: versionRef.id, committedAt: now });
            return number;
        });
    }
    catch (err) {
        if (err instanceof Error && err.message === 'UPLOAD_ALREADY_COMMITTED')
            return error(res, 409, 'UPLOAD_UNAVAILABLE', 'This upload was already committed.');
        throw err;
    }
    await audit(req, 'script.version.create', `${projectId}/documents/${documentId}/versions/${versionRef.id}`, { versionNumber, tag: upload.tag, pdfBytes: stored.pdf.size, sourceBytes: stored.source.size });
    res.status(201).json({ data: { id: versionRef.id, versionNumber } });
});
// Enlace temporal de descarga del PDF o del .encdre de una versión.
app.get('/api/projects/:id/scripts/:documentId/versions/:versionId/download', async (req, res) => {
    if (!await requirePermission(req, res, 'scripts:read'))
        return;
    const projectId = idSchema.parse(req.params.id);
    const documentId = idSchema.parse(req.params.documentId);
    const versionId = idSchema.parse(req.params.versionId);
    const kind = zod_1.z.enum(['pdf', 'source']).default('pdf').parse(req.query.file);
    if (!await findScript(res, projectId, documentId))
        return;
    const snap = await db.doc(`projects/${projectId}/documents/${documentId}/versions/${versionId}`).get();
    const version = snap.data();
    if (!snap.exists || !version)
        return error(res, 404, 'NOT_FOUND', 'Version not found.');
    const path = kind === 'pdf' ? version.storagePath : version.sourceStoragePath;
    const fileName = kind === 'pdf' ? version.fileName : version.sourceFileName;
    if (typeof path !== 'string' || !path.startsWith(`projects/${projectId}/documents/${documentId}/`))
        return error(res, 404, 'FILE_UNAVAILABLE', kind === 'source' ? 'This version has no Encuadre Script source file.' : 'This version was not uploaded through the API.', kind === 'pdf' && typeof version.fileUrl === 'string' ? { fileUrl: version.fileUrl } : {});
    const [url] = await bucket.file(path).getSignedUrl({ version: 'v4', action: 'read', expires: Date.now() + 15 * 60 * 1000 });
    res.json({ data: { url, fileName: typeof fileName === 'string' ? fileName : null, expiresInSeconds: 900 } });
});
app.use((err, _req, res, _next) => { if (err instanceof zod_1.z.ZodError)
    return error(res, 400, 'VALIDATION_ERROR', 'Request validation failed.', { issues: err.issues }); console.error('[productionApi]', err); return error(res, 500, 'INTERNAL_ERROR', 'An unexpected server error occurred.'); });
exports.productionApi = (0, https_1.onRequest)({
    invoker: 'public',
    secrets: ['CLERK_SECRET_KEY'],
}, app);
//# sourceMappingURL=index.js.map