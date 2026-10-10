import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { SectionCard } from '@/components/m3/SectionCard';
import { InfoCard } from '@/components/m3/InfoCard';
import { ActionButton } from '@/components/m3/ActionButton';
import { TagList } from '@/components/m3/TagList';
import { LoadingState } from '@/components/m3/LoadingState';
import { ErrorState } from '@/components/m3/ErrorState';
import { ConfirmDialog } from '@/components/m3/ConfirmDialog';
import { DriveBrowser } from '@/components/m3/DriveBrowser';
import { projectService } from '@/services/firebase/projectService';
import { activityService } from '@/services/firebase/activityService';
import { driveService } from '@/services/firebase/driveService';
import { mediaShareService } from '@/services/firebase/mediaShareService';
import { Project, ProjectMember, TalentProfile, SharedMediaLink } from '@/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';

const PRODUCTION_TYPES = [
  { value: 'film', label: 'Película' },
  { value: 'tv', label: 'Serie / TV' },
  { value: 'commercial', label: 'Comercial' },
  { value: 'music_video', label: 'Videoclip' },
  { value: 'photography', label: 'Fotografía' },
  { value: 'corporate', label: 'Corporativo' },
  { value: 'documentary', label: 'Documental' },
  { value: 'other', label: 'Otro' },
];

const PROJECT_STATUSES = [
  { value: 'draft', label: 'Borrador' },
  { value: 'pre_production', label: 'Pre-producción' },
  { value: 'production', label: 'Producción' },
  { value: 'post_production', label: 'Post-producción' },
  { value: 'completed', label: 'Completado' },
  { value: 'archived', label: 'Archivado' },
];

