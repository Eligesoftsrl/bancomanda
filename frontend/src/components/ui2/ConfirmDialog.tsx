import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ModalSheet } from '../motion/ModalSheet';
import { PressableScale } from '../motion/PressableScale';
import { C, FONT, R, elevation } from '../../theme/tokens';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  icon?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  testID?: string;
};

export const ConfirmDialog = ({ visible, title, message, confirmLabel, icon = 'archive-outline', busy, onConfirm, onCancel, testID = 'confirm-dialog' }: Props) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={styles.overlay}>
      <ModalSheet zoom style={styles.card} testID={testID}>
        <View style={styles.iconWrap}><Ionicons name={icon as any} size={26} color={C.warningFg} /></View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.row}>
          <PressableScale style={[styles.btn, styles.cancel]} onPress={onCancel} testID={`${testID}-cancel`}>
            <Text style={[styles.btnText, { color: C.text2 }]}>Annulla</Text>
          </PressableScale>
          <PressableScale style={[styles.btn, styles.confirm, busy && { opacity: 0.6 }]} onPress={busy ? undefined : onConfirm} testID={`${testID}-confirm`}>
            <Text style={[styles.btnText, { color: '#fff' }]}>{busy ? 'Attendi...' : confirmLabel}</Text>
          </PressableScale>
        </View>
      </ModalSheet>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(42,53,71,0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 420, backgroundColor: C.surface, borderRadius: R.xl, padding: 24, ...elevation(3) },
  iconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.warningSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontFamily: FONT, fontSize: 19, fontWeight: '800', color: C.text, marginBottom: 8 },
  message: { fontFamily: FONT, fontSize: 14, lineHeight: 21, color: C.text2, marginBottom: 22 },
  row: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, minHeight: 46, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center' },
  cancel: { backgroundColor: C.sunken },
  confirm: { backgroundColor: C.primary },
  btnText: { fontFamily: FONT, fontSize: 15, fontWeight: '700' },
});
