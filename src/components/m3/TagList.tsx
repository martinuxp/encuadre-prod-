// ═══════════════════════════════════════════════════════
// Encuadre Prod. — TagList (Componente MD3)
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { colors, typography, shapes, spacing } from '@/theme/tokens';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface TagListProps {
  tags: string[];
  onRemoveTag?: (index: number) => void;
  style?: ViewStyle;
}

export const TagList: React.FC<TagListProps> = ({
  tags,
  onRemoveTag,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {tags.map((tag, index) => (
        <View key={`${tag}-${index}`} style={styles.tag}>
          <Text style={styles.text}>{tag}</Text>
          {onRemoveTag && (
            <Pressable onPress={() => onRemoveTag(index)} style={styles.removeBtn}>
              <MaterialCommunityIcons name="close-circle" size={14} color={colors.onSurfaceVariant} />
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: shapes.extraSmall,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  text: {
    ...typography.bodySmall,
    color: colors.onSurface,
  },
  removeBtn: {
    marginLeft: spacing.xs,
    marginRight: -spacing.xs / 2,
  },
});
