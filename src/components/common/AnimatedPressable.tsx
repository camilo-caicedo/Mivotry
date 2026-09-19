import React, { useRef } from 'react';
import {
  Animated,
  GestureResponderEvent,
  StyleProp,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native';
import { theme } from '../../theme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export interface AnimatedPressableProps extends TouchableOpacityProps {
  /** Target scale factor on press down (default: 0.97) */
  scale?: number;
  /** Whether to trigger tactile haptic feedback on press down (default: true) */
  hapticFeedback?: boolean;
  /** Additional or overriding container styles */
  style?: StyleProp<ViewStyle>;
  /** Content to render inside pressable */
  children?: React.ReactNode;
}

/**
 * AnimatedPressable provides fluid, Apple-style spring scaling on press interactions.
 * - On press in: scales down to `scale` (default 0.97) via `theme.motion.spring.snappy`.
 * - On press out: bounces smoothly back to 1.0 via `theme.motion.spring.default`.
 * - Tactile feedback: attempts graceful haptic trigger via expo-haptics when available.
 */
export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  scale = 0.97,
  hapticFeedback = true,
  style,
  children,
  onPressIn,
  onPressOut,
  activeOpacity = 0.88,
  disabled,
  ...restProps
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const triggerHaptic = () => {
    try {
      // Optional Expo Haptics integration with safe runtime fallback
      const Haptics = require('expo-haptics');
      if (Haptics?.selectionAsync) {
        Haptics.selectionAsync();
      } else if (Haptics?.impactAsync) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle?.Light);
      }
    } catch {
      // Graceful fallback when module is not loaded
    }
  };

  const handlePressIn = (event: GestureResponderEvent) => {
    if (disabled) return;

    if (hapticFeedback) {
      triggerHaptic();
    }

    Animated.spring(scaleAnim, {
      toValue: scale,
      damping: theme.motion.spring.snappy.damping,
      stiffness: theme.motion.spring.snappy.stiffness,
      mass: theme.motion.spring.snappy.mass,
      useNativeDriver: true,
    }).start();

    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    if (disabled) return;

    Animated.spring(scaleAnim, {
      toValue: 1.0,
      damping: theme.motion.spring.default.damping,
      stiffness: theme.motion.spring.default.stiffness,
      mass: theme.motion.spring.default.mass,
      useNativeDriver: true,
    }).start();

    onPressOut?.(event);
  };

  return (
    <AnimatedTouchable
      {...restProps}
      disabled={disabled}
      activeOpacity={activeOpacity}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, { transform: [{ scale: scaleAnim }] }]}
    >
      {children}
    </AnimatedTouchable>
  );
};

export default AnimatedPressable;
