import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { labelFor } from '../utils/dishLabels';

// Riepilogo compatto di tag e allergeni nella scheda piatto
export const DishLabelsSummary = ({ tags = [], allergens = [], dishId }: { tags?: string[]; allergens?: string[]; dishId: string }) => {
  if (!tags.length && !allergens.length) return null;
  return (
    <View style={styles.wrap} testID={`dish-labels-${dishId}`}>
      {tags.map((t) => (
        <View key={`t-${t}`} style={[styles.pill, styles.tag]}>
          <Text style={[styles.text, styles.tagText]}>{labelFor(t)}</Text>
        </View>
      ))}
      {allergens.length > 0 && (
        <View style={[styles.pill, styles.allergen]}>
          <Text style={[styles.text, styles.allergenText]} numberOfLines={2}>
            {`Allergeni: ${allergens.map(labelFor).join(', ')}`}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tag: { backgroundColor: '#e6f4ee' },
  allergen: { backgroundColor: '#fdecec', flexShrink: 1 },
  text: { fontSize: 12, fontWeight: '600' },
  tagText: { color: '#00754A' },
  allergenText: { color: '#b00006' },
});
