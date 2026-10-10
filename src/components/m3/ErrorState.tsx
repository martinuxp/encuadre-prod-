// ═══════════════════════════════════════════════════════
// Encuadre Prod. — ErrorState (Componente MD3)
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Animated } from 'react-native';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActionButton } from './ActionButton';
import { useEnterAnimation } from '@/theme/animation';

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
  style,
}) => {
  const { opacity, scale } = useEnterAnimation(0.94);
  return (
    <Animated.View style={[styles.container, style, { opacity, transform: [{ scale }] }]}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name="alert-circle-outline" size={40} color={colors.error} />
      </View>

      <Text style={styles.title}>Ocurrió un error</Text>
      <Text style={styles.errorText}>{error || 'Ha ocurrido un error inesperado al cargar la información.'}</Text>

      {onRetry && (
        <ActionButton
          label="Reintentar"
          onPress={onRetry}
          variant="outlined"
          icon="refresh"
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
    padding: spacing.xl,
    borderRadius: shapes.medium,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.errorContainer,
    textAlign: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 180, 171, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  title: {
    ...typography.titleMedium,
    color: colors.error,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  errorText: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.lg,
    maxWidth: 280,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionBtn: {
    height: 36,
  },
});
