// ═══════════════════════════════════════════════════════
// Encuadre Prod. — IconButton (Componente MD3)
// ═══════════════════════════════════════════════════════

import React from 'react';
import { Pressable, Animated, StyleSheet, ViewStyle, Platform, ActivityIndicator, StyleProp } from 'react-native';
import { colors, shapes, spacing } from '@/theme/tokens';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ease, duration, scale } from '@/theme/animation';
import { isReducedMotion } from '@/hooks/useReducedMotion';

export type IconButtonVariant = 'standard' | 'filled' | 'tonal' | 'outlined';

interface IconButtonProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  /** Nombre que anuncia el lector de pantalla (el botón no tiene texto visible) */
  accessibilityLabel: string;
  onPress: () => void;
  variant?: IconButtonVariant;
  size?: number;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  iconColor?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  accessibilityLabel,
  onPress,
  variant = 'standard',
  size = 24,
  disabled = false,
  loading = false,
  style,
  iconColor,
}) => {
  const getVariantStyles = (): { container: ViewStyle; color: string } => {
    switch (variant) {
      case 'filled':
        return {
          container: {
            backgroundColor: '#FFFFFF',
          },
          color: iconColor || '#000000',
        };
      case 'tonal':
        return {
          container: {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderWidth: 1.5,
            borderColor: colors.outlineVariant,
          },
          color: iconColor || colors.onSurface,
        };
      case 'outlined':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderColor: iconColor || colors.onSurface,
          },
          color: iconColor || colors.onSurface,
        };
      case 'standard':
      default:
        return {
          container: {
            backgroundColor: 'transparent',
          },
          color: iconColor || colors.onSurfaceVariant,
        };
    }
  };

  const vStyles = getVariantStyles();
  // Objetivo táctil mínimo de 44 px aunque el ícono sea chico
  const containerSize = Math.max(44, size + 16);
  const scaleAnim = React.useRef(new Animated.Value(scale.rest)).current;

  const animateTo = (toValue: number, useSpring: boolean) => {
    if (isReducedMotion()) return;
    Animated.timing(scaleAnim, {
      toValue,
      duration: useSpring ? duration.short4 : duration.short2,
      easing: useSpring ? ease.spring : ease.standard,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={onPress}
      onPressIn={() => animateTo(scale.pressedSmall, false)}
      onPressOut={() => animateTo(scale.rest, true)}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        vStyles.container,
        {
          width: containerSize,
          height: containerSize,
          // Radio base de la marca en vez de círculo
          borderRadius: 10,
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
        Platform.OS === 'web' && ({ cursor: disabled || loading ? 'not-allowed' : 'pointer' } as any),
        style as any,
      ]}
    >
      <Animated.View
        style={[
          styles.inner,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={vStyles.color} />
        ) : (
          <MaterialCommunityIcons name={icon} size={size} color={vStyles.color} />
        )}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
    backgroundColor: colors.onSurfaceAlpha12,
  },
  disabled: {
    opacity: 0.38,
  },
});
