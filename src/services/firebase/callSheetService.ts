// ═══════════════════════════════════════════════════════
// Encuadre Prod. — CallSheet Service (Funcionalidad Crítica)
// Gestión de citaciones individuales y tokens públicos
// ═══════════════════════════════════════════════════════

import { db } from './firebaseConfig';
import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { CallSheetAccess, CreateCallSheetData } from '@/types';
import { uuidv4 } from '@/utils/uuid'; // Crearemos esta función de utilidad

const PROJECTS_COL = 'projects';
const CALLSHEET_SUBCOL = 'callSheetAccess';

export const callSheetService = {
  /** Generar un link de llamado individual por participante */
  generateCallSheet: async (
    projectId: string,
    data: CreateCallSheetData,
    creatorId: string
  ): Promise<CallSheetAccess> => {
    const now = new Date();
    const token = uuidv4(); // Generar UUID único y seguro

    const callDoc = {
      ...data,
      projectId,
      token,
      status: 'pending' as const,
      isActive: true,
      viewCount: 0,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      createdBy: creatorId,
      callDate: Timestamp.fromDate(new Date(data.callDate)),
    };

    // Filtra las propiedades undefined para que no rompa Firestore
    const cleanUndefined = (obj: any): any => {
      const newObj = { ...obj };
      Object.keys(newObj).forEach((key) => {
        if (newObj[key] === undefined) {
          delete newObj[key];
        } else if (newObj[key] !== null && typeof newObj[key] === 'object' && !(newObj[key] instanceof Date) && !(newObj[key] instanceof Timestamp)) {
          newObj[key] = cleanUndefined(newObj[key]);
        }
      });
      return newObj;
    };

    const docRef = await addDoc(
      collection(db, PROJECTS_COL, projectId, CALLSHEET_SUBCOL),
      cleanUndefined(callDoc)
    );

    return {
      id: docRef.id,
      ...callDoc,
      callDate: new Date(data.callDate),
      createdAt: now,
      updatedAt: now,
    } as CallSheetAccess;
  },

  /** Obtener citación por token UUID (Acceso Público sin auth) */
  getCallSheetByToken: async (token: string): Promise<CallSheetAccess | null> => {
    // Buscar en todos los proyectos
    // Nota: Como Firestore no permite colecciones del mismo nombre en consultas globales
    // sin un Collection Group Index, buscaremos recorriendo proyectos o usando collectionGroup si aplica.
    // Para simplificar y hacerlo ultra-estable en Firestore sin indexación compleja inicial,
    // realizaremos un Query de Colecciones Group si está habilitado, o buscaremos mediante
    // una colección raíz o pasándole el projectId en la URL.
    // Sin embargo, Firestore permite consultas collectionGroup de forma sencilla:
    // query(collectionGroup(db, 'callSheetAccess'), where('token', '==', token))
    // Implementémoslo con un patrón de búsqueda alternativo: pasaremos el proyecto en el estado
    // o realizaremos una consulta group.
    
    // Para evitar obligar al usuario a configurar índices de Collection Group inmediatamente en Firebase,
    // guardaremos una referencia en una colección raíz auxiliar o haremos una consulta de grupo.
    // Usaremos collectionGroup de Firestore que es el estándar.
    // NOTA: Para no depender de índices iniciales pesados, la URL final puede ser /call/[token]?p=[projectId]
    // o simplemente resolvemos la búsqueda mediante Collection Group.
    // Usemos la búsqueda en la subcolección de proyectos.
    // Primero, intentemos consultar usando collectionGroup, que funciona directamente para búsquedas de igualdad simple.
    const { collectionGroup } = await import('firebase/firestore');
    const q = query(collectionGroup(db, CALLSHEET_SUBCOL), where('token', '==', token), limit(1));
    const snap = await getDocs(q);
    
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    const data = docSnap.data();

    return {
      id: docSnap.id,
      ...data,
      callDate: (data.callDate as Timestamp).toDate(),
      createdAt: (data.createdAt as Timestamp).toDate(),
      updatedAt: (data.updatedAt as Timestamp).toDate(),
      confirmedAt: data.confirmedAt ? (data.confirmedAt as Timestamp).toDate() : undefined,
    } as CallSheetAccess;
  },

  /** Obtener todas las citaciones asociadas a un proyecto */
  getProjectCallSheets: async (projectId: string): Promise<CallSheetAccess[]> => {
    const q = query(
      collection(db, PROJECTS_COL, projectId, CALLSHEET_SUBCOL),
      orderBy('callDate', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        callDate: (data.callDate as Timestamp).toDate(),
        createdAt: (data.createdAt as Timestamp).toDate(),
        updatedAt: (data.updatedAt as Timestamp).toDate(),
        confirmedAt: data.confirmedAt ? (data.confirmedAt as Timestamp).toDate() : undefined,
      } as CallSheetAccess;
    });
  },

  /** Confirmar asistencia al llamado (desde la vista pública) */
  confirmAttendance: async (projectId: string, callSheetId: string): Promise<void> => {
    const now = new Date();
    const docRef = doc(db, PROJECTS_COL, projectId, CALLSHEET_SUBCOL, callSheetId);
    await updateDoc(docRef, {
      status: 'confirmed',
      confirmedAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    });
  },

  /** Registrar una visualización del llamado */
  incrementViewCount: async (projectId: string, callSheetId: string, currentViews: number): Promise<void> => {
    const docRef = doc(db, PROJECTS_COL, projectId, CALLSHEET_SUBCOL, callSheetId);
    await updateDoc(docRef, {
      viewCount: currentViews + 1,
    });
  },
};
