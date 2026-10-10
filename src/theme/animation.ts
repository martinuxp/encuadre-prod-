// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Material Design 3 Expressive (M3E)
// Tokens de animación y Hooks para React Native / Expo Web
// ═══════════════════════════════════════════════════════

import React from 'react';
import { Easing, Animated } from 'react-native';

/**
 * Curvas de easing M3E.
 * Mapeo de las cubic-bezier de la skill a Easing de React Native.
 */
export const ease = {
  standard: Easing.bezier(0.2, 0, 0, 1),
  standardDecelerate: Easing.bezier(0, 0, 0, 1),
  standardAccelerate: Easing.bezier(0.3, 0, 1, 1),

  emphasized: Easing.bezier(0.2, 0, 0, 1),
  emphasizedDecelerate: Easing.bezier(0.05, 0.7, 0.1, 1),
  emphasizedAccelerate: Easing.bezier(0.3, 0, 0.8, 0.15),

  // Spring-like: overshoot expresivo orgánico de M3 Expressive
  spring: Easing.bezier(0.34, 1.56, 0.64, 1),
  springSoft: Easing.bezier(0.175, 0.885, 0.32, 1.275),
} as const;

/** Duraciones M3E (ms) */
export const duration = {
  short1: 50,
  short2: 100,
  short3: 150,
  short4: 200,
  medium1: 250,
  medium2: 300,
  medium3: 350,
  medium4: 400,
  long1: 450,
  long2: 500,
} as const;

/** Presets de timing reutilizables */
export const timing = {
  press: { duration: duration.short4, easing: ease.standard },
  hover: { duration: duration.medium2, easing: ease.spring },
  enter: { duration: duration.medium4, easing: ease.emphasizedDecelerate },
  exit: { duration: duration.medium2, easing: ease.emphasizedAccelerate },
  move: { duration: duration.medium3, easing: ease.emphasizedDecelerate },
  bounce: { duration: duration.medium2, easing: ease.spring },
} as const;

/** Interpolaciones útiles de escala (press feedback) */
export const scale = {
  rest: 1,
  hover: 1.03,
  pressed: 0.96,
  pressedSmall: 0.92,
} as const;

/** Elevación M3E (translateY para hover lift) */
export const lift = {
  none: 0,
  small: -2,
  medium: -4,
  large: -8,
} as const;

/**
 * Hook reutilizable para animación de press expresiva.
 * Usa spring en release y standard en press, igual que el patrón M3E.
 */
export function usePressAnimation(
  restScale: number = scale.rest,
  pressedScale: number = scale.pressed,
) {
  const scaleAnim = React.useRef(new Animated.Value(restScale)).current;

  const pressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: pressedScale,
      duration: duration.short2,
      easing: ease.standard,
      useNativeDriver: true,
    }).start();
  };

  const pressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: restScale,
      duration: duration.medium2,
      easing: ease.spring,
      useNativeDriver: true,
    }).start();
  };

  return { scaleAnim, pressIn, pressOut };
}

/**
 * Hook para animación de entrada M3E en modales y pantallas.
 */
export function useEnterAnimation(
  fromScale = 0.94,
  toOpacity = 1,
) {
  const opacity = React.useRef(new Animated.Value(0)).current;
  const scale = React.useRef(new Animated.Value(fromScale)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: toOpacity,
        duration: duration.medium3,
        easing: ease.standardDecelerate,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: duration.medium3,
        easing: ease.spring,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return { opacity, scale };
}

/**
 * Hook para modales interactivos con apertura y cierre spring.
 */
export function useModalSpringAnimation(visible: boolean) {
  const backdropOpacity = React.useRef(new Animated.Value(0)).current;
  const cardScale = React.useRef(new Animated.Value(0.92)).current;
  const cardOpacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      backdropOpacity.setValue(0);
      cardScale.setValue(0.92);
      cardOpacity.setValue(0);

      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: duration.short4,
          easing: ease.standard,
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 1,
          duration: duration.medium3,
          easing: ease.spring,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: duration.medium3,
          easing: ease.emphasizedDecelerate,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return { backdropOpacity, cardScale, cardOpacity };
}
