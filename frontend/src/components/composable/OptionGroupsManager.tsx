import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { optionGroupsApi } from '../../services/api';
import { notify } from '../../store/toastStore';
import { OptionGroup } from '../../types';
import { euro, ruleLabel } from '../../utils/composition';
import { GroupDraft, OptionGroupEditor } from './OptionGroupEditor';

const toDraft = (g?: OptionGroup, order = 0): GroupDraft =>
  g
    ? { ...g, options: g.options.map((o) => ({ ...o, priceText: o.price.toFixed(2) })) }
    : { name: '', minSelect: 0, maxSelect: null, allowRepeat: true, options: [], order };

const parseDraft = (d: GroupDraft): Omit<OptionGroup, 'id'> | string => {
  if (!d.name.trim()) return 'Inserisci il nome del gruppo';
  if (!d.options.length) return 'Aggiungi almeno un ingrediente';
  const options = [];
  for (const o of d.options) {
    const price = parseFloat((o.priceText || '0').replace(',', '.'));
    if (!o.name.trim()) return 'Ogni ingrediente deve avere un nome';
    if (isNaN(price) || price < 0) return `Prezzo non valido per ${o.name}`;
    options.push({ id: o.id, name: o.name.trim(), price, allergens: o.allergens, active: o.active });
  }
  return { name: d.name.trim(), minSelect: d.minSelect, maxSelect: d.maxSelect, allowRepeat: d.allowRepeat, options, order: d.order };
};

interface Props {
  visible: boolean;
  groups: OptionGroup[];
  onClose: () => void;
  onChanged: (groups: OptionGroup[]) => void;
}

export const OptionGroupsManager = ({ visible, groups, onClose, onChanged }: Props) => {
  const onToast = notify;
  const [draft, setDraft] = useState<GroupDraft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  const close = () => { setDraft(null); setConfirmDelete(false); onClose(); };
  const edit = (g?: OptionGroup) => { setConfirmDelete(false); setDraft(toDraft(g, groups.length + 1)); };

  const save = async () => {
    if (!draft) return;
    const body = parseDraft(draft);
    if (typeof body === 'string') return onToast(body, 'error');
    setSaving(true);
    try {
      const saved = draft.id ? await optionGroupsApi.update(draft.id, body) : await optionGroupsApi.create(body);
      onChanged(draft.id ? groups.map((g) => (g.id === saved.id ? saved : g)) : [...groups, saved]);
      setDraft(null);
      onToast('Gruppo salvato');
    } catch (e: any) {
      onToast(e?.response?.data?.detail || 'Impossibile salvare il gruppo', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft?.id) return;
    if (!confirmDelete) return setConfirmDelete(true);
    try {
      await optionGroupsApi.remove(draft.id);
      onChanged(groups.filter((g) => g.id !== draft.id));
      setDraft(null);
      onToast('Gruppo eliminato');
    } catch (e: any) {
      onToast(e?.response?.data?.detail || 'Impossibile eliminare il gruppo', 'error');
    } finally {
      setConfirmDelete(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={styles.sheet} testID="option-groups-modal">
          <View style={styles.header}>
            {draft ? (
              <TouchableOpacity onPress={() => setDraft(null)} style={styles.back} testID="option-groups-back-btn">
                <Ionicons name="chevron-back" size={20} color="#1a202c" />
                <Text style={styles.title}>{draft.id ? 'Modifica gruppo' : 'Nuovo gruppo'}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.title}>Gruppi di scelta</Text>
            )}
            <TouchableOpacity onPress={close} testID="option-groups-close-btn">
              <Ionicons name="close" size={24} color="#1a202c" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={Platform.OS === 'web'} keyboardShouldPersistTaps="handled">
            {draft ? (
              <OptionGroupEditor draft={draft} onChange={setDraft} />
            ) : (
              <>
                <Text style={styles.intro}>
                  Liste di ingredienti da scegliere nei piatti componibili (es. Base, Proteine). Un gruppo può servire a più piatti.
                </Text>
                {groups.length === 0 && <Text style={styles.empty}>Nessun gruppo ancora.</Text>}
                {groups.map((g) => (
                  <TouchableOpacity key={g.id} style={styles.groupCard} onPress={() => edit(g)} testID={`option-group-card-${g.id}`}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.groupName}>{g.name}</Text>
                      <Text style={styles.groupRule}>{ruleLabel(g)}</Text>
                      <Text style={styles.groupOptions} numberOfLines={2}>
                        {g.options.map((o) => `${o.name} ${euro(o.price)}`).join(' · ')}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            {draft ? (
              <>
                {draft.id && (
                  <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={remove} testID="option-group-delete-btn">
                    <Text style={styles.btnDangerText}>{confirmDelete ? 'Conferma eliminazione' : 'Elimina'}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={save} disabled={saving} testID="option-group-save-btn">
                  <Text style={styles.btnPrimaryText}>{saving ? 'Salvataggio…' : 'Salva gruppo'}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => edit()} testID="option-group-new-btn">
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.btnPrimaryText}>Nuovo gruppo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  sheet: { width: '100%', maxWidth: 640, maxHeight: '92%', backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { fontSize: 18, fontWeight: '800', color: '#1a202c' },
  body: { paddingHorizontal: 16, paddingVertical: 8 },
  intro: { fontSize: 13, color: '#64748b', marginVertical: 8 },
  empty: { fontSize: 14, color: '#94a3b8', marginVertical: 16, textAlign: 'center' },
  groupCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10 },
  groupName: { fontSize: 16, fontWeight: '800', color: '#1a202c' },
  groupRule: { fontSize: 12, color: '#00754A', fontWeight: '600', marginTop: 2 },
  groupOptions: { fontSize: 12, color: '#64748b', marginTop: 4 },
  footer: { flexDirection: 'row', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0', justifyContent: 'flex-end' },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 999 },
  btnPrimary: { backgroundColor: '#DB0007' },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  btnDanger: { borderWidth: 1, borderColor: '#DB0007' },
  btnDangerText: { color: '#DB0007', fontWeight: '700', fontSize: 14 },
});
