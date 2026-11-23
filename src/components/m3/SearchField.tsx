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
        accessibilityLabel={placeholder || 'Buscar'}
        accessibilityRole="search"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        style={[
          styles.input,
          Platform.OS === 'web' && { outlineStyle: 'none' } as any, // Quita el contorno web por defecto
        ]}
      />
      {value.length > 0 && (
        <IconButton
          icon="close"
          accessibilityLabel="Borrar búsqueda"
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: shapes.small,
    borderTopLeftRadius: 24,
    paddingHorizontal: spacing.base,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
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
