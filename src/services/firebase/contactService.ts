// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Contact Service
// Gestión de la Libreta de Contactos (Actores y Ayudantes / Crew)
// ═══════════════════════════════════════════════════════

import { db } from './firebaseConfig';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { ContactProfile, CreateContactData, ContactCategory } from '@/types';
import { cleanUndefined } from '@/utils/clean';
import { projectService } from './projectService';

const CONTACTS_COL = 'contacts';

export const contactService = {
  /** Crear un nuevo perfil de actor o ayudante en la libreta central */
  createContact: async (data: CreateContactData, creatorId: string): Promise<string> => {
    const now = new Date();
    const docRef = await addDoc(
      collection(db, CONTACTS_COL),
      cleanUndefined({
        ...data,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
        createdBy: creatorId,
      })
    );
    return docRef.id;
  },

  /** Obtener lista de contactos, opcionalmente filtrados por categoría (actor | crew) */
  getContacts: async (category?: ContactCategory): Promise<ContactProfile[]> => {
    let q = query(collection(db, CONTACTS_COL), orderBy('name', 'asc'));
    if (category) {
      q = query(collection(db, CONTACTS_COL), where('category', '==', category), orderBy('name', 'asc'));
    }

    const snap = await getDocs(q);
    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
      } as ContactProfile;
    });
  },

  /** Obtener perfil detallado de un contacto */
  getContactById: async (contactId: string): Promise<ContactProfile | null> => {
    const docSnap = await getDoc(doc(db, CONTACTS_COL, contactId));
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
      updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
    } as ContactProfile;
  },

  /** Actualizar un contacto existente */
  updateContact: async (contactId: string, updates: Partial<ContactProfile>): Promise<void> => {
    const docRef = doc(db, CONTACTS_COL, contactId);
    await updateDoc(
      docRef,
      cleanUndefined({
        ...updates,
        updatedAt: Timestamp.fromDate(new Date()),
      })
    );
  },

  /** Eliminar un contacto de la libreta central */
  deleteContact: async (contactId: string): Promise<void> => {
    await deleteDoc(doc(db, CONTACTS_COL, contactId));
  },

  /**
   * Importar un contacto de la libreta central directamente a un proyecto específico.
   * Si es 'actor' lo agrega a talentProfiles, si es 'crew' a members.
   */
  importContactToProject: async (
    projectId: string,
    contact: ContactProfile,
    creatorId: string
  ): Promise<string> => {
    if (contact.category === 'actor') {
      return await projectService.addTalent(
        projectId,
        {
          name: contact.name,
          role: contact.role || 'Actor',
          characterName: '',
          email: contact.email,
          phone: contact.phone,
          agency: contact.agency,
          notes: contact.notes || '',
        },
        creatorId
      );
    } else {
      return await projectService.addMember(
        projectId,
        {
          name: contact.name,
          role: contact.role || 'Ayudante / Técnico',
          department: contact.department || 'Producción',
          email: contact.email,
          phone: contact.phone,
          permissions: [],
        },
        creatorId
      );
    }
  },
};
