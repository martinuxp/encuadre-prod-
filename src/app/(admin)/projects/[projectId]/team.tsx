// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Equipo + Llamados Individuales
// La pantalla más crítica: gestión de crew, talentos y links de llamado
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput, Platform,
  ScrollView, Pressable,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { SectionCard } from '@/components/m3/SectionCard';
import { PersonCard } from '@/components/m3/PersonCard';
import { ActionButton } from '@/components/m3/ActionButton';
import { FilterBar, FilterOption } from '@/components/m3/FilterBar';
import { EmptyState } from '@/components/m3/EmptyState';
import { LoadingState } from '@/components/m3/LoadingState';
import { ErrorState } from '@/components/m3/ErrorState';
import { ConfirmDialog } from '@/components/m3/ConfirmDialog';
import { IconButton } from '@/components/m3/IconButton';
import { StatusChip } from '@/components/m3/StatusChip';
import { projectService } from '@/services/firebase/projectService';
import { callSheetService } from '@/services/firebase/callSheetService';
import { activityService } from '@/services/firebase/activityService';
import { contactService } from '@/services/firebase/contactService';
import { ProjectMember, TalentProfile, CallSheetAccess, ParticipantType, ContactProfile } from '@/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';

// ─── Tipos internos del formulario ───────────────────────────────────────────

interface CallSheetFormData {
  callDate: string;
  callTime: string;
  arrivalTime: string;
  locationName: string;
  locationAddress: string;
  role: string;
  costume: string;
  instructions: string;
  notes: string;
  contactName: string;
  contactPhone: string;
}

