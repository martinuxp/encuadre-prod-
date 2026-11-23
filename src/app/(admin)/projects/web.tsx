// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Orden de la Web pública
// Vista "Web": proyectos con ficha web, reordenables (`web.order`)
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { AppShell } from '@/components/m3/AppShell';
import { ActionButton } from '@/components/m3/ActionButton';
import { StatusChip } from '@/components/m3/StatusChip';
import { EmptyState } from '@/components/m3/EmptyState';
import { LoadingState } from '@/components/m3/LoadingState';
import { webService } from '@/services/firebase/webService';
import { Project } from '@/types';

export default function WebOrderScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setLoading(true); setItems(await webService.listWebProjects()); setDirty(false); }
    catch (e: any) { setMessage(e.message || 'Error al cargar.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const copy = [...items];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    setItems(copy); setDirty(true); setMessage(null);
  };

  const save = async () => {
    try { setSaving(true); await webService.saveOrder(items.map((p) => p.id)); setDirty(false); setMessage('Orden guardado. Se verá en la web en unos minutos.'); }
    catch (e: any) { setMessage(e.message || 'No se pudo guardar el orden.'); }
    finally { setSaving(false); }
  };

  return (
    <AppShell title="Web pública" showBack onBackPress={() => router.replace('/projects')} rightActions={<ActionButton label="Guardar orden" icon="content-save-outline" loading={saving} disabled={!dirty} onPress={save} />}>
      <View style={styles.container}>
        <Text style={styles.hint}>Orden en el inicio y el carrusel de la web (el primero va primero). Para sumar un proyecto, abre su pestaña “Web pública”.</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {loading ? <LoadingState message="Cargando proyectos web..." /> : items.length === 0 ? (
          <EmptyState icon="web" title="Aún no hay proyectos en la web" description="Abre un proyecto, ve a la pestaña “Web pública” y completa su ficha." />
        ) : items.map((p, i) => (
          <View key={p.id} style={styles.row}>
            <Text style={styles.index}>{i + 1}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.title}>{p.web!.title || p.name}</Text>
              <Text style={styles.hint}>{p.web!.kind} · /{p.web!.slug}</Text>
            </View>
            <StatusChip label={p.web!.published ? 'PUBLICADO' : 'OCULTO'} status={p.web!.published ? 'success' : 'default'} />
            <ActionButton label="↑" variant="tonal" disabled={i === 0} onPress={() => move(i, i - 1)} />
            <ActionButton label="↓" variant="tonal" disabled={i === items.length - 1} onPress={() => move(i, i + 1)} />
            <ActionButton label="Editar" variant="text" onPress={() => router.push(`/projects/${p.id}/web`)} />
          </View>
        ))}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.base },
  hint: { ...typography.bodySmall, color: colors.onSurfaceVariant },
  message: { ...typography.bodyMedium, color: colors.onSurface, backgroundColor: colors.surfaceContainerHigh, padding: spacing.md, borderRadius: shapes.small },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', backgroundColor: colors.surfaceContainerLow, padding: spacing.base, borderRadius: shapes.medium, borderWidth: 1, borderColor: colors.outlineVariant },
  index: { ...typography.titleLarge, color: colors.primary, width: 32, textAlign: 'center' },
  title: { ...typography.titleMedium, color: colors.onSurface },
});
