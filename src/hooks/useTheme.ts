// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Theme Hook
// Provee tokens MD3 como constantes tipadas
// ═══════════════════════════════════════════════════════

import { colors, typography, shapes, spacing, elevation, motion, layout } from '@/theme/tokens';

/**
 * Hook que expone el tema MD3 completo.
 * Como solo usamos dark mode, no hay context/provider —
 * simplemente re-exporta tokens constantes.
 */
export function useTheme() {
  return {
    colors,
    typography,
    shapes,
    spacing,
    elevation,
    motion,
    layout,
  };
}

export type AppTheme = ReturnType<typeof useTheme>;
