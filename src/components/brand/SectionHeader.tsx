// ═══════════════════════════════════════════════════════
// Encuadre Prod. — SectionHeader
// "01 | Título": número grande + línea vertical blanca + título (Google Sans Flex).
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { fontFamily, spacing } from '@/theme/tokens';

interface SectionHeaderProps {
  /** Número de sección; se rellena con cero: 1 → "01" */
  number?: number | string;
  title: string;
  subtitle?: string;
  /** Color del texto (para vistas teñidas con los colores del proyecto) */
  color?: string;
  size?: 'large' | 'medium';
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ number, title, subtitle, color = '#FFFFFF', size = 'medium', right, style }) => {
  const large = size === 'large';
  const num = typeof number === 'number' ? String(number).padStart(2, '0') : number;
  return (
    <View style={[styles.row, style]}>
      {num !== undefined ? (
        <Text style={[styles.num, large && styles.numLarge, { color, borderRightColor: color }]}>{num}</Text>
      ) : null}
      <View style={styles.titles}>
        <Text style={[styles.title, large && styles.titleLarge, { color }]} numberOfLines={2}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color }]}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  num: {
    fontFamily, fontWeight: '900', fontSize: 40, lineHeight: 34, letterSpacing: -2,
    paddingRight: spacing.base, borderRightWidth: 2, includeFontPadding: false,
  },
  numLarge: { fontSize: 64, lineHeight: 54, letterSpacing: -3.5 },
  titles: { flex: 1, gap: 2 },
  title: { fontFamily, fontWeight: '900', fontSize: 24, lineHeight: 26, letterSpacing: -0.8 },
  titleLarge: { fontSize: 34, lineHeight: 36, letterSpacing: -1.2 },
  subtitle: { fontFamily, fontWeight: '400', fontSize: 14, lineHeight: 20, opacity: 0.7 },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
