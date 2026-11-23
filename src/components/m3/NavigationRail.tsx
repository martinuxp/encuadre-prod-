// ═══════════════════════════════════════════════════════
// Encuadre Prod. — NavigationRail (Componente MD3)
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Animated } from 'react-native';
import { colors, typography, layout, spacing, shapes } from '@/theme/tokens';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NavigationItem } from '@/types';
import { useRouter } from 'expo-router';

interface NavigationRailProps {
  items: NavigationItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  style?: any;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  items,
  activeKey,
  onSelect,
  style,
}) => {
  const router = useRouter();

  return (
    <View style={[styles.rail, style]}>
      <View style={styles.topSection}>
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
                  color={isActive ? '#000000' : colors.onSurfaceVariant}
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

      <View style={styles.bottomSection}>
        <Pressable
          onPress={() => router.push('/settings')}
          style={styles.settingsBtn}
        >
          <MaterialCommunityIcons name="cog-outline" size={24} color={colors.onSurfaceVariant} />
          <Text style={styles.settingsLabel}>Ajustes</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rail: {
    width: layout.navRailWidth,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRightWidth: 1,
    borderRightColor: colors.outlineVariant,
    alignItems: 'center',
    paddingVertical: spacing.base,
    justifyContent: 'space-between',
    height: '100%',
  },
  topSection: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.lg,
  },
  item: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: spacing.xs,
  },
  iconContainer: {
    width: 56,
    height: 32,
    borderRadius: shapes.small,
    borderTopLeftRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...Platform.select({
      web: {
        transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1), background-color 300ms cubic-bezier(0.16, 1, 0.3, 1)',
      } as any,
    }),
  },
  iconContainerActive: {
    backgroundColor: '#FFFFFF',
  },
  iconContainerInactive: {
    backgroundColor: 'transparent',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: 8,
    backgroundColor: colors.error,
    borderRadius: 8,
    paddingHorizontal: 5,
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
    width: '90%',
  },
  labelActive: {
    color: colors.onSurface,
    fontWeight: 'bold',
  },
  labelInactive: {
    color: colors.onSurfaceVariant,
  },
  bottomSection: {
    alignItems: 'center',
  },
  settingsBtn: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  settingsLabel: {
    ...typography.labelMedium,
    color: colors.onSurfaceVariant,
  },
  pressed: {
    opacity: 0.7,
  },
});
