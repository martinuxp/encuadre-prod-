// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Root Index Redirector
// Redirección hacia las pantallas administrativas protegidas
// ═══════════════════════════════════════════════════════

import { Redirect } from 'expo-router';

export default function RootIndex() {
  // Redirigir directamente al grupo administrativo (admin),
  // el cual se encargará de validar la sesión mediante su _layout guard.
  return <Redirect href="/(admin)" />;
}
