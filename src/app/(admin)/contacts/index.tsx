// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Libreta de Contactos (M3 Expressive)
// Directorio Central de Actores, Talento y Ayudantes / Crew
// ═══════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  Pressable,
  Platform,
  Linking,
} from 'react-native';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { AppShell } from '@/components/m3/AppShell';
import { InfoCard } from '@/components/m3/InfoCard';
import { ActionButton } from '@/components/m3/ActionButton';
import { AvatarBadge } from '@/components/m3/AvatarBadge';
import { EmptyState } from '@/components/m3/EmptyState';
import { LoadingState } from '@/components/m3/LoadingState';
import { ConfirmDialog } from '@/components/m3/ConfirmDialog';
import { contactService } from '@/services/firebase/contactService';
import { projectService } from '@/services/firebase/projectService';
import { callSheetService } from '@/services/firebase/callSheetService';
import {
  ContactProfile,
  ContactCategory,
  ContactAvailability,
  Project,
  CreateContactData,
  ActorDetails,
} from '@/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';

// ─── Departamentos comunes de producción ─────────────────────────────────────
const DEPARTMENTS = [
  'Todos',
  'Casting / Elenco',
  'Cámara & Video',
  'Iluminación & Gaffer',
  'Sonido Directo',
  'Arte & Escenografía',
  'Vestuario & Maquillaje',
  'Producción & Logística',
  'Dirección & Continuidad',
  'Post-Producción & VFX',
  'Otros / Asistentes',
];

// ─── Formulario de Contacto ──────────────────────────────────────────────────
interface ContactFormState {
  name: string;
  category: ContactCategory;
  role: string;
  department: string;
  email: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  agency: string;
  portfolioUrl: string;
  ratePerDay: string;
  availability: ContactAvailability;
  notes: string;
  skillsRaw: string;
  ageRange: string;
  height: string;
  clothingSize: string;
  shoeSize: string;
  eyeColor: string;
  hairColor: string;
}

const emptyContactForm: ContactFormState = {
  name: '',
  category: 'actor',
  role: '',
  department: 'Casting / Elenco',
  email: '',
  phone: '',
  whatsapp: '',
  instagram: '',
  agency: '',
  portfolioUrl: '',
  ratePerDay: '',
  availability: 'available',
  notes: '',
  skillsRaw: '',
  ageRange: '',
  height: '',
  clothingSize: '',
  shoeSize: '',
  eyeColor: '',
  hairColor: '',
};

// ─── Formulario de Llamado Rápido ────────────────────────────────────────────
interface FastCallFormData {
  projectId: string;
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

const emptyFastCallForm: FastCallFormData = {
  projectId: '',
  callDate: '',
  callTime: '08:00',
  arrivalTime: '07:30',
  locationName: '',
  locationAddress: '',
  role: '',
  costume: '',
  instructions: '',
  notes: '',
  contactName: '',
  contactPhone: '',
};

export default function ContactsScreen() {
  const { user } = useUser();
  const router = useRouter();

  // Data
  const [contacts, setContacts] = useState<ContactProfile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'actor' | 'crew' | 'favorite'>('all');
  const [selectedDept, setSelectedDept] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Contacto
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState<ContactFormState>(emptyContactForm);
  const [contactSaving, setContactSaving] = useState(false);
  const [contactModalTab, setContactModalTab] = useState<'basic' | 'casting' | 'notes'>('basic');
  const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false);

  // Modal Detalle
  const [detailContact, setDetailContact] = useState<ContactProfile | null>(null);

