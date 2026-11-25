import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OptionDraft, OptionRowEditor } from './OptionRowEditor';

export interface GroupDraft {
  id?: string;
  name: string;
  minSelect: number;
  maxSelect: number | null;
  allowRepeat: boolean;
  options: OptionDraft[];
  order: number;
}

const MODES = [
  { id: 'single_required', label: 'Una sola, obbligatoria', min: 1, max: 1 as number | null },
  { id: 'single_optional', label: 'Una sola, facoltativa', min: 0, max: 1 as number | null },
  { id: 'multi', label: 'Più scelte', min: 0, max: null as number | null },
];

const modeOf = (d: GroupDraft) => (d.maxSelect === 1 ? (d.minSelect >= 1 ? 'single_required' : 'single_optional') : 'multi');

const Stepper = ({ label, value, onChange, testID, infinite }: { label: string; value: number; onChange: (v: number) => void; testID: string; infinite?: boolean }) => (
  <View style={styles.stepperBox}>
    <Text style={styles.stepperLabel}>{label}</Text>
    <View style={styles.stepper}>
      <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(Math.max(0, value - 1))} testID={`${testID}-minus`}>
        <Ionicons name="remove" size={16} color="#1a202c" />
      </TouchableOpacity>
      <Text style={styles.stepValue} testID={`${testID}-value`}>{infinite && value === 0 ? 'nessun limite' : value}</Text>
      <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(value + 1)} testID={`${testID}-plus`}>
        <Ionicons name="add" size={16} color="#1a202c" />
      </TouchableOpacity>
    </View>
  </View>
);

interface Props {
  draft: GroupDraft;
  onChange: (next: GroupDraft) => void;
}

export const OptionGroupEditor = ({ draft, onChange }: Props) => {
  const mode = modeOf(draft);
  const setOption = (i: number, next: OptionDraft) => onChange({ ...draft, options: draft.options.map((o, idx) => (idx === i ? next : o)) });
  const addOption = () => onChange({ ...draft, options: [...draft.options, { name: '', priceText: '', allergens: [], active: true }] });
  return (
    <View style={styles.wrap} testID="option-group-editor">
      <Text style={styles.label}>Nome del gruppo *</Text>
      <TextInput
        style={styles.input}
        value={draft.name}
        onChangeText={(name) => onChange({ ...draft, name })}
        placeholder="Es: Base, Proteine, Pane"
        placeholderTextColor="#94a3b8"
        testID="option-group-name-input"
      />

      <Text style={styles.label}>Quante scelte</Text>
      <View style={styles.modes}>
        {MODES.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={[styles.mode, mode === m.id && styles.modeOn]}
            onPress={() => onChange({ ...draft, minSelect: m.min, maxSelect: m.max, allowRepeat: m.id === 'multi' ? draft.allowRepeat : false })}
            testID={`option-group-mode-${m.id}`}
          >
            <Text style={[styles.modeText, mode === m.id && styles.modeTextOn]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {mode === 'multi' && (
        <View style={styles.multiBox}>
          <View style={styles.steppers}>
            <Stepper label="Minimo" value={draft.minSelect} onChange={(v) => onChange({ ...draft, minSelect: v })} testID="option-group-min" />
            <Stepper
              label="Massimo"
              value={draft.maxSelect ?? 0}
              infinite
              onChange={(v) => onChange({ ...draft, maxSelect: v === 0 || (v === 1 && draft.maxSelect === 2) ? null : Math.max(v, 2) })}
              testID="option-group-max"
            />
          </View>
          <TouchableOpacity style={styles.repeat} onPress={() => onChange({ ...draft, allowRepeat: !draft.allowRepeat })} testID="option-group-repeat-toggle">
            <Ionicons name={draft.allowRepeat ? 'checkbox' : 'square-outline'} size={20} color={draft.allowRepeat ? '#00754A' : '#64748b'} />
            <Text style={styles.repeatText}>Stesso ingrediente più volte (es. doppio pollo)</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.label}>Ingredienti e prezzo ({draft.options.length})</Text>
      <Text style={styles.hint}>Il prezzo si somma a quello del piatto. Metti 0 se è incluso.</Text>
      <View style={styles.options}>
        {draft.options.map((o, i) => (
          <OptionRowEditor
            key={o.id || `new-${i}`}
            option={o}
            index={i}
            onChange={(next) => setOption(i, next)}
            onRemove={() => onChange({ ...draft, options: draft.options.filter((_, idx) => idx !== i) })}
          />
        ))}
      </View>
      <TouchableOpacity style={styles.addBtn} onPress={addOption} testID="option-add-btn">
        <Ionicons name="add-circle-outline" size={18} color="#00754A" />
        <Text style={styles.addText}>Aggiungi ingrediente</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 14, fontWeight: '700', color: '#1a202c', marginTop: 10 },
  hint: { fontSize: 12, color: '#64748b' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#1a202c', backgroundColor: '#fff' },
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mode: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff' },
  modeOn: { backgroundColor: '#1a202c', borderColor: '#1a202c' },
  modeText: { fontSize: 13, color: '#334155', fontWeight: '600' },
  modeTextOn: { color: '#fff' },
  multiBox: { gap: 8, padding: 10, borderRadius: 10, backgroundColor: '#f8fafc' },
  steppers: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  stepperBox: { gap: 4 },
  stepperLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  stepValue: { minWidth: 30, textAlign: 'center', fontSize: 14, fontWeight: '700', color: '#1a202c' },
  repeat: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  repeatText: { fontSize: 13, color: '#334155', flex: 1 },
  options: { gap: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: '#00754A', marginTop: 4 },
  addText: { color: '#00754A', fontWeight: '700', fontSize: 14 },
});
