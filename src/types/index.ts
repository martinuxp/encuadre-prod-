// ═══════════════════════════════════════════════════════
// Encuadre Prod. — TypeScript Models
// Modelos de datos para Firebase Firestore
// ═══════════════════════════════════════════════════════

// ── Enums ──

export type ProductionType =
  | 'film'
  | 'tv'
  | 'commercial'
  | 'music_video'
  | 'photography'
  | 'corporate'
  | 'documentary'
  | 'other';

export type ProjectStatus =
  | 'draft'
  | 'pre_production'
  | 'production'
  | 'post_production'
  | 'completed'
  | 'archived';

export type DocumentType =
  | 'script'
  | 'callsheet'
  | 'budget'
  | 'contract'
  | 'storyboard'
  | 'shot_list'
  | 'other';

export type DocumentStatus =
  | 'draft'
  | 'review'
  | 'approved'
  | 'final'
  | 'archived';

export type VersionTag =
  | 'draft'
  | 'review'
  | 'approved'
  | 'final';

export type CallSheetStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled';

export type TaskStatus =
  | 'todo'
  | 'in_progress'
  | 'review'
  | 'done';

export type TaskPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent';

export type MediaType =
  | 'video'
  | 'image'
  | 'audio'
  | 'document'
  | 'pdf'
  | 'other';

export type CalendarEventType =
  | 'shoot'
  | 'meeting'
  | 'rehearsal'
  | 'delivery'
  | 'milestone'
  | 'other';

export type CalendarEventStatus =
  | 'scheduled'
  | 'confirmed'
  | 'cancelled'
  | 'completed';

export type UserRole =
  | 'superadmin'
  | 'admin'
  | 'producer'
  | 'viewer';

export type ParticipantType =
  | 'talent'
  | 'crew';

export type NotificationType =
  | 'info'
  | 'warning'
  | 'success'
  | 'error';

// ── Interfaces Base ──

/** Campos comunes a todas las entidades */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/** Campos para entidades vinculadas a un proyecto */
export interface ProjectEntity extends BaseEntity {
  projectId: string;
}

// ── Entidades Principales ──

/** Usuario administrador del sistema */
export interface User extends BaseEntity {
  clerkId: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  metadata: Record<string, unknown>;
}

/** Proyecto audiovisual */
export interface Project extends BaseEntity {
  name: string;
  description: string;
  type: ProductionType;
  status: ProjectStatus;
  startDate: Date;
  endDate?: Date;
  coverImage?: string;
  responsibleId: string;
  templateId?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  /** ID de la carpeta de Google Drive para crudos */
  driveFolderId?: string;
}

/** Miembro del equipo técnico (Crew) */
export interface ProjectMember extends ProjectEntity {
  userId?: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  department: string;
  permissions: Permission[];
}

/** Perfil de talento / elenco */
export interface TalentProfile extends ProjectEntity {
  name: string;
  role: string;
  characterName?: string;
  email?: string;
  phone?: string;
  agency?: string;
  notes: string;
}

/** Ubicación geográfica para el set */
export interface SetLocation {
  name: string;
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  mapUrl?: string;
}

/** Contacto de producción en el set */
export interface ProductionContact {
  name: string;
  phone: string;
  email?: string;
}

/**
 * Link individual por participante (Call Sheet Access)
 * Funcionalidad crítica principal
 */
export interface CallSheetAccess extends ProjectEntity {
  participantId: string;
  participantType: ParticipantType;
  token: string;
  slug?: string;

  // Información del llamado
  callDate: Date;
  callTime: string;
  arrivalTime: string;
  location: SetLocation;

  // Instrucciones
  role: string;
  costume?: string;
  props?: string[];
  instructions: string;
  notes?: string;

  // Contacto
  productionContact: ProductionContact;

  // Estado y control
  status: CallSheetStatus;
  expiresAt?: Date;
  isActive: boolean;
  viewCount: number;
  confirmedAt?: Date;

  // Adjuntos
  attachments: string[];
}

/** Documento de producción */
export interface ProductionDocument extends ProjectEntity {
  name: string;
  type: DocumentType;
  description?: string;
  currentVersionId: string;
  versions: string[];
  tags: string[];
  status: DocumentStatus;
}

/** Versión de un guión o documento (control de versiones tipo Git) */
export interface ScriptVersion extends BaseEntity {
  documentId: string;
  projectId: string;
  versionNumber: string;
  tag: VersionTag;
  notes: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  /** Archivo fuente de Encuadre Script (.encdre) publicado junto al PDF */
  sourceFileUrl?: string;
  sourceFileName?: string;
  sourceFileSize?: number;
  isLocked: boolean;
  lockedBy?: string;
  lockedAt?: Date;
  parentVersionId?: string;
  metadata: Record<string, unknown>;
}

/** Evento del calendario / plan de rodaje */
export interface CalendarEvent extends ProjectEntity {
  title: string;
  description?: string;
  type: CalendarEventType;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  location?: string;
  attendees: string[];
  color?: string;
  status: CalendarEventStatus;
}

/** Archivo multimedia del proyecto */
export interface MediaFile extends ProjectEntity {
  name: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  size: number;
  mimeType: string;
  folder?: string;
  tags: string[];
  uploadedBy: string;
  /** Si el archivo tiene versiones gestionadas */
  hasVersions?: boolean;
  /** URL externa (Vimeo, YouTube, Drive, etc.) como fuente principal */
  externalUrl?: string;
  /** Número de versiones disponibles */
  versionCount?: number;
}

