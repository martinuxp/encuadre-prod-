// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Vista Pública del Participante
// Acceso sin login. URL: /call/[token]
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Pressable, Image, Linking, Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { brand, brandAssets } from '@/constants/brand';
import { LoadingState } from '@/components/m3/LoadingState';
import { ErrorState } from '@/components/m3/ErrorState';
import { ActionButton } from '@/components/m3/ActionButton';
import { StatusChip } from '@/components/m3/StatusChip';
import { callSheetService } from '@/services/firebase/callSheetService';
import { CallSheetAccess } from '@/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// ─── Sección de información ───────────────────────────────────────────────────

interface InfoRowProps {
  icon: any;
  label: string;
  value: string;
  accent?: boolean;
}

const InfoRow: React.FC<InfoRowProps> = ({ icon, label, value, accent }) => (
  <View style={infoRowStyles.container}>
    <View style={infoRowStyles.iconContainer}>
      <MaterialCommunityIcons name={icon} size={20} color={accent ? colors.primary : colors.onSurfaceVariant} />
    </View>
    <View style={infoRowStyles.textContainer}>
      <Text style={infoRowStyles.label}>{label}</Text>
      <Text style={[infoRowStyles.value, accent && infoRowStyles.valueAccent]}>{value || '—'}</Text>
    </View>
  </View>
);

const infoRowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: shapes.medium, padding: spacing.base,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  iconContainer: {
    width: 36, height: 36, borderRadius: shapes.medium,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.base,
  },
  textContainer: { flex: 1 },
  label: { ...typography.labelSmall, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { ...typography.bodyLarge, color: colors.onSurface, fontWeight: '600', marginTop: 2 },
  valueAccent: { color: colors.primary },
});

// ─── Pantalla Principal ───────────────────────────────────────────────────────

