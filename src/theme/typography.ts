import type { TextStyle } from 'react-native';

export const fontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  hero: 32,
  display: 38,
} as const;

export const fontWeights = {
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
  heavy: '800',
} as const satisfies Record<string, TextStyle['fontWeight']>;

export const letterSpacing = {
  tight: -0.5,
  normal: 0,
  wide: 0.3,
  wider: 0.8,
  widest: 1.5,
} as const;

export const typography = {
  fontSizes,
  fontWeights,
  letterSpacing,
} as const;

export type FontSizes = typeof fontSizes;
export type FontSizeKey = keyof FontSizes;

export type FontWeights = typeof fontWeights;
export type FontWeightKey = keyof FontWeights;

export type LetterSpacing = typeof letterSpacing;
export type LetterSpacingKey = keyof LetterSpacing;

export type Typography = typeof typography;
