export type ColorEffectId =
  | 'default'
  | 'gold'
  | 'red'
  | 'cyan'
  | 'green'
  | 'pink'
  | 'rainbow'
  | 'neon'
  | 'fire'
  | 'ice';

export const SOLID_COLORS: Record<string, string> = {
  default: '#FFFFFF',
  red: '#EF4444',
  cyan: '#22D3EE',
  green: '#22C55E',
  pink: '#EC4899',
};

export const RAINBOW_STOPS = [
  '#EF4444', '#F59E0B', '#FBBF24', '#22C55E', '#3B82F6', '#A855F7', '#EC4899',
];

export const FIRE_STOPS = ['#DC2626', '#F97316', '#FBBF24'];
export const ICE_STOPS = ['#22D3EE', '#A5F3FC', '#FFFFFF'];

export const GOLD_DARK = '#92650B';
export const GOLD_MID = '#F59E0B';
export const GOLD_BRIGHT = '#FDE68A';

export const NEON_CORE = '#F472B6';
export const NEON_GLOW = '#EC4899';

// Returns true if string contains any Arabic codepoints.
export function hasArabic(s: string): boolean {
  return /[\u0600-\u06FF]/.test(s);
}

// Interpolate between two hex colors at t in [0, 1].
export function lerpHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.replace('#', ''), 16);
  const pb = parseInt(b.replace('#', ''), 16);
  const ar = (pa >> 16) & 0xff, ag = (pa >> 8) & 0xff, ab = pa & 0xff;
  const br = (pb >> 16) & 0xff, bg = (pb >> 8) & 0xff, bb = pb & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b2 = Math.round(ab + (bb - ab) * t);
  return `#${((r << 16) | (g << 8) | b2).toString(16).padStart(6, '0')}`;
}
