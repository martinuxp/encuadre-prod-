// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Dashboard Principal
// Resumen de estado, KPIs y accesos rápidos
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, corners } from '@/theme/tokens';
import { brand } from '@/constants/brand';
import { AppShell } from '@/components/m3/AppShell';
import { ActionButton } from '@/components/m3/ActionButton';
import { ProjectCard } from '@/components/m3/ProjectCard';
import { SectionHeader } from '@/components/brand/SectionHeader';
import { Reveal } from '@/components/brand/Reveal';
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
      setProjects(allProjects);

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

  // Indicadores sobre todos los proyectos activos; la lista muestra los 3 más recientes
  const recent = projects.slice(0, 3);
  const stats = [
    { value: projects.filter((p) => p.status === 'production').length, label: 'En rodaje' },
    { value: projects.filter((p) => p.status === 'pre_production').length, label: 'En preproducción' },
    { value: projects.filter((p) => p.web?.published).length, label: 'En la web' },
    { value: projects.length, label: 'Proyectos activos' },
  ];

  const headerRight = (
    <ActionButton label="Cerrar sesión" variant="text" icon="logout" onPress={handleLogout} />
  );

  return (
    <AppShell title="" rightActions={headerRight} background="brand">
      <View style={styles.container}>
        {/* Bienvenida */}
        <View style={styles.welcomeSection}>
          <Reveal index={0}><Text style={styles.kicker}>/{brand.appTitleShort}/</Text></Reveal>
          <Reveal index={1}><Text style={styles.greeting}>Hola, {user?.firstName || 'equipo'}</Text></Reveal>
          <Reveal index={2}><Text style={styles.subtitle}>Llamados, guiones y rodajes de {brand.companyMedium}, en un solo lugar.</Text></Reveal>
        </View>

        {/* Indicadores */}
        <Reveal index={3} style={styles.stats}>
          {stats.map((stat, i) => (
            <View key={stat.label} style={[styles.stat, i === 0 && styles.statFirst, i === stats.length - 1 && styles.statLast]}>
              <Text style={styles.statValue}>{loading ? '–' : stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </Reveal>

        {/* Bloque central de contenido */}
        <View style={styles.mainLayout}>
          {/* Columna izquierda: proyectos */}
          <Reveal index={4} style={styles.leftCol}>
            <SectionHeader
              number={1}
              title="Proyectos recientes"
              right={<ActionButton label="Ver todos" variant="text" icon="arrow-right" onPress={() => router.push('/projects')} />}
            />

            {loading ? (
              <LoadingState message="Cargando proyectos..." />
            ) : recent.length === 0 ? (
              <EmptyState
                icon="video-off-outline"
                mascot="flan"
                title="Aún no hay proyectos"
                description="Crea el primero para empezar a armar llamados y guiones."
                actionLabel="Crear proyecto"
                onActionPress={handleCreateProject}
              />
            ) : (
              <View style={styles.projectsList}>
                {recent.map((project) => (
                  <ProjectCard key={project.id} project={project} onPress={() => router.push(`/projects/${project.id}`)} />
                ))}
              </View>
            )}
          </Reveal>

          {/* Columna derecha: accesos rápidos y actividad */}
          <Reveal index={5} style={styles.rightCol}>
            <SectionHeader number={2} title="Atajos" />
            <View style={styles.quickActions}>
              <ActionButton label="Nuevo proyecto" onPress={handleCreateProject} variant="filled" icon="plus" style={styles.quickActionBtn} />
              <ActionButton label="Contactos" onPress={() => router.push('/contacts' as any)} variant="outlined" icon="card-account-phone-outline" style={styles.quickActionBtn} />
              <ActionButton label="Web pública" onPress={() => router.push('/projects/web')} variant="outlined" icon="web" style={styles.quickActionBtn} />
              <ActionButton label="Plantillas" onPress={() => router.push('/templates')} variant="tonal" icon="animation" style={styles.quickActionBtn} />
            </View>

            <SectionHeader number={3} title="Actividad" style={{ marginTop: spacing.xl }} />
            <View style={styles.activityFeed}>
              {logs.length === 0 ? (
                <Text style={styles.noActivity}>Sin actividad reciente.</Text>
              ) : (
                logs.map((log) => (
                  <View key={log.id} style={styles.activityItem}>
                    <MaterialCommunityIcons name="history" size={16} color={colors.onSurfaceVariant} />
                    <View style={styles.activityTextContainer}>
                      <Text style={styles.activityUser}>{log.userDisplayName}</Text>
                      <Text style={styles.activityAction}>{log.action}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </Reveal>
        </View>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xl, paddingVertical: spacing.base },
  welcomeSection: { gap: spacing.xs },
  kicker: { ...typography.labelLarge, color: colors.onSurfaceVariant },
  greeting: { ...typography.displayMedium, color: colors.onSurface },
  subtitle: { ...typography.titleMedium, fontWeight: '600', color: colors.onSurfaceVariant },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: {
    flexGrow: 1, flexBasis: 160, paddingVertical: 22, paddingHorizontal: spacing.lg,
    borderWidth: 2, borderColor: '#FFFFFF', borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  statFirst: { borderTopLeftRadius: 40 },
  statLast: { borderBottomRightRadius: 40 },
  statValue: { ...typography.displayMedium, fontSize: 56, lineHeight: 58, color: colors.onSurface },
  statLabel: { ...typography.bodyLarge, color: colors.onSurfaceVariant },
  mainLayout: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xl },
  leftCol: { flex: 2, minWidth: 320, gap: spacing.base },
  rightCol: { flex: 1, minWidth: 280, gap: spacing.base },
  projectsList: { gap: spacing.base },
  quickActions: { gap: spacing.sm },
  quickActionBtn: { height: 48, justifyContent: 'flex-start' },
  activityFeed: {
    backgroundColor: colors.surfaceContainerLow, borderWidth: 1.5, borderColor: colors.outlineVariant,
    ...corners.tail, padding: spacing.base, gap: spacing.md,
  },
  noActivity: { ...typography.bodyMedium, color: colors.onSurfaceVariant },
  activityItem: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  activityTextContainer: { flex: 1 },
  activityUser: { ...typography.labelLarge, color: colors.onSurface },
  activityAction: { ...typography.bodySmall, color: colors.onSurfaceVariant },
});
