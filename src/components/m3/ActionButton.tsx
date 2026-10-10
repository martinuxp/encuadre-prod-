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
import { colors, typography, shapes, spacing } from '@/theme/tokens';
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
}) => {
  const getVariantStyles = (): { container: ViewStyle; text: TextStyle; iconColor: string } => {
    switch (variant) {
      case 'tonal':
        return {
          container: {
            backgroundColor: colors.secondaryContainer,
          },
          text: {
            color: colors.onSecondaryContainer,
          },
          iconColor: colors.onSecondaryContainer,
        };
      case 'outlined':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: colors.outline,
          },
          text: {
            color: colors.primary,
          },
          iconColor: colors.primary,
        };
      case 'text':
        return {
          container: {
            backgroundColor: 'transparent',
            paddingHorizontal: spacing.sm,
          },
          text: {
            color: colors.primary,
          },
          iconColor: colors.primary,
        };
      case 'filled':
      default:
        return {
          container: {
            backgroundColor: colors.primary,
          },
          text: {
            color: colors.onPrimary,
          },
          iconColor: colors.onPrimary,
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
          transition: 'transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 200ms cubic-bezier(0.2, 0, 0, 1), opacity 150ms ease',
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
    paddingHorizontal: spacing.base,
    borderRadius: shapes.full,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...typography.labelLarge,
    textAlign: 'center',
    fontWeight: '600',
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
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.outlineVariant,
    opacity: 0.38,
  },
  disabledText: {
    color: colors.onSurface,
  },
});
