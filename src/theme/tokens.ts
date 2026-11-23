// ═══════════════════════════════════════════════════════
// Encuadre Prod. — MD3 Design Tokens para React Native
// Mapeo de CSS custom properties a constantes TypeScript
// ═══════════════════════════════════════════════════════

import { Platform } from 'react-native';

/**
 * Paleta Grupo Encuadre (brandbook): negro, blanco, noche y vino.
 * Se conservan las claves MD3 para que todas las pantallas hereden la marca.
 * Las superficies "Low/Lowest" son translúcidas (dejan ver el fondo de marca);
 * "Container/High/Highest" son opacas porque se usan en diálogos y modales.
 */
export const colors = {
  // Primary — blanco sobre negro
  primary: '#FFFFFF',
  surfaceTint: '#FFFFFF',
  onPrimary: '#000000',
  primaryContainer: 'rgba(255, 255, 255, 0.14)',
  onPrimaryContainer: '#FFFFFF',

  // Secondary — vino institucional
  secondary: 'rgba(255, 255, 255, 0.7)',
  onSecondary: '#000000',
  secondaryContainer: '#861634',
  onSecondaryContainer: '#FFFFFF',

  // Tertiary — noche
  tertiary: '#AAB4E0',
  onTertiary: '#0B0F1E',
  tertiaryContainer: '#141A2E',
  onTertiaryContainer: '#DDE2FF',

  // Error
  error: '#FFB3C0',
  onError: '#3D0010',
  errorContainer: '#5C0F22',
  onErrorContainer: '#FFD9DF',

  // Surface / Background
  background: '#000000',
  onBackground: '#FFFFFF',
  surface: '#060608',
  onSurface: '#FFFFFF',
  surfaceVariant: 'rgba(255, 255, 255, 0.08)',
  onSurfaceVariant: 'rgba(255, 255, 255, 0.7)',

  // Outline — bordes blancos finos
  outline: 'rgba(255, 255, 255, 0.3)',
  outlineVariant: 'rgba(255, 255, 255, 0.12)',

  // Misc
  shadow: '#000000',
  scrim: '#000000',

  // Inverse
  inverseSurface: '#FFFFFF',
  inverseOnSurface: '#000000',
  inversePrimary: '#861634',

  // Surface Containers
  surfaceDim: '#000000',
  surfaceBright: '#2A2A2E',
  surfaceContainerLowest: 'rgba(255, 255, 255, 0.03)',
  surfaceContainerLow: 'rgba(255, 255, 255, 0.05)',
  surfaceContainer: '#111114',
  surfaceContainerHigh: '#18181C',
  surfaceContainerHighest: '#222227',

  // Estados
  success: 'rgb(129, 199, 132)',
  onSuccess: 'rgb(27, 60, 29)',
  warning: 'rgb(255, 213, 79)',
  onWarning: 'rgb(62, 49, 0)',

  // Alfas
  primaryAlpha12: 'rgba(255, 255, 255, 0.12)',
  primaryAlpha20: 'rgba(255, 255, 255, 0.20)',
  onSurfaceAlpha08: 'rgba(255, 255, 255, 0.08)',
  onSurfaceAlpha12: 'rgba(255, 255, 255, 0.12)',
  onSurfaceAlpha38: 'rgba(255, 255, 255, 0.38)',
  /** Texto de ejemplo en campos: 0.55 sobre superficies oscuras ≈ 5:1 (AA) */
  placeholder: 'rgba(255, 255, 255, 0.55)',
  scrimAlpha32: 'rgba(0, 0, 0, 0.32)',
} as const;

/** Tokens propios de la marca (ver docs/GUIA-DISENO-ENCUADRE.md de la web) */
export const brandColors = {
  black: '#000000',
  page: '#060608',
  night: '#141A2E',
  wine: '#861634',
  ink: '#FFFFFF',
  muted: 'rgba(255, 255, 255, 0.7)',
  surface: 'rgba(255, 255, 255, 0.06)',
  surfaceHover: 'rgba(255, 255, 255, 0.12)',
  line: 'rgba(255, 255, 255, 0.25)',
  lineSoft: 'rgba(255, 255, 255, 0.12)',
  glass: 'rgba(10, 10, 14, 0.82)',
} as const;

/** Única familia del panel: Google Sans Flex (cargada en web desde global.css) */
export const fontFamily = Platform.select({
  web: '"Google Sans Flex", "Helvetica Neue", Arial, sans-serif',
  default: undefined,
});

/** Tipografía — Google Sans Flex, pesos altos y tracking negativo en títulos */
const t = (fontSize: number, lineHeight: number, fontWeight: '300' | '400' | '500' | '600' | '700' | '800' | '900', letterSpacing: number) =>
  ({ fontFamily, fontSize, lineHeight, fontWeight, letterSpacing }) as const;

export const typography = {
  displayLarge: t(57, 60, '900', -2.5),
  displayMedium: t(45, 48, '900', -1.8),
  displaySmall: t(36, 40, '900', -1.4),
  headlineLarge: t(32, 36, '800', -1.1),
  headlineMedium: t(28, 32, '800', -0.9),
  headlineSmall: t(24, 28, '800', -0.7),
  titleLarge: t(22, 26, '700', -0.5),
  titleMedium: t(16, 22, '700', -0.2),
  titleSmall: t(14, 20, '700', -0.1),
  bodyLarge: t(16, 24, '400', -0.1),
  bodyMedium: t(14, 20, '400', 0),
  bodySmall: t(12, 16, '400', 0.1),
  labelLarge: t(14, 20, '700', 0),
  labelMedium: t(12, 16, '700', 0.2),
  labelSmall: t(11, 16, '700', 0.6),
} as const;

/** Formas — radio base 10 y la firma del brandbook: una esquina grande por bloque */
export const shapes = {
  none: 0,
  extraSmall: 6,
  small: 10,
  medium: 10,
  large: 14,
  largeIncreased: 20,
  extraLarge: 30,
  signature: 30,
  full: 9999,
} as const;

/** Esquinas de firma listas para usar en estilos */
export const corners = {
  /** Tarjetas y bloques: 10 30 10 10 */
  card: { borderRadius: 10, borderTopRightRadius: 30 },
  /** Primer bloque de un grupo / hero */
  lead: { borderRadius: 10, borderTopLeftRadius: 30 },
  /** Último bloque de un grupo */
  tail: { borderRadius: 10, borderBottomRightRadius: 30 },
  /** Botones: esquina superior izquierda 24 */
  button: { borderRadius: 10, borderTopLeftRadius: 24 },
  /** Chips / etiquetas: 10 20 10 10 */
  chip: { borderRadius: 10, borderTopRightRadius: 20 },
  /** Campos de formulario */
  field: { borderRadius: 10 },
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
