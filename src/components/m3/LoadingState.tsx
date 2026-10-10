// ═══════════════════════════════════════════════════════
// Encuadre Prod. — LoadingState (Componente MD3)
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ViewStyle, Animated, Easing } from 'react-native';
import { colors, typography, spacing } from '@/theme/tokens';

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
  style?: ViewStyle;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Cargando...',
  fullScreen = false,
  style,
}) => {
  const pulse = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.5, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <View style={[styles.container, fullScreen && styles.fullScreen, style]}>
      <Animated.View style={{ opacity: pulse }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </Animated.View>
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  fullScreen: {
    flex: 1,
    height: '100%',
    backgroundColor: colors.background,
    minHeight: 200,
  },
  message: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    marginTop: spacing.base,
  },
});
