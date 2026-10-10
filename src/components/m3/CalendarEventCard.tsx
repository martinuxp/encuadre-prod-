// ═══════════════════════════════════════════════════════
// Encuadre Prod. — CalendarEventCard (Componente MD3)
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CalendarEventType } from '@/types';
import { AnimatedCard } from './AnimatedCard';

interface CalendarEventCardProps {
  title: string;
  startDate: Date | string;
  endDate: Date | string;
  type: CalendarEventType;
  location?: string;
  allDay?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export const CalendarEventCard: React.FC<CalendarEventCardProps> = ({
  title,
  startDate,
  endDate,
  type,
  location,
  allDay = false,
  onPress,
  style,
}) => {
  const getEventTypeConfig = (eventType: CalendarEventType): { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string } => {
    switch (eventType) {
      case 'shoot':
        return { label: 'Rodaje', icon: 'video-outline', color: colors.primary };
      case 'meeting':
        return { label: 'Reunión', icon: 'account-group-outline', color: colors.tertiary };
      case 'rehearsal':
        return { label: 'Ensayo', icon: 'drama-masks', color: colors.secondary };
      case 'delivery':
        return { label: 'Entrega', icon: 'file-export-outline', color: colors.error };
      case 'milestone':
        return { label: 'Hito', icon: 'flag-outline', color: colors.success };
      case 'other':
      default:
        return { label: 'Otro', icon: 'calendar-outline', color: colors.onSurfaceVariant };
    }
  };

  const config = getEventTypeConfig(type);

  const formatTime = (d: Date | string): string => {
    const dateObj = d instanceof Date ? d : new Date(d);
    return dateObj.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (d: Date | string): string => {
    const dateObj = d instanceof Date ? d : new Date(d);
    return dateObj.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
  };

  const renderContent = () => (
    <View style={styles.container}>
      <View style={[styles.colorBar, { backgroundColor: config.color }]} />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <View style={[styles.typeBadge, { backgroundColor: config.color + '15' }]}>
            <MaterialCommunityIcons name={config.icon} size={12} color={config.color} />
            <Text style={[styles.typeText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="clock-outline" size={14} color={colors.onSurfaceVariant} />
            <Text style={styles.detailText}>
              {allDay ? 'Todo el día' : `${formatTime(startDate)} - ${formatTime(endDate)}`}
              {` (${formatDate(startDate)})`}
            </Text>
          </View>

          {location && (
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="map-marker-outline" size={14} color={colors.onSurfaceVariant} />
              <Text style={styles.detailText} numberOfLines={1}>{location}</Text>
            </View>
          )}
        </View>
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
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: shapes.medium,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },
  cardContent: {
    borderRadius: shapes.medium,
    overflow: 'hidden',
  },
  container: {
    flexDirection: 'row',
    height: 72,
  },
  colorBar: {
    width: 6,
    height: '100%',
  },
  content: {
    flex: 1,
    padding: spacing.sm,
    paddingHorizontal: spacing.base,
    justifyContent: 'center',
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    ...typography.titleSmall,
    color: colors.onSurface,
    fontWeight: 'bold',
    flex: 1,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: shapes.full,
  },
  typeText: {
    ...typography.labelSmall,
    fontWeight: 'bold',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
});