  // Modal Llamado
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [selectedContactForCall, setSelectedContactForCall] = useState<ContactProfile | null>(null);
  const [callForm, setCallForm] = useState<FastCallFormData>(emptyFastCallForm);
  const [callGenerating, setCallGenerating] = useState(false);
  const [generatedCallLink, setGeneratedCallLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Modal Eliminar
  const [deleteTarget, setDeleteTarget] = useState<ContactProfile | null>(null);

  // ─── Carga de datos ────────────────────────────────────────────────────────
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [contactsData, projectsData] = await Promise.all([
        contactService.getContacts(),
        projectService.getProjects(),
      ]);
      setContacts(contactsData);
      setProjects(projectsData);
    } catch (e: any) {
      console.error('Error al cargar contactos:', e);
      setError(e.message || 'Error al cargar la libreta de contactos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ─── Filtrado de Contactos ─────────────────────────────────────────────────
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      if (categoryFilter === 'actor' && c.category !== 'actor') return false;
      if (categoryFilter === 'crew' && c.category !== 'crew') return false;
      if (categoryFilter === 'favorite' && c.availability !== 'favorite') return false;

      if (selectedDept !== 'Todos' && c.department !== selectedDept) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchRole = c.role.toLowerCase().includes(q);
        const matchDept = c.department.toLowerCase().includes(q);
        const matchAgency = c.agency?.toLowerCase().includes(q);
        const matchSkills = c.actorDetails?.skills?.some((s) => s.toLowerCase().includes(q));
        const matchNotes = c.notes?.toLowerCase().includes(q);
        if (!matchName && !matchRole && !matchDept && !matchAgency && !matchSkills && !matchNotes) {
          return false;
        }
      }

      return true;
    });
  }, [contacts, categoryFilter, selectedDept, searchQuery]);

  const totalCount = contacts.length;
  const actorsCount = contacts.filter((c) => c.category === 'actor').length;
  const crewCount = contacts.filter((c) => c.category === 'crew').length;
  const availableCount = contacts.filter((c) => c.availability === 'available').length;

  // ─── Handlers Contacto ─────────────────────────────────────────────────────
  const openNewContactModal = (category: ContactCategory = 'actor') => {
    setEditingContactId(null);
    setContactForm({
      ...emptyContactForm,
      category,
      department: category === 'actor' ? 'Casting / Elenco' : 'Cámara & Video',
    });
    setContactModalTab('basic');
    setDepartmentDropdownOpen(false);
    setContactModalVisible(true);
  };

  const openEditContactModal = (contact: ContactProfile) => {
    setEditingContactId(contact.id);
    setContactForm({
      name: contact.name,
      category: contact.category,
      role: contact.role,
      department: contact.department,
      email: contact.email || '',
      phone: contact.phone || '',
      whatsapp: contact.whatsapp || '',
      instagram: contact.instagram || '',
      agency: contact.agency || '',
      portfolioUrl: contact.portfolioUrl || '',
      ratePerDay: contact.ratePerDay || '',
      availability: contact.availability || 'available',
      notes: contact.notes || '',
      skillsRaw: contact.actorDetails?.skills?.join(', ') || contact.tags?.join(', ') || '',
      ageRange: contact.actorDetails?.ageRange || '',
      height: contact.actorDetails?.height || '',
      clothingSize: contact.actorDetails?.clothingSize || '',
      shoeSize: contact.actorDetails?.shoeSize || '',
      eyeColor: contact.actorDetails?.eyeColor || '',
      hairColor: contact.actorDetails?.hairColor || '',
    });
    setContactModalTab('basic');
    setContactModalVisible(true);
  };

  const handleSaveContact = async () => {
    if (!contactForm.name.trim() || !contactForm.role.trim()) {
      setError('Por favor ingresa al menos el nombre y el rol principal.');
      return;
    }

    setContactSaving(true);
    setError(null);
    try {
      const skillsArray = contactForm.skillsRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const actorDetails: ActorDetails | undefined =
        contactForm.category === 'actor'
          ? {
              ageRange: contactForm.ageRange || undefined,
              height: contactForm.height || undefined,
              clothingSize: contactForm.clothingSize || undefined,
              shoeSize: contactForm.shoeSize || undefined,
              eyeColor: contactForm.eyeColor || undefined,
              hairColor: contactForm.hairColor || undefined,
              skills: skillsArray,
            }
          : undefined;

      const dataToSave: CreateContactData = {
        name: contactForm.name.trim(),
        category: contactForm.category,
        role: contactForm.role.trim(),
        department: contactForm.department,
        email: contactForm.email.trim() || undefined,
        phone: contactForm.phone.trim() || undefined,
        whatsapp: contactForm.whatsapp.trim() || undefined,
        instagram: contactForm.instagram.trim().replace(/^@/, '') || undefined,
        agency: contactForm.agency.trim() || undefined,
        portfolioUrl: contactForm.portfolioUrl.trim() || undefined,
        ratePerDay: contactForm.ratePerDay.trim() || undefined,
        availability: contactForm.availability,
        notes: contactForm.notes.trim() || undefined,
        tags: skillsArray,
        actorDetails,
      };

      if (editingContactId) {
        await contactService.updateContact(editingContactId, dataToSave);
      } else {
        await contactService.createContact(dataToSave, user?.id || 'admin');
      }

      setContactModalVisible(false);
      fetchAllData();
    } catch (e: any) {
      console.error('Error al guardar contacto:', e);
      setError(e.message || 'Error al guardar el contacto.');
    } finally {
      setContactSaving(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!deleteTarget) return;
    try {
      await contactService.deleteContact(deleteTarget.id);
      setDeleteTarget(null);
      if (detailContact?.id === deleteTarget.id) setDetailContact(null);
      fetchAllData();
    } catch (e: any) {
      setError(e.message || 'Error al eliminar contacto.');
    }
  };

  // ─── Handlers Llamado ──────────────────────────────────────────────────────
  const openCallSheetModalForContact = (contact: ContactProfile) => {
    setSelectedContactForCall(contact);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const defaultProjectId = projects.length > 0 ? projects[0].id : '';

    setCallForm({
      projectId: defaultProjectId,
      callDate: tomorrowStr,
      callTime: '08:00',
      arrivalTime: '07:30',
      locationName: '',
      locationAddress: '',
      role: contact.role,
      costume: contact.category === 'actor' ? 'Vestuario según personaje' : 'Ropa cómoda negra de trabajo',
      instructions: `Citación para ${contact.name}. Por favor confirmar asistencia en el link adjunto.`,
      notes: '',
      contactName: user?.fullName || 'Producción Encuadre',
      contactPhone: user?.primaryPhoneNumber?.phoneNumber || '+56 9 ',
    });
    setGeneratedCallLink(null);
    setLinkCopied(false);
    setCallModalVisible(true);
  };

  const handleGenerateCallSheetFromContact = async () => {
    if (!selectedContactForCall) return;
    if (!callForm.projectId) {
      setError('Debes seleccionar un proyecto para asociar el llamado.');
      return;
    }
    if (!callForm.callDate || !callForm.callTime || !callForm.locationName || !callForm.locationAddress) {
      setError('Completa la fecha, hora y datos de la locación.');
      return;
    }

    setCallGenerating(true);
    setError(null);
    try {
      const result = await callSheetService.generateCallSheet(
        callForm.projectId,
        {
          participantId: selectedContactForCall.id,
          participantType: selectedContactForCall.category === 'actor' ? 'talent' : 'crew',
          callDate: new Date(callForm.callDate),
          callTime: callForm.callTime,
          arrivalTime: callForm.arrivalTime || callForm.callTime,
          location: {
            name: callForm.locationName,
            address: callForm.locationAddress,
          },
          role: callForm.role || selectedContactForCall.role,
          costume: callForm.costume || undefined,
          instructions: callForm.instructions,
          notes: callForm.notes || undefined,
          productionContact: {
            name: callForm.contactName,
            phone: callForm.contactPhone,
          },
          status: 'pending',
          attachments: [],
        },
        user?.id || 'admin'
      );

      const appUrl =
        process.env.EXPO_PUBLIC_APP_URL ||
        (Platform.OS === 'web' && typeof window !== 'undefined'
          ? window.location.origin
          : 'http://localhost:8081');

      const link = `${appUrl}/call/${result.token}`;
      setGeneratedCallLink(link);
    } catch (e: any) {
      console.error('Error al generar llamado:', e);
      setError(e.message || 'Error al generar link de llamado.');
    } finally {
      setCallGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!generatedCallLink) return;
    try {
      if (Platform.OS === 'web' && navigator.clipboard) {
        await navigator.clipboard.writeText(generatedCallLink);
      }
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch (e) {
      console.error('Error al copiar link:', e);
    }
  };

  const handleSendWhatsApp = () => {
    if (!selectedContactForCall || !generatedCallLink) return;
    const phoneClean = selectedContactForCall.phone?.replace(/[^0-9+]/g, '') || '';
    const proj = projects.find((p) => p.id === callForm.projectId);
    const msg = `Hola ${selectedContactForCall.name}, te comparto el llamado de citación para el rodaje de "${proj?.name || 'Producción'}" (${callForm.callDate}): ${generatedCallLink}`;
    const encoded = encodeURIComponent(msg);
    const waUrl = phoneClean
      ? `https://api.whatsapp.com/send?phone=${phoneClean}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    Linking.openURL(waUrl);
  };

  // ─── Header Right Actions ──────────────────────────────────────────────────
  const headerRight = (
    <View style={styles.headerButtonsRow}>
      <ActionButton
        label="+ Actor"
        variant="filled"
        icon="account-star"
        onPress={() => openNewContactModal('actor')}
        style={[styles.headerBtn, { backgroundColor: colors.tertiaryContainer }]}
        labelStyle={{ color: colors.onTertiaryContainer }}
      />
      <ActionButton
        label="+ Ayudante"
        variant="filled"
        icon="account-wrench"
        onPress={() => openNewContactModal('crew')}
        style={styles.headerBtn}
      />
    </View>
  );

  return (
    <AppShell title="Libreta de Contactos" rightActions={headerRight}>
      <View style={styles.container}>
        {/* Cabecera descriptiva */}
        <View style={styles.introBox}>
          <View style={styles.introTextCol}>
            <Text style={styles.mainHeading}>Directorio de Actores y Ayudantes</Text>
            <Text style={styles.mainSubtitle}>
              Libreta central del grupo para casting, elenco y equipo técnico de producción.
            </Text>
          </View>
        </View>

        {/* KPIs y Estadísticas */}
        <View style={styles.kpiRow}>
          <InfoCard title="Total Contactos" variant="filled" style={styles.kpiCard}>
            <View style={styles.kpiValueRow}>
              <Text style={styles.kpiValue}>{totalCount}</Text>
              <MaterialCommunityIcons name="card-account-phone" size={28} color={colors.primary} />
            </View>
            <Text style={styles.kpiLabel}>Registrados en el sistema</Text>
          </InfoCard>

          <InfoCard title="Actores / Casting" variant="filled" style={styles.kpiCard}>
            <View style={styles.kpiValueRow}>
              <Text style={[styles.kpiValue, { color: colors.tertiary }]}>{actorsCount}</Text>
              <MaterialCommunityIcons name="account-star" size={28} color={colors.tertiary} />
            </View>
            <Text style={styles.kpiLabel}>Elenco y talentos</Text>
          </InfoCard>

          <InfoCard title="Ayudantes / Crew" variant="filled" style={styles.kpiCard}>
            <View style={styles.kpiValueRow}>
              <Text style={[styles.kpiValue, { color: colors.secondary }]}>{crewCount}</Text>
              <MaterialCommunityIcons name="account-wrench" size={28} color={colors.secondary} />
            </View>
            <Text style={styles.kpiLabel}>Equipo técnico y apoyo</Text>
          </InfoCard>

          <InfoCard title="Disponibles" variant="filled" style={styles.kpiCard}>
            <View style={styles.kpiValueRow}>
              <Text style={[styles.kpiValue, { color: colors.success }]}>{availableCount}</Text>
              <MaterialCommunityIcons name="check-decagram" size={28} color={colors.success} />
            </View>
            <Text style={styles.kpiLabel}>Listos para llamado</Text>
          </InfoCard>
        </View>

        {/* Barra de Búsqueda y Filtro de Categoría */}
        <View style={styles.filtersSection}>
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrap}>
              <MaterialCommunityIcons name="magnify" size={20} color={colors.onSurfaceVariant} style={styles.searchIcon} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Buscar por nombre, rol, departamento, destrezas..."
                placeholderTextColor={colors.onSurfaceAlpha38}
                style={[styles.searchInput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
              />
              {!!searchQuery && (
                <Pressable onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                  <MaterialCommunityIcons name="close-circle" size={18} color={colors.onSurfaceVariant} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Categoría Selector Chips */}
          <View style={styles.categoryChipsRow}>
            <Pressable
              onPress={() => setCategoryFilter('all')}
              style={[styles.categoryChip, categoryFilter === 'all' && styles.categoryChipActive]}
            >
              <Text style={[styles.categoryChipText, categoryFilter === 'all' && styles.categoryChipTextActive]}>
                Todos ({totalCount})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setCategoryFilter('actor')}
              style={[
                styles.categoryChip,
                categoryFilter === 'actor' && [styles.categoryChipActive, { backgroundColor: colors.tertiaryContainer, borderColor: colors.tertiary }],
              ]}
            >
              <MaterialCommunityIcons
                name="account-star"
                size={16}
                color={categoryFilter === 'actor' ? colors.onTertiaryContainer : colors.tertiary}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  categoryFilter === 'actor' && [styles.categoryChipTextActive, { color: colors.onTertiaryContainer }],
                ]}
              >
                Actores ({actorsCount})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setCategoryFilter('crew')}
              style={[styles.categoryChip, categoryFilter === 'crew' && styles.categoryChipActive]}
            >
              <MaterialCommunityIcons
                name="account-wrench"
                size={16}
                color={categoryFilter === 'crew' ? colors.onPrimaryContainer : colors.secondary}
              />
              <Text style={[styles.categoryChipText, categoryFilter === 'crew' && styles.categoryChipTextActive]}>
                Ayudantes & Crew ({crewCount})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setCategoryFilter('favorite')}
              style={[
                styles.categoryChip,
                categoryFilter === 'favorite' && [styles.categoryChipActive, { backgroundColor: 'rgba(255, 213, 79, 0.2)', borderColor: colors.warning }],
              ]}
            >
              <MaterialCommunityIcons
                name="star"
                size={16}
                color={categoryFilter === 'favorite' ? colors.warning : colors.onSurfaceVariant}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  categoryFilter === 'favorite' && [styles.categoryChipTextActive, { color: colors.warning }],
                ]}
              >
                Favoritos
              </Text>
            </Pressable>
          </View>

          {/* Departamentos Scroll */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deptScroll} contentContainerStyle={styles.deptScrollContent}>
            {DEPARTMENTS.map((dept) => {
              const isSelected = selectedDept === dept;
              return (
                <Pressable
                  key={dept}
                  onPress={() => setSelectedDept(dept)}
                  style={[styles.deptChip, isSelected && styles.deptChipSelected]}
                >
                  <Text style={[styles.deptChipText, isSelected && styles.deptChipTextSelected]}>
                    {dept}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Mensaje de Error General */}
        {error && (
          <View style={styles.errorBox}>
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Listado de Contactos */}
        {loading ? (
          <LoadingState message="Cargando contactos..." />
        ) : filteredContacts.length === 0 ? (
          <EmptyState
            icon="card-account-phone-outline"
            title="No se encontraron perfiles"
            description={
              searchQuery || selectedDept !== 'Todos' || categoryFilter !== 'all'
                ? 'Intenta ajustar tus filtros de búsqueda.'
                : 'Empieza agregando actores o ayudantes a tu libreta de producción.'
            }
            actionLabel="+ Crear Primer Contacto"
            onActionPress={() => openNewContactModal('actor')}
          />
        ) : (
          <View style={styles.contactsGrid}>
            {filteredContacts.map((contact) => {
              const isActor = contact.category === 'actor';
              const isFav = contact.availability === 'favorite';

              return (
                <View key={contact.id} style={styles.contactCard}>
                  {/* Cabecera de la Tarjeta */}
                  <View style={styles.cardHeader}>
                    <AvatarBadge
                      name={contact.name}
                      size={46}
                      badgeColor={isActor ? colors.tertiary : colors.primary}
                    />

                    <View style={styles.cardHeaderInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.contactName} numberOfLines={1}>
                          {contact.name}
                        </Text>
                        {isFav && <MaterialCommunityIcons name="star" size={16} color={colors.warning} />}
                      </View>

                      <Text style={styles.contactRole} numberOfLines={1}>
                        {contact.role}
                      </Text>

                      <Text style={styles.contactDept} numberOfLines={1}>
                        {contact.department}
                      </Text>
                    </View>

                    {/* Tag de Categoría */}
                    <View
                      style={[
                        styles.categoryBadge,
                        isActor ? styles.categoryBadgeActor : styles.categoryBadgeCrew,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={isActor ? 'account-star' : 'account-wrench'}
                        size={12}
                        color={isActor ? colors.onTertiaryContainer : colors.onPrimaryContainer}
                      />
                      <Text
                        style={[
                          styles.categoryBadgeText,
                          isActor ? styles.categoryBadgeTextActor : styles.categoryBadgeTextCrew,
                        ]}
                      >
                        {isActor ? 'ACTOR' : 'CREW'}
                      </Text>
                    </View>
                  </View>

                  {/* Datos de Contacto Rápidos */}
                  <View style={styles.cardContactRow}>
                    {contact.phone ? (
                      <Pressable
                        onPress={() => Linking.openURL(`tel:${contact.phone}`)}
                        style={styles.contactInfoPill}
                      >
                        <MaterialCommunityIcons name="phone" size={13} color={colors.primary} />
                        <Text style={styles.contactInfoText}>{contact.phone}</Text>
                      </Pressable>
                    ) : null}

                    {contact.whatsapp ? (
                      <Pressable
                        onPress={() => Linking.openURL(`https://wa.me/${contact.whatsapp?.replace(/\D/g, '')}`)}
                        style={[styles.contactInfoPill, styles.contactPillWhatsApp]}
                      >
                        <MaterialCommunityIcons name="whatsapp" size={13} color="#25D366" />
                        <Text style={[styles.contactInfoText, { color: '#25D366' }]}>WA</Text>
                      </Pressable>
                    ) : null}

                    {contact.instagram ? (
                      <Pressable
                        onPress={() => Linking.openURL(`https://instagram.com/${contact.instagram}`)}
                        style={[styles.contactInfoPill, styles.contactPillInstagram]}
                      >
                        <MaterialCommunityIcons name="instagram" size={13} color="#C13584" />
                        <Text style={[styles.contactInfoText, { color: '#C13584' }]}>@{contact.instagram}</Text>
                      </Pressable>
                    ) : null}

                    {contact.email ? (
                      <Pressable
                        onPress={() => Linking.openURL(`mailto:${contact.email}`)}
                        style={styles.contactInfoPill}
                      >
                        <MaterialCommunityIcons name="email-outline" size={13} color={colors.onSurfaceVariant} />
                        <Text style={styles.contactInfoText} numberOfLines={1}>
                          {contact.email}
                        </Text>
                      </Pressable>
                    ) : null}

                    {contact.agency ? (
                      <View style={styles.contactInfoPill}>
                        <MaterialCommunityIcons name="domain" size={13} color={colors.tertiary} />
                        <Text style={styles.contactInfoText}>Agencia: {contact.agency}</Text>
                      </View>
                    ) : null}
                  </View>


                  {/* Ficha Rápida de Casting (si es Actor) */}
                  {isActor && contact.actorDetails && (
                    <View style={styles.actorSpecsRow}>
                      {contact.actorDetails.ageRange ? (
                        <View style={styles.specChip}>
                          <Text style={styles.specChipLabel}>Edad:</Text>
                          <Text style={styles.specChipValue}>{contact.actorDetails.ageRange}</Text>
                        </View>
                      ) : null}
                      {contact.actorDetails.height ? (
                        <View style={styles.specChip}>
                          <Text style={styles.specChipLabel}>Alt:</Text>
                          <Text style={styles.specChipValue}>{contact.actorDetails.height}</Text>
                        </View>
                      ) : null}
                      {contact.actorDetails.clothingSize ? (
                        <View style={styles.specChip}>
                          <Text style={styles.specChipLabel}>Talla:</Text>
                          <Text style={styles.specChipValue}>{contact.actorDetails.clothingSize}</Text>
                        </View>
                      ) : null}
                    </View>
                  )}

                  {/* Destrezas / Tags */}
                  {contact.tags && contact.tags.length > 0 && (
                    <View style={styles.tagsRow}>
                      {contact.tags.slice(0, 3).map((tag, idx) => (
                        <View key={idx} style={styles.tagPill}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                      {contact.tags.length > 3 && (
                        <Text style={styles.moreTagsText}>+{contact.tags.length - 3}</Text>
                      )}
                    </View>
                  )}

                  {/* Barra de Acciones de la Tarjeta */}
                  <View style={styles.cardActions}>
                    <ActionButton
                      label="Generar Llamado"
                      variant="filled"
                      icon="calendar-plus"
                      onPress={() => openCallSheetModalForContact(contact)}
                      style={styles.generateCallBtn}
                      labelStyle={{ fontSize: 13, fontWeight: '700' }}
                    />

                    <View style={styles.cardSecondaryActions}>
                      <Pressable
                        onPress={() => setDetailContact(contact)}
                        style={styles.cardIconBtn}
                        accessibilityLabel="Ver Ficha"
                      >
                        <MaterialCommunityIcons name="card-account-details-outline" size={18} color={colors.onSurfaceVariant} />
                      </Pressable>

                      <Pressable
                        onPress={() => openEditContactModal(contact)}
                        style={styles.cardIconBtn}
                        accessibilityLabel="Editar"
                      >
                        <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.onSurfaceVariant} />
                      </Pressable>

                      <Pressable
                        onPress={() => setDeleteTarget(contact)}
                        style={styles.cardIconBtn}
                        accessibilityLabel="Eliminar"
                      >
                        <MaterialCommunityIcons name="delete-outline" size={18} color={colors.error} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: Crear / Editar Contacto                                         */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={contactModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setContactModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.contactFormModal]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingContactId ? 'Editar Contacto' : 'Nuevo Contacto'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {contactForm.category === 'actor'
                    ? 'Ficha de actor, talento o elenco'
                    : 'Ficha de ayudante, técnico o equipo'}
                </Text>
              </View>
              <Pressable onPress={() => setContactModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>

            {/* Selector de Categoría */}
            <View style={styles.categoryToggleRow}>
              <Pressable
                onPress={() =>
                  setContactForm({
                    ...contactForm,
                    category: 'actor',
                    department: 'Casting / Elenco',
                  })
                }
                style={[
                  styles.categoryToggleBtn,
                  contactForm.category === 'actor' && styles.categoryToggleBtnActiveActor,
                ]}
              >
                <MaterialCommunityIcons
                  name="account-star"
                  size={20}
                  color={contactForm.category === 'actor' ? colors.onTertiaryContainer : colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    styles.categoryToggleText,
                    contactForm.category === 'actor' && styles.categoryToggleTextActive,
                  ]}
                >
                  Actor / Talento
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  setContactForm({
                    ...contactForm,
                    category: 'crew',
                    department: 'Cámara & Video',
                  })
                }
                style={[
                  styles.categoryToggleBtn,
                  contactForm.category === 'crew' && styles.categoryToggleBtnActiveCrew,
                ]}
              >
                <MaterialCommunityIcons
                  name="account-wrench"
                  size={20}
                  color={contactForm.category === 'crew' ? colors.onPrimaryContainer : colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    styles.categoryToggleText,
                    contactForm.category === 'crew' && styles.categoryToggleTextActive,
                  ]}
                >
                  Ayudante / Crew
                </Text>
              </Pressable>
            </View>

            {/* Pestañas del Formulario */}
            <View style={styles.modalTabsRow}>
              <Pressable
                onPress={() => setContactModalTab('basic')}
                style={[styles.modalTab, contactModalTab === 'basic' && styles.modalTabActive]}
              >
                <Text style={[styles.modalTabLabel, contactModalTab === 'basic' && styles.modalTabLabelActive]}>
                  1. Datos Principales
                </Text>
              </Pressable>

              {contactForm.category === 'actor' && (
                <Pressable
                  onPress={() => setContactModalTab('casting')}
                  style={[styles.modalTab, contactModalTab === 'casting' && styles.modalTabActive]}
                >
                  <Text style={[styles.modalTabLabel, contactModalTab === 'casting' && styles.modalTabLabelActive]}>
                    2. Ficha de Casting
                  </Text>
                </Pressable>
              )}

              <Pressable
                onPress={() => setContactModalTab('notes')}
                style={[styles.modalTab, contactModalTab === 'notes' && styles.modalTabActive]}
              >
                <Text style={[styles.modalTabLabel, contactModalTab === 'notes' && styles.modalTabLabelActive]}>
                  {contactForm.category === 'actor' ? '3. Notas & Redes' : '2. Notas & Tarifas'}
                </Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
              {/* TAB 1: DATOS PRINCIPALES */}
              {contactModalTab === 'basic' && (
                <View style={styles.formSection}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Nombre completo *</Text>
                    <TextInput
                      value={contactForm.name}
                      onChangeText={(v) => setContactForm({ ...contactForm, name: v })}
                      placeholder="Ej. Rodrigo Morales / Sofía Valenzuela"
                      placeholderTextColor={colors.onSurfaceAlpha38}
                      style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                    />
                  </View>

                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1, minWidth: 200 }]}>
                      <Text style={styles.inputLabel}>Rol / Cargo Principal *</Text>
                      <TextInput
                        value={contactForm.role}
                        onChangeText={(v) => setContactForm({ ...contactForm, role: v })}
                        placeholder={contactForm.category === 'actor' ? 'Ej. Protagónico, Coprotagónico' : 'Ej. Gaffer, Asistente Cámara'}
                        placeholderTextColor={colors.onSurfaceAlpha38}
                        style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1, minWidth: 200 }]}>
                      <Text style={styles.inputLabel}>Departamento</Text>
                      {/* ── Departamento: select nativo en web, chips en móvil ── */}
                      {Platform.OS === 'web' ? (
                        <View style={styles.deptSelectWrap}>
                          <select
                            value={contactForm.department}
                            onChange={(e) =>
                              setContactForm({ ...contactForm, department: (e.target as HTMLSelectElement).value })
                            }
                            style={{
                              height: 44,
                              backgroundColor: colors.surfaceContainer,
                              borderRadius: shapes.small,
                              paddingLeft: 14,
                              paddingRight: 36,
                              color: colors.onSurface,
                              border: `1px solid ${colors.outlineVariant}`,
                              fontSize: 14,
                              fontFamily: 'inherit',
                              width: '100%',
                              outline: 'none',
                              appearance: 'none',
                              WebkitAppearance: 'none',
                              cursor: 'pointer',
                              transition: 'border-color 150ms ease, box-shadow 150ms ease',
                            } as any}
                          >
                            {DEPARTMENTS.filter((d) => d !== 'Todos').map((dept) => (
                              <option key={dept} value={dept}>{dept}</option>
                            ))}
                          </select>
                          <View style={styles.deptSelectChevron} pointerEvents="none">
                            <MaterialCommunityIcons name="chevron-down" size={18} color={colors.onSurfaceVariant} />
                          </View>
                        </View>
                      ) : (
                        /* ── Móvil: botón que abre panel de chips ── */
                        <View>
                          <Pressable
                            onPress={() => setDepartmentDropdownOpen(!departmentDropdownOpen)}
                            style={styles.deptMobileTrigger}
                          >
                            <Text style={styles.deptMobileTriggerText} numberOfLines={1}>
                              {contactForm.department}
                            </Text>
                            <MaterialCommunityIcons
                              name={departmentDropdownOpen ? 'chevron-up' : 'chevron-down'}
                              size={18}
                              color={colors.onSurfaceVariant}
                            />
                          </Pressable>
                          {departmentDropdownOpen && (
                            <View style={styles.deptChipPanel}>
                              {DEPARTMENTS.filter((d) => d !== 'Todos').map((dept) => {
                                const isActive = contactForm.department === dept;
                                return (
                                  <Pressable
                                    key={dept}
                                    onPress={() => {
                                      setContactForm({ ...contactForm, department: dept });
                                      setDepartmentDropdownOpen(false);
                                    }}
                                    style={[styles.deptPanelChip, isActive && styles.deptPanelChipActive]}
                                  >
                                    {isActive && (
                                      <MaterialCommunityIcons name="check" size={14} color={colors.onPrimaryContainer} />
                                    )}
                                    <Text style={[styles.deptPanelChipText, isActive && styles.deptPanelChipTextActive]}>
                                      {dept}
                                    </Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1, minWidth: 200 }]}>
                      <Text style={styles.inputLabel}>Teléfono</Text>
                      <View style={styles.inputWithIcon}>
                        <TextInput
                          value={contactForm.phone}
                          onChangeText={(v) => setContactForm({ ...contactForm, phone: v })}
                          placeholder="+56 9 1234 5678"
                          placeholderTextColor={colors.onSurfaceAlpha38}
                          keyboardType="phone-pad"
                          style={[styles.input, styles.inputIconPad, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                        />
                      </View>
                    </View>

                    <View style={[styles.inputGroup, { flex: 1, minWidth: 200 }]}>
                      <Text style={styles.inputLabel}>WhatsApp</Text>
                      <View style={styles.inputWithIcon}>
                        <TextInput
                          value={contactForm.whatsapp}
                          onChangeText={(v) => setContactForm({ ...contactForm, whatsapp: v })}
                          placeholder="+56 9 1234 5678"
                          placeholderTextColor={colors.onSurfaceAlpha38}
                          keyboardType="phone-pad"
                          style={[styles.input, styles.inputIconPad, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1, minWidth: 200 }]}>
                      <Text style={styles.inputLabel}>Correo electrónico</Text>
                      <TextInput
                        value={contactForm.email}
                        onChangeText={(v) => setContactForm({ ...contactForm, email: v })}
                        placeholder="contacto@ejemplo.cl"
                        placeholderTextColor={colors.onSurfaceAlpha38}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1, minWidth: 200 }]}>
                      <Text style={styles.inputLabel}>Instagram</Text>
                      <View style={styles.inputWithIcon}>
                        <Text style={styles.inputPrefix}>@</Text>
                        <TextInput
                          value={contactForm.instagram}
                          onChangeText={(v) => setContactForm({ ...contactForm, instagram: v.replace(/^@/, '') })}
                          placeholder="usuario"
                          placeholderTextColor={colors.onSurfaceAlpha38}
                          autoCapitalize="none"
                          autoCorrect={false}
                          style={[styles.input, styles.inputIconPad, { flex: 1, borderLeftWidth: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                        />
                      </View>
                    </View>
                  </View>


                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1, minWidth: 200 }]}>
                      <Text style={styles.inputLabel}>Agencia / Representante</Text>
                      <TextInput
                        value={contactForm.agency}
                        onChangeText={(v) => setContactForm({ ...contactForm, agency: v })}
                        placeholder="Ej. Talent Agency Chile / Independiente"
                        placeholderTextColor={colors.onSurfaceAlpha38}
                        style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1, minWidth: 200 }]}>
                      <Text style={styles.inputLabel}>Disponibilidad</Text>
                      <View style={styles.availabilityRow}>
                        <Pressable
                          onPress={() => setContactForm({ ...contactForm, availability: 'available' })}
                          style={[
                            styles.availChip,
                            contactForm.availability === 'available' && styles.availChipActiveSuccess,
                          ]}
                        >
                          <Text style={styles.availChipText}>Disponible</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setContactForm({ ...contactForm, availability: 'favorite' })}
                          style={[
                            styles.availChip,
                            contactForm.availability === 'favorite' && styles.availChipActiveFav,
                          ]}
                        >
                          <MaterialCommunityIcons name="star" size={14} color={colors.warning} />
                          <Text style={styles.availChipText}>Favorito</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setContactForm({ ...contactForm, availability: 'busy' })}
                          style={[
                            styles.availChip,
                            contactForm.availability === 'busy' && styles.availChipActiveBusy,
                          ]}
                        >
                          <Text style={styles.availChipText}>Ocupado</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* TAB 2: FICHA DE CASTING */}
              {contactModalTab === 'casting' && contactForm.category === 'actor' && (
                <View style={styles.formSection}>
                  <Text style={styles.subSectionTitle}>Medidas y Rasgos Físicos</Text>

                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1, minWidth: 140 }]}>
                      <Text style={styles.inputLabel}>Rango de Edad</Text>
                      <TextInput
                        value={contactForm.ageRange}
                        onChangeText={(v) => setContactForm({ ...contactForm, ageRange: v })}
                        placeholder="Ej. 25-35 años"
                        placeholderTextColor={colors.onSurfaceAlpha38}
                        style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1, minWidth: 140 }]}>
                      <Text style={styles.inputLabel}>Estatura (m)</Text>
                      <TextInput
                        value={contactForm.height}
                        onChangeText={(v) => setContactForm({ ...contactForm, height: v })}
                        placeholder="Ej. 1.78 m"
                        placeholderTextColor={colors.onSurfaceAlpha38}
                        style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                      />
                    </View>
                  </View>

                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1, minWidth: 140 }]}>
                      <Text style={styles.inputLabel}>Talla de Vestuario</Text>
                      <TextInput
                        value={contactForm.clothingSize}
                        onChangeText={(v) => setContactForm({ ...contactForm, clothingSize: v })}
                        placeholder="Ej. M / 42"
                        placeholderTextColor={colors.onSurfaceAlpha38}
                        style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1, minWidth: 140 }]}>
                      <Text style={styles.inputLabel}>Calzado</Text>
                      <TextInput
                        value={contactForm.shoeSize}
                        onChangeText={(v) => setContactForm({ ...contactForm, shoeSize: v })}
                        placeholder="Ej. 41"
                        placeholderTextColor={colors.onSurfaceAlpha38}
                        style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                      />
                    </View>
                  </View>

                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1, minWidth: 140 }]}>
                      <Text style={styles.inputLabel}>Color de Ojos</Text>
                      <TextInput
                        value={contactForm.eyeColor}
                        onChangeText={(v) => setContactForm({ ...contactForm, eyeColor: v })}
                        placeholder="Ej. Café, Verde, Azul"
                        placeholderTextColor={colors.onSurfaceAlpha38}
                        style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1, minWidth: 140 }]}>
                      <Text style={styles.inputLabel}>Color de Pelo</Text>
                      <TextInput
                        value={contactForm.hairColor}
                        onChangeText={(v) => setContactForm({ ...contactForm, hairColor: v })}
                        placeholder="Ej. Castaño, Rubio"
                        placeholderTextColor={colors.onSurfaceAlpha38}
                        style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Habilidades / Destrezas Especiales (separadas por coma)</Text>
                    <TextInput
                      value={contactForm.skillsRaw}
                      onChangeText={(v) => setContactForm({ ...contactForm, skillsRaw: v })}
                      placeholder="Ej. Acento neutro, Inglés fluido, Combate escénico, Canto, Danza"
                      placeholderTextColor={colors.onSurfaceAlpha38}
                      style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                    />
                  </View>
                </View>
              )}

              {/* TAB 3: NOTAS, REDES Y TARIFAS */}
              {contactModalTab === 'notes' && (
                <View style={styles.formSection}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Enlace Showreel / Portafolio / IMDb / Vimeo</Text>
                    <TextInput
                      value={contactForm.portfolioUrl}
                      onChangeText={(v) => setContactForm({ ...contactForm, portfolioUrl: v })}
                      placeholder="https://vimeo.com/... o https://imdb.com/..."
                      placeholderTextColor={colors.onSurfaceAlpha38}
                      style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Tarifa referencial por jornada (opcional)</Text>
                    <TextInput
                      value={contactForm.ratePerDay}
                      onChangeText={(v) => setContactForm({ ...contactForm, ratePerDay: v })}
                      placeholder="Ej. $150.000 / jornada + IVA"
                      placeholderTextColor={colors.onSurfaceAlpha38}
                      style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                    />
                  </View>

                  {contactForm.category === 'crew' && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Especialidades / Herramientas (separadas por coma)</Text>
                      <TextInput
                        value={contactForm.skillsRaw}
                        onChangeText={(v) => setContactForm({ ...contactForm, skillsRaw: v })}
                        placeholder="Ej. ARRI Alexa, Steadicam, DaVinci Resolve, Drone"
                        placeholderTextColor={colors.onSurfaceAlpha38}
                        style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                      />
                    </View>
                  )}

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Notas de producción internas</Text>
                    <TextInput
                      value={contactForm.notes}
                      onChangeText={(v) => setContactForm({ ...contactForm, notes: v })}
                      placeholder="Comentarios sobre puntualidad, restricciones alimentarias, etc."
                      placeholderTextColor={colors.onSurfaceAlpha38}
                      multiline
                      numberOfLines={3}
                      style={[styles.input, styles.textarea, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                    />
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <ActionButton
                label="Cancelar"
                variant="outlined"
                onPress={() => setContactModalVisible(false)}
              />
              <ActionButton
                label={editingContactId ? 'Actualizar Contacto' : 'Guardar Contacto'}
                variant="filled"
                icon="check"
                onPress={handleSaveContact}
                loading={contactSaving}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: Generador Rápido de Llamado                                    */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={callModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCallModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.callModalCard]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Generar Llamado Individual</Text>
                <Text style={styles.modalSubtitle}>
                  Citación oficial para {selectedContactForCall?.name} ({selectedContactForCall?.role})
                </Text>
              </View>
              <Pressable onPress={() => setCallModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
              {generatedCallLink ? (
                /* RESULTADO: LINK GENERADO */
                <View style={styles.linkGeneratedSuccessBox}>
                  <View style={styles.successIconRow}>
                    <MaterialCommunityIcons name="check-circle" size={48} color={colors.success} />
                    <Text style={styles.successTitle}>¡Link de Llamado Generado!</Text>
                    <Text style={styles.successSubtitle}>
                      Comparte este enlace con {selectedContactForCall?.name}. Podrá ver el plan de rodaje, ubicación GPS y confirmar asistencia sin login.
                    </Text>
                  </View>

                  <View style={styles.linkBox}>
                    <Text style={styles.linkText} selectable numberOfLines={2}>
                      {generatedCallLink}
                    </Text>
                  </View>

                  <View style={styles.shareButtonsRow}>
                    <ActionButton
                      label={linkCopied ? '¡Copiado!' : 'Copiar Link'}
                      variant={linkCopied ? 'filled' : 'outlined'}
                      icon={linkCopied ? 'check' : 'content-copy'}
                      onPress={handleCopyLink}
                      style={{ flex: 1 }}
                    />

                    <ActionButton
                      label="Enviar por WhatsApp"
                      variant="filled"
                      icon="whatsapp"
                      onPress={handleSendWhatsApp}
                      style={[{ flex: 1, backgroundColor: '#25D366' }]}
                      labelStyle={{ color: '#000000', fontWeight: 'bold' }}
                    />
                  </View>

                  <ActionButton
                    label="Ver Pantalla Pública"
                    variant="tonal"
                    icon="open-in-new"
                    onPress={() => Linking.openURL(generatedCallLink)}
                    style={{ marginTop: spacing.sm }}
                  />

                  <ActionButton
                    label="Cerrar"
                    variant="text"
                    onPress={() => setCallModalVisible(false)}
                    style={{ marginTop: spacing.xs }}
                  />
                </View>
              ) : (
                /* FORMULARIO DE CITACIÓN */
                <View style={styles.callFormBody}>
                  {/* Selector de Proyecto */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Selecciona el Proyecto / Producción *</Text>
                    {projects.length === 0 ? (
                      <Text style={styles.warningText}>No hay proyectos registrados. Crea un proyecto primero.</Text>
                    ) : (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.projectPickerScroll}>
                        {projects.map((proj) => {
                          const isSelected = callForm.projectId === proj.id;
                          return (
                            <Pressable
                              key={proj.id}
                              onPress={() => setCallForm({ ...callForm, projectId: proj.id })}
                              style={[
                                styles.projectPickerCard,
                                isSelected && styles.projectPickerCardSelected,
                              ]}
                            >
                              <MaterialCommunityIcons
                                name="movie-roll"
                                size={18}
                                color={isSelected ? colors.primary : colors.onSurfaceVariant}
                              />
                              <Text
                                style={[
                                  styles.projectPickerName,
                                  isSelected && styles.projectPickerNameSelected,
                                ]}
                                numberOfLines={1}
                              >
                                {proj.name}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>

                  {/* Jornada */}
                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1, minWidth: 120 }]}>
                      <Text style={styles.inputLabel}>Fecha de Rodaje *</Text>
                      <TextInput
                        value={callForm.callDate}
                        onChangeText={(v) => setCallForm({ ...callForm, callDate: v })}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.onSurfaceAlpha38}
                        style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1, minWidth: 100 }]}>
                      <Text style={styles.inputLabel}>Hora Citación *</Text>
                      <TextInput
                        value={callForm.callTime}
                        onChangeText={(v) => setCallForm({ ...callForm, callTime: v })}
                        placeholder="08:00"
                        placeholderTextColor={colors.onSurfaceAlpha38}
                        style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1, minWidth: 100 }]}>
                      <Text style={styles.inputLabel}>Hora Llegada</Text>
                      <TextInput
                        value={callForm.arrivalTime}
                        onChangeText={(v) => setCallForm({ ...callForm, arrivalTime: v })}
                        placeholder="07:30"
                        placeholderTextColor={colors.onSurfaceAlpha38}
                        style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                      />
                    </View>
                  </View>

                  {/* Locación */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Nombre del Set / Locación *</Text>
                    <TextInput
                      value={callForm.locationName}
                      onChangeText={(v) => setCallForm({ ...callForm, locationName: v })}
                      placeholder="Ej. Estudio Principal Encuadre / Casa Quinta Normal"
                      placeholderTextColor={colors.onSurfaceAlpha38}
                      style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Dirección Completa *</Text>
                    <TextInput
                      value={callForm.locationAddress}
                      onChangeText={(v) => setCallForm({ ...callForm, locationAddress: v })}
                      placeholder="Ej. Av. Providencia 1234, Santiago"
                      placeholderTextColor={colors.onSurfaceAlpha38}
                      style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                    />
                  </View>

                  {/* Rol y Vestuario */}
                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1, minWidth: 160 }]}>
                      <Text style={styles.inputLabel}>Rol en Citación</Text>
                      <TextInput
                        value={callForm.role}
                        onChangeText={(v) => setCallForm({ ...callForm, role: v })}
                        placeholder="Rol"
                        placeholderTextColor={colors.onSurfaceAlpha38}
                        style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1, minWidth: 160 }]}>
                      <Text style={styles.inputLabel}>Vestuario / Equipamiento</Text>
                      <TextInput
                        value={callForm.costume}
                        onChangeText={(v) => setCallForm({ ...callForm, costume: v })}
                        placeholder="Indicaciones de vestuario"
                        placeholderTextColor={colors.onSurfaceAlpha38}
                        style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                      />
                    </View>
                  </View>

                  {/* Instrucciones */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Instrucciones para el participante</Text>
                    <TextInput
                      value={callForm.instructions}
                      onChangeText={(v) => setCallForm({ ...callForm, instructions: v })}
                      placeholder="Indicaciones de rodaje, catering, estacionamiento, etc."
                      placeholderTextColor={colors.onSurfaceAlpha38}
                      multiline
                      numberOfLines={2}
                      style={[styles.input, styles.textarea, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                    />
                  </View>

                  {/* Contacto de Producción */}
                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1, minWidth: 160 }]}>
                      <Text style={styles.inputLabel}>Contacto en Set (Nombre)</Text>
                      <TextInput
                        value={callForm.contactName}
                        onChangeText={(v) => setCallForm({ ...callForm, contactName: v })}
                        placeholder="Productor a cargo"
                        placeholderTextColor={colors.onSurfaceAlpha38}
                        style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1, minWidth: 160 }]}>
                      <Text style={styles.inputLabel}>Teléfono Contacto</Text>
                      <TextInput
                        value={callForm.contactPhone}
                        onChangeText={(v) => setCallForm({ ...callForm, contactPhone: v })}
                        placeholder="+56 9 ..."
                        placeholderTextColor={colors.onSurfaceAlpha38}
                        style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                      />
                    </View>
                  </View>

                  <View style={styles.modalActions}>
                    <ActionButton
                      label="Cancelar"
                      variant="outlined"
                      onPress={() => setCallModalVisible(false)}
                    />
                    <ActionButton
                      label="Generar Link de Llamado"
                      variant="filled"
                      icon="link-variant"
                      onPress={handleGenerateCallSheetFromContact}
                      loading={callGenerating}
                    />
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: Ficha Detallada de Contacto                                    */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={!!detailContact}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailContact(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.detailModalCard]}>
            {detailContact && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.detailHeaderLeft}>
                    <AvatarBadge
                      name={detailContact.name}
                      size={56}
                      badgeColor={detailContact.category === 'actor' ? colors.tertiary : colors.primary}
                    />
                    <View style={{ gap: 2 }}>
                      <Text style={styles.detailName}>{detailContact.name}</Text>
                      <Text style={styles.detailRole}>
                        {detailContact.role} • {detailContact.department}
                      </Text>
                      <Text style={styles.detailCategoryTag}>
                        {detailContact.category === 'actor' ? '🎭 ACTOR / TALENTO' : '🛠️ AYUDANTE / CREW'}
                      </Text>
                    </View>
                  </View>
                  <Pressable onPress={() => setDetailContact(null)}>
                    <MaterialCommunityIcons name="close" size={24} color={colors.onSurfaceVariant} />
                  </Pressable>
                </View>

                <ScrollView style={styles.detailBodyScroll} showsVerticalScrollIndicator={false}>
                  {/* Contact Channels */}
                  <View style={styles.detailSection}>
                    <View style={styles.detailSectionTitleRow}>
                      <MaterialCommunityIcons name="phone-outline" size={16} color={colors.primary} />
                      <Text style={styles.detailSectionTitle}>Canales de Contacto</Text>
                    </View>
                    <View style={styles.detailGrid}>
                      {detailContact.phone && (
                        <Pressable
                          onPress={() => Linking.openURL(`tel:${detailContact.phone}`)}
                          style={styles.detailItem}
                        >
                          <MaterialCommunityIcons name="phone" size={16} color={colors.primary} />
                          <Text style={styles.detailItemText}>{detailContact.phone}</Text>
                        </Pressable>
                      )}
                      {detailContact.whatsapp && (
                        <Pressable
                          onPress={() => Linking.openURL(`https://wa.me/${detailContact.whatsapp?.replace(/\D/g, '')}`)}
                          style={[styles.detailItem, { borderLeftWidth: 3, borderLeftColor: '#25D366' }]}
                        >
                          <MaterialCommunityIcons name="whatsapp" size={16} color="#25D366" />
                          <Text style={[styles.detailItemText, { color: '#25D366', fontWeight: '600' }]}>
                            WhatsApp · {detailContact.whatsapp}
                          </Text>
                        </Pressable>
                      )}
                      {detailContact.instagram && (
                        <Pressable
                          onPress={() => Linking.openURL(`https://instagram.com/${detailContact.instagram}`)}
                          style={[styles.detailItem, { borderLeftWidth: 3, borderLeftColor: '#C13584' }]}
                        >
                          <MaterialCommunityIcons name="instagram" size={16} color="#C13584" />
                          <Text style={[styles.detailItemText, { color: '#C13584', fontWeight: '600' }]}>
                            @{detailContact.instagram}
                          </Text>
                        </Pressable>
                      )}
                      {detailContact.email && (
                        <Pressable
                          onPress={() => Linking.openURL(`mailto:${detailContact.email}`)}
                          style={styles.detailItem}
                        >
                          <MaterialCommunityIcons name="email-outline" size={16} color={colors.onSurfaceVariant} />
                          <Text style={styles.detailItemText}>{detailContact.email}</Text>
                        </Pressable>
                      )}
                      {detailContact.agency && (
                        <View style={styles.detailItem}>
                          <MaterialCommunityIcons name="domain" size={16} color={colors.tertiary} />
                          <Text style={styles.detailItemText}>Agencia: {detailContact.agency}</Text>
                        </View>
                      )}
                      {detailContact.portfolioUrl && (
                        <Pressable
                          onPress={() => Linking.openURL(detailContact.portfolioUrl!)}
                          style={styles.detailItem}
                        >
                          <MaterialCommunityIcons name="open-in-new" size={16} color={colors.primary} />
                          <Text style={[styles.detailItemText, { color: colors.primary, textDecorationLine: 'underline' }]}>
                            Ver Showreel / Portafolio
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>


                  {/* Ficha de Casting */}
                  {detailContact.category === 'actor' && detailContact.actorDetails && (
                    <View style={styles.detailSection}>
                      <View style={styles.detailSectionTitleRow}>
                        <MaterialCommunityIcons name="account-star-outline" size={16} color={colors.primary} />
                        <Text style={styles.detailSectionTitle}>Ficha de Casting & Tallas</Text>
                      </View>
                      <View style={styles.castingSpecsGrid}>
                        {detailContact.actorDetails.ageRange && (
                          <View style={styles.specBox}>
                            <Text style={styles.specBoxLabel}>Rango Edad</Text>
                            <Text style={styles.specBoxVal}>{detailContact.actorDetails.ageRange}</Text>
                          </View>
                        )}
                        {detailContact.actorDetails.height && (
                          <View style={styles.specBox}>
                            <Text style={styles.specBoxLabel}>Estatura</Text>
                            <Text style={styles.specBoxVal}>{detailContact.actorDetails.height}</Text>
                          </View>
                        )}
                        {detailContact.actorDetails.clothingSize && (
                          <View style={styles.specBox}>
                            <Text style={styles.specBoxLabel}>Talla Ropa</Text>
                            <Text style={styles.specBoxVal}>{detailContact.actorDetails.clothingSize}</Text>
                          </View>
                        )}
                        {detailContact.actorDetails.shoeSize && (
                          <View style={styles.specBox}>
                            <Text style={styles.specBoxLabel}>Calzado</Text>
                            <Text style={styles.specBoxVal}>{detailContact.actorDetails.shoeSize}</Text>
                          </View>
                        )}
                        {detailContact.actorDetails.eyeColor && (
                          <View style={styles.specBox}>
                            <Text style={styles.specBoxLabel}>Ojos</Text>
                            <Text style={styles.specBoxVal}>{detailContact.actorDetails.eyeColor}</Text>
                          </View>
                        )}
                        {detailContact.actorDetails.hairColor && (
                          <View style={styles.specBox}>
                            <Text style={styles.specBoxLabel}>Pelo</Text>
                            <Text style={styles.specBoxVal}>{detailContact.actorDetails.hairColor}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Habilidades & Tags */}
                  {detailContact.tags && detailContact.tags.length > 0 && (
                    <View style={styles.detailSection}>
                      <View style={styles.detailSectionTitleRow}>
                        <MaterialCommunityIcons name="star-outline" size={16} color={colors.primary} />
                        <Text style={styles.detailSectionTitle}>Destrezas & Especialidades</Text>
                      </View>
                      <View style={styles.skillsWrap}>
                        {detailContact.tags.map((tag, i) => (
                          <View key={i} style={styles.skillBadge}>
                            <Text style={styles.skillBadgeText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Tarifa & Notas */}
                  {(detailContact.ratePerDay || detailContact.notes) && (
                    <View style={styles.detailSection}>
                      <View style={styles.detailSectionTitleRow}>
                        <MaterialCommunityIcons name="note-text-outline" size={16} color={colors.primary} />
                        <Text style={styles.detailSectionTitle}>Notas de Producción</Text>
                      </View>
                      {detailContact.ratePerDay && (
                        <Text style={styles.detailRateText}>
                          Tarifa estimada: <Text style={{ color: colors.onSurface, fontWeight: 'bold' }}>{detailContact.ratePerDay}</Text>
                        </Text>
                      )}
                      {detailContact.notes && (
                        <Text style={styles.detailNotesText}>{detailContact.notes}</Text>
                      )}
                    </View>
                  )}
                </ScrollView>

                <View style={styles.modalActions}>
                  <ActionButton
                    label="Editar"
                    variant="outlined"
                    icon="pencil"
                    onPress={() => {
                      const c = detailContact;
                      setDetailContact(null);
                      openEditContactModal(c);
                    }}
                  />
                  <ActionButton
                    label="Generar Llamado"
                    variant="filled"
                    icon="calendar-plus"
                    onPress={() => {
                      const c = detailContact;
                      setDetailContact(null);
                      openCallSheetModalForContact(c);
                    }}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* DIALOG: Confirmar Eliminación                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <ConfirmDialog
        visible={!!deleteTarget}
        title="Eliminar Contacto"
        message={`¿Confirmas eliminar a "${deleteTarget?.name}" de la libreta general? Los llamados ya emitidos se mantendrán vigentes.`}
        confirmLabel="Eliminar"
        onConfirm={handleDeleteContact}
        onCancel={() => setDeleteTarget(null)}
        isDestructive
      />
    </AppShell>
  );
}

// ─── Estilos MD3 Expressive ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  headerButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerBtn: {
    height: 38,
  },
  introBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  introTextCol: {
    gap: spacing.xs,
  },
  mainHeading: {
    ...typography.headlineMedium,
    color: colors.onSurface,
    fontWeight: 'bold',
  },
  mainSubtitle: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
  },

  // KPIs
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.base,
    flexWrap: 'wrap',
  },
  kpiCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: colors.surfaceContainerLow,
  },
  kpiValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  kpiValue: {
    ...typography.displaySmall,
    color: colors.primary,
    fontWeight: 'bold',
  },
  kpiLabel: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },

  // Filtros
  filtersSection: {
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.base,
    borderRadius: shapes.large,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    gap: spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: shapes.small,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.base,
    height: 44,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.onSurface,
    ...typography.bodyMedium,
  },
  clearSearchBtn: {
    padding: spacing.xs,
  },
  categoryChipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceContainer,
    borderRadius: shapes.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1), background-color 200ms ease',
      } as any,
    }),
  },
  categoryChipActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  categoryChipText: {
    ...typography.labelMedium,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: colors.onPrimaryContainer,
  },
  deptScroll: {
    marginTop: spacing.xs,
  },
  deptScrollContent: {
    gap: spacing.xs,
  },
  deptChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: shapes.full,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1), background-color 200ms ease',
      } as any,
    }),
  },
  deptChipSelected: {
    backgroundColor: colors.surfaceBright,
    borderColor: colors.primary,
  },
  deptChipText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  deptChipTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,180,171,0.15)',
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: shapes.medium,
    padding: spacing.base,
  },
  errorText: {
    ...typography.bodyMedium,
    color: colors.error,
    flex: 1,
  },

  // Grid de Contactos
  contactsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.base,
  },
  contactCard: {
    flexBasis: 320,
    flexGrow: 1,
    backgroundColor: colors.surfaceContainer,
    borderRadius: shapes.large,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.base,
    gap: spacing.md,
    ...Platform.select({
      web: {
        transition: 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 200ms cubic-bezier(0.2, 0, 0, 1), border-color 200ms cubic-bezier(0.2, 0, 0, 1)',
      } as any,
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
  },
  cardHeaderInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  contactName: {
    ...typography.titleMedium,
    color: colors.onSurface,
    fontWeight: 'bold',
  },
  contactRole: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontWeight: '500',
  },
  contactDept: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: shapes.extraSmall,
    alignSelf: 'flex-start',
  },
  categoryBadgeActor: {
    backgroundColor: colors.tertiaryContainer,
  },
  categoryBadgeCrew: {
    backgroundColor: colors.secondaryContainer,
  },
  categoryBadgeText: {
    ...typography.labelSmall,
    fontWeight: 'bold',
  },
  categoryBadgeTextActor: {
    color: colors.onTertiaryContainer,
  },
  categoryBadgeTextCrew: {
    color: colors.onSecondaryContainer,
  },

  cardContactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  contactInfoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: shapes.extraSmall,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  contactPillWhatsApp: {
    borderColor: 'rgba(37,211,102,0.4)',
    backgroundColor: 'rgba(37,211,102,0.08)',
  },
  contactPillInstagram: {
    borderColor: 'rgba(193,53,132,0.35)',
    backgroundColor: 'rgba(193,53,132,0.07)',
  },
  contactInfoText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },

  actorSpecsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  specChip: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: 'rgba(235, 184, 208, 0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: shapes.extraSmall,
  },
  specChipLabel: {
    ...typography.labelSmall,
    color: colors.tertiary,
    fontWeight: 'bold',
  },
  specChipValue: {
    ...typography.labelSmall,
    color: colors.onSurface,
  },

  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  tagPill: {
    backgroundColor: colors.surfaceContainerHighest,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: shapes.extraSmall,
  },
  tagText: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
  },
  moreTagsText: {
    ...typography.labelSmall,
    color: colors.onSurfaceAlpha38,
  },

  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  generateCallBtn: {
    height: 36,
    paddingHorizontal: spacing.base,
  },
  cardSecondaryActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  cardIconBtn: {
    width: 34,
    height: 34,
    borderRadius: shapes.small,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1), background-color 150ms ease',
      } as any,
    }),
  },

  // Modales
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },
  modalCard: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '90%',
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: shapes.extraLarge,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...Platform.select({
      web: {
        boxShadow: '0 14px 24px -3px rgba(0, 0, 0, 0.45)',
      } as any,
      default: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 8,
      },
    }),
  },
  contactFormModal: {
    maxWidth: 680,
  },
  callModalCard: {
    maxWidth: 680,
  },
  detailModalCard: {
    maxWidth: 600,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.base,
  },
  modalTitle: {
    ...typography.headlineSmall,
    color: colors.onSurface,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  categoryToggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  categoryToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 44,
    borderRadius: shapes.medium,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      } as any,
    }),
  },
  categoryToggleBtnActiveActor: {
    backgroundColor: colors.tertiaryContainer,
    borderColor: colors.tertiary,
  },
  categoryToggleBtnActiveCrew: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  categoryToggleText: {
    ...typography.labelLarge,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  categoryToggleTextActive: {
    color: colors.onSurface,
    fontWeight: 'bold',
  },

  modalTabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    marginBottom: spacing.base,
  },
  modalTab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      } as any,
    }),
  },
  modalTabActive: {
    borderBottomColor: colors.primary,
  },
  modalTabLabel: {
    ...typography.labelMedium,
    color: colors.onSurfaceVariant,
  },
  modalTabLabelActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },

  modalScrollBody: {
    maxHeight: 480,
  },
  formSection: {
    gap: spacing.md,
    paddingBottom: spacing.base,
  },
  subSectionTitle: {
    ...typography.titleSmall,
    color: colors.tertiary,
    fontWeight: 'bold',
    marginTop: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  inputGroup: {
    gap: spacing.xs,
  },
  inputLabel: {
    ...typography.labelMedium,
    color: colors.onSurface,
    fontWeight: '600',
  },
  input: {
    height: 44,
    backgroundColor: colors.surfaceContainer,
    borderRadius: shapes.small,
    paddingHorizontal: spacing.base,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...typography.bodyMedium,
  },
  inputIconPad: {
    flex: 1,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: shapes.small,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },
  inputPrefix: {
    paddingHorizontal: spacing.sm,
    color: colors.onSurfaceVariant,
    ...typography.bodyMedium,
    fontWeight: '600',
  },
  textarea: {
    height: 80,
    paddingVertical: spacing.sm,
    textAlignVertical: 'top',
  },
  availabilityRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  availChip: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: shapes.small,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 150ms ease',
      } as any,
    }),
  },
  availChipActiveSuccess: {
    backgroundColor: 'rgba(129, 199, 132, 0.2)',
    borderColor: colors.success,
  },
  availChipActiveFav: {
    backgroundColor: 'rgba(255, 213, 79, 0.2)',
    borderColor: colors.warning,
  },
  availChipActiveBusy: {
    backgroundColor: 'rgba(255, 180, 171, 0.2)',
    borderColor: colors.error,
  },
  availChipText: {
    ...typography.labelSmall,
    color: colors.onSurface,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.base,
  },

  // Generador de Llamado
  callFormBody: {
    gap: spacing.md,
    paddingBottom: spacing.base,
  },
  warningText: {
    ...typography.bodySmall,
    color: colors.warning,
  },
  projectPickerScroll: {
    marginTop: spacing.xs,
  },
  projectPickerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceContainer,
    borderRadius: shapes.medium,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginRight: spacing.sm,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      } as any,
    }),
  },
  projectPickerCardSelected: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  projectPickerName: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
  },
  projectPickerNameSelected: {
    color: colors.onPrimaryContainer,
    fontWeight: 'bold',
  },
  linkGeneratedSuccessBox: {
    alignItems: 'center',
    gap: spacing.base,
    paddingVertical: spacing.base,
  },
  successIconRow: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  successTitle: {
    ...typography.headlineSmall,
    color: colors.onSurface,
    fontWeight: 'bold',
  },
  successSubtitle: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 480,
  },
  linkBox: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: shapes.medium,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.base,
  },
  linkText: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  shareButtonsRow: {
    flexDirection: 'row',
    gap: spacing.base,
    width: '100%',
  },

  // Ficha Detalle
  detailHeaderLeft: {
    flexDirection: 'row',
    gap: spacing.base,
    alignItems: 'center',
  },
  detailName: {
    ...typography.titleLarge,
    color: colors.onSurface,
    fontWeight: 'bold',
  },
  detailRole: {
    ...typography.bodyMedium,
    color: colors.primary,
  },
  detailCategoryTag: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
    fontWeight: 'bold',
    marginTop: 2,
  },
  detailBodyScroll: {
    maxHeight: 460,
  },
  detailSection: {
    gap: spacing.sm,
    marginBottom: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    paddingTop: spacing.base,
  },
  detailSectionTitle: {
    ...typography.titleSmall,
    color: colors.primary,
    fontWeight: 'bold',
  },
  detailSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  detailCategoryTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  detailGrid: {
    gap: spacing.xs,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.sm,
    borderRadius: shapes.small,
  },
  detailItemText: {
    ...typography.bodyMedium,
    color: colors.onSurface,
  },
  castingSpecsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  specBox: {
    flexBasis: '30%',
    flexGrow: 1,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.sm,
    borderRadius: shapes.small,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
  },
  specBoxLabel: {
    ...typography.labelSmall,
    color: colors.tertiary,
    fontWeight: 'bold',
  },
  specBoxVal: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    fontWeight: '600',
    marginTop: 2,
  },
  skillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  skillBadge: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: shapes.extraSmall,
  },
  skillBadgeText: {
    ...typography.labelSmall,
    color: colors.onPrimaryContainer,
    fontWeight: '600',
  },
  detailRateText: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
  },
  detailNotesText: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.sm,
    borderRadius: shapes.small,
  },

  // ── Departamento Dropdown / Chips Panel ──────────────────────────────────
  deptSelectWrap: {
    position: 'relative',
    width: '100%',
  },
  deptSelectChevron: {
    position: 'absolute',
    right: 10,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  deptMobileTrigger: {
    height: 44,
    backgroundColor: colors.surfaceContainer,
    borderRadius: shapes.small,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deptMobileTriggerText: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    flex: 1,
  },
  deptChipPanel: {
    marginTop: spacing.xs,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: shapes.medium,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  deptPanelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: shapes.full,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  deptPanelChipActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  deptPanelChipText: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  deptPanelChipTextActive: {
    color: colors.onPrimaryContainer,
    fontWeight: '700',
  },
});
