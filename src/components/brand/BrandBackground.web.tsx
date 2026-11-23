// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Fondo de marca (web)
// Negro + manchas noche/vino animadas (22 s) + grano dentro del fondo.
// Estilos en src/global.css (.enc-bg); respeta "reducir movimiento".
// ═══════════════════════════════════════════════════════

import React from 'react';
import { Asset } from 'expo-asset';

const grain = Asset.fromModule(require('../../../assets/brand/grain.webp')).uri;
const lines = Asset.fromModule(require('../../../assets/brand/lines.svg')).uri;

export interface BrandBackgroundProps {
  /** `alt` invierte la posición de las manchas; `quiet` las atenúa para pantallas densas */
  variant?: 'default' | 'alt' | 'quiet';
  /** Líneas finas del brandbook */
  withLines?: boolean;
}

export const BrandBackground: React.FC<BrandBackgroundProps> = ({ variant = 'default', withLines = false }) => (
  <div className={`enc-bg${variant !== 'default' ? ` enc-bg--${variant}` : ''}`} aria-hidden="true">
    <div className="enc-bg__blobs" />
    {withLines ? <img className="enc-bg__lines" src={lines} alt="" /> : null}
    <div className="enc-bg__grain" style={{ backgroundImage: `url(${grain})` }} />
  </div>
);
