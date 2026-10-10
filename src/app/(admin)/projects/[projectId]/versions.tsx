import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Switch,
  Modal,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { SectionCard } from '@/components/m3/SectionCard';
import { ActionButton } from '@/components/m3/ActionButton';
import { EmptyState } from '@/components/m3/EmptyState';
import { LoadingState } from '@/components/m3/LoadingState';
import { ErrorState } from '@/components/m3/ErrorState';
import { ConfirmDialog } from '@/components/m3/ConfirmDialog';
import { mediaShareService } from '@/services/firebase/mediaShareService';
import { activityService } from '@/services/firebase/activityService';
import { projectService } from '@/services/firebase/projectService';
import { driveService, DriveFile } from '@/services/firebase/driveService';
import { MediaFile, MediaVersion, SharedMediaLink, Project } from '@/types';
import { useUser } from '@clerk/clerk-expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { VersionList } from '@/components/m3/VersionList';
import { ShareLinkCard } from '@/components/m3/ShareLinkCard';
import { VideoPlayer } from '@/components/m3/VideoPlayer';
import { DriveBrowser } from '@/components/m3/DriveBrowser';

export default function VersionsScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { user } = useUser();

  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Version management
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [versions, setVersions] = useState<MediaVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // New version form
  const [newVersionLabel, setNewVersionLabel] = useState('');
  const [newVersionNum, setNewVersionNum] = useState('');
  const [newVersionNotes, setNewVersionNotes] = useState('');
  const [allowDownload, setAllowDownload] = useState(true);
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [selectedBlobFile, setSelectedBlobFile] = useState<File | null>(null);
  const [selectedLowBlob, setSelectedLowBlob] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Share
  const [sharingVersion, setSharingVersion] = useState<MediaVersion | null>(null);
  const [sharePassword, setSharePassword] = useState('');
  const [shareExpiresDays, setShareExpiresDays] = useState('');
  const [generatedShare, setGeneratedShare] = useState<SharedMediaLink | null>(null);
  const [loadingShare, setLoadingShare] = useState(false);

  // Preview
  const [previewVersion, setPreviewVersion] = useState<MediaVersion | null>(null);

  // Drive integration
  const [projectData, setProjectData] = useState<Project | null>(null);
  const [showDriveBrowser, setShowDriveBrowser] = useState(false);

  const appUrl = process.env.EXPO_PUBLIC_APP_URL || 'http://localhost:8081';

  const fetchFiles = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const { fileService } = await import('@/services/firebase/fileService');
      const fs = await fileService.getFiles(projectId);
      setFiles(fs);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchFiles();
    if (projectId) {
      projectService.getProjectById(projectId).then(setProjectData);
    }
  }, [fetchFiles, projectId]);

  const fetchVersions = useCallback(async (file: MediaFile) => {
    if (!projectId) return;
    try {
      setLoadingVersions(true);
      const vs = await mediaShareService.getVersions(projectId, file.id);
      setVersions(vs);
      const latest = vs.find(v => v.isLatest);
      if (latest && latest.shareToken) {
        const shareData = await mediaShareService.getShareByToken(latest.shareToken);
        setGeneratedShare(shareData);
      } else {
        setGeneratedShare(null);
      }
    } catch (e) {
      console.error('Error al cargar versiones:', e);
    } finally {
      setLoadingVersions(false);
    }
  }, [projectId]);

  const handleSelectFile = (file: MediaFile) => {
    setSelectedFile(file);
    setNewVersionNum(`v${(file.versionCount || 0) + 1}`);
    setNewVersionLabel('');
    setNewVersionNotes('');
    setSelectedBlobFile(null);
    setSelectedLowBlob(null);
    setSharingVersion(null);
    setGeneratedShare(null);
    fetchVersions(file);
  };

  const handleAddVersion = async () => {
    if (!selectedFile || !projectId) return;
    setUploading(true);
    try {
      const vNum = newVersionNum || `v${versions.length + 1}`;
      const vLabel = newVersionLabel || `Versión ${vNum}`;

      if (!selectedBlobFile) {
        alert('Selecciona un archivo de video para subir.');
        setUploading(false);
        return;
      }

      await mediaShareService.uploadVersion(
        projectId,
        selectedFile.id,
        selectedBlobFile as unknown as Blob,
        selectedBlobFile.name,
        vLabel,
        vNum,
        user?.id || '',
        {
          notes: newVersionNotes,
          allowDownload,
          watermarkEnabled,
          qualityLowBlob: selectedLowBlob ? selectedLowBlob as unknown as Blob : undefined,
          qualityLowFileName: selectedLowBlob?.name,
        }
      );

      await activityService.logActivity(
        projectId,
        'file',
        selectedFile.id,
        `subió versión ${vNum} ("${vLabel}") para ${selectedFile.name}${selectedLowBlob ? ' + calidad baja' : ''}`,
        user?.id || '',
        user?.fullName || ''
      );

      setNewVersionLabel('');
      setNewVersionNotes('');
      setSelectedBlobFile(null);
      setSelectedLowBlob(null);
      fetchVersions(selectedFile);
      fetchFiles();
    } catch (e: any) {
      alert(`Error al guardar versión: ${e.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateShare = async () => {
    if (!sharingVersion || !projectId || !selectedFile) return;
    setLoadingShare(true);
    try {
      let expiresAt: Date | undefined;
      if (shareExpiresDays) {
        const days = parseInt(shareExpiresDays);
        if (!isNaN(days)) {
          expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + days);
        }
      }

      const shareLink = await mediaShareService.generateShareLink(
        projectId,
        selectedFile.id,
        sharingVersion.id,
        sharingVersion,
        selectedFile.name,
        {
          password: sharePassword || undefined,
          expiresAt,
          allowDownload: sharingVersion.allowDownload,
          watermarkEnabled: sharingVersion.watermarkEnabled,
        }
      );

      setGeneratedShare(shareLink);
      setSharePassword('');
      setShareExpiresDays('');
      fetchVersions(selectedFile);
    } catch (e: any) {
      alert(`Error al generar share: ${e.message}`);
    } finally {
      setLoadingShare(false);
    }
  };

  const handleRevokeShare = async () => {
    if (!generatedShare || !selectedFile) return;
    try {
      await mediaShareService.revokeShareLink(generatedShare.id);
      setGeneratedShare({ ...generatedShare, isActive: false });
      fetchVersions(selectedFile);
    } catch (e: any) {
      alert(`Error al revocar: ${e.message}`);
    }
  };

  const handleSelectDriveFile = async (driveFile: DriveFile) => {
    if (!selectedFile || !projectId) return;
    const { detectEmbedType } = await import('@/services/firebase/mediaShareService');
    const embedType = detectEmbedType(driveFile.embedUrl);
    const vNum = newVersionNum || `v${versions.length + 1}`;
    const vLabel = newVersionLabel || `Desde Drive: ${driveFile.name}`;

    try {
      await mediaShareService.addExternalVersion(
        projectId,
        selectedFile.id,
        driveFile.embedUrl,
        vLabel,
        vNum,
        user?.id || '',
        { notes: `Importado desde Google Drive (${driveFile.name})`, allowDownload, watermarkEnabled }
      );
      await activityService.logActivity(
        projectId, 'file', selectedFile.id,
        `importó "${driveFile.name}" desde Drive como versión ${vNum}`,
        user?.id || '', user?.fullName || ''
      );
      setShowDriveBrowser(false);
      fetchVersions(selectedFile);
      fetchFiles();
    } catch (e: any) {
      alert(`Error al importar desde Drive: ${e.message}`);
    }
  };

  const handleDeleteVersion = async (v: MediaVersion) => {
    if (!selectedFile) return;
    if (confirm(`¿Eliminar la versión ${v.versionNumber} permanentemente?`)) {
      try {
        await mediaShareService.deleteVersion(projectId, selectedFile.id, v.id, v);
        fetchVersions(selectedFile);
        fetchFiles();
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  if (loading) return <LoadingState message="Cargando versiones de filme..." fullScreen />;
  if (error) return <ErrorState error={error} onRetry={fetchFiles} />;

  return (
    <View style={styles.container}>
      <SectionCard
        title="Versiones del Filme"
        subtitle="Gestiona cortes, revisiones y entregas del proyecto audiovisual"
      >
        {files.length === 0 ? (
          <EmptyState
            icon="filmstrip"
            title="Sin archivos de filme"
            description="Sube primero archivos multimedia desde la sección Archivos para gestionar sus versiones aquí."
          />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filmStrip}>
            {files.filter(f => f.type === 'video' || f.type === 'image').map((file) => (
              <Pressable
                key={file.id}
                style={[styles.filmCard, selectedFile?.id === file.id && styles.filmCardActive]}
                onPress={() => handleSelectFile(file)}
              >
                <View style={styles.filmCardThumb}>
                  <MaterialCommunityIcons
                    name={file.type === 'video' ? 'filmstrip' : 'image-multiple-outline'}
                    size={28}
                    color={selectedFile?.id === file.id ? colors.primary : 'rgba(255,255,255,0.3)'}
                  />
                </View>
                <Text style={styles.filmCardName} numberOfLines={1}>{file.name}</Text>
                <Text style={styles.filmCardMeta}>{file.versionCount || 0} versiones</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Selected File Panel */}
        {selectedFile && (
          <View style={styles.panel}>
            {/* Upload Form */}
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <MaterialCommunityIcons name="plus-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.formTitle}>Nueva Versión / Corte</Text>
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>N° de Versión</Text>
                  <TextInput
                    style={styles.input}
                    value={newVersionNum}
                    onChangeText={setNewVersionNum}
                    placeholder="Ej: v2, v3.1"
                  />
                </View>
                <View style={{ flex: 2 }}>
                  <Text style={styles.label}>Etiqueta</Text>
                  <TextInput
                    style={styles.input}
                    value={newVersionLabel}
                    onChangeText={setNewVersionLabel}
                    placeholder="Ej: Corte Director, Rough Cut, Final"
                  />
                </View>
              </View>

              <View style={{ gap: spacing.xs }}>
                <Text style={styles.label}>Video original (HD / calidad original)</Text>
                {selectedBlobFile ? (
                  <View style={styles.selectedFileRow}>
                    <MaterialCommunityIcons name="file-video-outline" size={20} color={colors.success} />
                    <Text style={styles.selectedFileName} numberOfLines={1}>{selectedBlobFile.name} ({(selectedBlobFile.size / 1e6).toFixed(1)} MB)</Text>
                    <Pressable onPress={() => setSelectedBlobFile(null)}>
                      <MaterialCommunityIcons name="close-circle" size={18} color={colors.error} />
                    </Pressable>
                  </View>
                ) : (
                  <label style={{ cursor: 'pointer', display: 'block', width: '100%' } as any}>
                    <View style={styles.pickerInner}>
                      <MaterialCommunityIcons name="upload" size={22} color={colors.primary} />
                      <Text style={styles.pickerText}>Seleccionar video original</Text>
                    </View>
                    <input
                      type="file"
                      accept="video/*"
                      style={{ display: 'none' } as any}
                      onChange={(e) => setSelectedBlobFile(e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </View>

              <View style={{ gap: spacing.xs }}>
                <Text style={styles.label}>Calidad baja (SD / opcional — para streaming lento)</Text>
                {selectedLowBlob ? (
                  <View style={styles.selectedFileRow}>
                    <MaterialCommunityIcons name="file-video-outline" size={20} color="rgba(229,9,20,0.6)" />
                    <Text style={styles.selectedFileName} numberOfLines={1}>{selectedLowBlob.name} ({(selectedLowBlob.size / 1e6).toFixed(1)} MB)</Text>
                    <Pressable onPress={() => setSelectedLowBlob(null)}>
                      <MaterialCommunityIcons name="close-circle" size={18} color={colors.error} />
                    </Pressable>
                  </View>
                ) : (
                  <label style={{ cursor: 'pointer', display: 'block', width: '100%' } as any}>
                    <View style={[styles.pickerInner, styles.pickerLow]}>
                      <MaterialCommunityIcons name="speedometer-slow" size={22} color="rgba(255,255,255,0.4)" />
                      <Text style={[styles.pickerText, { color: 'rgba(255,255,255,0.4)' }]}>Versión comprimida (SD) para conexiones lentas</Text>
                    </View>
                    <input
                      type="file"
                      accept="video/*"
                      style={{ display: 'none' } as any}
                      onChange={(e) => setSelectedLowBlob(e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </View>

              {/* Import from Drive */}
              {projectData?.driveFolderId && (
                <View style={{ gap: spacing.xs }}>
                  <Text style={styles.label}>Importar desde Google Drive</Text>
                  <Pressable
                    style={styles.driveImportBtn}
                    onPress={() => setShowDriveBrowser(true)}
                  >
                    <MaterialCommunityIcons name="google-drive" size={20} color="#1a73e8" />
                    <Text style={styles.driveImportText}>Explorar carpeta de Drive</Text>
                  </Pressable>
                </View>
              )}

              <View style={{ gap: spacing.xs }}>
                <Text style={styles.label}>Notas del corte</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newVersionNotes}
                  onChangeText={setNewVersionNotes}
                  placeholder="Cambios realizados, instrucciones para el equipo..."
                  multiline
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchCol}>
                  <Text style={styles.switchTitle}>Permitir descarga</Text>
                  <Text style={styles.switchDesc}>Los invitados podrán descargar el archivo</Text>
                </View>
                <Switch value={allowDownload} onValueChange={setAllowDownload} />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchCol}>
                  <Text style={styles.switchTitle}>Watermark de seguridad</Text>
                  <Text style={styles.switchDesc}>Marca de agua en el visor público</Text>
                </View>
                <Switch value={watermarkEnabled} onValueChange={setWatermarkEnabled} />
              </View>

              <Pressable
                style={[styles.actionBtn, uploading && styles.actionBtnDisabled]}
                onPress={handleAddVersion}
                disabled={uploading}
              >
                <MaterialCommunityIcons name="plus" size={18} color="#fff" />
                <Text style={styles.actionBtnText}>
                  {uploading ? 'Subiendo...' : 'Publicar Nueva Versión'}
                </Text>
              </Pressable>
            </View>

            {/* Active Share Link */}
            {generatedShare && (
              <View style={{ gap: spacing.xs }}>
                <View style={styles.sectionTitleRow}>
                  <MaterialCommunityIcons name="link-variant" size={16} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Link Compartido Activo</Text>
                </View>
                <ShareLinkCard
                  share={generatedShare}
                  onRevoke={handleRevokeShare}
                  appUrl={appUrl}
                />
              </View>
            )}

            {/* Share Form */}
            {sharingVersion && (
              <View style={styles.formCard}>
                <View style={styles.formHeader}>
                  <MaterialCommunityIcons name="share-variant-outline" size={18} color={colors.secondary} />
                  <Text style={styles.formTitle}>Compartir {sharingVersion.versionNumber}</Text>
                  <Pressable onPress={() => setSharingVersion(null)} style={{ marginLeft: 'auto' }}>
                    <MaterialCommunityIcons name="close" size={18} color="rgba(255,255,255,0.5)" />
                  </Pressable>
                </View>

                <View style={{ gap: spacing.xs }}>
                  <Text style={styles.label}>Contraseña (opcional)</Text>
                  <TextInput
                    style={styles.input}
                    value={sharePassword}
                    onChangeText={setSharePassword}
                    placeholder="Deja vacío para acceso sin contraseña"
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
                    keyboardType="numeric"
                  />
                </View>

                <Pressable
                  style={[styles.actionBtn, styles.shareBtn, loadingShare && styles.actionBtnDisabled]}
                  onPress={handleGenerateShare}
                  disabled={loadingShare}
                >
                  <MaterialCommunityIcons name="link-variant" size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>
                    {loadingShare ? 'Generando...' : 'Generar Link Brandeado'}
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Version List */}
            <View style={styles.versionsSection}>
              <View style={styles.sectionTitleRow}>
                <MaterialCommunityIcons name="history" size={16} color={colors.primary} />
                <Text style={styles.sectionTitle}>Historial de Versiones</Text>
              </View>
              {loadingVersions ? (
                <LoadingState message="Cargando versiones..." />
              ) : (
                <VersionList
                  versions={versions}
                  onPreview={(v) => setPreviewVersion(v)}
                  onShare={(v) => {
                    setSharingVersion(v);
                    setGeneratedShare(null);
                  }}
                  onDelete={handleDeleteVersion}
                />
              )}
            </View>
          </View>
        )}
      </SectionCard>

      {/* Drive Browser Modal */}
      {showDriveBrowser && projectData?.driveFolderId && (
        <Modal
          visible={showDriveBrowser}
          animationType="fade"
          transparent
          onRequestClose={() => setShowDriveBrowser(false)}
        >
          <View style={styles.previewBg}>
            <View style={[styles.previewContainer, { maxWidth: 600 }]}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>Importar desde Google Drive</Text>
                <Pressable onPress={() => setShowDriveBrowser(false)}>
                  <MaterialCommunityIcons name="close" size={24} color="#fff" />
                </Pressable>
              </View>
              <DriveBrowser
                folderId={projectData.driveFolderId}
                projectId={projectId}
                projectName={projectData.name}
                onSelectFile={handleSelectDriveFile}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Preview Modal */}
      {previewVersion && (
        <Modal
          visible={!!previewVersion}
          animationType="fade"
          transparent
          onRequestClose={() => setPreviewVersion(null)}
        >
          <View style={styles.previewBg}>
            <View style={styles.previewContainer}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle} numberOfLines={1}>
                  {previewVersion.label} ({previewVersion.versionNumber})
                </Text>
                <Pressable onPress={() => setPreviewVersion(null)}>
                  <MaterialCommunityIcons name="close" size={24} color="#fff" />
                </Pressable>
              </View>
              <View style={styles.previewContent}>
                <VideoPlayer
                  url={previewVersion.url}
                  embedType={previewVersion.embedType ?? 'direct'}
                  displayName={previewVersion.label}
                  allowDownload={previewVersion.allowDownload}
                  watermark={previewVersion.watermarkEnabled ? 'CONFIDENCIAL' : undefined}
                  qualityLowUrl={previewVersion.qualityLowUrl}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  filmStrip: {
    marginBottom: spacing.base,
  },
  filmCard: {
    width: 160,
    padding: spacing.base,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: shapes.medium,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginRight: spacing.sm,
    gap: spacing.xs,
  },
  filmCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryAlpha12,
  },
  filmCardThumb: {
    width: '100%',
    height: 80,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: shapes.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filmCardName: {
    ...typography.labelLarge,
    color: colors.onSurface,
    fontWeight: '600',
  },
  filmCardMeta: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  panel: { gap: spacing.lg },
  formCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: shapes.medium,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.base,
    gap: spacing.base,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  formTitle: {
    ...typography.titleSmall,
    color: colors.primary,
    fontWeight: 'bold',
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.base,
  },
  label: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: shapes.small,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    color: colors.onSurface,
    height: 40,
    paddingHorizontal: spacing.sm,
    ...typography.bodyMedium,
  },
  textArea: {
    height: 72,
    paddingVertical: spacing.sm,
    textAlignVertical: 'top',
  },
  pickerInner: {
    height: 56,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: shapes.small,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    flexDirection: 'row',
  },
  pickerLow: {
    borderColor: colors.outlineVariant,
  },
  pickerText: {
    ...typography.labelMedium,
    color: colors.primary,
  },
  selectedFileRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: shapes.small,
  },
  selectedFileName: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  switchCol: { flex: 1, gap: 2 },
  switchTitle: { ...typography.bodyMedium, color: colors.onSurface, fontWeight: '600' },
  switchDesc: { ...typography.bodySmall, color: colors.onSurfaceVariant },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 4,
    height: 40,
  },
  shareBtn: {
    backgroundColor: colors.secondary,
  },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { ...typography.labelLarge, color: '#fff', fontWeight: 'bold' },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.titleSmall,
    color: colors.primary,
    fontWeight: 'bold',
  },
  versionsSection: { gap: spacing.sm },
  previewBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },
  previewContainer: {
    width: '100%',
    maxWidth: 800,
    gap: spacing.base,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewTitle: {
    ...typography.titleLarge,
    color: '#fff',
    fontWeight: 'bold',
    flex: 1,
  },
  driveImportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#1a73e8',
    borderRadius: shapes.small,
    backgroundColor: 'rgba(26,115,232,0.05)',
  },
  driveImportText: {
    ...typography.labelLarge,
    color: '#1a73e8',
    fontWeight: '600',
  },
  previewContent: {
    borderRadius: shapes.medium,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
});
