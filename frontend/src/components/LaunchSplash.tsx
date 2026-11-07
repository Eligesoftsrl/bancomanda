import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet, Text } from 'react-native';

const useNative = Platform.OS !== 'web';

export const LaunchSplash = ({ onDone }: { onDone: () => void }) => {
  const logo = useRef(new Animated.Value(0)).current;
  const title = useRef(new Animated.Value(0)).current;
  const screen = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    const anim = Animated.sequence([
      Animated.parallel([
        Animated.timing(logo, { toValue: 1, duration: 700, easing: ease, useNativeDriver: useNative }),
        Animated.timing(title, { toValue: 1, duration: 700, delay: 250, easing: ease, useNativeDriver: useNative }),
      ]),
      Animated.delay(450),
      Animated.timing(screen, { toValue: 0, duration: 400, easing: Easing.in(Easing.quad), useNativeDriver: useNative }),
    ]);
    anim.start(() => onDone());
    return () => anim.stop();
  }, [logo, title, screen, onDone]);

  const logoScale = logo.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] });
  const titleShift = title.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  return (
    <Animated.View style={[styles.overlay, { opacity: screen }]} pointerEvents="none" testID="launch-splash">
      <Animated.View style={{ opacity: logo, transform: [{ scale: logoScale }] }}>
        <Image source={require('../../assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
      </Animated.View>
      <Animated.View style={{ opacity: title, transform: [{ translateY: titleShift }] }}>
        <Text style={styles.title}>Bancomanda</Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#141d2c',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  logo: { width: 128, height: 128, borderRadius: 30 },
  title: { color: '#ffffff', fontSize: 34, fontWeight: '800', letterSpacing: -0.5, marginTop: 22 },
});
