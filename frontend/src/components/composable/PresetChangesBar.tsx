import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OptionGroup, Selections } from '../../types';
import { presetChangesText, presetDiff } from '../../utils/composition';
import { FONT } from '../../theme/tokens';

interface Props {
  groups: OptionGroup[];
  preset: Selections;
  value: Selections;
  onReset: () => void;
}

// Ordine di un piatto già composto: cosa cambia rispetto alla ricetta
export const PresetChangesBar = ({ groups, preset, value, onReset }: Props) => {
  const text = presetChangesText(presetDiff(groups, preset, value));
  return (
    <View style={[styles.bar, !!text && styles.barChanged]} testID="preset-changes-bar">
      <Ionicons name={text ? 'swap-horizontal' : 'checkmark-circle'} size={16} color={text ? '#B25E09' : '#0E9F80'} />
      <Text style={styles.text} testID="preset-changes-text">{text || 'Come da ricetta'}</Text>
      {!!text && (
        <TouchableOpacity onPress={onReset} style={styles.reset} testID="preset-reset-btn">
          <Ionicons name="refresh" size={14} color="#0B6FB8" />
          <Text style={styles.resetText}>Ripristina</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#EAF6F0', marginTop: 6 },
  barChanged: { backgroundColor: '#FEF5E5' },
  text: { fontFamily: FONT, flex: 1, fontSize: 13, fontWeight: '700', color: '#2A3547' },
  reset: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999, backgroundColor: '#fff' },
  resetText: { fontFamily: FONT, fontSize: 12, fontWeight: '700', color: '#0B6FB8' },
});
