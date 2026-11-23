// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Documento HTML raíz (solo web, export estático)
// Idioma, color de la interfaz del navegador y carga temprana de Google Sans Flex.
// ═══════════════════════════════════════════════════════

import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Solo el eje de peso que usa el panel (300–1000); sin itálicas ni anchos
const FONT_URL = 'https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@300..1000&display=swap';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es-CL">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#000000" />
        <meta name="color-scheme" content="dark" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONT_URL} />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: 'html,body{background:#000;}' }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
