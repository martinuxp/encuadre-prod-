// ═══════════════════════════════════════════════════════
// Encuadre Prod. — TaskCard (Componente MD3)
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TaskPriority, TaskStatus } from '@/types';
import { StatusChip, StatusType } from './StatusChip';
import { AnimatedCard } from './AnimatedCard';

interface TaskCardProps {
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date | string;
  assigneeName?: string;
  onToggleStatus?: () => void;
  onPress?: () => void;
  style?: ViewStyle;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  title,
  status,
  priority,
  dueDate,
  assigneeName,
  onToggleStatus,
  onPress,
  style,
}) => {
  const isCompleted = status === 'done';

  const getPriorityConfig = (p: TaskPriority): { label: string; type: StatusType } => {
    switch (p) {
      case 'urgent': return { label: 'URGENTE', type: 'error' };
      case 'high': return { label: 'ALTA', type: 'error' };
      case 'medium': return { label: 'MEDIA', type: 'warning' };
      case 'low':
      default:
        return { label: 'BAJA', type: 'default' };
    }
  };

  const priorityConfig = getPriorityConfig(priority);

  const formatDate = (d?: Date | string): string => {
    if (!d) return '';
    const dateObj = d instanceof Date ? d : new Date(d);
    return dateObj.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
  };

  const renderContent = () => (
    <View style={styles.container}>
      {onToggleStatus && (
        <Pressable onPress={onToggleStatus} style={styles.checkboxContainer}>
          <MaterialCommunityIcons
            name={isCompleted ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
            size={24}
            color={isCompleted ? colors.primary : colors.outline}
          />
        </Pressable>
      )}

      <View style={styles.content}>
        <Text style={[styles.title, isCompleted && styles.completedTitle]} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.metaRow}>
          <StatusChip label={priorityConfig.label} status={priorityConfig.type} style={styles.priorityChip} />

          {dueDate && (
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="calendar" size={12} color={colors.onSurfaceVariant} />
              <Text style={styles.metaText}>{formatDate(dueDate)}</Text>
            </View>
          )}

          {assigneeName && (
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="account" size={12} color={colors.onSurfaceVariant} />
              <Text style={styles.metaText}>{assigneeName}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <AnimatedCard
        onPress={onPress}
        style={[styles.card, isCompleted && styles.completedCard, style] as any}
        contentStyle={styles.cardContent}
      >
        {renderContent()}
      </AnimatedCard>
    );
  }

  return (
    <View style={[styles.card, isCompleted && styles.completedCard, style]}>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: shapes.medium,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.base,
  },
  cardContent: {
    borderRadius: shapes.medium,
  },
  completedCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.outlineVariant,
    opacity: 0.7,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxContainer: {
    marginRight: spacing.base,
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.titleSmall,
    color: colors.onSurface,
    fontWeight: '600',
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: colors.onSurfaceVariant,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    flexWrap: 'wrap',
  },
  priorityChip: {
    height: 20,
    paddingHorizontal: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
});
