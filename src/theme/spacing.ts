export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
  pill: 9999,
} as const;

export type Spacing = typeof spacing;
export type SpacingKey = keyof Spacing;

export type Radius = typeof radius;
export type RadiusKey = keyof Radius;
