import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '../motion/PressableScale';
import { C, FONT, R, elevation } from '../../theme/tokens';

type Tone = 'primary' | 'soft' | 'secondary' | 'success' | 'neutral';

const TONES: Record<Tone, { bg: string; fg: string; border?: string }> = {
  primary: { bg: C.primary, fg: '#fff' },
  soft: { bg: C.primarySoft, fg: C.primaryDark },
  secondary: { bg: C.secondarySoft, fg: C.secondary },
  success: { bg: C.successSoft, fg: C.success },
  neutral: { bg: C.surface, fg: C.text2, border: C.border },
};

type Props = { icon: string; label: string; onPress: () => void; tone?: Tone; testID?: string; active?: boolean };

export const HeaderButton = ({ icon, label, onPress, tone = 'neutral', testID, active }: Props) => {
  const t = TONES[active ? 'primary' : tone];
  return (
    <PressableScale
      onPress={onPress}
      testID={testID}
      style={[styles.btn, { backgroundColor: t.bg, borderColor: t.border || t.bg }, (active || tone === 'primary') && elevation(2)]}
    >
      <Ionicons name={icon as any} size={17} color={t.fg} />
      <Text style={[styles.label, { color: t.fg }]}>{label}</Text>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, minHeight: 44, borderRadius: R.pill, borderWidth: 1 },
  label: { fontFamily: FONT, fontSize: 14, fontWeight: '700' },
});
