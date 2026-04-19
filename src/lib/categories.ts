// Word category system for Kalimat

export interface WordEntry {
  word: string;
  category: string;
}

// Category metadata
export function getCategoryEmoji(cat: string): string {
  const map: Record<string, string> = {
    'طعام': '🍽️', 'حيوانات': '🐾', 'طبيعة': '🌿', 'جسم': '💪',
    'منزل': '🏠', 'مشاعر': '❤️', 'أفعال': '⚡', 'ألوان': '🎨',
    'وقت': '⏰', 'ملابس': '👕', 'مدرسة': '📚', 'رياضة': '⚽',
    'أماكن': '📍', 'عائلة': '👨‍👩‍👧', 'صفات': '✨', 'صحة': '🏥',
  };
  return map[cat] ?? '📝';
}

export function getCategoryColor(cat: string): string {
  const map: Record<string, string> = {
    'طعام': '#D97706', 'حيوانات': '#16A34A', 'طبيعة': '#0891B2',
    'جسم': '#DC2626', 'منزل': '#7C3AED', 'مشاعر': '#EC4899',
    'أفعال': '#2563EB', 'ألوان': '#9333EA', 'وقت': '#0F766E',
    'ملابس': '#B45309', 'مدرسة': '#1D4ED8', 'رياضة': '#15803D',
    'أماكن': '#6D28D9', 'عائلة': '#DB2777', 'صفات': '#7C3AED',
    'صحة': '#059669',
  };
  return map[cat] ?? '#7C3AED';
}

// Map existing words to categories based on their position in the arrays
// The WORDS_5 array has comments indicating categories
const CATEGORY_RANGES_5: Array<{ start: number; end: number; cat: string }> = [
  { start: 0, end: 19, cat: 'طعام' },
  { start: 20, end: 39, cat: 'عائلة' },
  { start: 40, end: 64, cat: 'طبيعة' },
  { start: 65, end: 79, cat: 'جسم' },
  { start: 80, end: 99, cat: 'منزل' },
  { start: 100, end: 114, cat: 'مشاعر' },
  { start: 115, end: 139, cat: 'أفعال' },
  { start: 140, end: 159, cat: 'حيوانات' },
  { start: 160, end: 169, cat: 'ألوان' },
  { start: 170, end: 189, cat: 'وقت' },
  { start: 190, end: 209, cat: 'أماكن' },
  { start: 210, end: 224, cat: 'أماكن' },
  { start: 225, end: 249, cat: 'صفات' },
  { start: 250, end: 259, cat: 'صفات' },
  { start: 260, end: 274, cat: 'مدرسة' },
  { start: 275, end: 279, cat: 'وقت' },
  { start: 280, end: 284, cat: 'مشاعر' },
  { start: 285, end: 299, cat: 'ملابس' },
];

export function getCategoryForWord5(index: number): string {
  for (const range of CATEGORY_RANGES_5) {
    if (index >= range.start && index <= range.end) return range.cat;
  }
  return 'أفعال'; // fallback for remaining words
}

export function getCategoryForWord6(_index: number): string {
  if (_index < 20) return 'أماكن';
  if (_index < 40) return 'منزل';
  if (_index < 60) return 'حيوانات';
  if (_index < 80) return 'وقت';
  return 'أفعال';
}

export function getCategoryForWord7(_index: number): string {
  return 'أفعال'; // 7-letter words are mostly verb forms
}

// 3 and 4 letter word lists with categories
export const WORDS_3: WordEntry[] = [
  { word: 'خبز', category: 'طعام' }, { word: 'لحم', category: 'طعام' },
  { word: 'تمر', category: 'طعام' }, { word: 'عسل', category: 'طعام' },
  { word: 'ملح', category: 'طعام' }, { word: 'زيت', category: 'طعام' },
  { word: 'ماء', category: 'طبيعة' }, { word: 'نار', category: 'طبيعة' },
  { word: 'بحر', category: 'طبيعة' }, { word: 'نهر', category: 'طبيعة' },
  { word: 'جبل', category: 'طبيعة' }, { word: 'أرض', category: 'طبيعة' },
  { word: 'قطة', category: 'حيوانات' }, { word: 'كلب', category: 'حيوانات' },
  { word: 'أسد', category: 'حيوانات' }, { word: 'ذئب', category: 'حيوانات' },
  { word: 'بقر', category: 'حيوانات' }, { word: 'نمل', category: 'حيوانات' },
  { word: 'يوم', category: 'وقت' }, { word: 'ليل', category: 'وقت' },
  { word: 'فجر', category: 'وقت' }, { word: 'وقت', category: 'وقت' },
  { word: 'باب', category: 'منزل' }, { word: 'بيت', category: 'منزل' },
  { word: 'سقف', category: 'منزل' }, { word: 'حبل', category: 'منزل' },
  { word: 'عين', category: 'جسم' }, { word: 'يدي', category: 'جسم' },
  { word: 'رأس', category: 'جسم' }, { word: 'قلب', category: 'جسم' },
  { word: 'حلم', category: 'مشاعر' }, { word: 'حزن', category: 'مشاعر' },
  { word: 'فرح', category: 'مشاعر' }, { word: 'أمل', category: 'مشاعر' },
  { word: 'قلم', category: 'مدرسة' }, { word: 'علم', category: 'مدرسة' },
  { word: 'درس', category: 'مدرسة' }, { word: 'حبر', category: 'مدرسة' },
];

export const WORDS_4: WordEntry[] = [
  { word: 'حليب', category: 'طعام' }, { word: 'عصير', category: 'طعام' },
  { word: 'طعام', category: 'طعام' }, { word: 'شراب', category: 'طعام' },
  { word: 'سمكة', category: 'طعام' }, { word: 'دجاج', category: 'طعام' },
  { word: 'بصلة', category: 'طعام' }, { word: 'فلفل', category: 'طعام' },
  { word: 'شجرة', category: 'طبيعة' }, { word: 'وردة', category: 'طبيعة' },
  { word: 'سماء', category: 'طبيعة' }, { word: 'نجوم', category: 'طبيعة' },
  { word: 'غيوم', category: 'طبيعة' }, { word: 'موجة', category: 'طبيعة' },
  { word: 'رمال', category: 'طبيعة' }, { word: 'غابة', category: 'طبيعة' },
  { word: 'حصان', category: 'حيوانات' }, { word: 'غزال', category: 'حيوانات' },
  { word: 'أرنب', category: 'حيوانات' }, { word: 'ثعلب', category: 'حيوانات' },
  { word: 'نملة', category: 'حيوانات' }, { word: 'نحلة', category: 'حيوانات' },
  { word: 'بقرة', category: 'حيوانات' }, { word: 'خروف', category: 'حيوانات' },
  { word: 'كرسي', category: 'منزل' }, { word: 'سرير', category: 'منزل' },
  { word: 'غرفة', category: 'منزل' }, { word: 'مطبخ', category: 'منزل' },
  { word: 'سعيد', category: 'مشاعر' }, { word: 'حزين', category: 'مشاعر' },
  { word: 'خائف', category: 'مشاعر' }, { word: 'فرحة', category: 'مشاعر' },
  { word: 'سلام', category: 'مشاعر' }, { word: 'شجاع', category: 'مشاعر' },
  { word: 'كبير', category: 'صفات' }, { word: 'صغير', category: 'صفات' },
  { word: 'جميل', category: 'صفات' }, { word: 'سريع', category: 'صفات' },
  { word: 'جديد', category: 'صفات' }, { word: 'قديم', category: 'صفات' },
];
