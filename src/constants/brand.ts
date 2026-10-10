// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Constantes de Marca
// Nomenclatura y activos de Grupo Encuadre Chile
// ═══════════════════════════════════════════════════════

/** Nombres de marca según contexto */
export const brand = {
  /** Título largo de la aplicación */
  appTitle: 'Encuadre Portal de Producción',
  /** Nombre medio para barras y headers */
  appTitleMedium: 'Encuadre Prod. Portal',
  /** Nombre corto para navegación compacta */
  appTitleShort: 'Encuadre Prod.',
  /** Nombre corporativo completo */
  companyFull: 'Grupo Encuadre Chile',
  /** Nombre corporativo medio */
  companyMedium: 'Grupo Encuadre',
  /** Nombre corporativo corto */
  companyShort: 'Encuadre',
  /** Texto del footer */
  footer: 'Portal de Grupo Encuadre Chile',
  /** URL del sitio de producción */
  siteUrl: 'https://prod.encuadre.muxp.art',
} as const;

/** Paths de activos de marca */
export const brandAssets = {
  logoSvg: require('../../assets/brand-svg/Encuadrelogo.svg'),
} as const;
