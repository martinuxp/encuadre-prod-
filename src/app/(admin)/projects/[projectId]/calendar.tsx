// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Calendario / Plan de Rodaje
// Jornadas, reuniones, ensayos e hitos del proyecto
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, Platform, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { SectionCard } from '@/components/m3/SectionCard';
import { CalendarEventCard } from '@/components/m3/CalendarEventCard';
import { ActionButton } from '@/components/m3/ActionButton';
import { FilterBar, FilterOption } from '@/components/m3/FilterBar';
import { EmptyState } from '@/components/m3/EmptyState';
import { LoadingState } from '@/components/m3/LoadingState';
import { ErrorState } from '@/components/m3/ErrorState';
import { ConfirmDialog } from '@/components/m3/ConfirmDialog';
import { calendarService } from '@/services/firebase/calendarService';
import { activityService } from '@/services/firebase/activityService';
import { CalendarEvent, CalendarEventType } from '@/types';
import { useUser } from '@clerk/clerk-expo';

export default function CalendarScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { user } = useUser();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal nuevo evento
  const [modalVisible, setModalVisible] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState<CalendarEventType>('shoot');
  const [eventStart, setEventStart] = useState('');
  const [eventEnd, setEventEnd] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventLoading, setEventLoading] = useState(false);

  // Eliminar evento
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!projectId) return;
    try { setLoading(true); setError(null);
      const evs = await calendarService.getEvents(projectId);
      setEvents(evs);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  useEffect(() => {
    if (filter === 'all') { setFilteredEvents(events); return; }
    setFilteredEvents(events.filter((e) => e.type === filter));
  }, [filter, events]);

  const handleCreateEvent = async () => {
    if (!eventTitle.trim() || !eventStart || !eventEnd) return;
    setEventLoading(true);
    try {
      await calendarService.createEvent(projectId, {
        title: eventTitle, type: eventType,
        startDate: new Date(eventStart), endDate: new Date(eventEnd),
        allDay: false, attendees: [], status: 'scheduled',
        location: eventLocation || undefined, description: eventDescription || undefined,
      }, user?.id || '');
      await activityService.logActivity(projectId, 'project', projectId, `creó el evento "${eventTitle}"`, user?.id || '', user?.fullName || '');
      setModalVisible(false);
      setEventTitle(''); setEventStart(''); setEventEnd(''); setEventLocation(''); setEventDescription('');
      fetchEvents();
    } catch (e: any) { setError(e.message); } finally { setEventLoading(false); }
  };

  const handleDeleteEvent = async () => {
    if (!deleteTarget) return;
    try {
      await calendarService.deleteEvent(projectId, deleteTarget.id);
      await activityService.logActivity(projectId, 'project', deleteTarget.id, `eliminó el evento "${deleteTarget.title}"`, user?.id || '', user?.fullName || '');
      fetchEvents();
    } catch (e: any) { setError(e.message); }
    setDeleteTarget(null);
  };

  const filterOptions: FilterOption[] = [
    { key: 'all', label: 'Todos' },
    { key: 'shoot', label: 'Rodaje' },
    { key: 'meeting', label: 'Reunión' },
    { key: 'rehearsal', label: 'Ensayo' },
    { key: 'delivery', label: 'Entrega' },
    { key: 'milestone', label: 'Hito' },
  ];

  if (loading) return <LoadingState message="Cargando plan de rodaje..." fullScreen />;
  if (error && events.length === 0) return <ErrorState error={error} onRetry={fetchEvents} />;

  // Agrupar eventos por mes
  const groupEventsByMonth = (evs: CalendarEvent[]): Map<string, CalendarEvent[]> => {
    const groups = new Map<string, CalendarEvent[]>();
    evs.forEach((ev) => {
      const monthKey = ev.startDate.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
      if (!groups.has(monthKey)) groups.set(monthKey, []);
      groups.get(monthKey)!.push(ev);
    });
    return groups;
  };

  const grouped = groupEventsByMonth(filteredEvents);

  return (
    <View style={styles.container}>
      <SectionCard
        title="Plan de Rodaje y Calendario"
        headerActions={
          <ActionButton label="Agregar Evento" variant="filled" icon="calendar-plus" onPress={() => setModalVisible(true)} />
        }
      >
        <FilterBar options={filterOptions} selectedKey={filter} onSelect={setFilter} style={styles.filters} />

        {filteredEvents.length === 0 ? (
          <EmptyState
            icon="calendar-blank-outline"
            title="Sin eventos"
            description="Agrega jornadas de rodaje, reuniones de preproducción y hitos del proyecto."
            actionLabel="Agregar Evento"
            onActionPress={() => setModalVisible(true)}
          />
        ) : (
          Array.from(grouped.entries()).map(([month, evs]) => (
            <View key={month} style={styles.monthGroup}>
              <Text style={styles.monthTitle}>{month.toUpperCase()}</Text>
              <View style={styles.evList}>
                {evs.map((ev) => (
                  <View key={ev.id} style={styles.evRow}>
                    <CalendarEventCard
                      title={ev.title} type={ev.type}
                      startDate={ev.startDate} endDate={ev.endDate}
                      location={ev.location} allDay={ev.allDay}
                      style={styles.evCard}
                    />
                    <ActionButton
                      label="" variant="text" icon="trash-can-outline"
                      onPress={() => setDeleteTarget(ev)}
                      labelStyle={{ color: colors.error }}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </SectionCard>

      {/* Modal Nuevo Evento */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalCard}>
            <Text style={styles.modalTitle}>Agregar Evento</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Título *</Text>
              <TextInput value={eventTitle} onChangeText={setEventTitle} placeholder="Ej. Jornada de rodaje — escenas interiores" placeholderTextColor={colors.onSurfaceAlpha38} style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' } as any]} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tipo</Text>
              {Platform.OS === 'web' && (
                <select value={eventType} onChange={(e) => setEventType(e.target.value as CalendarEventType)} style={{ height: 44, backgroundColor: colors.surfaceContainer, borderRadius: 8, padding: '0 16px', color: colors.onSurface, border: `1px solid ${colors.outlineVariant}` } as any}>
                  <option value="shoot">Rodaje</option>
                  <option value="meeting">Reunión</option>
                  <option value="rehearsal">Ensayo</option>
                  <option value="delivery">Entrega</option>
                  <option value="milestone">Hito</option>
                  <option value="other">Otro</option>
                </select>
              )}
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Inicio *</Text>
                <TextInput value={eventStart} onChangeText={setEventStart} placeholder="YYYY-MM-DDTHH:MM" placeholderTextColor={colors.onSurfaceAlpha38} style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' } as any]} />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Término *</Text>
                <TextInput value={eventEnd} onChangeText={setEventEnd} placeholder="YYYY-MM-DDTHH:MM" placeholderTextColor={colors.onSurfaceAlpha38} style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' } as any]} />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Locación / Dirección</Text>
              <TextInput value={eventLocation} onChangeText={setEventLocation} placeholder="Ej. Estudio B, Providencia" placeholderTextColor={colors.onSurfaceAlpha38} style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' } as any]} />
            </View>
            <View style={styles.modalActions}>
              <ActionButton label="Cancelar" variant="outlined" onPress={() => setModalVisible(false)} style={styles.modalBtn} />
              <ActionButton label="Guardar" variant="filled" icon="check" onPress={handleCreateEvent} loading={eventLoading} style={styles.modalBtn} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDialog visible={!!deleteTarget} title="Eliminar Evento" message={`¿Eliminar "${deleteTarget?.title}"?`} confirmLabel="Eliminar" onConfirm={handleDeleteEvent} onCancel={() => setDeleteTarget(null)} isDestructive />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  filters: { marginBottom: spacing.base },
  monthGroup: { marginBottom: spacing.lg },
  monthTitle: { ...typography.labelSmall, color: colors.primary, fontWeight: 'bold', marginBottom: spacing.sm, letterSpacing: 1 },
  evList: { gap: spacing.sm },
  evRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  evCard: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: spacing.base },
  modalCard: { width: '100%', maxWidth: 520, backgroundColor: colors.surfaceContainerHigh, borderRadius: shapes.extraLarge, padding: spacing.lg, borderWidth: 1, borderColor: colors.outlineVariant, gap: spacing.base },
  modalTitle: { ...typography.headlineSmall, color: colors.onSurface, fontWeight: 'bold' },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  inputGroup: { gap: spacing.xs },
  label: { ...typography.labelMedium, color: colors.onSurface, fontWeight: '600' },
  input: { height: 44, backgroundColor: colors.surfaceContainer, borderRadius: shapes.small, paddingHorizontal: spacing.base, color: colors.onSurface, borderWidth: 1, borderColor: colors.outlineVariant, ...typography.bodyMedium },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
  modalBtn: { height: 40 },
});
