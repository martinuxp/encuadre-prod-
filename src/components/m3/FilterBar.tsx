// ═══════════════════════════════════════════════════════
// Encuadre Prod. — FilterBar (Componente MD3)
// ═══════════════════════════════════════════════════════

import React from 'react';
import { ScrollView, StyleSheet, Pressable, Text, ViewStyle, Platform } from 'react-native';
import { colors, typography, shapes, spacing } from '@/theme/tokens';

export interface FilterOption {
  key: string;
  label: string;
}

interface FilterBarProps {
  options: FilterOption[];
  selectedKey: string;
  onSelect: (key: string) => void;
  style?: ViewStyle;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  options,
  selectedKey,
  onSelect,
  style,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.container, style]}
      contentContainerStyle={styles.contentContainer}
    >
      {options.map((option) => {
        const isSelected = option.key === selectedKey;
        return (
          <Pressable
            key={option.key}
            onPress={() => onSelect(option.key)}
            style={[
              styles.chip,
              isSelected ? styles.chipSelected : styles.chipUnselected,
            ]}
          >
            <Text
              style={[
                styles.label,
                isSelected ? styles.labelSelected : styles.labelUnselected,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: 40,
  },
  contentContainer: {
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    gap: spacing.sm,
  },
  chip: {
    height: 34,
    paddingHorizontal: spacing.base,
    borderRadius: shapes.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1), background-color 200ms cubic-bezier(0.2, 0, 0, 1), border-color 200ms cubic-bezier(0.2, 0, 0, 1)',
      } as any,
    }),
  },
  chipSelected: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  chipUnselected: {
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.outlineVariant,
  },
  label: {
    ...typography.labelLarge,
    fontWeight: '600',
  },
  labelSelected: {
    color: colors.onPrimaryContainer,
  },
  labelUnselected: {
    color: colors.onSurfaceVariant,
  },
});
