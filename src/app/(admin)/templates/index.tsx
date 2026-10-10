// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Plantillas de Producción
// Templates reutilizables por tipo de producción
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { AppShell } from '@/components/m3/AppShell';
import { InfoCard } from '@/components/m3/InfoCard';
import { ActionButton } from '@/components/m3/ActionButton';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const TEMPLATES = [
  {
    id: 'commercial',
    title: 'Comercial',
    description: 'Estructura estándar para campañas publicitarias: preproducción, rodaje y entrega.',
    icon: 'television-play',
    color: colors.primary,
    includes: ['Call sheets', 'Shooting list', 'Storyboard', 'Budget', 'Crew técnico'],
  },
  {
    id: 'film',
    title: 'Película / Largometraje',
    description: 'Flujo completo de producción cinematográfica con control de versiones de guión.',
    icon: 'movie',
    color: colors.tertiary,
    includes: ['Guión', 'Desglose de escenas', 'Plan de rodaje', 'Elenco y Crew', 'Locaciones'],
  },
  {
    id: 'music_video',
    title: 'Videoclip',
    description: 'Organización rápida para grabaciones musicales de uno o varios días.',
    icon: 'music-note',
    color: colors.secondary,
    includes: ['Director de video', 'DF', 'Artista / Talento', 'Locación', 'Call sheets'],
  },
  {
    id: 'corporate',
    title: 'Corporativo',
    description: 'Videos institucionales, entrevistas y eventos para empresas.',
    icon: 'domain',
    color: colors.success,
    includes: ['Entrevistados', 'Crew mínimo', 'Locación de oficina', 'Post-producción'],
  },
];

export default function TemplatesScreen() {
  const router = useRouter();

  return (
    <AppShell title="Plantillas de Producción">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Plantillas de Proyecto</Text>
          <Text style={styles.subtitle}>
            Crea proyectos nuevos a partir de estructuras predefinidas por tipo de producción.
          </Text>
        </View>

        <View style={styles.grid}>
          {TEMPLATES.map((template) => (
            <View key={template.id} style={styles.templateCard}>
              <View style={[styles.templateIcon, { backgroundColor: template.color + '20' }]}>
                <MaterialCommunityIcons name={template.icon as any} size={32} color={template.color} />
              </View>

              <Text style={styles.templateTitle}>{template.title}</Text>
              <Text style={styles.templateDescription}>{template.description}</Text>

              <View style={styles.includesList}>
                <Text style={styles.includesLabel}>Incluye:</Text>
                {template.includes.map((item) => (
                  <View key={item} style={styles.includeItem}>
                    <MaterialCommunityIcons name="check-circle" size={14} color={template.color} />
                    <Text style={styles.includeText}>{item}</Text>
                  </View>
                ))}
              </View>

              <ActionButton
                label={`Usar Plantilla: ${template.title}`}
                variant="tonal"
                icon="plus"
                onPress={() => router.push(`/projects/new?template=${template.id}`)}
                style={styles.useBtn}
              />
            </View>
          ))}
        </View>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xl },
  header: { gap: spacing.xs },
  title: { ...typography.displaySmall, color: colors.onSurface, fontWeight: 'bold' },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.base },
  templateCard: {
    flexBasis: '45%', flexGrow: 1, minWidth: 280,
    backgroundColor: colors.surfaceContainer,
    borderRadius: shapes.large, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.outlineVariant,
    gap: spacing.base,
  },
  templateIcon: {
    width: 56, height: 56, borderRadius: shapes.medium,
    alignItems: 'center', justifyContent: 'center',
  },
  templateTitle: { ...typography.titleLarge, color: colors.onSurface, fontWeight: 'bold' },
  templateDescription: { ...typography.bodyMedium, color: colors.onSurfaceVariant, lineHeight: 20 },
  includesList: { gap: spacing.xs },
  includesLabel: { ...typography.labelSmall, color: colors.primary, fontWeight: 'bold', textTransform: 'uppercase' },
  includeItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  includeText: { ...typography.bodySmall, color: colors.onSurface },
  useBtn: { alignSelf: 'flex-start' },
});
