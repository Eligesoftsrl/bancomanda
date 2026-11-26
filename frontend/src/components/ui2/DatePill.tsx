import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { PressableScale } from '../motion/PressableScale';
import { C, FONT, R, elevation } from '../../theme/tokens';

type Props = {
  selectedDate: string;
  onChange: (days: number) => void;
  compact?: boolean;
  idPrefix?: string;
};

export const DatePill = ({ selectedDate, onChange, compact, idPrefix = '' }: Props) => {
  const [dir, setDir] = useState(1);
  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');
  const go = (d: number) => { setDir(d); onChange(d); };

  return (
    <View style={[styles.pill, compact && styles.pillCompact]} testID={`${idPrefix}date-selector`}>
      <PressableScale style={styles.btn} onPress={() => go(-1)} testID={`${idPrefix}date-prev-button`} accessibilityLabel="Giorno precedente">
        <Ionicons name="chevron-back" size={20} color={C.text} />
      </PressableScale>
      <View style={styles.center}>
        <Animated.View key={selectedDate} entering={(dir > 0 ? FadeInRight : FadeInLeft).springify().damping(18).stiffness(200)} style={styles.inner}>
          {isToday && <View style={styles.today}><Text style={styles.todayText}>OGGI</Text></View>}
          <Text style={styles.text} numberOfLines={1} testID={`${idPrefix}date-current-display`}>
            {format(new Date(selectedDate), compact ? 'EEE d MMM yyyy' : 'EEEE d MMMM yyyy', { locale: it })}
          </Text>
        </Animated.View>
      </View>
      <PressableScale style={styles.btn} onPress={() => go(1)} testID={`${idPrefix}date-next-button`} accessibilityLabel="Giorno successivo">
        <Ionicons name="chevron-forward" size={20} color={C.text} />
      </PressableScale>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: R.pill,
    borderWidth: 1, borderColor: C.border, padding: 4, minWidth: 380, ...elevation(1),
  },
  pillCompact: { minWidth: 0, alignSelf: 'stretch', flexGrow: 1 },
  btn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: C.sunken },
  center: { flex: 1, overflow: 'hidden', alignItems: 'center', paddingHorizontal: 10 },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  today: { backgroundColor: C.primary, borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 3 },
  todayText: { fontFamily: FONT, color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  text: { fontFamily: FONT, fontSize: 16, fontWeight: '700', color: C.text, textTransform: 'capitalize' },
});
