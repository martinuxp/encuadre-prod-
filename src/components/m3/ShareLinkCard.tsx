// ═══════════════════════════════════════════════════════
// Encuadre Prod. — ShareLinkCard (MD3)
// Card para mostrar, copiar y gestionar links públicos generados
// ═══════════════════════════════════════════════════════

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { SharedMediaLink } from '@/types';
import { useEnterAnimation } from '@/theme/animation';

interface ShareLinkCardProps {
  share: SharedMediaLink;
  onRevoke: () => void;
  appUrl: string;
}

export const ShareLinkCard: React.FC<ShareLinkCardProps> = ({
  share,
  onRevoke,
  appUrl,
}) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${appUrl}/view/${share.token}`;

  const handleCopy = async () => {
    if (Platform.OS === 'web' && navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isExpired = share.expiresAt ? new Date() > share.expiresAt : false;
  const { opacity, scale } = useEnterAnimation(0.97);

  return (
    <Animated.View style={[styles.card, !share.isActive && styles.cardRevoked, isExpired && styles.cardExpired, { opacity, transform: [{ scale }] }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name={share.isActive && !isExpired ? 'link-variant' : 'link-variant-off'}
            size={22}
            color={share.isActive && !isExpired ? colors.primary : colors.onSurfaceVariant}
          />
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>{share.displayName}</Text>
          <Text style={styles.subtitle}>
            {share.viewCount} {share.viewCount === 1 ? 'vista' : 'vistas'}
            {share.expiresAt && (
              ` • Vence ${share.expiresAt.toLocaleDateString('es-CL')}`
            )}
          </Text>
        </View>
        <View style={styles.status}>
          {isExpired ? (
            <View style={[styles.statusPill, styles.statusExpired]}>
              <Text style={styles.statusText}>VENCIDO</Text>
            </View>
          ) : share.isActive ? (
            <View style={[styles.statusPill, styles.statusActive]}>
              <Text style={styles.statusText}>ACTIVO</Text>
            </View>
          ) : (
            <View style={[styles.statusPill, styles.statusRevoked]}>
              <Text style={styles.statusText}>REVOCADO</Text>
            </View>
          )}
        </View>
      </View>

      {/* URL Field */}
      <View style={styles.urlRow}>
        <View style={styles.urlField}>
          <MaterialCommunityIcons name="link" size={14} color={colors.onSurfaceVariant} />
          <Text style={styles.urlText} numberOfLines={1} selectable>
            {shareUrl}
          </Text>
        </View>
        <Pressable
          style={[styles.copyBtn, copied && styles.copyBtnSuccess]}
          onPress={handleCopy}
        >
          <MaterialCommunityIcons
            name={copied ? 'check' : 'content-copy'}
            size={16}
            color={copied ? colors.onSuccess : colors.onPrimary}
          />
          <Text style={[styles.copyBtnText, copied && styles.copyBtnTextSuccess]}>
            {copied ? '¡Copiado!' : 'Copiar'}
          </Text>
        </Pressable>
      </View>

      {/* Badges */}
      <View style={styles.badges}>
        {!!share.password && (
          <View style={styles.badge}>
            <MaterialCommunityIcons name="lock-outline" size={11} color={colors.onSurfaceVariant} />
            <Text style={styles.badgeText}>Con contraseña</Text>
          </View>
        )}
        {share.allowDownload && (
          <View style={styles.badge}>
            <MaterialCommunityIcons name="download" size={11} color={colors.onSurfaceVariant} />
            <Text style={styles.badgeText}>Descarga permitida</Text>
          </View>
        )}
        {share.watermarkEnabled && (
          <View style={styles.badge}>
            <MaterialCommunityIcons name="watermark" size={11} color={colors.onSurfaceVariant} />
            <Text style={styles.badgeText}>Watermark activo</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={styles.actionBtn}
          onPress={() => {
            if (Platform.OS === 'web') window.open(shareUrl, '_blank');
          }}
        >
          <MaterialCommunityIcons name="open-in-new" size={16} color={colors.primary} />
          <Text style={styles.actionText}>Abrir visor</Text>
        </Pressable>

        {share.isActive && !isExpired && (
          <Pressable style={[styles.actionBtn, styles.revokeBtn]} onPress={onRevoke}>
            <MaterialCommunityIcons name="link-variant-off" size={16} color={colors.error} />
            <Text style={[styles.actionText, { color: colors.error }]}>Revocar link</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: shapes.medium,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.base,
    gap: spacing.base,
  },
  cardRevoked: {
    opacity: 0.6,
  },
  cardExpired: {
    borderColor: colors.error,
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.base,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: shapes.small,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: spacing.xs },
  title: {
    ...typography.titleSmall,
    color: colors.onSurface,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  status: { alignItems: 'flex-end' },
  statusPill: {
    borderRadius: shapes.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  statusActive: { backgroundColor: 'rgba(129,199,132,0.15)' },
  statusRevoked: { backgroundColor: 'rgba(255,180,171,0.15)' },
  statusExpired: { backgroundColor: 'rgba(255,213,79,0.15)' },
  statusText: {
    ...typography.labelSmall,
    fontWeight: '700',
    color: colors.onSurface,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  urlField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: shapes.small,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  urlText: {
    ...typography.bodySmall,
    color: colors.primary,
    flex: 1,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: shapes.small,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  copyBtnSuccess: {
    backgroundColor: colors.success,
  },
  copyBtnText: {
    ...typography.labelMedium,
    color: colors.onPrimary,
    fontWeight: 'bold',
  },
  copyBtnTextSuccess: {
    color: colors.onSuccess,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: shapes.extraSmall,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    paddingTop: spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: shapes.extraSmall,
  },
  revokeBtn: {},
  actionText: {
    ...typography.labelMedium,
    color: colors.primary,
  },
});
