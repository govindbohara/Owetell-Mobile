import '@/global.css';

import { Platform } from 'react-native';

/**
 * Ported 1:1 from the owetell.ninja CSS custom properties. The web app ships a
 * single cream surface with no dark variant, so the native app matches it
 * rather than following the system colour scheme.
 */
export const Palette = {
  page: '#faf6ec',
  surface: '#ffffff',
  surfaceRaised: '#fffaf0',
  surfaceWarm: '#fff8e8',
  surfaceContainer: '#fdf6e6',
  surfaceContainerHigh: '#f6eeda',
  surfaceContainerLow: '#fffaf0',

  ink: '#16261c',
  muted: '#6c6252',
  mutedGreen: '#5a6b56',
  label: '#a89c83',
  textSoft: '#8a8069',
  faint: '#b0a690',

  line: '#ece2d0',
  hairline: '#f0e7d6',
  subtle: '#f0e8d0',

  accent: '#9640e0',
  accentHover: '#8231cc',
  accentLight: '#f3e5fc',
  onPrimaryContainer: '#4a0b78',

  pos: '#2f7d5b',
  posBg: '#e3f0e8',
  neg: '#bb4a3b',
  negBg: '#f7e3de',
  oweBright: '#e2917f',
  owedBright: '#7fd0a4',
  warn: '#e8765a',
} as const;

/** Category tints used by expense rows and the analytics breakdown. */
export const Categories = {
  food: { tint: '#ffe3c7', accent: '#e8672e', emoji: '🍽️', label: 'Food' },
  groceries: { tint: '#d8f5ef', accent: '#0fa98e', emoji: '🛒', label: 'Groceries' },
  housing: { tint: '#fff1bf', accent: '#d89b0a', emoji: '🏠', label: 'Housing' },
  utilities: { tint: '#fff1bf', accent: '#d89b0a', emoji: '💡', label: 'Utilities' },
  transport: { tint: '#d8f5ef', accent: '#0fa98e', emoji: '🚌', label: 'Transport' },
  travel: { tint: '#e8dffc', accent: '#7c4deb', emoji: '✈️', label: 'Travel' },
  entertainment: { tint: '#f2e1fc', accent: '#9640e0', emoji: '🎬', label: 'Fun' },
  health: { tint: '#f7e3de', accent: '#bb4a3b', emoji: '💊', label: 'Health' },
  shopping: { tint: '#f2e1fc', accent: '#9640e0', emoji: '🛍️', label: 'Shopping' },
  other: { tint: '#ece8de', accent: '#8a8069', emoji: '🧾', label: 'Other' },
} as const;

export type CategoryKey = keyof typeof Categories;

export function category(key: string) {
  return Categories[key as CategoryKey] ?? Categories.other;
}

/**
 * Kept so the existing themed-text / themed-view primitives keep working. Both
 * schemes resolve to the same cream palette — the app is intentionally
 * single-theme, mirroring the web.
 */
const scheme = {
  text: Palette.ink,
  background: Palette.page,
  backgroundElement: Palette.surfaceRaised,
  backgroundSelected: Palette.surfaceContainerHigh,
  textSecondary: Palette.muted,
} as const;

export const Colors = { light: scheme, dark: scheme } as const;

export type ThemeColor = keyof typeof scheme;

export const FontFamily = {
  regular: 'HankenGrotesk_400Regular',
  medium: 'HankenGrotesk_500Medium',
  semibold: 'HankenGrotesk_600SemiBold',
  bold: 'HankenGrotesk_700Bold',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
} as const;

export const Fonts = Platform.select({
  web: {
    sans: 'var(--font-ui)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-ui)',
    mono: 'var(--font-mono)',
  },
  default: {
    sans: FontFamily.regular,
    serif: 'serif',
    rounded: FontFamily.regular,
    mono: FontFamily.mono,
  },
});

/** Mirrors --s1…--s5, --gap and --pad. */
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 18,
  five: 24,
  six: 40,
  gap: 18,
  pad: 20,
} as const;

export const Radius = {
  card: 18,
  control: 12,
  pill: 999,
} as const;

export const Shadow = {
  sm: {
    shadowColor: '#14261c',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  card: {
    shadowColor: '#14261c',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  lg: {
    shadowColor: '#14261c',
    shadowOpacity: 0.12,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
} as const;

/** Dark "your position" / "total balance" hero card. */
export const HeroCard = {
  from: '#22332a',
  to: '#16261c',
  label: 'rgba(250, 246, 236, 0.55)',
  body: 'rgba(250, 246, 236, 0.78)',
  divider: 'rgba(250, 246, 236, 0.16)',
  inset: 'rgba(250, 246, 236, 0.07)',
} as const;

/** Legacy alias — auth screens still import this. */
export const Brand = {
  cream: Palette.page,
  ink: Palette.ink,
  inkMuted: Palette.muted,
  purple: Palette.accent,
  purpleGlow: 'rgba(150, 64, 224, 0.28)',
  cardFrom: HeroCard.from,
  cardTo: HeroCard.to,
  inputBg: Palette.surfaceRaised,
  inputBorder: Palette.line,
  pillTrack: 'rgba(240, 232, 208, 0.55)',
} as const;

export const TabBarHeight = 76;
export const MaxContentWidth = 800;
export const BottomTabInset = TabBarHeight + Spacing.five;
