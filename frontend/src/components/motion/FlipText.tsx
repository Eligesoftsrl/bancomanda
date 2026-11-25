import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

// Numero/testo che "scatta" quando cambia valore
export const FlipText = ({ value, style, testID, zoom }: { value: string | number; style?: StyleProp<TextStyle>; testID?: string; zoom?: boolean }) => (
  <Animated.Text
    key={String(value)}
    testID={testID}
    style={style}
    entering={(zoom ? ZoomIn : FadeInDown).springify().damping(14).stiffness(260)}
  >
    {value}
  </Animated.Text>
);
