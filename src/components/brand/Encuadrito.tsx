// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Encuadritos (Compota, Tofu, Flan)
// Mascotas del brandbook para estados vacíos, éxito y avisos, con un pequeño rebote.
// ═══════════════════════════════════════════════════════

import React, { useEffect, useRef } from 'react';
import { Animated, AccessibilityInfo, Easing, StyleProp, ViewStyle } from 'react-native';
import { Image } from 'expo-image';

const SOURCES = {
  compota: require('../../../assets/brand/encuadritos/compota.svg'),
  tofu: require('../../../assets/brand/encuadritos/tofu.svg'),
  flan: require('../../../assets/brand/encuadritos/flan.svg'),
} as const;

export type EncuadritoName = keyof typeof SOURCES;

interface EncuadritoProps {
  name?: EncuadritoName;
  size?: number;
  bounce?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Encuadrito: React.FC<EncuadritoProps> = ({ name = 'flan', size = 96, bounce = true, style }) => {
  const y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!bounce) return;
    let loop: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) return;
      loop = Animated.loop(Animated.sequence([
        Animated.timing(y, { toValue: -8, duration: 700, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 900, easing: Easing.bounce, useNativeDriver: true }),
        Animated.delay(1400),
      ]));
      loop.start();
    }).catch(() => undefined);
    return () => loop?.stop();
  }, [bounce, y]);

  return (
    <Animated.View style={[{ width: size, height: size, transform: [{ translateY: y }] }, style]}>
      <Image source={SOURCES[name]} style={{ width: '100%', height: '100%' }} contentFit="contain" />
    </Animated.View>
  );
};
