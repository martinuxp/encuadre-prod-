// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Activity Service
// Historial de cambios, logs y trazabilidad de acciones
// ═══════════════════════════════════════════════════════

import { db } from './firebaseConfig';
import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { ActivityLog } from '@/types';

const PROJECTS_COL = 'projects';
const ACTIVITY_SUBCOL = 'activityLog';

export const activityService = {
  /** Registrar una acción en la bitácora de actividad */
  logActivity: async (
    projectId: string | undefined,
    entityType: ActivityLog['entityType'],
    entityId: string,
    action: string,
    userId: string,
    userDisplayName: string,
    details?: Record<string, unknown>
  ): Promise<void> => {
    const now = new Date();
    const logDoc = {
      projectId,
      entityType,
      entityId,
      action,
      userId,
      userDisplayName,
      details: details || {},
      createdAt: Timestamp.fromDate(now),
    };

    if (projectId) {
      // Registrar log a nivel de subcolección de proyecto
      await addDoc(
        collection(db, PROJECTS_COL, projectId, ACTIVITY_SUBCOL),
        logDoc
      );
    } else {
      // Registrar log a nivel global si no aplica a proyecto específico
      await addDoc(collection(db, 'globalActivityLogs'), logDoc);
    }
  },

  /** Obtener el historial de actividad de un proyecto */
  getProjectLogs: async (projectId: string, limitCount = 50): Promise<ActivityLog[]> => {
    const q = query(
      collection(db, PROJECTS_COL, projectId, ACTIVITY_SUBCOL),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: (data.createdAt as Timestamp).toDate(),
      } as ActivityLog;
    });
  },
};
