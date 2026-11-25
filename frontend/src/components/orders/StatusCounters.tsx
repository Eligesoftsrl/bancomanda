import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { PressableScale } from '../motion/PressableScale';
import { FlipText } from '../motion/FlipText';
import { C, FONT, R, SPRING, StatusKey, STATUS, elevation } from '../../theme/tokens';

const ITEMS: { key: StatusKey | null; label: string; short: string }[] = [
  { key: null, label: 'Tutti', short: 'Tutti' },
  { key: 'in_attesa', label: 'In attesa', short: 'Attesa' },
  { key: 'in_preparazione', label: 'In preparazione', short: 'Preparaz.' },
  { key: 'pronto', label: 'Pronti', short: 'Pronto' },
  { key: 'sospeso', label: 'Sospesi', short: 'Sospeso' },
  { key: 'consegnato', label: 'Consegnati', short: 'Consegn.' },
];

const Pill = ({ item, count, active, onPress, compact }: { item: typeof ITEMS[number]; count: number; active: boolean; onPress: () => void; compact: boolean }) => {
  const pop = useSharedValue(1);
  useEffect(() => {
    if (active) pop.set(withSequence(withSpring(1.06, SPRING), withSpring(1, SPRING)));
  }, [active, pop]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const st = item.key ? STATUS[item.key] : null;
  const activeStyle = active && (st ? { backgroundColor: st.bg, borderColor: st.solid } : { backgroundColor: C.navy, borderColor: C.navy });
  const numColor = active && !st ? '#fff' : st ? st.fg : C.text;
  return (
    <Animated.View style={[compact ? styles.pillWrapCompact : styles.pillWrap, anim]}>
      <PressableScale style={[styles.pill, activeStyle, active && elevation(2)]} onPress={onPress} testID={`counter-filter-${item.key || 'tutti'}`}
        accessibilityState={{ selected: active }}>
        <View style={styles.labelRow}>
          <View style={[styles.dot, { backgroundColor: st ? st.solid : active ? '#fff' : C.navy }]} />
          <Text style={[styles.label, active && !st && { color: '#CBD5E1' }]} numberOfLines={1}>{compact ? item.short : item.label}</Text>
        </View>
        <FlipText value={count} style={[styles.count, { color: numColor }]} testID={`counter-value-${item.key || 'tutti'}`} />
      </PressableScale>
    </Animated.View>
  );
};

export const StatusCounters = ({ counts, active, onChange, compact }: {
  counts: Record<string, number>;
  active: string | null;
  onChange: (key: string | null) => void;
  compact: boolean;
}) => {
  const pills = ITEMS.map((item) => (
    <Pill key={item.key || 'tutti'} item={item} compact={compact} count={counts[item.key || 'tutti'] || 0} active={active === item.key}
      onPress={() => onChange(item.key && active === item.key ? null : item.key)} />
  ));
  return compact ? (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bar} contentContainerStyle={styles.rowCompact}>{pills}</ScrollView>
  ) : (
    <View style={[styles.bar, styles.row]}>{pills}</View>
  );
};

const styles = StyleSheet.create({
  bar: { backgroundColor: C.canvas, flexGrow: 0 },
  row: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 4 },
  rowCompact: { gap: 8, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 2 },
  pillWrap: { flex: 1 },
  pillWrapCompact: { width: 122 },
  pill: {
    backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1.5, borderColor: C.border,
    paddingVertical: 12, paddingHorizontal: 14, minHeight: 72, justifyContent: 'space-between', ...elevation(1),
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontFamily: FONT, fontSize: 11, fontWeight: '700', color: C.text2, textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 1 },
  count: { fontFamily: FONT, fontSize: 26, fontWeight: '800', marginTop: 6, fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
});
