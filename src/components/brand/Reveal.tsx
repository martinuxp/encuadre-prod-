// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Reveal
// Entrada en cascada del brandbook: opacidad 0→1 y y 24→0,
// curva cubic-bezier(0.16, 1, 0.3, 1) en 800 ms. Respeta "reducir movimiento".
// ═══════════════════════════════════════════════════════

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export const encEase = Easing.bezier(0.16, 1, 0.3, 1);
/** Separación entre elementos de una cascada */
export const STAGGER_MS = 70;

interface RevealProps {
  /** Posición en la cascada (0, 1, 2…) */
  index?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export const Reveal: React.FC<RevealProps> = ({ index = 0, delay = 0, style, children }) => {
  const progress = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) { progress.setValue(1); return; }
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 800,
      delay: delay + index * STAGGER_MS,
      easing: encEase,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [delay, index, progress, reduced]);

  if (reduced) return <Animated.View style={style}>{children}</Animated.View>;

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};
