"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeSynopsis = sanitizeSynopsis;
exports.creditsFromPeople = creditsFromPeople;
exports.publicGallery = publicGallery;
exports.toPublicProject = toPublicProject;
exports.registerPublicWebRoutes = registerPublicWebRoutes;
// Contrato público de la "Web pública" (ver SPEC-panel-web-publica.md §5).
// Solo sale lo que está listado aquí: nada de contactos, teléfonos, Drive ni metadata.
const ALLOWED_ORIGINS = new Set([
    'https://encuadre.muxp.art',
    'https://grupoencuadrecl.web.app',
    'https://grupoencuadrecl.firebaseapp.com',
    'http://localhost:5173',
]);
const CACHE_CONTROL = 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400';
const RATE_LIMIT_PER_MIN = 120;
const ICONS = new Set(['play', 'instagram', 'arrow-up-right', 'arrow-right']);
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const YOUTUBE_RE = /^[A-Za-z0-9_-]{11}$/;
const POS_RE = /^[a-zA-Z0-9%. -]{1,40}$/;
const AR_RE = /^\d+(\.\d+)? \/ \d+(\.\d+)?$/;
const MAX_ITEMS = 40;
const MAX_GALLERY = 60;
const CAPTION_MAX = 140;
const rate = new Map();
function clientKey(req) {
    const forwarded = req.header('x-forwarded-for')?.split(',')[0]?.trim();
    return `public:${forwarded || req.ip || 'unknown'}`;
}
function limited(req) {
    const key = clientKey(req);
    const now = Date.now();
    const current = rate.get(key);
    if (!current || now - current.startedAt >= 60_000) {
        rate.set(key, { startedAt: now, count: 1 });
        return false;
    }
    current.count += 1;
    return current.count > RATE_LIMIT_PER_MIN;
}
function str(value, max) {
    if (typeof value !== 'string')
        return undefined;
    const trimmed = value.trim();
    return trimmed && trimmed.length <= max ? trimmed : undefined;
}
/** Solo se permite <b>…</b>. Todo lo demás se escapa como texto. */
function sanitizeSynopsis(value) {
    const text = str(value, 4000);
    if (!text)
        return undefined;
    const parts = text.split(/(<\/?b>)/i);
    let depth = 0;
    let balanced = true;
    for (const part of parts) {
        if (/^<b>$/i.test(part))
            depth += 1;
        else if (/^<\/b>$/i.test(part)) {
            depth -= 1;
            if (depth < 0)
                balanced = false;
        }
    }
    if (depth !== 0)
        balanced = false;
    return parts.map((part) => {
        if (/^<\/?b>$/i.test(part))
            return balanced ? part.toLowerCase() : '';
        return part.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }).join('') || undefined;
}
function cleanActions(value, allowPrimary) {
    if (!Array.isArray(value))
        return undefined;
    const result = [];
    for (const item of value.slice(0, MAX_ITEMS)) {
        if (!item || typeof item !== 'object')
            continue;
        const row = item;
        const label = str(row.label, 80);
        const href = str(row.href, 2000);
        if (!label || !href || !/^https:\/\//i.test(href) || !ICONS.has(String(row.icon)))
            continue;
        try {
            new URL(href);
        }
        catch {
            continue;
        }
        const action = { label, href, icon: String(row.icon) };
        if (allowPrimary && row.primary === true)
            action.primary = true;
        result.push(action);
    }
    return result.length ? result : undefined;
}
function cleanCredits(value) {
    if (!Array.isArray(value))
        return undefined;
    const result = [];
    for (const item of value.slice(0, 100)) {
        if (!item || typeof item !== 'object')
            continue;
        const row = item;
        const role = str(row.role, 120);
        const name = str(row.name, 600);
        if (!role || !name)
            continue;
        result.push(row.wide === true ? { role, name, wide: true } : { role, name });
    }
    return result.length ? result : undefined;
}
function joinNames(names) {
    if (names.length <= 1)
        return names[0] || '';
    if (names.length === 2)
        return `${names[0]} & ${names[1]}`;
    return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}
/** Arma créditos desde crew y cast marcados "Mostrar en créditos web", agrupando por rol público. */
function creditsFromPeople(people) {
    const selected = people
        .filter((p) => p.deleted !== true && p.webCredit?.show === true && str(p.name, 200))
        .map((p, index) => ({ name: String(p.name).trim(), role: str(p.webCredit?.role, 120) || str(p.role, 120) || 'Equipo', order: typeof p.webCredit?.order === 'number' ? p.webCredit.order : 1000, index }))
        .sort((a, b) => a.order - b.order || a.index - b.index);
    const groups = new Map();
    for (const person of selected) {
        const names = groups.get(person.role) || [];
        if (!names.includes(person.name))
            names.push(person.name);
        groups.set(person.role, names);
    }
    return [...groups.entries()].map(([role, names]) => ({ role, name: joinNames(names) }));
}
function mediaUrl(bucketName, projectId, path, version) {
    const value = str(path, 400);
    // Solo rutas dentro de la carpeta web del propio proyecto (lectura pública en las reglas de Storage).
    if (!value || !value.startsWith(`web/projects/${projectId}/`) || value.includes('..'))
        return undefined;
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(value)}?alt=media&v=${version}`;
}
/** Galería pública: sin ocultas, en el orden del panel, máx. 60, solo archivos de la carpeta de galería del proyecto */
function publicGallery(projectId, value, bucketName) {
    if (!Array.isArray(value))
        return undefined;
    const prefix = `web/projects/${projectId}/gallery/`;
    const rows = value
        .filter((item) => !!item && typeof item === 'object' && item.hidden !== true)
        .sort((a, b) => (typeof a.order === 'number' ? a.order : 1e6) - (typeof b.order === 'number' ? b.order : 1e6));
    const out = [];
    for (const row of rows) {
        if (out.length >= MAX_GALLERY)
            break;
        const path = str(row.path, 400);
        const thumbPath = str(row.thumbPath, 400);
        const width = Number(row.width);
        const height = Number(row.height);
        if (!path || !thumbPath || !path.startsWith(prefix) || !thumbPath.startsWith(prefix) || path.includes('..') || thumbPath.includes('..'))
            continue;
        if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || width > 10000 || height > 10000)
            continue;
        const photo = {
            src: `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media`,
            thumb: `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(thumbPath)}?alt=media`,
            width, height,
            kind: row.kind === 'bts' ? 'bts' : 'still',
        };
        // Texto plano: sin HTML, sin saltos de línea y recortado a 140 caracteres
        const caption = typeof row.caption === 'string' ? row.caption.replace(/<[^>]*>/g, '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, CAPTION_MAX) : '';
        if (caption)
            photo.caption = caption;
        out.push(photo);
    }
    return out.length ? out : undefined;
}
function toMillis(value) {
    const candidate = value;
    return candidate && typeof candidate.toMillis === 'function' ? candidate.toMillis() : 0;
}
/** Convierte `projects/{id}.web` en el objeto público o null si no valida. */
function toPublicProject(id, web, bucketName, people) {
    const updatedAt = toMillis(web.updatedAt);
    const fail = (reason) => ({ project: null, order: 0, updatedAt, reason });
    const slug = str(web.slug, 80);
    if (!slug || !SLUG_RE.test(slug))
        return fail('slug inválido');
    const title = str(web.title, 160);
    const kind = str(web.kind, 80);
    const status = str(web.status, 200);
    const summary = str(web.summary, 400);
    if (!title || !kind || !status || !summary)
        return fail('faltan title, kind, status o summary');
    const colorsIn = web.colors;
    if (!colorsIn || !['bg', 'ink', 'accent', 'soft'].every((k) => typeof colorsIn[k] === 'string' && HEX_RE.test(String(colorsIn[k]))))
        return fail('colores inválidos');
    const homeCredits = cleanCredits(web.homeCredits);
    if (!homeCredits)
        return fail('faltan homeCredits');
    const out = { slug, title, kind, status, colors: { bg: colorsIn.bg, ink: colorsIn.ink, accent: colorsIn.accent, soft: colorsIn.soft }, summary, homeCredits };
    if (web.award === true)
        out.award = true;
    const hero = mediaUrl(bucketName, id, web.heroPath, updatedAt);
    if (hero)
        out.hero = hero;
    const heroThumb = mediaUrl(bucketName, id, web.heroThumbPath, updatedAt);
    if (heroThumb)
        out.heroThumb = heroThumb;
    const logo = mediaUrl(bucketName, id, web.logoPath, updatedAt);
    if (logo)
        out.logo = logo;
    const heroPos = str(web.heroPos, 40);
    if (heroPos && POS_RE.test(heroPos))
        out.heroPos = heroPos;
    const heroMobileAr = str(web.heroMobileAr, 20);
    if (heroMobileAr && AR_RE.test(heroMobileAr))
        out.heroMobileAr = heroMobileAr;
    if (web.heroLayout === 'full' || web.heroLayout === 'stack')
        out.heroLayout = web.heroLayout;
    const tl = web.typeLogo;
    if (tl && typeof tl === 'object') {
        const top = str(tl.top, 40);
        const mid = str(tl.mid, 40);
        const bottom = str(tl.bottom, 40);
        if (top && mid && bottom)
            out.typeLogo = { top, mid, bottom };
    }
    const synopsis = sanitizeSynopsis(web.synopsis);
    if (synopsis)
        out.synopsis = synopsis;
    if (Array.isArray(web.description)) {
        const description = web.description.map((p) => str(p, 2000)).filter((p) => !!p).slice(0, MAX_ITEMS);
        if (description.length)
            out.description = description;
    }
    const note = str(web.note, 1200);
    if (note)
        out.note = note;
    const soon = str(web.soon, 600);
    if (soon)
        out.soon = soon;
    const youtube = str(web.youtube, 11);
    if (youtube && YOUTUBE_RE.test(youtube))
        out.youtube = youtube;
    const actions = cleanActions(web.actions, true);
    if (actions)
        out.actions = actions;
    const homeActions = cleanActions(web.homeActions, false);
    if (homeActions)
        out.homeActions = homeActions;
    const gallery = publicGallery(id, web.gallery, bucketName);
    if (gallery)
        out.gallery = gallery;
    const credits = web.creditsSource === 'crew' ? creditsFromPeople(people) : cleanCredits(web.credits);
    if (credits?.length)
        out.credits = credits;
    return { project: out, order: typeof web.order === 'number' ? web.order : 1000, updatedAt };
}
async function loadPublishedProjects(db, bucketName) {
    const snap = await db.collection('projects').where('web.published', '==', true).get();
    const items = [];
    const seen = new Set();
    for (const doc of snap.docs) {
        const data = doc.data();
        if (data.deleted === true)
            continue;
        const web = (data.web || {});
        let people = [];
        if (web.creditsSource === 'crew') {
            const [members, talents] = await Promise.all([doc.ref.collection('members').get(), doc.ref.collection('talentProfiles').get()]);
            people = [...talents.docs, ...members.docs].map((d) => d.data());
        }
        const result = toPublicProject(doc.id, web, bucketName, people);
        if (!result.project) {
            console.warn(`[publicWeb] proyecto ${doc.id} omitido: ${result.reason}`);
            continue;
        }
        const slug = String(result.project.slug);
        if (seen.has(slug)) {
            console.warn(`[publicWeb] proyecto ${doc.id} omitido: slug duplicado "${slug}"`);
            continue;
        }
        seen.add(slug);
        items.push({ project: result.project, order: result.order, updatedAt: result.updatedAt });
    }
    items.sort((a, b) => a.order - b.order);
    return items;
}
/**
 * JSON sin ETag: con ETag, Express (y el CDN) responden 304 a la revalidación del navegador,
 * y ese 304 llega sin cabeceras CORS, así que el navegador bloquea la respuesta.
 * La caché queda a cargo de Cache-Control (max-age / s-maxage / stale-while-revalidate).
 */
function sendJson(res, status, body) {
    res.removeHeader('ETag');
    return res.status(status).type('application/json').end(JSON.stringify(body));
}
function applyCors(req, res) {
    res.set('Vary', 'Origin');
    const origin = req.header('origin');
    if (origin && ALLOWED_ORIGINS.has(origin)) {
        res.set('Access-Control-Allow-Origin', origin);
        res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        res.set('Access-Control-Max-Age', '86400');
    }
}
function registerPublicWebRoutes(app, deps) {
    const base = '/api/public/web/projects';
    app.options([base, `${base}/:slug`], (req, res) => { applyCors(req, res); res.status(204).end(); });
    app.get([base, `${base}/:slug`], async (req, res) => {
        applyCors(req, res);
        if (limited(req))
            return sendJson(res, 429, { error: 'RATE_LIMITED', message: 'Too many requests. Try again later.' });
        try {
            const items = await loadPublishedProjects(deps.db, deps.bucketName);
            res.set('Cache-Control', CACHE_CONTROL);
            const slug = req.params.slug;
            if (slug !== undefined) {
                const found = items.find((item) => item.project.slug === slug);
                if (!found) {
                    res.set('Cache-Control', 'public, max-age=30');
                    return sendJson(res, 404, { error: 'NOT_FOUND', message: 'Project not found.' });
                }
                return sendJson(res, 200, found.project);
            }
            const updatedAt = items.reduce((max, item) => Math.max(max, item.updatedAt), 0);
            return sendJson(res, 200, { version: 1, updatedAt: new Date(updatedAt || Date.now()).toISOString(), projects: items.map((item) => item.project) });
        }
        catch (err) {
            console.error('[publicWeb]', err);
            res.set('Cache-Control', 'no-store');
            return sendJson(res, 500, { error: 'INTERNAL_ERROR', message: 'An unexpected server error occurred.' });
        }
    });
}
//# sourceMappingURL=publicWeb.js.map