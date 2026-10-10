// ═══════════════════════════════════════════════════════
// Encuadre Prod. — SectionCard (Componente MD3)
// ═══════════════════════════════════════════════════════

import React, { useState } from 'react';
import { View, Text, StyleSheet, ViewStyle, Pressable, Animated } from 'react-native';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ease, duration } from '@/theme/animation';

interface SectionCardProps {
  title: string;
  subtitle?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  subtitle,
  collapsible = false,
  defaultCollapsed = false,
  headerActions,
  children,
  style,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(collapsible && defaultCollapsed);
  const chevronRotate = React.useRef(new Animated.Value(collapsible && defaultCollapsed ? 1 : 0)).current;

  const toggleCollapse = () => {
    if (collapsible) {
      const next = !isCollapsed;
      setIsCollapsed(next);
      Animated.timing(chevronRotate, {
        toValue: next ? 1 : 0,
        duration: duration.medium2,
        easing: ease.emphasizedDecelerate,
        useNativeDriver: true,
      }).start();
    }
  };

  return (
    <View style={[styles.card, style]}>
      <Pressable
        onPress={toggleCollapse}
        disabled={!collapsible}
        style={({ pressed }) => [
          styles.header,
          pressed && collapsible && styles.pressed,
        ]}
      >
        <View style={styles.titleContainer}>
          <View style={styles.titleRow}>
            {collapsible && (
              <Animated.View
                style={{
                  transform: [
                    {
                      rotateZ: chevronRotate.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '90deg'],
                      }),
                    },
                  ],
                }}
              >
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={20}
                  color={colors.onSurfaceVariant}
                  style={styles.chevron}
                />
              </Animated.View>
            )}
            <Text style={styles.title}>{title}</Text>
          </View>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>

        {headerActions && <View style={styles.headerActions}>{headerActions}</View>}
      </Pressable>

      {!isCollapsed && <View style={styles.body}>{children}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: shapes.large,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  titleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevron: {
    marginRight: spacing.xs,
  },
  title: {
    ...typography.titleLarge,
    color: colors.onSurface,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
    marginLeft: spacing.lg,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: spacing.base,
  },
  body: {
    padding: spacing.base,
  },
  pressed: {
    opacity: 0.7,
  },
});
