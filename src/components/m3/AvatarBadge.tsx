// ═══════════════════════════════════════════════════════
// Encuadre Prod. — AvatarBadge (Componente MD3)
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle, TextStyle } from 'react-native';
import { colors, typography, shapes } from '@/theme/tokens';

interface AvatarBadgeProps {
  name: string;
  imageUrl?: string;
  size?: number;
  badgeColor?: string; // Por ejemplo, colors.success o colors.warning para estatus
  style?: ViewStyle;
}

export const AvatarBadge: React.FC<AvatarBadgeProps> = ({
  name,
  imageUrl,
  size = 40,
  badgeColor,
  style,
}) => {
  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  };

  const initials = getInitials(name);
  const badgeSize = Math.max(10, Math.floor(size / 4));

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.primaryContainer,
            },
          ]}
        >
          <Text
            style={[
              styles.initials,
              {
                fontSize: Math.floor(size * 0.4),
                color: colors.onPrimaryContainer,
              },
            ]}
          >
            {initials}
          </Text>
        </View>
      )}

      {badgeColor && (
        <View
          style={[
            styles.badge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: badgeColor,
              bottom: 0,
              right: 0,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  avatar: {
    resizeMode: 'cover',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    ...typography.labelLarge,
    fontWeight: 'bold',
  },
  badge: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.background,
  },
});
