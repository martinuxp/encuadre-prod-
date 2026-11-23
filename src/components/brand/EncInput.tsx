// ═══════════════════════════════════════════════════════
// Encuadre Prod. — EncInput
// Campo de la marca: fondo #ffffff0d, borde 2 px blanco al 25 %, radio 10
// (opcional esquina 24 arriba-izquierda). Foco → borde blanco.
// Label en MAYÚSCULAS 12 px 700 al 60 %.
// ═══════════════════════════════════════════════════════

import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
import { fontFamily, spacing } from '@/theme/tokens';

interface EncInputProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string | boolean;
  /** Esquina grande: `lead` (24 arriba-izq, primer campo) o `tail` (30 abajo-der, textarea) */
  corner?: 'lead' | 'tail';
  containerStyle?: StyleProp<ViewStyle>;
}

export const EncInput: React.FC<EncInputProps> = ({ label, hint, error, corner, containerStyle, style, multiline, onFocus, onBlur, ...props }) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.group, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor="rgba(255, 255, 255, 0.38)"
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        style={[
          styles.input,
          multiline && styles.multiline,
          corner === 'lead' && { borderTopLeftRadius: 24 },
          corner === 'tail' && { borderBottomRightRadius: 30 },
          focused && styles.focused,
          !!error && styles.error,
          Platform.OS === 'web' && ({ outlineStyle: 'none', transition: 'border-color 200ms ease' } as any),
          style,
        ]}
      />
      {typeof error === 'string' && error ? <Text style={styles.errorText}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  group: { gap: spacing.xs + 2 },
  label: { fontFamily, fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#FFFFFF', opacity: 0.6 },
  input: {
    fontFamily, fontSize: 16, lineHeight: 22, fontWeight: '400', color: '#FFFFFF',
    minHeight: 48, paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.25)', borderRadius: 10,
  },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  focused: { borderColor: '#FFFFFF' },
  error: { borderColor: '#FFB3C0' },
  hint: { fontFamily, fontSize: 12, lineHeight: 16, color: 'rgba(255, 255, 255, 0.6)' },
  errorText: { fontFamily, fontSize: 12, lineHeight: 16, color: '#FFB3C0' },
});
