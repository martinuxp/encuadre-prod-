// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Project Service
// Gestión CRUD de proyectos y asignaciones
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
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { Project, CreateProjectData, ProjectMember, TalentProfile } from '@/types';
import { cleanUndefined } from '@/utils/clean';

const PROJECTS_COL = 'projects';

export const projectService = {
  /** Crear un nuevo proyecto audiovisual */
  createProject: async (data: CreateProjectData, creatorId: string): Promise<string> => {
    const now = new Date();
    const docRef = await addDoc(collection(db, PROJECTS_COL), cleanUndefined({
      ...data,
      status: data.status || 'draft',
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      createdBy: creatorId,
    }));
    return docRef.id;
  },

  /** Obtener un proyecto por su ID */
  getProjectById: async (projectId: string): Promise<Project | null> => {
    const docSnap = await getDoc(doc(db, PROJECTS_COL, projectId));
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      startDate: (data.startDate as Timestamp).toDate(),
      endDate: data.endDate ? (data.endDate as Timestamp).toDate() : undefined,
      createdAt: (data.createdAt as Timestamp).toDate(),
      updatedAt: (data.updatedAt as Timestamp).toDate(),
    } as Project;
  },

  /** Obtener todos los proyectos (no archivados por defecto) */
  getProjects: async (includeArchived = false): Promise<Project[]> => {
    const q = query(collection(db, PROJECTS_COL), orderBy('createdAt', 'desc'));
    const querySnap = await getDocs(q);
    const projects = querySnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startDate: (data.startDate as Timestamp).toDate(),
        endDate: data.endDate ? (data.endDate as Timestamp).toDate() : undefined,
        createdAt: (data.createdAt as Timestamp).toDate(),
        updatedAt: (data.updatedAt as Timestamp).toDate(),
      } as Project;
    });
    if (includeArchived) return projects;
    return projects.filter((p) => p.status !== 'archived');
  },

  /** Actualizar datos de un proyecto */
  updateProject: async (projectId: string, updates: Partial<Project>): Promise<void> => {
    const docRef = doc(db, PROJECTS_COL, projectId);
    await updateDoc(docRef, cleanUndefined({
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    }));
  },

  /** Cambiar estado del proyecto (ej: rodaje, archivado) */
  updateProjectStatus: async (projectId: string, status: Project['status']): Promise<void> => {
    await projectService.updateProject(projectId, { status });
  },

  // ── Gestión de Miembros Técnicos (Crew Subcollection) ──

  addMember: async (projectId: string, member: Omit<ProjectMember, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'createdBy'>, creatorId: string): Promise<string> => {
    const now = new Date();
    const docRef = await addDoc(collection(db, PROJECTS_COL, projectId, 'members'), cleanUndefined({
      ...member,
      projectId,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      createdBy: creatorId,
    }));
    return docRef.id;
  },

  getMembers: async (projectId: string): Promise<ProjectMember[]> => {
    const q = query(collection(db, PROJECTS_COL, projectId, 'members'), orderBy('name', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: (data.createdAt as Timestamp).toDate(),
        updatedAt: (data.updatedAt as Timestamp).toDate(),
      } as ProjectMember;
    });
  },

  updateMember: async (projectId: string, memberId: string, updates: Partial<Omit<ProjectMember, 'id' | 'projectId' | 'createdAt' | 'createdBy'>>): Promise<void> => {
    await updateDoc(doc(db, PROJECTS_COL, projectId, 'members', memberId), cleanUndefined({
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    }));
  },

  removeMember: async (projectId: string, memberId: string): Promise<void> => {
    await deleteDoc(doc(db, PROJECTS_COL, projectId, 'members', memberId));
  },

  // ── Gestión de Talentos (Talent Subcollection) ──

  addTalent: async (projectId: string, talent: Omit<TalentProfile, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'createdBy'>, creatorId: string): Promise<string> => {
    const now = new Date();
    const docRef = await addDoc(collection(db, PROJECTS_COL, projectId, 'talentProfiles'), cleanUndefined({
      ...talent,
      projectId,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      createdBy: creatorId,
    }));
    return docRef.id;
  },

  getTalents: async (projectId: string): Promise<TalentProfile[]> => {
    const q = query(collection(db, PROJECTS_COL, projectId, 'talentProfiles'), orderBy('name', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: (data.createdAt as Timestamp).toDate(),
        updatedAt: (data.updatedAt as Timestamp).toDate(),
      } as TalentProfile;
    });
  },

  updateTalent: async (projectId: string, talentId: string, updates: Partial<Omit<TalentProfile, 'id' | 'projectId' | 'createdAt' | 'createdBy'>>): Promise<void> => {
    await updateDoc(doc(db, PROJECTS_COL, projectId, 'talentProfiles', talentId), cleanUndefined({
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    }));
  },

  removeTalent: async (projectId: string, talentId: string): Promise<void> => {
    await deleteDoc(doc(db, PROJECTS_COL, projectId, 'talentProfiles', talentId));
  },
};
