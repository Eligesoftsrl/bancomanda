import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToastStore } from '../store/toastStore';

// Avviso animato: errori restano più a lungo, un tocco lo chiude
export const ToastCard = () => {
  const { id, message, type, hide } = useToastStore();
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;
    fade.setValue(0);
    const anim = Animated.sequence([
      Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(type === 'error' ? 3500 : 2000),
      Animated.timing(fade, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]);
    anim.start(({ finished }) => finished && hide(id));
    return () => anim.stop();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!message) return null;
  return (
    <View style={styles.lane} pointerEvents="box-none">
    <Animated.View
      style={[styles.toast, type === 'success' ? styles.success : styles.error, { opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] }]}
      testID="app-toast"
      accessibilityRole="alert"
    >
      <TouchableOpacity style={styles.inner} onPress={() => hide(id)} activeOpacity={0.9}>
        <Ionicons name={type === 'success' ? 'checkmark-circle' : 'alert-circle'} size={22} color="#fff" />
        <Text style={styles.text} testID={`app-toast-${type}`}>{message}</Text>
      </TouchableOpacity>
    </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  lane: { position: 'absolute', top: 56, left: 0, right: 0, alignItems: 'center' },
  toast: {
    width: '92%',
    maxWidth: 560,
    borderRadius: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  success: { backgroundColor: '#00754A' },
  error: { backgroundColor: '#DB0007' },
  text: { color: '#fff', fontSize: 15, fontWeight: '700', flex: 1 },
});
