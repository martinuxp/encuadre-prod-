// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Ajustes del Portal
// Perfil del administrador e información del sistema
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { brand } from '@/constants/brand';
import { AppShell } from '@/components/m3/AppShell';
import { InfoCard } from '@/components/m3/InfoCard';
import { ActionButton } from '@/components/m3/ActionButton';
import { AvatarBadge } from '@/components/m3/AvatarBadge';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <AppShell title="Ajustes del Portal" showBack>
      <View style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Perfil de Administrador</Text>
          <InfoCard title="" style={styles.profileCard}>
            <View style={styles.profileContent}>
              <AvatarBadge name={user?.fullName || 'Administrador'} size={64} />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{user?.fullName || 'Administrador'}</Text>
                <Text style={styles.profileEmail}>
                  {user?.primaryEmailAddress?.emailAddress || 'admin@encuadre.cl'}
                </Text>
                <Text style={styles.profileRole}>Rol: Productor Ejecutivo</Text>
              </View>
            </View>
          </InfoCard>
          <ActionButton
            label="Editar Perfil"
            variant="tonal"
            icon="account-edit-outline"
            onPress={() => router.push('/(admin)/edit-profile')}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de la Plataforma</Text>
          <InfoCard title={brand.companyFull} subtitle={brand.footer} style={styles.infoCard}>
            <View style={styles.systemDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Versión del Portal</Text>
                <Text style={styles.detailValue}>v1.0.0 (Production)</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Framework</Text>
                <Text style={styles.detailValue}>Expo SDK 57 (Expo Router)</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Base de Datos</Text>
                <Text style={styles.detailValue}>Firebase Firestore</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Autenticación</Text>
                <Text style={styles.detailValue}>Clerk Auth</Text>
              </View>
            </View>
          </InfoCard>
        </View>

        <View style={styles.actions}>
          <ActionButton
            label="Cerrar Sesión"
            variant="filled"
            icon="logout"
            onPress={handleLogout}
            style={styles.logoutBtn}
            labelStyle={{ color: colors.onError }}
          />
        </View>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  section: {
    gap: spacing.base,
  },
  sectionTitle: {
    ...typography.titleLarge,
    color: colors.onSurface,
    fontWeight: 'bold',
  },
  profileCard: {
    backgroundColor: colors.surfaceContainer,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
  },
  profileInfo: {
    marginLeft: spacing.base,
    gap: spacing.xs,
  },
  profileName: {
    ...typography.titleLarge,
    color: colors.onSurface,
    fontWeight: 'bold',
  },
  profileEmail: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
  },
  profileRole: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: colors.surfaceContainer,
  },
  systemDetails: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    paddingBottom: spacing.xs,
  },
  detailLabel: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
  },
  detailValue: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    fontWeight: '600',
  },
  actions: {
    marginTop: spacing.base,
    alignItems: 'flex-start',
  },
  logoutBtn: {
    backgroundColor: colors.error,
    height: 44,
  },
});
