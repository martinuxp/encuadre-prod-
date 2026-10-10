// ═══════════════════════════════════════════════════════
// Encuadre Prod. — EmptyState (Componente MD3)
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Animated } from 'react-native';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActionButton } from './ActionButton';
import { useEnterAnimation } from '@/theme/animation';

interface EmptyStateProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onActionPress?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onActionPress,
  style,
}) => {
  const { opacity, scale } = useEnterAnimation();
  return (
    <Animated.View style={[styles.container, style, { opacity, transform: [{ scale }] }]}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name={icon} size={48} color={colors.primary} />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {actionLabel && onActionPress && (
        <ActionButton
          label={actionLabel}
          onPress={onActionPress}
          variant="filled"
          icon="plus"
          style={styles.actionBtn}
        />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
    borderRadius: shapes.large,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderStyle: 'dashed',
    textAlign: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryAlpha12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  title: {
    ...typography.titleLarge,
    color: colors.onSurface,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.lg,
    maxWidth: 320,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionBtn: {
    height: 40,
  },
});
