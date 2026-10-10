// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Admin Login
// Pantalla de inicio de sesión administrativo con Clerk
// ═══════════════════════════════════════════════════════

import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TextInput, Platform } from 'react-native';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { brand, brandAssets } from '@/constants/brand';
import { ActionButton } from '@/components/m3/ActionButton';
import { InfoCard } from '@/components/m3/InfoCard';
import { useSignIn } from '@clerk/clerk-expo';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function LoginScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const afterLogin = () => router.replace((typeof redirect === 'string' && redirect.startsWith('/')) ? redirect as never : '/');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showMfa, setShowMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!isLoaded) return;
    if (!email || !password) {
      setError('Por favor complete todos los campos.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const completeSignIn = await signIn.create({
        identifier: email,
        password,
      });

      if (completeSignIn.status === 'complete') {
        await setActive({ session: completeSignIn.createdSessionId });
        afterLogin();
      } else if (completeSignIn.status === 'needs_second_factor') {
        // Preparar factor email_code
        await signIn.prepareSecondFactor({ strategy: 'email_code' });
        setShowMfa(true);
      } else {
        console.warn('Inicio de sesión incompleto:', completeSignIn);
        setError('El inicio de sesión no se pudo completar. Verifique sus credenciales.');
      }
    } catch (err: any) {
      console.error('Error de Clerk Login:', err);
      setError(err?.errors?.[0]?.message || 'Credenciales inválidas. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async () => {
    if (!isLoaded || !mfaCode) return;
    setLoading(true);
    setError(null);

    try {
      const completeSignIn = await signIn.attemptSecondFactor({
        strategy: 'email_code',
        code: mfaCode,
      });

      if (completeSignIn.status === 'complete') {
        await setActive({ session: completeSignIn.createdSessionId });
        afterLogin();
      } else {
        setError('El código ingresado es incorrecto o expiró.');
      }
    } catch (err: any) {
      console.error('Error al verificar MFA:', err);
      setError(err?.errors?.[0]?.message || 'Código incorrecto. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <InfoCard title="" variant="outlined" style={styles.card}>
        <View style={styles.brandContainer}>
          <Image
            source={brandAssets.logoSvg}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appTitle}>{brand.appTitleMedium}</Text>
          <Text style={styles.tagline}>Panel de Administración de Proyectos</Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {showMfa ? (
          <View style={styles.form}>
            <Text style={styles.mfaLabel}>Autenticación de 2 Factores</Text>
            <Text style={styles.mfaInstructions}>
              Hemos enviado un código de verificación a tu correo electrónico registrado.
            </Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Código de Verificación</Text>
              <TextInput
                value={mfaCode}
                onChangeText={setMfaCode}
                placeholder="123456"
                placeholderTextColor={colors.onSurfaceAlpha38}
                keyboardType="number-pad"
                autoCapitalize="none"
                style={[
                  styles.input,
                  Platform.OS === 'web' && { outlineStyle: 'none' } as any,
                ]}
              />
            </View>

            <ActionButton
              label="Verificar Código"
              onPress={handleVerifyMfa}
              loading={loading}
              variant="filled"
              icon="check"
              style={styles.loginBtn}
            />

            <ActionButton
              label="Volver"
              onPress={() => setShowMfa(false)}
              variant="text"
              style={{ marginTop: spacing.sm }}
            />
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo electrónico</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="admin@encuadre.cl"
                placeholderTextColor={colors.onSurfaceAlpha38}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[
                  styles.input,
                  Platform.OS === 'web' && { outlineStyle: 'none' } as any,
                ]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.onSurfaceAlpha38}
                secureTextEntry
                autoCapitalize="none"
                style={[
                  styles.input,
                  Platform.OS === 'web' && { outlineStyle: 'none' } as any,
                ]}
              />
            </View>

            <ActionButton
              label="Iniciar Sesión"
              onPress={handleLogin}
              loading={loading}
              variant="filled"
              icon="login"
              style={styles.loginBtn}
            />
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>{brand.footer}</Text>
        </View>
      </InfoCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: spacing.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.outlineVariant,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  logo: {
    width: 200,
    height: 48,
    ...Platform.select({
      web: {
        filter: 'brightness(0) invert(1)',
      } as any,
    }),
  },
  appTitle: {
    ...typography.titleLarge,
    color: colors.primary,
    fontWeight: 'bold',
    marginTop: spacing.sm,
  },
  tagline: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  form: {
    gap: spacing.base,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  label: {
    ...typography.labelLarge,
    color: colors.onSurface,
    fontWeight: '600',
  },
  input: {
    height: 48,
    backgroundColor: colors.surfaceContainer,
    borderRadius: shapes.small,
    paddingHorizontal: spacing.base,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...typography.bodyLarge,
  },
  loginBtn: {
    height: 48,
    marginTop: spacing.sm,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 180, 171, 0.15)',
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: shapes.small,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  errorText: {
    color: colors.error,
    ...typography.bodyMedium,
    textAlign: 'center',
  },
  footer: {
    marginTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    paddingTop: spacing.base,
    alignItems: 'center',
  },
  footerText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  mfaLabel: {
    ...typography.titleMedium,
    color: colors.primary,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  mfaInstructions: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
});
