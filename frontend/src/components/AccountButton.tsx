import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { ChangePasswordModal } from './ChangePasswordModal';
import { C, FONT } from '../theme/tokens';
import { useWideLayout } from '../theme/layout';

// Esci con doppio tocco (niente modali annidati su tablet)
export const AccountButton = () => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [confirming, setConfirming] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { wide, contentWidth } = useWideLayout();
  const showTenant = !wide && contentWidth >= 768;
  const iconOnly = contentWidth < 768;

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(t);
  }, [confirming]);

  return (
    <View style={styles.row}>
      {showTenant && !!user?.tenant_name && (
        <Text style={styles.tenant} numberOfLines={1} testID="account-tenant-name">{user.tenant_name}</Text>
      )}
      <TouchableOpacity style={styles.keyButton} onPress={() => setShowPassword(true)} testID="change-password-button">
        <Ionicons name="key-outline" size={18} color="#5A6A85" />
        {!iconOnly && <Text style={styles.keyText}>Password</Text>}
      </TouchableOpacity>
      <ChangePasswordModal visible={showPassword} onClose={() => setShowPassword(false)} />
      <TouchableOpacity
        style={[styles.button, confirming && styles.buttonConfirm]}
        onPress={() => (confirming ? logout() : setConfirming(true))}
        testID="logout-button"
      >
        <Ionicons name="log-out-outline" size={18} color={confirming ? '#ffffff' : '#F2545B'} />
        {(!iconOnly || confirming) && (
          <Text style={[styles.text, confirming && styles.textConfirm]}>{confirming ? (iconOnly ? 'Esci?' : 'Tocca per uscire') : 'Esci'}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tenant: { fontFamily: FONT, fontSize: 13, fontWeight: '600', color: '#5A6A85', maxWidth: 180 },
  keyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E0E6EB',
    backgroundColor: '#ffffff',
  },
  keyText: { fontFamily: FONT, color: '#5A6A85', fontWeight: '600', fontSize: 14 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#F9C4C6',
    backgroundColor: C.errorSoft,
  },
  buttonConfirm: { backgroundColor: C.error, borderColor: C.error },
  text: { fontFamily: FONT, color: C.errorFg, fontWeight: '700', fontSize: 14 },
  textConfirm: { color: '#ffffff' },
});
