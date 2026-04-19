import { ALL_WORDS } from './words';
import { isValidEnglishWord } from './words_en';

// Blocklist: abbreviations, internet slang, interjections, single-letter chat tokens.
// These are rejected even if the dictionary API recognizes them.
const ENGLISH_BLOCKLIST = new Set<string>([
  // Thanks / greetings
  'TY', 'TYSM', 'TYVM', 'THX', 'THNX', 'THANX', 'TQ',
  'HI', 'HEY', 'YO', 'SUP', 'HIYA', 'HOWDY',
  'BYE', 'CYA', 'CYU', 'GB', 'GBU', 'TTYL', 'TTFN',
  // Affirmations / negations
  'YUP', 'YEP', 'YEAH', 'YAH', 'YA', 'YEA', 'YW', 'NP',
  'NAH', 'NOPE', 'NO', 'OK', 'OKAY', 'KK', 'KAY', 'K',
  // Reactions / laughter
  'LOL', 'LOLZ', 'LMAO', 'LMFAO', 'ROFL', 'ROFLMAO',
  'HAHA', 'HEHE', 'HEHEHE', 'HAHAHA', 'XD', 'XDD',
  'OMG', 'OMFG', 'OMW', 'WTF', 'WTH', 'STFU', 'GTFO',
  'SMH', 'SMFH', 'IDK', 'IDC', 'IDGAF', 'IKR', 'TBH', 'NGL',
  'FR', 'FRFR', 'BRUH', 'BRO', 'SIS', 'FAM', 'BAE',
  // Chat/tech abbreviations
  'BRB', 'BBL', 'BBIAB', 'AFK', 'IRL', 'DM', 'PM',
  'BTW', 'FYI', 'IMO', 'IMHO', 'ASAP', 'TBA', 'TBD',
  'RN', 'ATM', 'DIY', 'FAQ', 'AKA', 'ETA', 'ETC',
  'PLS', 'PLZ', 'PLEEZ', 'THANKS', 'CUZ', 'COS', 'BC',
  // Gaming
  'GG', 'WP', 'EZ', 'EZPZ', 'NOOB', 'NUB', 'POG', 'POGGERS',
  'GL', 'HF', 'GLHF', 'AFK', 'GGWP', 'REKT',
  // Single letters that sometimes pass dict APIs
  'A', 'I',
]);

// Cache for async dictionary lookups (word → exists)
const ENGLISH_DICT_CACHE = new Map<string, boolean>();

async function isEnglishWordOnline(upper: string): Promise<boolean> {
  if (ENGLISH_DICT_CACHE.has(upper)) return ENGLISH_DICT_CACHE.get(upper)!;
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(upper.toLowerCase())}`,
    );
    const ok = res.status === 200;
    ENGLISH_DICT_CACHE.set(upper, ok);
    return ok;
  } catch {
    // Network failure — don't penalize the player, treat as valid
    return true;
  }
}

export async function isEnglishWordValid(upper: string): Promise<boolean> {
  if (ENGLISH_BLOCKLIST.has(upper)) return false;
  if (isValidEnglishWord(upper)) return true;
  return isEnglishWordOnline(upper);
}

// Arabic normalization for comparison
export function normalizeArabic(word: string): string {
  return word
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ت')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .trim();
}

// Build a normalized set once for fast lookups
const NORMALIZED_WORDS = new Set<string>();
for (const w of ALL_WORDS) {
  NORMALIZED_WORDS.add(normalizeArabic(w));
}

function startsWithLetter(word: string, letter: string): boolean {
  const normWord = normalizeArabic(word);
  const normLetter = normalizeArabic(letter);
  return normWord.startsWith(normLetter);
}

function isRealWord(word: string): boolean {
  return NORMALIZED_WORDS.has(normalizeArabic(word));
}

export interface ValidationResult {
  valid: boolean;
  reason: 'correct' | 'wrong_letter' | 'not_a_word' | 'too_short' | 'already_used';
}

export function validateWord(
  word: string,
  letter: string,
  usedWordsThisSession: string[],
  isEnglish: boolean = false
): ValidationResult {
  const trimmed = word.trim();

  if (trimmed.length < 2) {
    return { valid: false, reason: 'too_short' };
  }

  if (isEnglish) {
    // English validation
    const upper = trimmed.toUpperCase();

    if (!/^[A-Z]+$/.test(upper)) {
      return { valid: false, reason: 'not_a_word' };
    }

    if (!upper.startsWith(letter.toUpperCase())) {
      return { valid: false, reason: 'wrong_letter' };
    }

    if (usedWordsThisSession.map(w => w.toUpperCase()).includes(upper)) {
      return { valid: false, reason: 'already_used' };
    }

    return { valid: true, reason: 'correct' };
  }

  // Arabic validation
  const arabicRegex = /^[\u0600-\u06FF]+$/;
  if (!arabicRegex.test(trimmed)) {
    return { valid: false, reason: 'not_a_word' };
  }

  if (!startsWithLetter(trimmed, letter)) {
    return { valid: false, reason: 'wrong_letter' };
  }

  const normalized = normalizeArabic(trimmed);
  if (usedWordsThisSession.map(normalizeArabic).includes(normalized)) {
    return { valid: false, reason: 'already_used' };
  }

  if (!isRealWord(trimmed)) {
    return { valid: false, reason: 'not_a_word' };
  }

  return { valid: true, reason: 'correct' };
}

export async function validateWordAsync(
  word: string,
  letter: string,
  usedWordsThisSession: string[],
  isEnglish: boolean = false,
): Promise<ValidationResult> {
  const base = validateWord(word, letter, usedWordsThisSession, isEnglish);
  if (!base.valid) return base;
  if (!isEnglish) return base;

  const upper = word.trim().toUpperCase();
  const exists = await isEnglishWordValid(upper);
  if (!exists) return { valid: false, reason: 'not_a_word' };
  return base;
}

export function calculateClassicWordScore(
  word: string,
  cardIndex: number,
  letterIndex: number,
  isHotStreak: boolean
): number {
  const length = word.trim().length;
  const base = length * 15;
  const positionBonus = (3 - cardIndex) * 10;
  const progressBonus = letterIndex * 5;
  const hotMult = isHotStreak ? 2 : 1;

  return Math.round((base + positionBonus + progressBonus) * hotMult);
}
