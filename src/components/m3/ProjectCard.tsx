// ═══════════════════════════════════════════════════════
// Encuadre Prod. — ProjectCard (Componente MD3)
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Pressable, Animated, Platform } from 'react-native';
import { colors, typography, spacing, corners } from '@/theme/tokens';
import { Project, ProductionType, ProjectStatus } from '@/types';
import { StatusChip, StatusType } from './StatusChip';
import { IconButton } from './IconButton';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePressAnimation, lift } from '@/theme/animation';
import { validateWebDraft } from '@/services/firebase/webService';

type WebState = 'uploaded' | 'private' | 'draft';

/** Estado de la ficha en la web pública: subido, privado (completa pero oculta) o borrador (incompleta) */
const getWebState = (project: Project): WebState | null => {
  const web = project.web;
  if (!web) return null;
  let complete = false;
  try { complete = validateWebDraft(web) === null; } catch { complete = false; }
  if (web.published && complete) return 'uploaded';
  return complete ? 'private' : 'draft';
};

const WEB_TAG: Record<WebState, { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  uploaded: { label: 'Subido', icon: 'earth' },
  private: { label: 'Privado', icon: 'lock-outline' },
  draft: { label: 'Borrador', icon: 'pencil-outline' },
};

interface ProjectCardProps {
  project: Project;
  onPress: () => void;
  onOptions?: () => void;
  style?: ViewStyle;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onPress,
  onOptions,
  style,
}) => {
  const getStatusMapping = (status: ProjectStatus): { label: string; type: StatusType; icon: keyof typeof MaterialCommunityIcons.glyphMap } => {
    switch (status) {
      case 'production':
        return { label: 'EN RODAJE', type: 'info', icon: 'camera-gopro' };
      case 'pre_production':
        return { label: 'PRE-PROD', type: 'warning', icon: 'clipboard-text-clock' };
      case 'post_production':
        return { label: 'POST-PROD', type: 'warning', icon: 'movie-edit' };
      case 'completed':
        return { label: 'FINALIZADO', type: 'success', icon: 'check-circle' };
      case 'archived':
        return { label: 'ARCHIVADO', type: 'default', icon: 'archive' };
      case 'draft':
      default:
        return { label: 'BORRADOR', type: 'default', icon: 'file-document-outline' };
    }
  };

  const getProductionTypeLabel = (type: ProductionType): string => {
    switch (type) {
      case 'film': return 'Película';
      case 'tv': return 'Serie / TV';
      case 'commercial': return 'Comercial';
      case 'music_video': return 'Videoclip';
      case 'photography': return 'Fotografía';
      case 'corporate': return 'Corporativo';
      case 'documentary': return 'Documental';
      case 'other':
      default: return 'Otro';
    }
  };

  const statusInfo = getStatusMapping(project.status);
  const typeLabel = getProductionTypeLabel(project.type);
  const { scaleAnim, pressIn, pressOut } = usePressAnimation(1, 0.97);

  // Paleta croma-adaptativa: si el proyecto tiene ficha web, la tarjeta se tiñe con sus colores
  const tint = project.web?.colors;
  const ink = tint?.ink ?? colors.onSurface;
  const muted = tint ? ink : colors.onSurfaceVariant;
  const webState = getWebState(project);
  // Subido: etiqueta sólida; Privado: con borde; Borrador: translúcida
  const webTag = webState && {
    ...WEB_TAG[webState],
    container: webState === 'uploaded'
      ? { backgroundColor: ink, borderColor: ink }
      : webState === 'private'
        ? { backgroundColor: 'transparent', borderColor: ink }
        : { backgroundColor: tint ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.08)', borderColor: 'transparent' },
    color: webState === 'uploaded' ? (tint?.bg ?? colors.background) : ink,
  };
  
  // Formatear fechas
  const formatDate = (date: any) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date.seconds ? date.seconds * 1000 : date);
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir ${project.web?.title || project.name}${webState ? `, web: ${WEB_TAG[webState].label}` : ''}`}
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={({ pressed }) => [
        styles.card,
        tint && { backgroundColor: tint.bg, borderColor: 'transparent' },
        pressed && styles.pressed,
        Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.inner,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <View style={styles.metaRow}>
              <Text style={[styles.type, { color: muted }]} numberOfLines={1}>{project.web?.kind || typeLabel}</Text>
              {webTag ? (
                <View style={[styles.webTag, webTag.container]} accessibilityLabel={`Web: ${webTag.label}`}>
                  <MaterialCommunityIcons name={webTag.icon} size={12} color={webTag.color} />
                  <Text style={[styles.webTagLabel, { color: webTag.color }]}>{webTag.label}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.name, { color: ink }]} numberOfLines={2}>{project.web?.title || project.name}</Text>
          </View>

          {onOptions && (
            <IconButton
              icon="dots-vertical"
              accessibilityLabel={`Opciones de ${project.name}`}
              iconColor={tint ? ink : undefined}
              variant="standard"
              onPress={onOptions}
              style={styles.optionsBtn}
            />
          )}
        </View>

        <Text style={[styles.description, { color: muted }]} numberOfLines={2}>
          {project.description || 'Sin descripción del proyecto.'}
        </Text>

        <View style={[styles.divider, tint && { backgroundColor: ink, opacity: 0.2 }]} />

        <View style={styles.footer}>
          <StatusChip
            label={statusInfo.label}
            status={statusInfo.type}
            icon={statusInfo.icon}
            ink={tint?.ink}
          />

          <View style={styles.dateContainer}>
            <MaterialCommunityIcons name="calendar" size={14} color={muted} />
            <Text style={[styles.dateText, { color: muted }]}>{formatDate(project.startDate)}</Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLow,
    ...corners.card,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    ...Platform.select({
      web: {
        transition: 'transform 600ms cubic-bezier(0.16, 1, 0.3, 1), border-color 300ms cubic-bezier(0.16, 1, 0.3, 1)',
      } as any,
    }),
  },
  inner: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: 26,
  },
  webTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderWidth: 1.5,
    ...corners.chip,
  },
  webTagLabel: {
    ...typography.labelSmall,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  titleContainer: {
    flex: 1,
  },
  name: {
    ...typography.headlineSmall,
    fontWeight: '900',
    color: colors.onSurface,
    marginTop: spacing.xs,
  },
  type: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  optionsBtn: {
    margin: -spacing.sm,
  },
  description: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    marginVertical: spacing.base,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dateText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  pressed: {
    opacity: 0.9,
  },
});
