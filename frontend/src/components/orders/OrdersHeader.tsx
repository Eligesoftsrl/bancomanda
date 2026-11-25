import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { PressableScale } from '../motion/PressableScale';
import { PulseDot } from '../motion/PulseDot';
import { Appear } from '../motion/Appear';
import { C, FONT, R, elevation } from '../../theme/tokens';

type Props = {
  freshness: 'fresh' | 'stale' | 'error';
  freshnessLabel: string;
  onSync: () => void;
  selectedDate: string;
  onChangeDate: (days: number) => void;
  compact: boolean;
};

export const OrdersHeader = ({ freshness, freshnessLabel, onSync, selectedDate, onChangeDate, compact }: Props) => {
  const [dir, setDir] = useState(1);
  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');
  const dot = freshness === 'fresh' ? C.green : freshness === 'stale' ? C.yellow : C.brand;
  const go = (d: number) => { setDir(d); onChangeDate(d); };

  const sync = (
    <PressableScale style={styles.syncPill} onPress={onSync} testID="sync-indicator">
      <PulseDot color={dot} live={freshness === 'fresh'} />
      <Text style={[styles.syncLabel, freshness === 'error' && { color: C.brand }]}>{freshnessLabel}</Text>
    </PressableScale>
  );

  return (
    <View style={[styles.header, compact && styles.headerCompact]}>
      <Appear from="above" style={styles.brandRow}>
        <Image source={require('../../../assets/images/icon.png')} style={styles.logo} resizeMode="contain" testID="header-logo" />
        <View>
          <Text style={styles.title}>Bancomanda</Text>
          <Text style={styles.subtitle}>Ordini del giorno</Text>
        </View>
        {compact && <View style={styles.syncCompact}>{sync}</View>}
      </Appear>

      <Appear from="above" index={1} style={[styles.datePill, compact && styles.datePillCompact]} testID="date-selector">
        <PressableScale style={styles.dateBtn} onPress={() => go(-1)} testID="date-prev-button" accessibilityLabel="Giorno precedente">
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </PressableScale>
        <View style={styles.dateCenter}>
          <Animated.View key={selectedDate} entering={(dir > 0 ? FadeInRight : FadeInLeft).springify().damping(18).stiffness(200)} style={styles.dateInner}>
            {isToday && <View style={styles.todayChip}><Text style={styles.todayText}>OGGI</Text></View>}
            <Text style={styles.dateText} numberOfLines={1} testID="date-current-display">
              {format(new Date(selectedDate), compact ? 'EEE d MMM yyyy' : 'EEEE d MMMM yyyy', { locale: it })}
            </Text>
          </Animated.View>
        </View>
        <PressableScale style={styles.dateBtn} onPress={() => go(1)} testID="date-next-button" accessibilityLabel="Giorno successivo">
          <Ionicons name="chevron-forward" size={20} color={C.text} />
        </PressableScale>
      </Appear>

      {!compact && <Appear from="above" index={2}>{sync}</Appear>}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16,
    paddingHorizontal: 24, paddingVertical: 14, backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerCompact: { flexDirection: 'column', alignItems: 'stretch', paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 220 },
  logo: { width: 40, height: 40, borderRadius: 11 },
  title: { fontFamily: FONT, fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
  subtitle: { fontFamily: FONT, fontSize: 12, fontWeight: '600', color: C.muted, marginTop: 1 },
  syncCompact: { marginLeft: 'auto' },
  syncPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: R.pill, backgroundColor: C.sunken, borderWidth: 1, borderColor: C.border, minHeight: 36,
  },
  syncLabel: { fontFamily: FONT, fontSize: 12, fontWeight: '700', color: C.text2 },
  datePill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: R.pill,
    borderWidth: 1, borderColor: C.border, padding: 4, minWidth: 380, ...elevation(1),
  },
  datePillCompact: { minWidth: 0 },
  dateBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: C.sunken },
  dateCenter: { flex: 1, overflow: 'hidden', alignItems: 'center', paddingHorizontal: 10 },
  dateInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  todayChip: { backgroundColor: C.brand, borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 3 },
  todayText: { fontFamily: FONT, color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  dateText: { fontFamily: FONT, fontSize: 16, fontWeight: '700', color: C.text, textTransform: 'capitalize' },
});
