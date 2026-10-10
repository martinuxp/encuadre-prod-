// ═══════════════════════════════════════════════════════
// Encuadre Prod. — RootLayout
// Carga global de estilos, Clerk Auth y Expo Router Stack
// ═══════════════════════════════════════════════════════

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-expo';
import { tokenCache } from '@/services/auth/tokenCache';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '@/theme/tokens';
import { ensureFirebaseAuth } from '@/services/firebase/firebaseConfig';
import '../global.css';

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

export default function RootLayout() {
  // Inicializar Firebase Auth al montar la aplicación
  useEffect(() => {
    ensureFirebaseAuth();
  }, []);

  // Si no hay llave de Clerk, renderizamos directamente sin Auth para no romper el desarrollo local
  if (!CLERK_PUBLISHABLE_KEY) {
    console.warn(
      'Falta la variable EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. El sistema se ejecutará sin autenticación.'
    );
    return (
      <View style={styles.container}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
    );
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <View style={styles.container}>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Rutas de participantes y visor público, no protegidas */}
          <Stack.Screen name="call/[token]" options={{ headerShown: false }} />
          <Stack.Screen name="view/[token]" options={{ headerShown: false }} />

          {/* Rutas administrativas protegidas e inicio */}
          <Stack.Screen name="(admin)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack>
      </View>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
