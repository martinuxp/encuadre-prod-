// ═══════════════════════════════════════════════════════
// Encuadre Prod. — BottomNavigation (Componente MD3)
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Animated } from 'react-native';
import { colors, typography, layout, spacing, shapes } from '@/theme/tokens';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NavigationItem } from '@/types';
import { ease, duration } from '@/theme/animation';

interface BottomNavigationProps {
  items: NavigationItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  style?: any;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  items,
  activeKey,
  onSelect,
  style,
}) => {
  return (
    <View style={[styles.bar, style]}>
      {items.map((item) => {
        const isActive = item.key === activeKey;
        return (
          <Pressable
            key={item.key}
            onPress={() => onSelect(item.key)}
            style={({ pressed }) => [
              styles.item,
              pressed && styles.pressed,
              Platform.OS === 'web' && { cursor: 'pointer' },
            ]}
          >
            <Animated.View
              style={[
                styles.iconContainer,
                isActive ? styles.iconContainerActive : styles.iconContainerInactive,
                isActive && { transform: [{ scale: 1.08 }] },
              ]}
            >
              <MaterialCommunityIcons
                name={(isActive ? item.activeIcon || item.icon : item.icon) as any}
                size={24}
                color={isActive ? colors.onPrimaryContainer : colors.onSurfaceVariant}
              />
              {item.badge !== undefined && item.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
            </Animated.View>
            <Text
              style={[
                styles.label,
                isActive ? styles.labelActive : styles.labelInactive,
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    height: layout.bottomNavHeight,
    backgroundColor: colors.surfaceContainer,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingBottom: spacing.sm, // Espaciador para la barra de inicio en iOS/Android
  },
  item: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: spacing.xs,
  },
  iconContainer: {
    width: 64,
    height: 32,
    borderRadius: shapes.large,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...Platform.select({
      web: {
        transition: 'transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1), background-color 200ms cubic-bezier(0.2, 0, 0, 1)',
      } as any,
    }),
  },
  iconContainerActive: {
    backgroundColor: colors.primaryContainer,
  },
  iconContainerInactive: {
    backgroundColor: 'transparent',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 14,
    backgroundColor: colors.error,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.onError,
    ...typography.labelSmall,
    fontSize: 9,
    fontWeight: 'bold',
  },
  label: {
    ...typography.labelMedium,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  labelActive: {
    color: colors.onSurface,
    fontWeight: 'bold',
  },
  labelInactive: {
    color: colors.onSurfaceVariant,
  },
  pressed: {
    opacity: 0.8,
  },
});
