// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Document Service
// Gestión de guiones, storyboards y control de versiones
// ═══════════════════════════════════════════════════════

import { db, storage } from './firebaseConfig';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ProductionDocument, CreateDocumentData, ScriptVersion, CreateVersionData } from '@/types';

const PROJECTS_COL = 'projects';
const DOCUMENTS_SUBCOL = 'documents';
const VERSIONS_SUBCOL = 'versions';

export const documentService = {
  /** Registrar un nuevo documento de producción */
  createDocument: async (
    projectId: string,
    data: CreateDocumentData,
    creatorId: string
  ): Promise<string> => {
    const now = new Date();
    const docRef = await addDoc(collection(db, PROJECTS_COL, projectId, DOCUMENTS_SUBCOL), {
      ...data,
      projectId,
      currentVersionId: '',
      versions: [],
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      createdBy: creatorId,
    });
    return docRef.id;
  },

  /** Obtener todos los documentos de un proyecto */
  getDocuments: async (projectId: string): Promise<ProductionDocument[]> => {
    const q = query(
      collection(db, PROJECTS_COL, projectId, DOCUMENTS_SUBCOL),
      orderBy('updatedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: (data.createdAt as Timestamp).toDate(),
        updatedAt: (data.updatedAt as Timestamp).toDate(),
      } as ProductionDocument;
    });
  },

  /** Subir un archivo físico (PDF/Word) a Firebase Storage y registrar nueva versión */
  uploadNewVersion: async (
    projectId: string,
    documentId: string,
    fileBlob: Blob,
    fileName: string,
    versionNumber: string,
    notes: string,
    tag: ScriptVersion['tag'],
    creatorId: string
  ): Promise<string> => {
    const now = new Date();
    
    // 1. Subir el archivo físico a Storage
    const storagePath = `projects/${projectId}/documents/${documentId}/${now.getTime()}_${fileName}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, fileBlob);
    const fileUrl = await getDownloadURL(storageRef);

    // 2. Registrar el documento de la versión en Firestore
    const versionDoc = {
      documentId,
      projectId,
      versionNumber,
      tag,
      notes,
      fileUrl,
      fileSize: fileBlob.size,
      mimeType: fileBlob.type || 'application/pdf',
      isLocked: false,
      createdAt: Timestamp.fromDate(now),
      createdBy: creatorId,
      metadata: {},
    };

    const versionRef = await addDoc(
      collection(db, PROJECTS_COL, projectId, DOCUMENTS_SUBCOL, documentId, VERSIONS_SUBCOL),
      versionDoc
    );

    // 3. Actualizar la referencia de la versión activa en el documento padre
    const docRef = doc(db, PROJECTS_COL, projectId, DOCUMENTS_SUBCOL, documentId);
    const docSnap = await getDoc(docRef);
    const docData = docSnap.data();
    const currentVersions = docData?.versions || [];

    await updateDoc(docRef, {
      currentVersionId: versionRef.id,
      versions: [...currentVersions, versionRef.id],
      updatedAt: Timestamp.fromDate(now),
    });

    return versionRef.id;
  },

  /** Obtener el historial de versiones de un documento (Git-like history) */
  getDocumentVersions: async (projectId: string, documentId: string): Promise<ScriptVersion[]> => {
    const q = query(
      collection(db, PROJECTS_COL, projectId, DOCUMENTS_SUBCOL, documentId, VERSIONS_SUBCOL),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: (data.createdAt as Timestamp).toDate(),
        lockedAt: data.lockedAt ? (data.lockedAt as Timestamp).toDate() : undefined,
      } as ScriptVersion;
    });
  },

  /** Revertir / Restaurar una versión del documento como la actual */
  revertToVersion: async (
    projectId: string,
    documentId: string,
    versionId: string
  ): Promise<void> => {
    const now = new Date();
    const docRef = doc(db, PROJECTS_COL, projectId, DOCUMENTS_SUBCOL, documentId);
    await updateDoc(docRef, {
      currentVersionId: versionId,
      updatedAt: Timestamp.fromDate(now),
    });
  },

  /** Bloquear/Desbloquear versión para evitar cambios o sobreescritura */
  toggleVersionLock: async (
    projectId: string,
    documentId: string,
    versionId: string,
    isLocked: boolean,
    userId: string
  ): Promise<void> => {
    const now = new Date();
    const versionRef = doc(
      db,
      PROJECTS_COL,
      projectId,
      DOCUMENTS_SUBCOL,
      documentId,
      VERSIONS_SUBCOL,
      versionId
    );

    await updateDoc(versionRef, {
      isLocked,
      lockedBy: isLocked ? userId : null,
      lockedAt: isLocked ? Timestamp.fromDate(now) : null,
    });
  },
};
