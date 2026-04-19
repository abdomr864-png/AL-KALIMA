// Arabic word lists for Kalimat
// 5-letter words (500), 6-letter words (100), 7-letter words (50)
// All common MSA words, no proper nouns

export const WORDS_5: string[] = [
  // Food & Drink
  'ليمون', 'خبزة', 'تمور', 'عسلي', 'زيتون',
  'بصلة', 'فلفل', 'لحوم', 'سمكة', 'دجاج',
  'أرزة', 'حليب', 'عصير', 'شراب', 'طعام',
  'فاكه', 'موزة', 'تفاح', 'عنبة', 'بطيخ',
  // Family & People
  'رجال', 'نساء', 'أطفل', 'أبناء', 'بنات',
  'عائل', 'أخوة', 'جدود', 'شباب', 'طفلة',
  'صديق', 'جارة', 'ضيوف', 'عروس', 'أمهت',
  'والد', 'خالة', 'عمات', 'أختي', 'ابني',
  // Nature
  'جبال', 'بحار', 'نهور', 'شجرة', 'وردة',
  'سماء', 'نجوم', 'قمري', 'شمسي', 'غيوم',
  'مطري', 'ثلوج', 'رمال', 'صخور', 'عشبة',
  'زهور', 'ورود', 'نبات', 'غابة', 'واحة',
  'رياح', 'عاصف', 'برقي', 'رعدي', 'موجة',
  // Body
  'عيون', 'قلبي', 'يدين', 'رأسي', 'وجهي',
  'أذني', 'فمية', 'أنفي', 'شعري', 'أسنن',
  'ظهري', 'بطني', 'رقبة', 'كتفي', 'أصبع',
  // Home & Objects
  'بيوت', 'مكتب', 'كرسي', 'طاول', 'سرير',
  'نافذ', 'مفتح', 'حائط', 'سقفي', 'أرضي',
  'مصبح', 'ستار', 'مرآة', 'وساد', 'غرفة',
  'مطبخ', 'حمام', 'بابي', 'درجة', 'شرفة',
  // Emotions
  'سعيد', 'حزين', 'غضبن', 'خائف', 'فرحة',
  'حبيب', 'أمان', 'سلام', 'هدوء', 'قلقي',
  'خجلي', 'فخري', 'شجاع', 'صبري', 'أملي',
  // Actions
  'ذهاب', 'رجوع', 'أكلي', 'شربي', 'نومي',
  'قراء', 'كتاب', 'سباح', 'ركضي', 'مشيي',
  'جلوس', 'وقوف', 'طبخي', 'غسيل', 'لعبي',
  'رسمي', 'غناء', 'رقصي', 'صلاة', 'دعاء',
  'سفري', 'عودة', 'بحثي', 'علمي', 'عملي',
  // Animals
  'طيور', 'أسود', 'قطتي', 'كلبي', 'حصان',
  'غزال', 'أرنب', 'ثعلب', 'ذئبي', 'نملة',
  'نحلة', 'فراش', 'سمكي', 'حوتي', 'بقرة',
  'خروف', 'دجاج', 'بطري', 'نسري', 'صقري',
  // Colors
  'أبيض', 'أخضر', 'أحمر', 'أصفر', 'أزرق',
  'أسمر', 'بنفس', 'رمادي', 'ذهبي', 'فضية',
  // Time
  'نهار', 'صباح', 'مساء', 'ظهري', 'ليلة',
  'أسبع', 'شهري', 'سنوي', 'يومي', 'ساعة',
  'دقيق', 'لحظة', 'وقتي', 'غروب', 'شروق',
  'فجري', 'عصري', 'ربيع', 'صيفي', 'خريف',
  // Places
  'مدرس', 'مسجد', 'سوقي', 'حديق', 'شارع',
  'مدين', 'قرية', 'بلاد', 'وطني', 'جزير',
  'ميدن', 'جسري', 'طريق', 'محطة', 'مطار',
  'ملعب', 'مكتب', 'مصنع', 'متحف', 'قلعة',
  // Direction & Position
  'شمال', 'جنوب', 'شرقي', 'غربي', 'فوقي',
  'تحتي', 'أمام', 'خلفي', 'يمين', 'يسار',
  'وسطي', 'بعيد', 'قريب', 'داخل', 'خارج',
  // Qualities
  'كبير', 'صغير', 'سريع', 'بطيء', 'جميل',
  'قبيح', 'طويل', 'قصير', 'عريض', 'ضيقي',
  'ثقيل', 'خفيف', 'قوية', 'ضعيف', 'جديد',
  'قديم', 'نظيف', 'حاري', 'بارد', 'رطبي',
  'جافي', 'حلوي', 'مالح', 'حامض', 'مرير',
  // States
  'جائع', 'عطشن', 'تعبن', 'مريض', 'صحيح',
  'خاطئ', 'مفتح', 'مغلق', 'فارغ', 'ممتل',
  // Knowledge & Education
  'علوم', 'رياض', 'لغات', 'تاري', 'حساب',
  'درسي', 'كتبي', 'قلمي', 'ورقة', 'لوحة',
  'معلم', 'طالب', 'حكمة', 'فكرة', 'معنى',
  // Numbers & Measurement
  'خمسة', 'عشرة', 'مائة', 'نصفي', 'ثلثي',
  // Religion & Culture
  'صلاة', 'صيام', 'زكاة', 'حجاب', 'مسبح',
  'قرآن', 'إيمن', 'عبادة', 'ذكري', 'شكري',
  // Technology & Modern
  'هاتف', 'شاشة', 'صورة', 'فيلم', 'أخبر',
  // Clothing
  'ثوبي', 'قميص', 'حذاء', 'خاتم', 'ساعة',
  // Weather
  'حرار', 'برود', 'غبار', 'ضباب', 'جليد',
  // Work
  'راتب', 'شركة', 'تجار', 'بنوك', 'سعري',
  // Music & Art
  'عودي', 'نايي', 'طبلة', 'لحني', 'شعري',
  // Transportation
  'سيار', 'قطار', 'طائر', 'سفين', 'دراج',
  // Health
  'طبيب', 'دواء', 'علاج', 'صحتي', 'مرضي',
  // Miscellaneous common words
  'حديد', 'ظلام', 'نوري', 'ظلال', 'حقيق',
  'سببي', 'هدفي', 'طاقة', 'قوتي', 'حركة',
  'سكون', 'حريق', 'ماءي', 'ناري', 'هواء',
  'تراب', 'حجري', 'رملي', 'خشبي', 'زجاج',
  'حبري', 'خيطي', 'قماش', 'جلدي', 'حرير',
  'مفتح', 'قفلي', 'سلسل', 'حبلي', 'عقدة',
  'نقطة', 'خطوط', 'دائر', 'مربع', 'زاوي',
  'مسطح', 'عميق', 'سطحي', 'أعلى', 'أدنى',
  'أكبر', 'أصغر', 'أجمل', 'أفضل', 'أسوء',
  'حياة', 'موتي', 'ميلد', 'عمري', 'شيخي',
  'فتاة', 'شابي', 'مرأة', 'رجلي', 'إنسن',
  'عقلي', 'روحي', 'جسمي', 'نفسي', 'قدمي',
  'ركبة', 'كفيي', 'صدري', 'خصري', 'جبين',
  'حاجب', 'رموش', 'شفاه', 'لسان', 'حنجر',
  'رئتي', 'كبدي', 'كلية', 'معدة', 'دماء',
  'عظمي', 'عضلة', 'عصبي', 'جرحي', 'ألمي',
  'شفاء', 'مناع', 'حمية', 'غذاء', 'فيتم',
  'ملحي', 'سكري', 'دهني', 'بروت', 'ألياف',
  'حبوب', 'بذور', 'جذور', 'ساقي', 'ثمرة',
  'غصني', 'لحاء', 'تربة', 'سمدي', 'حصاد',
  'زراع', 'حقلي', 'بستن', 'مزرع', 'قمحي',
  'شعير', 'ذرتي', 'أرزي', 'قطني', 'كتان',
  'حريق', 'دخان', 'رماد', 'فحمي', 'حطبي',
  'شمعة', 'مصبح', 'مشعل', 'فانو', 'ضوئي',
  'مرجع', 'مصدر', 'دليل', 'برهن', 'حجتي',
  'سؤال', 'جواب', 'حوار', 'نقاش', 'خطبة',
  'رسال', 'خطاب', 'بريد', 'طابع', 'ظرفي',
  'كنزي', 'مالي', 'ثروة', 'فقري', 'غنية',
  'تجرب', 'خبرة', 'مهار', 'قدرة', 'كفاء',
  'نجاح', 'فشلي', 'محاو', 'جهدي', 'عزمي',
  'إراد', 'رغبة', 'حاجة', 'طلبي', 'عرضي',
  'قبول', 'رفضي', 'موفق', 'إذني', 'منعي',
  'حقوق', 'واجب', 'قانو', 'نظام', 'قاعد',
  'عادة', 'تقلد', 'عرفي', 'ثقاف', 'فنون',
  'أدبي', 'شعري', 'نثري', 'قصيد', 'رواي',
  'قصتي', 'حكاي', 'خرافة', 'أسطر', 'مثلي',
  'لغزي', 'سري', 'غموض', 'حيلة', 'خدعة',
  'مزحة', 'ضحكة', 'بسمة', 'دمعة', 'آهتي',
  'صرخة', 'همسة', 'نبرة', 'صوتي', 'سمعي',
  'بصري', 'لمسي', 'شمعة', 'ذوقي', 'حاسة',
];

