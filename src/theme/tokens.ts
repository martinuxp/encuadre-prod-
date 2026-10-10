// ═══════════════════════════════════════════════════════
// Encuadre Prod. — MD3 Design Tokens para React Native
// Mapeo de CSS custom properties a constantes TypeScript
// ═══════════════════════════════════════════════════════

/** Paleta de colores MD3 Dark — Grupo Encuadre */
export const colors = {
  // Primary
  primary: 'rgb(197, 192, 255)',
  surfaceTint: 'rgb(197, 192, 255)',
  onPrimary: 'rgb(45, 41, 96)',
  primaryContainer: 'rgb(68, 64, 120)',
  onPrimaryContainer: 'rgb(227, 223, 255)',

  // Secondary
  secondary: 'rgb(199, 196, 220)',
  onSecondary: 'rgb(48, 46, 66)',
  secondaryContainer: 'rgb(70, 69, 89)',
  onSecondaryContainer: 'rgb(228, 223, 249)',

  // Tertiary
  tertiary: 'rgb(235, 184, 208)',
  onTertiary: 'rgb(71, 37, 56)',
  tertiaryContainer: 'rgb(96, 59, 79)',
  onTertiaryContainer: 'rgb(255, 216, 233)',

  // Error
  error: 'rgb(255, 180, 171)',
  onError: 'rgb(105, 0, 5)',
  errorContainer: 'rgb(147, 0, 10)',
  onErrorContainer: 'rgb(255, 218, 214)',

  // Surface / Background
  background: 'rgb(19, 19, 24)',
  onBackground: 'rgb(229, 225, 233)',
  surface: 'rgb(19, 19, 24)',
  onSurface: 'rgb(229, 225, 233)',
  surfaceVariant: 'rgb(71, 70, 79)',
  onSurfaceVariant: 'rgb(200, 197, 208)',

  // Outline
  outline: 'rgb(146, 143, 153)',
  outlineVariant: 'rgb(71, 70, 79)',

  // Shadow / Scrim
  shadow: 'rgb(0, 0, 0)',
  scrim: 'rgb(0, 0, 0)',

  // Inverse
  inverseSurface: 'rgb(229, 225, 233)',
  inverseOnSurface: 'rgb(49, 48, 54)',
  inversePrimary: 'rgb(92, 88, 145)',

  // Surface Containers (elevación tonal MD3)
  surfaceDim: 'rgb(19, 19, 24)',
  surfaceBright: 'rgb(58, 56, 63)',
  surfaceContainerLowest: 'rgb(14, 14, 19)',
  surfaceContainerLow: 'rgb(28, 27, 32)',
  surfaceContainer: 'rgb(32, 31, 37)',
  surfaceContainerHigh: 'rgb(42, 41, 47)',
  surfaceContainerHighest: 'rgb(53, 52, 58)',

  // Semánticos (producción)
  success: 'rgb(129, 199, 132)',
  onSuccess: 'rgb(27, 60, 29)',
  warning: 'rgb(255, 213, 79)',
  onWarning: 'rgb(62, 49, 0)',

  // Transparencias útiles
  primaryAlpha12: 'rgba(197, 192, 255, 0.12)',
  primaryAlpha20: 'rgba(197, 192, 255, 0.20)',
  onSurfaceAlpha08: 'rgba(229, 225, 233, 0.08)',
  onSurfaceAlpha12: 'rgba(229, 225, 233, 0.12)',
  onSurfaceAlpha38: 'rgba(229, 225, 233, 0.38)',
  scrimAlpha32: 'rgba(0, 0, 0, 0.32)',
} as const;

/** Tipografía MD3 */
export const typography = {
  displayLarge: {
    fontSize: 57,
    lineHeight: 64,
    fontWeight: '400' as const,
    letterSpacing: -0.25,
  },
  displayMedium: {
    fontSize: 45,
    lineHeight: 52,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  displaySmall: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  headlineLarge: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  headlineMedium: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  headlineSmall: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  titleLarge: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '500' as const,
    letterSpacing: 0,
  },
  titleMedium: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500' as const,
    letterSpacing: 0.15,
  },
  titleSmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const,
    letterSpacing: 0.1,
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
    letterSpacing: 0.5,
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
    letterSpacing: 0.25,
  },
  bodySmall: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
    letterSpacing: 0.4,
  },
  labelLarge: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const,
    letterSpacing: 0.1,
  },
  labelMedium: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
  },
  labelSmall: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
  },
} as const;

/** Formas MD3 (border radius) */
export const shapes = {
  none: 0,
  extraSmall: 4,
  small: 8,
  medium: 12,
  large: 16,
  largeIncreased: 20,
  extraLarge: 28,
  full: 9999,
} as const;

/** Espaciado (sistema de 8dp) */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

/** Elevación (tonal — mapeado a opacidad de tint en surface) */
export const elevation = {
  level0: 0,
  level1: 1,
  level2: 3,
  level3: 6,
  level4: 8,
  level5: 12,
} as const;

/** Duraciones de animación */
export const motion = {
  durationShort: 200,
  durationMedium: 300,
  durationLong: 500,
} as const;

/** Layout constants */
export const layout = {
  contentMaxWidth: 1200,
  navRailWidth: 80,
  navRailExpandedWidth: 256,
  topBarHeight: 64,
  bottomNavHeight: 80,
} as const;

/** Breakpoints MD3 (Window Size Classes) */
export const breakpoints = {
  compact: 0,
  medium: 600,
  expanded: 840,
  large: 1200,
  extraLarge: 1600,
} as const;
