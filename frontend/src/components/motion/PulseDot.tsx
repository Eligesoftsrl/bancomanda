import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

// Pallino "live" con onda che si espande (sincronizzazione)
export const PulseDot = ({ color, size = 8, live = true }: { color: string; size?: number; live?: boolean }) => {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(live ? withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), -1, false) : 0);
  }, [live, t]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.55 * (1 - t.value), transform: [{ scale: 1 + t.value * 1.8 }] }));
  const box = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View style={box}>
      <Animated.View style={[StyleSheet.absoluteFill, box, { backgroundColor: color }, ring]} />
      <View style={[box, { backgroundColor: color }]} />
    </View>
  );
};
