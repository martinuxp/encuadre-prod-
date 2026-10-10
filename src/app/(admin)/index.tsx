// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Dashboard Principal
// Resumen de estado, KPIs y accesos rápidos
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { colors, typography, spacing, shapes } from '@/theme/tokens';
import { brand } from '@/constants/brand';
import { AppShell } from '@/components/m3/AppShell';
import { InfoCard } from '@/components/m3/InfoCard';
import { ActionButton } from '@/components/m3/ActionButton';
import { ProjectCard } from '@/components/m3/ProjectCard';
import { StatusChip } from '@/components/m3/StatusChip';
import { EmptyState } from '@/components/m3/EmptyState';
import { LoadingState } from '@/components/m3/LoadingState';
import { projectService } from '@/services/firebase/projectService';
import { activityService } from '@/services/firebase/activityService';
import { Project, ActivityLog } from '@/types';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function DashboardScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const allProjects = await projectService.getProjects();
      setProjects(allProjects.slice(0, 3)); // Mostrar los 3 más recientes

      // Recopilar bitácora reciente si hay proyectos
      if (allProjects.length > 0) {
        const recentLogs = await activityService.getProjectLogs(allProjects[0].id, 5);
        setLogs(recentLogs);
      }
    } catch (e) {
      console.error('Error al cargar datos del dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCreateProject = () => {
    router.push('/projects/new');
  };

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  // KPIs
  const activeProjectsCount = projects.filter((p) => p.status === 'production').length;
  const preProjectsCount = projects.filter((p) => p.status === 'pre_production').length;

  const headerRight = (
    <ActionButton
      label="Cerrar Sesión"
      variant="text"
      icon="logout"
      onPress={handleLogout}
      labelStyle={{ color: colors.error }}
    />
  );

  return (
    <AppShell title={brand.appTitleMedium} rightActions={headerRight}>
      <View style={styles.container}>
        {/* Bienvenida */}
        <View style={styles.welcomeSection}>
          <Text style={styles.greeting}>Hola, {user?.firstName || 'Administrador'}</Text>
          <Text style={styles.subtitle}>Gestiona tus llamados, guiones y rodajes de {brand.companyMedium}.</Text>
        </View>

        {/* Indicadores KPIs */}
        <View style={styles.kpisRow}>
          <InfoCard title="En Rodaje" variant="filled" style={styles.kpiCard}>
            <View style={styles.kpiValueRow}>
              <Text style={styles.kpiValue}>{activeProjectsCount}</Text>
              <MaterialCommunityIcons name="camera-gopro" size={32} color={colors.primary} />
            </View>
            <Text style={styles.kpiLabel}>Proyectos en filmación</Text>
          </InfoCard>

          <InfoCard title="Pre-Producción" variant="filled" style={styles.kpiCard}>
            <View style={styles.kpiValueRow}>
              <Text style={styles.kpiValue}>{preProjectsCount}</Text>
              <MaterialCommunityIcons name="clipboard-text-clock" size={32} color={colors.warning} />
            </View>
            <Text style={styles.kpiLabel}>Proyectos listos para rodar</Text>
          </InfoCard>

          <InfoCard title="Total Proyectos" variant="filled" style={styles.kpiCard}>
            <View style={styles.kpiValueRow}>
              <Text style={styles.kpiValue}>{projects.length}</Text>
              <MaterialCommunityIcons name="folder-multiple" size={32} color={colors.secondary} />
            </View>
            <Text style={styles.kpiLabel}>Proyectos registrados</Text>
          </InfoCard>
        </View>

        {/* Bloque central de contenido */}
        <View style={styles.mainLayout}>
          {/* Columna Izquierda: Proyectos */}
          <View style={styles.leftCol}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Proyectos Recientes</Text>
              <ActionButton
                label="Ver todos"
                variant="text"
                onPress={() => router.push('/projects')}
              />
            </View>

            {loading ? (
              <LoadingState message="Cargando proyectos..." />
            ) : projects.length === 0 ? (
              <EmptyState
                icon="video-off-outline"
                title="No hay proyectos"
                description="Comienza creando tu primer proyecto audiovisual para configurar llamados."
                actionLabel="Crear Proyecto"
                onActionPress={handleCreateProject}
              />
            ) : (
              <View style={styles.projectsList}>
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onPress={() => router.push(`/projects/${project.id}`)}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Columna Derecha: Accesos rápidos y Actividad */}
          <View style={styles.rightCol}>
            <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
            <View style={styles.quickActions}>
              <ActionButton
                label="Crear Nuevo Proyecto"
                onPress={handleCreateProject}
                variant="filled"
                icon="plus"
                style={styles.quickActionBtn}
              />
              <ActionButton
                label="Libreta de Contactos"
                onPress={() => router.push('/contacts' as any)}
                variant="tonal"
                icon="card-account-phone-outline"
                style={styles.quickActionBtn}
              />
              <ActionButton
                label="Ver Plantillas"
                onPress={() => router.push('/templates')}
                variant="outlined"
                icon="animation"
                style={styles.quickActionBtn}
              />
            </View>

            <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Actividad del Portal</Text>
            <View style={styles.activityFeed}>
              {logs.length === 0 ? (
                <Text style={styles.noActivity}>No hay actividad reciente registrada.</Text>
              ) : (
                logs.map((log) => (
                  <View key={log.id} style={styles.activityItem}>
                    <MaterialCommunityIcons name="history" size={16} color={colors.primary} />
                    <View style={styles.activityTextContainer}>
                      <Text style={styles.activityUser}>{log.userDisplayName}</Text>
                      <Text style={styles.activityAction}>
                        {log.action} en el proyecto
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
  },
  welcomeSection: {
    gap: spacing.xs,
  },
  greeting: {
    ...typography.displaySmall,
    color: colors.onSurface,
    fontWeight: 'bold',
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.onSurfaceVariant,
  },
  kpisRow: {
    flexDirection: 'row',
    gap: spacing.base,
    flexWrap: 'wrap',
  },
  kpiCard: {
    flex: 1,
    minWidth: 200,
    padding: spacing.base,
  },
  kpiValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  kpiValue: {
    ...typography.displayLarge,
    color: colors.onSurface,
    fontWeight: 'bold',
  },
  kpiLabel: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  mainLayout: {
    flexDirection: 'row',
    gap: spacing.xl,
    flexWrap: 'wrap',
  },
  leftCol: {
    flex: 2,
    minWidth: 320,
    gap: spacing.base,
  },
  rightCol: {
    flex: 1,
    minWidth: 280,
    gap: spacing.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.titleLarge,
    color: colors.onSurface,
    fontWeight: 'bold',
  },
  projectsList: {
    gap: spacing.base,
  },
  quickActions: {
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.base,
    borderRadius: shapes.medium,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  quickActionBtn: {
    justifyContent: 'flex-start',
  },
  activityFeed: {
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.base,
    borderRadius: shapes.medium,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    gap: spacing.sm,
  },
  noActivity: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: spacing.base,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    paddingBottom: spacing.sm,
  },
  activityTextContainer: {
    flex: 1,
  },
  activityUser: {
    ...typography.labelMedium,
    color: colors.onSurface,
    fontWeight: 'bold',
  },
  activityAction: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
});
