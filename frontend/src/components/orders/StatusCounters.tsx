import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '../motion/PressableScale';
import { FlipText } from '../motion/FlipText';
import { Appear } from '../motion/Appear';
import { C, FONT, R, SPRING, StatusKey, STATUS, elevation } from '../../theme/tokens';
import { STATUS_ICONS } from './orderMeta';

const ITEMS: { key: StatusKey | null; label: string; short: string }[] = [
  { key: null, label: 'Tutti gli ordini', short: 'Tutti' },
  { key: 'in_attesa', label: 'In attesa', short: 'Attesa' },
  { key: 'in_preparazione', label: 'In preparazione', short: 'Preparaz.' },
  { key: 'pronto', label: 'Pronti', short: 'Pronti' },
  { key: 'sospeso', label: 'Sospesi', short: 'Sospesi' },
  { key: 'consegnato', label: 'Consegnati', short: 'Consegn.' },
];

// "Tutti" usa il viola, gli altri il colore del proprio stato
const ALL_TONE = { fg: C.secondary, bg: C.secondarySoft, bd: '#D9CEF7', solid: C.secondary };

// Barretta di avanzamento come nei riquadri "Overdue amount" di MaterialM
const ShareBar = ({ ratio, color, track }: { ratio: number; color: string; track: string }) => {
  const w = useSharedValue(0);
  useEffect(() => {
    w.set(withTiming(Math.max(0, Math.min(1, ratio)), { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [ratio, w]);
  const fill = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={[styles.track, { backgroundColor: track }]}>
      <Animated.View style={[styles.fill, { backgroundColor: color }, fill]} />
    </View>
  );
};

const Box = ({ item, count, total, active, onPress, compact, short, index }: {
  item: typeof ITEMS[number]; count: number; total: number; active: boolean; onPress: () => void; compact: boolean; short: boolean; index: number;
}) => {
  const pop = useSharedValue(1);
  useEffect(() => {
    if (active) pop.set(withSequence(withSpring(1.05, SPRING), withSpring(1, SPRING)));
  }, [active, pop]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const tone = item.key ? STATUS[item.key] : ALL_TONE;
  const icon = item.key ? STATUS_ICONS[item.key] : 'receipt-outline';
  const id = item.key || 'tutti';
  return (
    <Appear index={index} style={compact ? styles.wrapCompact : styles.wrap}>
      <Animated.View style={anim}>
        <PressableScale hoverLift style={[styles.box, active && { borderColor: tone.solid }, active ? elevation(2) : elevation(1)]}
          onPress={onPress} testID={`counter-filter-${id}`} accessibilityState={{ selected: active }}>
          <View style={styles.top}>
            <View style={styles.texts}>
              <FlipText value={count} style={styles.count} testID={`counter-value-${id}`} />
              <Text style={[styles.label, active && { color: tone.fg }]} numberOfLines={1}>{short ? item.short : item.label}</Text>
            </View>
            <View style={[styles.icon, { backgroundColor: tone.bg }]}>
              <Ionicons name={icon as any} size={22} color={tone.solid} />
            </View>
          </View>
          <ShareBar ratio={total ? count / total : 0} color={tone.solid} track={tone.bg} />
        </PressableScale>
      </Animated.View>
    </Appear>
  );
};

export const StatusCounters = ({ counts, active, onChange, compact, short }: {
  counts: Record<string, number>;
  active: string | null;
  onChange: (key: string | null) => void;
  compact: boolean;
  short: boolean;
}) => {
  const total = ITEMS.reduce((a, it) => a + (it.key ? counts[it.key] || 0 : 0), 0);
  const boxes = ITEMS.map((item, i) => (
    <Box key={item.key || 'tutti'} index={i} item={item} compact={compact} short={short} total={total}
      count={counts[item.key || 'tutti'] || 0} active={active === item.key}
      onPress={() => onChange(item.key && active === item.key ? null : item.key)} />
  ));
  return compact ? (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bar} contentContainerStyle={styles.rowCompact}>{boxes}</ScrollView>
  ) : (
    <View style={[styles.bar, styles.row]}>{boxes}</View>
  );
};

const styles = StyleSheet.create({
  bar: { backgroundColor: C.canvas, flexGrow: 0 },
  row: { flexDirection: 'row', gap: 14, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 6 },
  rowCompact: { gap: 10, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 6 },
  wrap: { flex: 1, minWidth: 0 },
  wrapCompact: { width: 168 },
  box: {
    backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 2, borderColor: 'transparent',
    paddingVertical: 16, paddingHorizontal: 16, gap: 14,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  texts: { flex: 1, minWidth: 0 },
  count: { fontFamily: FONT, fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  label: { fontFamily: FONT, fontSize: 13, fontWeight: '600', color: C.text2, marginTop: 2 },
  icon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  track: { height: 5, borderRadius: 3, width: '72%', overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3 },
});
