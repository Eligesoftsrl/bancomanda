import React, { useEffect } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { C, R } from '../../theme/tokens';

// Blocco grigio che "respira" mentre i dati arrivano
export const Shimmer = ({ style }: { style?: StyleProp<ViewStyle> }) => {
  const t = useSharedValue(0.45);
  useEffect(() => {
    t.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [t]);
  const anim = useAnimatedStyle(() => ({ opacity: t.value }));
  return <Animated.View style={[styles.block, style, anim]} />;
};

export const SkeletonCard = () => (
  <View style={styles.card}>
    <View style={styles.row}>
      <Shimmer style={{ width: '45%', height: 18 }} />
      <Shimmer style={{ width: 84, height: 24, borderRadius: R.pill }} />
    </View>
    <Shimmer style={{ width: '60%', height: 12, marginTop: 14 }} />
    <Shimmer style={{ width: '80%', height: 12, marginTop: 8 }} />
    <Shimmer style={{ width: '50%', height: 12, marginTop: 8 }} />
    <View style={[styles.row, { marginTop: 18 }]}>
      <Shimmer style={{ width: 90, height: 22 }} />
      <Shimmer style={{ width: 110, height: 28, borderRadius: R.pill }} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  block: { backgroundColor: '#E5EAF1', borderRadius: 8 },
  card: { backgroundColor: C.surface, borderRadius: R.lg, padding: 18, borderWidth: 1, borderColor: C.border, marginBottom: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
