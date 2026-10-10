// ═══════════════════════════════════════════════════════
// Encuadre Prod. — ProjectCard (Componente MD3)
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Pressable, Animated, Platform } from 'react-native';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { Project, ProductionType, ProjectStatus } from '@/types';
import { StatusChip, StatusType } from './StatusChip';
import { IconButton } from './IconButton';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePressAnimation, lift } from '@/theme/animation';

interface ProjectCardProps {
  project: Project;
  onPress: () => void;
  onOptions?: () => void;
  style?: ViewStyle;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onPress,
  onOptions,
  style,
}) => {
  const getStatusMapping = (status: ProjectStatus): { label: string; type: StatusType; icon: keyof typeof MaterialCommunityIcons.glyphMap } => {
    switch (status) {
      case 'production':
        return { label: 'EN RODAJE', type: 'info', icon: 'camera-gopro' };
      case 'pre_production':
        return { label: 'PRE-PROD', type: 'warning', icon: 'clipboard-text-clock' };
      case 'post_production':
        return { label: 'POST-PROD', type: 'warning', icon: 'movie-edit' };
      case 'completed':
        return { label: 'FINALIZADO', type: 'success', icon: 'check-circle' };
      case 'archived':
        return { label: 'ARCHIVADO', type: 'default', icon: 'archive' };
      case 'draft':
      default:
        return { label: 'BORRADOR', type: 'default', icon: 'file-document-outline' };
    }
  };

  const getProductionTypeLabel = (type: ProductionType): string => {
    switch (type) {
      case 'film': return 'Película';
      case 'tv': return 'Serie / TV';
      case 'commercial': return 'Comercial';
      case 'music_video': return 'Videoclip';
      case 'photography': return 'Fotografía';
      case 'corporate': return 'Corporativo';
      case 'documentary': return 'Documental';
      case 'other':
      default: return 'Otro';
    }
  };

  const statusInfo = getStatusMapping(project.status);
  const typeLabel = getProductionTypeLabel(project.type);
  const { scaleAnim, pressIn, pressOut } = usePressAnimation(1, 0.97);
  
  // Formatear fechas
  const formatDate = (date: any) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date.seconds ? date.seconds * 1000 : date);
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
        Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.inner,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.name} numberOfLines={1}>{project.name}</Text>
            <Text style={styles.type}>{typeLabel}</Text>
          </View>

          {onOptions && (
            <IconButton
              icon="dots-vertical"
              variant="standard"
              onPress={onOptions}
              style={styles.optionsBtn}
            />
          )}
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {project.description || 'Sin descripción del proyecto.'}
        </Text>

        <View style={styles.divider} />

        <View style={styles.footer}>
          <StatusChip
            label={statusInfo.label}
            status={statusInfo.type}
            icon={statusInfo.icon}
          />

          <View style={styles.dateContainer}>
            <MaterialCommunityIcons name="calendar" size={14} color={colors.onSurfaceVariant} />
            <Text style={styles.dateText}>{formatDate(project.startDate)}</Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: shapes.large,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...Platform.select({
      web: {
        transition: 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 200ms cubic-bezier(0.2, 0, 0, 1), border-color 200ms cubic-bezier(0.2, 0, 0, 1)',
      } as any,
    }),
  },
  inner: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  name: {
    ...typography.titleMedium,
    color: colors.onSurface,
    fontWeight: 'bold',
  },
  type: {
    ...typography.bodySmall,
    color: colors.primary,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
  },
  optionsBtn: {
    margin: -spacing.sm,
  },
  description: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    marginVertical: spacing.base,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dateText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  pressed: {
    opacity: 0.9,
  },
});
