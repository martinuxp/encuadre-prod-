// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Admin Login
// Pantalla de inicio de sesión administrativo con Clerk
// ═══════════════════════════════════════════════════════

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { colors, typography, spacing, corners } from '@/theme/tokens';
import { brand, brandAssets } from '@/constants/brand';
import { ActionButton } from '@/components/m3/ActionButton';
import { BrandBackground } from '@/components/brand/BrandBackground';
import { Reveal } from '@/components/brand/Reveal';
import { EncInput } from '@/components/brand/EncInput';
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
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  const handleLogin = async () => {
    if (!isLoaded) return;
    if (!email || !password) {
      setError('Completa tu correo y contraseña.');
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
        setError('No se pudo completar el inicio de sesión. Revisa tus datos.');
      }
    } catch (err: any) {
      console.error('Error de Clerk Login:', err);
      setError(err?.errors?.[0]?.message || 'Correo o contraseña incorrectos.');
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
      setError(err?.errors?.[0]?.message || 'Código incorrecto. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <BrandBackground withLines />
      <ScrollView contentContainerStyle={[styles.scroll, wide && styles.scrollWide]} keyboardShouldPersistTaps="handled">
        {/* Portada: como la del brandbook */}
        {/* En celular todo va centrado; en pantallas anchas, portada a la izquierda y formulario a la derecha */}
        <View style={[styles.cover, wide ? styles.coverWide : styles.centered]}>
          <Reveal index={0}><Text style={[styles.kicker, !wide && styles.textCenter]}>/Producción/</Text></Reveal>
          <Reveal index={1}><Text style={[styles.coverTitle, !wide && styles.textCenter]}>Portal de producción</Text></Reveal>
          <Reveal index={2} style={!wide && styles.fullWidth}>
            <Image source={brandAssets.logoOutline} style={[styles.outline, wide ? styles.outlineWide : styles.outlineCentered]} contentFit="contain" contentPosition={wide ? 'left' : 'center'} accessibilityLabel="Encuadre" />
          </Reveal>
          <Reveal index={3}><Text style={[styles.tagline, !wide && styles.textCenter]}>{brand.tagline}.</Text></Reveal>
        </View>

        <Reveal index={4} style={[styles.card, wide ? styles.cardWide : styles.cardCentered]}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {showMfa ? (
            <View style={styles.form}>
              <Text style={[styles.formTitle, !wide && styles.textCenter]}>Verificación en dos pasos</Text>
              <Text style={[styles.formText, !wide && styles.textCenter]}>Te enviamos un código a tu correo.</Text>
              <EncInput
                label="Código de verificación"
                value={mfaCode}
                onChangeText={setMfaCode}
                placeholder="123456"
                keyboardType="number-pad"
                autoCapitalize="none"
                corner="lead"
              />
              <ActionButton label="Verificar código" onPress={handleVerifyMfa} loading={loading} variant="filled" icon="check" style={styles.loginBtn} />
              <ActionButton label="Volver" onPress={() => setShowMfa(false)} variant="text" />
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={[styles.formTitle, !wide && styles.textCenter]}>Iniciar sesión</Text>
              <EncInput
                label="Correo"
                value={email}
                onChangeText={setEmail}
                placeholder="tu@correo.cl"
                keyboardType="email-address"
                autoCapitalize="none"
                corner="lead"
              />
              <EncInput
                label="Contraseña"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
                onSubmitEditing={handleLogin}
              />
              <ActionButton label="Entrar" onPress={handleLogin} loading={loading} variant="filled" icon="arrow-right" style={styles.loginBtn} />
            </View>
          )}
          <Text style={[styles.footerText, !wide && styles.textCenter]}>{brand.footer}</Text>
        </Reveal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.xl },
  scrollWide: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 96, gap: 64 },
  cover: { gap: spacing.sm },
  centered: { alignItems: 'center' },
  textCenter: { textAlign: 'center' },
  fullWidth: { width: '100%', alignItems: 'center' },
  outlineCentered: { alignSelf: 'center' },
  cardCentered: { alignSelf: 'center' },
  coverWide: { flex: 1.3 },
  kicker: { ...typography.labelLarge, fontWeight: '700', color: colors.onSurfaceVariant },
  coverTitle: { ...typography.headlineSmall, fontWeight: '800', color: colors.onSurfaceVariant },
  outline: { width: '100%', maxWidth: 360, aspectRatio: 5, marginVertical: spacing.sm },
  outlineWide: { maxWidth: 620 },
  tagline: { ...typography.titleLarge, fontWeight: '600', color: colors.onSurfaceVariant },
  card: {
    width: '100%', maxWidth: 440, alignSelf: 'flex-start',
    padding: spacing.lg, gap: spacing.base,
    backgroundColor: 'rgba(10, 10, 14, 0.72)', borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.18)',
    ...corners.card,
    ...Platform.select({ web: { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any }),
  },
  cardWide: { flex: 1, alignSelf: 'auto' },
  form: { gap: spacing.base },
  formTitle: { ...typography.headlineSmall, fontWeight: '900', color: colors.onSurface },
  formText: { ...typography.bodyMedium, color: colors.onSurfaceVariant },
  loginBtn: { height: 48, marginTop: spacing.xs },
  errorContainer: { backgroundColor: 'rgba(255, 179, 192, 0.12)', borderWidth: 1.5, borderColor: colors.error, ...corners.chip, padding: spacing.md },
  errorText: { ...typography.bodyMedium, color: colors.error },
  footerText: { ...typography.bodySmall, color: colors.onSurfaceVariant, marginTop: spacing.sm },
});
