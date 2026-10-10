// ═══════════════════════════════════════════════════════
// Encuadre Prod. — RoleCard (Componente MD3)
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface RoleCardProps {
  role: string;
  department: string;
  count?: number; // Número de personas asignadas a este rol
  color?: string;
  style?: ViewStyle;
}

export const RoleCard: React.FC<RoleCardProps> = ({
  role,
  department,
  count,
  color = colors.primary,
  style,
}) => {
  // Elegir un icono representativo del departamento
  const getDepartmentIcon = (dept: string): keyof typeof MaterialCommunityIcons.glyphMap => {
    const d = dept.toLowerCase();
    if (d.includes('direc')) return 'movie-roll';
    if (d.includes('prod')) return 'briefcase-check';
    if (d.includes('cámara') || d.includes('foto')) return 'camera';
    if (d.includes('sonido') || d.includes('audio')) return 'microphone';
    if (d.includes('arte') || d.includes('esceno')) return 'palette';
    if (d.includes('vestuario') || d.includes('ropa')) return 'hanger';
    if (d.includes('maquillaje')) return 'face-woman';
    if (d.includes('ilum') || d.includes('eléctr') || d.includes('gaffer')) return 'lightbulb-outline';
    if (d.includes('talent') || d.includes('elenco') || d.includes('actor')) return 'account-star';
    return 'account-cog';
  };

  return (
    <View style={[styles.card, style]}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={getDepartmentIcon(department)} size={24} color={color} />
      </View>

      <View style={styles.info}>
        <Text style={styles.role} numberOfLines={1}>{role}</Text>
        <Text style={styles.department} numberOfLines={1}>{department}</Text>
      </View>

      {count !== undefined && (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: shapes.medium,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: shapes.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.base,
  },
  info: {
    flex: 1,
  },
  role: {
    ...typography.titleMedium,
    color: colors.onSurface,
    fontWeight: 'bold',
  },
  department: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  countBadge: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: shapes.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginLeft: spacing.sm,
  },
  countText: {
    ...typography.labelMedium,
    color: colors.primary,
    fontWeight: 'bold',
  },
});
