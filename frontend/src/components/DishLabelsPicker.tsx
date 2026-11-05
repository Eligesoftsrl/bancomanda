import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ALLERGENS, PRESET_TAGS } from '../utils/dishLabels';

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

const Chip = ({ label, active, color, onPress, testID }: { label: string; active: boolean; color: string; onPress: () => void; testID: string }) => (
  <TouchableOpacity
    style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}
    onPress={onPress}
    testID={testID}
  >
    {active && <Ionicons name="checkmark" size={14} color="#ffffff" />}
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

interface Props {
  tags: string[];
  allergens: string[];
  onChangeTags: (tags: string[]) => void;
  onChangeAllergens: (allergens: string[]) => void;
}

export const DishLabelsPicker = ({ tags, allergens, onChangeTags, onChangeAllergens }: Props) => {
  const [customTag, setCustomTag] = useState('');
  const presetIds = PRESET_TAGS.map((t) => t.id);
  const customTags = tags.filter((t) => !presetIds.includes(t));

  const addCustomTag = () => {
    const value = customTag.trim();
    if (value && !tags.some((t) => t.toLowerCase() === value.toLowerCase())) onChangeTags([...tags, value]);
    setCustomTag('');
  };

  return (
    <View testID="dish-labels-picker">
      <Text style={styles.label}>Allergeni ({allergens.length})</Text>
      <View style={styles.wrap}>
        {ALLERGENS.map((a) => (
          <Chip key={a.id} label={a.label} active={allergens.includes(a.id)} color="#DB0007"
            onPress={() => onChangeAllergens(toggle(allergens, a.id))} testID={`allergen-chip-${a.id}`} />
        ))}
      </View>

      <Text style={styles.label}>Tag</Text>
      <View style={styles.wrap}>
        {PRESET_TAGS.map((t) => (
          <Chip key={t.id} label={t.label} active={tags.includes(t.id)} color="#00754A"
            onPress={() => onChangeTags(toggle(tags, t.id))} testID={`tag-chip-${t.id}`} />
        ))}
        {customTags.map((t) => (
          <TouchableOpacity key={t} style={[styles.chip, styles.customChip]} onPress={() => onChangeTags(tags.filter((x) => x !== t))} testID={`custom-tag-${t}`}>
            <Text style={[styles.chipText, styles.chipTextActive]}>{t}</Text>
            <Ionicons name="close" size={14} color="#ffffff" />
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.customRow}>
        <TextInput
          style={styles.customInput}
          value={customTag}
          onChangeText={setCustomTag}
          placeholder="Aggiungi un tag tuo, es. Ricetta della nonna"
          placeholderTextColor="#94a3b8"
          onSubmitEditing={addCustomTag}
          returnKeyType="done"
          maxLength={40}
          testID="custom-tag-input"
        />
        <TouchableOpacity style={[styles.addBtn, !customTag.trim() && styles.addBtnDisabled]} onPress={addCustomTag} disabled={!customTag.trim()} testID="custom-tag-add-button">
          <Ionicons name="add" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  label: { color: '#64748b', fontSize: 14, marginBottom: 8, marginTop: 16 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dde4ee',
    backgroundColor: '#f5f7fa',
  },
  customChip: { backgroundColor: '#5423E7', borderColor: '#5423E7' },
  chipText: { color: '#334155', fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: '#ffffff', fontWeight: '600' },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  customInput: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    color: '#1a202c',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 15,
  },
  addBtn: { backgroundColor: '#5423E7', borderRadius: 10, padding: 11 },
  addBtnDisabled: { opacity: 0.4 },
});
