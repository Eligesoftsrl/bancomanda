import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { customersApi } from '../../services/api';
import { notify } from '../../store/toastStore';
import { Customer } from '../../types';
import { FONT } from '../../theme/tokens';

// Nuovo cliente al volo (nome + telefono) dalla modifica anagrafica dell'ordine
export const QuickCustomerForm = ({ initialName, onCreated, onCancel }: {
  initialName: string;
  onCreated: (c: Customer) => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return notify('Inserisci il nome del cliente', 'error');
    setSaving(true);
    try {
      const c = await customersApi.create({
        name: name.trim(), phone: phone.trim(), customerType: 'persona', partitaIva: '',
        email: '', address: '', requiresInvoice: false, notes: '',
      });
      notify(`Cliente ${c.name} creato e selezionato`);
      onCreated(c);
    } catch {
      notify('Impossibile creare il cliente', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.box} testID="quick-customer-form">
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nome cliente *"
        placeholderTextColor="#5A6A85" autoFocus testID="quick-customer-name" />
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Telefono"
        placeholderTextColor="#5A6A85" keyboardType="phone-pad" testID="quick-customer-phone" />
      <View style={styles.row}>
        <TouchableOpacity style={styles.cancel} onPress={onCancel} testID="quick-customer-cancel">
          <Text style={styles.cancelText}>Annulla</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.save} onPress={save} disabled={saving} testID="quick-customer-save">
          {saving ? <ActivityIndicator color="#fff" size="small" /> : (
            <><Ionicons name="checkmark" size={18} color="#fff" /><Text style={styles.saveText}>Crea e seleziona</Text></>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  box: { padding: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: '#E0E6EB', backgroundColor: '#F6F9FC' },
  input: { fontFamily: FONT, backgroundColor: '#ffffff', color: '#2A3547', padding: 10, borderRadius: 8, fontSize: 14, borderWidth: 1, borderColor: '#E0E6EB' },
  row: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  cancel: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, backgroundColor: '#E0E6EB' },
  cancelText: { fontFamily: FONT, color: '#2A3547', fontWeight: '600', fontSize: 14 },
  save: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, backgroundColor: '#0E9F80' },
  saveText: { fontFamily: FONT, color: '#fff', fontWeight: '700', fontSize: 14 },
});
