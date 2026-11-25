import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { C, SPRING } from '../theme/tokens';

// Icona della barra in basso: pillola colorata che "si gonfia" sotto la scheda attiva
export const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => {
  const t = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    t.set(withSpring(focused ? 1 : 0, SPRING));
  }, [focused, t]);
  const pill = useAnimatedStyle(() => ({ opacity: t.value, transform: [{ scaleX: 0.5 + t.value * 0.5 }] }));
  const icon = useAnimatedStyle(() => ({ transform: [{ translateY: -t.value * 1.5 }, { scale: 1 + t.value * 0.08 }] }));
  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.pill, pill]} />
      <Animated.View style={icon}>
        <Ionicons name={(focused ? name : `${name}-outline`) as any} size={22} color={focused ? C.primary : C.text2} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { width: 60, height: 32, alignItems: 'center', justifyContent: 'center' },
  pill: { position: 'absolute', width: 60, height: 32, borderRadius: 16, backgroundColor: C.primarySoft },
});
