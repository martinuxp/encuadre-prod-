// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Web Service
// Ficha pública de cada proyecto (`projects/{id}.web`), imágenes en Storage
// y marcas de créditos. La ruta pública la sirve la API (functions/src/publicWeb.ts).
// ═══════════════════════════════════════════════════════

import { db, storage } from './firebaseConfig';
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, deleteObject } from 'firebase/storage';
import { Project, ProjectWeb, WebCreditMark, WebGalleryPhoto } from '@/types';
import { uuidv4 } from '@/utils/uuid';
import { projectService } from './projectService';
import { isHexColor, isValidSlug, processHeroImage, processGalleryImage, logoExtension, LOGO_MAX_BYTES, GALLERY_MAX_PHOTOS, GALLERY_CAPTION_MAX } from '@/utils/web';

const PROJECTS_COL = 'projects';
const CACHE_CONTROL = 'public,max-age=300';

/** Quita undefined, strings vacíos y arrays vacíos (respetando arrays y objetos anidados) */
const strip = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(strip).filter((v) => v !== undefined);
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => [k, strip(v)] as const)
      .filter(([, v]) => v !== undefined);
    return entries.length ? Object.fromEntries(entries) : undefined;
  }
  if (typeof value === 'string') return value.trim() === '' ? undefined : value;
  return value;
};

export type WebDraft = Omit<ProjectWeb, 'updatedAt'>;

