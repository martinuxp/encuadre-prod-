// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Project Sub-navigation Layout
// Layout común para la navegación interna de pestañas de un proyecto
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { Slot, useLocalSearchParams, useRouter, usePathname } from 'expo-router';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { AppShell } from '@/components/m3/AppShell';
import { projectService } from '@/services/firebase/projectService';
import { Project } from '@/types';
import { StatusChip, StatusType } from '@/components/m3/StatusChip';
import { LoadingState } from '@/components/m3/LoadingState';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ProjectDetailLayout() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const pathname = usePathname();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProjectDetails = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const data = await projectService.getProjectById(projectId);
      setProject(data);
    } catch (e) {
      console.error('Error al obtener proyecto:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [projectId]);

  if (loading) {
    return <LoadingState message="Cargando detalles de producción..." fullScreen />;
  }

  if (!project) {
    return (
      <AppShell title="Error" showBack onBackPress={() => router.replace('/projects')}>
        <Text style={styles.errorText}>No se encontró el proyecto seleccionado.</Text>
      </AppShell>
    );
  }

  // Definir pestañas de navegación internas del proyecto
  const tabs = [
    { key: '', label: 'Resumen', icon: 'information-outline' },
    { key: 'team', label: 'Equipo', icon: 'account-multiple-outline' },
    { key: 'documents', label: 'Documentos', icon: 'file-document-outline' },
    { key: 'calendar', label: 'Calendario', icon: 'calendar-outline' },
    { key: 'files', label: 'Archivos', icon: 'file-cabinet' },
    { key: 'versions', label: 'Versiones', icon: 'filmstrip' },
    { key: 'activity', label: 'Historial', icon: 'history' },
  ];

  // Determinar pestaña activa
  const getActiveTab = (): string => {
    const segments = pathname.split('/');
    const lastSegment = segments[segments.length - 1];
    if (lastSegment === projectId) return '';
    return lastSegment;
  };

  const activeTab = getActiveTab();

  const handleTabSelect = (tabKey: string) => {
    if (tabKey === '') {
      router.push(`/projects/${projectId}`);
    } else {
      router.push(`/projects/${projectId}/${tabKey}`);
    }
  };

  const getStatusColor = (status: Project['status']): StatusType => {
    switch (status) {
      case 'production': return 'info';
      case 'completed': return 'success';
      case 'pre_production':
      case 'post_production': return 'warning';
      case 'archived':
      default: return 'default';
    }
  };

  return (
    <AppShell
      title={`Proyecto: ${project.name}`}
      showBack
      onBackPress={() => router.replace('/projects')}
    >
      <View style={styles.container}>
        {/* Cabecera del Proyecto */}
        <View style={styles.header}>
          <View style={styles.titleCol}>
            <Text style={styles.projectName}>{project.name}</Text>
            <Text style={styles.projectSubtitle}>
              {project.type.toUpperCase()} • ID: {project.id.substring(0, 8)}
            </Text>
          </View>
          <StatusChip
            label={project.status.replace('_', ' ').toUpperCase()}
            status={getStatusColor(project.status)}
          />
        </View>

        {/* Barra de Pestañas de Subnavegación */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabBar}
          contentContainerStyle={styles.tabBarContent}
        >
          {tabs.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <Pressable
                key={tab.key}
                onPress={() => handleTabSelect(tab.key)}
                style={[
                  styles.tab,
                  isActive ? styles.tabActive : styles.tabInactive,
                ]}
              >
                <MaterialCommunityIcons
                  name={tab.icon as any}
                  size={18}
                  color={isActive ? colors.primary : colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Ranura para renderizar la subpantalla correspondiente */}
        <View style={styles.content}>
          <Slot />
        </View>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.base,
  },
  errorText: {
    ...typography.bodyLarge,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.base,
    borderRadius: shapes.medium,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  titleCol: {
    flex: 1,
    gap: spacing.xs,
  },
  projectName: {
    ...typography.headlineSmall,
    color: colors.onSurface,
    fontWeight: 'bold',
  },
  projectSubtitle: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  tabBar: {
    maxHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  tabBarContent: {
    gap: spacing.base,
    paddingBottom: spacing.xs,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    borderRadius: shapes.extraSmall,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      } as any,
    }),
  },
  tabActive: {
    borderBottomColor: colors.primary,
    backgroundColor: 'rgba(197, 192, 255, 0.08)',
  },
  tabInactive: {},
  tabLabel: {
    ...typography.labelLarge,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  tabLabelInactive: {
    color: colors.onSurfaceVariant,
  },
  content: {
    marginTop: spacing.sm,
  },
});
