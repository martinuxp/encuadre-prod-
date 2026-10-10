import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActionButton } from '@/components/m3/ActionButton';
import { colors, spacing, typography } from '@/theme/tokens';
import { brand } from '@/constants/brand';

const configuredApiBase = process.env.EXPO_PUBLIC_APP_URL || '';
const apiBase = configuredApiBase ? `${configuredApiBase.startsWith('http') ? configuredApiBase : `https://${configuredApiBase}`}`.replace(/\/+$/, '') : '';

export default function McpOperationAuthorizationScreen() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { request } = useLocalSearchParams<{ request?: string }>();
  const router = useRouter();
  const [status, setStatus] = useState('Verificando autorización…');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !request) return;
    if (!isSignedIn) {
      const redirect = `/auth/mcp-operation?request=${encodeURIComponent(String(request))}`;
      router.replace(`/(auth)/login?redirect=${encodeURIComponent(redirect)}` as never);
      return;
    }
    setStatus('Un agente solicita ejecutar una operación de escritura en Producción de Encuadre. Apruébala solo si reconoces esta acción.');
  }, [isLoaded, isSignedIn, request]);

  const approve = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${apiBase}/api/mcp/operations/${encodeURIComponent(String(request))}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'No fue posible aprobar la operación.');
      setStatus(`Operación autorizada hasta las ${new Date(payload.data.expiresAt).toLocaleTimeString()}. Vuelve a ChatGPT y reintenta la misma acción.`);
    } catch (err) { setError(err instanceof Error ? err.message : 'No fue posible aprobar la operación.'); }
  };

  if (!request) return <Centered text="Solicitud de autorización inválida." />;
  const approved = status.includes('autorizada');
  return <View style={styles.container}><View style={styles.card}><Text style={styles.title}>{brand.appTitleMedium}</Text><Text style={styles.subtitle}>Autorizar operación</Text><Text style={styles.body}>{error || status}</Text>{!error && !approved && <ActionButton label="Autorizar operación" onPress={approve} variant="filled" />}{approved && <Text style={styles.hint}>No compartas este enlace ni datos de sesión.</Text>}{error && <ActionButton label="Volver al inicio" onPress={() => router.replace('/')} variant="outlined" />}</View></View>;
}

function Centered({ text }: { text: string }) { return <View style={styles.container}><Text style={styles.body}>{text}</Text></View>; }

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: spacing.lg },
  card: { width: '100%', maxWidth: 520, padding: spacing.xl, borderRadius: 24, backgroundColor: colors.surfaceContainerLow, gap: spacing.base },
  title: { ...typography.headlineSmall, color: colors.primary, fontWeight: '700' },
  subtitle: { ...typography.titleLarge, color: colors.onSurface },
  body: { ...typography.bodyLarge, color: colors.onSurface, lineHeight: 24 },
  hint: { ...typography.bodyMedium, color: colors.onSurfaceVariant },
});
