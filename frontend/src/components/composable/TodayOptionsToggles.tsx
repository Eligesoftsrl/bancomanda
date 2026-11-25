import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OptionGroup } from '../../types';
import { euro } from '../../utils/composition';
import { FONT } from '../../theme/tokens';

interface Props {
  groups: OptionGroup[];
  unavailable: string[];
  onChange: (ids: string[]) => void;
}

// Menu del giorno: interruttore "esaurito oggi" per ogni ingrediente del piatto componibile
export const TodayOptionsToggles = ({ groups, unavailable, onChange }: Props) => {
  const toggle = (id: string) => onChange(unavailable.includes(id) ? unavailable.filter((x) => x !== id) : [...unavailable, id]);
  return (
    <View style={styles.wrap} testID="today-options-toggles">
      <Text style={styles.title}>Ingredienti di oggi</Text>
      <Text style={styles.hint}>Tocca un ingrediente per segnarlo esaurito oggi in questo piatto: non si potrà scegliere e sparirà dal sito.</Text>
      <ScrollView style={styles.scroll} nestedScrollEnabled showsVerticalScrollIndicator={Platform.OS === 'web'}>
        {groups.map((g) => (
          <View key={g.id} style={styles.group}>
            <Text style={styles.groupName}>{g.name}</Text>
            <View style={styles.chips}>
              {g.options.filter((o) => o.active && o.id).map((o) => {
                const id = o.id as string;
                const out = unavailable.includes(id);
                return (
                  <TouchableOpacity key={id} style={[styles.chip, out && styles.chipOut]} onPress={() => toggle(id)} testID={`today-option-${id}`}>
                    <Ionicons name={out ? 'close-circle' : 'checkmark-circle'} size={16} color={out ? '#fff' : '#0E9F80'} />
                    <Text style={[styles.chipText, out && styles.chipTextOut]}>{o.name}</Text>
                    <Text style={[styles.chipPrice, out && styles.chipTextOut]}>{out ? 'esaurito' : euro(o.price)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginTop: 12, gap: 4 },
  title: { fontFamily: FONT, fontSize: 15, fontWeight: '800', color: '#2A3547' },
  hint: { fontFamily: FONT, fontSize: 12, color: '#5A6A85' },
  scroll: { maxHeight: 240, marginTop: 4 },
  group: { marginBottom: 8, gap: 6 },
  groupName: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: '#2A3547' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: '#0E9F80', backgroundColor: '#EAF6F0' },
  chipOut: { backgroundColor: '#00A1FF', borderColor: '#00A1FF' },
  chipText: { fontFamily: FONT, fontSize: 14, fontWeight: '700', color: '#2A3547' },
  chipPrice: { fontFamily: FONT, fontSize: 12, color: '#5A6A85' },
  chipTextOut: { color: '#fff' },
});
