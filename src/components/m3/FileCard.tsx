// ═══════════════════════════════════════════════════════
// Encuadre Prod. — FileCard (Componente MD3)
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { IconButton } from './IconButton';
import { AnimatedCard } from './AnimatedCard';

interface FileCardProps {
  name: string;
  type: string;
  size?: number; // en bytes
  date?: string | Date;
  version?: string;
  onPress?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  style?: ViewStyle;
}

export const FileCard: React.FC<FileCardProps> = ({
  name,
  type,
  size,
  date,
  version,
  onPress,
  onDownload,
  onDelete,
  style,
}) => {
  const getFileIcon = (fileType: string): { icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string } => {
    const t = fileType.toLowerCase();
    if (t.includes('pdf')) {
      return { icon: 'file-pdf-box', color: colors.error };
    }
    if (t.includes('doc') || t.includes('docx') || t.includes('text') || t.includes('pages')) {
      return { icon: 'file-document', color: colors.primary };
    }
    if (t.includes('xls') || t.includes('xlsx') || t.includes('csv') || t.includes('numbers')) {
      return { icon: 'file-excel', color: colors.success };
    }
    if (t.includes('png') || t.includes('jpg') || t.includes('jpeg') || t.includes('webp') || t.includes('image')) {
      return { icon: 'file-image', color: colors.tertiary };
    }
    if (t.includes('mp4') || t.includes('mov') || t.includes('mkv') || t.includes('video')) {
      return { icon: 'file-video', color: colors.primary };
    }
    if (t.includes('mp3') || t.includes('wav') || t.includes('audio')) {
      return { icon: 'file-music', color: colors.secondary };
    }
    return { icon: 'file-outline', color: colors.onSurfaceVariant };
  };

  const formatFileSize = (bytes?: number): string => {
    if (bytes === undefined || bytes === 0) return '';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (d?: string | Date): string => {
    if (!d) return '';
    const dateObj = d instanceof Date ? d : new Date(d);
    return dateObj.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
  };

  const fileInfo = getFileIcon(type);

  const renderContent = () => (
    <View style={styles.content}>
      <MaterialCommunityIcons name={fileInfo.icon} size={36} color={fileInfo.color} style={styles.fileIcon} />

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <Text style={styles.metadata}>
          {version ? `v${version} • ` : ''}
          {formatFileSize(size)}
          {size && date ? ' • ' : ''}
          {formatDate(date)}
        </Text>
      </View>

      <View style={styles.actions}>
        {onDownload && (
          <IconButton
            icon="download"
            variant="standard"
            onPress={onDownload}
            iconColor={colors.primary}
          />
        )}
        {onDelete && (
          <IconButton
            icon="trash-can-outline"
            variant="standard"
            onPress={onDelete}
            iconColor={colors.error}
          />
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <AnimatedCard onPress={onPress} style={styles.card} contentStyle={styles.cardContent}>
        {renderContent()}
      </AnimatedCard>
    );
  }

  return <View style={[styles.card, style]}>{renderContent()}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: shapes.medium,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },
  cardContent: {
    borderRadius: shapes.medium,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
  },
  fileIcon: {
    marginRight: spacing.base,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  name: {
    ...typography.titleSmall,
    color: colors.onSurface,
    fontWeight: '600',
  },
  metadata: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
