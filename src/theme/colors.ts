export const colors = {
  // Obsidian OLED Dark Canvas & Surfaces
  background: '#060D0F', // canvas
  backgroundElevated: '#081419',
  surface1: 'rgba(15, 42, 50, 0.65)', // outer double-bezel card
  surface2: '#0C242C', // elevated inner core
  surfaceBorder: 'rgba(255, 255, 255, 0.08)',
  surfaceHighlight: 'rgba(255, 255, 255, 0.05)',

  // Typography & Content Hierarchies
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  textMuted: '#475569',

  // Accent Colors & Subtle Glow States
  accentMint: '#10B981',
  accentMintLight: '#34D399',
  accentMintMuted: 'rgba(16, 185, 129, 0.14)',

  accentViolet: '#8B5CF6',
  accentVioletLight: '#A78BFA',
  accentVioletMuted: 'rgba(139, 92, 246, 0.16)',

  accentGold: '#F59E0B',
  accentGoldLight: '#FBBF24',
  accentGoldMuted: 'rgba(245, 158, 11, 0.15)',

  accentRose: '#F43F5E',
  accentRoseLight: '#FB7185',
  accentRoseMuted: 'rgba(244, 63, 94, 0.15)',

  accentSky: '#38BDF8',
  accentSkyMuted: 'rgba(56, 189, 248, 0.15)',
} as const;

export type Colors = typeof colors;
export type ColorKey = keyof Colors;
