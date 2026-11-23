// ═══════════════════════════════════════════════════════
// Encuadre Prod. — ActionButton (Componente MD3 Expressive)
// ═══════════════════════════════════════════════════════

import React from 'react';
import {
  Text,
  StyleSheet,
  Pressable,
  Animated,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Platform,
  StyleProp,
} from 'react-native';
import { colors, typography, spacing, corners } from '@/theme/tokens';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ease, duration, scale } from '@/theme/animation';

export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text';

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: TextStyle;
  /** Colores del proyecto: el botón se pinta con `ink` sobre `bg` (vistas teñidas) */
  tint?: { bg: string; ink: string };
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  onPress,
  variant = 'filled',
  icon,
  disabled = false,
  loading = false,
  style,
  labelStyle,
  tint,
}) => {
  const ink = tint?.ink ?? colors.onSurface;
  const paper = tint?.bg ?? colors.background;
  // Principal: blanco con texto negro. Secundario: borde blanco 2 px. Tonal: superficie translúcida.
  const getVariantStyles = (): { container: ViewStyle; text: TextStyle; iconColor: string } => {
    switch (variant) {
      case 'tonal':
        return {
          container: { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1.5, borderColor: tint ? ink : colors.outlineVariant },
          text: { color: ink },
          iconColor: ink,
        };
      case 'outlined':
        return {
          container: { backgroundColor: 'transparent', borderWidth: 2, borderColor: ink },
          text: { color: ink },
          iconColor: ink,
        };
      case 'text':
        return {
          container: { backgroundColor: 'transparent', paddingHorizontal: spacing.sm },
          text: { color: ink },
          iconColor: ink,
        };
      case 'filled':
      default:
        return {
          container: { backgroundColor: ink, borderWidth: 2, borderColor: ink },
          text: { color: paper },
          iconColor: paper,
        };
    }
  };

  const vStyles = getVariantStyles();
  const scaleAnim = React.useRef(new Animated.Value(scale.rest)).current;

  const animateTo = (toValue: number, useSpring: boolean) => {
    Animated.timing(scaleAnim, {
      toValue,
      duration: useSpring ? duration.medium2 : duration.short2,
      easing: useSpring ? ease.spring : ease.standard,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animateTo(scale.pressed, false)}
      onPressOut={() => animateTo(scale.rest, true)}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        vStyles.container,
        pressed && styles.pressed,
        disabled && styles.disabled,
        Platform.OS === 'web' && ({
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          transition: 'transform 250ms cubic-bezier(0.16, 1, 0.3, 1), background-color 200ms ease, opacity 150ms ease',
        } as any),
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
          <ActivityIndicator
            size="small"
            color={vStyles.iconColor}
            style={styles.loader}
          />
        ) : icon ? (
          <MaterialCommunityIcons
            name={icon}
            size={18}
            color={vStyles.iconColor}
            style={styles.icon}
          />
        ) : null}
        <Text
          style={[
            styles.text,
            vStyles.text,
            disabled && styles.disabledText,
            labelStyle,
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.base + 4,
    ...corners.button,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...typography.labelLarge,
    textAlign: 'center',
    fontWeight: '700',
  },
  icon: {
    marginRight: spacing.sm,
  },
  loader: {
    marginRight: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.38,
  },
  disabledText: {},
});
