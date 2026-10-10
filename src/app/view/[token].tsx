import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  Pressable,
  Platform,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { typography, shapes, spacing } from '@/theme/tokens';
import { brand, brandAssets } from '@/constants/brand';
import { mediaShareService } from '@/services/firebase/mediaShareService';
import { driveService, DriveFile } from '@/services/firebase/driveService';
import { SharedMediaLink } from '@/types';
import { VideoPlayer } from '@/components/m3/VideoPlayer';
import { DocumentViewer } from '@/components/m3/DocumentViewer';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const GRADIENT_OVERLAY = 'linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,0.85) 100%)';

const isFolder = (mime: string) => mime === 'application/vnd.google-apps.folder';

const formatSize = (bytes?: string) => {
  if (!bytes) return '';
  const n = parseInt(bytes);
  if (isNaN(n)) return '';
  if (n > 1e9) return `${(n / 1e9).toFixed(1)} GB`;
  if (n > 1e6) return `${(n / 1e6).toFixed(1)} MB`;
  if (n > 1e3) return `${(n / 1e3).toFixed(0)} KB`;
  return `${n} B`;
};

export default function PublicMediaViewer() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const [share, setShare] = useState<SharedMediaLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pwError, setPwError] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Folder browsing state (for drive_folder shares)
  const [folderFiles, setFolderFiles] = useState<DriveFile[]>([]);
  const [folderLoading, setFolderLoading] = useState(false);
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([]);
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);
  const [folderError, setFolderError] = useState<string | null>(null);

  const fetchShareData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const data = await mediaShareService.getShareByToken(token);
      if (!data) {
        setError('El enlace que buscas no existe o fue revocado.');
        return;
      }
      if (!data.isActive) {
        setError('Este enlace ha sido desactivado por el administrador.');
        return;
      }
      if (data.expiresAt && new Date() > data.expiresAt) {
        setError('Este enlace ha expirado.');
        return;
      }

      setShare(data);
      if (!data.password) {
        setIsUnlocked(true);
        if (data.sourceType !== 'drive_folder') {
          await mediaShareService.incrementShareView(data.id, data.viewCount);
        }
      }
    } catch (e: any) {
      console.error('Error al obtener share link:', e);
      setError('Ocurrió un error al cargar la información del archivo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShareData();
  }, [token]);

  const loadFolder = useCallback(async (folderId: string) => {
    setFolderLoading(true);
    setFolderError(null);
    const result = await driveService.listFiles(folderId);
    setFolderFiles(result.files);
    if (result.files.length === 0) {
      setFolderError('Esta carpeta está vacía o no tiene archivos accesibles.');
    }
    setFolderLoading(false);
  }, []);

  useEffect(() => {
    if (isUnlocked && share?.sourceType === 'drive_folder' && share.folderId) {
      loadFolder(share.folderId);
    }
  }, [isUnlocked, share?.sourceType, share?.folderId]);

  const navigateFolder = async (file: DriveFile) => {
    if (!isFolder(file.mimeType)) return;
    setFolderPath(prev => [...prev, { id: file.id, name: file.name }]);
    await loadFolder(file.id);
  };

  const navigateBack = async () => {
    if (folderPath.length === 0) return;
    const newPath = folderPath.slice(0, -1);
    const prevId = newPath.length > 0 ? newPath[newPath.length - 1].id : share!.folderId!;
    setFolderPath(newPath);
    await loadFolder(prevId);
  };

  const handleUnlock = async () => {
    if (!share) return;
    if (password === share.password) {
      setIsUnlocked(true);
      setPwError(false);
      if (share.sourceType !== 'drive_folder') {
        await mediaShareService.incrementShareView(share.id, share.viewCount);
      }
    } else {
      setPwError(true);
    }
  };

  const folders = folderFiles.filter(f => isFolder(f.mimeType));
  const videoFiles = folderFiles.filter(f => f.mimeType.startsWith('video/'));
  const imageFiles = folderFiles.filter(f => f.mimeType.startsWith('image/'));
  const mediaFiles = folderFiles.filter(f =>
    f.mimeType.startsWith('video/') || f.mimeType.startsWith('image/') || f.mimeType === 'application/pdf'
  );
  const otherFiles = folderFiles.filter(f => !isFolder(f.mimeType) && !mediaFiles.includes(f));

  const isDriveFolder = share?.sourceType === 'drive_folder';

  if (loading) {
    return (
      <View style={styles.cinemaContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.logoContainer}>
          <Image source={brandAssets.logoSvg} style={{ height: 24, width: 120, tintColor: '#C5C0FF' } as any} resizeMode="contain" />
        </View>
        <View style={styles.loadingCenter}>
          <View style={styles.loadingSpinner}>
            <MaterialCommunityIcons name="loading" size={32} color="#C5C0FF" />
          </View>
          <Text style={styles.loadingSubtext}>Preparando tu experiencia de visionado...</Text>
        </View>
        <Text style={styles.cinemaFooter}>{brand.footer}</Text>
      </View>
    );
  }

  if (error || !share) {
    return (
      <View style={styles.cinemaContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.errorContent}>
          <View style={styles.errorIconContainer}>
            <MaterialCommunityIcons name="link-variant-off" size={40} color="rgba(197, 192, 255, 0.6)" />
          </View>
          <Text style={styles.errorTitle}>Contenido no disponible</Text>
          <Text style={styles.errorDescription}>{error || 'El recurso no está disponible.'}</Text>
          <Pressable style={styles.retryBtn} onPress={fetchShareData}>
            <Text style={styles.retryBtnText}>Intentar de nuevo</Text>
          </Pressable>
        </View>
        <Text style={styles.cinemaFooter}>{brand.footer}</Text>
      </View>
    );
  }

  if (!isUnlocked) {
    return (
      <View style={styles.cinemaContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.logoTopLeft}>
          <Image source={brandAssets.logoSvg} style={{ height: 20, width: 100 } as any} resizeMode="contain" />
        </View>
        <View style={styles.lockCenter}>
          <View style={styles.lockCard}>
            <View style={styles.lockIconContainer}>
              <MaterialCommunityIcons name="lock-outline" size={28} color="#C5C0FF" />
            </View>
            <Text style={styles.lockTitle}>Acceso Protegido</Text>
            <Text style={styles.lockSubtitle}>
              Esta producción de <Text style={{ fontWeight: 'bold' }}>{share.projectName}</Text> está protegida.
            </Text>
            <TextInput
              style={[styles.pwInput, pwError && styles.pwInputError]}
              placeholder="Contraseña de acceso"
              placeholderTextColor="rgba(255,255,255,0.35)"
              secureTextEntry
              value={password}
              onChangeText={(text) => { setPassword(text); setPwError(false); }}
              onSubmitEditing={handleUnlock}
              autoFocus
            />
            {pwError && (
              <Text style={styles.pwErrorText}>Contraseña incorrecta. Inténtalo de nuevo.</Text>
            )}
            <Pressable style={styles.unlockBtn} onPress={handleUnlock}>
              <Text style={styles.unlockBtnText}>Acceder al contenido</Text>
            </Pressable>
          </View>
        </View>
        <Text style={styles.cinemaFooter}>{brand.footer}</Text>
      </View>
    );
  }

  const getThumbUrl = (file: DriveFile) => {
    if (file.thumbnailLink) {
      const url = new URL(file.thumbnailLink);
      url.searchParams.set('sz', 'w120');
      return url.toString();
    }
    return null;
  };

  const ViewerThumb: React.FC<{ file: DriveFile }> = ({ file }) => {
    const [failed, setFailed] = useState(false);
    const thumb = getThumbUrl(file);
    if (!thumb || failed) {
      return (
        <MaterialCommunityIcons
          name={isFolder(file.mimeType) ? 'folder-outline' : file.mimeType.startsWith('video/') ? 'filmstrip' : 'image-outline'}
          size={18}
          color="#C5C0FF"
        />
      );
    }
    return <Image source={{ uri: thumb }} style={{ width: 36, height: 36, borderRadius: 8 }} onError={() => setFailed(true)} />;
  };

  // ── Drive Folder Viewer ──────────────────────────────
  if (isDriveFolder) {
    const folderTitle = share.folderName || share.displayName;
    const ogImage = previewFile?.mimeType.startsWith('image/')
      ? `https://drive.google.com/thumbnail?id=${previewFile.id}&sz=w800`
      : undefined;
    return (
      <View style={styles.cinemaContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Head>
          <title>{folderTitle} — {share.projectName} | Encuadre</title>
          <meta name="description" content={`Carpeta "${folderTitle}" del proyecto ${share.projectName} — Portal de Producción de Grupo Encuadre Chile.`} />
          <meta property="og:title" content={`${folderTitle} — ${share.projectName}`} />
          <meta property="og:description" content={`Carpeta compartida del proyecto ${share.projectName} — Portal de Producción de Grupo Encuadre Chile.`} />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Encuadre Portal de Producción" />
          {ogImage && <meta property="og:image" content={ogImage} />}
          <meta name="twitter:card" content={ogImage ? 'summary_large_image' : 'summary'} />
          <meta name="twitter:title" content={`${folderTitle} — ${share.projectName}`} />
          <meta name="twitter:description" content={`Carpeta compartida del proyecto ${share.projectName}`} />
          {ogImage && <meta name="twitter:image" content={ogImage} />}
        </Head>

        {/* Header */}
        <View style={styles.folderHeader}>
          <View style={styles.folderHeaderRow}>
            <MaterialCommunityIcons name="google-drive" size={20} color="#C5C0FF" />
            <Text style={styles.folderTitle} numberOfLines={1}>{share.folderName || share.displayName}</Text>
          </View>
          <Text style={styles.folderProject}>{share.projectName}</Text>
        </View>

        {/* Preview mode */}
        {previewFile ? (
          <View style={{ flex: 1 }}>
            <View style={styles.folderPreviewTop}>
              <Pressable onPress={() => setPreviewFile(null)} style={styles.previewBackBtn}>
                <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
                <Text style={styles.previewBackText}>Volver a carpeta</Text>
              </Pressable>
              <Text style={styles.previewFileName} numberOfLines={1}>{previewFile.name}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#000' }}>
              {previewFile.mimeType.startsWith('video/') ? (
                <VideoPlayer
                  url={previewFile.embedUrl}
                  embedType="gdrive"
                  displayName={previewFile.name}
                  allowDownload={false}
                  watermark={share.watermarkEnabled ? 'CONFIDENCIAL ENCUADRE' : undefined}
                  style={{ flex: 1, aspectRatio: undefined } as any}
                />
              ) : (
                <DocumentViewer
                  url={previewFile.embedUrl}
                  mediaType={previewFile.mimeType.startsWith('image/') ? 'image' : 'pdf'}
                  embedType="gdrive"
                  displayName={previewFile.name}
                  allowDownload={false}
                  watermark={share.watermarkEnabled ? 'CONFIDENCIAL ENCUADRE' : undefined}
                />
              )}
            </View>
          </View>
        ) : (
          <>
            {/* Breadcrumb */}
            <View style={styles.folderBreadcrumb}>
              {folderPath.length > 0 && (
                <Pressable onPress={navigateBack} style={styles.breadcrumbBack}>
                  <MaterialCommunityIcons name="arrow-left" size={16} color="rgba(255,255,255,0.6)" />
                </Pressable>
              )}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Pressable onPress={() => { setFolderPath([]); if (share.folderId) loadFolder(share.folderId); }}>
                  <Text style={[styles.breadcrumbItem, folderPath.length === 0 && styles.breadcrumbActive]}>
                    {share.folderName || 'Crudos'}
                  </Text>
                </Pressable>
                {folderPath.map((p, i) => (
                  <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="chevron-right" size={12} color="rgba(255,255,255,0.3)" />
                    <Text
                      style={[styles.breadcrumbItem, i === folderPath.length - 1 && styles.breadcrumbActive]}
                      numberOfLines={1}
                    >{p.name}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* File list */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: spacing.sm }}>
              {folderLoading ? (
                <View style={styles.folderLoadingBox}>
                  <ActivityIndicator color="#C5C0FF" size="small" />
                  <Text style={styles.folderLoadingText}>Cargando archivos...</Text>
                </View>
              ) : folderError ? (
                <View style={styles.folderEmptyBox}>
                  <MaterialCommunityIcons name="folder-open-outline" size={32} color="rgba(255,255,255,0.15)" />
                  <Text style={styles.folderEmptyText}>{folderError}</Text>
                </View>
              ) : (
                <>
                  {folders.length > 0 && (
                    <View style={styles.folderSection}>
                      <Text style={styles.folderSectionTitle}>Carpetas ({folders.length})</Text>
                      {folders.map(f => (
                        <Pressable key={f.id} style={styles.folderFileRow} onPress={() => navigateFolder(f)}>
                          <View style={[styles.folderFileIcon, { backgroundColor: 'rgba(197, 192, 255, 0.12)' }]}>
                            <MaterialCommunityIcons name="folder-outline" size={20} color="#C5C0FF" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.folderFileName}>{f.name}</Text>
                            <Text style={styles.folderFileMeta}>Carpeta</Text>
                          </View>
                          <MaterialCommunityIcons name="chevron-right" size={16} color="rgba(255,255,255,0.3)" />
                        </Pressable>
                      ))}
                    </View>
                  )}

                  {videoFiles.length > 0 && (
                    <View style={styles.folderSection}>
                      <Text style={styles.folderSectionTitle}>Videos ({videoFiles.length})</Text>
                      {videoFiles.map(f => (
                        <Pressable key={f.id} style={styles.folderFileRow} onPress={() => setPreviewFile(f)}>
                          <View style={[styles.folderFileIcon, { backgroundColor: 'rgba(197, 192, 255, 0.1)' }]}>
                            <ViewerThumb file={f} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.folderFileName}>{f.name}</Text>
                            <Text style={styles.folderFileMeta}>Video {f.size ? `• ${formatSize(f.size)}` : ''}</Text>
                          </View>
                          <MaterialCommunityIcons name="play-circle-outline" size={20} color="rgba(197, 192, 255, 0.6)" />
                        </Pressable>
                      ))}
                    </View>
                  )}

                  {imageFiles.length > 0 && (
                    <View style={styles.folderSection}>
                      <Text style={styles.folderSectionTitle}>Imágenes ({imageFiles.length})</Text>
                      {imageFiles.map(f => (
                        <Pressable key={f.id} style={styles.folderFileRow} onPress={() => setPreviewFile(f)}>
                          <View style={[styles.folderFileIcon, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                            <ViewerThumb file={f} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.folderFileName}>{f.name}</Text>
                            <Text style={styles.folderFileMeta}>Imagen {f.size ? `• ${formatSize(f.size)}` : ''}</Text>
                          </View>
                          <MaterialCommunityIcons name="eye-outline" size={18} color="rgba(255,255,255,0.3)" />
                        </Pressable>
                      ))}
                    </View>
                  )}

                  {otherFiles.length > 0 && (
                    <View style={styles.folderSection}>
                      <Text style={styles.folderSectionTitle}>Otros ({otherFiles.length})</Text>
                      {otherFiles.map(f => (
                        <View key={f.id} style={styles.folderFileRow}>
                          <View style={[styles.folderFileIcon, { backgroundColor: 'rgba(255,255,255,0.03)' }]}>
                            <MaterialCommunityIcons name="file-outline" size={18} color="rgba(255,255,255,0.3)" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.folderFileName}>{f.name}</Text>
                            <Text style={styles.folderFileMeta}>{f.size ? formatSize(f.size) : ''}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {folderFiles.length === 0 && (
                    <View style={styles.folderEmptyBox}>
                      <MaterialCommunityIcons name="folder-open-outline" size={32} color="rgba(255,255,255,0.15)" />
                      <Text style={styles.folderEmptyText}>Esta carpeta está vacía.</Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </>
        )}

        {/* Bottom Bar */}
        <View style={styles.bottomBar}>
          <View style={styles.bottomBarContent}>
            <View style={styles.bottomLeft}>
              <Image source={brandAssets.logoSvg} style={{ height: 16, width: 80, tintColor: '#C5C0FF' } as any} resizeMode="contain" />
            </View>
            <Text style={styles.bottomCenter}>{brand.footer}</Text>
            <View style={styles.bottomRight}>
              {!previewFile && (
                <Text style={[styles.folderFileMeta, { marginRight: spacing.sm }]}>
                  {folderFiles.length} archivos
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  }

  // ── Single File Viewer ──────────────────────────────
  const isVideo = share.mediaType === 'video';
  const getOgImage = (): string | undefined => {
    if (share.mediaType === 'image') return share.url;
    const driveIdMatch = share.url?.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveIdMatch) return `https://drive.google.com/thumbnail?id=${driveIdMatch[1]}&sz=w800`;
    return undefined;
  };
  const ogImage = getOgImage();

  return (
    <View style={styles.cinemaContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <Head>
        <title>{share.displayName} — {share.projectName} | Encuadre</title>
        <meta name="description" content={`"${share.displayName}" del proyecto ${share.projectName} — Portal de Producción de Grupo Encuadre Chile.`} />
        <meta property="og:title" content={`${share.displayName} — ${share.projectName}`} />
        <meta property="og:description" content={`Contenido compartido del proyecto ${share.projectName} — Portal de Producción de Grupo Encuadre Chile.`} />
        <meta property="og:type" content={isVideo ? 'video.other' : 'website'} />
        <meta property="og:site_name" content="Encuadre Portal de Producción" />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta name="twitter:card" content={ogImage ? 'summary_large_image' : 'summary'} />
        <meta name="twitter:title" content={`${share.displayName} — ${share.projectName}`} />
        <meta name="twitter:description" content={`Contenido compartido del proyecto ${share.projectName}`} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
      </Head>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={!isVideo || showInfo}
      >
        {/* Hero Player Section */}
        <View style={[styles.heroSection, isVideo && styles.heroVideoOnly]}>
          <View style={styles.playerWrapper}>
            {isVideo ? (
              <VideoPlayer
                url={share.url}
                embedType={share.embedType ?? 'direct'}
                displayName={share.displayName}
                allowDownload={share.allowDownload}
                watermark={share.watermarkEnabled ? 'CONFIDENCIAL ENCUADRE' : undefined}
                qualityLowUrl={share.qualityLowUrl}
              />
            ) : (
              <DocumentViewer
                url={share.url}
                mediaType={share.mediaType}
                embedType={share.embedType}
                displayName={share.displayName}
                allowDownload={share.allowDownload}
                watermark={share.watermarkEnabled ? 'CONFIDENCIAL ENCUADRE' : undefined}
              />
            )}
          </View>
        </View>

        {/* Metadata Bar */}
        <View style={styles.metaBar}>
          <View style={styles.metaLeft}>
            <Text style={styles.metaTitle}>{share.displayName}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaProject}>{share.projectName}</Text>
              <View style={styles.metaDot} />
              <MaterialCommunityIcons name="eye-outline" size={12} color="rgba(255,255,255,0.4)" />
              <Text style={styles.metaViews}>{share.viewCount} {share.viewCount === 1 ? 'vista' : 'vistas'}</Text>
            </View>
          </View>
          <View style={styles.metaRight}>
            {share.allowDownload && (
              <Pressable
                style={styles.downloadBtn}
                onPress={() => { if (Platform.OS === 'web') window.open(share.url, '_blank'); }}
              >
                <MaterialCommunityIcons name="download" size={16} color="#fff" />
                <Text style={styles.downloadBtnLabel}>Descargar</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsLabel}>
            <MaterialCommunityIcons name="information-outline" size={14} color="rgba(255,255,255,0.5)" /> Acerca de esta entrega
          </Text>
          <Text style={styles.detailsText}>
            Estás viendo una entrega para <Text style={{ fontWeight: '600', color: '#fff' }}>{share.projectName}</Text>. 
            Este contenido ha sido compartido a través del Portal de Producción de Grupo Encuadre Chile.
          </Text>
          <Text style={styles.detailsMeta}>
            Generado por Encuadre Portal de Producción • Contenido confidencial
          </Text>
        </View>
      </ScrollView>

      {/* Netflix-style bottom bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarContent}>
          <View style={styles.bottomLeft}>
            <Image source={brandAssets.logoSvg} style={{ height: 16, width: 80, tintColor: '#C5C0FF' } as any} resizeMode="contain" />
          </View>
          <Text style={styles.bottomCenter}>{brand.footer}</Text>
          <View style={styles.bottomRight}>
            <Pressable onPress={() => setShowInfo(!showInfo)} style={styles.infoToggle}>
              <MaterialCommunityIcons name={showInfo ? 'chevron-down' : 'chevron-up'} size={18} color="rgba(255,255,255,0.4)" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cinemaContainer: {
    flex: 1,
    backgroundColor: '#08080a',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  cinemaFooter: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.2)',
    textAlign: 'center',
    paddingBottom: spacing.base,
  },
  logoContainer: {
    padding: spacing.base,
    alignItems: 'center',
  },
  logoTopLeft: {
    position: 'absolute',
    top: 48,
    left: spacing.base,
    zIndex: 10,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.base,
  },
  loadingSpinner: {},
  loadingSubtext: {
    ...typography.bodyMedium,
    color: 'rgba(255,255,255,0.4)',
  },
  errorContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.base,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(197, 192, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  errorTitle: {
    ...typography.titleLarge,
    color: '#fff',
    fontWeight: 'bold',
  },
  errorDescription: {
    ...typography.bodyMedium,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    maxWidth: 320,
  },
  retryBtn: {
    marginTop: spacing.base,
    paddingHorizontal: spacing.lg,
    height: 40,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    ...typography.labelLarge,
    color: '#fff',
    fontWeight: 'bold',
  },

  // Lock Screen
  lockCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  lockCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.base,
  },
  lockIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(197, 192, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockTitle: {
    ...typography.titleLarge,
    color: '#fff',
    fontWeight: 'bold',
  },
  lockSubtitle: {
    ...typography.bodyMedium,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  pwInput: {
    width: '100%',
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    color: '#fff',
    paddingHorizontal: spacing.base,
    ...typography.bodyMedium,
    textAlign: 'center',
  },
  pwInputError: {
    borderColor: '#C5C0FF',
  },
  pwErrorText: {
    ...typography.bodySmall,
    color: '#C5C0FF',
  },
  unlockBtn: {
    width: '100%',
    height: 44,
    backgroundColor: '#C5C0FF',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  unlockBtnText: {
    ...typography.labelLarge,
    color: '#fff',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  // Hero
  heroSection: {
    width: '100%',
  },
  heroVideoOnly: {
    marginBottom: 0,
  },
  playerWrapper: {
    width: '100%',
    backgroundColor: '#000',
  },

  // Meta Bar
  metaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.base,
  },
  metaLeft: {
    flex: 1,
    gap: 4,
  },
  metaTitle: {
    ...typography.titleSmall,
    color: '#fff',
    fontWeight: 'bold',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaProject: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  metaViews: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.4)',
  },
  metaRight: {},
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(197, 192, 255, 0.85)',
    borderRadius: 4,
    paddingHorizontal: spacing.base,
    height: 36,
  },
  downloadBtnLabel: {
    ...typography.labelMedium,
    color: '#fff',
    fontWeight: 'bold',
  },

  // Details
  detailsCard: {
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
    padding: spacing.base,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: spacing.xs,
  },
  detailsLabel: {
    ...typography.labelMedium,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  detailsText: {
    ...typography.bodyMedium,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 22,
  },
  detailsMeta: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.25)',
    marginTop: spacing.xs,
  },

  // Bottom Bar
  bottomBar: {
    backgroundColor: 'rgba(10,10,12,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  bottomBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    height: 48,
  },
  bottomLeft: {},
  bottomCenter: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.2)',
  },
  bottomRight: {},
  infoToggle: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Drive Folder Viewer styles ──
  folderHeader: {
    padding: spacing.base,
    paddingTop: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 2,
  },
  folderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  folderTitle: {
    ...typography.titleMedium,
    color: '#fff',
    fontWeight: 'bold',
    flex: 1,
  },
  folderProject: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.4)',
    marginLeft: spacing.xl,
  },
  folderBreadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  breadcrumbBack: {
    paddingRight: spacing.xs,
  },
  breadcrumbItem: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.4)',
    marginRight: spacing.xs,
    maxWidth: 100,
  },
  breadcrumbActive: {
    color: '#C5C0FF',
    fontWeight: '600',
  },
  folderSection: {
    marginBottom: spacing.base,
  },
  folderSectionTitle: {
    ...typography.labelMedium,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '600',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  folderFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  folderFileIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  folderFileName: {
    ...typography.bodyMedium,
    color: 'rgba(255,255,255,0.85)',
  },
  folderFileMeta: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.3)',
  },
  folderLoadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  folderLoadingText: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.3)',
  },
  folderEmptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl * 2,
    gap: spacing.base,
  },
  folderEmptyText: {
    ...typography.bodyMedium,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
  },
  folderPreviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  previewBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  previewBackText: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.6)',
  },
  previewFileName: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.4)',
    flex: 1,
    textAlign: 'right',
  },
});
