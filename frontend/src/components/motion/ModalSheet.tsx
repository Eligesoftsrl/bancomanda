import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

// Finestra che entra con un rimbalzo elastico (dentro un Modal con animationType="fade")
export const ModalSheet = ({ style, children, testID, zoom }: { style?: StyleProp<ViewStyle>; children: React.ReactNode; testID?: string; zoom?: boolean }) => (
  <Animated.View
    testID={testID}
    style={style}
    entering={(zoom ? ZoomIn : FadeInDown).springify().damping(19).stiffness(210).mass(0.9)}
  >
    {children}
  </Animated.View>
);
