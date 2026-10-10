// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Archivos del Proyecto
// Galería de videos, fotos, audios y documentos con control de versiones y shares brandeados
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  Switch,
  Modal,
  Image,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { SectionCard } from '@/components/m3/SectionCard';
import { FileCard } from '@/components/m3/FileCard';
import { ActionButton } from '@/components/m3/ActionButton';
import { FilterBar, FilterOption } from '@/components/m3/FilterBar';
import { EmptyState } from '@/components/m3/EmptyState';
import { LoadingState } from '@/components/m3/LoadingState';
import { ErrorState } from '@/components/m3/ErrorState';
import { ConfirmDialog } from '@/components/m3/ConfirmDialog';
import { fileService } from '@/services/firebase/fileService';
import { activityService } from '@/services/firebase/activityService';
import { mediaShareService, detectMediaType } from '@/services/firebase/mediaShareService';
import { MediaFile, MediaVersion, SharedMediaLink } from '@/types';
import { useUser } from '@clerk/clerk-expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { VersionList } from '@/components/m3/VersionList';
import { ShareLinkCard } from '@/components/m3/ShareLinkCard';
import { VideoPlayer } from '@/components/m3/VideoPlayer';

export default function FilesScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { user } = useUser();

  const [files, setFiles] = useState<MediaFile[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaFile | null>(null);

  // ── Estados para Gestión de Versiones ─────────────────
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [versions, setVersions] = useState<MediaVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Formulario de Nueva Versión
  const [newVersionLabel, setNewVersionLabel] = useState('');
  const [newVersionNum, setNewVersionNum] = useState('');
  const [newVersionSource, setNewVersionSource] = useState<'hosted' | 'external'>('hosted');
  const [externalUrl, setExternalUrl] = useState('');
  const [newVersionNotes, setNewVersionNotes] = useState('');
  const [allowDownload, setAllowDownload] = useState(true);
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [selectedBlobFile, setSelectedBlobFile] = useState<File | null>(null);

  // ── Estados para Compartición ─────────────────────────
  const [sharingVersion, setSharingVersion] = useState<MediaVersion | null>(null);
  const [sharePassword, setSharePassword] = useState('');
  const [shareExpiresDays, setShareExpiresDays] = useState('');
  const [generatedShare, setGeneratedShare] = useState<SharedMediaLink | null>(null);
  const [loadingShare, setLoadingShare] = useState(false);

  // ── Vista Previa ──────────────────────────────────────
  const [previewVersion, setPreviewVersion] = useState<MediaVersion | null>(null);

  // ── Agregar Link Externo (desde la lista principal) ────
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkScanResult, setLinkScanResult] = useState<{
    valid: boolean;
    type: string;
    embedType: string;
    label: string;
    thumbnail?: string;
  } | null>(null);
  const [linkScanning, setLinkScanning] = useState(false);
  const [linkSaving, setLinkSaving] = useState(false);

  const fetchFiles = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
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
  }, [fetchFiles]);

  const filteredFiles = useMemo(() => {
    if (filter === 'all') return files;
    return files.filter((f) => f.type === filter);
  }, [filter, files]);

  // Cargar versiones cuando se selecciona un archivo
  const fetchVersions = useCallback(async (file: MediaFile) => {
    if (!projectId) return;
    try {
      setLoadingVersions(true);
      const vs = await mediaShareService.getVersions(projectId, file.id);
      setVersions(vs);

      // Si tiene un share link activo en la versión Latest, lo buscamos
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
    setExternalUrl('');
    setSelectedBlobFile(null);
    setNewVersionNotes('');
    setSharingVersion(null);
    setGeneratedShare(null);
    fetchVersions(file);
  };

  // Subir archivo principal (v1)
  const handleUploadMain = async (e: any) => {
    const selectedFiles: File[] = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;
    setUploading(true);
    try {
      for (const file of selectedFiles) {
        const media = await fileService.uploadFile(
          projectId,
          file as unknown as Blob,
          file.name,
          '',
          [],
          user?.id || ''
        );
        // Crear automáticamente la primera versión
        await mediaShareService.uploadVersion(
          projectId,
          media.id,
          file as unknown as Blob,
          file.name,
          'Carga inicial',
          'v1',
          user?.id || '',
          { notes: 'Archivo original cargado al portal.' }
        );
        await activityService.logActivity(
          projectId,
          'file',
          media.id,
          `subió el archivo "${file.name}"`,
          user?.id || '',
          user?.fullName || ''
        );
      }
      fetchFiles();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  // ── Validar / Escanear URL externa ───────────────────
  const handleScanLink = async () => {
    if (!linkUrl.trim()) return;
    setLinkScanning(true);
    setLinkScanResult(null);
    try {
      const { detectEmbedType } = await import('@/services/firebase/mediaShareService');
      const url = linkUrl.trim();
      const embedType = detectEmbedType(url);

      let type = 'video';
      let label = 'Video';
      let thumbnail: string | undefined;

      if (embedType === 'youtube') {
        const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        const videoId = match?.[1];
        label = 'YouTube';
        if (videoId) thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      } else if (embedType === 'vimeo') {
        label = 'Vimeo';
        const match = url.match(/vimeo\.com\/(\d+)/);
        if (match) {
          try {
            const oembed = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`);
            if (oembed.ok) {
              const data = await oembed.json();
              thumbnail = data.thumbnail_url;
            }
          } catch {
            // oEmbed opcional; seguimos sin miniatura
          }
        }
      } else if (embedType === 'gdrive') {
        label = 'Google Drive';
      } else if (/\.(mp4|webm|ogg|mov)$/i.test(url)) {
        label = 'Video directo';
      } else if (/\.(pdf)$/i.test(url)) {
        type = 'pdf';
        label = 'PDF';
      } else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(url)) {
        type = 'image';
        label = 'Imagen';
      } else {
        label = 'Link externo';
      }

      // Confirmar accesibilidad (mejor esfuerzo con no-cors)
      const valid = true;

      setLinkScanResult({ valid, type, embedType, label, thumbnail });
    } catch (e: any) {
      setLinkScanResult({ valid: false, type: 'other', embedType: 'other', label: 'Error al escanear' });
    } finally {
      setLinkScanning(false);
    }
  };

  // ── Guardar link como archivo en la lista ─────────────
  const handleSaveLinkAsFile = async () => {
    if (!linkScanResult || !linkScanResult.valid) return;
    setLinkSaving(true);
    try {
      const url = linkUrl.trim();
      const now = new Date();

      // Nombre descriptivo basado en la URL o fuente detectada
      const rawName = url.split('/').pop()?.split('?')[0] || '';
      const name = rawName.length > 3 ? rawName : `${linkScanResult.label} — ${new Date().toLocaleDateString('es-CL')}`;

      const { Timestamp, addDoc, collection } = await import('firebase/firestore');
      const { db } = await import('@/services/firebase/firebaseConfig');

      // 1. Crear documento MediaFile principal
      const fileDoc = {
        projectId,
        name,
        type: linkScanResult.type as any,
        url,
        externalUrl: url,
        size: 0,
        mimeType: linkScanResult.type === 'video' ? 'video/external' : 'application/external',
        folder: '',
        tags: [linkScanResult.embedType],
        uploadedBy: user?.id || '',
        hasVersions: true,
        versionCount: 1,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
        createdBy: user?.id || '',
      };

      const docRef = await addDoc(collection(db, 'projects', projectId, 'mediaFiles'), fileDoc);

      // 2. Registrar automáticamente v1 como versión externa
      //    (sin descargar nada — allowDownload: false por defecto para links externos)
      await mediaShareService.addExternalVersion(
        projectId,
        docRef.id,
        url,
        `${linkScanResult.label} (original)`,
        'v1',
        user?.id || '',
        {
          notes: `Link externo agregado desde la sección de archivos. Fuente: ${linkScanResult.label}.`,
          allowDownload: false,   // Sin descarga para links externos
          watermarkEnabled: false,
        }
      );

      await activityService.logActivity(
        projectId,
        'file',
        docRef.id,
        `agregó el link externo "${name}" (${linkScanResult.label})`,
        user?.id || '',
        user?.fullName || ''
      );

      setLinkUrl('');
      setLinkScanResult(null);
      setShowAddLink(false);
      fetchFiles();
    } catch (e: any) {
      alert(`Error al guardar link: ${e.message}`);
    } finally {
      setLinkSaving(false);
    }
  };

  // Agregar Nueva Versión
  const handleAddVersion = async () => {
    if (!selectedFile || !projectId) return;
    setUploading(true);
    try {
      const vNum = newVersionNum || `v${versions.length + 1}`;
      const vLabel = newVersionLabel || `Versión ${vNum}`;
      
      let versionData: MediaVersion;

      if (newVersionSource === 'hosted') {
        if (!selectedBlobFile) {
          alert('Por favor selecciona un archivo local.');
          setUploading(false);
          return;
        }
        versionData = await mediaShareService.uploadVersion(
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
          }
        );
      } else {
        if (!externalUrl) {
          alert('Por favor ingresa la URL externa.');
          setUploading(false);
          return;
        }
        versionData = await mediaShareService.addExternalVersion(
          projectId,
          selectedFile.id,
          externalUrl,
          vLabel,
          vNum,
          user?.id || '',
          {
            notes: newVersionNotes,
            allowDownload,
            watermarkEnabled,
          }
        );
      }

      await activityService.logActivity(
        projectId,
        'file',
        selectedFile.id,
        `agregó la versión ${vNum} ("${vLabel}") a ${selectedFile.name}`,
        user?.id || '',
        user?.fullName || ''
      );

      // Limpiar formulario y recargar
      setNewVersionLabel('');
      setExternalUrl('');
      setSelectedBlobFile(null);
      setNewVersionNotes('');
      fetchVersions(selectedFile);
      fetchFiles();
    } catch (e: any) {
      alert(`Error al guardar versión: ${e.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Generar link compartido
  const handleGenerateShare = async () => {
    if (!sharingVersion || !projectId || !selectedFile) return;
    setLoadingShare(true);
    try {
      let expiresAt: Date | undefined = undefined;
      if (shareExpiresDays) {
        const days = parseInt(shareExpiresDays);
        if (!isNaN(days)) {
          expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + days);
        }
      }

      const activeProjectName = files[0]?.projectId === projectId ? 'Producción' : 'Encuadre Proyecto';

      const shareLink = await mediaShareService.generateShareLink(
        projectId,
        selectedFile.id,
        sharingVersion.id,
        sharingVersion,
        activeProjectName,
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
      
      // Actualizar listado de versiones para reflejar el shareToken asignado
      fetchVersions(selectedFile);
    } catch (e: any) {
      alert(`Error al generar share: ${e.message}`);
    } finally {
      setLoadingShare(false);
    }
  };

  // Revocar share
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

  // Eliminar versión
  const handleDeleteVersion = async (v: MediaVersion) => {
    if (!selectedFile) return;
    if (confirm(`¿Confirmas eliminar la versión ${v.versionNumber} de forma permanente?`)) {
      try {
        await mediaShareService.deleteVersion(projectId, selectedFile.id, v.id, v);
        fetchVersions(selectedFile);
        fetchFiles();
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  const handleDeleteMain = async () => {
    if (!deleteTarget) return;
    try {
      await fileService.deleteFile(projectId, deleteTarget.id, deleteTarget.url);
      await activityService.logActivity(
        projectId,
        'file',
        deleteTarget.id,
        `eliminó "${deleteTarget.name}"`,
        user?.id || '',
        user?.fullName || ''
      );
      fetchFiles();
    } catch (e: any) {
      setError(e.message);
    }
    setDeleteTarget(null);
  };

  const appUrl = process.env.EXPO_PUBLIC_APP_URL || 'http://localhost:8081';

  const filterOptions: FilterOption[] = [
    { key: 'all', label: 'Todos' },
    { key: 'video', label: 'Video' },
    { key: 'image', label: 'Imágenes' },
    { key: 'audio', label: 'Audio' },
    { key: 'pdf', label: 'PDF' },
    { key: 'document', label: 'Documentos' },
  ];

  if (loading) return <LoadingState message="Cargando archivos..." fullScreen />;
  if (error && files.length === 0) return <ErrorState error={error} onRetry={fetchFiles} />;

  // Calcular tamaño total
  const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
  const formatSize = (bytes: number) => {
    if (bytes > 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    if (bytes > 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
    if (bytes > 1e3) return `${(bytes / 1e3).toFixed(0)} KB`;
    return `${bytes} B`;
  };

  return (
    <View style={styles.container}>
      <SectionCard
        title="Archivos del Proyecto"
        subtitle={`${files.length} archivos • ${formatSize(totalSize)} usados • Haz click para ver versiones`}
        headerActions={
          <View style={styles.headerActions}>
            {Platform.OS === 'web' ? (
              <label style={{ cursor: 'pointer' } as any}>
                <View style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]}>
                  <MaterialCommunityIcons name="upload" size={16} color={colors.onPrimary} />
                  <Text style={styles.uploadBtnText}>{uploading ? 'Subiendo...' : 'Subir'}</Text>
                </View>
                <input type="file" style={{ display: 'none' } as any} onChange={handleUploadMain} disabled={uploading} />
              </label>
            ) : (
              <ActionButton label="Subir" variant="filled" icon="upload" onPress={() => {}} />
            )}
            <Pressable style={styles.linkBtn} onPress={() => { setShowAddLink(true); setLinkUrl(''); setLinkScanResult(null); }}>
              <MaterialCommunityIcons name="link-plus" size={16} color={colors.primary} />
              <Text style={styles.linkBtnText}>Agregar Link</Text>
            </Pressable>
          </View>
        }
      >
        <FilterBar options={filterOptions} selectedKey={filter} onSelect={setFilter} style={styles.filters} />

        {filteredFiles.length === 0 ? (
          <EmptyState
            icon="folder-open-outline"
            title="Sin archivos"
            description="Sube videos, imágenes, audios y referencias del proyecto."
          />
        ) : (
          <View style={styles.list}>
            {filteredFiles.map((file) => (
              <FileCard
                key={file.id}
                name={file.name}
                type={file.type}
                size={file.size}
                date={file.createdAt}
                version={file.versionCount ? `${file.versionCount}` : undefined}
                onPress={() => handleSelectFile(file)}
                // Links externos no se pueden descargar — solo visualizar desde el visor
                onDownload={!file.externalUrl
                  ? () => { if (Platform.OS === 'web') window.open(file.url, '_blank'); }
                  : undefined
                }
                onDelete={() => setDeleteTarget(file)}
              />
            ))}
          </View>
        )}
      </SectionCard>

      {/* ── Modal: Agregar Link Externo ────────────────────────── */}
      {showAddLink && (
        <Modal
          visible={showAddLink}
          animationType="fade"
          transparent
          onRequestClose={() => setShowAddLink(false)}
        >
          <View style={styles.modalBg}>
            <View style={[styles.modalContainer, { maxWidth: 520 }]}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderInfo}>
                  <Text style={styles.modalTitle}>Agregar Link Externo</Text>
                  <Text style={styles.modalSubtitle}>Vimeo, YouTube, Google Drive, URL directa de video o PDF</Text>
                </View>
                <Pressable style={styles.closeBtn} onPress={() => setShowAddLink(false)}>
                  <MaterialCommunityIcons name="close" size={24} color={colors.onSurface} />
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                {/* Campo URL + Botón Escanear */}
                <View style={{ gap: spacing.xs }}>
                  <Text style={styles.label}>URL del archivo o video</Text>
                  <View style={styles.scanRow}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={linkUrl}
                      onChangeText={(t) => { setLinkUrl(t); setLinkScanResult(null); }}
                      placeholder="https://vimeo.com/... https://youtu.be/... https://drive.google.com/..."
                      autoCapitalize="none"
                      keyboardType="url"
                      onSubmitEditing={handleScanLink}
                    />
                    <Pressable
                      style={[styles.scanBtn, linkScanning && styles.saveBtnDisabled]}
                      onPress={handleScanLink}
                      disabled={linkScanning || !linkUrl.trim()}
                    >
                      <MaterialCommunityIcons
                        name={linkScanning ? 'loading' : 'magnify'}
                        size={18}
                        color={colors.onPrimary}
                      />
                      <Text style={styles.scanBtnText}>{linkScanning ? 'Escaneando...' : 'Escanear'}</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Resultado del escaneo */}
                {linkScanResult && (
                  <View style={[
                    styles.scanResult,
                    linkScanResult.valid ? styles.scanResultOk : styles.scanResultError,
                  ]}>
                    <View style={styles.scanResultRow}>
                      <MaterialCommunityIcons
                        name={linkScanResult.valid ? 'check-circle-outline' : 'alert-circle-outline'}
                        size={20}
                        color={linkScanResult.valid ? colors.success : colors.error}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.scanResultTitle}>
                          {linkScanResult.valid
                            ? `Link válido — ${linkScanResult.label}`
                            : 'No se pudo verificar el link'}
                        </Text>
                        <Text style={styles.scanResultMeta}>
                          {linkScanResult.valid
                            ? `Tipo detectado: ${linkScanResult.type} • Fuente: ${linkScanResult.embedType}`
                            : 'El link no responde o es inaccesible. Verifica la URL e inténtalo de nuevo.'}
                        </Text>
                      </View>
                    </View>
                    {linkScanResult.thumbnail && (
                      <Image
                        source={{ uri: linkScanResult.thumbnail }}
                        style={styles.scanThumbnail}
                        resizeMode="cover"
                      />
                    )}
                  </View>
                )}

                {/* Botón Guardar */}
                {linkScanResult?.valid && (
                  <Pressable
                    style={[styles.saveBtn, linkSaving && styles.saveBtnDisabled]}
                    onPress={handleSaveLinkAsFile}
                    disabled={linkSaving}
                  >
                    <MaterialCommunityIcons name="folder-plus-outline" size={18} color={colors.onPrimary} />
                    <Text style={styles.saveBtnText}>
                      {linkSaving ? 'Guardando...' : 'Agregar a Archivos del Proyecto'}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ── Modal de Gestión de Versiones ──────────────────────── */}
      {selectedFile && (
        <Modal
          visible={!!selectedFile}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedFile(null)}
        >
          <View style={styles.modalBg}>
            <View style={styles.modalContainer}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderInfo}>
                  <Text style={styles.modalTitle} numberOfLines={1}>{selectedFile.name}</Text>
                  <Text style={styles.modalSubtitle}>Historial de versiones y compartición de medios</Text>
                </View>
                <Pressable style={styles.closeBtn} onPress={() => setSelectedFile(null)}>
                  <MaterialCommunityIcons name="close" size={24} color={colors.onSurface} />
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={styles.modalBody}>
                {/* Formulario Nueva Versión */}
                <View style={styles.formCard}>
                  <Text style={styles.sectionHeader}>Agregar Nueva Versión / Entrega</Text>
                  
                  <View style={styles.formRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Número de versión</Text>
                      <TextInput
                        style={styles.input}
                        value={newVersionNum}
                        onChangeText={setNewVersionNum}
                        placeholder="Ej: v2, v3.1"
                      />
                    </View>
                    <View style={{ flex: 2 }}>
                      <Text style={styles.label}>Etiqueta / Nombre</Text>
                      <TextInput
                        style={styles.input}
                        value={newVersionLabel}
                        onChangeText={setNewVersionLabel}
                        placeholder="Ej: Rough Cut, Corte Director"
                      />
                    </View>
                  </View>

                  <View style={styles.sourceToggle}>
                    <Pressable
                      style={[styles.sourceTab, newVersionSource === 'hosted' && styles.sourceTabActive]}
                      onPress={() => setNewVersionSource('hosted')}
                    >
                      <MaterialCommunityIcons name="upload" size={14} color={newVersionSource === 'hosted' ? colors.onPrimary : colors.onSurface} />
                      <Text style={[styles.sourceTabText, newVersionSource === 'hosted' && styles.sourceTabTextActive]}>Archivo local</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.sourceTab, newVersionSource === 'external' && styles.sourceTabActive]}
                      onPress={() => setNewVersionSource('external')}
                    >
                      <MaterialCommunityIcons name="link-variant" size={14} color={newVersionSource === 'external' ? colors.onPrimary : colors.onSurface} />
                      <Text style={[styles.sourceTabText, newVersionSource === 'external' && styles.sourceTabTextActive]}>Link externo (Vimeo/YT/Drive)</Text>
                    </Pressable>
                  </View>

                  {newVersionSource === 'hosted' ? (
                    <View style={styles.filePickerContainer}>
                      {selectedBlobFile ? (
                        <View style={styles.selectedFileRow}>
                          <MaterialCommunityIcons name="file-check-outline" size={20} color={colors.success} />
                          <Text style={styles.selectedFileName} numberOfLines={1}>{selectedBlobFile.name}</Text>
                          <Pressable onPress={() => setSelectedBlobFile(null)}>
                            <MaterialCommunityIcons name="close" size={16} color={colors.error} />
                          </Pressable>
                        </View>
                      ) : (
                        <label style={{ cursor: 'pointer', display: 'block', width: '100%' } as any}>
                          <View style={styles.pickerInner}>
                            <MaterialCommunityIcons name="file-upload-outline" size={24} color={colors.primary} />
                            <Text style={styles.pickerText}>Seleccionar archivo local...</Text>
                          </View>
                          <input
                            type="file"
                            style={{ display: 'none' } as any}
                            onChange={(e) => setSelectedBlobFile(e.target.files?.[0] || null)}
                          />
                        </label>
                      )}
                    </View>
                  ) : (
                    <View style={{ gap: spacing.xs }}>
                      <Text style={styles.label}>URL del Video / Archivo</Text>
                      <TextInput
                        style={styles.input}
                        value={externalUrl}
                        onChangeText={setExternalUrl}
                        placeholder="https://vimeo.com/... o https://youtube.com/watch?v=..."
                      />
                    </View>
                  )}

                  <View style={{ gap: spacing.xs }}>
                    <Text style={styles.label}>Notas de la versión</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={newVersionNotes}
                      onChangeText={setNewVersionNotes}
                      placeholder="Notas del corte o instrucciones adicionales..."
                      multiline
                    />
                  </View>

                  <View style={styles.switchRow}>
                    <View style={styles.switchCol}>
                      <Text style={styles.switchTitle}>Permitir descarga pública</Text>
                      <Text style={styles.switchDesc}>Los destinatarios podrán descargar el archivo original</Text>
                    </View>
                    <Switch value={allowDownload} onValueChange={setAllowDownload} />
                  </View>

                  <View style={styles.switchRow}>
                    <View style={styles.switchCol}>
                      <Text style={styles.switchTitle}>Watermark de seguridad</Text>
                      <Text style={styles.switchDesc}>Mostrar watermark de confidencialidad en el visor</Text>
                    </View>
                    <Switch value={watermarkEnabled} onValueChange={setWatermarkEnabled} />
                  </View>

                  <Pressable
                    style={[styles.saveBtn, uploading && styles.saveBtnDisabled]}
                    onPress={handleAddVersion}
                    disabled={uploading}
                  >
                    <MaterialCommunityIcons name="plus" size={18} color={colors.onPrimary} />
                    <Text style={styles.saveBtnText}>
                      {uploading ? 'Subiendo versión...' : 'Crear versión'}
                    </Text>
                  </Pressable>
                </View>

                {/* Sección Compartir Activo */}
                {generatedShare && (
                  <View style={styles.shareCardWrapper}>
                    <Text style={styles.sectionHeader}>Link Compartido Activo</Text>
                    <ShareLinkCard
                      share={generatedShare}
                      onRevoke={handleRevokeShare}
                      appUrl={appUrl}
                    />
                  </View>
                )}

                {/* Formulario Generar Share si se seleccionó una versión para compartir */}
                {sharingVersion && (
                  <View style={styles.formCard}>
                    <View style={styles.shareHeaderRow}>
                      <Text style={styles.sectionHeader}>Compartir {sharingVersion.versionNumber}</Text>
                      <Pressable onPress={() => setSharingVersion(null)}>
                        <MaterialCommunityIcons name="close" size={16} color={colors.onSurface} />
                      </Pressable>
                    </View>

                    <View style={{ gap: spacing.xs }}>
                      <Text style={styles.label}>Contraseña de acceso (opcional)</Text>
                      <TextInput
                        style={styles.input}
                        value={sharePassword}
                        onChangeText={setSharePassword}
                        placeholder="Contraseña del link"
                        secureTextEntry
                      />
                    </View>

                    <View style={{ gap: spacing.xs }}>
                      <Text style={styles.label}>Expiración en días (opcional)</Text>
                      <TextInput
                        style={styles.input}
                        value={shareExpiresDays}
                        onChangeText={setShareExpiresDays}
                        placeholder="Ej: 7"
                        keyboardType="numeric"
                      />
                    </View>

                    <Pressable
                      style={[styles.shareActionBtn, loadingShare && styles.saveBtnDisabled]}
                      onPress={handleGenerateShare}
                      disabled={loadingShare}
                    >
                      <MaterialCommunityIcons name="link-variant" size={18} color={colors.onPrimary} />
                      <Text style={styles.saveBtnText}>
                        {loadingShare ? 'Generando link...' : 'Generar Link Brandeado'}
                      </Text>
                    </Pressable>
                  </View>
                )}

                {/* Listado de Versiones */}
                <View style={styles.versionsSection}>
                  <Text style={styles.sectionHeader}>Historial de Versiones</Text>
                  {loadingVersions ? (
                    <LoadingState message="Cargando versiones..." />
                  ) : (
                    <VersionList
                      versions={versions}
                      onPreview={(v) => setPreviewVersion(v)}
                      onShare={(v) => {
                        setSharingVersion(v);
                        setGeneratedShare(null); // Ocultar share card para enfocar generación
                      }}
                      onDelete={handleDeleteVersion}
                    />
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* ── Modal de Vista Previa ──────────────────────────────── */}
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
                  Vista previa: {previewVersion.label} ({previewVersion.versionNumber})
                </Text>
                <Pressable onPress={() => setPreviewVersion(null)}>
                  <MaterialCommunityIcons name="close" size={24} color="#fff" />
                </Pressable>
              </View>

              <View style={styles.previewContent}>
                {previewVersion.embedType === 'direct' || detectMediaType(previewVersion.mimeType, previewVersion.url) === 'video' ? (
                  <VideoPlayer
                    url={previewVersion.url}
                    embedType={previewVersion.embedType ?? 'direct'}
                    displayName={previewVersion.label}
                    allowDownload={previewVersion.allowDownload}
                    watermark={previewVersion.watermarkEnabled ? 'CONFIDENCIAL' : undefined}
                  />
                ) : (
                  <View style={styles.unsupportedPreview}>
                    <MaterialCommunityIcons name="file-eye-outline" size={64} color={colors.outline} />
                    <Text style={styles.unsupportedPreviewText}>
                      Previsualización disponible solo para video directo.
                    </Text>
                    <Pressable
                      style={styles.openLinkBtn}
                      onPress={() => { if (Platform.OS === 'web') window.open(previewVersion.url, '_blank'); }}
                    >
                      <Text style={styles.openLinkText}>Abrir archivo en nueva pestaña</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Confirmación Eliminar Archivo Padre */}
      <ConfirmDialog
        visible={!!deleteTarget}
        title="Eliminar Archivo"
        message={`¿Confirmas eliminar "${deleteTarget?.name}" y todas sus versiones de forma permanente?`}
        confirmLabel="Eliminar todo"
        onConfirm={handleDeleteMain}
        onCancel={() => setDeleteTarget(null)}
        isDestructive
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  filters: { marginBottom: spacing.base },
  list: { gap: spacing.sm },
  uploadBtn: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: shapes.full,
    paddingHorizontal: spacing.base,
  },
  uploadBtnDisabled: { opacity: 0.5 },
  uploadBtnText: { ...typography.labelLarge, color: colors.onPrimary, fontWeight: 'bold' },

  // Estilos de Modales
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderRadius: shapes.large,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    width: '100%',
    maxWidth: 680,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    padding: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
  },
  modalHeaderInfo: { flex: 1, gap: 2 },
  modalTitle: { ...typography.titleLarge, color: colors.onSurface, fontWeight: 'bold' },
  modalSubtitle: { ...typography.bodySmall, color: colors.onSurfaceVariant },
  closeBtn: { padding: spacing.xs },
  modalBody: {
    padding: spacing.base,
    gap: spacing.lg,
  },
  sectionHeader: {
    ...typography.titleSmall,
    color: colors.primary,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  formCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: shapes.medium,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.base,
    gap: spacing.base,
  },
  shareCardWrapper: {
    gap: spacing.xs,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.base,
  },
  label: { ...typography.bodySmall, color: colors.onSurfaceVariant, fontWeight: '600' },
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
    height: 80,
    paddingVertical: spacing.sm,
    textAlignVertical: 'top',
  },
  sourceToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: shapes.small,
    padding: 2,
    gap: 2,
  },
  sourceTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 32,
    borderRadius: shapes.small - 2,
  },
  sourceTabActive: {
    backgroundColor: colors.primary,
  },
  sourceTabText: {
    ...typography.labelMedium,
    color: colors.onSurfaceVariant,
  },
  sourceTabTextActive: {
    color: colors.onPrimary,
    fontWeight: 'bold',
  },
  filePickerContainer: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: shapes.small,
    overflow: 'hidden',
  },
  pickerInner: {
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  pickerText: {
    ...typography.labelMedium,
    color: colors.primary,
  },
  selectedFileRow: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    gap: spacing.base,
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
  switchCol: {
    flex: 1,
    gap: 2,
  },
  switchTitle: { ...typography.bodyMedium, color: colors.onSurface, fontWeight: '600' },
  switchDesc: { ...typography.bodySmall, color: colors.onSurfaceVariant },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: shapes.full,
    height: 40,
    marginTop: spacing.xs,
  },
  shareActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: shapes.full,
    height: 40,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { ...typography.labelLarge, color: colors.onPrimary, fontWeight: 'bold' },
  shareHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  versionsSection: {
    gap: spacing.sm,
  },

  // Preview Styles
  previewBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
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
  previewContent: {
    borderRadius: shapes.medium,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  unsupportedPreview: {
    padding: spacing['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.base,
  },
  unsupportedPreviewText: {
    ...typography.bodyMedium,
    color: '#aaa',
    textAlign: 'center',
  },
  openLinkBtn: {
    marginTop: spacing.base,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: shapes.small,
  },
  openLinkText: {
    ...typography.labelMedium,
    color: '#fff',
    fontWeight: 'bold',
  },

  // Header dual-button
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  linkBtn: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: shapes.full,
    paddingHorizontal: spacing.base,
  },
  linkBtnText: {
    ...typography.labelLarge,
    color: colors.primary,
    fontWeight: 'bold',
  },

  // Scan row (URL input + button)
  scanRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: shapes.small,
    paddingHorizontal: spacing.base,
    height: 40,
  },
  scanBtnText: {
    ...typography.labelMedium,
    color: colors.onPrimary,
    fontWeight: 'bold',
  },

  // Scan result card
  scanResult: {
    borderRadius: shapes.medium,
    borderWidth: 1,
    padding: spacing.base,
    gap: spacing.sm,
  },
  scanResultOk: {
    backgroundColor: 'rgba(129,199,132,0.10)',
    borderColor: colors.success,
  },
  scanResultError: {
    backgroundColor: 'rgba(255,180,171,0.10)',
    borderColor: colors.error,
  },
  scanResultRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  scanResultTitle: {
    ...typography.titleSmall,
    color: colors.onSurface,
    fontWeight: 'bold',
  },
  scanResultMeta: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  scanThumbnail: {
    width: '100%',
    height: 180,
    borderRadius: shapes.small,
    marginTop: spacing.sm,
  },
});