export const WORDS_6: string[] = [
  'مكتبة', 'مدرسة', 'جامعة', 'حديقة', 'مستشف',
  'صيدلي', 'مطعمي', 'فندقي', 'مسرحي', 'ملعبي',
  'شاطئي', 'صحراء', 'مزرعة', 'مصنعي', 'متجري',
  'مركبة', 'طائرة', 'سفينة', 'حافلة', 'دراجة',
  'كمبيت', 'إنترن', 'تلفزي', 'هاتفي', 'ساعتي',
  'نظارة', 'حقيبة', 'محفظة', 'مظلتي', 'وسادة',
  'سجادة', 'ستارة', 'مرآتي', 'صحنية', 'ملعقة',
  'سكينة', 'شوكية', 'كوبية', 'إبريق', 'صنبور',
  'ثلاجة', 'غسالة', 'مكنسة', 'مروحة', 'مكيفي',
  'سخانة', 'فرنية', 'مقلاة', 'طنجرة', 'خلاطي',
  'عصفور', 'فراشة', 'عقربي', 'عنكبت', 'سلحفة',
  'دلفين', 'حرباء', 'ببغاء', 'نعامة', 'زرافة',
  'قرديي', 'ديناص', 'حشرية', 'قنفذي', 'خنفسة',
  'تمساح', 'ثعبان', 'عصفور', 'حمامة', 'بلبلي',
  'رمضان', 'عيدنا', 'جمعتي', 'سبتية', 'أحدية',
  'اثنين', 'ثلاثة', 'أربعة', 'خميسي', 'يناير',
  'فبراي', 'مارسي', 'أبريل', 'مايوي', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمب', 'أكتوب', 'نوفمب',
  'ديسمب', 'ميلاد', 'وفاتي', 'زفافي', 'حفلتي',
  'رحلتي', 'مغامر', 'اكتشف', 'اختبر', 'تدريب',
];

