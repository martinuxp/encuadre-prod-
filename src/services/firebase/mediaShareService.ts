// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Media Share Service
// Gestión de versiones de archivos y links públicos brandeados
// ═══════════════════════════════════════════════════════

import { db, storage } from './firebaseConfig';
import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import {
  MediaVersion,
  SharedMediaLink,
  MediaType,
  MediaSourceType,
  EmbedType,
} from '@/types';
import { uuidv4 } from '@/utils/uuid';
import { cleanUndefined } from '@/utils/clean';

const PROJECTS_COL = 'projects';
const FILES_SUBCOL = 'mediaFiles';
const VERSIONS_SUBCOL = 'versions';
const SHARES_COL = 'mediaShares';

// ── Helpers ────────────────────────────────────────────

/** Detecta el tipo de embed a partir de una URL externa */
export const detectEmbedType = (url: string): EmbedType => {
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
  if (/vimeo\.com/.test(url)) return 'vimeo';
  if (/drive\.google\.com/.test(url)) return 'gdrive';
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) return 'direct';
  return 'other';
};

/** Convierte una URL de YouTube o Vimeo a URL de embed */
export const toEmbedUrl = (url: string, embedType: EmbedType): string => {
  if (embedType === 'youtube') {
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match) return `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1`;
  }
  if (embedType === 'vimeo') {
    const match = url.match(/vimeo\.com\/(\d+)/);
    if (match) return `https://player.vimeo.com/video/${match[1]}?dnt=1`;
  }
  if (embedType === 'gdrive') {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  return url;
};

/** Detecta el MediaType desde mimeType o URL */
export const detectMediaType = (mimeType?: string, url?: string): MediaType => {
  if (mimeType) {
    if (mimeType.includes('video')) return 'video';
    if (mimeType.includes('image')) return 'image';
    if (mimeType.includes('audio')) return 'audio';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('text')) return 'document';
  }
  if (url) {
    const embed = detectEmbedType(url);
    if (embed === 'youtube' || embed === 'vimeo') return 'video';
    if (/\.(pdf)(\?|$)/i.test(url)) return 'pdf';
    if (/\.(mp4|webm|ogg|mov|avi)(\?|$)/i.test(url)) return 'video';
    if (/\.(jpg|jpeg|png|gif|webp|avif)(\?|$)/i.test(url)) return 'image';
  }
  return 'other';
};

// ── Servicio ───────────────────────────────────────────

