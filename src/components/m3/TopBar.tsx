// ═══════════════════════════════════════════════════════
// Encuadre Prod. — TopBar (Componente MD3)
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, Platform, Animated } from 'react-native';
import { colors, typography, layout, spacing } from '@/theme/tokens';
import { brand, brandAssets } from '@/constants/brand';
import { IconButton } from './IconButton';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEnterAnimation } from '@/theme/animation';

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightActions?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({
  title,
  showBack = false,
  onBackPress,
  rightActions,
}) => {
  const router = useRouter();
  const { opacity, scale } = useEnterAnimation(1);

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <Animated.View style={[styles.topBar, { opacity, transform: [{ translateY: scale.interpolate({ inputRange: [0.96, 1], outputRange: [-8, 0] }) }] }]}>
      <View style={styles.leftSection}>
        {showBack ? (
          <IconButton
            icon="arrow-left"
            variant="standard"
            onPress={handleBack}
            style={styles.backBtn}
          />
        ) : (
          <View style={styles.logoContainer}>
            {/* Logo de Encuadre */}
            <Image
              source={brandAssets.logoSvg}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        )}

        {title && (
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        )}
      </View>

      <View style={styles.rightSection}>
        {rightActions}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  topBar: {
    height: layout.topBarHeight,
    backgroundColor: colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    marginRight: spacing.sm,
  },
  logoContainer: {
    height: 32,
    width: 140,
    justifyContent: 'center',
    marginRight: spacing.base,
  },
  logo: {
    height: '100%',
    width: '100%',
    ...Platform.select({
      web: {
        filter: 'brightness(0) invert(1)', // Nos aseguramos que sea blanco en modo oscuro
      } as any,
    }),
  },
  title: {
    ...typography.titleLarge,
    color: colors.onSurface,
    fontWeight: 'bold',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
