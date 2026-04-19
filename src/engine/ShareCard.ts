import { type GuessResult } from './WordEngine';

const EMOJI_MAP = {
  correct: '🟩',
  present: '🟨',
  absent: '⬛',
} as const;

/**
 * Generate the emoji grid text for sharing results
 */
export function generateEmojiGrid(results: GuessResult[]): string {
  return results
    .map((row) =>
      // RTL: reverse so rightmost letter is first emoji
      [...row].reverse().map((r) => EMOJI_MAP[r]).join('')
    )
    .join('\n');
}

/**
 * Generate shareable text result
 */
export function generateShareText(
  date: string,
  results: GuessResult[],
  won: boolean,
  attempts: number,
  streak: number,
  language: 'ar' | 'en' = 'ar'
): string {
  const emojiGrid = language === 'en'
    ? results.map((row) => row.map((r) => EMOJI_MAP[r]).join('')).join('\n')
    : generateEmojiGrid(results);

  if (language === 'en') {
    const resultText = won
      ? `Got it in ${attempts} attempts 🔥`
      : 'Missed today ✗';
    const d = new Date(date + 'T00:00:00');
    const formatted = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return `The Word - ${formatted}\n${emojiGrid}\n${resultText}${streak > 1 ? `\n🔥 ${streak} day streak` : ''}\nPlay: kalimat.app`;
  }

  const resultText = won
    ? `أصبت في ${attempts} محاولات 🔥`
    : 'لم أصب اليوم ✗';

  const arabicDate = formatArabicDate(date);

  return `الكلمة - ${arabicDate}
${emojiGrid}
${resultText}${streak > 1 ? `\n🔥 ${streak} يوم متتالي` : ''}
العب: kalimat.app`;
}

/**
 * Format a YYYY-MM-DD date to Arabic format
 */
export function formatArabicDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
  ];

  const dayName = days[date.getDay()];
  const dayNum = date.getDate();
  const monthName = months[date.getMonth()];

  return `${dayName} ${dayNum} ${monthName}`;
}

/**
 * Convert number to French (Western) numerals
 */
export function toArabicNumerals(num: number): string {
  return num.toLocaleString('fr-FR');
}
