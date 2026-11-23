// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Preferencia "reducir movimiento"
// Un solo lector compartido del ajuste del sistema (iOS, Android y web),
// para que todas las animaciones respondan igual y sigan los cambios en vivo.
// ═══════════════════════════════════════════════════════

import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

let reduced = false;
const listeners = new Set<() => void>();
const emit = (value: boolean) => {
  if (value === reduced) return;
  reduced = value;
  listeners.forEach((l) => l());
};

AccessibilityInfo.isReduceMotionEnabled().then(emit).catch(() => undefined);
AccessibilityInfo.addEventListener?.('reduceMotionChanged', emit);

/** Valor actual, para usar fuera de componentes (p. ej. dentro de un handler) */
export const isReducedMotion = () => reduced;

/** `true` si la persona pidió reducir el movimiento en su sistema */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => reduced,
    () => false,
  );
}
