import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, LogBox, Platform, View } from 'react-native';
import { useAuthStore } from '../src/store/authStore';
import { LaunchSplash } from '../src/components/LaunchSplash';

// Silenzia warning noti dopo upgrade a SDK 57 (RN 0.86):
// - "Unexpected text node: ." è generato da react-navigation/expo-router internamente
// - I due warning shadow*/pointerEvents sono deprecation notice non azionabili
const IGNORED_WARNINGS = [
  'Unexpected text node',
  '"shadow*" style props are deprecated',
  'props.pointerEvents is deprecated',
];

LogBox.ignoreLogs(IGNORED_WARNINGS);

// Su web LogBox non funziona: filtriamo direttamente console.error/warn
if (Platform.OS === 'web' && typeof console !== 'undefined') {
  const originalError = console.error;
  const originalWarn = console.warn;
  const shouldSuppress = (args: any[]) => {
    const msg = args.map(a => (typeof a === 'string' ? a : '')).join(' ');
    return IGNORED_WARNINGS.some(pattern => msg.includes(pattern));
  };
  console.error = (...args: any[]) => { if (!shouldSuppress(args)) originalError(...args); };
  console.warn = (...args: any[]) => { if (!shouldSuppress(args)) originalWarn(...args); };
}

export default function RootLayout() {
  const status = useAuthStore((s) => s.status);
  const init = useAuthStore((s) => s.init);

  const [showSplash, setShowSplash] = useState(true);
  const hideSplash = useCallback(() => setShowSplash(false), []);

  useEffect(() => {
    init();
  }, [init]);

  const authed = status === 'authed';

  // La splash resta nella stessa posizione dell'albero: non si rimonta quando finisce il caricamento
  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      {status === 'loading' ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f7fa' }}>
          <ActivityIndicator size="large" color="#DB0007" />
        </View>
      ) : (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#f5f7fa' },
          }}
        >
          <Stack.Protected guard={authed}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="unpaid-orders" />
          </Stack.Protected>
          <Stack.Protected guard={!authed}>
            <Stack.Screen name="login" />
          </Stack.Protected>
        </Stack>
      )}
      {showSplash && <LaunchSplash onDone={hideSplash} />}
    </View>
  );
}
