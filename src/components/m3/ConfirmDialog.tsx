// ═══════════════════════════════════════════════════════
// Encuadre Prod. — ConfirmDialog (Componente MD3)
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, Text, Modal, StyleSheet, ViewStyle, Pressable, StyleProp, Platform, Animated } from 'react-native';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { ActionButton } from './ActionButton';
import { ease, duration } from '@/theme/animation';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  isDestructive = false,
  style,
}) => {
  const backdropOpacity = React.useRef(new Animated.Value(0)).current;
  const dialogScale = React.useRef(new Animated.Value(0.9)).current;
  const dialogOpacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      backdropOpacity.setValue(0);
      dialogScale.setValue(0.9);
      dialogOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: duration.short4,
          easing: ease.standard,
          useNativeDriver: true,
        }),
        Animated.timing(dialogScale, {
          toValue: 1,
          duration: duration.medium2,
          easing: ease.spring,
          useNativeDriver: true,
        }),
        Animated.timing(dialogOpacity, {
          toValue: 1,
          duration: duration.medium2,
          easing: ease.emphasizedDecelerate,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onCancel}
    >
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={styles.backdropPressable} onPress={onCancel}>
          <Animated.View
            style={[
              styles.dialog,
              style as any,
              {
                opacity: dialogOpacity,
                transform: [{ scale: dialogScale }],
              },
            ]}
          >
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            <View style={styles.actions}>
              <ActionButton
                label={cancelLabel}
                onPress={onCancel}
                variant="text"
                style={styles.btn}
              />
              <ActionButton
                label={confirmLabel}
                onPress={onConfirm}
                variant="filled"
                style={[
                  styles.btn,
                  isDestructive && { backgroundColor: colors.error },
                ] as any}
                labelStyle={isDestructive ? { color: colors.onError } : undefined}
              />
            </View>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  backdropPressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: shapes.extraLarge,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    elevation: 6,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
      } as any,
      default: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
    }),
  },
  title: {
    ...typography.headlineSmall,
    color: colors.onSurface,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  btn: {
    height: 36,
  },
});
