import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeOut, ZoomIn } from 'react-native-reanimated';

// Ingresso a cascata: ogni elemento arriva poco dopo il precedente (max 12 in cascata)
export const Appear = ({ index = 0, from = 'below', animate = true, style, children, testID }: {
  index?: number;
  animate?: boolean;  // false: niente animazione (liste lunghe)
  from?: 'below' | 'above' | 'zoom';
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  testID?: string;
}) => {
  if (!animate) return <View testID={testID} style={style}>{children}</View>;
  const delay = Math.min(index, 12) * 70;
  const base = from === 'zoom' ? ZoomIn : from === 'above' ? FadeInUp : FadeInDown;
  return (
    <Animated.View
      testID={testID}
      style={style}
      entering={base.delay(delay).springify().damping(17).stiffness(170)}
      exiting={FadeOut.duration(160)}
    >
      {children}
    </Animated.View>
  );
};
