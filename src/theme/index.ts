import { colors } from './colors';
import { fontSizes, fontWeights, letterSpacing, typography } from './typography';
import { spacing, radius } from './spacing';
import { spring, timing, motion } from './motion';

export * from './colors';
export * from './typography';
export * from './spacing';
export * from './motion';

export const theme = {
  colors,
  fontSizes,
  fontWeights,
  letterSpacing,
  typography,
  spacing,
  radius,
  spring,
  timing,
  motion,
} as const;

export type Theme = typeof theme;

export default theme;
