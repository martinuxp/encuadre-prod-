// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Galería de la web pública
// Subir varias fotos (botón o arrastrar y soltar), reordenar (arrastrando o con flechas),
// tipo Fotograma / Detrás de cámaras, pie de foto, ocultar y borrar.
// Cada cambio se guarda al instante en `projects/{id}.web.gallery`.
// ═══════════════════════════════════════════════════════

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Platform, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, corners, fontFamily } from '@/theme/tokens';
import { ActionButton } from '@/components/m3/ActionButton';
import { IconButton } from '@/components/m3/IconButton';
import { webService } from '@/services/firebase/webService';
import { WebGalleryKind, WebGalleryPhoto } from '@/types';
import { GALLERY_CAPTION_MAX, GALLERY_MAX_PHOTOS, publicStorageUrl, uriToBlob } from '@/utils/web';

const KIND_LABEL: Record<WebGalleryKind, string> = { still: 'Fotograma', bts: 'Detrás de cámaras' };
const isWeb = Platform.OS === 'web';

interface GalleryEditorProps {
  projectId: string;
  bucket: string;
  gallery: WebGalleryPhoto[];
  /** Persiste la galería completa; el padre la sincroniza con su borrador */
  onSave: (gallery: WebGalleryPhoto[]) => Promise<void>;
}

