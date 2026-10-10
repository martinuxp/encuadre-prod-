// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Admin Layout Guard
// Control de sesión y protección de rutas administrativas
// ═══════════════════════════════════════════════════════

import React, { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { Slot, useRouter, useSegments } from 'expo-router';
import { LoadingState } from '@/components/m3/LoadingState';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/theme/tokens';

export default function AdminLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    // Verificar si el usuario intenta entrar a rutas de admin sin autenticarse
    const inAuthGroup = segments[0] === '(auth)';

    if (!isSignedIn && !inAuthGroup) {
      // Redirigir a login si no está logueado
      router.replace('/(auth)/login');
    } else if (isSignedIn && inAuthGroup) {
      // Redirigir a inicio si ya está logueado e intenta entrar a login
      router.replace('/');
    }
  }, [isLoaded, isSignedIn, segments]);

  if (!isLoaded) {
    return <LoadingState message="Verificando credenciales..." fullScreen />;
  }

  // Si no está logueado, no renderizamos nada para evitar parpadeo antes del redirect
  if (!isSignedIn) {
    return <View style={styles.emptyContainer} />;
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
