// ═══════════════════════════════════════════════════════
// Encuadre Prod. — VersionList (MD3)
// Listado de versiones de un archivo con acciones de share
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { MediaVersion, EmbedType } from '@/types';
import { StatusChip } from './StatusChip';

interface VersionListProps {
  versions: MediaVersion[];
  onShare: (version: MediaVersion) => void;
  onDelete: (version: MediaVersion) => void;
  onPreview: (version: MediaVersion) => void;
}

const EMBED_ICONS: Record<EmbedType, string> = {
  youtube: 'youtube',
  vimeo: 'vimeo',
  gdrive: 'google-drive',
  direct: 'file-video',
  other: 'link',
};

const EMBED_LABELS: Record<EmbedType, string> = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  gdrive: 'Google Drive',
  direct: 'Archivo',
  other: 'Link externo',
};

export const VersionList: React.FC<VersionListProps> = ({
  versions,
  onShare,
  onDelete,
  onPreview,
}) => {
  if (versions.length === 0) {
    return (
      <View style={styles.empty}>
        <MaterialCommunityIcons name="layers-outline" size={32} color={colors.onSurfaceVariant} />
        <Text style={styles.emptyText}>Sin versiones todavía. Sube la primera versión.</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {versions.map((v) => {
        const embedIcon = EMBED_ICONS[v.embedType ?? 'other'];
        const embedLabel = EMBED_LABELS[v.embedType ?? 'other'];

        return (
          <View key={v.id} style={[styles.card, v.isLatest && styles.cardLatest]}>
            <View style={styles.row}>
              {/* Icono de fuente */}
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons
                  name={embedIcon as any}
                  size={22}
                  color={v.isLatest ? colors.primary : colors.onSurfaceVariant}
                />
              </View>

              {/* Info */}
              <View style={styles.info}>
                <View style={styles.titleRow}>
                  <Text style={styles.label}>{v.label}</Text>
                  {v.isLatest && (
                    <StatusChip label="LATEST" status="success" />
                  )}
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.meta}>{v.versionNumber}</Text>
                  <Text style={styles.metaDot}>•</Text>
                  <Text style={styles.meta}>{embedLabel}</Text>
                  {v.sourceType === 'hosted' && v.size && (
                    <>
                      <Text style={styles.metaDot}>•</Text>
                      <Text style={styles.meta}>
                        {v.size > 1e9
                          ? `${(v.size / 1e9).toFixed(1)} GB`
                          : v.size > 1e6
                          ? `${(v.size / 1e6).toFixed(1)} MB`
                          : `${(v.size / 1e3).toFixed(0)} KB`}
                      </Text>
                    </>
                  )}
                </View>
                {!!v.notes && (
                  <Text style={styles.notes} numberOfLines={2}>{v.notes}</Text>
                )}

                {/* Badges */}
                <View style={styles.badges}>
                  {v.allowDownload && (
                    <View style={styles.badge}>
                      <MaterialCommunityIcons name="download" size={11} color={colors.onSurfaceVariant} />
                      <Text style={styles.badgeText}>Descarga permitida</Text>
                    </View>
                  )}
                  {v.watermarkEnabled && (
                    <View style={styles.badge}>
                      <MaterialCommunityIcons name="watermark" size={11} color={colors.onSurfaceVariant} />
                      <Text style={styles.badgeText}>Watermark</Text>
                    </View>
                  )}
                  {v.shareToken && (
                    <View style={[styles.badge, styles.badgeShared]}>
                      <MaterialCommunityIcons name="link-variant" size={11} color={colors.primary} />
                      <Text style={[styles.badgeText, { color: colors.primary }]}>Link generado</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Acciones */}
            <View style={styles.actions}>
              <Pressable style={styles.actionBtn} onPress={() => onPreview(v)}>
                <MaterialCommunityIcons name="eye-outline" size={18} color={colors.primary} />
                <Text style={styles.actionBtnText}>Vista previa</Text>
              </Pressable>

              <Pressable style={styles.actionBtn} onPress={() => onShare(v)}>
                <MaterialCommunityIcons name="share-variant-outline" size={18} color={colors.secondary} />
                <Text style={[styles.actionBtnText, { color: colors.secondary }]}>
                  {v.shareToken ? 'Gestionar link' : 'Compartir'}
                </Text>
              </Pressable>

              <Pressable style={styles.actionBtn} onPress={() => onDelete(v)}>
                <MaterialCommunityIcons name="delete-outline" size={18} color={colors.error} />
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.base,
  },
  emptyText: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: shapes.medium,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.base,
    gap: spacing.base,
  },
  cardLatest: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceContainer,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.base,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: shapes.small,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: spacing.xs },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  label: {
    ...typography.titleSmall,
    color: colors.onSurface,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  meta: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  metaDot: {
    ...typography.bodySmall,
    color: colors.outlineVariant,
  },
  notes: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: shapes.extraSmall,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeShared: {
    backgroundColor: colors.primaryAlpha12,
  },
  badgeText: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    paddingTop: spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: shapes.extraSmall,
  },
  actionBtnText: {
    ...typography.labelMedium,
    color: colors.primary,
  },
});