const move = <T,>(list: T[], from: number, to: number): T[] => {
  if (from === to || to < 0 || to >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
};

export const GalleryEditor: React.FC<GalleryEditorProps> = ({ projectId, bucket, gallery, onSave }) => {
  const [items, setItems] = useState<WebGalleryPhoto[]>(() => [...gallery].sort((a, b) => a.order - b.order));
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragFrom = useRef<number | null>(null);
  const zoneRef = useRef<View>(null);
  // En celular cada foto ocupa todo el ancho; en pantallas anchas se limita para armar la grilla
  const wide = useWindowDimensions().width >= 600;
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Guarda con actualización optimista: si falla, vuelve al estado anterior
  const persist = async (next: WebGalleryPhoto[]) => {
    const previous = itemsRef.current;
    setItems(next);
    setError(null);
    try {
      await onSave(next);
    } catch (e: any) {
      setItems(previous);
      setError(e?.message || 'No se pudo guardar la galería.');
    }
  };

  const upload = async (files: Blob[]) => {
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (!images.length) { setError('Solo se pueden subir imágenes.'); return; }
    const room = GALLERY_MAX_PHOTOS - itemsRef.current.length;
    if (room <= 0) { setError(`La galería ya tiene el máximo de ${GALLERY_MAX_PHOTOS} fotos.`); return; }
    const batch = images.slice(0, room);
    setError(images.length > room ? `Se subirán solo ${room} fotos: la galería admite ${GALLERY_MAX_PHOTOS}.` : null);
    setProgress({ done: 0, total: batch.length });
    try {
      const added = await webService.uploadGalleryPhotos(projectId, batch, itemsRef.current.length, (done, total) => setProgress({ done, total }));
      await persist([...itemsRef.current, ...added]);
    } catch (e: any) {
      setError(e?.message || 'No se pudieron subir las fotos.');
    } finally {
      setProgress(null);
    }
  };

  const pickPhotos = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 1 });
    if (res.canceled) return;
    const blobs = await Promise.all(res.assets.map(async (a: any) => {
      const blob: Blob = a.file ?? (await uriToBlob(a.uri));
      return blob.type || !a.mimeType ? blob : new Blob([blob], { type: a.mimeType });
    }));
    await upload(blobs);
  };

  // Arrastrar y soltar archivos sobre la zona (solo web: en RN-web la ref es el nodo del DOM)
  useEffect(() => {
    if (!isWeb) return;
    const el = zoneRef.current as unknown as HTMLElement | null;
    if (!el?.addEventListener) return;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types || []).includes('Files');
    const over = (e: DragEvent) => { if (!hasFiles(e)) return; e.preventDefault(); setDropActive(true); };
    const leave = (e: DragEvent) => { if (e.target === el) setDropActive(false); };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      setDropActive(false);
      upload(Array.from(e.dataTransfer?.files || []));
    };
    el.addEventListener('dragover', over);
    el.addEventListener('dragleave', leave);
    el.addEventListener('drop', drop);
    return () => { el.removeEventListener('dragover', over); el.removeEventListener('dragleave', leave); el.removeEventListener('drop', drop); };
  // upload lee el estado por ref, no hace falta volver a enlazar
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setKind = (id: string, kind: WebGalleryKind) => persist(items.map((p) => (p.id === id ? { ...p, kind } : p)));
  const toggleHidden = (id: string) => persist(items.map((p) => (p.id === id ? { ...p, hidden: !p.hidden } : p)));
  const commitCaption = (id: string) => {
    const value = captions[id];
    if (value === undefined) return;
    const current = items.find((p) => p.id === id)?.caption ?? '';
    if (value.trim() === current) return;
    persist(items.map((p) => (p.id === id ? { ...p, caption: value.trim() || undefined } : p)));
  };
  const remove = async (photo: WebGalleryPhoto) => {
    setConfirmDelete(null);
    await persist(items.filter((p) => p.id !== photo.id));
    await webService.deleteGalleryFiles(photo);
  };

  // Reordenar arrastrando las miniaturas (web)
  const tileDragProps = (index: number, id: string) => {
    if (!isWeb) return {};
    return {
      ref: (node: unknown) => {
        const el = node as HTMLElement | null;
        if (!el?.setAttribute) return;
        el.setAttribute('draggable', 'true');
        el.ondragstart = (e) => { dragFrom.current = index; e.dataTransfer?.setData('text/plain', id); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; };
        el.ondragover = (e) => { if (dragFrom.current === null) return; e.preventDefault(); setDragOverId(id); };
        el.ondragleave = () => setDragOverId((cur) => (cur === id ? null : cur));
        el.ondrop = (e) => {
          if (dragFrom.current === null) return;
          e.preventDefault(); e.stopPropagation();
          const from = dragFrom.current; dragFrom.current = null; setDragOverId(null);
          persist(move(itemsRef.current, from, index));
        };
        el.ondragend = () => { dragFrom.current = null; setDragOverId(null); };
      },
    };
  };

  const visibleCount = items.filter((p) => !p.hidden).length;

  return (
    <View style={styles.root}>
      <View ref={zoneRef} style={[styles.dropzone, dropActive && styles.dropzoneActive]}>
        <MaterialCommunityIcons name="image-multiple-outline" size={28} color={colors.onSurfaceVariant} />
        <Text style={styles.dropTitle}>{isWeb ? 'Arrastra fotos aquí' : 'Sube fotos de la galería'}</Text>
        <Text style={styles.hint}>
          Se guardan en WebP (máx. 2400 px) con miniatura de 900 px · {items.length}/{GALLERY_MAX_PHOTOS} fotos · {visibleCount} visibles
        </Text>
        <ActionButton
          label={progress ? `Subiendo ${progress.done}/${progress.total}…` : 'Elegir fotos'}
          icon="upload"
          variant="tonal"
          loading={!!progress}
          disabled={!!progress || items.length >= GALLERY_MAX_PHOTOS}
          onPress={pickPhotos}
        />
      </View>

      {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}

      {items.length === 0 ? (
        <Text style={styles.hint}>Aún no hay fotos. Sube fotogramas o fotos de rodaje.</Text>
      ) : (
        <View style={styles.grid}>
          {items.map((photo, index) => {
            const caption = captions[photo.id] ?? photo.caption ?? '';
            return (
              <View
                key={photo.id}
                {...(tileDragProps(index, photo.id) as object)}
                style={[styles.tile, wide && styles.tileWide, photo.hidden && styles.tileHidden, dragOverId === photo.id && styles.tileDragOver]}
              >
                <View style={styles.thumbBox}>
                  <Image source={{ uri: publicStorageUrl(bucket, photo.thumbPath) }} style={styles.thumb} contentFit="cover" accessibilityLabel={caption || `Foto ${index + 1}`} />
                  <Text style={styles.position}>{index + 1}</Text>
                  {photo.hidden ? <Text style={styles.hiddenBadge}>Oculta</Text> : null}
                </View>

                <View style={styles.kindRow}>
                  {(['still', 'bts'] as const).map((kind) => (
                    <Pressable
                      key={kind}
                      accessibilityRole="button"
                      aria-pressed={photo.kind === kind}
                      onPress={() => setKind(photo.id, kind)}
                      style={[styles.kindChip, photo.kind === kind && styles.kindChipActive]}
                    >
                      <Text style={[styles.kindLabel, photo.kind === kind && styles.kindLabelActive]}>{KIND_LABEL[kind]}</Text>
                    </Pressable>
                  ))}
                </View>

                <TextInput
                  accessibilityLabel={`Pie de foto ${index + 1}`}
                  value={caption}
                  onChangeText={(v) => setCaptions((c) => ({ ...c, [photo.id]: v }))}
                  onBlur={() => commitCaption(photo.id)}
                  onSubmitEditing={() => commitCaption(photo.id)}
                  maxLength={GALLERY_CAPTION_MAX}
                  placeholder="Pie de foto (opcional)"
                  placeholderTextColor={colors.placeholder}
                  style={styles.caption}
                />
                <Text style={styles.counter}>{caption.length}/{GALLERY_CAPTION_MAX}</Text>

                <View style={styles.actions}>
                  <IconButton icon="arrow-left" size={18} variant="standard" accessibilityLabel={`Mover foto ${index + 1} antes`} disabled={index === 0} onPress={() => persist(move(items, index, index - 1))} />
                  <IconButton icon="arrow-right" size={18} variant="standard" accessibilityLabel={`Mover foto ${index + 1} después`} disabled={index === items.length - 1} onPress={() => persist(move(items, index, index + 1))} />
                  <IconButton icon={photo.hidden ? 'eye-off-outline' : 'eye-outline'} size={18} variant="standard" accessibilityLabel={photo.hidden ? `Mostrar foto ${index + 1}` : `Ocultar foto ${index + 1}`} onPress={() => toggleHidden(photo.id)} />
                  {confirmDelete === photo.id ? (
                    <View style={styles.confirm}>
                      <ActionButton label="Borrar" icon="trash-can-outline" onPress={() => remove(photo)} />
                      <IconButton icon="close" size={18} variant="standard" accessibilityLabel="Cancelar borrado" onPress={() => setConfirmDelete(null)} />
                    </View>
                  ) : (
                    <IconButton icon="trash-can-outline" size={18} variant="standard" iconColor={colors.error} accessibilityLabel={`Borrar foto ${index + 1}`} onPress={() => setConfirmDelete(photo.id)} />
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
      {isWeb && items.length > 1 ? <Text style={styles.hint}>Arrastra una miniatura sobre otra para cambiar el orden.</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { gap: spacing.base },
  dropzone: {
    alignItems: 'center', gap: spacing.sm, padding: spacing.lg,
    borderWidth: 2, borderStyle: 'dashed', borderColor: colors.outline, ...corners.card,
    backgroundColor: colors.surfaceContainerLow,
  },
  dropzoneActive: { borderColor: '#FFFFFF', backgroundColor: 'rgba(255, 255, 255, 0.10)' },
  dropTitle: { ...typography.titleMedium, color: colors.onSurface },
  hint: { ...typography.bodySmall, color: colors.onSurfaceVariant, textAlign: 'center' },
  error: { ...typography.bodyMedium, color: colors.onErrorContainer, backgroundColor: colors.errorContainer, padding: spacing.md, ...corners.chip },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.base },
  tile: {
    flexBasis: 220, flexGrow: 1, gap: spacing.sm, padding: spacing.sm,
    backgroundColor: colors.surfaceContainer, borderWidth: 1.5, borderColor: colors.outlineVariant, ...corners.card,
    ...Platform.select({ web: { cursor: 'grab' } as object }),
  },
  tileWide: { maxWidth: 320 },
  tileHidden: { opacity: 0.55 },
  tileDragOver: { borderColor: '#FFFFFF' },
  thumbBox: { aspectRatio: 4 / 3, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.surfaceContainerHighest },
  thumb: { width: '100%', height: '100%' },
  position: {
    position: 'absolute', top: 6, left: 6, fontFamily, fontWeight: '900', fontSize: 12, color: '#000',
    backgroundColor: '#FFFFFF', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8,
  },
  hiddenBadge: {
    position: 'absolute', top: 6, right: 6, fontFamily, fontWeight: '800', fontSize: 11, color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.7)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8,
  },
  kindRow: { flexDirection: 'row', gap: spacing.xs },
  kindChip: {
    flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm,
    borderWidth: 1, borderColor: colors.outlineVariant, backgroundColor: 'rgba(255, 255, 255, 0.06)', ...corners.chip,
  },
  kindChipActive: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  kindLabel: { ...typography.labelMedium, color: colors.onSurfaceVariant },
  kindLabelActive: { color: '#000000', fontWeight: '800' },
  caption: {
    ...typography.bodyMedium, color: colors.onSurface, minHeight: 40, paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.25)', borderRadius: 10,
  },
  counter: { ...typography.labelSmall, color: colors.onSurfaceVariant, alignSelf: 'flex-end' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  confirm: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
