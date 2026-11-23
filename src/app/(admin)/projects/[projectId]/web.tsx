// ═══════════════════════════════════════════════════════
// Encuadre Prod. — Web pública del proyecto
// Edita la ficha `projects/{id}.web` que consume la web (SPEC-panel-web-publica.md §6)
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Switch, Pressable, Linking, Platform } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { getDownloadURL, ref } from 'firebase/storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { SectionCard } from '@/components/m3/SectionCard';
import { ActionButton } from '@/components/m3/ActionButton';
import { LoadingState } from '@/components/m3/LoadingState';
import { ErrorState } from '@/components/m3/ErrorState';
import { storage } from '@/services/firebase/firebaseConfig';
import { projectService } from '@/services/firebase/projectService';
import { webService, WebDraft, validateWebDraft } from '@/services/firebase/webService';
import { GalleryEditor } from '@/components/web/GalleryEditor';
import { Project, ProjectMember, TalentProfile, WebAction, WebActionIcon, WebCredit, WebCreditMark, WebGalleryPhoto } from '@/types';
import {
  slugify, extractYoutubeId, dominantColors, paletteFromDominant, uriToBlob, isHexColor, contrastRatio,
} from '@/utils/web';

const SITE_URL = 'https://grupoencuadrecl.web.app';
const KIND_BY_TYPE: Record<string, string> = {
  film: 'Cortometraje', music_video: 'Videoclip', documentary: 'Documental', commercial: 'Comercial', tv: 'Serie', photography: 'Fotografía',
};
const ICONS: WebActionIcon[] = ['play', 'instagram', 'arrow-up-right', 'arrow-right'];
const AR_PRESETS = ['4 / 5', '1 / 1', '3 / 4', '9 / 16'];
const DEFAULT_COLORS = { bg: '#141016', ink: '#ffffff', accent: '#3a1f3f', soft: '#ff6b3d' };

// ── Helpers de posición (CSS object-position ↔ porcentajes) ──

const KEYWORD_PCT: Record<string, number> = { left: 0, top: 0, center: 50, right: 100, bottom: 100 };
const parsePos = (pos?: string): { x: number; y: number } => {
  const [a, b] = (pos || 'center center').split(/\s+/);
  const toPct = (t: string | undefined) => (t === undefined ? 50 : t.endsWith('%') ? parseFloat(t) : KEYWORD_PCT[t] ?? 50);
  return { x: toPct(a), y: toPct(b) };
};
const parseRatio = (ar: string): number => {
  const [w, h] = ar.split('/').map((n) => parseFloat(n));
  return w > 0 && h > 0 ? w / h : 4 / 5;
};
const formatPos = (x: number, y: number) => `${Math.round(x)}% ${Math.round(y)}%`;

const toBlob = async (asset: { uri: string; mimeType?: string | null; file?: File }): Promise<Blob> => {
  const blob = asset.file ?? (await uriToBlob(asset.uri));
  return blob.type || !asset.mimeType ? blob : new Blob([blob], { type: asset.mimeType });
};

// ── Controles pequeños ──

const Field: React.FC<{ label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; multiline?: boolean; hint?: string; error?: boolean; autoCapitalize?: 'none' }> = ({ label, value, onChangeText, placeholder, multiline, hint, error, autoCapitalize }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      accessibilityLabel={label}
      style={[styles.input, multiline && styles.inputMulti, error && styles.inputError]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.placeholder}
      multiline={multiline}
      autoCapitalize={autoCapitalize}
    />
    {hint ? <Text style={styles.hint}>{hint}</Text> : null}
  </View>
);

const Chips: React.FC<{ options: { key: string; label: string }[]; value?: string; onChange: (key: string) => void }> = ({ options, value, onChange }) => (
  <View style={styles.chips}>
    {options.map((o) => (
      <Pressable key={o.key} accessibilityRole="button" aria-pressed={value === o.key} onPress={() => onChange(o.key)} style={[styles.chip, value === o.key && styles.chipActive]}>
        <Text style={[styles.chipLabel, value === o.key && styles.chipLabelActive]}>{o.label}</Text>
      </Pressable>
    ))}
  </View>
);

