// Cosmetic shop items for Kalimat — visual only, no gameplay effect

export interface ThemeColors {
  background: string;
  boardBg: string;
  emptyCell: string;
  emptyBorder: string;
  activeBorder: string;
  keyboard: string;
  keyBg: string;
  keyBorder: string;
}

export interface Theme {
  id: string;
  name: string;
  price: number;
  colors: ThemeColors;
}

export interface TileStyle {
  id: string;
  name: string;
  price: number;
  borderRadius?: number; // override
  correctColor?: string;
  correctBorder?: string;
  glowEffect?: boolean;
  opacity?: number;
}

export interface KeyboardSkin {
  id: string;
  name: string;
  price: number;
  keyBg: string;
  keyBorder: string;
  keyTextColor: string;
  keyRadius: number;
}

export const THEMES: Theme[] = [
  {
    id: 'default', name: 'الافتراضي', price: 0,
    colors: {
      background: '#0D0730', boardBg: '#1A1A2E', emptyCell: '#1A1A2E',
      emptyBorder: '#2D2D50', activeBorder: '#7C3AED',
      keyboard: '#0A0520', keyBg: '#1E2A5E', keyBorder: '#2D3A6E',
    },
  },
  {
    id: 'desert', name: 'الصحراء 🏜️', price: 150,
    colors: {
      background: '#1C1208', boardBg: '#2A1F0E', emptyCell: '#2A1F0E',
      emptyBorder: '#4A3520', activeBorder: '#F59E0B',
      keyboard: '#150E05', keyBg: '#3A2810', keyBorder: '#5A4020',
    },
  },
  {
    id: 'ocean', name: 'المحيط 🌊', price: 150,
    colors: {
      background: '#061220', boardBg: '#0A1E35', emptyCell: '#0A1E35',
      emptyBorder: '#1A3A55', activeBorder: '#0EA5E9',
      keyboard: '#040D18', keyBg: '#0F2A45', keyBorder: '#1A4060',
    },
  },
  {
    id: 'forest', name: 'الغابة 🌲', price: 200,
    colors: {
      background: '#071A0A', boardBg: '#0F2A10', emptyCell: '#0F2A10',
      emptyBorder: '#1A4A1C', activeBorder: '#22C55E',
      keyboard: '#040F05', keyBg: '#142015', keyBorder: '#1E3520',
    },
  },
  {
    id: 'sunset', name: 'الغروب 🌅', price: 250,
    colors: {
      background: '#1A0808', boardBg: '#2A1010', emptyCell: '#2A1010',
      emptyBorder: '#4A2020', activeBorder: '#F97316',
      keyboard: '#0F0505', keyBg: '#3A1515', keyBorder: '#5A2525',
    },
  },
  {
    id: 'royal', name: 'الملكي 👑', price: 350,
    colors: {
      background: '#0A0520', boardBg: '#150A35', emptyCell: '#150A35',
      emptyBorder: '#2A1560', activeBorder: '#A855F7',
      keyboard: '#060312', keyBg: '#1A0A45', keyBorder: '#2A1560',
    },
  },
];

export const TILE_STYLES: TileStyle[] = [
  { id: 'classic', name: 'كلاسيكي', price: 0 },
  { id: 'rounded', name: 'مدوّر', price: 100, borderRadius: 999 },
  { id: 'neon', name: 'نيون ✨', price: 200, glowEffect: true },
  { id: 'glass', name: 'زجاجي', price: 250, opacity: 0.8 },
  { id: 'gold', name: 'ذهبي 🥇', price: 400, correctColor: '#F59E0B', correctBorder: '#D97706' },
];

export const KEYBOARD_SKINS: KeyboardSkin[] = [
  { id: 'default', name: 'افتراضي', price: 0, keyBg: '#1E2A5E', keyBorder: '#2D3A6E', keyTextColor: '#FFFFFF', keyRadius: 10 },
  { id: 'dark', name: 'داكن 🖤', price: 80, keyBg: '#111111', keyBorder: '#333333', keyTextColor: '#FFFFFF', keyRadius: 8 },
  { id: 'purple', name: 'بنفسجي 💜', price: 120, keyBg: '#3B0764', keyBorder: '#6B21A8', keyTextColor: '#E9D5FF', keyRadius: 10 },
  { id: 'golden', name: 'ذهبي ✨', price: 200, keyBg: '#451A03', keyBorder: '#92400E', keyTextColor: '#FDE68A', keyRadius: 10 },
  { id: 'minimal', name: 'بسيط', price: 150, keyBg: 'transparent', keyBorder: '#4B5563', keyTextColor: '#FFFFFF', keyRadius: 6 },
];

// Preview colors for mini board in shop
export const PREVIEW_GRID = [
  ['correct', 'absent', 'present', 'absent'],
  ['absent', 'correct', 'absent', 'correct'],
  ['present', 'present', 'correct', 'correct'],
] as const;

export const RESULT_COLORS: Record<string, string> = {
  correct: '#22C55E',
  present: '#F59E0B',
  absent: '#374151',
};