/** Calidad de video disponible para una versión */
export type VideoQuality = 'original' | 'low';

/** Tipo de fuente de una versión multimedia */
export type MediaSourceType = 'hosted' | 'external' | 'drive_folder';

/** Tipo de embed soportado para URLs externas */
export type EmbedType = 'youtube' | 'vimeo' | 'direct' | 'gdrive' | 'other';

/** Versión de un archivo multimedia (cortes, revisiones, etc.) */
export interface MediaVersion extends BaseEntity {
  fileId: string;
  projectId: string;
  label: string;          // "Corte Director v2", "Rough Cut", "Final"
  versionNumber: string;  // "v1", "v2.1", etc.
  sourceType: MediaSourceType;
  url: string;            // URL de Storage si hosted, URL externa si external
  embedType?: EmbedType;  // Para renderizar el embed correcto
  size?: number;
  mimeType?: string;
  notes?: string;
  isLatest: boolean;
  allowDownload: boolean;
  watermarkEnabled: boolean;
  /** Si se generó un link público para compartir */
  shareToken?: string;
  /** URL de calidad baja (comprimida) para streaming lento */
  qualityLowUrl?: string;
}

/** Link público para compartir una versión de un archivo */
export interface SharedMediaLink extends BaseEntity {
  projectId: string;
  fileId: string;
  versionId: string;
  token: string;
  /** Nombre del archivo y versión para mostrar en el visor */
  displayName: string;
  projectName: string;
  password?: string;
  expiresAt?: Date;
  isActive: boolean;
  viewCount: number;
  allowDownload: boolean;
  watermarkEnabled: boolean;
  sourceType: MediaSourceType;
  url: string;
  embedType?: EmbedType;
  mimeType?: string;
  /** Tipo de media para saber qué visor usar */
  mediaType: MediaType;
  /** URL de calidad baja para streaming */
  qualityLowUrl?: string;
  /** ID de carpeta de Drive compartida (solo para sourceType='drive_folder') */
  folderId?: string;
  /** Nombre de carpeta de Drive compartida */
  folderName?: string;
}

/** Tarea de producción */
export interface Task extends ProjectEntity {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  dueDate?: Date;
  tags: string[];
}

/** Registro de actividad */
export interface ActivityLog extends BaseEntity {
  projectId?: string;
  entityType: 'project' | 'document' | 'file' | 'member' | 'callsheet' | 'task';
  entityId: string;
  action: string;
  userId: string;
  userDisplayName: string;
  details?: Record<string, unknown>;
}

/** Plantilla reutilizable */
export interface Template extends BaseEntity {
  name: string;
  type: ProductionType;
  description: string;
  structure: {
    folders: string[];
    documents: Partial<ProductionDocument>[];
    calendarEvents: Partial<CalendarEvent>[];
    roles: string[];
  };
  isPublic: boolean;
}

/** Permiso granular */
export interface Permission {
  resource: 'project' | 'document' | 'file' | 'team' | 'calendar' | 'callsheet';
  actions: ('read' | 'write' | 'delete' | 'share')[];
}

/** Notificación del sistema */
export interface Notification extends BaseEntity {
  userId: string;
  projectId?: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  actionUrl?: string;
}

// ── Tipos para Libreta de Contactos (Directorio de Actores y Ayudantes) ──

export type ContactCategory = 'actor' | 'crew';
export type ContactAvailability = 'available' | 'busy' | 'favorite' | 'inactive';

export interface ActorDetails {
  ageRange?: string;       // Ej: "25-35 años"
  height?: string;         // Ej: "1.78 m"
  clothingSize?: string;   // Ej: "M / 42"
  shoeSize?: string;       // Ej: "41"
  eyeColor?: string;       // Ej: "Café / Marrón"
  hairColor?: string;      // Ej: "Castaño oscuro"
  skills?: string[];       // Ej: ["Manejo de armas", "Inglés C1", "Canto"]
}

export interface ContactProfile extends BaseEntity {
  name: string;
  category: ContactCategory;
  role: string;
  department: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  instagram?: string;
  avatarUrl?: string;
  agency?: string;
  notes?: string;
  portfolioUrl?: string;
  ratePerDay?: string;
  availability: ContactAvailability;
  tags: string[];
  actorDetails?: ActorDetails;
}

// ── Tipos auxiliares para formularios y UI ──

/** Datos para crear un nuevo contacto en la libreta */
export type CreateContactData = Omit<ContactProfile, keyof BaseEntity>;

/** Datos para crear un nuevo proyecto */
export type CreateProjectData = Omit<Project, keyof BaseEntity | 'status'> & {
  status?: ProjectStatus;
};

/** Datos para crear un nuevo llamado individual */
export type CreateCallSheetData = Omit<
  CallSheetAccess,
  keyof BaseEntity | 'projectId' | 'token' | 'viewCount' | 'confirmedAt' | 'isActive'
>;

/** Datos para crear un nuevo documento */
export type CreateDocumentData = Omit<
  ProductionDocument,
  keyof BaseEntity | 'projectId' | 'currentVersionId' | 'versions'
>;

/** Datos para crear una nueva versión */
export type CreateVersionData = Omit<
  ScriptVersion,
  keyof BaseEntity | 'isLocked' | 'lockedBy' | 'lockedAt'
>;

/** Ítem de navegación */
export interface NavigationItem {
  key: string;
  label: string;
  icon: string;
  activeIcon?: string;
  badge?: number;
}

/** Estado de carga genérico */
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

