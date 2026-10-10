// ═══════════════════════════════════════════════════════
// Encuadre Prod. — AnimatedCard (Wrapper M3 Expressive)
// Aplica elevación tonal, hover lift y spring feedback
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, StyleSheet, Pressable, Animated, ViewStyle, Platform } from 'react-native';
import { usePressAnimation } from '@/theme/animation';
import { shapes, colors } from '@/theme/tokens';

interface AnimatedCardProps {
  onPress?: () => void;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  children: React.ReactNode;
  testID?: string;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  onPress,
  style,
  contentStyle,
  children,
  testID,
}) => {
  const { scaleAnim, pressIn, pressOut } = usePressAnimation(1, 0.97);

  const inner = (
    <Animated.View style={[styles.inner, contentStyle, { transform: [{ scale: scaleAnim }] }]}>
      {children}
    </Animated.View>
  );

  if (!onPress) {
    return <View style={[styles.cardBase, style]} testID={testID}>{inner}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      testID={testID}
      style={({ pressed }) => [
        styles.cardBase,
        style,
        pressed && styles.pressed,
        Platform.OS === 'web' && ({
          cursor: 'pointer',
          transition: 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 200ms cubic-bezier(0.2, 0, 0, 1), border-color 200ms cubic-bezier(0.2, 0, 0, 1)',
        } as any),
      ]}
    >
      {inner}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cardBase: {
    borderRadius: shapes.large,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainer,
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
  },
  pressed: {
    opacity: 0.92,
  },
});