const Toggle: React.FC<{ label: string; value: boolean; onChange: (v: boolean) => void }> = ({ label, value, onChange }) => (
  <View style={styles.toggleRow}>
    <Text style={styles.toggleLabel}>{label}</Text>
    <Switch value={value} onValueChange={onChange} accessibilityLabel={label} />
  </View>
);

// Botones chicos de las listas. Las flechas se dibujan como íconos y se anuncian con su acción.
const MINI_ICON: Record<string, { icon: keyof typeof MaterialCommunityIcons.glyphMap; a11y: string }> = {
  '↑': { icon: 'arrow-up', a11y: 'Subir' },
  '↓': { icon: 'arrow-down', a11y: 'Bajar' },
  '← X': { icon: 'arrow-left', a11y: 'Mover encuadre a la izquierda' },
  'X →': { icon: 'arrow-right', a11y: 'Mover encuadre a la derecha' },
  '↑ Y': { icon: 'arrow-up', a11y: 'Mover encuadre hacia arriba' },
  'Y ↓': { icon: 'arrow-down', a11y: 'Mover encuadre hacia abajo' },
};

const Mini: React.FC<{ label: string; onPress: () => void; disabled?: boolean }> = ({ label, onPress, disabled }) => {
  const glyph = MINI_ICON[label];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={glyph?.a11y ?? label} accessibilityState={{ disabled: !!disabled }} onPress={onPress} disabled={disabled} style={[styles.mini, disabled && { opacity: 0.35 }]}>
      {glyph ? <MaterialCommunityIcons name={glyph.icon} size={18} color={colors.onSurface} /> : <Text style={styles.miniLabel}>{label}</Text>}
    </Pressable>
  );
};

