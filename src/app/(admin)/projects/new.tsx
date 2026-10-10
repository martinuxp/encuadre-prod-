// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Crear Proyecto
// Formulario de creación de nuevos proyectos audiovisuales
// ═══════════════════════════════════════════════════════

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Platform, ScrollView } from 'react-native';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { AppShell } from '@/components/m3/AppShell';
import { ActionButton } from '@/components/m3/ActionButton';
import { InfoCard } from '@/components/m3/InfoCard';
import { projectService } from '@/services/firebase/projectService';
import { activityService } from '@/services/firebase/activityService';
import { ProductionType, ProjectStatus } from '@/types';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';

export default function NewProjectScreen() {
  const router = useRouter();
  const { user } = useUser();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ProductionType>('commercial');
  const [status, setStatus] = useState<ProjectStatus>('pre_production');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('El nombre del proyecto es obligatorio.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const creatorId = user?.id || 'admin_user';
      const creatorName = user?.fullName || 'Administrador';

      const projectId = await projectService.createProject({
        name,
        description,
        type,
        status,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : undefined,
        tags: [],
        responsibleId: creatorId,
        metadata: {},
      }, creatorId);

      // Registrar actividad
      await activityService.logActivity(
        projectId,
        'project',
        projectId,
        'creó el proyecto',
        creatorId,
        creatorName,
        { name, type }
      );

      router.replace(`/projects/${projectId}`);
    } catch (e: any) {
      console.error('Error al crear proyecto:', e);
      setError(e.message || 'Ocurrió un error al intentar crear el proyecto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Crear Proyecto" showBack>
      <ScrollView contentContainerStyle={styles.container}>
        <InfoCard title="Nuevo Proyecto Audiovisual" subtitle="Configura los detalles generales del rodaje" style={styles.card}>
          
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre del proyecto *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ej. Comercial Primavera 2026"
                placeholderTextColor={colors.onSurfaceAlpha38}
                style={[
                  styles.input,
                  Platform.OS === 'web' && { outlineStyle: 'none' } as any,
                ]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Descripción / Sinopsis</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Escribe detalles del proyecto, locaciones principales..."
                placeholderTextColor={colors.onSurfaceAlpha38}
                multiline
                numberOfLines={4}
                style={[
                  styles.input,
                  styles.textarea,
                  Platform.OS === 'web' && { outlineStyle: 'none' } as any,
                ]}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Tipo de producción</Text>
                {Platform.OS === 'web' ? (
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as ProductionType)}
                    style={webSelectStyle}
                  >
                    <option value="commercial">Comercial</option>
                    <option value="film">Película / Largometraje</option>
                    <option value="tv">Serie / TV</option>
                    <option value="music_video">Videoclip</option>
                    <option value="photography">Fotografía</option>
                    <option value="documentary">Documental</option>
                    <option value="corporate">Corporativo</option>
                    <option value="other">Otro</option>
                  </select>
                ) : (
                  <TextInput
                    value={type}
                    onChangeText={(val) => setType(val as ProductionType)}
                    style={styles.input}
                  />
                )}
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Estado inicial</Text>
                {Platform.OS === 'web' ? (
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                    style={webSelectStyle}
                  >
                    <option value="draft">Borrador</option>
                    <option value="pre_production">Pre-Producción</option>
                    <option value="production">En Rodaje (Producción)</option>
                    <option value="post_production">Post-Producción</option>
                  </select>
                ) : (
                  <TextInput
                    value={status}
                    onChangeText={(val) => setStatus(val as ProjectStatus)}
                    style={styles.input}
                  />
                )}
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Fecha de inicio</Text>
                <TextInput
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.onSurfaceAlpha38}
                  style={[
                    styles.input,
                    Platform.OS === 'web' && { outlineStyle: 'none' } as any,
                  ]}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Fecha de término (Opcional)</Text>
                <TextInput
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.onSurfaceAlpha38}
                  style={[
                    styles.input,
                    Platform.OS === 'web' && { outlineStyle: 'none' } as any,
                  ]}
                />
              </View>
            </View>

            <View style={styles.actions}>
              <ActionButton
                label="Cancelar"
                variant="outlined"
                onPress={() => router.back()}
                style={styles.btn}
              />
              <ActionButton
                label="Guardar Proyecto"
                variant="filled"
                icon="check"
                onPress={handleSubmit}
                loading={loading}
                style={styles.btn}
              />
            </View>
          </View>
        </InfoCard>
      </ScrollView>
    </AppShell>
  );
}

// Estilo CSS inline para el select nativo de web en modo oscuro
const webSelectStyle: any = {
  height: '48px',
  backgroundColor: colors.surfaceContainer,
  borderRadius: '8px',
  paddingLeft: '16px',
  paddingRight: '16px',
  color: colors.onSurface,
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: colors.outlineVariant,
  outlineStyle: 'none',
  fontSize: '16px',
  fontFamily: 'Inter, sans-serif',
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 600,
    padding: spacing.base,
    backgroundColor: colors.surfaceContainerLow,
  },
  form: {
    gap: spacing.base,
    marginTop: spacing.base,
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
  textarea: {
    height: 100,
    paddingVertical: spacing.sm,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.base,
    flexWrap: 'wrap',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    paddingTop: spacing.base,
  },
  btn: {
    height: 40,
    minWidth: 120,
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
});