export default function ProjectDetailScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const { user } = useUser();

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [talents, setTalents] = useState<TalentProfile[]>([]);
  const [sharedCrudos, setSharedCrudos] = useState<SharedMediaLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archiveDialogVisible, setArchiveDialogVisible] = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editType, setEditType] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editDriveFolder, setEditDriveFolder] = useState('');
  const [saving, setSaving] = useState(false);

  // Drive folder info
  const [driveFolderName, setDriveFolderName] = useState('');

  const fetchData = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const [proj, mems, tals, shares] = await Promise.all([
        projectService.getProjectById(projectId),
        projectService.getMembers(projectId),
        projectService.getTalents(projectId),
        mediaShareService.getProjectShares(projectId),
      ]);
      setProject(proj);
      setMembers(mems);
      setTalents(tals);
      setSharedCrudos(shares);

      if (proj?.driveFolderId) {
        const info = await driveService.getFolderInfo(proj.driveFolderId);
        if (info) setDriveFolderName(info.name);
      }
    } catch (e: any) {
      setError(e.message || 'Error al cargar datos del proyecto.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [projectId]);

  const openEditModal = () => {
    if (!project) return;
    setEditName(project.name);
    setEditDesc(project.description || '');
    setEditType(project.type);
    setEditStatus(project.status);
    setEditStartDate(project.startDate ? project.startDate.toISOString().split('T')[0] : '');
    setEditEndDate(project.endDate ? project.endDate.toISOString().split('T')[0] : '');
    setEditDriveFolder(project.driveFolderId || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!projectId || !project) return;
    if (!editName.trim()) { alert('El nombre del proyecto es obligatorio.'); return; }
    setSaving(true);
    try {
      const parsedDriveId = editDriveFolder.trim()
        ? (driveService.extractFolderId(editDriveFolder.trim()) || editDriveFolder.trim())
        : undefined;

      await projectService.updateProject(projectId, {
        name: editName.trim(),
        description: editDesc.trim(),
        type: editType as Project['type'],
        status: editStatus as Project['status'],
        startDate: new Date(editStartDate),
        endDate: editEndDate ? new Date(editEndDate) : undefined,
        driveFolderId: parsedDriveId,
      });

      await activityService.logActivity(
        projectId, 'project', projectId,
        'actualizó los datos del proyecto',
        user?.id || '', user?.fullName || ''
      );

      setShowEditModal(false);
      fetchData();
    } catch (e: any) {
      alert(`Error al guardar: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!projectId) return;
    try {
      await projectService.updateProjectStatus(projectId, 'archived');
      await activityService.logActivity(projectId, 'project', projectId, 'archivó el proyecto', user?.id || '', user?.fullName || '');
      router.replace('/projects');
    } catch (e: any) {
      setError(e.message);
    }
    setArchiveDialogVisible(false);
  };

  const formatDate = (d?: Date) => {
    if (!d) return '—';
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const getProductionTypeLabel = (type?: string) => {
    const map: Record<string, string> = {
      film: 'Película / Largometraje', tv: 'Serie / TV', commercial: 'Comercial',
      music_video: 'Videoclip', photography: 'Fotografía', corporate: 'Corporativo',
      documentary: 'Documental', other: 'Otro',
    };
    return map[type || ''] || type || '—';
  };

  if (loading) return <LoadingState message="Cargando producción..." fullScreen />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;
  if (!project) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Description */}
      <SectionCard
        title="Descripción del Proyecto"
        headerActions={
          <Pressable style={styles.editIconBtn} onPress={openEditModal}>
            <MaterialCommunityIcons name="pencil" size={16} color={colors.primary} />
            <Text style={styles.editIconLabel}>Editar</Text>
          </Pressable>
        }
      >
        <Text style={styles.descriptionText}>
          {project.description || 'Sin descripción asignada al proyecto.'}
        </Text>
        {project.tags?.length > 0 && (
          <TagList tags={project.tags} style={styles.tags} />
        )}
      </SectionCard>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <InfoCard title="Tipo de Producción" variant="filled" style={styles.statCard}>
          <View style={styles.statIconRow}>
            <MaterialCommunityIcons name="movie-roll" size={28} color={colors.primary} />
            <Text style={styles.statValue}>{getProductionTypeLabel(project.type)}</Text>
          </View>
        </InfoCard>

        <InfoCard title="Inicio de Producción" variant="filled" style={styles.statCard}>
          <View style={styles.statIconRow}>
            <MaterialCommunityIcons name="calendar-star" size={28} color={colors.tertiary} />
            <Text style={styles.statValue}>{formatDate(project.startDate)}</Text>
          </View>
        </InfoCard>

        <InfoCard title="Término Estimado" variant="filled" style={styles.statCard}>
          <View style={styles.statIconRow}>
            <MaterialCommunityIcons name="calendar-check" size={28} color={colors.secondary} />
            <Text style={styles.statValue}>{formatDate(project.endDate)}</Text>
          </View>
        </InfoCard>

        <InfoCard title="Equipo Técnico" variant="filled" style={styles.statCard}>
          <View style={styles.statIconRow}>
            <MaterialCommunityIcons name="account-hard-hat" size={28} color={colors.warning} />
            <Text style={styles.statValue}>{members.length} <Text style={styles.statSubValue}>crew</Text></Text>
          </View>
        </InfoCard>

        <InfoCard title="Elenco / Talentos" variant="filled" style={styles.statCard}>
          <View style={styles.statIconRow}>
            <MaterialCommunityIcons name="account-star" size={28} color={colors.primary} />
            <Text style={styles.statValue}>{talents.length} <Text style={styles.statSubValue}>talentos</Text></Text>
          </View>
        </InfoCard>

        <InfoCard title="Google Drive" variant="filled" style={styles.statCard}>
          <View style={styles.statIconRow}>
            <MaterialCommunityIcons name="google-drive" size={28} color="#1a73e8" />
            <Text style={styles.statValue} numberOfLines={1}>
              {driveFolderName || (project.driveFolderId ? 'Conectado' : 'No vinculado')}
            </Text>
          </View>
        </InfoCard>
      </View>

      {/* Drive Browser (if folder linked) */}
      {project.driveFolderId && (
        <SectionCard
          title="Crudos en Google Drive"
          subtitle="Archivos compartidos desde la carpeta de Drive"
        >
          <DriveBrowser
            folderId={project.driveFolderId}
            projectId={projectId}
            projectName={project.name}
            compact
          />
        </SectionCard>
      )}

      {/* Shared Crudos */}
      {sharedCrudos.length > 0 && (
        <SectionCard
          title="Crudos Compartidos"
          subtitle="Links de visualización compartidos a terceros"
        >
          <View style={{ gap: spacing.xs }}>
            {sharedCrudos.map((share) => (
              <View key={share.id} style={{
                flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
                padding: spacing.sm, backgroundColor: colors.surfaceContainer,
                borderRadius: shapes.small,
              }}>
                <MaterialCommunityIcons name="file-link-outline" size={18} color={colors.secondary} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodySmall, { color: colors.onSurface, fontWeight: '600' }]} numberOfLines={1}>
                    {share.displayName || share.fileId}
                  </Text>
                  <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
                    {share.viewCount || 0} accesos • {share.password ? '🔒' : '🔓'}
                  </Text>
                </View>
                {share.expiresAt && (
                  <Text style={[typography.labelSmall, { color: colors.onSurfaceVariant }]}>
                    Vence {share.expiresAt.toLocaleDateString('es-CL')}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </SectionCard>
      )}

      {/* Admin Actions */}
      <SectionCard title="Administración del Proyecto" headerActions={
        <ActionButton
          label="Archivar"
          variant="outlined"
          icon="archive"
          onPress={() => setArchiveDialogVisible(true)}
          labelStyle={{ color: colors.error }}
          style={{ borderColor: colors.error }}
        />
      }>
        <View style={styles.adminActions}>
          <ActionButton
            label="Ver Equipo"
            variant="tonal"
            icon="account-multiple"
            onPress={() => router.push(`/projects/${projectId}/team`)}
            style={styles.adminBtn}
          />
          <ActionButton
            label="Ver Documentos"
            variant="tonal"
            icon="file-document"
            onPress={() => router.push(`/projects/${projectId}/documents`)}
            style={styles.adminBtn}
          />
          <ActionButton
            label="Plan de Rodaje"
            variant="tonal"
            icon="calendar"
            onPress={() => router.push(`/projects/${projectId}/calendar`)}
            style={styles.adminBtn}
          />
          <ActionButton
            label="Archivos"
            variant="tonal"
            icon="folder"
            onPress={() => router.push(`/projects/${projectId}/files`)}
            style={styles.adminBtn}
          />
          <ActionButton
            label="Versiones"
            variant="tonal"
            icon="filmstrip"
            onPress={() => router.push(`/projects/${projectId}/versions`)}
            style={styles.adminBtn}
          />
        </View>
      </SectionCard>

      {/* Metadata */}
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>Creado: {formatDate(project.createdAt)}</Text>
        <Text style={styles.metaText}>•</Text>
        <Text style={styles.metaText}>ID: {project.id}</Text>
      </View>

      {/* ── Edit Modal ── */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Proyecto</Text>
              <Pressable onPress={() => setShowEditModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.onSurface} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              <View style={{ gap: spacing.xs }}>
                <Text style={styles.label}>Nombre del Proyecto</Text>
                <TextInput style={styles.input} value={editName} onChangeText={setEditName} />
              </View>

              <View style={{ gap: spacing.xs }}>
                <Text style={styles.label}>Descripción</Text>
                <TextInput style={[styles.input, styles.textArea]} value={editDesc} onChangeText={setEditDesc} multiline />
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text style={styles.label}>Tipo de Producción</Text>
                  {Platform.OS === 'web' ? (
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      style={styles.select as any}
                    >
                      {PRODUCTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  ) : (
                    <TextInput style={styles.input} value={editType} onChangeText={setEditType} />
                  )}
                </View>
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text style={styles.label}>Estado</Text>
                  {Platform.OS === 'web' ? (
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      style={styles.select as any}
                    >
                      {PROJECT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  ) : (
                    <TextInput style={styles.input} value={editStatus} onChangeText={setEditStatus} />
                  )}
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text style={styles.label}>Inicio (YYYY-MM-DD)</Text>
                  <TextInput style={styles.input} value={editStartDate} onChangeText={setEditStartDate} placeholder="2026-01-01" />
                </View>
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text style={styles.label}>Término (opcional)</Text>
                  <TextInput style={styles.input} value={editEndDate} onChangeText={setEditEndDate} placeholder="2026-06-01" />
                </View>
              </View>

              <View style={{ gap: spacing.xs }}>
                <Text style={styles.label}>Google Drive — Carpeta de Crudos</Text>
                <TextInput
                  style={styles.input}
                  value={editDriveFolder}
                  onChangeText={setEditDriveFolder}
                  placeholder="ID o URL de la carpeta de Drive"
                />
                <Text style={styles.hint}>
                  Busca en Chrome, ve a la carpeta de Drive y copia la URL. Ej: https://drive.google.com/drive/folders/ABC123
                </Text>
                {editDriveFolder && driveService.extractFolderId(editDriveFolder) && (
                  <Text style={styles.hintSuccess}>
                    ID detectado: {driveService.extractFolderId(editDriveFolder)}
                  </Text>
                )}
              </View>

              <Pressable
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSaveEdit}
                disabled={saving}
              >
                <MaterialCommunityIcons name="content-save" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Guardar Cambios'}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Archive confirm */}
      <ConfirmDialog
        visible={archiveDialogVisible}
        title="Archivar Proyecto"
        message={`¿Confirmas que deseas archivar "${project.name}"? El proyecto seguirá visible en el listado pero marcado como archivado.`}
        confirmLabel="Archivar"
        onConfirm={handleArchive}
        onCancel={() => setArchiveDialogVisible(false)}
        isDestructive
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  descriptionText: { ...typography.bodyLarge, color: colors.onSurface, lineHeight: 24 },
  tags: { marginTop: spacing.base },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.base },
  statCard: { flexBasis: '30%', flexGrow: 1, minWidth: 200, padding: spacing.base },
  statIconRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  statValue: { ...typography.titleLarge, color: colors.onSurface, fontWeight: 'bold', flex: 1 },
  statSubValue: { ...typography.bodyMedium, color: colors.onSurfaceVariant, fontWeight: '400' },
  adminActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  adminBtn: { height: 36 },
  metaRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  metaText: { ...typography.bodySmall, color: colors.onSurfaceVariant },
  editIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    height: 28,
    borderRadius: shapes.small,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editIconLabel: { ...typography.labelMedium, color: colors.primary, fontWeight: '600' },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderRadius: shapes.large,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  modalTitle: { ...typography.titleLarge, color: colors.onSurface, fontWeight: 'bold' },
  modalBody: { padding: spacing.base, gap: spacing.base },
  formRow: { flexDirection: 'row', gap: spacing.base },
  label: { ...typography.bodySmall, color: colors.onSurfaceVariant, fontWeight: '600' },
  input: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: shapes.small,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    color: colors.onSurface,
    height: 40,
    paddingHorizontal: spacing.sm,
    ...typography.bodyMedium,
  },
  select: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: shapes.small,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    color: colors.onSurface,
    height: 40,
    paddingHorizontal: spacing.sm,
    ...typography.bodyMedium,
    width: '100%',
  } as any,
  textArea: { height: 80, paddingVertical: spacing.sm, textAlignVertical: 'top' },
  hint: { ...typography.bodySmall, color: colors.onSurfaceAlpha38 },
  hintSuccess: { ...typography.bodySmall, color: colors.success },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: shapes.full,
    height: 40,
    marginTop: spacing.sm,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { ...typography.labelLarge, color: '#fff', fontWeight: 'bold' },
});
