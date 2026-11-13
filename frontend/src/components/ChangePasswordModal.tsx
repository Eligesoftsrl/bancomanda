import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, formatApiError } from '../store/authStore';

const Field = ({ label, value, onChange, testID }: { label: string; value: string; onChange: (v: string) => void; testID: string }) => (
  <>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChange}
      secureTextEntry
      autoCapitalize="none"
      autoCorrect={false}
      testID={testID}
    />
  </>
);

export const ChangePasswordModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const changePassword = useAuthStore((s) => s.changePassword);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const close = () => {
    setCurrent(''); setNext(''); setConfirm(''); setError(''); setDone(false); setLoading(false);
    onClose();
  };

  const submit = async () => {
    if (!current || !next) return setError('Compila tutti i campi');
    if (next.length < 8) return setError('La nuova password deve avere almeno 8 caratteri');
    if (next !== confirm) return setError('Le due nuove password non coincidono');
    setError('');
    setLoading(true);
    try {
      await changePassword(current, next);
      setDone(true);
    } catch (e: any) {
      setError(formatApiError(e, 'Cambio password non riuscito. Riprova.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card} testID="change-password-modal">
          <View style={styles.header}>
            <Text style={styles.title}>Cambia password</Text>
            <TouchableOpacity onPress={close} testID="change-password-close">
              <Ionicons name="close" size={26} color="#64748b" />
            </TouchableOpacity>
          </View>
          {done ? (
            <View style={styles.success} testID="change-password-success">
              <Ionicons name="checkmark-circle" size={44} color="#00754A" />
              <Text style={styles.successText}>Password cambiata. Tutti gli altri tablet sono stati scollegati: per rientrare useranno la nuova password.</Text>
              <TouchableOpacity style={styles.button} onPress={close} testID="change-password-done">
                <Text style={styles.buttonText}>Chiudi</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.hint}>Dopo il cambio, tutti gli altri tablet collegati verranno scollegati.</Text>
              <Field label="Password attuale" value={current} onChange={setCurrent} testID="change-password-current" />
              <Field label="Nuova password (min. 8 caratteri)" value={next} onChange={setNext} testID="change-password-new" />
              <Field label="Ripeti la nuova password" value={confirm} onChange={setConfirm} testID="change-password-confirm" />
              {!!error && <Text style={styles.error} testID="change-password-error">{error}</Text>}
              <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={submit} disabled={loading} testID="change-password-submit">
                {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Salva nuova password</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 460, maxHeight: '90%', ...Platform.select({ web: { overflowY: 'auto' as any } }) },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#1a202c' },
  hint: { fontSize: 14, color: '#64748b', marginTop: 6, marginBottom: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: '#f5f7fa', borderWidth: 1, borderColor: '#dde4ee', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#1a202c' },
  error: { color: '#b00006', fontSize: 14, marginTop: 12 },
  button: { backgroundColor: '#DB0007', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20, alignSelf: 'stretch' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  success: { alignItems: 'center', paddingTop: 16, gap: 12 },
  successText: { fontSize: 15, color: '#334155', textAlign: 'center', lineHeight: 22 },
});
