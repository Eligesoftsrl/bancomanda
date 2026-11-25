import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import { ToastCard } from './ToastCard';

// iOS: finestra separata sopra anche ai Modal aperti; i tocchi fuori dall'avviso passano sotto
export const ToastHost = () => {
  const content = (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <ToastCard />
    </View>
  );
  return Platform.OS === 'ios' ? <FullWindowOverlay>{content}</FullWindowOverlay> : content;
};
