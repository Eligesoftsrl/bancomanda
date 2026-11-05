import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { ChangePasswordModal } from './ChangePasswordModal';

// Esci con doppio tocco (niente modali annidati su tablet)
export const AccountButton = () => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [confirming, setConfirming] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(t);
  }, [confirming]);

  return (
    <View style={styles.row}>
      {!!user?.tenant_name && (
        <Text style={styles.tenant} numberOfLines={1} testID="account-tenant-name">{user.tenant_name}</Text>
      )}
      <TouchableOpacity style={styles.keyButton} onPress={() => setShowPassword(true)} testID="change-password-button">
        <Ionicons name="key-outline" size={18} color="#475569" />
        <Text style={styles.keyText}>Password</Text>
      </TouchableOpacity>
      <ChangePasswordModal visible={showPassword} onClose={() => setShowPassword(false)} />
      <TouchableOpacity
        style={[styles.button, confirming && styles.buttonConfirm]}
        onPress={() => (confirming ? logout() : setConfirming(true))}
        testID="logout-button"
      >
        <Ionicons name="log-out-outline" size={18} color={confirming ? '#ffffff' : '#DB0007'} />
        <Text style={[styles.text, confirming && styles.textConfirm]}>{confirming ? 'Tocca per uscire' : 'Esci'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tenant: { fontSize: 13, fontWeight: '600', color: '#64748b', maxWidth: 180 },
  keyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dde4ee',
    backgroundColor: '#ffffff',
  },
  keyText: { color: '#475569', fontWeight: '600', fontSize: 14 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f3c1c3',
    backgroundColor: '#fff5f5',
  },
  buttonConfirm: { backgroundColor: '#DB0007', borderColor: '#DB0007' },
  text: { color: '#DB0007', fontWeight: '700', fontSize: 14 },
  textConfirm: { color: '#ffffff' },
});
