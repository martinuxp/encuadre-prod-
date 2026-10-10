// ═══════════════════════════════════════════════════════
// Encuadre Prod. — SearchField (Componente MD3)
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, TextInput, StyleSheet, ViewStyle, Platform } from 'react-native';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { IconButton } from './IconButton';

interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  style?: ViewStyle;
}

export const SearchField: React.FC<SearchFieldProps> = ({
  value,
  onChangeText,
  placeholder = 'Buscar...',
  onClear,
  style,
}) => {
  const handleClear = () => {
    onChangeText('');
    if (onClear) onClear();
  };

  return (
    <View style={[styles.container, style]}>
      <MaterialCommunityIcons
        name="magnify"
        size={24}
        color={colors.onSurfaceVariant}
        style={styles.searchIcon}
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.onSurfaceAlpha38}
        style={[
          styles.input,
          Platform.OS === 'web' && { outlineStyle: 'none' } as any, // Quita el contorno web por defecto
        ]}
      />
      {value.length > 0 && (
        <IconButton
          icon="close"
          size={18}
          variant="standard"
          onPress={handleClear}
          style={styles.clearButton}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: shapes.full,
    paddingHorizontal: spacing.base,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.onSurface,
    ...typography.bodyLarge,
    padding: 0,
    backgroundColor: 'transparent',
  },
  clearButton: {
    marginLeft: spacing.xs,
  },
});