const emptyForm: CallSheetFormData = {
  callDate: '', callTime: '', arrivalTime: '',
  locationName: '', locationAddress: '',
  role: '', costume: '', instructions: '', notes: '',
  contactName: '', contactPhone: '',
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function TeamScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { user } = useUser();

  // Data
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [talents, setTalents] = useState<TalentProfile[]>([]);
  const [callSheets, setCallSheets] = useState<CallSheetAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI: Filtros
  const [activeTab, setActiveTab] = useState<'crew' | 'talent'>('crew');

  // UI: Modal Agregar/Editar Miembro
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState('');
  const [memberDept, setMemberDept] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberNotes, setMemberNotes] = useState('');
  const [memberType, setMemberType] = useState<ParticipantType>('crew');
  const [saveToGlobalContacts, setSaveToGlobalContacts] = useState(true);
  const [memberLoading, setMemberLoading] = useState(false);

  // UI: Modal Importar desde Libreta de Contactos
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [availableContacts, setAvailableContacts] = useState<ContactProfile[]>([]);
  const [importSearch, setImportSearch] = useState('');
  const [selectedImportIds, setSelectedImportIds] = useState<string[]>([]);
  const [importLoading, setImportLoading] = useState(false);

  // UI: Modal Call Sheet (el flujo crítico)
  const [callSheetModalVisible, setCallSheetModalVisible] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>('');
  const [selectedParticipantName, setSelectedParticipantName] = useState<string>('');
  const [selectedParticipantType, setSelectedParticipantType] = useState<ParticipantType>('crew');
  const [form, setForm] = useState<CallSheetFormData>(emptyForm);
  const [formLoading, setFormLoading] = useState(false);

  // UI: Link generado
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // UI: Eliminar miembro
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: ParticipantType; name: string } | null>(null);

  // ─── Carga de datos ──────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const [mems, tals, sheets] = await Promise.all([
        projectService.getMembers(projectId),
        projectService.getTalents(projectId),
        callSheetService.getProjectCallSheets(projectId),
      ]);
      setMembers(mems);
      setTalents(tals);
      setCallSheets(sheets);
    } catch (e: any) {
      setError(e.message || 'Error al cargar el equipo de producción.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Agregar / Editar Miembro ───────────────────────────────────────────

  const openEditMember = (person: ProjectMember | TalentProfile, type: ParticipantType) => {
    setEditingMemberId(person.id);
    setMemberType(type);
    setMemberName(person.name);
    setMemberRole(person.role);
    setMemberDept('department' in person ? person.department : '');
    setMemberEmail(person.email || '');
    setMemberPhone(person.phone || '');
    setMemberNotes('notes' in person ? person.notes : '');
    setSaveToGlobalContacts(false);
    setMemberModalVisible(true);
  };

  const handleAddMember = async () => {
    if (!memberName.trim() || !memberRole.trim()) return;
    setMemberLoading(true);
    try {
      const creatorId = user?.id || '';
      const creatorName = user?.fullName || 'Admin';

      if (editingMemberId) {
        // Editar existente
        if (memberType === 'crew') {
          await projectService.updateMember(projectId, editingMemberId, {
            name: memberName, role: memberRole, department: memberDept,
            email: memberEmail, phone: memberPhone,
          });
        } else {
          await projectService.updateTalent(projectId, editingMemberId, {
            name: memberName, role: memberRole, email: memberEmail, phone: memberPhone,
            notes: memberNotes,
          });
        }
        await activityService.logActivity(projectId, 'member', editingMemberId,
          `editó los datos de ${memberName}`, creatorId, creatorName);
      } else {
        // Agregar nuevo
        if (memberType === 'crew') {
          await projectService.addMember(projectId, {
            name: memberName, role: memberRole, department: memberDept,
            email: memberEmail, phone: memberPhone, permissions: [],
          }, creatorId);
        } else {
          await projectService.addTalent(projectId, {
            name: memberName, role: memberRole, email: memberEmail, phone: memberPhone, notes: '',
          }, creatorId);
        }
        await activityService.logActivity(projectId, 'member', projectId,
          `agregó a ${memberName} al equipo`, creatorId, creatorName);

        // Guardar opcionalmente en la Libreta Central de Contactos
        if (saveToGlobalContacts) {
          try {
            await contactService.createContact({
              name: memberName.trim(),
              category: memberType === 'crew' ? 'crew' : 'actor',
              role: memberRole.trim(),
              department: memberType === 'crew' ? (memberDept.trim() || 'General') : 'Casting / Elenco',
              email: memberEmail.trim() || undefined,
              phone: memberPhone.trim() || undefined,
              availability: 'available',
              tags: [],
            }, creatorId);
          } catch (err) {
            console.error('Error al guardar en libreta central:', err);
          }
        }
      }

      setMemberModalVisible(false);
      setEditingMemberId(null);
      setMemberName(''); setMemberRole(''); setMemberDept('');
      setMemberEmail(''); setMemberPhone(''); setMemberNotes('');
      fetchData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setMemberLoading(false);
    }
  };

  // ─── Importar desde Libreta de Contactos ──────────────────────────────────
  const openImportContactsModal = async () => {
    try {
      setImportLoading(true);
      const allContacts = await contactService.getContacts();
      setAvailableContacts(allContacts);
      setSelectedImportIds([]);
      setImportSearch('');
      setImportModalVisible(true);
    } catch (err: any) {
      setError(err.message || 'Error al cargar contactos de la libreta.');
    } finally {
      setImportLoading(false);
    }
  };

  const toggleSelectImportContact = (id: string) => {
    setSelectedImportIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExecuteImport = async () => {
    if (selectedImportIds.length === 0) return;
    setImportLoading(true);
    try {
      const creatorId = user?.id || '';
      for (const id of selectedImportIds) {
        const contact = availableContacts.find((c) => c.id === id);
        if (contact) {
          await contactService.importContactToProject(projectId, contact, creatorId);
        }
      }
      await activityService.logActivity(
        projectId,
        'member',
        projectId,
        `importó ${selectedImportIds.length} contactos desde la libreta general`,
        creatorId,
        user?.fullName || 'Admin'
      );
      setImportModalVisible(false);
      setSelectedImportIds([]);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Error al importar contactos.');
    } finally {
      setImportLoading(false);
    }
  };

  const openAddMemberModal = (type: ParticipantType) => {
    setEditingMemberId(null);
    setMemberType(type);
    setMemberName(''); setMemberRole(''); setMemberDept('');
    setMemberEmail(''); setMemberPhone(''); setMemberNotes('');
    setMemberModalVisible(true);
  };

  // ─── Eliminar Miembro ────────────────────────────────────────────────────

  const handleDeleteMember = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'crew') {
        await projectService.removeMember(projectId, deleteTarget.id);
      } else {
        await projectService.removeTalent(projectId, deleteTarget.id);
      }
      await activityService.logActivity(projectId, 'member', deleteTarget.id,
        `eliminó a ${deleteTarget.name} del equipo`, user?.id || '', user?.fullName || '');
      fetchData();
    } catch (e: any) {
      setError(e.message);
    }
    setDeleteTarget(null);
  };

  // ─── Abrir Modal de Llamado ──────────────────────────────────────────────

  const openCallSheetModal = (id: string, name: string, type: ParticipantType, role: string) => {
    setSelectedParticipantId(id);
    setSelectedParticipantName(name);
    setSelectedParticipantType(type);
    setForm({ ...emptyForm, role });
    setGeneratedLink(null);
    setCallSheetModalVisible(true);
  };

  // ─── Generar Link de Llamado (Flujo Crítico) ─────────────────────────────

  const handleGenerateCallSheet = async () => {
    if (!form.callDate || !form.callTime || !form.locationName || !form.locationAddress) {
      setError('Completa al menos fecha, hora, rol y dirección de locación.');
      return;
    }
    setFormLoading(true);
    setError(null);
    try {
      const result = await callSheetService.generateCallSheet(
        projectId,
        {
          participantId: selectedParticipantId,
          participantType: selectedParticipantType,
          callDate: new Date(form.callDate),
          callTime: form.callTime,
          arrivalTime: form.arrivalTime || form.callTime,
          location: { name: form.locationName, address: form.locationAddress },
          role: form.role,
          costume: form.costume || undefined,
          instructions: form.instructions,
          notes: form.notes || undefined,
          productionContact: { name: form.contactName, phone: form.contactPhone },
          status: 'pending',
          attachments: [],
        },
        user?.id || ''
      );

      const appUrl = process.env.EXPO_PUBLIC_APP_URL || 'http://localhost:8081';
      const link = `${appUrl}/call/${result.token}`;
      setGeneratedLink(link);

      await activityService.logActivity(projectId, 'callsheet', result.id,
        `generó el llamado de ${selectedParticipantName}`, user?.id || '', user?.fullName || '');

      fetchData();
    } catch (e: any) {
      setError(e.message || 'Error al generar el llamado.');
    } finally {
      setFormLoading(false);
    }
  };

  // ─── Copiar Link ─────────────────────────────────────────────────────────

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    try {
      if (Platform.OS === 'web' && navigator?.clipboard) {
        await navigator.clipboard.writeText(generatedLink);
      }
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {}
  };

  // ─── Obtener estado de llamado de un participante ─────────────────────────

  const getCallSheetForParticipant = (participantId: string): CallSheetAccess | undefined =>
    callSheets.find((cs) => cs.participantId === participantId);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) return <LoadingState message="Cargando equipo de producción..." fullScreen />;
  if (error && members.length === 0) return <ErrorState error={error} onRetry={fetchData} />;

  const tabOptions: FilterOption[] = [
    { key: 'crew', label: `Equipo Técnico (${members.length})` },
    { key: 'talent', label: `Elenco / Talentos (${talents.length})` },
  ];

  const headerActions = (
    <View style={styles.headerButtons}>
      <ActionButton
        label="Importar de Libreta"
        variant="tonal"
        icon="card-account-phone-outline"
        onPress={openImportContactsModal}
        loading={importLoading}
      />
      <ActionButton
        label="Agregar Participante"
        variant="filled"
        icon="account-plus"
        onPress={() => openAddMemberModal(activeTab === 'crew' ? 'crew' : 'talent')}
      />
    </View>
  );

  const filteredAvailableContacts = availableContacts.filter((c) => {
    if (!importSearch.trim()) return true;
    const q = importSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q) ||
      c.department.toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.container}>
      <SectionCard title="Llamados Individuales" subtitle={`${callSheets.length} llamados generados`} headerActions={headerActions}>
        {/* Tabs Crew / Talento */}
        <FilterBar
          options={tabOptions}
          selectedKey={activeTab}
          onSelect={(k) => setActiveTab(k as 'crew' | 'talent')}
          style={styles.tabs}
        />

        {/* Lista del tab activo */}
        {activeTab === 'crew' && (
          <View style={styles.list}>
            {members.length === 0 ? (
              <EmptyState
                icon="account-hard-hat-outline"
                title="Sin equipo técnico"
                description="Agrega directores, camarógrafos, sonidistas y toda la crew técnica del rodaje o impórtalos de tu libreta."
                actionLabel="Importar de Libreta"
                onActionPress={openImportContactsModal}
              />
            ) : (
              members.map((m) => {
                const callSheet = getCallSheetForParticipant(m.id);
                return (
                  <PersonCard
                    key={m.id}
                    name={m.name}
                    role={m.role}
                    department={m.department}
                    email={m.email}
                    phone={m.phone}
                    callStatus={callSheet?.status}
                    onActionPress={() => {
                      if (callSheet) {
                        const appUrl = process.env.EXPO_PUBLIC_APP_URL || 'http://localhost:8081';
                        const link = `${appUrl}/call/${callSheet.token}`;
                        setGeneratedLink(link);
                        setCallSheetModalVisible(true);
                      } else {
                        openCallSheetModal(m.id, m.name, 'crew', m.role);
                      }
                    }}
                    actionLabel={callSheet ? 'Ver Llamado' : 'Generar Llamado'}
                    onEdit={() => openEditMember(m, 'crew')}
                    onDelete={() => setDeleteTarget({ id: m.id, type: 'crew', name: m.name })}
                    style={styles.personCard}
                  />
                );
              })
            )}
          </View>
        )}

        {activeTab === 'talent' && (
          <View style={styles.list}>
            {talents.length === 0 ? (
              <EmptyState
                icon="account-star-outline"
                title="Sin elenco registrado"
                description="Agrega actores, talentos, conductores o impórtalos directamente desde tu libreta de contactos."
                actionLabel="Importar de Libreta"
                onActionPress={openImportContactsModal}
              />
            ) : (
              talents.map((t) => {
                const callSheet = getCallSheetForParticipant(t.id);
                return (
                  <PersonCard
                    key={t.id}
                    name={t.name}
                    role={t.role}
                    email={t.email}
                    phone={t.phone}
                    callStatus={callSheet?.status}
                    onActionPress={() => {
                      if (callSheet) {
                        const appUrl = process.env.EXPO_PUBLIC_APP_URL || 'http://localhost:8081';
                        const link = `${appUrl}/call/${callSheet.token}`;
                        setGeneratedLink(link);
                        setCallSheetModalVisible(true);
                      } else {
                        openCallSheetModal(t.id, t.name, 'talent', t.role);
                      }
                    }}
                    actionLabel={callSheet ? 'Ver Llamado' : 'Generar Llamado'}
                    onEdit={() => openEditMember(t, 'talent')}
                    onDelete={() => setDeleteTarget({ id: t.id, type: 'talent', name: t.name })}
                    style={styles.personCard}
                  />
                );
              })
            )}
          </View>
        )}
      </SectionCard>

      {/* ══ Modal: Importar desde Libreta de Contactos ═════════════════════ */}
      <Modal
        visible={importModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImportModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.importModalCard]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>📖 Importar de Libreta Central</Text>
                <Text style={styles.modalSubtitle}>
                  Selecciona actores o miembros del equipo para sumarlos a este proyecto.
                </Text>
              </View>
              <IconButton icon="close" variant="standard" onPress={() => setImportModalVisible(false)} />
            </View>

            {/* Buscador en libreta */}
            <View style={styles.importSearchRow}>
              <TextInput
                value={importSearch}
                onChangeText={setImportSearch}
                placeholder="Buscar por nombre, rol o departamento..."
                placeholderTextColor={colors.onSurfaceAlpha38}
                style={[styles.input, { flex: 1 }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
              />
            </View>

            <ScrollView style={styles.importScrollList} showsVerticalScrollIndicator={false}>
              {filteredAvailableContacts.length === 0 ? (
                <Text style={styles.importEmptyText}>
                  No hay contactos disponibles en la libreta. Agrega perfiles en la sección de Contactos.
                </Text>
              ) : (
                filteredAvailableContacts.map((contact) => {
                  const isSelected = selectedImportIds.includes(contact.id);
                  const isActor = contact.category === 'actor';
                  return (
                    <Pressable
                      key={contact.id}
                      onPress={() => toggleSelectImportContact(contact.id)}
                      style={[
                        styles.importContactRow,
                        isSelected && styles.importContactRowSelected,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                        size={22}
                        color={isSelected ? colors.primary : colors.onSurfaceVariant}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.importContactName}>{contact.name}</Text>
                        <Text style={styles.importContactRole}>
                          {contact.role} • {contact.department}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.categoryTagSmall,
                          isActor ? styles.categoryTagSmallActor : styles.categoryTagSmallCrew,
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryTagSmallText,
                            isActor ? styles.categoryTagSmallTextActor : styles.categoryTagSmallTextCrew,
                          ]}
                        >
                          {isActor ? 'ACTOR' : 'CREW'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <ActionButton
                label="Cancelar"
                variant="outlined"
                onPress={() => setImportModalVisible(false)}
                style={styles.modalBtn}
              />
              <ActionButton
                label={`Importar Seleccionados (${selectedImportIds.length})`}
                variant="filled"
                icon="account-multiple-plus"
                onPress={handleExecuteImport}
                loading={importLoading}
                disabled={selectedImportIds.length === 0}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ══ Modal: Agregar Crew/Talento ══════════════════════════════════════ */}
      <Modal visible={memberModalVisible} transparent animationType="fade" onRequestClose={() => setMemberModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setMemberModalVisible(false)}>
          <Pressable style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingMemberId
                ? `Editar ${memberType === 'crew' ? 'Crew' : 'Talento'}`
                : memberType === 'crew' ? 'Agregar Crew Técnico' : 'Agregar Talento / Elenco'}
            </Text>

            <View style={styles.modalTypeRow}>
              {(['crew', 'talent'] as ParticipantType[]).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setMemberType(t)}
                  style={[styles.typeChip, memberType === t && styles.typeChipActive]}
                >
                  <Text style={[styles.typeChipLabel, memberType === t && styles.typeChipLabelActive]}>
                    {t === 'crew' ? 'Crew Técnico' : 'Talento / Elenco'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalForm}>
              {[
                { label: 'Nombre completo *', value: memberName, set: setMemberName, placeholder: 'Ej. María González' },
                { label: 'Rol / Cargo *', value: memberRole, set: setMemberRole, placeholder: memberType === 'crew' ? 'Ej. Director de Fotografía' : 'Ej. Protagonista' },
                ...(memberType === 'crew' ? [{ label: 'Departamento', value: memberDept, set: setMemberDept, placeholder: 'Ej. Cámara, Sonido, Arte...' }] : []),
                { label: 'Email', value: memberEmail, set: setMemberEmail, placeholder: 'contacto@email.com' },
                { label: 'Teléfono', value: memberPhone, set: setMemberPhone, placeholder: '+56 9 xxxx xxxx' },
              ].map((field) => (
                <View key={field.label} style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{field.label}</Text>
                  <TextInput
                    value={field.value}
                    onChangeText={field.set}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.onSurfaceAlpha38}
                    style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' } as any]}
                  />
                </View>
              ))}

              {!editingMemberId && (
                <Pressable
                  onPress={() => setSaveToGlobalContacts(!saveToGlobalContacts)}
                  style={styles.saveGlobalRow}
                >
                  <MaterialCommunityIcons
                    name={saveToGlobalContacts ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={20}
                    color={saveToGlobalContacts ? colors.primary : colors.onSurfaceVariant}
                  />
                  <Text style={styles.saveGlobalText}>
                    Guardar también en la Libreta Central de Contactos
                  </Text>
                </Pressable>
              )}
            </View>

            <View style={styles.modalActions}>
              <ActionButton label="Cancelar" variant="outlined" onPress={() => setMemberModalVisible(false)} style={styles.modalBtn} />
              <ActionButton label={editingMemberId ? 'Guardar' : 'Agregar'} variant="filled" icon="check" onPress={handleAddMember} loading={memberLoading} style={styles.modalBtn} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ══ Modal: Generar / Ver Llamado (Flujo Crítico) ════════════════════ */}
      <Modal visible={callSheetModalVisible} transparent animationType="slide" onRequestClose={() => setCallSheetModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.callSheetModal]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>
                    {generatedLink ? '✅ Llamado Generado' : `Llamado para ${selectedParticipantName}`}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {generatedLink ? 'Copia y comparte el link con el participante.' : 'Configura el llamado individual para este participante.'}
                  </Text>
                </View>
                <IconButton icon="close" variant="standard" onPress={() => setCallSheetModalVisible(false)} />
              </View>

              {/* ── LINK GENERADO ── */}
              {generatedLink ? (
                <View style={styles.linkSection}>
                  <View style={styles.linkBox}>
                    <Text style={styles.linkText} numberOfLines={2}>{generatedLink}</Text>
                    <ActionButton
                      label={linkCopied ? '¡Copiado!' : 'Copiar Link'}
                      variant={linkCopied ? 'tonal' : 'filled'}
                      icon={linkCopied ? 'check' : 'content-copy'}
                      onPress={handleCopyLink}
                      style={styles.copyBtn}
                    />
                  </View>

                  <View style={styles.linkInfo}>
                    <MaterialCommunityIcons name="information" size={16} color={colors.primary} />
                    <Text style={styles.linkInfoText}>
                      Este link es único y personal. El participante puede confirmar su asistencia desde su dispositivo sin necesidad de crear una cuenta.
                    </Text>
                  </View>

                  <ActionButton
                    label="Nuevo Llamado"
                    variant="outlined"
                    icon="refresh"
                    onPress={() => { setGeneratedLink(null); setForm(emptyForm); }}
                    style={{ marginTop: spacing.base }}
                  />
                </View>
              ) : (
                /* ── FORMULARIO DE LLAMADO ── */
                <View style={styles.modalForm}>
                  {error && (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorBoxText}>{error}</Text>
                    </View>
                  )}

                  <View style={styles.formSection}>
                    <Text style={styles.formSectionTitle}>📅 Jornada</Text>
                    <View style={styles.row}>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.inputLabel}>Fecha del rodaje *</Text>
                        <TextInput value={form.callDate} onChangeText={(v) => setForm({ ...form, callDate: v })} placeholder="YYYY-MM-DD" placeholderTextColor={colors.onSurfaceAlpha38} style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' } as any]} />
                      </View>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.inputLabel}>Hora de llamado *</Text>
                        <TextInput value={form.callTime} onChangeText={(v) => setForm({ ...form, callTime: v })} placeholder="HH:MM" placeholderTextColor={colors.onSurfaceAlpha38} style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' } as any]} />
                      </View>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.inputLabel}>Hora de llegada</Text>
                        <TextInput value={form.arrivalTime} onChangeText={(v) => setForm({ ...form, arrivalTime: v })} placeholder="HH:MM" placeholderTextColor={colors.onSurfaceAlpha38} style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' } as any]} />
                      </View>
                    </View>
                  </View>

                  <View style={styles.formSection}>
                    <Text style={styles.formSectionTitle}>📍 Locación</Text>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Nombre del set / locación *</Text>
                      <TextInput value={form.locationName} onChangeText={(v) => setForm({ ...form, locationName: v })} placeholder="Ej. Estudio Central / Casa Protagonista" placeholderTextColor={colors.onSurfaceAlpha38} style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' } as any]} />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Dirección completa *</Text>
                      <TextInput value={form.locationAddress} onChangeText={(v) => setForm({ ...form, locationAddress: v })} placeholder="Ej. Av. Providencia 1234, Santiago" placeholderTextColor={colors.onSurfaceAlpha38} style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' } as any]} />
                    </View>
                  </View>

                  <View style={styles.formSection}>
                    <Text style={styles.formSectionTitle}>🎬 Rol y Vestuario</Text>
                    <View style={styles.row}>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.inputLabel}>Rol / Cargo *</Text>
                        <TextInput value={form.role} onChangeText={(v) => setForm({ ...form, role: v })} placeholder="Ej. DF, Actor Principal" placeholderTextColor={colors.onSurfaceAlpha38} style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' } as any]} />
                      </View>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.inputLabel}>Vestuario</Text>
                        <TextInput value={form.costume} onChangeText={(v) => setForm({ ...form, costume: v })} placeholder="Ej. Casual oscuro, traje formal" placeholderTextColor={colors.onSurfaceAlpha38} style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' } as any]} />
                      </View>
                    </View>
                  </View>

                  <View style={styles.formSection}>
                    <Text style={styles.formSectionTitle}>📋 Instrucciones</Text>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Instrucciones para el participante</Text>
                      <TextInput value={form.instructions} onChangeText={(v) => setForm({ ...form, instructions: v })} placeholder="Indicaciones especiales, materiales a traer, etc." placeholderTextColor={colors.onSurfaceAlpha38} multiline numberOfLines={3} style={[styles.input, styles.textarea, Platform.OS === 'web' && { outlineStyle: 'none' } as any]} />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Notas internas</Text>
                      <TextInput value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} placeholder="Notas internas de producción (no visibles al participante)" placeholderTextColor={colors.onSurfaceAlpha38} multiline numberOfLines={2} style={[styles.input, styles.textarea, Platform.OS === 'web' && { outlineStyle: 'none' } as any]} />
                    </View>
                  </View>

                  <View style={styles.formSection}>
                    <Text style={styles.formSectionTitle}>📞 Contacto de Producción</Text>
                    <View style={styles.row}>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.inputLabel}>Nombre del contacto</Text>
                        <TextInput value={form.contactName} onChangeText={(v) => setForm({ ...form, contactName: v })} placeholder="Nombre del productor en set" placeholderTextColor={colors.onSurfaceAlpha38} style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' } as any]} />
                      </View>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.inputLabel}>Teléfono del contacto</Text>
                        <TextInput value={form.contactPhone} onChangeText={(v) => setForm({ ...form, contactPhone: v })} placeholder="+56 9 xxxx xxxx" placeholderTextColor={colors.onSurfaceAlpha38} style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' } as any]} />
                      </View>
                    </View>
                  </View>

                  <View style={styles.modalActions}>
                    <ActionButton label="Cancelar" variant="outlined" onPress={() => setCallSheetModalVisible(false)} style={styles.modalBtn} />
                    <ActionButton label="Generar Link de Llamado" variant="filled" icon="link-variant" onPress={handleGenerateCallSheet} loading={formLoading} style={[styles.modalBtn, { flex: 1 }] as any} />
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══ Confirmar Eliminación ════════════════════════════════════════════ */}
      <ConfirmDialog
        visible={!!deleteTarget}
        title="Eliminar del Equipo"
        message={`¿Confirmas eliminar a "${deleteTarget?.name}" del proyecto? Los llamados generados no se eliminarán.`}
        confirmLabel="Eliminar"
        onConfirm={handleDeleteMember}
        onCancel={() => setDeleteTarget(null)}
        isDestructive
      />
    </View>
  );
}

