// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Calendar Service
// Plan de rodaje, jornadas de filmación y eventos del proyecto
// ═══════════════════════════════════════════════════════

import { db } from './firebaseConfig';
import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { CalendarEvent } from '@/types';
import { cleanUndefined } from '@/utils/clean';

const PROJECTS_COL = 'projects';
const CALENDAR_SUBCOL = 'calendarEvents';

export const calendarService = {
  /** Crear un nuevo evento en el plan de rodaje */
  createEvent: async (
    projectId: string,
    event: Omit<CalendarEvent, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'createdBy'>,
    creatorId: string
  ): Promise<string> => {
    const now = new Date();
    const docRef = await addDoc(collection(db, PROJECTS_COL, projectId, CALENDAR_SUBCOL), cleanUndefined({
      ...event,
      projectId,
      startDate: Timestamp.fromDate(new Date(event.startDate)),
      endDate: Timestamp.fromDate(new Date(event.endDate)),
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      createdBy: creatorId,
    }));
    return docRef.id;
  },

  /** Obtener el plan de rodaje y calendario del proyecto */
  getEvents: async (projectId: string): Promise<CalendarEvent[]> => {
    const q = query(
      collection(db, PROJECTS_COL, projectId, CALENDAR_SUBCOL),
      orderBy('startDate', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startDate: (data.startDate as Timestamp).toDate(),
        endDate: (data.endDate as Timestamp).toDate(),
        createdAt: (data.createdAt as Timestamp).toDate(),
        updatedAt: (data.updatedAt as Timestamp).toDate(),
      } as CalendarEvent;
    });
  },

  /** Actualizar un evento de jornada */
  updateEvent: async (
    projectId: string,
    eventId: string,
    updates: Partial<CalendarEvent>
  ): Promise<void> => {
    const docRef = doc(db, PROJECTS_COL, projectId, CALENDAR_SUBCOL, eventId);
    const rawUpdates: any = { ...updates };
    
    if (updates.startDate) rawUpdates.startDate = Timestamp.fromDate(new Date(updates.startDate));
    if (updates.endDate) rawUpdates.endDate = Timestamp.fromDate(new Date(updates.endDate));
    
    await updateDoc(docRef, cleanUndefined({
      ...rawUpdates,
      updatedAt: Timestamp.fromDate(new Date()),
    }));
  },

  /** Eliminar un evento */
  deleteEvent: async (projectId: string, eventId: string): Promise<void> => {
    await deleteDoc(doc(db, PROJECTS_COL, projectId, CALENDAR_SUBCOL, eventId));
  },
};
