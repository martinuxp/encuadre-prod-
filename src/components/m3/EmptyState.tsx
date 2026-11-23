// ═══════════════════════════════════════════════════════
// Encuadre Prod. — EmptyState (Componente MD3)
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Animated } from 'react-native';
import { colors, typography, shapes, spacing, corners } from '@/theme/tokens';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActionButton } from './ActionButton';
import { Encuadrito, EncuadritoName } from '@/components/brand/Encuadrito';
import { useEnterAnimation } from '@/theme/animation';

interface EmptyStateProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onActionPress?: () => void;
  style?: ViewStyle;
  /** Encuadrito que acompaña el mensaje (Compota, Tofu o Flan) */
  mascot?: EncuadritoName;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onActionPress,
  style,
  mascot,
}) => {
  // Si no se elige, se alterna según el título para que no siempre aparezca el mismo
  const encuadrito: EncuadritoName = mascot ?? (['flan', 'tofu', 'compota'] as const)[title.length % 3];
  const { opacity, scale } = useEnterAnimation();
  return (
    <Animated.View style={[styles.container, style, { opacity, transform: [{ scale }] }]}>
      <Encuadrito name={encuadrito} size={96} style={styles.mascot} />

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
    ...corners.card,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    textAlign: 'center',
  },
  mascot: {
    marginBottom: spacing.base,
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
    fontWeight: '900',
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
