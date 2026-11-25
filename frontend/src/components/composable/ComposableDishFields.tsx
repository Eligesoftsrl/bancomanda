import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OptionGroup } from '../../types';

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
      <Ionicons name={enabled ? 'layers' : 'layers-outline'} size={24} color={enabled ? '#00754A' : '#64748b'} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.toggleLabel, enabled && styles.toggleLabelOn]}>Piatto componibile</Text>
        <Text style={styles.hint}>Il cliente sceglie gli ingredienti (es. base + proteine). Il prezzo si calcola da solo.</Text>
      </View>
    </TouchableOpacity>
    {enabled && (
      <View style={styles.groupsBox}>
        <Text style={styles.label}>Gruppi di scelta, nell&apos;ordine in cui si scelgono</Text>
        {groups.length === 0 ? (
          <Text style={styles.hint} testID="dish-no-groups-hint">Non hai ancora gruppi di scelta: chiudi e crea i gruppi dal pulsante &quot;Gruppi&quot; in alto.</Text>
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
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  toggleOn: { borderColor: '#00754A', backgroundColor: '#EAF6F0' },
  toggleLabel: { fontSize: 15, fontWeight: '700', color: '#1a202c' },
  toggleLabelOn: { color: '#00754A' },
  hint: { fontSize: 12, color: '#64748b', marginTop: 2 },
  groupsBox: { gap: 8, padding: 10, borderRadius: 12, backgroundColor: '#f8fafc' },
  label: { fontSize: 13, fontWeight: '700', color: '#1a202c' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff' },
  chipOn: { backgroundColor: '#00754A', borderColor: '#00754A' },
  chipText: { fontSize: 14, color: '#334155', fontWeight: '600' },
  chipTextOn: { color: '#fff' },
  pos: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', color: '#00754A', fontSize: 11, fontWeight: '800', textAlign: 'center', lineHeight: 18, overflow: 'hidden' },
});
