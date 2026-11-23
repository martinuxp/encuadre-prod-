// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Utilidades de la Web pública
// Slug, YouTube, contraste, paleta e imágenes (el procesado de imágenes solo corre en web)
// ═══════════════════════════════════════════════════════

import { Platform } from 'react-native';

export const HERO_MAX_WIDTH = 2400;
export const HERO_THUMB_WIDTH = 1200;
export const WEBP_QUALITY = 0.82;
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

export const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const isValidSlug = (slug: string): boolean => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);

export const isHexColor = (value: string): boolean => /^#[0-9a-fA-F]{6}$/.test(value);

/** Acepta un ID de 11 caracteres o cualquier URL de YouTube y devuelve el ID */
export const extractYoutubeId = (input: string): string | undefined => {
  const value = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return url.pathname.slice(1).split('/')[0] || undefined;
    if (host.endsWith('youtube.com')) {
      const v = url.searchParams.get('v');
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
      const match = url.pathname.match(/\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/);
      if (match) return match[1];
    }
  } catch {
    /* no es una URL */
  }
  return undefined;
};

// ── Color ──

const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const rgbToHex = (r: number, g: number, b: number): string =>
  '#' + [r, g, b].map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('');

const luminance = (hex: string): number => {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrastRatio = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** Texto `#FFFFFF` o `#000000` según el que mejor contraste con el fondo (siempre ≥ 4.5:1) */
export const readableInk = (bg: string): string =>
  contrastRatio(bg, '#FFFFFF') >= contrastRatio(bg, '#000000') ? '#FFFFFF' : '#000000';

const saturation = (hex: string): number => {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
};

const colorDistance = (a: string, b: string): number => {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
};

export interface WebPalette {
  bg: string;
  ink: string;
  accent: string;
  soft: string;
}

/** Elige la paleta a partir de los colores dominantes ya cuantizados (ordenados por población) */
export const paletteFromDominant = (dominant: string[]): WebPalette => {
  const list = dominant.length ? dominant : ['#222222'];
  const bg = list[0];
  const distinct = list.filter((c) => colorDistance(c, bg) > 60);
  const accent = [...distinct].sort((a, b) => saturation(b) - saturation(a))[0] || bg;
  const soft = distinct.filter((c) => c !== accent).sort((a, b) => luminance(b) - luminance(a))[0] || accent;
  return { bg, ink: readableInk(bg), accent, soft };
};

// ── Imágenes (solo web: canvas) ──

const isWeb = Platform.OS === 'web';

const loadBitmap = async (blob: Blob): Promise<ImageBitmap | HTMLImageElement> => {
  if (typeof createImageBitmap === 'function') return createImageBitmap(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    img.src = URL.createObjectURL(blob);
  });
};

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> =>
  new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo codificar la imagen.'))), type, quality));

const resizeToWebp = async (bitmap: ImageBitmap | HTMLImageElement, maxWidth: number): Promise<Blob> => {
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible.');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await canvasToBlob(canvas, 'image/webp', WEBP_QUALITY);
  if (blob.type !== 'image/webp') throw new Error('Este navegador no puede exportar WebP.');
  return blob;
};

export const GALLERY_MAX_SIDE = 2400;
export const GALLERY_THUMB_SIDE = 900;
export const GALLERY_MAX_PHOTOS = 60;
export const GALLERY_CAPTION_MAX = 140;

/** Redimensiona por el lado largo y exporta WebP, devolviendo las medidas finales */
const resizeLongSideToWebp = async (bitmap: ImageBitmap | HTMLImageElement, maxSide: number): Promise<{ blob: Blob; width: number; height: number }> => {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible.');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await canvasToBlob(canvas, 'image/webp', WEBP_QUALITY);
  if (blob.type !== 'image/webp') throw new Error('Este navegador no puede exportar WebP.');
  return { blob, width: canvas.width, height: canvas.height };
};

export interface ProcessedGalleryPhoto {
  large: Blob;
  thumb: Blob;
  width: number;
  height: number;
}

/** Foto de galería: WebP ~82 de máx. 2400 px por el lado largo + miniatura de 900 px. Solo web. */
export const processGalleryImage = async (blob: Blob): Promise<ProcessedGalleryPhoto> => {
  if (!isWeb) throw new Error('La galería se edita desde la versión web del panel.');
  if (!blob.type.startsWith('image/')) throw new Error('El archivo no es una imagen.');
  const bitmap = await loadBitmap(blob);
  const [large, thumb] = await Promise.all([resizeLongSideToWebp(bitmap, GALLERY_MAX_SIDE), resizeLongSideToWebp(bitmap, GALLERY_THUMB_SIDE)]);
  return { large: large.blob, thumb: thumb.blob, width: large.width, height: large.height };
};

/** URL pública de un archivo de Storage bajo web/** (lectura pública en las reglas) */
export const publicStorageUrl = (bucket: string, path: string): string =>
  `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;

export interface ProcessedHero {
  hero: Blob;
  thumb: Blob;
  ext: 'webp' | 'jpg' | 'png';
}

/** Foto principal: máx. 2400 px, WebP calidad ~82, más miniatura de 1200 px. En nativo se sube tal cual. */
export const processHeroImage = async (blob: Blob): Promise<ProcessedHero> => {
  if (!isWeb) {
    const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
    return { hero: blob, thumb: blob, ext };
  }
  const bitmap = await loadBitmap(blob);
  const [hero, thumb] = await Promise.all([resizeToWebp(bitmap, HERO_MAX_WIDTH), resizeToWebp(bitmap, HERO_THUMB_WIDTH)]);
  return { hero, thumb, ext: 'webp' };
};

export const logoExtension = (blob: Blob): 'png' | 'svg' | 'webp' | null => {
  if (blob.type === 'image/png') return 'png';
  if (blob.type === 'image/svg+xml') return 'svg';
  if (blob.type === 'image/webp') return 'webp';
  return null;
};

/** Colores dominantes de una imagen, ordenados por población (cuantizados a 4 bits por canal) */
export const dominantColors = async (blob: Blob, count = 8): Promise<string[]> => {
  if (!isWeb) throw new Error('Sacar colores de la foto solo está disponible en la versión web.');
  const bitmap = await loadBitmap(blob);
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = Math.max(1, Math.round((bitmap.height / bitmap.width) * size));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas no disponible.');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
    const bucket = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0 };
    bucket.r += data[i];
    bucket.g += data[i + 1];
    bucket.b += data[i + 2];
    bucket.n += 1;
    buckets.set(key, bucket);
  }
  return [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, count)
    .map((b) => rgbToHex(b.r / b.n, b.g / b.n, b.b / b.n));
};

/** Descarga una URI (blob:, file:, https:) como Blob */
export const uriToBlob = async (uri: string): Promise<Blob> => (await fetch(uri)).blob();
