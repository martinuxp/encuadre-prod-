// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Responsive Hook
// Detecta breakpoint activo (MD3 Window Size Classes)
// ═══════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';
import { breakpoints } from '@/theme/tokens';

export type WindowSizeClass = 'compact' | 'medium' | 'expanded' | 'large' | 'extraLarge';

function getWindowSizeClass(width: number): WindowSizeClass {
  if (width >= breakpoints.extraLarge) return 'extraLarge';
  if (width >= breakpoints.large) return 'large';
  if (width >= breakpoints.expanded) return 'expanded';
  if (width >= breakpoints.medium) return 'medium';
  return 'compact';
}

/**
 * Hook que devuelve la clase de tamaño de ventana actual (MD3).
 * Útil para decidir entre NavigationRail vs BottomNav, etc.
 */
export function useResponsive() {
  const [dimensions, setDimensions] = useState(() => Dimensions.get('window'));
  const [sizeClass, setSizeClass] = useState<WindowSizeClass>(() =>
    getWindowSizeClass(Dimensions.get('window').width)
  );

  useEffect(() => {
    const handler = ({ window }: { window: ScaledSize }) => {
      setDimensions(window);
      setSizeClass(getWindowSizeClass(window.width));
    };

    const subscription = Dimensions.addEventListener('change', handler);
    return () => subscription.remove();
  }, []);

  return {
    width: dimensions.width,
    height: dimensions.height,
    sizeClass,
    isCompact: sizeClass === 'compact',
    isMedium: sizeClass === 'medium',
    isExpanded: sizeClass === 'expanded' || sizeClass === 'large' || sizeClass === 'extraLarge',
    isDesktop: sizeClass === 'large' || sizeClass === 'extraLarge',
    showRail: sizeClass !== 'compact',
    showBottomNav: sizeClass === 'compact',
  };
}
