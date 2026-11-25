import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OptionGroup, OptionItem, Selections } from '../../types';
import { canAddMore, euro, ruleLabel } from '../../utils/composition';
import { FONT } from '../../theme/tokens';

interface RowProps {
  option: OptionItem;
  qty: number;
  single: boolean;
  soldOut: boolean;
  canAdd: boolean;
  onSet: (qty: number) => void;
}

const OptionRow = ({ option, qty, single, soldOut, canAdd, onSet }: RowProps) => {
  const id = option.id as string;
  const disabled = soldOut && qty === 0;
  const price = option.price > 0 ? (single ? euro(option.price) : `+${euro(option.price)}`) : 'incluso';
  if (single) {
    return (
      <TouchableOpacity
        style={[styles.row, qty > 0 && styles.rowActive, disabled && styles.rowDisabled]}
        onPress={() => onSet(qty > 0 ? 0 : 1)}
        disabled={disabled}
        testID={`composer-option-${id}`}
      >
        <Ionicons name={qty > 0 ? 'radio-button-on' : 'radio-button-off'} size={20} color={qty > 0 ? '#0E9F80' : '#98A4B8'} />
        <Text style={[styles.name, disabled && styles.nameDisabled]}>{option.name}</Text>
        <Text style={styles.price}>{soldOut ? 'Esaurito' : price}</Text>
      </TouchableOpacity>
    );
  }
  return (
    <View style={[styles.row, qty > 0 && styles.rowActive, disabled && styles.rowDisabled]} testID={`composer-option-${id}`}>
      <Text style={[styles.name, disabled && styles.nameDisabled]}>{option.name}</Text>
      <Text style={styles.price}>{soldOut ? 'Esaurito' : price}</Text>
      <View style={styles.stepper}>
        <TouchableOpacity style={[styles.stepBtn, qty === 0 && styles.stepBtnOff]} onPress={() => onSet(qty - 1)} disabled={qty === 0} testID={`composer-minus-${id}`}>
          <Ionicons name="remove" size={18} color={qty === 0 ? '#CFD6DB' : '#2A3547'} />
        </TouchableOpacity>
        <Text style={styles.qty} testID={`composer-qty-${id}`}>{qty}</Text>
        <TouchableOpacity style={[styles.stepBtn, (!canAdd || soldOut) && styles.stepBtnOff]} onPress={() => onSet(qty + 1)} disabled={!canAdd || soldOut} testID={`composer-plus-${id}`}>
          <Ionicons name="add" size={18} color={!canAdd || soldOut ? '#CFD6DB' : '#2A3547'} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

interface Props {
  groups: OptionGroup[];
  value: Selections;
  onChange: (next: Selections) => void;
  unavailable?: string[];
  keepIds?: string[];  // scelte già presenti nell'ordine: restano modificabili anche se esaurite
}

export const DishComposer = ({ groups, value, onChange, unavailable = [], keepIds = [] }: Props) => {
  const setQty = (g: OptionGroup, optionId: string, qty: number) => {
    const next = { ...value };
    if (g.maxSelect === 1 && qty > 0) g.options.forEach((o) => o.id && delete next[o.id]);
    if (qty > 0) next[optionId] = qty;
    else delete next[optionId];
    onChange(next);
  };
  return (
    <View style={styles.wrap} testID="dish-composer">
      {groups.map((g) => (
        <View key={g.id} style={styles.group} testID={`composer-group-${g.id}`}>
          <View style={styles.groupHeader}>
            <Text style={styles.groupName}>{g.name}</Text>
            <Text style={styles.rule}>{ruleLabel(g)}</Text>
          </View>
          {g.options
            .filter((o) => o.id && (o.active || value[o.id] > 0))
            .map((o) => {
              const id = o.id as string;
              return (
                <OptionRow
                  key={id}
                  option={o}
                  qty={value[id] || 0}
                  single={g.maxSelect === 1}
                  soldOut={unavailable.includes(id) && !keepIds.includes(id)}
                  canAdd={canAddMore(g, value, id)}
                  onSet={(q) => setQty(g, id, q)}
                />
              );
            })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#F8FAF5', borderRadius: 12, borderWidth: 1, borderColor: '#D1E7DD', padding: 10, marginTop: 6, marginBottom: 10, gap: 10 },
  group: { gap: 6 },
  groupHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  groupName: { fontFamily: FONT, fontSize: 15, fontWeight: '800', color: '#2A3547' },
  rule: { fontFamily: FONT, fontSize: 12, color: '#5A6A85' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0E6EB', minHeight: 46 },
  rowActive: { borderColor: '#0E9F80', backgroundColor: '#EAF6F0' },
  rowDisabled: { opacity: 0.45 },
  name: { fontFamily: FONT, flex: 1, fontSize: 15, fontWeight: '600', color: '#2A3547' },
  nameDisabled: { textDecorationLine: 'line-through' },
  price: { fontFamily: FONT, fontSize: 13, color: '#5A6A85', fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: '#CFD6DB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  stepBtnOff: { backgroundColor: '#F6F9FC' },
  qty: { fontFamily: FONT, minWidth: 22, textAlign: 'center', fontSize: 16, fontWeight: '800', color: '#2A3547' },
});
