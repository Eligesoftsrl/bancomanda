import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Appear } from '../motion/Appear';
import { PressableScale } from '../motion/PressableScale';
import { C, FONT, R } from '../../theme/tokens';

export const EmptyOrders = ({ icon, title, subtitle, actionLabel, onAction, testID }: {
  icon: string; title: string; subtitle?: string; actionLabel?: string; onAction?: () => void; testID?: string;
}) => (
  <Appear from="zoom" style={styles.wrap} testID={testID}>
    <View style={styles.halo}>
      <View style={styles.iconCircle}><Ionicons name={icon as any} size={34} color={C.primary} /></View>
    </View>
    <Text style={styles.title}>{title}</Text>
    {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    {!!actionLabel && (
      <PressableScale style={styles.action} onPress={onAction} testID={`${testID}-action`}>
        <Text style={styles.actionText}>{actionLabel}</Text>
        <Ionicons name="arrow-forward" size={16} color="#fff" />
      </PressableScale>
    )}
  </Appear>
);

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64, paddingHorizontal: 24 },
  halo: { width: 112, height: 112, borderRadius: 56, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FONT, fontSize: 18, fontWeight: '800', color: C.text, marginTop: 18, textAlign: 'center' },
  subtitle: { fontFamily: FONT, fontSize: 14, color: C.text2, marginTop: 6, textAlign: 'center' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, backgroundColor: C.primary, borderRadius: R.pill, paddingHorizontal: 20, paddingVertical: 12, minHeight: 44 },
  actionText: { fontFamily: FONT, color: '#fff', fontSize: 14, fontWeight: '800' },
});
