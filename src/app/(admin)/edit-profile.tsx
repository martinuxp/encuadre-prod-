// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Edición de Perfil de Administrador
// Actualiza nombre, foto de perfil y datos del usuario en Clerk
// ═══════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppShell } from '@/components/m3/AppShell';
import { ActionButton } from '@/components/m3/ActionButton';
import { AvatarBadge } from '@/components/m3/AvatarBadge';
import { colors, typography, shapes, spacing } from '@/theme/tokens';

// ── Definición de campos del formulario ─────────────────
type Field = {
  label: string;
  key: string;
  placeholder: string;
  keyboard?: 'default' | 'email-address' | 'phone-pad';
  multiline?: boolean;
};

const PROFILE_FIELDS: Field[] = [
  { label: 'Nombre', key: 'firstName', placeholder: 'Ej. Rodrigo' },
  { label: 'Apellido', key: 'lastName', placeholder: 'Ej. Morales' },
  {
    label: 'Cargo / Rol en la producción',
    key: 'unsafeMetadata_role',
    placeholder: 'Ej. Director, Productor Ejecutivo',
  },
  {
    label: 'Empresa / Casa productora',
    key: 'unsafeMetadata_company',
    placeholder: 'Ej. Encuadre Producciones',
  },
  {
    label: 'Teléfono de contacto',
    key: 'unsafeMetadata_phone',
    placeholder: '+56 9 1234 5678',
    keyboard: 'phone-pad',
  },
  {
    label: 'Instagram',
    key: 'unsafeMetadata_instagram',
    placeholder: 'usuario_sin_arroba',
  },
  {
    label: 'Bio / Descripción corta',
    key: 'unsafeMetadata_bio',
    placeholder: 'Cuéntanos sobre ti y tu trabajo en producción...',
    multiline: true,
  },
];

