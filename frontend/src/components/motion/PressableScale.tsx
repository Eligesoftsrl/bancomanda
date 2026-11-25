import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SPRING } from '../../theme/tokens';

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  scaleTo?: number;
  hoverLift?: boolean;
  children?: React.ReactNode;
};

// Pulsante con rimbalzo alla pressione e leggero sollevamento al passaggio del mouse
export const PressableScale = ({ style, containerStyle, scaleTo = 0.95, hoverLift, children, onPressIn, onPressOut, onHoverIn, onHoverOut, ...rest }: Props) => {
  const scale = useSharedValue(1);
  const lift = useSharedValue(0);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }, { scale: scale.value }] }));
  return (
    <Animated.View style={[containerStyle, anim]}>
      <Pressable
        {...rest}
        style={style}
        onPressIn={(e) => { scale.set(withSpring(scaleTo, SPRING)); onPressIn?.(e); }}
        onPressOut={(e) => { scale.set(withSpring(1, SPRING)); onPressOut?.(e); }}
        onHoverIn={(e) => { if (hoverLift) lift.set(withSpring(-3, SPRING)); onHoverIn?.(e); }}
        onHoverOut={(e) => { lift.set(withSpring(0, SPRING)); onHoverOut?.(e); }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};