export const validateWebDraft = (web: WebDraft): string | null => {
  if (!isValidSlug(web.slug)) return 'El slug solo admite minúsculas, números y guiones.';
  if (!web.title.trim()) return 'Falta el título.';
  if (!web.kind.trim()) return 'Falta el tipo.';
  if (!web.status.trim()) return 'Falta el estado.';
  if (!web.summary.trim()) return 'Falta el resumen.';
  if (web.summary.length > 220) return 'El resumen admite máximo 220 caracteres.';
  for (const key of ['bg', 'ink', 'accent', 'soft'] as const) {
    if (!isHexColor(web.colors[key])) return `El color "${key}" debe ser #RRGGBB.`;
  }
  if (!web.homeCredits.length) return 'Agrega al menos un crédito corto para el inicio.';
  const actions = [...(web.actions || []), ...(web.homeActions || [])];
  if (actions.some((a) => !/^https:\/\//i.test(a.href))) return 'Los enlaces de los botones deben empezar con https://.';
  return null;
};

export const webService = {
  /** ¿Otro proyecto activo usa ya este slug? */
  isSlugTaken: async (slug: string, excludeProjectId: string): Promise<boolean> => {
    const snap = await getDocs(query(collection(db, PROJECTS_COL), where('web.slug', '==', slug)));
    return snap.docs.some((d) => d.id !== excludeProjectId && d.data().deleted !== true);
  },

  /** Guarda la ficha completa. Valida y comprueba unicidad del slug antes de escribir. */
  saveWeb: async (projectId: string, draft: WebDraft): Promise<void> => {
    const problem = validateWebDraft(draft);
    if (problem) throw new Error(problem);
    if (await webService.isSlugTaken(draft.slug, projectId)) throw new Error(`El slug "${draft.slug}" ya lo usa otro proyecto.`);
    const clean = strip({ ...draft }) as Record<string, unknown>;
    // Los booleanos false se conservan (strip no toca booleanos); published/order siempre presentes.
    await updateDoc(doc(db, PROJECTS_COL, projectId), {
      web: { ...clean, published: draft.published, order: draft.order, updatedAt: serverTimestamp() },
      updatedAt: serverTimestamp(),
    });
  },

  /** Sube foto principal (2400 px WebP + miniatura 1200 px) y devuelve las rutas de Storage */
  uploadHero: async (projectId: string, source: Blob, previous?: { heroPath?: string; heroThumbPath?: string }): Promise<{ heroPath: string; heroThumbPath: string }> => {
    const { hero, thumb, ext } = await processHeroImage(source);
    const heroPath = `web/projects/${projectId}/hero.${ext}`;
    const heroThumbPath = `web/projects/${projectId}/hero-1200.${ext}`;
    const contentType = hero.type || 'image/webp';
    await Promise.all([
      uploadBytes(ref(storage, heroPath), hero, { contentType, cacheControl: CACHE_CONTROL }),
      uploadBytes(ref(storage, heroThumbPath), thumb, { contentType, cacheControl: CACHE_CONTROL }),
    ]);
    await webService.removeStale([previous?.heroPath, previous?.heroThumbPath], [heroPath, heroThumbPath]);
    return { heroPath, heroThumbPath };
  },

  /** Sube el logo (PNG/SVG/WebP con transparencia, máx. 2 MB) */
  uploadLogo: async (projectId: string, source: Blob, previousPath?: string): Promise<string> => {
    const ext = logoExtension(source);
    if (!ext) throw new Error('El logo debe ser PNG, SVG o WebP.');
    if (source.size > LOGO_MAX_BYTES) throw new Error('El logo pesa más de 2 MB.');
    const logoPath = `web/projects/${projectId}/logo.${ext}`;
    await uploadBytes(ref(storage, logoPath), source, { contentType: source.type, cacheControl: CACHE_CONTROL });
    await webService.removeStale([previousPath], [logoPath]);
    return logoPath;
  },

  /** Borra archivos anteriores que ya no se usan (p. ej. al cambiar de PNG a SVG) */
  removeStale: async (previous: (string | undefined)[], keep: string[]): Promise<void> => {
    const stale = previous.filter((p): p is string => !!p && !keep.includes(p));
    await Promise.all(stale.map((path) => deleteObject(ref(storage, path)).catch(() => undefined)));
  },

  // ── Galería ──

  /**
   * Sube varias fotos (cada una en WebP grande + miniatura) y devuelve las entradas nuevas,
   * numeradas a continuación de `startOrder`. Avisa por foto con `onProgress`.
   */
  uploadGalleryPhotos: async (
    projectId: string,
    files: Blob[],
    startOrder: number,
    onProgress?: (done: number, total: number) => void,
  ): Promise<WebGalleryPhoto[]> => {
    const added: WebGalleryPhoto[] = [];
    for (const [index, file] of files.entries()) {
      const { large, thumb, width, height } = await processGalleryImage(file);
      const id = uuidv4();
      const path = `web/projects/${projectId}/gallery/${id}.webp`;
      const thumbPath = `web/projects/${projectId}/gallery/${id}-900.webp`;
      await Promise.all([
        uploadBytes(ref(storage, path), large, { contentType: 'image/webp', cacheControl: 'public,max-age=31536000,immutable' }),
        uploadBytes(ref(storage, thumbPath), thumb, { contentType: 'image/webp', cacheControl: 'public,max-age=31536000,immutable' }),
      ]);
      added.push({ id, path, thumbPath, width, height, kind: 'still', order: startOrder + index });
      onProgress?.(index + 1, files.length);
    }
    return added;
  },

  /** Guarda la galería completa (el índice del arreglo pasa a ser `order`) */
  saveGallery: async (projectId: string, gallery: WebGalleryPhoto[]): Promise<WebGalleryPhoto[]> => {
    if (gallery.length > GALLERY_MAX_PHOTOS) throw new Error(`La galería admite máximo ${GALLERY_MAX_PHOTOS} fotos.`);
    const normalized = gallery.map((photo, index) => {
      const caption = photo.caption?.trim().slice(0, GALLERY_CAPTION_MAX);
      const entry: WebGalleryPhoto = { id: photo.id, path: photo.path, thumbPath: photo.thumbPath, width: photo.width, height: photo.height, kind: photo.kind, order: index };
      if (caption) entry.caption = caption;
      if (photo.hidden) entry.hidden = true;
      return entry;
    });
    await updateDoc(doc(db, PROJECTS_COL, projectId), { 'web.gallery': normalized, 'web.updatedAt': serverTimestamp() });
    return normalized;
  },

  /** Borra los archivos de una foto (la entrada se quita al guardar la galería) */
  deleteGalleryFiles: async (photo: WebGalleryPhoto): Promise<void> => {
    await Promise.all([photo.path, photo.thumbPath].map((path) => deleteObject(ref(storage, path)).catch(() => undefined)));
  },

  /** Proyectos con ficha web, ordenados por `web.order` (no incluye eliminados) */
  listWebProjects: async (): Promise<Project[]> => {
    const all = await projectService.getProjects(true);
    return all
      .filter((p) => p.web && (p as unknown as { deleted?: boolean }).deleted !== true)
      .sort((a, b) => (a.web!.order ?? 0) - (b.web!.order ?? 0));
  },

  /** Siguiente `order` libre (al final) */
  nextOrder: async (): Promise<number> => {
    const list = await webService.listWebProjects();
    return list.reduce((max, p) => Math.max(max, p.web!.order ?? 0), -1) + 1;
  },

  /** Persiste el nuevo orden: el índice del arreglo pasa a ser `web.order` */
  saveOrder: async (orderedProjectIds: string[]): Promise<void> => {
    const batch = writeBatch(db);
    orderedProjectIds.forEach((id, index) => {
      batch.update(doc(db, PROJECTS_COL, id), { 'web.order': index, 'web.updatedAt': serverTimestamp() });
    });
    await batch.commit();
  },

  /** Marca/desmarca una persona del equipo para los créditos de la web */
  setCreditMark: async (projectId: string, collectionName: 'members' | 'talentProfiles', personId: string, mark: WebCreditMark): Promise<void> => {
    const clean = strip({ ...mark }) as Record<string, unknown> | undefined;
    await updateDoc(doc(db, PROJECTS_COL, projectId, collectionName, personId), {
      webCredit: { ...(clean || {}), show: mark.show },
    });
  },

  /** Guarda el orden de varias personas marcadas */
  saveCreditOrder: async (projectId: string, items: { collectionName: 'members' | 'talentProfiles'; id: string }[]): Promise<void> => {
    const batch = writeBatch(db);
    items.forEach((item, index) => {
      batch.update(doc(db, PROJECTS_COL, projectId, item.collectionName, item.id), { 'webCredit.order': index });
    });
    await batch.commit();
  },
};