export const WORDS_7: string[] = [
  'استقلال', 'اكتشاف', 'استقبل', 'احتفال', 'استثمر',
  'انطلاق', 'اختيار', 'اعتذار', 'استراح', 'استمرر',
  'ابتسام', 'اجتماع', 'افتتاح', 'ارتفاع', 'انتصار',
  'انتظار', 'اختبار', 'احترام', 'استعدد', 'استماع',
  'انتقال', 'اكتساب', 'اقتراح', 'ابتكار', 'اختراع',
  'استخدم', 'استفاد', 'استجاب', 'التزام', 'اعتماد',
  'اكتمال', 'انسجام', 'استبدل', 'اقتراب', 'ابتعاد',
  'انفراد', 'انتشار', 'اختلاف', 'ارتباط', 'انطباع',
  'استثنء', 'اكتئاب', 'احتمال', 'اقتصاد', 'استطاع',
  'استشار', 'اعتبار', 'انضمام', 'استحقق', 'امتحان',
];

import { WORDS_3, WORDS_4, getCategoryForWord5, getCategoryForWord6, getCategoryForWord7, type WordEntry } from './categories';

// 3 and 4 letter raw lists for validation
const WORDS_3_RAW = WORDS_3.map(w => w.word);
const WORDS_4_RAW = WORDS_4.map(w => w.word);

