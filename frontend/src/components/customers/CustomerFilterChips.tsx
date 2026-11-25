import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '../motion/PressableScale';
import { C, FONT, R } from '../../theme/tokens';

export type CustomerView = 'active' | 'inactive' | 'archived';

const ITEMS: { key: CustomerView; label: string; icon: string }[] = [
  { key: 'active', label: 'Attivi', icon: 'people-outline' },
  { key: 'inactive', label: 'Senza ordini da 6 mesi', icon: 'hourglass-outline' },
  { key: 'archived', label: 'Archiviati', icon: 'archive-outline' },
];

type Props = { value: CustomerView; counts: Record<CustomerView, number>; onChange: (v: CustomerView) => void };

export const CustomerFilterChips = ({ value, counts, onChange }: Props) => (
  <View style={styles.row} testID="customers-view-filter">
    {ITEMS.map((it) => {
      const on = value === it.key;
      return (
        <PressableScale key={it.key} onPress={() => onChange(it.key)} style={[styles.chip, on && styles.chipOn]} testID={`customers-view-${it.key}`}>
          <Ionicons name={it.icon as any} size={16} color={on ? '#fff' : C.text2} />
          <Text style={[styles.label, on && styles.labelOn]}>{it.label}</Text>
          <View style={[styles.count, on && styles.countOn]}>
            <Text style={[styles.countText, on && styles.countTextOn]} testID={`customers-view-${it.key}-count`}>{counts[it.key]}</Text>
          </View>
        </PressableScale>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 44, paddingHorizontal: 14,
    borderRadius: R.pill, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  label: { fontFamily: FONT, fontSize: 14, fontWeight: '700', color: C.text2 },
  labelOn: { color: '#fff' },
  count: { minWidth: 24, height: 22, borderRadius: 11, paddingHorizontal: 7, backgroundColor: C.sunken, alignItems: 'center', justifyContent: 'center' },
  countOn: { backgroundColor: 'rgba(255,255,255,0.25)' },
  countText: { fontFamily: FONT, fontSize: 12, fontWeight: '800', color: C.text2 },
  countTextOn: { color: '#fff' },
});
