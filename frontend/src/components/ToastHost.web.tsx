import React from 'react';
import { createPortal } from 'react-dom';
import { StyleSheet, View } from 'react-native';
import { ToastCard } from './ToastCard';

// Web: portale nel body con z-index massimo, sopra ai Modal (che usano z-index 9999)
export const ToastHost = () => {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 2147483000, pointerEvents: 'none' }}>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <ToastCard />
      </View>
    </div>,
    document.body
  );
};
