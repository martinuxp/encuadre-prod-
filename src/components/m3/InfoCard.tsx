// ═══════════════════════════════════════════════════════
// Encuadre Prod. — InfoCard (Componente MD3)
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Pressable, Platform } from 'react-native';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { AnimatedCard } from './AnimatedCard';

export type CardVariant = 'filled' | 'outlined' | 'elevated';

interface InfoCardProps {
  title: string;
  subtitle?: string;
  variant?: CardVariant;
  onPress?: () => void;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  style?: ViewStyle;
}

export const InfoCard: React.FC<InfoCardProps> = ({
  title,
  subtitle,
  variant = 'filled',
  onPress,
  actions,
  children,
  style,
}) => {
  const getCardStyles = (): ViewStyle => {
    switch (variant) {
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.outlineVariant,
        };
      case 'elevated':
        return {
          backgroundColor: colors.surfaceContainerLow,
          ...Platform.select({
            web: {
              boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.15)',
            } as any,
            default: {
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
            },
          }),
          elevation: 2,
        };
      case 'filled':
      default:
        return {
          backgroundColor: colors.surfaceContainer,
        };
    }
  };

  const cardStyles = getCardStyles();

  const renderContent = () => (
    <View style={styles.content}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>
      </View>
      {children && <View style={styles.body}>{children}</View>}
      {actions && <View style={styles.actions}>{actions}</View>}
    </View>
  );

  if (onPress) {
    return (
      <AnimatedCard
        onPress={onPress}
        style={[styles.card, cardStyles, style] as any}
        contentStyle={styles.cardContent}
      >
        {renderContent()}
      </AnimatedCard>
    );
  }

  return <View style={[styles.card, cardStyles, style]}>{renderContent()}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: shapes.medium,
    overflow: 'hidden',
  },
  cardContent: {
    borderRadius: shapes.medium,
    overflow: 'hidden',
  },
  content: {
    padding: spacing.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    ...typography.titleMedium,
    color: colors.onSurface,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  body: {
    marginTop: spacing.base,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.base,
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
});
