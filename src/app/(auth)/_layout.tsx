// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Auth Layout Redirector
// Redirige a inicio si el usuario ya está autenticado
// ═══════════════════════════════════════════════════════

import React, { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { Slot, useRouter } from 'expo-router';
import { LoadingState } from '@/components/m3/LoadingState';

export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace('/');
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) {
    return <LoadingState message="Cargando..." fullScreen />;
  }

  return <Slot />;
}