// ─── Estilos ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  tabs: { marginBottom: spacing.base },
  list: { gap: spacing.sm },
  personCard: {},

  // Modal base
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', padding: spacing.base,
  },
  modalCard: {
    width: '100%', maxWidth: 520,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: shapes.extraLarge,
    padding: spacing.lg,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  callSheetModal: { maxWidth: 680, maxHeight: '90%' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: spacing.base,
  },
  modalTitle: { ...typography.headlineSmall, color: colors.onSurface, fontWeight: 'bold' },
  modalSubtitle: { ...typography.bodyMedium, color: colors.onSurfaceVariant, marginTop: spacing.xs },
  modalTypeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base },
  typeChip: {
    flex: 1, height: 36, borderRadius: shapes.small,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.outlineVariant,
  },
  typeChipActive: { backgroundColor: colors.primaryContainer, borderColor: colors.primary },
  typeChipLabel: { ...typography.labelLarge, color: colors.onSurfaceVariant, fontWeight: '600' },
  typeChipLabelActive: { color: colors.onPrimaryContainer },
  modalForm: { gap: spacing.sm },
  formSection: { gap: spacing.sm, marginBottom: spacing.sm },
  formSectionTitle: { ...typography.titleSmall, color: colors.primary, fontWeight: 'bold' },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  inputGroup: { gap: spacing.xs },
  inputLabel: { ...typography.labelMedium, color: colors.onSurface, fontWeight: '600' },
  input: {
    height: 44, backgroundColor: colors.surfaceContainer, borderRadius: shapes.small,
    paddingHorizontal: spacing.base, color: colors.onSurface,
    borderWidth: 1, borderColor: colors.outlineVariant, ...typography.bodyMedium,
  },
  textarea: { height: 72, paddingVertical: spacing.sm, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.base },
  modalBtn: { height: 40 },
  errorBox: {
    backgroundColor: 'rgba(255,180,171,0.15)', borderWidth: 1, borderColor: colors.error,
    borderRadius: shapes.small, padding: spacing.sm,
  },
  errorBoxText: { color: colors.error, ...typography.bodySmall, textAlign: 'center' },

  // Link generado
  linkSection: { gap: spacing.base },
  linkBox: {
    backgroundColor: colors.surfaceContainerLow, borderRadius: shapes.medium,
    borderWidth: 1, borderColor: colors.primary, padding: spacing.base,
    gap: spacing.sm,
  },
  linkText: { ...typography.bodyMedium, color: colors.primary, fontFamily: 'monospace' },
  copyBtn: { alignSelf: 'flex-start' },
  linkInfo: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  linkInfoText: { ...typography.bodySmall, color: colors.onSurfaceVariant, flex: 1, lineHeight: 18 },

  // Header Buttons
  headerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  // Modal Importar desde Libreta
  importModalCard: {
    maxWidth: 580,
    maxHeight: '85%',
  },
  importSearchRow: {
    marginBottom: spacing.sm,
  },
  importScrollList: {
    maxHeight: 340,
  },
  importEmptyText: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  importContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainer,
    padding: spacing.sm,
    borderRadius: shapes.small,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  importContactRowSelected: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  importContactName: {
    ...typography.titleSmall,
    color: colors.onSurface,
    fontWeight: 'bold',
  },
  importContactRole: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  categoryTagSmall: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: shapes.extraSmall,
  },
  categoryTagSmallActor: {
    backgroundColor: colors.tertiaryContainer,
  },
  categoryTagSmallCrew: {
    backgroundColor: colors.secondaryContainer,
  },
  categoryTagSmallText: {
    ...typography.labelSmall,
    fontWeight: 'bold',
  },
  categoryTagSmallTextActor: {
    color: colors.onTertiaryContainer,
  },
  categoryTagSmallTextCrew: {
    color: colors.onSecondaryContainer,
  },

  // Guardar en Libreta Global
  saveGlobalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
  },
  saveGlobalText: {
    ...typography.bodySmall,
    color: colors.onSurface,
    fontWeight: '500',
  },
});
