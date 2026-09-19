import React from 'react';
import {
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { theme } from '../../theme';
import { AnimatedPressable } from './AnimatedPressable';

export type GlassCardVariant =
  | 'default'
  | 'elevated'
  | 'mint'
  | 'violet'
  | 'gold'
  | 'rose';

export interface GlassCardProps {
  /** Visual theme variant (default: 'default') */
  variant?: GlassCardVariant;
  /** Custom styles applied to outer bezel shell */
  style?: StyleProp<ViewStyle>;
  /** Custom styles applied to inner core container */
  innerStyle?: StyleProp<ViewStyle>;
  /** Optional click handler; renders tactile AnimatedPressable when provided */
  onPress?: () => void;
  /** Disables press interaction if clickable */
  disabled?: boolean;
  /** Spring press scale (default: 0.98 for cards) */
  scale?: number;
  /** Card body content */
  children?: React.ReactNode;
}

/**
 * GlassCard implements the Apple/Linear "Double-Bezel" (Doppelrand) pattern:
 * - Outer shell: translucent glass surface, hairline border, 6px padding, 22px radius (theme.radius.xl).
 * - Inner core: solid elevated surface, 16px radius (concentric: 22 - 6), 16px padding (theme.spacing.lg),
 *   and subtle 1px top highlight for hardware-like specular depth.
 * - Interactive: when `onPress` is provided, wraps in `AnimatedPressable` for physics-based spring scaling.
 */
export const GlassCard: React.FC<GlassCardProps> = ({
  variant = 'default',
  style,
  innerStyle,
  children,
  onPress,
  disabled = false,
  scale = 0.98,
}) => {
  const variantOuterStyle = variantOuterStyles[variant];
  const variantInnerStyle = variantInnerStyles[variant];

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        disabled={disabled}
        scale={scale}
        style={[styles.outerShell, variantOuterStyle, style]}
      >
        <View style={[styles.innerCore, variantInnerStyle, innerStyle]}>
          {children}
        </View>
      </AnimatedPressable>
    );
  }

  return (
    <View style={[styles.outerShell, variantOuterStyle, style]}>
      <View style={[styles.innerCore, variantInnerStyle, innerStyle]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerShell: {
    backgroundColor: theme.colors.surface1,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: theme.radius.xl, // 22px outer radius
    padding: 6, // 6px (p-1.5) concentric bezel gap
  },
  innerCore: {
    backgroundColor: theme.colors.surface2,
    borderRadius: 16, // Concentric inner radius (22px - 6px = 16px)
    padding: theme.spacing.lg, // 16px padding
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
});

const variantOuterStyles = StyleSheet.create({
  default: {
    backgroundColor: theme.colors.surface1,
    borderColor: theme.colors.surfaceBorder,
  },
  elevated: {
    backgroundColor: '#0F2F38',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  mint: {
    backgroundColor: theme.colors.accentMintMuted,
    borderColor: 'rgba(16, 185, 129, 0.28)',
  },
  violet: {
    backgroundColor: theme.colors.accentVioletMuted,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  gold: {
    backgroundColor: theme.colors.accentGoldMuted,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  rose: {
    backgroundColor: theme.colors.accentRoseMuted,
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
});

const variantInnerStyles = StyleSheet.create({
  default: {
    backgroundColor: theme.colors.surface2,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  elevated: {
    backgroundColor: '#0A252E',
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  mint: {
    backgroundColor: '#082522',
    borderTopColor: 'rgba(52, 211, 153, 0.2)',
  },
  violet: {
    backgroundColor: '#17132F',
    borderTopColor: 'rgba(167, 139, 250, 0.2)',
  },
  gold: {
    backgroundColor: '#261B0A',
    borderTopColor: 'rgba(251, 191, 36, 0.2)',
  },
  rose: {
    backgroundColor: '#290E17',
    borderTopColor: 'rgba(251, 113, 133, 0.2)',
  },
});

export default GlassCard;
