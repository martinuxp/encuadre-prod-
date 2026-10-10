// ═══════════════════════════════════════════════════════
// Encuadre Prod. — PersonCard (Componente MD3)
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Pressable, Platform } from 'react-native';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { AvatarBadge } from './AvatarBadge';
import { StatusChip, StatusType } from './StatusChip';
import { ActionButton } from './ActionButton';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CallSheetStatus } from '@/types';
import { AnimatedCard } from './AnimatedCard';

interface PersonCardProps {
  name: string;
  role: string;
  department?: string;
  phone?: string;
  email?: string;
  callStatus?: CallSheetStatus;
  onPress?: () => void;
  onActionPress?: () => void;
  actionLabel?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  style?: ViewStyle;
}

export const PersonCard: React.FC<PersonCardProps> = ({
  name,
  role,
  department,
  phone,
  email,
  callStatus,
  onPress,
  onActionPress,
  actionLabel,
  onEdit,
  onDelete,
  style,
}) => {
  const getCallStatusInfo = (status?: CallSheetStatus): { label: string; type: StatusType; color: string } | null => {
    if (!status) return null;
    switch (status) {
      case 'confirmed':
        return { label: 'CONFIRMADO', type: 'success', color: colors.success };
      case 'cancelled':
        return { label: 'CANCELADO', type: 'error', color: colors.error };
      case 'pending':
      default:
        return { label: 'SIN CONFIRMAR', type: 'warning', color: colors.warning };
    }
  };

  const statusInfo = getCallStatusInfo(callStatus);

  const renderContent = () => (
    <View style={styles.cardContent}>
      <View style={styles.header}>
        <AvatarBadge
          name={name}
          size={48}
          badgeColor={statusInfo ? statusInfo.color : undefined}
          style={styles.avatar}
        />
        
        <View style={styles.info}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.role}>
            {role} {department ? `• ${department}` : ''}
          </Text>
          
          {!!(email || phone) && (
            <View style={styles.contactDetails}>
              {!!email && (
                <View style={styles.contactItem}>
                  <MaterialCommunityIcons name="email-outline" size={12} color={colors.onSurfaceVariant} />
                  <Text style={styles.contactText}>{email}</Text>
                </View>
              )}
              {!!phone && (
                <View style={styles.contactItem}>
                  <MaterialCommunityIcons name="phone-outline" size={12} color={colors.onSurfaceVariant} />
                  <Text style={styles.contactText}>{phone}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      <View style={styles.actionsRow}>
        {statusInfo && (
          <StatusChip
            label={statusInfo.label}
            status={statusInfo.type}
            icon={callStatus === 'confirmed' ? 'check-circle' : 'clock-outline'}
          />
        )}
        
        <View style={{ flex: 1 }} />
        
        {onEdit && (
          <Pressable onPress={onEdit} style={styles.editBtn}>
            <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.onSurfaceVariant} />
          </Pressable>
        )}
        {onDelete && (
          <Pressable onPress={onDelete} style={styles.editBtn}>
            <MaterialCommunityIcons name="delete-outline" size={16} color={colors.error} />
          </Pressable>
        )}
        
        {onActionPress && actionLabel && (
          <ActionButton
            label={actionLabel}
            onPress={onActionPress}
            variant={callStatus ? 'tonal' : 'filled'}
            icon={callStatus ? 'eye-outline' : 'calendar-plus'}
            style={styles.actionBtn}
          />
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <AnimatedCard onPress={onPress} style={styles.card} contentStyle={styles.cardContent}>
        {renderContent()}
      </AnimatedCard>
    );
  }

  return <View style={[styles.card, style]}>{renderContent()}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: shapes.large,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.base,
    ...Platform.select({
      web: {
        transition: 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 200ms cubic-bezier(0.2, 0, 0, 1), border-color 200ms cubic-bezier(0.2, 0, 0, 1)',
      } as any,
    }),
  },
  cardContent: {
    gap: spacing.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: spacing.base,
  },
  info: {
    flex: 1,
  },
  name: {
    ...typography.titleMedium,
    color: colors.onSurface,
    fontWeight: 'bold',
  },
  role: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  contactDetails: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  contactText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    height: 32,
    paddingHorizontal: spacing.base,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: shapes.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
});
