export interface SpringConfig {
  damping: number;
  stiffness: number;
  mass: number;
}

export const spring = {
  default: { damping: 1.0, stiffness: 220, mass: 0.8 },
  snappy: { damping: 0.9, stiffness: 280, mass: 0.7 },
  bouncier: { damping: 0.75, stiffness: 200, mass: 0.8 },
} as const satisfies Record<string, SpringConfig>;

export const timing = {
  instant: 100,
  fast: 200,
  normal: 300,
  smooth: 450,
} as const;

export const motion = {
  spring,
  timing,
} as const;

export type Spring = typeof spring;
export type SpringKey = keyof Spring;

export type Timing = typeof timing;
export type TimingKey = keyof Timing;

export type Motion = typeof motion;
