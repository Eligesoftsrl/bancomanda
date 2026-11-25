import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ALLERGENS } from '../../utils/dishLabels';

export interface OptionDraft {
  id?: string;
  name: string;
  priceText: string;
  allergens: string[];
  active: boolean;
}

interface Props {
  option: OptionDraft;
  index: number;
  onChange: (next: OptionDraft) => void;
  onRemove: () => void;
}

export const OptionRowEditor = ({ option, index, onChange, onRemove }: Props) => {
  const [showAllergens, setShowAllergens] = useState(false);
  const toggleAllergen = (id: string) =>
    onChange({ ...option, allergens: option.allergens.includes(id) ? option.allergens.filter((a) => a !== id) : [...option.allergens, id] });
  return (
    <View style={[styles.card, !option.active && styles.cardOff]} testID={`option-row-${index}`}>
      <View style={styles.line}>
        <TextInput
          style={[styles.input, styles.nameInput]}
          value={option.name}
          onChangeText={(name) => onChange({ ...option, name })}
          placeholder="Es: Pollo"
          placeholderTextColor="#94a3b8"
          testID={`option-name-${index}`}
        />
        <TextInput
          style={[styles.input, styles.priceInput]}
          value={option.priceText}
          onChangeText={(priceText) => onChange({ ...option, priceText })}
          placeholder="€"
          placeholderTextColor="#94a3b8"
          keyboardType="decimal-pad"
          testID={`option-price-${index}`}
        />
        <TouchableOpacity onPress={onRemove} style={styles.iconBtn} testID={`option-remove-${index}`}>
          <Ionicons name="trash-outline" size={18} color="#DB0007" />
        </TouchableOpacity>
      </View>
      <View style={styles.line}>
        <TouchableOpacity style={styles.smallBtn} onPress={() => onChange({ ...option, active: !option.active })} testID={`option-active-${index}`}>
          <Ionicons name={option.active ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={option.active ? '#00754A' : '#94a3b8'} />
          <Text style={styles.smallText}>{option.active ? 'Attivo' : 'Disattivo'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.smallBtn} onPress={() => setShowAllergens(!showAllergens)} testID={`option-allergens-toggle-${index}`}>
          <Ionicons name="warning-outline" size={16} color="#DB0007" />
          <Text style={styles.smallText}>Allergeni ({option.allergens.length})</Text>
          <Ionicons name={showAllergens ? 'chevron-up' : 'chevron-down'} size={14} color="#64748b" />
        </TouchableOpacity>
      </View>
      {showAllergens && (
        <View style={styles.chips}>
          {ALLERGENS.map((a) => {
            const on = option.allergens.includes(a.id);
            return (
              <TouchableOpacity key={a.id} style={[styles.chip, on && styles.chipOn]} onPress={() => toggleAllergen(a.id)} testID={`option-${index}-allergen-${a.id}`}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{a.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 8, gap: 6, backgroundColor: '#fff' },
  cardOff: { opacity: 0.6 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15, color: '#1a202c', backgroundColor: '#fff' },
  nameInput: { flex: 1, minWidth: 140 },
  priceInput: { width: 80, textAlign: 'right' },
  iconBtn: { padding: 6 },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999, backgroundColor: '#f1f5f9' },
  smallText: { fontSize: 12, color: '#334155', fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff' },
  chipOn: { backgroundColor: '#DB0007', borderColor: '#DB0007' },
  chipText: { fontSize: 12, color: '#334155' },
  chipTextOn: { color: '#fff', fontWeight: '700' },
});
