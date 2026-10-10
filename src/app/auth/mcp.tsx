import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActionButton } from '@/components/m3/ActionButton';
import { colors, spacing, typography } from '@/theme/tokens';
import { brand } from '@/constants/brand';

const configuredApiBase = process.env.EXPO_PUBLIC_APP_URL || '';
const apiBase = configuredApiBase ? `${configuredApiBase.startsWith('http') ? configuredApiBase : `https://${configuredApiBase}`}`.replace(/\/+$/, '') : '';

export default function McpAuthorizationScreen() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { request } = useLocalSearchParams<{ request?: string }>();
  const router = useRouter();
  const [status, setStatus] = useState('Verificando conexión con ChatGPT…');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !request) return;
    if (!isSignedIn) {
      const redirect = `/auth/mcp?request=${encodeURIComponent(String(request))}`;
      router.replace(`/(auth)/login?redirect=${encodeURIComponent(redirect)}` as never);
      return;
    }
    setStatus('ChatGPT solicita acceso temporal a Producción de Encuadre para consultar y gestionar información. La conexión vence en 30 minutos; cada cambio, subida o eliminación requerirá una aprobación adicional.');
  }, [isLoaded, isSignedIn, request]);

  const approve = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${apiBase}/api/mcp/authorize/${encodeURIComponent(String(request))}/approve`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'No fue posible aprobar la conexión.');
      setStatus('Conexión aprobada. Volviendo a ChatGPT…');
      if (typeof window !== 'undefined') window.location.assign(payload.data.redirectUrl);
    } catch (err) { setError(err instanceof Error ? err.message : 'No fue posible aprobar la conexión.'); }
  };

  if (!request) return <Centered text="Solicitud de conexión inválida." />;
  return <View style={styles.container}><View style={styles.card}><Text style={styles.title}>{brand.appTitleMedium}</Text><Text style={styles.subtitle}>Conectar ChatGPT</Text><Text style={styles.body}>{error || status}</Text>{!error && !status.includes('aprobada') && <ActionButton label="Aprobar conexión" onPress={approve} variant="filled" />}{error && <ActionButton label="Volver al inicio" onPress={() => router.replace('/')} variant="outlined" />}</View></View>;
}

function Centered({ text }: { text: string }) { return <View style={styles.container}><Text style={styles.body}>{text}</Text></View>; }

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: spacing.lg },
  card: { width: '100%', maxWidth: 520, padding: spacing.xl, borderRadius: 24, backgroundColor: colors.surfaceContainerLow, gap: spacing.base },
  title: { ...typography.headlineSmall, color: colors.primary, fontWeight: '700' },
  subtitle: { ...typography.titleLarge, color: colors.onSurface },
  body: { ...typography.bodyLarge, color: colors.onSurface, lineHeight: 24 },
});
