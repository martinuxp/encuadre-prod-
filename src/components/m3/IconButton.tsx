// ═══════════════════════════════════════════════════════
// Encuadre Prod. — IconButton (Componente MD3)
// ═══════════════════════════════════════════════════════

import React from 'react';
import { Pressable, Animated, StyleSheet, ViewStyle, Platform, ActivityIndicator, StyleProp } from 'react-native';
import { colors, shapes, spacing } from '@/theme/tokens';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ease, duration, scale } from '@/theme/animation';

export type IconButtonVariant = 'standard' | 'filled' | 'tonal' | 'outlined';

interface IconButtonProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
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
            backgroundColor: colors.primary,
          },
          color: iconColor || colors.onPrimary,
        };
      case 'tonal':
        return {
          container: {
            backgroundColor: colors.secondaryContainer,
          },
          color: iconColor || colors.onSecondaryContainer,
        };
      case 'outlined':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: colors.outline,
          },
          color: iconColor || colors.primary,
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
  const containerSize = size + 16; // Padding alrededor del icono
  const scaleAnim = React.useRef(new Animated.Value(scale.rest)).current;

  const animateTo = (toValue: number, useSpring: boolean) => {
    Animated.timing(scaleAnim, {
      toValue,
      duration: useSpring ? duration.short4 : duration.short2,
      easing: useSpring ? ease.spring : ease.standard,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
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
          borderRadius: containerSize / 2,
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
