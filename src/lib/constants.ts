import { Dimensions } from 'react-native';

export const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Colors
export const COLORS = {
  PRIMARY_BG: '#0D1248',
  CARD_BG: '#1E1E3A',
  PURPLE: '#7C3AED',
  PURPLE_LIGHT: '#A78BFA',
  GREEN: '#22C55E',
  AMBER: '#F59E0B',
  GRAY_DARK: '#374151',
  GOLD: '#F59E0B',
  TEXT_PRIMARY: '#FFFFFF',
  TEXT_SECONDARY: '#8B8BAD',
  KEY_BG: '#1E1E3A',
  KEY_BORDER: '#2A2A50',
  CELL_BORDER: '#2A2A50',
  CELL_ACTIVE: '#7C3AED',
  RED: '#EF4444',
} as const;

// Game config
export const GAME = {
  MAX_ATTEMPTS: 6,
  DAILY_WORD_LENGTH: 5,
  STARTING_COINS: 50,
  STARTING_GEMS: 0,
  HINT_COST: 20,
  SKIP_COST: 30,
  CONTINUE_COST: 40,
  BLIND_ENTRY_COST: 20,
  TOURNAMENT_ENTRY_COST: 50,
  WIN_COINS: 3,
  DUEL_WIN_COINS: 6,
  DUEL_PARTICIPATE_COINS: 1,
  DUEL_BOT_WIN_COINS: 2,
  DUEL_BOT_PARTICIPATE_COINS: 0,
  MATCHMAKING_TIMEOUT_MS: 30000,
  FLIP_DURATION: 300,
  FLIP_STAGGER: 80,
  SHAKE_DURATION: 300,
  POP_DURATION: 100,
} as const;

// Keyboard layout (RTL)
export const KEYBOARD_ROWS = [
  ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج', 'د'],
  ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط'],
  ['ENTER', 'ئ', 'ء', 'ؤ', 'ر', 'لا', 'ى', 'ة', 'و', 'ز', 'ظ', 'DELETE'],
] as const;

// Key dimensions
export const KEY = {
  WIDTH: 30,
  HEIGHT: 50,
  WIDE_WIDTH: 48,
  GAP: 4,
  BORDER_RADIUS: 8,
  FONT_SIZE: 20,
} as const;

// Cell sizing
export const getCellSize = (wordLength: number) => {
  const totalGaps = (wordLength - 1) * 8;
  return Math.floor((SCREEN_WIDTH - 32 - totalGaps) / wordLength);
};
