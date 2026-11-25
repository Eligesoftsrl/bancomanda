import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ALLERGENS } from '../../utils/dishLabels';
import { FONT } from '../../theme/tokens';

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
          placeholderTextColor="#98A4B8"
          testID={`option-name-${index}`}
        />
        <TextInput
          style={[styles.input, styles.priceInput]}
          value={option.priceText}
          onChangeText={(priceText) => onChange({ ...option, priceText })}
          placeholder="€"
          placeholderTextColor="#98A4B8"
          keyboardType="decimal-pad"
          testID={`option-price-${index}`}
        />
        <TouchableOpacity onPress={onRemove} style={styles.iconBtn} testID={`option-remove-${index}`}>
          <Ionicons name="trash-outline" size={18} color="#F2545B" />
        </TouchableOpacity>
      </View>
      <View style={styles.line}>
        <TouchableOpacity style={styles.smallBtn} onPress={() => onChange({ ...option, active: !option.active })} testID={`option-active-${index}`}>
          <Ionicons name={option.active ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={option.active ? '#0E9F80' : '#98A4B8'} />
          <Text style={styles.smallText}>{option.active ? 'Attivo' : 'Disattivo'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.smallBtn} onPress={() => setShowAllergens(!showAllergens)} testID={`option-allergens-toggle-${index}`}>
          <Ionicons name="warning-outline" size={16} color="#F2545B" />
          <Text style={styles.smallText}>Allergeni ({option.allergens.length})</Text>
          <Ionicons name={showAllergens ? 'chevron-up' : 'chevron-down'} size={14} color="#5A6A85" />
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
  card: { borderWidth: 1, borderColor: '#E0E6EB', borderRadius: 10, padding: 8, gap: 6, backgroundColor: '#fff' },
  cardOff: { opacity: 0.6 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  input: { fontFamily: FONT, borderWidth: 1, borderColor: '#CFD6DB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15, color: '#2A3547', backgroundColor: '#fff' },
  nameInput: { flex: 1, minWidth: 140 },
  priceInput: { width: 80, textAlign: 'right' },
  iconBtn: { padding: 6 },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999, backgroundColor: '#EFF4FA' },
  smallText: { fontFamily: FONT, fontSize: 12, color: '#2A3547', fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: '#CFD6DB', backgroundColor: '#fff' },
  chipOn: { backgroundColor: '#00A1FF', borderColor: '#00A1FF' },
  chipText: { fontFamily: FONT, fontSize: 12, color: '#2A3547' },
  chipTextOn: { color: '#fff', fontWeight: '700' },
});
