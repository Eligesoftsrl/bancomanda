import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OptionGroup } from '../../types';
import { FONT } from '../../theme/tokens';

interface Props {
  enabled: boolean;
  groupIds: string[];
  groups: OptionGroup[];
  onToggle: () => void;
  onChangeGroups: (ids: string[]) => void;
}

// Sezione "Piatto componibile" nella scheda del piatto
export const ComposableDishFields = ({ enabled, groupIds, groups, onToggle, onChangeGroups }: Props) => (
  <View style={styles.wrap} testID="composable-dish-fields">
    <TouchableOpacity style={[styles.toggle, enabled && styles.toggleOn]} onPress={onToggle} testID="dish-composable-toggle">
      <Ionicons name={enabled ? 'layers' : 'layers-outline'} size={24} color={enabled ? '#0E9F80' : '#5A6A85'} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.toggleLabel, enabled && styles.toggleLabelOn]}>Piatto componibile</Text>
        <Text style={styles.hint}>Il cliente sceglie gli ingredienti (es. base + proteine). Il prezzo si calcola da solo.</Text>
      </View>
    </TouchableOpacity>
    {enabled && (
      <View style={styles.groupsBox}>
        <Text style={styles.label}>Liste di scelta, nell&apos;ordine in cui si scelgono</Text>
        {groups.length === 0 ? (
          <Text style={styles.hint} testID="dish-no-groups-hint">Non hai ancora liste di scelta: chiudi e creale dal pulsante &quot;Liste di scelta&quot; in alto.</Text>
        ) : (
          <View style={styles.chips}>
            {groups.map((g) => {
              const pos = groupIds.indexOf(g.id);
              const on = pos >= 0;
              return (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.chip, on && styles.chipOn]}
                  onPress={() => onChangeGroups(on ? groupIds.filter((id) => id !== g.id) : [...groupIds, g.id])}
                  testID={`dish-group-chip-${g.id}`}
                >
                  {on && <Text style={styles.pos}>{pos + 1}</Text>}
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{g.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  wrap: { marginTop: 12, gap: 8 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E0E6EB', backgroundColor: '#fff' },
  toggleOn: { borderColor: '#0E9F80', backgroundColor: '#EAF6F0' },
  toggleLabel: { fontFamily: FONT, fontSize: 15, fontWeight: '700', color: '#2A3547' },
  toggleLabelOn: { color: '#0E9F80' },
  hint: { fontFamily: FONT, fontSize: 12, color: '#5A6A85', marginTop: 2 },
  groupsBox: { gap: 8, padding: 10, borderRadius: 12, backgroundColor: '#F6F9FC' },
  label: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: '#2A3547' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: '#CFD6DB', backgroundColor: '#fff' },
  chipOn: { backgroundColor: '#0E9F80', borderColor: '#0E9F80' },
  chipText: { fontFamily: FONT, fontSize: 14, color: '#2A3547', fontWeight: '600' },
  chipTextOn: { color: '#fff' },
  pos: { fontFamily: FONT, width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', color: '#0E9F80', fontSize: 11, fontWeight: '800', textAlign: 'center', lineHeight: 18, overflow: 'hidden' },
});
