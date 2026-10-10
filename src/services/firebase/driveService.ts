const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_DRIVE_API_KEY || '';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink: string;
  thumbnailLink?: string;
  createdTime: string;
  fileExtension?: string;
  /** URL para embed directo de Google Drive */
  embedUrl: string;
}

export interface DriveFolder {
  id: string;
  name: string;
}

const isVideo = (mime: string) => mime.startsWith('video/');
const isImage = (mime: string) => mime.startsWith('image/');
const isPdf = (mime: string) => mime === 'application/pdf';
const isFolder = (mime: string) => mime === 'application/vnd.google-apps.folder';
const isGdoc = (mime: string) => mime.startsWith('application/vnd.google-apps');

const MAP_EXTERNAL_TYPE: Record<string, string> = {
  'application/vnd.google-apps.video': 'video',
  'application/vnd.google-apps.shortcut': 'shortcut',
};

export const driveService = {
  /** Verificar si la API key está configurada */
  isConfigured: (): boolean => !!API_KEY,

  /** Detectar tipo multimedia para el visor */
  detectFileType: (mimeType: string): 'video' | 'image' | 'pdf' | 'other' => {
    if (isVideo(mimeType)) return 'video';
    if (isImage(mimeType)) return 'image';
    if (isPdf(mimeType)) return 'pdf';
    return 'other';
  },

  /** Obtener el ID de una carpeta desde una URL de Drive */
  extractFolderId: (url: string): string | null => {
    // https://drive.google.com/drive/folders/FOLDER_ID
    const match = url.match(/\/drive\/folders\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    // https://drive.google.com/open?id=FOLDER_ID
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch) return idMatch[1];
    // Si ya es un ID plano
    if (/^[a-zA-Z0-9_-]{20,}$/.test(url.trim())) return url.trim();
    return null;
  },

  /** Obtener nombre de la carpeta */
  getFolderInfo: async (folderId: string): Promise<DriveFolder | null> => {
    if (!API_KEY) return null;
    try {
      const res = await fetch(
        `${DRIVE_API_BASE}/files/${folderId}?key=${API_KEY}&fields=id,name`,
        { headers: { 'Accept': 'application/json' } }
      );
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  },

  /** Obtener info de cualquier archivo/carpeta por ID */
  getFileInfo: async (fileId: string): Promise<{ id: string; name: string; mimeType: string } | null> => {
    if (!API_KEY) return null;
    try {
      const res = await fetch(
        `${DRIVE_API_BASE}/files/${fileId}?key=${API_KEY}&fields=id,name,mimeType`,
        { headers: { 'Accept': 'application/json' } }
      );
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  },

  /** Listar archivos dentro de una carpeta de Drive */
  listFiles: async (folderId: string, pageToken?: string): Promise<{ files: DriveFile[]; nextPageToken?: string }> => {
    if (!API_KEY) return { files: [] };

    const q = `'${folderId}' in parents and trashed=false`;
    const fields = 'files(id,name,mimeType,size,webViewLink,thumbnailLink,createdTime,fileExtension,iconLink),nextPageToken';
    let url = `${DRIVE_API_BASE}/files?key=${API_KEY}&q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&orderBy=name&pageSize=50`;
    if (pageToken) url += `&pageToken=${pageToken}`;

    try {
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) {
        const err = await res.text();
        console.error('Drive API error:', err);
        return { files: [] };
      }
      const data = await res.json();
      return {
        files: (data.files || []).map((f: any): DriveFile => ({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          size: f.size,
          webViewLink: f.webViewLink || `https://drive.google.com/open?id=${f.id}`,
          thumbnailLink: f.thumbnailLink,
          createdTime: f.createdTime,
          fileExtension: f.fileExtension || '',
          embedUrl: `https://drive.google.com/file/d/${f.id}/preview`,
        })),
        nextPageToken: data.nextPageToken,
      };
    } catch (e) {
      console.error('Error fetching Drive files:', e);
      return { files: [] };
    }
  },

  /** Obtener URL de embed para un archivo de Drive en el visor */
  getEmbedUrl: (fileId: string, mimeType: string): string => {
    if (isVideo(mimeType)) {
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    if (isImage(mimeType)) {
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    }
    if (isPdf(mimeType)) {
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    return `https://drive.google.com/file/d/${fileId}/preview`;
  },

  /** Buscar archivos por nombre */
  searchFiles: async (folderId: string, query: string): Promise<DriveFile[]> => {
    if (!API_KEY || !query.trim()) return [];
    const q = `'${folderId}' in parents and name contains '${query.replace(/'/g, "\\'")}' and trashed=false`;
    const fields = 'files(id,name,mimeType,size,webViewLink,thumbnailLink,createdTime,fileExtension)';
    try {
      const res = await fetch(
        `${DRIVE_API_BASE}/files?key=${API_KEY}&q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&orderBy=name`,
        { headers: { 'Accept': 'application/json' } }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.files || []).map((f: any): DriveFile => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        size: f.size,
        webViewLink: f.webViewLink || `https://drive.google.com/open?id=${f.id}`,
        thumbnailLink: f.thumbnailLink,
        createdTime: f.createdTime,
        fileExtension: f.fileExtension || '',
        embedUrl: `https://drive.google.com/file/d/${f.id}/preview`,
      }));
    } catch {
      return [];
    }
  },

  /** Obtener link de descarga directa (solo archivos con visibilidad pública) */
  getDirectDownloadUrl: (fileId: string): string => {
    return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}`;
  },
};
