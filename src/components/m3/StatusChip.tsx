// ═══════════════════════════════════════════════════════
// Encuadre Prod. — StatusChip (Componente MD3)
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, typography, spacing, corners } from '@/theme/tokens';
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
  /** Color de texto del proyecto: el chip se dibuja con ese color (vistas teñidas) */
  ink?: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({
  label,
  status = 'default',
  icon,
  style,
  labelStyle,
  ink,
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
          bg: '#FFFFFF',
          text: '#000000',
        };
      case 'default':
      default:
        return {
          bg: 'rgba(255, 255, 255, 0.08)',
          text: colors.onSurfaceVariant,
          border: colors.outlineVariant,
        };
    }
  };

  const sStyles = ink ? { bg: 'transparent', text: ink, border: ink } : getStatusStyles();

  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: sStyles.bg },
        sStyles.border ? { borderWidth: ink ? 1.5 : 1, borderColor: sStyles.border } : null,
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
    height: 26,
    paddingHorizontal: spacing.md,
    ...corners.chip,
  },
  label: {
    ...typography.labelMedium,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  icon: {
    marginRight: spacing.xs,
  },
});
