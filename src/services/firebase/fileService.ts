// ═══════════════════════════════════════════════════════
// Encuadre Prod. — File Service
// Subida y control de metadatos de archivos multimedia
// ═══════════════════════════════════════════════════════

import { db, storage } from './firebaseConfig';
import {
  collection,
  doc,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { MediaFile, MediaVersion, MediaSourceType, EmbedType } from '@/types';
import { mediaShareService } from './mediaShareService';

const PROJECTS_COL = 'projects';
const FILES_SUBCOL = 'mediaFiles';

export const fileService = {
  /** Subir un archivo multimedia a Firebase Storage y registrarlo en Firestore */
  uploadFile: async (
    projectId: string,
    fileBlob: Blob,
    fileName: string,
    folder = '',
    tags: string[] = [],
    userId: string
  ): Promise<MediaFile> => {
    const now = new Date();
    
    // 1. Subir archivo a Storage
    const storagePath = `projects/${projectId}/files/${folder ? folder + '/' : ''}${now.getTime()}_${fileName}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, fileBlob);
    const url = await getDownloadURL(storageRef);

    // Determinar tipo de archivo
    const mimeType = fileBlob.type || 'application/octet-stream';
    let type: MediaFile['type'] = 'other';
    if (mimeType.includes('image')) type = 'image';
    else if (mimeType.includes('video')) type = 'video';
    else if (mimeType.includes('audio')) type = 'audio';
    else if (mimeType.includes('pdf')) type = 'pdf';
    else if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('text')) type = 'document';

    // 2. Registrar en Firestore
    const fileDoc = {
      projectId,
      name: fileName,
      type,
      url,
      size: fileBlob.size,
      mimeType,
      folder,
      tags,
      uploadedBy: userId,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      createdBy: userId,
    };

    const docRef = await addDoc(
      collection(db, PROJECTS_COL, projectId, FILES_SUBCOL),
      fileDoc
    );

    return {
      id: docRef.id,
      ...fileDoc,
      createdAt: now,
      updatedAt: now,
    } as MediaFile;
  },

  /** Obtener el listado de archivos de un proyecto */
  getFiles: async (projectId: string): Promise<MediaFile[]> => {
    const q = query(
      collection(db, PROJECTS_COL, projectId, FILES_SUBCOL),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: (data.createdAt as Timestamp).toDate(),
        updatedAt: (data.updatedAt as Timestamp).toDate(),
      } as MediaFile;
    });
  },

  /** Eliminar un archivo físico de Storage y su registro en Firestore */
  deleteFile: async (projectId: string, fileId: string, fileUrl: string): Promise<void> => {
    // 1. Eliminar de Storage
    try {
      const fileRef = ref(storage, fileUrl);
      await deleteObject(fileRef);
    } catch (e) {
      console.warn('Error al eliminar archivo físico de Storage (o ya no existe):', e);
    }

    // 2. Eliminar de Firestore
    await deleteDoc(doc(db, PROJECTS_COL, projectId, FILES_SUBCOL, fileId));
  },

  /** Agregar una nueva versión hosteada a un archivo existente */
  addVersion: async (
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
    return mediaShareService.uploadVersion(
      projectId,
      fileId,
      fileBlob,
      fileName,
      label,
      versionNumber,
      userId,
      options
    );
  },

  /** Vincular una URL externa como nueva versión de un archivo */
  linkExternalUrl: async (
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
    return mediaShareService.addExternalVersion(
      projectId,
      fileId,
      externalUrl,
      label,
      versionNumber,
      userId,
      options
    );
  },
};
