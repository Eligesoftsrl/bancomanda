import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OptionGroup, Selections } from '../../types';
import { DishComposer } from './DishComposer';
import { euro, selectionExtra, selectionNames } from '../../utils/composition';
import { FONT } from '../../theme/tokens';

interface Props {
  enabled: boolean;
  groups: OptionGroup[];
  value: Selections;
  onToggle: () => void;
  onChange: (next: Selections) => void;
}

// Scheda piatto: ricetta fissa di un piatto componibile (es. panino già formato)
export const PresetDishFields = ({ enabled, groups, value, onToggle, onChange }: Props) => (
  <View style={styles.wrap} testID="preset-dish-fields">
    <TouchableOpacity style={[styles.toggle, enabled && styles.toggleOn]} onPress={onToggle} testID="dish-preset-toggle">
      <Ionicons name={enabled ? 'fast-food' : 'fast-food-outline'} size={24} color={enabled ? '#0E9F80' : '#5A6A85'} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, enabled && styles.labelOn]}>Piatto già composto</Text>
        <Text style={styles.hint}>
          Spunta gli ingredienti della ricetta: va a menu già pronto e all&apos;ordine si tolgono o aggiungono ingredienti.
        </Text>
      </View>
    </TouchableOpacity>
    {enabled && (
      <>
        <DishComposer groups={groups} value={value} onChange={onChange} />
        <View style={styles.summary} testID="dish-preset-summary">
          <Text style={styles.summaryText}>{selectionNames(groups, value) || 'Nessun ingrediente spuntato'}</Text>
          <Text style={styles.summaryPrice} testID="dish-preset-ingredients-value">
            Valore ingredienti {euro(selectionExtra(groups, value))}
          </Text>
        </View>
      </>
    )}
  </View>
);

const styles = StyleSheet.create({
  wrap: { marginTop: 10, gap: 6 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E0E6EB', backgroundColor: '#fff' },
  toggleOn: { borderColor: '#0E9F80', backgroundColor: '#EAF6F0' },
  label: { fontFamily: FONT, fontSize: 15, fontWeight: '700', color: '#2A3547' },
  labelOn: { color: '#0E9F80' },
  hint: { fontFamily: FONT, fontSize: 12, color: '#5A6A85', marginTop: 2 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6, paddingHorizontal: 4 },
  summaryText: { fontFamily: FONT, flex: 1, minWidth: 160, fontSize: 13, fontWeight: '600', color: '#2A3547' },
  summaryPrice: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: '#5A6A85' },
});
