// ═══════════════════════════════════════════════════════
// Encuadre Prod. — VersionCard (Componente MD3)
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusChip, StatusType } from './StatusChip';
import { ActionButton } from './ActionButton';
import { IconButton } from './IconButton';

interface VersionCardProps {
  versionNumber: string;
  notes: string;
  author: string;
  date: string | Date;
  tag?: 'draft' | 'review' | 'approved' | 'final';
  isCurrent?: boolean;
  isLocked?: boolean;
  onDownload?: () => void;
  onLockToggle?: () => void;
  onRevert?: () => void;
  style?: ViewStyle;
}

export const VersionCard: React.FC<VersionCardProps> = ({
  versionNumber,
  notes,
  author,
  date,
  tag = 'draft',
  isCurrent = false,
  isLocked = false,
  onDownload,
  onLockToggle,
  onRevert,
  style,
}) => {
  const getTagType = (versionTag: string): { label: string; type: StatusType } => {
    switch (versionTag) {
      case 'final': return { label: 'FINAL', type: 'success' };
      case 'approved': return { label: 'APROBADO', type: 'success' };
      case 'review': return { label: 'EN REVISIÓN', type: 'warning' };
      case 'draft':
      default: return { label: 'BORRADOR', type: 'default' };
    }
  };

  const tagInfo = getTagType(tag);

  const formatDate = (d: string | Date): string => {
    const dateObj = d instanceof Date ? d : new Date(d);
    return dateObj.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={[styles.card, isCurrent && styles.currentCard, style]}>
      {/* Línea e indicador de línea de tiempo */}
      <View style={styles.timelineContainer}>
        <View style={[styles.timelineDot, isCurrent && styles.currentTimelineDot]} />
        <View style={styles.timelineLine} />
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleCol}>
            <View style={styles.versionRow}>
              <Text style={styles.versionTitle}>Versión {versionNumber}</Text>
              {isCurrent && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>ACTIVA</Text>
                </View>
              )}
            </View>
            <Text style={styles.metaText}>
              Subido por <Text style={{ fontWeight: 'bold' }}>{author}</Text> • {formatDate(date)}
            </Text>
          </View>

          <View style={styles.tagsContainer}>
            <StatusChip label={tagInfo.label} status={tagInfo.type} />
            {isLocked && (
              <MaterialCommunityIcons
                name="lock"
                size={16}
                color={colors.error}
                style={styles.lockIcon}
              />
            )}
          </View>
        </View>

        <Text style={styles.notesText}>{notes || 'Sin notas de cambio para esta versión.'}</Text>

        <View style={styles.actions}>
          {onDownload && (
            <ActionButton
              label="Descargar PDF"
              variant="tonal"
              icon="file-pdf-box"
              onPress={onDownload}
              style={styles.actionBtn}
            />
          )}

          <View style={{ flex: 1 }} />

          {onLockToggle && (
            <IconButton
              icon={isLocked ? 'lock-open-outline' : 'lock-outline'}
              variant="outlined"
              onPress={onLockToggle}
              style={styles.iconBtn}
              iconColor={isLocked ? colors.success : colors.onSurfaceVariant}
            />
          )}

          {onRevert && !isCurrent && (
            <ActionButton
              label="Restaurar"
              variant="outlined"
              icon="history"
              onPress={onRevert}
              style={styles.actionBtn}
            />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    borderRadius: shapes.medium,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  currentCard: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  timelineContainer: {
    alignItems: 'center',
    width: 24,
    marginRight: spacing.sm,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.outline,
    marginTop: spacing.xs,
  },
  currentTimelineDot: {
    backgroundColor: colors.primary,
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.outlineVariant,
    marginTop: spacing.xs,
  },
  content: {
    flex: 1,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleCol: {
    flex: 1,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  versionTitle: {
    ...typography.titleMedium,
    color: colors.onSurface,
    fontWeight: 'bold',
  },
  currentBadge: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: shapes.extraSmall,
  },
  currentBadgeText: {
    ...typography.labelSmall,
    color: colors.onPrimaryContainer,
    fontWeight: 'bold',
  },
  metaText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  lockIcon: {
    marginLeft: spacing.xs,
  },
  notesText: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    lineHeight: 20,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.sm,
    borderRadius: shapes.small,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionBtn: {
    height: 32,
    paddingHorizontal: spacing.base,
  },
  iconBtn: {
    width: 32,
    height: 32,
  },
});
