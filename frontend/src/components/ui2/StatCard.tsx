import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Appear } from '../motion/Appear';
import { FlipText } from '../motion/FlipText';
import { C, FONT, R } from '../../theme/tokens';

type Tone = 'primary' | 'success' | 'error' | 'secondary' | 'warning';

const TONES: Record<Tone, { bg: string; icon: string; fg: string }> = {
  primary: { bg: C.primarySoft, icon: C.primary, fg: C.primaryDark },
  success: { bg: C.successSoft, icon: '#13C9A1', fg: C.success },
  error: { bg: C.errorSoft, icon: C.error, fg: C.errorFg },
  secondary: { bg: C.secondarySoft, icon: C.secondary, fg: C.secondary },
  warning: { bg: C.warningSoft, icon: C.warning, fg: C.warningFg },
};

type Props = { icon: string; value: string | number; label: string; tone: Tone; index?: number; testID?: string };

export const StatCard = ({ icon, value, label, tone, index = 0, testID }: Props) => {
  const t = TONES[tone];
  return (
    <Appear index={index} style={[styles.card, { backgroundColor: t.bg }]} testID={testID}>
      <View style={[styles.iconWrap, { backgroundColor: t.icon }]}>
        <Ionicons name={icon as any} size={24} color="#fff" />
      </View>
      <View style={styles.texts}>
        <FlipText value={String(value)} style={[styles.value, { color: t.fg }]} testID={testID ? `${testID}-value` : undefined} />
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
      </View>
    </Appear>
  );
};

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 200, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: R.lg },
  iconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, minWidth: 0 },
  value: { fontFamily: FONT, fontSize: 26, fontWeight: '800', letterSpacing: -0.6 },
  label: { fontFamily: FONT, fontSize: 13, fontWeight: '600', color: C.text2, marginTop: 2 },
});
