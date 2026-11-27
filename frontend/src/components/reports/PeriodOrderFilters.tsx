import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PeriodFilters } from '../../services/api';
import { C, FONT, R, statusOf } from '../../theme/tokens';
import { STATUS_LABELS } from '../orders/orderMeta';

type Props = { search: string; onSearch: (v: string) => void; filters: PeriodFilters; onChange: (f: PeriodFilters) => void };

const STATUSES = ['', ...Object.keys(STATUS_LABELS)];

// Filtri dell'elenco ordini del Report: cliente, stato, solo da pagare
export const PeriodOrderFilters = ({ search, onSearch, filters, onChange }: Props) => (
  <View style={styles.wrap} testID="period-orders-filters">
    <View style={styles.search}>
      <Ionicons name="search" size={16} color={C.muted} />
      <TextInput value={search} onChangeText={onSearch} placeholder="Cerca cliente" placeholderTextColor={C.muted}
        style={styles.input} testID="period-orders-search" />
      {!!search && (
        <TouchableOpacity onPress={() => onSearch('')} testID="period-orders-search-clear">
          <Ionicons name="close-circle" size={18} color={C.muted} />
        </TouchableOpacity>
      )}
    </View>
    <View style={styles.chips}>
      {STATUSES.map((s) => {
        const on = (filters.status || '') === s;
        const tone = s ? statusOf(s) : { bg: C.primarySoft, fg: C.primaryDark, solid: C.primary };
        return (
          <TouchableOpacity key={s || 'all'} onPress={() => onChange({ ...filters, status: s || undefined })}
            style={[styles.chip, on && { backgroundColor: tone.bg, borderColor: tone.solid }]} testID={`period-orders-status-${s || 'all'}`}>
            <Text style={[styles.chipText, on && { color: tone.fg }]}>{s ? STATUS_LABELS[s] : 'Tutti'}</Text>
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity onPress={() => onChange({ ...filters, unpaidOnly: !filters.unpaidOnly })}
        style={[styles.chip, filters.unpaidOnly && styles.unpaidOn]} testID="period-orders-unpaid-toggle">
        <Ionicons name={filters.unpaidOnly ? 'checkbox' : 'square-outline'} size={15} color={filters.unpaidOnly ? C.warningFg : C.text2} />
        <Text style={[styles.chipText, filters.unpaidOnly && { color: C.warningFg }]}>Solo da pagare</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrap: { gap: 10, marginTop: 8, marginBottom: 4 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 42, borderRadius: R.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.canvas },
  input: { fontFamily: FONT, flex: 1, fontSize: 14, color: C.text, outlineStyle: 'none' } as any,
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: R.pill, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  chipText: { fontFamily: FONT, fontSize: 13, fontWeight: '600', color: C.text2 },
  unpaidOn: { backgroundColor: C.warningSoft, borderColor: C.warning },
});
