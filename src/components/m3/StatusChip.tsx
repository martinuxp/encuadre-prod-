// ═══════════════════════════════════════════════════════
// Encuadre Prod. — StatusChip (Componente MD3)
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type StatusType =
  | 'success'   // Confirmado, Completado, Aprobado
  | 'warning'   // Pendiente, En revisión, Alerta
  | 'error'     // Cancelado, Error, Urgente
  | 'info'      // En proceso, Producción, Activo
  | 'default';  // Borrador, Archivado, Ninguno

interface StatusChipProps {
  label: string;
  status?: StatusType;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  style?: ViewStyle;
  labelStyle?: TextStyle;
}

export const StatusChip: React.FC<StatusChipProps> = ({
  label,
  status = 'default',
  icon,
  style,
  labelStyle,
}) => {
  const getStatusStyles = (): { bg: string; text: string; border?: string } => {
    switch (status) {
      case 'success':
        return {
          bg: 'rgba(129, 199, 132, 0.15)',
          text: colors.success,
        };
      case 'warning':
        return {
          bg: 'rgba(255, 213, 79, 0.15)',
          text: colors.warning,
        };
      case 'error':
        return {
          bg: 'rgba(255, 180, 171, 0.15)',
          text: colors.error,
        };
      case 'info':
        return {
          bg: colors.primaryAlpha12,
          text: colors.primary,
        };
      case 'default':
      default:
        return {
          bg: colors.surfaceContainerHigh,
          text: colors.onSurfaceVariant,
          border: colors.outlineVariant,
        };
    }
  };

  const sStyles = getStatusStyles();

  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: sStyles.bg },
        sStyles.border ? { borderWidth: 1, borderColor: sStyles.border } : null,
        style,
      ]}
    >
      {icon && (
        <MaterialCommunityIcons
          name={icon}
          size={14}
          color={sStyles.text}
          style={styles.icon}
        />
      )}
      <Text style={[styles.label, { color: sStyles.text }, labelStyle]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    paddingHorizontal: spacing.sm,
    borderRadius: shapes.full,
  },
  label: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  icon: {
    marginRight: spacing.xs,
  },
});
