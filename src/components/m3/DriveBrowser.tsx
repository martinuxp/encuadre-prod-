import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Platform,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { LoadingState } from './LoadingState';
import { EmptyState } from './EmptyState';
import { driveService, DriveFile } from '@/services/firebase/driveService';
import { mediaShareService } from '@/services/firebase/mediaShareService';

interface DriveBrowserProps {
  folderId: string;
  projectId: string;
  projectName?: string;
  onSelectFile?: (file: DriveFile) => void;
  compact?: boolean;
}

interface FolderPathEntry {
  id: string;
  name: string;
}

const isFolder = (mime: string) => mime === 'application/vnd.google-apps.folder';

const getIcon = (mime: string): string => {
  if (isFolder(mime)) return 'folder-outline';
  if (mime.startsWith('video/')) return 'filmstrip';
  if (mime.startsWith('image/')) return 'image-outline';
  if (mime === 'application/pdf') return 'file-pdf-box';
  if (mime.startsWith('audio/')) return 'music';
  return 'file-outline';
};

const formatSize = (bytes?: string) => {
  if (!bytes) return '';
  const n = parseInt(bytes);
  if (isNaN(n)) return '';
  if (n > 1e9) return `${(n / 1e9).toFixed(1)} GB`;
  if (n > 1e6) return `${(n / 1e6).toFixed(1)} MB`;
  if (n > 1e3) return `${(n / 1e3).toFixed(0)} KB`;
  return `${n} B`;
};

const getThumbUrl = (file: DriveFile): string | null => {
  if (file.thumbnailLink) {
    const url = new URL(file.thumbnailLink);
    url.searchParams.set('sz', 'w120');
    return url.toString();
  }
  return null;
};

const FileThumb: React.FC<{ file: DriveFile }> = ({ file }) => {
  const [failed, setFailed] = useState(false);
  const thumb = getThumbUrl(file);
  if (!thumb || failed) {
    return (
      <MaterialCommunityIcons
        name={getIcon(file.mimeType) as any}
        size={isFolder(file.mimeType) ? 22 : 20}
        color={isFolder(file.mimeType) ? colors.primary : file.mimeType.startsWith('video/') ? '#e50914' : colors.primary}
      />
    );
  }
  return <Image source={{ uri: thumb }} style={styles.fileThumb} onError={() => setFailed(true)} />;
};

const appUrl = process.env.EXPO_PUBLIC_APP_URL || 'http://localhost:8081';

