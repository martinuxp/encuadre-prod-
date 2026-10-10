// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Documentos del Proyecto
// Guiones, storyboards y control de versiones tipo Git
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, Platform, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { SectionCard } from '@/components/m3/SectionCard';
import { FileCard } from '@/components/m3/FileCard';
import { VersionCard } from '@/components/m3/VersionCard';
import { ActionButton } from '@/components/m3/ActionButton';
import { EmptyState } from '@/components/m3/EmptyState';
import { LoadingState } from '@/components/m3/LoadingState';
import { ErrorState } from '@/components/m3/ErrorState';
import { IconButton } from '@/components/m3/IconButton';
import { documentService } from '@/services/firebase/documentService';
import { activityService } from '@/services/firebase/activityService';
import { ProductionDocument, DocumentType, ScriptVersion } from '@/types';
import { useUser } from '@clerk/clerk-expo';

export default function DocumentsScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { user } = useUser();

  const [documents, setDocuments] = useState<ProductionDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<ProductionDocument | null>(null);
  const [versions, setVersions] = useState<ScriptVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal nuevo documento
  const [newDocModal, setNewDocModal] = useState(false);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState<DocumentType>('script');
  const [docLoading, setDocLoading] = useState(false);

  // Modal subida de versión
  const [versionModal, setVersionModal] = useState(false);
  const [versionNotes, setVersionNotes] = useState('');
  const [versionNumber, setVersionNumber] = useState('');
  const [versionTag, setVersionTag] = useState<ScriptVersion['tag']>('draft');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [versionLoading, setVersionLoading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    if (!projectId) return;
    try { setLoading(true); setError(null);
      const docs = await documentService.getDocuments(projectId);
      setDocuments(docs);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const fetchVersions = async (doc: ProductionDocument) => {
    setSelectedDoc(doc);
    setVersionsLoading(true);
    try {
      const vrs = await documentService.getDocumentVersions(projectId, doc.id);
      setVersions(vrs);
    } catch (e: any) { setError(e.message); } finally { setVersionsLoading(false); }
  };

  const handleCreateDocument = async () => {
    if (!docName.trim()) return;
    setDocLoading(true);
    try {
      await documentService.createDocument(projectId, {
        name: docName, type: docType, tags: [], status: 'draft',
      }, user?.id || '');
      await activityService.logActivity(projectId, 'document', projectId, `creó el documento "${docName}"`, user?.id || '', user?.fullName || '');
      setNewDocModal(false); setDocName('');
      fetchDocuments();
    } catch (e: any) { setError(e.message); } finally { setDocLoading(false); }
  };

  const handleFileChange = (e: any) => {
    if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
  };

  const handleUploadVersion = async () => {
    if (!selectedDoc || !selectedFile || !versionNumber.trim()) return;
    setVersionLoading(true);
    try {
      await documentService.uploadNewVersion(
        projectId, selectedDoc.id,
        selectedFile as unknown as Blob,
        selectedFile.name, versionNumber, versionNotes, versionTag, user?.id || ''
      );
      await activityService.logActivity(projectId, 'document', selectedDoc.id,
        `subió la versión ${versionNumber} de "${selectedDoc.name}"`, user?.id || '', user?.fullName || '');
      setVersionModal(false); setVersionNumber(''); setVersionNotes(''); setSelectedFile(null);
      fetchVersions(selectedDoc);
    } catch (e: any) { setError(e.message); } finally { setVersionLoading(false); }
  };

  if (loading) return <LoadingState message="Cargando documentos..." fullScreen />;
  if (error && documents.length === 0) return <ErrorState error={error} onRetry={fetchDocuments} />;

  return (
    <View style={styles.container}>
      <SectionCard
        title="Documentos de Producción"
        subtitle="Guiones, storyboards y contratos"
        headerActions={
          <ActionButton label="Nuevo Documento" variant="filled" icon="plus" onPress={() => setNewDocModal(true)} />
        }
      >
        {documents.length === 0 ? (
          <EmptyState
            icon="file-document-outline"
            title="Sin documentos"
            description="Crea guiones, storyboards y documentos del proyecto."
            actionLabel="Crear Documento"
            onActionPress={() => setNewDocModal(true)}
          />
        ) : (
          <View style={styles.list}>
            {documents.map((doc) => (
              <Pressable key={doc.id} onPress={() => fetchVersions(doc)} style={({ pressed }) => [styles.docItem, pressed && { opacity: 0.8 }, selectedDoc?.id === doc.id && styles.docItemActive]}>
                <FileCard
                  name={doc.name}
                  type={doc.type}
                  date={doc.updatedAt}
                  version={doc.versions.length > 0 ? String(doc.versions.length) : undefined}
                  onDownload={doc.versions.length > 0 ? () => {} : undefined}
                />
              </Pressable>
            ))}
          </View>
        )}
      </SectionCard>

      {/* Historial de versiones del documento seleccionado */}
      {selectedDoc && (
        <SectionCard
          title={`Versiones: ${selectedDoc.name}`}
          headerActions={
            <ActionButton label="Subir Versión" variant="tonal" icon="upload" onPress={() => setVersionModal(true)} />
          }
        >
          {versionsLoading ? (
            <LoadingState message="Cargando versiones..." />
          ) : versions.length === 0 ? (
            <EmptyState
              icon="file-upload-outline"
              title="Sin versiones"
              description="Sube el primer archivo PDF o Word de este documento."
              actionLabel="Subir Versión"
              onActionPress={() => setVersionModal(true)}
            />
          ) : (
            <View style={styles.list}>
              {versions.map((v) => (
                <VersionCard
                  key={v.id}
                  versionNumber={v.versionNumber}
                  notes={v.notes}
                  author={v.createdBy}
                  date={v.createdAt}
                  tag={v.tag}
                  isCurrent={selectedDoc.currentVersionId === v.id}
                  isLocked={v.isLocked}
                  onDownload={() => { if (Platform.OS === 'web') window.open(v.fileUrl, '_blank'); }}
                  onRevert={selectedDoc.currentVersionId !== v.id
                    ? () => documentService.revertToVersion(projectId, selectedDoc.id, v.id).then(() => fetchVersions(selectedDoc))
                    : undefined}
                  onLockToggle={() => documentService.toggleVersionLock(projectId, selectedDoc.id, v.id, !v.isLocked, user?.id || '').then(() => fetchVersions(selectedDoc))}
                />
              ))}
            </View>
          )}
        </SectionCard>
      )}

      {/* Modal Nuevo Documento */}
      <Modal visible={newDocModal} transparent animationType="fade" onRequestClose={() => setNewDocModal(false)}>
        <Pressable style={styles.backdrop} onPress={() => setNewDocModal(false)}>
          <Pressable style={styles.modalCard}>
            <Text style={styles.modalTitle}>Crear Documento</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre *</Text>
              <TextInput value={docName} onChangeText={setDocName} placeholder="Ej. Guión versión final" placeholderTextColor={colors.onSurfaceAlpha38} style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' } as any]} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tipo</Text>
              {Platform.OS === 'web' ? (
                <select value={docType} onChange={(e) => setDocType(e.target.value as DocumentType)} style={{ height: 44, backgroundColor: colors.surfaceContainer, borderRadius: 8, padding: '0 16px', color: colors.onSurface, border: `1px solid ${colors.outlineVariant}`, outlineStyle: 'none' } as any}>
                  <option value="script">Guión</option>
                  <option value="storyboard">Storyboard</option>
                  <option value="shot_list">Lista de planos</option>
                  <option value="callsheet">Call Sheet</option>
                  <option value="budget">Presupuesto</option>
                  <option value="contract">Contrato</option>
                  <option value="other">Otro</option>
                </select>
              ) : null}
            </View>
            <View style={styles.modalActions}>
              <ActionButton label="Cancelar" variant="outlined" onPress={() => setNewDocModal(false)} style={styles.modalBtn} />
              <ActionButton label="Crear" variant="filled" icon="plus" onPress={handleCreateDocument} loading={docLoading} style={styles.modalBtn} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal Subir Versión */}
      <Modal visible={versionModal} transparent animationType="fade" onRequestClose={() => setVersionModal(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVersionModal(false)}>
          <Pressable style={styles.modalCard}>
            <Text style={styles.modalTitle}>Subir Nueva Versión</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Número de versión *</Text>
              <TextInput value={versionNumber} onChangeText={setVersionNumber} placeholder="Ej. 1.0, 2.3, FINAL" placeholderTextColor={colors.onSurfaceAlpha38} style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' } as any]} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tag de estado</Text>
              {Platform.OS === 'web' && (
                <select value={versionTag} onChange={(e) => setVersionTag(e.target.value as ScriptVersion['tag'])} style={{ height: 44, backgroundColor: colors.surfaceContainer, borderRadius: 8, padding: '0 16px', color: colors.onSurface, border: `1px solid ${colors.outlineVariant}` } as any}>
                  <option value="draft">Borrador</option>
                  <option value="review">En Revisión</option>
                  <option value="approved">Aprobado</option>
                  <option value="final">Final</option>
                </select>
              )}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notas de cambios</Text>
              <TextInput value={versionNotes} onChangeText={setVersionNotes} placeholder="¿Qué cambió en esta versión?" placeholderTextColor={colors.onSurfaceAlpha38} multiline numberOfLines={3} style={[styles.input, styles.textarea, Platform.OS === 'web' && { outlineStyle: 'none' } as any]} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Archivo (PDF, DOC, etc.) *</Text>
              {Platform.OS === 'web' && (
                <input type="file" accept=".pdf,.doc,.docx,.pages,.txt" onChange={handleFileChange} style={{ color: colors.onSurface, fontSize: 14 } as any} />
              )}
            </View>
            <View style={styles.modalActions}>
              <ActionButton label="Cancelar" variant="outlined" onPress={() => setVersionModal(false)} style={styles.modalBtn} />
              <ActionButton label="Subir Versión" variant="filled" icon="upload" onPress={handleUploadVersion} loading={versionLoading} style={styles.modalBtn} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  list: { gap: spacing.sm },
  docItem: { borderRadius: shapes.medium, overflow: 'hidden' },
  docItemActive: { borderWidth: 2, borderColor: colors.primary },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: spacing.base },
  modalCard: { width: '100%', maxWidth: 480, backgroundColor: colors.surfaceContainerHigh, borderRadius: shapes.extraLarge, padding: spacing.lg, borderWidth: 1, borderColor: colors.outlineVariant, gap: spacing.base },
  modalTitle: { ...typography.headlineSmall, color: colors.onSurface, fontWeight: 'bold' },
  inputGroup: { gap: spacing.xs },
  label: { ...typography.labelMedium, color: colors.onSurface, fontWeight: '600' },
  input: { height: 44, backgroundColor: colors.surfaceContainer, borderRadius: shapes.small, paddingHorizontal: spacing.base, color: colors.onSurface, borderWidth: 1, borderColor: colors.outlineVariant, ...typography.bodyMedium },
  textarea: { height: 72, paddingVertical: spacing.sm, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
  modalBtn: { height: 40 },
});