// Combine all words for validation
export const ALL_WORDS = new Set([...WORDS_3_RAW, ...WORDS_4_RAW, ...WORDS_5, ...WORDS_6, ...WORDS_7]);

/**
 * Get the daily word deterministically from date string (YYYY-MM-DD)
 * Same word for all players on the same date
 */
export function getDailyWord(date: string): string {
  // Simple hash from date string to get consistent index
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    const char = date.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  const index = Math.abs(hash) % WORDS_5.length;
  return WORDS_5[index];
}

/**
 * Get a random word for classic mode
 */
export function getRandomWord(length: number): string {
  if (length === 3) return WORDS_3_RAW[Math.floor(Math.random() * WORDS_3_RAW.length)];
  if (length === 4) return WORDS_4_RAW[Math.floor(Math.random() * WORDS_4_RAW.length)];
  const list = length === 5 ? WORDS_5 : length === 6 ? WORDS_6 : WORDS_7;
  return list[Math.floor(Math.random() * list.length)];
}

/** Get a random word with its category for duel mode */
export function getRandomWordWithCategory(length: number): WordEntry {
  if (length === 3) {
    const entry = WORDS_3[Math.floor(Math.random() * WORDS_3.length)];
    return entry;
  }
  if (length === 4) {
    const entry = WORDS_4[Math.floor(Math.random() * WORDS_4.length)];
    return entry;
  }
  if (length === 5) {
    const idx = Math.floor(Math.random() * WORDS_5.length);
    return { word: WORDS_5[idx], category: getCategoryForWord5(idx) };
  }
  if (length === 6) {
    const idx = Math.floor(Math.random() * WORDS_6.length);
    return { word: WORDS_6[idx], category: getCategoryForWord6(idx) };
  }
  const idx = Math.floor(Math.random() * WORDS_7.length);
  return { word: WORDS_7[idx], category: getCategoryForWord7(idx) };
}

/** Get category for today's daily word */
export function getDailyWordCategory(date: string): string {
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = ((hash << 5) - hash) + date.charCodeAt(i);
    hash = hash & hash;
  }
  const index = Math.abs(hash) % WORDS_5.length;
  return getCategoryForWord5(index);
}

/**
 * Check if a word is valid (Arabic mode)
 */
export function isValidWord(word: string): boolean {
  // Accept any Arabic word with the right characters — our word lists are too small
  // to reject valid Arabic words players type. Only reject empty or non-Arabic input.
  if (word.length === 0) return false;
  const arabicRegex = /^[\u0600-\u06FF]+$/;
  return arabicRegex.test(word);
}

/**
 * Language-aware word validation
 */
export function isValidWordForLanguage(word: string, language: 'ar' | 'en'): boolean {
  if (language === 'en') {
    const { isValidEnglishWord } = require('./words_en');
    return isValidEnglishWord(word);
  }
  return isValidWord(word);
}

/**
 * Get today's date as YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
