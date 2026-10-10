// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Historial de Actividad del Proyecto
// Feed de cambios, acciones y eventos registrados
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { SectionCard } from '@/components/m3/SectionCard';
import { ActionButton } from '@/components/m3/ActionButton';
import { EmptyState } from '@/components/m3/EmptyState';
import { LoadingState } from '@/components/m3/LoadingState';
import { ErrorState } from '@/components/m3/ErrorState';
import { activityService } from '@/services/firebase/activityService';
import { ActivityLog } from '@/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AvatarBadge } from '@/components/m3/AvatarBadge';

const ENTITY_ICONS: Record<ActivityLog['entityType'], any> = {
  project: 'folder',
  document: 'file-document',
  file: 'image',
  member: 'account',
  callsheet: 'calendar-account',
  task: 'checkbox-marked-circle',
};

export default function ActivityScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(30);

  const fetchLogs = useCallback(async () => {
    if (!projectId) return;
    try { setLoading(true); setError(null);
      const data = await activityService.getProjectLogs(projectId, limit);
      setLogs(data);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, [projectId, limit]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const formatRelativeTime = (date: Date): string => {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Hace un momento';
    if (mins < 60) return `Hace ${mins} min`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days < 7) return `Hace ${days} día${days > 1 ? 's' : ''}`;
    return date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
  };

  if (loading) return <LoadingState message="Cargando historial de actividad..." fullScreen />;
  if (error) return <ErrorState error={error} onRetry={fetchLogs} />;

  return (
    <View style={styles.container}>
      <SectionCard
        title="Historial de Actividad"
        subtitle={`${logs.length} eventos registrados`}
        headerActions={
          <ActionButton label="Recargar" variant="tonal" icon="refresh" onPress={fetchLogs} />
        }
      >
        {logs.length === 0 ? (
          <EmptyState
            icon="history"
            title="Sin actividad registrada"
            description="Las acciones sobre documentos, equipo y llamados quedan registradas aquí automáticamente."
          />
        ) : (
          <View style={styles.timeline}>
            {logs.map((log, index) => (
              <View key={log.id} style={styles.timelineItem}>
                {/* Línea de tiempo */}
                <View style={styles.timelineLeft}>
                  <View style={styles.timelineDot}>
                    <MaterialCommunityIcons
                      name={ENTITY_ICONS[log.entityType] || 'circle'}
                      size={14}
                      color={colors.onPrimaryContainer}
                    />
                  </View>
                  {index < logs.length - 1 && <View style={styles.timelineLine} />}
                </View>

                {/* Contenido del evento */}
                <View style={styles.timelineContent}>
                  <View style={styles.logHeader}>
                    <AvatarBadge name={log.userDisplayName} size={28} />
                    <View style={styles.logText}>
                      <Text style={styles.logUser}>{log.userDisplayName}</Text>
                      <Text style={styles.logAction}>{log.action}</Text>
                    </View>
                    <Text style={styles.logTime}>{formatRelativeTime(log.createdAt)}</Text>
                  </View>

                  {/* Detalles adicionales si existen */}
                  {log.details && Object.keys(log.details).length > 0 && (
                    <View style={styles.logDetails}>
                      {Object.entries(log.details).map(([key, val]) => (
                        <Text key={key} style={styles.logDetailText}>
                          <Text style={{ fontWeight: 'bold' }}>{key}: </Text>
                          {String(val)}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            ))}

            {/* Cargar más */}
            {logs.length >= limit && (
              <ActionButton
                label="Cargar más"
                variant="outlined"
                onPress={() => setLimit(limit + 30)}
                style={styles.loadMoreBtn}
              />
            )}
          </View>
        )}
      </SectionCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  timeline: { gap: 0 },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineLeft: { width: 36, alignItems: 'center', marginRight: spacing.sm },
  timelineDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 1,
  },
  timelineLine: {
    width: 2, flex: 1, backgroundColor: colors.outlineVariant,
    marginTop: 0, marginBottom: 0, minHeight: spacing.lg,
  },
  timelineContent: {
    flex: 1, paddingBottom: spacing.lg, paddingTop: spacing.xs,
  },
  logHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  logText: { flex: 1 },
  logUser: { ...typography.labelMedium, color: colors.onSurface, fontWeight: 'bold' },
  logAction: { ...typography.bodySmall, color: colors.onSurfaceVariant, marginTop: 2 },
  logTime: { ...typography.bodySmall, color: colors.outline, flexShrink: 0 },
  logDetails: {
    marginTop: spacing.sm, backgroundColor: colors.surfaceContainerLow,
    borderRadius: shapes.small, padding: spacing.sm, gap: 2,
  },
  logDetailText: { ...typography.bodySmall, color: colors.onSurfaceVariant },
  loadMoreBtn: { alignSelf: 'center', marginTop: spacing.base },
});