export const DriveBrowser: React.FC<DriveBrowserProps> = ({
  folderId,
  projectId,
  projectName,
  onSelectFile,
  compact,
}) => {
  const [currentFolderId, setCurrentFolderId] = useState(folderId);
  const [folderPath, setFolderPath] = useState<FolderPathEntry[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);

  // Share state
  const [shareFile, setShareFile] = useState<DriveFile | null>(null);
  const [sharePassword, setSharePassword] = useState('');
  const [shareExpiresDays, setShareExpiresDays] = useState('');
  const [shareWatermark, setShareWatermark] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Folder share state
  const [folderShareLink, setFolderShareLink] = useState<string | null>(null);
  const [folderShareLoading, setFolderShareLoading] = useState(false);
  const [folderShareCopied, setFolderShareCopied] = useState(false);

  const resolvePath = useCallback(async (id: string) => {
    const entries: FolderPathEntry[] = [];
    let currentId = id;
    const seen = new Set<string>();
    while (currentId && !seen.has(currentId)) {
      seen.add(currentId);
      const info = await driveService.getFileInfo(currentId);
      if (!info) break;
      entries.unshift({ id: info.id, name: info.name });
      break;
    }
    return entries;
  }, []);

  const fetchFiles = useCallback(async (folderIdToFetch: string) => {
    try {
      setLoading(true);
      setError(null);
      setSearchQuery('');

      const result = await driveService.listFiles(folderIdToFetch);
      setFiles(result.files);
      setNextPageToken(result.nextPageToken);
    } catch (e: any) {
      setError(e.message || 'Error al cargar archivos de Drive');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setCurrentFolderId(folderId);
    setFolderPath([]);
    fetchFiles(folderId);
  }, [folderId, fetchFiles]);

  const navigateToFolder = async (folder: DriveFile) => {
    if (!isFolder(folder.mimeType)) return;
    setFolderPath(prev => [...prev, { id: currentFolderId, name: folder.name }]);
    setCurrentFolderId(folder.id);
    await fetchFiles(folder.id);
  };

  const navigateBack = async () => {
    if (folderPath.length === 0) return;
    const prev = folderPath[folderPath.length - 1];
    const newPath = folderPath.slice(0, -1);
    setFolderPath(newPath);
    setCurrentFolderId(prev.id);
    setSearchQuery('');
    const parentInfo = await driveService.getFileInfo(prev.id);
    await fetchFiles(prev.id);
  };

  const navigateToRoot = () => {
    setFolderPath([]);
    setCurrentFolderId(folderId);
    fetchFiles(folderId);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchFiles(currentFolderId);
      return;
    }
    setLoading(true);
    const results = await driveService.searchFiles(currentFolderId, searchQuery);
    setFiles(results);
    setNextPageToken(undefined);
    setLoading(false);
  };

  const handleOpenShare = (file: DriveFile) => {
    setShareFile(file);
    setSharePassword('');
    setShareExpiresDays('');
    setShareWatermark(false);
    setGeneratedLink(null);
    setCopied(false);
  };

  const handleGenerateShare = async () => {
    if (!shareFile || !projectId) return;
    setSharing(true);
    try {
      let expiresAt: Date | undefined;
      if (shareExpiresDays) {
        const days = parseInt(shareExpiresDays);
        if (!isNaN(days)) {
          expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + days);
        }
      }

      const share = await mediaShareService.shareDriveFile(
        projectId,
        { id: shareFile.id, name: shareFile.name, mimeType: shareFile.mimeType, embedUrl: shareFile.embedUrl },
        projectName || 'Crudos',
        {
          password: sharePassword || undefined,
          expiresAt,
          allowDownload: false,
          watermarkEnabled: shareWatermark,
        }
      );

      setGeneratedLink(`${appUrl}/view/${share.token}`);
    } catch (e: any) {
      alert(`Error al compartir: ${e.message}`);
    } finally {
      setSharing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    try {
      if (Platform.OS === 'web' && navigator?.clipboard) {
        await navigator.clipboard.writeText(generatedLink);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  const handleGenerateFolderShare = async () => {
    if (!projectId) return;
    setFolderShareLoading(true);
    try {
      const share = await mediaShareService.shareDriveFolder(
        projectId,
        currentFolderId,
        folderPath.length > 0 ? folderPath[folderPath.length - 1].name : 'Crudos',
        projectName || 'Crudos',
        {}
      );
      const link = `${appUrl}/view/${share.token}`;
      setFolderShareLink(link);
      if (Platform.OS === 'web' && navigator?.clipboard) {
        await navigator.clipboard.writeText(link);
      }
      setFolderShareCopied(true);
      setTimeout(() => setFolderShareCopied(false), 3000);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setFolderShareLoading(false);
    }
  };

  const folders = files.filter(f => isFolder(f.mimeType));
  const videoFiles = files.filter(f => f.mimeType.startsWith('video/'));
  const imageFiles = files.filter(f => f.mimeType.startsWith('image/'));
  const mediaFiles = files.filter(f =>
    f.mimeType.startsWith('video/') || f.mimeType.startsWith('image/') || f.mimeType === 'application/pdf'
  );
  const otherFiles = files.filter(f => !isFolder(f.mimeType) && !mediaFiles.includes(f));

  if (loading) {
    return <LoadingState message="Conectando con Google Drive..." />;
  }

  if (error) {
    return (
      <View style={styles.errorBox}>
        <MaterialCommunityIcons name="cloud-alert" size={32} color={colors.error} />
        <Text style={styles.errorText}>Error al conectar con Drive</Text>
        <Text style={styles.errorDesc}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={() => fetchFiles(currentFolderId)}>
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  const renderFile = (file: DriveFile) => {
    const folder = isFolder(file.mimeType);
    return (
      <Pressable
        key={file.id}
        style={styles.fileRow}
        onPress={folder ? () => navigateToFolder(file) : () => onSelectFile?.(file)}
      >
        <View style={[styles.fileIcon, folder && styles.folderIcon]}>
          <FileThumb file={file} />
        </View>
        <View style={styles.fileInfo}>
          <Text style={[styles.fileName, folder && styles.folderName]} numberOfLines={1}>
            {file.name}
          </Text>
          <Text style={styles.fileMeta}>
            {folder ? 'Carpeta' : `${driveService.detectFileType(file.mimeType)}${file.size ? ` • ${formatSize(file.size)}` : ''}`}
          </Text>
        </View>
        {!folder && (
          <View style={styles.fileActions}>
            {onSelectFile && (
              <Pressable style={styles.fileActionBtn} onPress={() => onSelectFile(file)}>
                <MaterialCommunityIcons name="plus-circle-outline" size={18} color={colors.primary} />
              </Pressable>
            )}
            <Pressable style={styles.fileActionBtn} onPress={(e) => { e.stopPropagation?.(); handleOpenShare(file); }}>
              <MaterialCommunityIcons name="share-variant-outline" size={18} color={colors.secondary} />
            </Pressable>
          </View>
        )}
      </Pressable>
    );
  };

  const renderSection = (title: string, icon: string, color: string, sectionFiles: DriveFile[]) => {
    if (sectionFiles.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name={icon as any} size={14} color={color} />
          <Text style={styles.sectionTitle}>{title} ({sectionFiles.length})</Text>
        </View>
        {sectionFiles.map(renderFile)}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="google-drive" size={18} color={colors.primary} />
        {folderPath.length > 0 && (
          <Pressable onPress={navigateBack} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={16} color={colors.primary} />
          </Pressable>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.breadcrumbScroll}>
          <Pressable onPress={navigateToRoot}>
            <Text style={[styles.breadcrumbItem, folderPath.length === 0 && styles.breadcrumbActive]}>
              Crudos
            </Text>
          </Pressable>
          {folderPath.map((entry, idx) => (
            <View key={entry.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="chevron-right" size={12} color={colors.onSurfaceVariant} />
              <Text
                style={[styles.breadcrumbItem, idx === folderPath.length - 1 && styles.breadcrumbActive]}
                numberOfLines={1}
              >
                {entry.name}
              </Text>
            </View>
          ))}
        </ScrollView>
        <Text style={styles.fileCount}>{files.length} archivos</Text>
        <Pressable
          style={[styles.shareFolderBtn, folderShareLink && styles.shareFolderBtnLinked]}
          onPress={handleGenerateFolderShare}
          disabled={folderShareLoading}
        >
          <MaterialCommunityIcons
            name={folderShareCopied ? 'check' : folderShareLink ? 'link-variant' : 'share-variant-outline'}
            size={14}
            color={folderShareCopied ? colors.onSuccess : colors.primary}
          />
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar archivos..."
          placeholderTextColor={colors.onSurfaceAlpha38}
          onSubmitEditing={handleSearch}
        />
        <Pressable style={styles.searchBtn} onPress={handleSearch}>
          <MaterialCommunityIcons name="magnify" size={18} color="#fff" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={compact ? styles.scrollCompact : styles.scrollFull}
        nestedScrollEnabled
      >
        {folders.length > 0 && renderSection('Carpetas', 'folder-outline', colors.primary, folders)}
        {renderSection('Videos', 'filmstrip', '#e50914', videoFiles)}
        {renderSection('Imágenes', 'image-outline', colors.primary, imageFiles)}
        {renderSection('Otros', 'file-outline', colors.onSurfaceVariant, otherFiles)}

        {nextPageToken && (
          <Pressable
            style={styles.loadMoreBtn}
            onPress={async () => {
              setLoadingMore(true);
              const result = await driveService.listFiles(currentFolderId, nextPageToken);
              setFiles(prev => [...prev, ...result.files]);
              setNextPageToken(result.nextPageToken);
              setLoadingMore(false);
            }}
            disabled={loadingMore}
          >
            <Text style={styles.loadMoreText}>
              {loadingMore ? 'Cargando...' : 'Cargar más archivos'}
            </Text>
          </Pressable>
        )}

        {files.length === 0 && !loading && (
          <EmptyState
            icon="google-drive"
            title="Carpeta vacía"
            description="No hay archivos en esta ubicación."
          />
        )}
      </ScrollView>

      {/* Share Modal */}
      <Modal
        visible={!!shareFile}
        animationType="fade"
        transparent
        onRequestClose={() => { setShareFile(null); setGeneratedLink(null); }}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="share-variant-outline" size={20} color={colors.secondary} />
              <Text style={styles.modalTitle}>Compartir Crudo</Text>
              <Pressable onPress={() => { setShareFile(null); setGeneratedLink(null); }}>
                <MaterialCommunityIcons name="close" size={22} color={colors.onSurface} />
              </Pressable>
            </View>

            {shareFile && (
              <View style={styles.shareInfo}>
                <MaterialCommunityIcons
                  name={getIcon(shareFile.mimeType) as any}
                  size={24}
                  color={shareFile.mimeType.startsWith('video/') ? '#e50914' : colors.primary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.shareFileName} numberOfLines={1}>{shareFile.name}</Text>
                  <Text style={styles.shareFileMeta}>
                    {driveService.detectFileType(shareFile.mimeType)}
                    {shareFile.size ? ` • ${formatSize(shareFile.size)}` : ''}
                  </Text>
                </View>
              </View>
            )}

            {generatedLink ? (
              <View style={styles.generatedSection}>
                <View style={styles.generatedBox}>
                  <Text style={styles.generatedUrl} selectable numberOfLines={2}>{generatedLink}</Text>
                  <Pressable style={[styles.copyBtn, copied && styles.copyBtnSuccess]} onPress={handleCopyLink}>
                    <MaterialCommunityIcons
                      name={copied ? 'check' : 'content-copy'}
                      size={16}
                      color={copied ? colors.onSuccess : '#fff'}
                    />
                    <Text style={styles.copyBtnText}>{copied ? '¡Copiado!' : 'Copiar'}</Text>
                  </Pressable>
                </View>
                <Text style={styles.generatedHint}>
                  Este link lleva al visor brandeado. {sharePassword ? 'Tiene contraseña de acceso.' : 'Cualquiera con el link puede verlo.'}
                </Text>
                <Pressable style={styles.newShareBtn} onPress={() => setGeneratedLink(null)}>
                  <Text style={styles.newShareText}>Compartir otro archivo</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.shareForm}>
                <View style={{ gap: spacing.xs }}>
                  <Text style={styles.label}>Contraseña (opcional)</Text>
                  <TextInput
                    style={styles.input}
                    value={sharePassword}
                    onChangeText={setSharePassword}
                    placeholder="Dejar vacío para acceso libre"
                    placeholderTextColor={colors.onSurfaceAlpha38}
                    secureTextEntry
                  />
                </View>

                <View style={{ gap: spacing.xs }}>
                  <Text style={styles.label}>Vencimiento en días (opcional)</Text>
                  <TextInput
                    style={styles.input}
                    value={shareExpiresDays}
                    onChangeText={setShareExpiresDays}
                    placeholder="Ej: 7"
                    placeholderTextColor={colors.onSurfaceAlpha38}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Watermark de seguridad</Text>
                  <Pressable
                    style={[styles.toggle, shareWatermark && styles.toggleActive]}
                    onPress={() => setShareWatermark(!shareWatermark)}
                  >
                    <View style={[styles.toggleKnob, shareWatermark && styles.toggleKnobActive]} />
                  </Pressable>
                </View>

                <Pressable
                  style={[styles.generateBtn, sharing && styles.generateBtnDisabled]}
                  onPress={handleGenerateShare}
                  disabled={sharing}
                >
                  <MaterialCommunityIcons name="link-variant" size={18} color="#fff" />
                  <Text style={styles.generateBtnText}>
                    {sharing ? 'Generando...' : 'Generar Link Público'}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: shapes.medium,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
    maxHeight: 500,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  backBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breadcrumbScroll: {
    flex: 1,
  },
  breadcrumbItem: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginRight: spacing.xs,
    maxWidth: 80,
  },
  breadcrumbActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  fileCount: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  shareFolderBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerHighest,
  },
  shareFolderBtnLinked: {
    backgroundColor: colors.primaryContainer,
  },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  searchInput: {
    flex: 1,
    height: 32,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: shapes.small,
    paddingHorizontal: spacing.sm,
    color: colors.onSurface,
    ...typography.bodySmall,
  },
  searchBtn: {
    width: 32,
    height: 32,
    borderRadius: shapes.small,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {},
  scrollCompact: { gap: spacing.xs, padding: spacing.xs },
  scrollFull: { gap: spacing.xs, padding: spacing.sm },
  section: { gap: 2 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    ...typography.labelMedium,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: shapes.small,
  },
  fileIcon: {
    width: 32,
    height: 32,
    borderRadius: shapes.small,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fileThumb: {
    width: 32,
    height: 32,
    borderRadius: shapes.small,
  },
  folderIcon: {
    backgroundColor: colors.primaryContainer,
  },
  fileInfo: {
    flex: 1,
    gap: 1,
  },
  fileName: {
    ...typography.bodyMedium,
    color: colors.onSurface,
  },
  folderName: {
    fontWeight: '600',
    color: colors.primary,
  },
  fileMeta: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    textTransform: 'capitalize',
  },
  fileActions: {
    flexDirection: 'row',
    gap: 2,
  },
  fileActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  loadMoreText: {
    ...typography.labelMedium,
    color: colors.primary,
  },
  errorBox: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorText: {
    ...typography.titleSmall,
    color: colors.error,
    fontWeight: 'bold',
  },
  errorDesc: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.base,
    height: 32,
    borderRadius: shapes.small,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    ...typography.labelMedium,
    color: colors.primary,
  },
  // Share Modal
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: shapes.extraLarge,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.lg,
    gap: spacing.base,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalTitle: {
    ...typography.titleMedium,
    color: colors.onSurface,
    fontWeight: 'bold',
    flex: 1,
  },
  shareInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: shapes.small,
  },
  shareFileName: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    fontWeight: '600',
  },
  shareFileMeta: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    textTransform: 'capitalize',
  },
  shareForm: {
    gap: spacing.base,
  },
  label: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  input: {
    height: 44,
    backgroundColor: colors.surfaceContainer,
    borderRadius: shapes.small,
    paddingHorizontal: spacing.base,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...typography.bodyMedium,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    fontWeight: '600',
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHighest,
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: shapes.full,
    height: 44,
  },
  generateBtnDisabled: { opacity: 0.5 },
  generateBtnText: {
    ...typography.labelLarge,
    color: '#fff',
    fontWeight: 'bold',
  },
  // Generated link section
  generatedSection: {
    gap: spacing.base,
  },
  generatedBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: shapes.medium,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.base,
    gap: spacing.sm,
  },
  generatedUrl: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontFamily: 'monospace',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: shapes.small,
    height: 36,
    paddingHorizontal: spacing.base,
    alignSelf: 'flex-start',
  },
  copyBtnSuccess: {
    backgroundColor: colors.success,
  },
  copyBtnText: {
    ...typography.labelMedium,
    color: '#fff',
    fontWeight: 'bold',
  },
  generatedHint: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  newShareBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  newShareText: {
    ...typography.labelMedium,
    color: colors.primary,
  },
});