export const mediaShareService = {
  // ── Versiones ─────────────────────────────────────────

  /** Crear una versión hosteada (sube a Storage) */
  uploadVersion: async (
    projectId: string,
    fileId: string,
    fileBlob: Blob,
    fileName: string,
    label: string,
    versionNumber: string,
    userId: string,
    options: {
      notes?: string;
      allowDownload?: boolean;
      watermarkEnabled?: boolean;
      qualityLowBlob?: Blob;
      qualityLowFileName?: string;
    } = {}
  ): Promise<MediaVersion> => {
    const now = new Date();
    const storagePath = `projects/${projectId}/files/versions/${now.getTime()}_${fileName}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, fileBlob);
    const url = await getDownloadURL(storageRef);

    const mimeType = fileBlob.type || 'application/octet-stream';

    // Subir calidad baja si se proporcionó
    let qualityLowUrl: string | undefined;
    if (options.qualityLowBlob && options.qualityLowFileName) {
      const lowPath = `projects/${projectId}/files/versions/low_${now.getTime()}_${options.qualityLowFileName}`;
      const lowRef = ref(storage, lowPath);
      await uploadBytes(lowRef, options.qualityLowBlob);
      qualityLowUrl = await getDownloadURL(lowRef);
    }

    const versionDoc = cleanUndefined({
      fileId,
      projectId,
      label,
      versionNumber,
      sourceType: 'hosted' as MediaSourceType,
      url,
      embedType: 'direct' as EmbedType,
      size: fileBlob.size,
      mimeType,
      notes: options.notes,
      isLatest: true,
      allowDownload: options.allowDownload ?? true,
      watermarkEnabled: options.watermarkEnabled ?? false,
      qualityLowUrl,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      createdBy: userId,
    });

    await mediaShareService._unsetPreviousLatest(projectId, fileId);

    const docRef = await addDoc(
      collection(db, PROJECTS_COL, projectId, FILES_SUBCOL, fileId, VERSIONS_SUBCOL),
      versionDoc
    );

    await mediaShareService._updateFileVersionCount(projectId, fileId);

    return {
      id: docRef.id,
      ...versionDoc,
      createdAt: now,
      updatedAt: now,
    } as MediaVersion;
  },

  /** Crear una versión desde URL externa (Vimeo, YouTube, Drive, etc.) */
  addExternalVersion: async (
    projectId: string,
    fileId: string,
    externalUrl: string,
    label: string,
    versionNumber: string,
    userId: string,
    options: {
      notes?: string;
      allowDownload?: boolean;
      watermarkEnabled?: boolean;
    } = {}
  ): Promise<MediaVersion> => {
    const now = new Date();
    const embedType = detectEmbedType(externalUrl);

    const versionDoc = cleanUndefined({
      fileId,
      projectId,
      label,
      versionNumber,
      sourceType: 'external' as MediaSourceType,
      url: externalUrl,
      embedType,
      notes: options.notes,
      isLatest: true,
      allowDownload: options.allowDownload ?? false,
      watermarkEnabled: options.watermarkEnabled ?? false,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      createdBy: userId,
    });

    await mediaShareService._unsetPreviousLatest(projectId, fileId);

    const docRef = await addDoc(
      collection(db, PROJECTS_COL, projectId, FILES_SUBCOL, fileId, VERSIONS_SUBCOL),
      versionDoc
    );

    await mediaShareService._updateFileVersionCount(projectId, fileId);

    return {
      id: docRef.id,
      ...versionDoc,
      createdAt: now,
      updatedAt: now,
    } as MediaVersion;
  },

  /** Obtener todas las versiones de un archivo */
  getVersions: async (projectId: string, fileId: string): Promise<MediaVersion[]> => {
    const q = query(
      collection(db, PROJECTS_COL, projectId, FILES_SUBCOL, fileId, VERSIONS_SUBCOL),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: (data.createdAt as Timestamp).toDate(),
        updatedAt: (data.updatedAt as Timestamp).toDate(),
      } as MediaVersion;
    });
  },

  /** Eliminar una versión */
  deleteVersion: async (
    projectId: string,
    fileId: string,
    versionId: string,
    version: MediaVersion
  ): Promise<void> => {
    // Eliminar de Storage si es hosted
    if (version.sourceType === 'hosted') {
      try {
        await deleteObject(ref(storage, version.url));
      } catch (_) {}
    }
    // Eliminar share token si existe
    if (version.shareToken) {
      try {
        await deleteDoc(doc(db, SHARES_COL, version.shareToken));
      } catch (_) {}
    }
    await deleteDoc(
      doc(db, PROJECTS_COL, projectId, FILES_SUBCOL, fileId, VERSIONS_SUBCOL, versionId)
    );
    await mediaShareService._updateFileVersionCount(projectId, fileId);
  },

  // ── Links Públicos ─────────────────────────────────────

  /** Generar un link público con token UUID para compartir una versión */
  generateShareLink: async (
    projectId: string,
    fileId: string,
    versionId: string,
    version: MediaVersion,
    projectName: string,
    options: {
      password?: string;
      expiresAt?: Date;
      allowDownload?: boolean;
      watermarkEnabled?: boolean;
    } = {}
  ): Promise<SharedMediaLink> => {
    const now = new Date();
    const token = uuidv4();
    const mediaType = detectMediaType(version.mimeType, version.url);

    const shareDoc = cleanUndefined({
      projectId,
      fileId,
      versionId,
      token,
      displayName: `${version.label} (${version.versionNumber})`,
      projectName,
      password: options.password,
      expiresAt: options.expiresAt ? Timestamp.fromDate(options.expiresAt) : undefined,
      isActive: true,
      viewCount: 0,
      allowDownload: options.allowDownload ?? version.allowDownload,
      watermarkEnabled: options.watermarkEnabled ?? version.watermarkEnabled,
      sourceType: version.sourceType,
      url: version.url,
      embedType: version.embedType,
      mimeType: version.mimeType,
      mediaType,
      qualityLowUrl: version.qualityLowUrl,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      createdBy: 'admin',
    });

    await addDoc(collection(db, SHARES_COL), shareDoc);

    // Guardar el shareToken en la versión
    await updateDoc(
      doc(db, PROJECTS_COL, projectId, FILES_SUBCOL, fileId, VERSIONS_SUBCOL, versionId),
      { shareToken: token, updatedAt: Timestamp.fromDate(now) }
    );

    return {
      id: token,
      ...shareDoc,
      createdAt: now,
      updatedAt: now,
      expiresAt: options.expiresAt,
    } as SharedMediaLink;
  },

  /** Obtener datos de un share por token (para el visor público) */
  getShareByToken: async (token: string): Promise<SharedMediaLink | null> => {
    const q = query(
      collection(db, SHARES_COL),
      where('token', '==', token),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: (data.createdAt as Timestamp).toDate(),
      updatedAt: (data.updatedAt as Timestamp).toDate(),
      expiresAt: data.expiresAt ? (data.expiresAt as Timestamp).toDate() : undefined,
    } as SharedMediaLink;
  },

  /** Incrementar el contador de vistas de un share */
  incrementShareView: async (shareId: string, currentCount: number): Promise<void> => {
    await updateDoc(doc(db, SHARES_COL, shareId), {
      viewCount: currentCount + 1,
      updatedAt: Timestamp.fromDate(new Date()),
    });
  },

  /** Compartir un archivo de Drive directamente (sin version) */
  shareDriveFile: async (
    projectId: string,
    driveFile: { id: string; name: string; mimeType: string; embedUrl: string },
    projectName: string,
    options: {
      password?: string;
      expiresAt?: Date;
      allowDownload?: boolean;
      watermarkEnabled?: boolean;
    } = {}
  ): Promise<SharedMediaLink> => {
    const now = new Date();
    const token = uuidv4();
    const mediaType = detectMediaType(driveFile.mimeType, driveFile.embedUrl);

    const shareDoc = cleanUndefined({
      projectId,
      fileId: `drive_${driveFile.id}`,
      versionId: `drive_${driveFile.id}`,
      token,
      displayName: driveFile.name,
      projectName,
      password: options.password,
      expiresAt: options.expiresAt ? Timestamp.fromDate(options.expiresAt) : undefined,
      isActive: true,
      viewCount: 0,
      allowDownload: options.allowDownload ?? false,
      watermarkEnabled: options.watermarkEnabled ?? false,
      sourceType: 'external' as MediaSourceType,
      url: driveFile.embedUrl,
      embedType: 'gdrive' as EmbedType,
      mimeType: driveFile.mimeType,
      mediaType,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      createdBy: 'admin',
    });

    await addDoc(collection(db, SHARES_COL), shareDoc);

    return {
      id: token,
      ...shareDoc,
      createdAt: now,
      updatedAt: now,
      expiresAt: options.expiresAt,
    } as SharedMediaLink;
  },

  /** Compartir una carpeta completa de Drive (sin version) */
  shareDriveFolder: async (
    projectId: string,
    folderId: string,
    folderName: string,
    projectName: string,
    options: {
      password?: string;
      expiresAt?: Date;
      watermarkEnabled?: boolean;
    } = {}
  ): Promise<SharedMediaLink> => {
    const now = new Date();
    const token = uuidv4();

    const shareDoc = cleanUndefined({
      projectId,
      fileId: `drive_folder_${folderId}`,
      versionId: `drive_folder_${folderId}`,
      token,
      displayName: folderName,
      projectName,
      password: options.password,
      expiresAt: options.expiresAt ? Timestamp.fromDate(options.expiresAt) : undefined,
      isActive: true,
      viewCount: 0,
      allowDownload: false,
      watermarkEnabled: options.watermarkEnabled ?? false,
      sourceType: 'drive_folder' as MediaSourceType,
      url: `https://drive.google.com/drive/folders/${folderId}`,
      mediaType: 'other' as MediaType,
      folderId,
      folderName,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      createdBy: 'admin',
    });

    await addDoc(collection(db, SHARES_COL), shareDoc);

    return {
      id: token,
      ...shareDoc,
      createdAt: now,
      updatedAt: now,
      expiresAt: options.expiresAt,
    } as SharedMediaLink;
  },

  /** Obtener todos los shares de un proyecto (incluyendo crudos de Drive) */
  getProjectShares: async (projectId: string): Promise<SharedMediaLink[]> => {
    const q = query(
      collection(db, SHARES_COL),
      where('projectId', '==', projectId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: (data.createdAt as Timestamp).toDate(),
        updatedAt: (data.updatedAt as Timestamp).toDate(),
        expiresAt: data.expiresAt ? (data.expiresAt as Timestamp).toDate() : undefined,
      } as SharedMediaLink;
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  /** Revocar (desactivar) un link de share */
  revokeShareLink: async (shareId: string): Promise<void> => {
    await updateDoc(doc(db, SHARES_COL, shareId), {
      isActive: false,
      updatedAt: Timestamp.fromDate(new Date()),
    });
  },

  // ── Helpers Internos ────────────────────────────────────

  _unsetPreviousLatest: async (projectId: string, fileId: string): Promise<void> => {
    const q = query(
      collection(db, PROJECTS_COL, projectId, FILES_SUBCOL, fileId, VERSIONS_SUBCOL),
      where('isLatest', '==', true)
    );
    const snap = await getDocs(q);
    const updates = snap.docs.map((d) =>
      updateDoc(d.ref, { isLatest: false, updatedAt: Timestamp.fromDate(new Date()) })
    );
    await Promise.all(updates);
  },

  _updateFileVersionCount: async (projectId: string, fileId: string): Promise<void> => {
    const snap = await getDocs(
      collection(db, PROJECTS_COL, projectId, FILES_SUBCOL, fileId, VERSIONS_SUBCOL)
    );
    await updateDoc(doc(db, PROJECTS_COL, projectId, FILES_SUBCOL, fileId), {
      hasVersions: snap.size > 0,
      versionCount: snap.size,
      updatedAt: Timestamp.fromDate(new Date()),
    });
  },
};
