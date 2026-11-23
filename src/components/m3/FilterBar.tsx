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
            accessibilityRole="button"
            aria-pressed={isSelected}
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
    minHeight: 44,
    paddingHorizontal: spacing.base,
    borderRadius: shapes.small,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'background-color 300ms cubic-bezier(0.16, 1, 0.3, 1), color 300ms cubic-bezier(0.16, 1, 0.3, 1)',
      } as any,
    }),
  },
  chipSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  chipUnselected: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  label: {
    ...typography.labelLarge,
    fontWeight: '600',
  },
  labelSelected: {
    color: '#000000',
    fontWeight: '800',
  },
  labelUnselected: {
    color: colors.onSurfaceVariant,
  },
});