const move = <T,>(list: T[], from: number, to: number): T[] => {
  if (to < 0 || to >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
};

const ActionsEditor: React.FC<{ items: WebAction[]; onChange: (items: WebAction[]) => void; allowPrimary: boolean }> = ({ items, onChange, allowPrimary }) => (
  <View style={{ gap: spacing.sm }}>
    {items.map((a, i) => (
      <View key={i} style={styles.rowCard}>
        <Field label="Texto" value={a.label} onChangeText={(label) => onChange(items.map((x, j) => (j === i ? { ...x, label } : x)))} />
        <Field label="Enlace (https://…)" value={a.href} autoCapitalize="none" error={!!a.href && !/^https:\/\//i.test(a.href)} onChangeText={(href) => onChange(items.map((x, j) => (j === i ? { ...x, href } : x)))} />
        <Chips options={ICONS.map((k) => ({ key: k, label: k }))} value={a.icon} onChange={(icon) => onChange(items.map((x, j) => (j === i ? { ...x, icon: icon as WebActionIcon } : x)))} />
        {allowPrimary ? <Toggle label="Botón principal" value={!!a.primary} onChange={(primary) => onChange(items.map((x, j) => (j === i ? { ...x, primary } : x)))} /> : null}
        <View style={styles.rowButtons}>
          <Mini label="↑" disabled={i === 0} onPress={() => onChange(move(items, i, i - 1))} />
          <Mini label="↓" disabled={i === items.length - 1} onPress={() => onChange(move(items, i, i + 1))} />
          <Mini label="Quitar" onPress={() => onChange(items.filter((_, j) => j !== i))} />
        </View>
      </View>
    ))}
    <ActionButton label="Agregar botón" variant="tonal" icon="plus" onPress={() => onChange([...items, { label: '', href: '', icon: 'play', ...(allowPrimary && !items.length ? { primary: true } : {}) }])} />
  </View>
);

const CreditsEditor: React.FC<{ items: WebCredit[]; onChange: (items: WebCredit[]) => void; allowWide: boolean }> = ({ items, onChange, allowWide }) => (
  <View style={{ gap: spacing.sm }}>
    {items.map((c, i) => (
      <View key={i} style={styles.rowCard}>
        <Field label="Rol" value={c.role} onChangeText={(role) => onChange(items.map((x, j) => (j === i ? { ...x, role } : x)))} />
        <Field label="Nombre(s)" value={c.name} onChangeText={(name) => onChange(items.map((x, j) => (j === i ? { ...x, name } : x)))} />
        {allowWide ? <Toggle label="Ancho completo" value={!!c.wide} onChange={(wide) => onChange(items.map((x, j) => (j === i ? { ...x, wide } : x)))} /> : null}
        <View style={styles.rowButtons}>
          <Mini label="↑" disabled={i === 0} onPress={() => onChange(move(items, i, i - 1))} />
          <Mini label="↓" disabled={i === items.length - 1} onPress={() => onChange(move(items, i, i + 1))} />
          <Mini label="Quitar" onPress={() => onChange(items.filter((_, j) => j !== i))} />
        </View>
      </View>
    ))}
    <ActionButton label="Agregar crédito" variant="tonal" icon="plus" onPress={() => onChange([...items, { role: '', name: '' }])} />
  </View>
);

type CrewPerson = { key: string; collectionName: 'members' | 'talentProfiles'; id: string; name: string; role: string; mark: WebCreditMark };

// ── Pantalla ──

export default function WebTab() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [draft, setDraft] = useState<WebDraft | null>(null);
  const [people, setPeople] = useState<CrewPerson[]>([]);
  const [heroUrl, setHeroUrl] = useState<string>();
  const [logoUrl, setLogoUrl] = useState<string>();
  const [heroBlob, setHeroBlob] = useState<Blob>();
  const [descriptionText, setDescriptionText] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const set = useCallback((patch: Partial<WebDraft>) => { setDraft((d) => (d ? { ...d, ...patch } : d)); setDirty(true); setNotice(null); }, []);

  const resolveUrl = async (path?: string) => {
    if (!path) return undefined;
    try { return await getDownloadURL(ref(storage, path)); } catch { return undefined; }
  };

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true); setError(null);
      const [p, members, talents] = await Promise.all([projectService.getProjectById(projectId), projectService.getMembers(projectId), projectService.getTalents(projectId)]);
      if (!p) throw new Error('No se encontró el proyecto.');
      setProject(p);
      const list: CrewPerson[] = [
        ...talents.map((t: TalentProfile) => ({ key: `t:${t.id}`, collectionName: 'talentProfiles' as const, id: t.id, name: t.name, role: t.role, mark: t.webCredit || { show: false } })),
        ...members.map((m: ProjectMember) => ({ key: `m:${m.id}`, collectionName: 'members' as const, id: m.id, name: m.name, role: m.role, mark: m.webCredit || { show: false } })),
      ].sort((a, b) => (a.mark.order ?? 1000) - (b.mark.order ?? 1000));
      setPeople(list);
      const w = p.web;
      const next: WebDraft = w
        ? { ...w, colors: { ...DEFAULT_COLORS, ...w.colors }, homeCredits: w.homeCredits || [], actions: w.actions || [], homeActions: w.homeActions || [], credits: w.credits || [], description: w.description || [] }
        : {
            published: false, order: await webService.nextOrder(), slug: slugify(p.name), title: p.name, kind: KIND_BY_TYPE[p.type] || 'Proyecto', status: '',
            colors: DEFAULT_COLORS, summary: '', homeCredits: [], actions: [], homeActions: [], credits: [], creditsSource: 'crew', description: [],
          };
      setDraft(next);
      setDescriptionText((next.description || []).join('\n\n'));
      setHeroUrl(await resolveUrl(next.heroPath));
      setLogoUrl(await resolveUrl(next.logoPath));
      setDirty(false);
    } catch (e: any) {
      setError(e.message || 'Error al cargar la ficha web.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const run = async (name: string, fn: () => Promise<void>) => {
    try { setBusy(name); setError(null); setNotice(null); await fn(); } catch (e: any) { setError(e.message || 'Ocurrió un error.'); } finally { setBusy(null); }
  };

  const pos = useMemo(() => parsePos(draft?.heroPos), [draft?.heroPos]);

  if (loading) return <LoadingState message="Cargando ficha web..." />;
  if (!project || !draft) return <ErrorState error={error || 'No se pudo cargar la ficha web.'} onRetry={load} />;

  const problem = validateWebDraft(draft);
  const inkContrast = isHexColor(draft.colors.bg) && isHexColor(draft.colors.ink) ? contrastRatio(draft.colors.bg, draft.colors.ink) : 0;

  // ── Acciones ──

  const save = () => run('save', async () => {
    const description = descriptionText.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
    const toSave: WebDraft = { ...draft, description, youtube: draft.youtube ? extractYoutubeId(draft.youtube) || undefined : undefined };
    await webService.saveWeb(projectId, toSave);
    setDraft(toSave); setDirty(false); setNotice('Guardado. Se verá en la web en unos minutos (caché de 5 min).');
  });

  // La galería se guarda sola; se refleja en el borrador para que "Guardar" no la pise con una copia vieja
  const saveGallery = async (gallery: WebGalleryPhoto[]) => {
    const saved = await webService.saveGallery(projectId, gallery);
    setDraft((d) => (d ? { ...d, gallery: saved } : d));
  };

  const pickHero = () => run('hero', async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (res.canceled) return;
    const blob = await toBlob(res.assets[0] as any);
    const paths = await webService.uploadHero(projectId, blob, draft);
    setHeroBlob(blob); setHeroUrl(URL.createObjectURL ? URL.createObjectURL(blob) : res.assets[0].uri);
    set(paths);
    setNotice('Foto principal subida. Recuerda pulsar Guardar.');
  });

  const pickLogo = () => run('logo', async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['image/png', 'image/svg+xml', 'image/webp'], copyToCacheDirectory: true });
    if (res.canceled) return;
    const blob = await toBlob(res.assets[0] as any);
    const logoPath = await webService.uploadLogo(projectId, blob, draft.logoPath);
    setLogoUrl(URL.createObjectURL ? URL.createObjectURL(blob) : res.assets[0].uri);
    set({ logoPath });
    setNotice('Logo subido. Recuerda pulsar Guardar.');
  });

  const pickColors = () => run('colors', async () => {
    let blob = heroBlob;
    if (!blob && heroUrl) blob = await uriToBlob(heroUrl);
    if (!blob) throw new Error('Primero sube la foto principal.');
    const palette = paletteFromDominant(await dominantColors(blob));
    set({ colors: palette });
  });

  const setCreditMark = (person: CrewPerson, mark: WebCreditMark) => run('credit', async () => {
    const order = mark.show && !person.mark.show ? people.filter((p) => p.mark.show).length : mark.order ?? person.mark.order;
    const next = { ...mark, order };
    await webService.setCreditMark(projectId, person.collectionName, person.id, next);
    setPeople((list) => list.map((p) => (p.key === person.key ? { ...p, mark: next } : p)));
  });

  const moveCredit = (person: CrewPerson, delta: number) => run('credit', async () => {
    const shown = people.filter((p) => p.mark.show);
    const from = shown.findIndex((p) => p.key === person.key);
    const reordered = move(shown, from, from + delta);
    await webService.saveCreditOrder(projectId, reordered.map((p) => ({ collectionName: p.collectionName, id: p.id })));
    setPeople((list) => [...reordered.map((p, i) => ({ ...p, mark: { ...p.mark, order: i } })), ...list.filter((p) => !p.mark.show)]);
  });

  const shown = people.filter((p) => p.mark.show);
  const publicUrl = `${SITE_URL}/proyectos/${draft.slug}`;
  const heroAr = draft.heroMobileAr || '4 / 5';

  return (
    <View style={styles.page}>
      {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
      {notice ? <Text style={styles.noticeBanner}>{notice}</Text> : null}

      {/* 1. Publicación */}
      <SectionCard title="Publicación" subtitle="Decide si el proyecto aparece en la web pública.">
        <Toggle label="Publicar en la web" value={draft.published} onChange={(published) => set({ published })} />
        <View style={styles.inlineRow}>
          <ActionButton label="Ver en la web" variant="outlined" icon="open-in-new" disabled={!draft.slug} onPress={() => Linking.openURL(publicUrl)} />
          <ActionButton label="Orden en la web" variant="text" icon="sort" onPress={() => router.push('/projects/web')} />
        </View>
        <Text style={styles.hint}>{publicUrl}</Text>
      </SectionCard>

      {/* 2. Identidad */}
      <SectionCard title="Identidad">
        <Field label="Título" value={draft.title} onChangeText={(title) => set({ title })} />
        <Field label="Slug" value={draft.slug} autoCapitalize="none" error={!!draft.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(draft.slug)} onChangeText={(slug) => set({ slug: slugify(slug) })} hint="Solo minúsculas, números y guiones. Debe ser único." />
        <ActionButton label="Generar slug desde el título" variant="text" onPress={() => set({ slug: slugify(draft.title) })} />
        <Field label="Tipo" value={draft.kind} onChangeText={(kind) => set({ kind })} placeholder="Cortometraje, Microcorto…" />
        <Field label="Estado público" value={draft.status} onChangeText={(status) => set({ status })} placeholder="En producción · 2026" />
        <Toggle label="Destacar etiqueta (premio)" value={!!draft.award} onChange={(award) => set({ award })} />
      </SectionCard>

      {/* 3. Imágenes */}
      <SectionCard title="Imágenes" subtitle="La foto se guarda en WebP (máx. 2400 px) con miniatura de 1200 px.">
        <View style={styles.inlineRow}>
          <ActionButton label={draft.heroPath ? 'Cambiar foto principal' : 'Subir foto principal'} icon="image-plus" variant="tonal" loading={busy === 'hero'} onPress={pickHero} />
          <ActionButton label={draft.logoPath ? 'Cambiar logo' : 'Subir logo'} icon="image-outline" variant="tonal" loading={busy === 'logo'} onPress={pickLogo} />
        </View>
        {logoUrl ? <Image source={{ uri: logoUrl }} style={styles.logoPreview} contentFit="contain" /> : null}

        {heroUrl ? (
          <View style={{ gap: spacing.sm }}>
            <Text style={styles.label}>Vista previa PC (16:9)</Text>
            <Image source={{ uri: heroUrl }} style={[styles.heroPreview, { aspectRatio: 16 / 9 }]} contentFit="cover" contentPosition={{ left: `${pos.x}%`, top: `${pos.y}%` } as any} />
            <Text style={styles.label}>Vista previa celular ({heroAr})</Text>
            <Image source={{ uri: heroUrl }} style={[styles.heroPreview, styles.heroMobile, { aspectRatio: parseRatio(heroAr) }]} contentFit="cover" contentPosition={{ left: `${pos.x}%`, top: `${pos.y}%` } as any} />
            <Text style={styles.label}>Encuadre: {formatPos(pos.x, pos.y)}</Text>
            <View style={styles.rowButtons}>
              <Mini label="← X" onPress={() => set({ heroPos: formatPos(Math.max(0, pos.x - 5), pos.y) })} />
              <Mini label="X →" onPress={() => set({ heroPos: formatPos(Math.min(100, pos.x + 5), pos.y) })} />
              <Mini label="↑ Y" onPress={() => set({ heroPos: formatPos(pos.x, Math.max(0, pos.y - 5)) })} />
              <Mini label="Y ↓" onPress={() => set({ heroPos: formatPos(pos.x, Math.min(100, pos.y + 5)) })} />
              <Mini label="Centrar" onPress={() => set({ heroPos: undefined })} />
            </View>
          </View>
        ) : null}

        <Text style={styles.label}>Proporción en celular</Text>
        <Chips options={AR_PRESETS.map((k) => ({ key: k, label: k }))} value={draft.heroMobileAr} onChange={(heroMobileAr) => set({ heroMobileAr })} />
        <Text style={styles.label}>Diseño de portada</Text>
        <Chips options={[{ key: 'full', label: 'Completa' }, { key: 'stack', label: 'Foto arriba, logo abajo' }]} value={draft.heroLayout || 'full'} onChange={(heroLayout) => set({ heroLayout: heroLayout as 'full' | 'stack' })} />

        <Text style={styles.label}>Título tipográfico (si no hay logo)</Text>
        <View style={styles.inlineRow}>
          {(['top', 'mid', 'bottom'] as const).map((k) => (
            <View key={k} style={{ flex: 1, minWidth: 120 }}>
              <Field label={k === 'top' ? 'Arriba' : k === 'mid' ? 'Medio' : 'Abajo'} value={draft.typeLogo?.[k] || ''} onChangeText={(v) => set({ typeLogo: { top: '', mid: '', bottom: '', ...draft.typeLogo, [k]: v } })} />
            </View>
          ))}
        </View>
      </SectionCard>

      {/* 4. Colores */}
      <SectionCard title="Colores" subtitle="Identidad croma-adaptativa del proyecto.">
        <View style={styles.inlineRow}>
          {(['bg', 'ink', 'accent', 'soft'] as const).map((k) => (
            <View key={k} style={{ flex: 1, minWidth: 130 }}>
              <Field label={{ bg: 'Fondo', ink: 'Texto', accent: 'Acento', soft: 'Suave' }[k]} value={draft.colors[k]} autoCapitalize="none" error={!isHexColor(draft.colors[k])} onChangeText={(v) => set({ colors: { ...draft.colors, [k]: v.startsWith('#') ? v : `#${v}` } })} />
              <View style={[styles.swatch, { backgroundColor: isHexColor(draft.colors[k]) ? draft.colors[k] : 'transparent' }]} />
            </View>
          ))}
        </View>
        <Text style={[styles.hint, inkContrast > 0 && inkContrast < 4.5 && { color: colors.error }]}>Contraste texto/fondo: {inkContrast ? inkContrast.toFixed(1) : '–'}:1 {inkContrast && inkContrast < 4.5 ? '(bajo, mínimo 4.5:1)' : ''}</Text>
        <ActionButton label="Sacar colores de la foto" icon="palette-outline" variant="tonal" loading={busy === 'colors'} disabled={!heroUrl} onPress={pickColors} />
      </SectionCard>

      {/* 5. Textos */}
      <SectionCard title="Textos">
        <Field label={`Resumen (${draft.summary.length}/220)`} value={draft.summary} multiline error={draft.summary.length > 220} onChangeText={(summary) => set({ summary })} />
        <Field label="Sinopsis" value={draft.synopsis || ''} multiline onChangeText={(synopsis) => set({ synopsis })} hint="Se permite solo negrita con <b>…</b>." />
        <Field label="Descripción (separa párrafos con una línea en blanco)" value={descriptionText} multiline onChangeText={(v) => { setDescriptionText(v); setDirty(true); }} />
        <Field label="Nota (música, derechos…)" value={draft.note || ''} multiline onChangeText={(note) => set({ note })} />
        <Field label="Texto “Pronto” (activa el modo próximamente)" value={draft.soon || ''} multiline onChangeText={(soon) => set({ soon })} />
      </SectionCard>

      {/* 6. Video y botones */}
      <SectionCard title="Video y botones">
        <Field label="YouTube (ID o URL)" value={draft.youtube || ''} autoCapitalize="none" onChangeText={(youtube) => set({ youtube })} hint={draft.youtube && !extractYoutubeId(draft.youtube) ? 'No se reconoce el ID de YouTube.' : draft.youtube ? `ID: ${extractYoutubeId(draft.youtube)}` : undefined} />
        <Text style={styles.label}>Botones de la página del proyecto</Text>
        <ActionsEditor items={draft.actions || []} allowPrimary onChange={(actions) => set({ actions })} />
        <Text style={styles.label}>Botones extra en inicio</Text>
        <ActionsEditor items={draft.homeActions || []} allowPrimary={false} onChange={(homeActions) => set({ homeActions })} />
      </SectionCard>

      {/* Galería: se guarda al instante, aparte del botón Guardar */}
      <SectionCard title="Galería" subtitle="Fotogramas y fotos de rodaje que muestra la página del proyecto.">
        <GalleryEditor
          projectId={projectId}
          bucket={String(storage.app.options.storageBucket || '')}
          gallery={draft.gallery || []}
          onSave={saveGallery}
        />
      </SectionCard>

      {/* 7. Créditos */}
      <SectionCard title="Créditos">
        <Text style={styles.label}>Créditos cortos del inicio (2–3)</Text>
        <CreditsEditor items={draft.homeCredits} allowWide={false} onChange={(homeCredits) => set({ homeCredits })} />
        <Text style={styles.label}>Créditos completos</Text>
        <Chips options={[{ key: 'crew', label: 'Desde el equipo' }, { key: 'manual', label: 'Manual' }]} value={draft.creditsSource || 'manual'} onChange={(creditsSource) => set({ creditsSource: creditsSource as 'crew' | 'manual' })} />
        {(draft.creditsSource || 'manual') === 'manual' ? (
          <CreditsEditor items={draft.credits || []} allowWide onChange={(credits) => set({ credits })} />
        ) : (
          <View style={{ gap: spacing.sm }}>
            <Text style={styles.hint}>Marca a quién mostrar. Quienes compartan rol público se agrupan en una fila. Estos cambios se guardan al instante.</Text>
            {people.length === 0 ? <Text style={styles.hint}>Este proyecto aún no tiene crew ni elenco.</Text> : null}
            {people.map((p) => (
              <View key={p.key} style={styles.rowCard}>
                <Toggle label={`${p.name} · ${p.role}`} value={p.mark.show} onChange={(show) => setCreditMark(p, { ...p.mark, show })} />
                {p.mark.show ? (
                  <>
                    <Field label="Rol público (opcional)" value={p.mark.role || ''} placeholder={p.role} onChangeText={(role) => setPeople((l) => l.map((x) => (x.key === p.key ? { ...x, mark: { ...x.mark, role } } : x)))} />
                    <View style={styles.rowButtons}>
                      <Mini label="Guardar rol" onPress={() => setCreditMark(p, p.mark)} />
                      <Mini label="↑" disabled={shown[0]?.key === p.key} onPress={() => moveCredit(p, -1)} />
                      <Mini label="↓" disabled={shown[shown.length - 1]?.key === p.key} onPress={() => moveCredit(p, 1)} />
                    </View>
                  </>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </SectionCard>

      {/* 9. Vista previa */}
      <SectionCard title="Vista previa">
        <View style={[styles.preview, { backgroundColor: isHexColor(draft.colors.bg) ? draft.colors.bg : '#000' }]}>
          {heroUrl ? <Image source={{ uri: heroUrl }} style={styles.previewHero} contentFit="cover" contentPosition={{ left: `${pos.x}%`, top: `${pos.y}%` } as any} /> : null}
          {logoUrl ? <Image source={{ uri: logoUrl }} style={styles.previewLogo} contentFit="contain" /> : draft.typeLogo?.top ? (
            <Text style={[styles.previewType, { color: draft.colors.ink }]}>{draft.typeLogo.top}{'\n'}{draft.typeLogo.mid}{'\n'}{draft.typeLogo.bottom}</Text>
          ) : null}
          <Text style={[styles.previewBadge, { color: draft.colors.ink, borderColor: draft.award ? draft.colors.soft : draft.colors.accent }]}>{draft.status || 'Estado'}</Text>
          <Text style={[styles.previewTitle, { color: draft.colors.ink }]}>{draft.title}</Text>
          <Text style={{ color: draft.colors.ink, opacity: 0.8 }}>{draft.summary}</Text>
        </View>
      </SectionCard>

      <View style={styles.saveBar}>
        {problem ? <Text style={styles.hint}>{problem}</Text> : <Text style={styles.hint}>{dirty ? 'Hay cambios sin guardar.' : 'Todo guardado.'}</Text>}
        <ActionButton label="Guardar" icon="content-save-outline" loading={busy === 'save'} disabled={!!problem || !dirty} onPress={save} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: spacing.base },
  field: { gap: spacing.xs, marginBottom: spacing.sm },
  label: { ...typography.labelLarge, color: colors.onSurfaceVariant, marginTop: spacing.xs },
  hint: { ...typography.bodySmall, color: colors.onSurfaceVariant },
  input: {
    ...typography.bodyMedium, color: colors.onSurface, backgroundColor: colors.surfaceContainerHigh,
    borderRadius: shapes.small, borderWidth: 1, borderColor: colors.outlineVariant, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  },
  inputMulti: { minHeight: 96, textAlignVertical: 'top' },
  inputError: { borderColor: colors.error },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: shapes.small, borderTopRightRadius: 20, borderWidth: 1, borderColor: colors.outlineVariant },
  chipActive: { backgroundColor: colors.secondaryContainer, borderColor: colors.secondaryContainer },
  chipLabel: { ...typography.labelMedium, color: colors.onSurfaceVariant },
  chipLabelActive: { color: colors.onSecondaryContainer, fontWeight: 'bold' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.base, paddingVertical: spacing.xs },
  toggleLabel: { ...typography.bodyMedium, color: colors.onSurface, flex: 1 },
  inlineRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  rowCard: { backgroundColor: colors.surfaceContainer, borderRadius: shapes.medium, padding: spacing.md, gap: spacing.xs, borderWidth: 1, borderColor: colors.outlineVariant },
  rowButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  mini: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: shapes.small, backgroundColor: colors.surfaceContainerHighest },
  miniLabel: { ...typography.labelMedium, color: colors.onSurface },
  swatch: { height: 12, borderRadius: shapes.full, borderWidth: 1, borderColor: colors.outlineVariant },
  logoPreview: { width: 160, height: 80, backgroundColor: colors.surfaceContainerLowest, borderRadius: shapes.small },
  heroPreview: { width: '100%', borderRadius: shapes.medium, backgroundColor: colors.surfaceContainerLowest },
  heroMobile: { maxWidth: 240 },
  preview: { borderRadius: shapes.large, overflow: 'hidden', padding: spacing.base, gap: spacing.sm },
  previewHero: { width: '100%', aspectRatio: 16 / 9, borderRadius: shapes.medium },
  previewLogo: { width: 180, height: 70 },
  previewType: { ...typography.headlineMedium, fontWeight: 'bold' },
  previewBadge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: shapes.full, paddingHorizontal: spacing.md, paddingVertical: 2, ...typography.labelSmall },
  previewTitle: { ...typography.headlineMedium, fontWeight: 'bold' },
  saveBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.base, flexWrap: 'wrap' },
  errorBanner: { ...typography.bodyMedium, color: colors.onErrorContainer, backgroundColor: colors.errorContainer, padding: spacing.md, borderRadius: shapes.small },
  noticeBanner: { ...typography.bodyMedium, color: colors.onSuccess, backgroundColor: colors.success, padding: spacing.md, borderRadius: shapes.small },
});
