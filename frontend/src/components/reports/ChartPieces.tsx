import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming, Easing } from 'react-native-reanimated';
import { C } from '../../theme/tokens';

// Barra che cresce dal basso con un rimbalzo, sfalsata rispetto alle altre
export const ChartBar = ({ x, width, height, index, total, active, dim, testID }: {
  x: number; width: number; height: number; index: number; total: number; active: boolean; dim: boolean; testID?: string;
}) => {
  const h = useSharedValue(0);
  useEffect(() => {
    const delay = Math.min(index * (600 / Math.max(total, 1)), 600);
    h.value = withDelay(delay, withSpring(height, { damping: 15, stiffness: 140 }));
  }, [height, index, total, h]);
  const style = useAnimatedStyle(() => ({ height: h.value }));
  return (
    <Animated.View
      testID={testID}
      style={[styles.bar, { left: x, width, borderTopLeftRadius: Math.min(8, width / 2), borderTopRightRadius: Math.min(8, width / 2) },
        { backgroundColor: active ? C.primaryDark : C.primary, opacity: dim ? 0.45 : 1 }, style]}
    />
  );
};

// Tenda che scopre la linea da sinistra a destra
export const RevealX = ({ width, height, children, trigger }: { width: number; height: number; children: React.ReactNode; trigger: string }) => {
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = 0;
    w.value = withTiming(width, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [width, trigger, w]);
  const style = useAnimatedStyle(() => ({ width: w.value }));
  return (
    <Animated.View pointerEvents="none" style={[styles.reveal, { height }, style]}>
      <View style={{ width, height }}>{children}</View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bar: { position: 'absolute', bottom: 0 },
  reveal: { position: 'absolute', left: 0, top: 0, overflow: 'hidden' },
});