// ── Pantalla ─────────────────────────────────────────────
export default function EditProfileScreen() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [form, setForm] = useState<Record<string, string>>({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    unsafeMetadata_role: (user?.unsafeMetadata?.role as string) ?? '',
    unsafeMetadata_company: (user?.unsafeMetadata?.company as string) ?? '',
    unsafeMetadata_phone: (user?.unsafeMetadata?.phone as string) ?? '',
    unsafeMetadata_instagram: (user?.unsafeMetadata?.instagram as string) ?? '',
    unsafeMetadata_bio: (user?.unsafeMetadata?.bio as string) ?? '',
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: string, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const updatePayload: Record<string, string> = {};
      if (form.firstName.trim()) updatePayload.firstName = form.firstName.trim();
      if (form.lastName.trim()) updatePayload.lastName = form.lastName.trim();

      const meta: Record<string, string> = {};
      if (form.unsafeMetadata_role.trim()) meta.role = form.unsafeMetadata_role.trim();
      if (form.unsafeMetadata_company.trim()) meta.company = form.unsafeMetadata_company.trim();
      if (form.unsafeMetadata_phone.trim()) meta.phone = form.unsafeMetadata_phone.trim();
      if (form.unsafeMetadata_instagram.trim())
        meta.instagram = form.unsafeMetadata_instagram.trim().replace(/^@/, '');
      if (form.unsafeMetadata_bio.trim()) meta.bio = form.unsafeMetadata_bio.trim();

      await user.update({
        ...updatePayload,
        unsafeMetadata: {
          ...((user.unsafeMetadata as Record<string, unknown>) ?? {}),
          ...meta,
        },
      } as Parameters<typeof user.update>[0]);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el perfil.');
    } finally {
      setSaving(false);
    }
  }, [user, form]);

  if (!isLoaded) {
    return (
      <AppShell title="Editar Perfil" showBack>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </AppShell>
    );
  }

  const displayName = `${form.firstName} ${form.lastName}`.trim() || 'Sin nombre';

  return (
    <AppShell title="Editar Perfil" showBack>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar header */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            <AvatarBadge name={displayName} size={88} badgeColor={colors.primary} />
            <Pressable
              style={styles.avatarEditBadge}
              accessibilityLabel="Cambiar foto de perfil"
            >
              <MaterialCommunityIcons
                name="camera-plus-outline"
                size={16}
                color={colors.onPrimary}
              />
            </Pressable>
          </View>
          <Text style={styles.avatarName}>{displayName}</Text>
          <Text style={styles.avatarEmail}>
            {user?.primaryEmailAddress?.emailAddress ?? ''}
          </Text>
        </View>

        {/* Alertas de feedback */}
        {error ? (
          <View style={styles.alertBox}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={18}
              color={colors.error}
            />
            <Text style={styles.alertText}>{error}</Text>
          </View>
        ) : null}
        {saveSuccess ? (
          <View style={[styles.alertBox, styles.alertSuccess]}>
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={18}
              color={colors.success}
            />
            <Text style={[styles.alertText, { color: colors.success }]}>
              Perfil actualizado correctamente.
            </Text>
          </View>
        ) : null}

        {/* Sección: Información personal */}
        <View style={styles.formCard}>
          <Text style={styles.formSectionLabel}>Información Personal</Text>

          {PROFILE_FIELDS.map((field) => (
            <View key={field.key} style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{field.label}</Text>

              {field.key === 'unsafeMetadata_instagram' ? (
                <View style={styles.inputWithPrefix}>
                  <Text style={styles.prefix}>@</Text>
                  <TextInput
                    value={form[field.key]}
                    onChangeText={(v) => set(field.key, v.replace(/^@/, ''))}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.onSurfaceAlpha38}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[
                      styles.input,
                      styles.inputFlex,
                      Platform.OS === 'web' && ({ outlineStyle: 'none' } as object),
                    ]}
                  />
                </View>
              ) : (
                <TextInput
                  value={form[field.key]}
                  onChangeText={(v) => set(field.key, v)}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.onSurfaceAlpha38}
                  keyboardType={field.keyboard ?? 'default'}
                  autoCapitalize={
                    field.keyboard === 'email-address' || field.keyboard === 'phone-pad'
                      ? 'none'
                      : 'sentences'
                  }
                  multiline={field.multiline}
                  numberOfLines={field.multiline ? 3 : 1}
                  style={[
                    styles.input,
                    field.multiline && styles.inputMultiline,
                    Platform.OS === 'web' && ({ outlineStyle: 'none' } as object),
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        {/* Sección: Cuenta (email read-only) */}
        <View style={styles.formCard}>
          <Text style={styles.formSectionLabel}>Cuenta</Text>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Correo electrónico</Text>
            <View style={styles.readOnlyRow}>
              <MaterialCommunityIcons
                name="email-outline"
                size={16}
                color={colors.onSurfaceVariant}
              />
              <Text style={styles.readOnlyText}>
                {user?.primaryEmailAddress?.emailAddress ?? '—'}
              </Text>
              <View style={styles.lockedBadge}>
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={12}
                  color={colors.onSurfaceVariant}
                />
                <Text style={styles.lockedText}>No editable</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Botones de acción */}
        <View style={styles.actions}>
          <ActionButton
            label={saving ? 'Guardando...' : saveSuccess ? 'Guardado' : 'Guardar cambios'}
            variant="filled"
            icon={saving ? undefined : saveSuccess ? 'check' : 'content-save-outline'}
            onPress={handleSave}
            style={[styles.saveBtn, saveSuccess && { backgroundColor: colors.success }]}
            disabled={saving}
          />
          <ActionButton
            label="Cancelar"
            variant="text"
            onPress={() => router.back()}
          />
        </View>
      </ScrollView>
    </AppShell>
  );
}

// ── Estilos ───────────────────────────────────────────────
const styles = StyleSheet.create({
  scrollContent: {
    gap: spacing.xl,
    paddingBottom: spacing['2xl'],
    maxWidth: 620,
    alignSelf: 'center',
    width: '100%',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  avatarName: {
    ...typography.headlineSmall,
    color: colors.onSurface,
    fontWeight: 'bold',
  },
  avatarEmail: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
  },

  // Alertas
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(186,26,26,0.08)',
    borderRadius: shapes.small,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(186,26,26,0.25)',
  },
  alertSuccess: {
    backgroundColor: 'rgba(16,124,60,0.08)',
    borderColor: 'rgba(16,124,60,0.25)',
  },
  alertText: {
    ...typography.bodyMedium,
    color: colors.error,
    flex: 1,
  },

  // Cards
  formCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: shapes.medium,
    padding: spacing.xl,
    gap: spacing.base,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  formSectionLabel: {
    ...typography.labelLarge,
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },

  // Fields
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabel: {
    ...typography.labelMedium,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  input: {
    height: 44,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: shapes.small,
    paddingHorizontal: spacing.base,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...typography.bodyMedium,
  },
  inputMultiline: {
    height: 88,
    paddingTop: spacing.sm,
    textAlignVertical: 'top',
  },
  inputFlex: {
    flex: 1,
    borderLeftWidth: 0,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  inputWithPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: shapes.small,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },
  prefix: {
    paddingHorizontal: spacing.sm,
    color: colors.onSurfaceVariant,
    ...typography.bodyMedium,
    fontWeight: '600',
  },

  // Read-only
  readOnlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: shapes.small,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  readOnlyText: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surfaceContainer,
    borderRadius: shapes.extraSmall,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  lockedText: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
  },

  // Actions
  actions: {
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  saveBtn: {
    minWidth: 200,
    height: 48,
  },
});