export default function ParticipantCallScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();

  const [callSheet, setCallSheet] = useState<CallSheetAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const loadCallSheet = useCallback(async () => {
    if (!token) {
      setError('El link de llamado no es válido.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await callSheetService.getCallSheetByToken(token as string);

      if (!data) {
        setError('Este llamado no existe o el link es inválido.');
        return;
      }
      if (!data.isActive) {
        setError('Este llamado ha sido desactivado por el equipo de producción.');
        return;
      }
      if (data.expiresAt && new Date() > data.expiresAt) {
        setError('Este llamado ha expirado.');
        return;
      }

      setCallSheet(data);
      setConfirmed(data.status === 'confirmed');

      await callSheetService.incrementViewCount(data.projectId, data.id, data.viewCount);
    } catch (e: any) {
      setError(e.message || 'No se pudo cargar el llamado. Verifica el link.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadCallSheet();
  }, [loadCallSheet]);

  const handleConfirm = async () => {
    if (!callSheet) return;
    setConfirming(true);
    try {
      await callSheetService.confirmAttendance(callSheet.projectId, callSheet.id);
      setConfirmed(true);
      setCallSheet({ ...callSheet, status: 'confirmed' });
    } catch (e: any) {
      setError(e.message || 'Error al confirmar asistencia.');
    } finally {
      setConfirming(false);
    }
  };

  const handleOpenMap = () => {
    if (!callSheet?.location?.address) return;
    const address = encodeURIComponent(callSheet.location.address);
    const url = Platform.OS === 'ios'
      ? `maps://?q=${address}`
      : `https://maps.google.com/?q=${address}`;
    Linking.openURL(url);
  };

  const handleCallContact = () => {
    if (!callSheet?.productionContact?.phone) return;
    Linking.openURL(`tel:${callSheet.productionContact.phone}`);
  };

  const formatDate = (d?: Date): string => {
    if (!d) return '—';
    return d.toLocaleDateString('es-CL', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  };

  // ─── Estados de Carga/Error ───────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.fullPage}>
        <LoadingState message="Cargando tu llamado de producción..." fullScreen />
      </View>
    );
  }

  if (error || !callSheet) {
    return (
      <View style={styles.fullPage}>
        <View style={styles.brandHeader}>
          <Image source={brandAssets.logoSvg} style={styles.logo} resizeMode="contain" />
        </View>
        <ErrorState
          error={error || 'Llamado no encontrado.'}
          onRetry={loadCallSheet}
          style={styles.errorState}
        />
      </View>
    );
  }

  // ─── Vista del Llamado ───────────────────────────────────────────────────

  const isConfirmed = callSheet.status === 'confirmed';
  const isCancelled = callSheet.status === 'cancelled';

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      {/* ── Header con Brand ── */}
      <View style={styles.brandHeader}>
        <Image
          source={brandAssets.logoSvg}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brandSubtitle}>{brand.companyMedium}</Text>
      </View>

      {/* ── Hero Card: Nombre y Rol ── */}
      <View style={styles.heroCard}>
        <View style={styles.heroIconContainer}>
          <MaterialCommunityIcons
            name={callSheet.participantType === 'talent' ? 'account-star' : 'account-hard-hat'}
            size={40}
            color={colors.onPrimaryContainer}
          />
        </View>
        <Text style={styles.heroTitle}>¡Hola!</Text>
        <Text style={styles.heroRole}>{callSheet.role}</Text>
        <Text style={styles.heroSubtitle}>Este es tu llamado personalizado de producción.</Text>

        {/* Estado de Confirmación */}
        {isConfirmed && (
          <View style={styles.confirmedBadge}>
            <MaterialCommunityIcons name="check-circle" size={18} color={colors.success} />
            <Text style={styles.confirmedBadgeText}>Asistencia Confirmada</Text>
          </View>
        )}
        {isCancelled && (
          <View style={[styles.confirmedBadge, { backgroundColor: 'rgba(255,180,171,0.15)' }]}>
            <MaterialCommunityIcons name="close-circle" size={18} color={colors.error} />
            <Text style={[styles.confirmedBadgeText, { color: colors.error }]}>Llamado Cancelado</Text>
          </View>
        )}
      </View>

      {/* ── Datos del Llamado ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 Tu Llamado</Text>
        <View style={styles.infoGrid}>
          <InfoRow
            icon="calendar-star"
            label="Fecha de Rodaje"
            value={formatDate(callSheet.callDate)}
            accent
          />
          <InfoRow
            icon="clock-alert"
            label="Hora de Llamado"
            value={callSheet.callTime}
            accent
          />
          {callSheet.arrivalTime && callSheet.arrivalTime !== callSheet.callTime && (
            <InfoRow
              icon="clock-in"
              label="Hora de Llegada"
              value={callSheet.arrivalTime}
            />
          )}
          <InfoRow
            icon="clapperboard"
            label="Tu Rol / Cargo"
            value={callSheet.role}
          />
          {callSheet.costume && (
            <InfoRow
              icon="hanger"
              label="Vestuario"
              value={callSheet.costume}
            />
          )}
        </View>
      </View>

      {/* ── Locación ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 Locación del Rodaje</Text>
        <View style={styles.infoGrid}>
          <InfoRow
            icon="map-marker"
            label="Set / Locación"
            value={callSheet.location.name}
            accent
          />
          <InfoRow
            icon="home-map-marker"
            label="Dirección"
            value={callSheet.location.address}
          />
        </View>

        {callSheet.location.address && (
          <Pressable onPress={handleOpenMap} style={styles.mapButton}>
            <MaterialCommunityIcons name="google-maps" size={18} color={colors.primary} />
            <Text style={styles.mapButtonText}>Abrir en Google Maps</Text>
          </Pressable>
        )}
      </View>

      {/* ── Instrucciones ── */}
      {callSheet.instructions ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Instrucciones</Text>
          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsText}>{callSheet.instructions}</Text>
          </View>
        </View>
      ) : null}

      {/* ── Contacto de Producción ── */}
      {callSheet.productionContact?.name ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📞 Contacto de Producción</Text>
          <View style={styles.contactCard}>
            <View style={styles.contactAvatar}>
              <MaterialCommunityIcons name="headset" size={24} color={colors.onPrimaryContainer} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{callSheet.productionContact.name}</Text>
              {callSheet.productionContact.phone && (
                <Text style={styles.contactPhone}>{callSheet.productionContact.phone}</Text>
              )}
            </View>
            {callSheet.productionContact.phone && (
              <Pressable onPress={handleCallContact} style={styles.callBtn}>
                <MaterialCommunityIcons name="phone" size={20} color={colors.onPrimary} />
              </Pressable>
            )}
          </View>
        </View>
      ) : null}

      {/* ── Botón de Confirmación ── */}
      {!isCancelled && (
        <View style={styles.confirmSection}>
          {isConfirmed ? (
            <View style={styles.confirmedMessage}>
              <MaterialCommunityIcons name="check-circle" size={32} color={colors.success} />
              <Text style={styles.confirmedMessageText}>
                ¡Ya confirmaste tu asistencia! Nos vemos el {formatDate(callSheet.callDate)}.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.confirmInstructions}>
                Por favor confirma tu asistencia para que el equipo de producción pueda organizar mejor la jornada.
              </Text>
              <ActionButton
                label="✅ Confirmar mi Asistencia"
                onPress={handleConfirm}
                loading={confirming}
                variant="filled"
                style={styles.confirmBtn}
              />
            </>
          )}
        </View>
      )}

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>{brand.footer}</Text>
        <Text style={styles.footerSubtext}>
          Este llamado fue generado especialmente para ti. No lo compartas.
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fullPage: {
    flex: 1, backgroundColor: colors.background,
  },
  page: {
    flex: 1, backgroundColor: colors.background,
  },
  pageContent: {
    maxWidth: 640, alignSelf: 'center', width: '100%',
    paddingHorizontal: spacing.base, paddingBottom: spacing['3xl'],
  },

  // Brand Header
  brandHeader: {
    alignItems: 'center', paddingTop: spacing.xl,
    paddingBottom: spacing.base, gap: spacing.xs,
  },
  logo: {
    width: 180, height: 44,
    ...Platform.select({ web: { filter: 'brightness(0) invert(1)' } as any }),
  },
  brandSubtitle: { ...typography.labelMedium, color: colors.onSurfaceVariant },

  // Hero Card
  heroCard: {
    alignItems: 'center', backgroundColor: colors.primaryContainer,
    borderRadius: shapes.extraLarge, padding: spacing.xl,
    marginBottom: spacing.lg, gap: spacing.sm,
  },
  heroIconContainer: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { ...typography.displaySmall, color: colors.onPrimaryContainer, fontWeight: 'bold' },
  heroRole: { ...typography.titleLarge, color: colors.onPrimaryContainer, fontWeight: 'bold' },
  heroSubtitle: { ...typography.bodyMedium, color: colors.onPrimaryContainer, textAlign: 'center', opacity: 0.8 },
  confirmedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: 'rgba(129,199,132,0.15)', borderRadius: shapes.full,
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm, marginTop: spacing.xs,
  },
  confirmedBadgeText: { ...typography.labelLarge, color: colors.success, fontWeight: 'bold' },

  // Sections
  section: { gap: spacing.sm, marginBottom: spacing.lg },
  sectionTitle: { ...typography.titleMedium, color: colors.onSurface, fontWeight: 'bold' },
  infoGrid: { gap: spacing.sm },

  // Map button
  mapButton: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow, borderRadius: shapes.small,
    padding: spacing.sm, borderWidth: 1, borderColor: colors.primary,
    alignSelf: 'flex-start', marginTop: spacing.xs,
  },
  mapButtonText: { ...typography.labelLarge, color: colors.primary },

  // Instructions
  instructionsBox: {
    backgroundColor: colors.surfaceContainerLow, borderRadius: shapes.medium,
    padding: spacing.base, borderWidth: 1, borderColor: colors.outlineVariant,
    borderLeftWidth: 4, borderLeftColor: colors.primary,
  },
  instructionsText: { ...typography.bodyMedium, color: colors.onSurface, lineHeight: 22 },

  // Contact
  contactCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: shapes.medium, padding: spacing.base,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  contactAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.base,
  },
  contactInfo: { flex: 1 },
  contactName: { ...typography.titleSmall, color: colors.onSurface, fontWeight: 'bold' },
  contactPhone: { ...typography.bodyMedium, color: colors.onSurfaceVariant, marginTop: 2 },
  callBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },

  // Confirm section
  confirmSection: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: shapes.extraLarge, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.outlineVariant,
    alignItems: 'center', gap: spacing.base, marginBottom: spacing.lg,
  },
  confirmedMessage: { alignItems: 'center', gap: spacing.base },
  confirmedMessageText: {
    ...typography.bodyLarge, color: colors.success, textAlign: 'center', lineHeight: 24,
  },
  confirmInstructions: {
    ...typography.bodyMedium, color: colors.onSurfaceVariant, textAlign: 'center', lineHeight: 20,
  },
  confirmBtn: { width: '100%', height: 52 },

  // Footer
  footer: {
    alignItems: 'center', marginTop: spacing.xl,
    borderTopWidth: 1, borderTopColor: colors.outlineVariant,
    paddingTop: spacing.lg, gap: spacing.xs,
  },
  footerText: { ...typography.bodySmall, color: colors.onSurfaceVariant },
  footerSubtext: { ...typography.bodySmall, color: colors.onSurfaceAlpha38, textAlign: 'center' },

  // Error
  errorState: { margin: spacing.base },
});
