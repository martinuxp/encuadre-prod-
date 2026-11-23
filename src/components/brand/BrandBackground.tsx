// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Fondo de marca (nativo)
// Aproximación sin degradados radiales: dos manchas difusas noche/vino sobre negro.
// La versión web (BrandBackground.web.tsx) usa degradados, grano y movimiento.
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { brandColors } from '@/theme/tokens';

export interface BrandBackgroundProps {
  variant?: 'default' | 'alt' | 'quiet';
  withLines?: boolean;
}

export const BrandBackground: React.FC<BrandBackgroundProps> = ({ variant = 'default' }) => {
  const alt = variant === 'alt';
  const opacity = variant === 'quiet' ? 0.45 : 1;
  return (
    <View style={styles.root} pointerEvents="none">
      <View style={[styles.blob, { backgroundColor: brandColors.night, opacity: 0.9 * opacity }, alt ? styles.topRight : styles.topLeft]} />
      <View style={[styles.blob, { backgroundColor: brandColors.wine, opacity: 0.45 * opacity }, alt ? styles.bottomLeft : styles.bottomRight]} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: brandColors.black, overflow: 'hidden' },
  blob: { position: 'absolute', width: 520, height: 520, borderRadius: 260 },
  topLeft: { top: -260, left: -220 },
  topRight: { top: -260, right: -220 },
  bottomRight: { bottom: -260, right: -200 },
  bottomLeft: { bottom: -260, left: -200 },
});
