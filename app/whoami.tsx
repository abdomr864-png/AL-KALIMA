import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, TextInput, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { WordEngine } from '../src/engine/WordEngine';
import { toArabicNumerals } from '../src/engine/ShareCard';
import { useCoins } from '../src/hooks/useCoins';
import { useCosmeticStore } from '../src/store/cosmeticStore';
import { useLanguage } from '../src/lib/LanguageContext';

const HEADER_H = 56;
const POINTS_BY_CLUE = [500, 400, 300, 200, 100];

interface WhoAmIWord {
  word: string;
  clues: string[];
}

const WHO_AM_I_WORDS: WhoAmIWord[] = [
  {
    word: 'أسد',
    clues: ['حيوان يعيش في أفريقيا', 'له لبدة كبيرة حول رأسه', 'يُعرف بملك الغابة', 'يصدر زئيراً قوياً', 'لونه أصفر-بني'],
  },
  {
    word: 'تفاح',
    clues: ['تنمو على الأشجار', 'فاكهة معروفة في العالم', 'يمكن أن تكون حمراء أو خضراء', 'قيل إنها سقطت على رأس نيوتن', 'اسمها بالإنجليزية Apple'],
  },
  {
    word: 'قلم',
    clues: ['أداة تُستخدم كل يوم', 'يمكن أن يكون من خشب أو بلاستيك', 'يحتوي على حبر', 'يُستخدم في الكتابة', 'له غطاء في أغلب الأحيان'],
  },
  {
    word: 'قمر',
    clues: ['يظهر في الليل', 'له أطوار مختلفة', 'يدور حول الأرض', 'يعكس ضوء الشمس', 'مشى عليه الإنسان عام 1969'],
  },
  {
    word: 'كتاب',
    clues: ['يحتوي على صفحات', 'يمكن أن يكون ورقياً أو إلكترونياً', 'يحمل معلومات أو قصص', 'له غلاف أمامي وخلفي', 'خير جليس في الزمان'],
  },
  {
    word: 'بحر',
    clues: ['مساحة واسعة', 'يحتوي على ماء', 'تعيش فيه الأسماك', 'له أمواج', 'ماؤه مالح'],
  },
  {
    word: 'شمس',
    clues: ['تشرق كل صباح', 'مصدر للطاقة', 'تبعد ملايين الكيلومترات', 'نجم في مجرتنا', 'تمنحنا الضوء والحرارة'],
  },
  {
    word: 'حصان',
    clues: ['حيوان أليف', 'يُستخدم في السباقات', 'له حوافر', 'يمتاز بسرعته', 'كان وسيلة النقل الأساسية قديماً'],
  },
  {
    word: 'سيارة',
    clues: ['اختراع حديث نسبياً', 'تحتاج وقوداً لتعمل', 'لها أربع عجلات', 'تسير على الطرق', 'وسيلة نقل شائعة جداً'],
  },
  {
    word: 'ماء',
    clues: ['ضروري للحياة', 'ليس له لون', 'يغطي معظم الأرض', 'يمكن أن يكون سائلاً أو صلباً أو غازاً', 'صيغته الكيميائية H₂O'],
  },
  {
    word: 'نار',
    clues: ['تُنتج حرارة', 'يمكن أن تكون خطيرة', 'لها ألوان مختلفة', 'اكتشفها الإنسان قديماً', 'تحتاج أكسجين لتستمر'],
  },
  {
    word: 'خبز',
    clues: ['غذاء أساسي', 'يُصنع من الدقيق', 'يُخبز في الفرن', 'له أنواع كثيرة حول العالم', 'يُؤكل مع معظم الوجبات العربية'],
  },
  {
    word: 'نحلة',
    clues: ['حشرة صغيرة', 'تعيش في مجموعات', 'تصنع شيئاً حلواً', 'لها لدغة مؤلمة', 'تنقل حبوب اللقاح بين الأزهار'],
  },
  {
    word: 'قطة',
    clues: ['حيوان أليف شائع', 'تنام كثيراً', 'لها شوارب', 'تخرخر عندما تكون سعيدة', 'عدو الفأر التقليدي'],
  },
  {
    word: 'وردة',
    clues: ['نبات جميل', 'لها رائحة عطرة', 'تُهدى في المناسبات', 'لها أشواك', 'رمز للحب'],
  },
  {
    word: 'سمكة',
    clues: ['تعيش في الماء', 'تتنفس بالخياشيم', 'لها زعانف', 'مغطاة بالحراشف', 'غذاء صحي غني بالأوميغا'],
  },
  {
    word: 'عسل',
    clues: ['مادة حلوة طبيعية', 'لونه ذهبي', 'لا يفسد أبداً', 'تصنعه الحشرات', 'ذُكر في القرآن الكريم'],
  },
  {
    word: 'طبيب',
    clues: ['يعمل في مكان محدد', 'يرتدي معطفاً أبيض', 'درس سنوات طويلة', 'يستخدم سماعة', 'يعالج المرضى'],
  },
  {
    word: 'مطر',
    clues: ['يهطل من السماء', 'يأتي مع الغيوم', 'يسقي الأرض', 'له صوت مميز', 'رائحته بعد نزوله تسمى بتريكور'],
  },
  {
    word: 'جبل',
    clues: ['تكوين طبيعي', 'مرتفع عن الأرض', 'قمته قد تكون مغطاة بالثلج', 'يتسلقه المغامرون', 'أعلاه في العالم إيفرست'],
  },
];

export default function WhoAmIScreen() {
  const { theme: cosTheme } = useCosmeticStore();
  const { t, isEnglish } = useLanguage();
  const { earnCoins } = useCoins();
  const [wordIndex, setWordIndex] = useState(() => Math.floor(Math.random() * WHO_AM_I_WORDS.length));
  const [cluesRevealed, setCluesRevealed] = useState(1);
  const [answer, setAnswer] = useState('');
  const [phase, setPhase] = useState<'playing' | 'won' | 'lost'>('playing');
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const currentWord = WHO_AM_I_WORDS[wordIndex];
  const currentPoints = POINTS_BY_CLUE[cluesRevealed - 1] || 100;

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' | 'info' } | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string, type: 'error' | 'success' | 'info', duration = 1800) {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ msg, type });
    toastOpacity.setValue(0);
    Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    toastTimeout.current = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setToast(null));
    }, duration);
  }

  function shakeInput() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }

  function revealNextClue() {
    if (cluesRevealed >= 5) return;
    setCluesRevealed(prev => prev + 1);
  }

  function submitAnswer() {
    if (!answer.trim()) return;
    const normalized = WordEngine.normalizeLetter(answer.trim());
    const normalizedTarget = WordEngine.normalizeLetter(currentWord.word);

    // Compare normalized versions
    const normGuess = [...normalized].map(c => WordEngine.normalizeLetter(c)).join('');
    const normTarget = [...normalizedTarget].map(c => WordEngine.normalizeLetter(c)).join('');

    if (normGuess === normTarget) {
      setScore(currentPoints);
      setTotalScore(prev => prev + currentPoints);
      const coins = Math.floor(currentPoints / 50);
      earnCoins(coins, 'classic_word');
      setPhase('won');
      showToast(isEnglish ? `Well done! +${currentPoints} points` : `أحسنت! +${currentPoints} نقطة`, 'success', 3000);
    } else {
      shakeInput();
      showToast(isEnglish ? 'Wrong answer, try again' : 'إجابة خاطئة، حاول مجدداً', 'error');
    }
  }

  function nextRound() {
    const next = (wordIndex + 1) % WHO_AM_I_WORDS.length;
    setWordIndex(next);
    setCluesRevealed(1);
    setAnswer('');
    setPhase('playing');
    setScore(0);
    setRoundsPlayed(prev => prev + 1);
  }

  function giveUp() {
    setPhase('lost');
    showToast(isEnglish ? `The answer was: ${currentWord.word}` : `كان الجواب: ${currentWord.word}`, 'error', 3000);
  }

  return (
    <View style={[styles.container, { backgroundColor: cosTheme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
          <Text style={styles.backArrow}>{isEnglish ? '‹' : '›'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('من أنا؟', 'Who Am I?')}</Text>
        <Text style={styles.headerEmoji}>🎯</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Points available */}
        <View style={styles.pointsCard}>
          <Text style={styles.pointsLabel}>{t('النقاط المتاحة', 'Points Available')}</Text>
          <Text style={styles.pointsValue}>{toArabicNumerals(phase === 'playing' ? currentPoints : score)}</Text>
        </View>

        {/* Clues */}
        <Text style={[styles.clueHeader, { textAlign: isEnglish ? 'left' : 'right' }]}>{isEnglish ? `Clue ${cluesRevealed}/5:` : `التلميح ${toArabicNumerals(cluesRevealed)}/5:`}</Text>
        {currentWord.clues.slice(0, cluesRevealed).map((clue, i) => (
          <Animated.View key={i} style={[styles.clueCard, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
            <Text style={styles.clueNumber}>{toArabicNumerals(i + 1)}</Text>
            <Text style={styles.clueText}>{clue}</Text>
          </Animated.View>
        ))}

        {/* Reveal more clues */}
        {phase === 'playing' && cluesRevealed < 5 && (
          <TouchableOpacity style={styles.revealBtn} onPress={revealNextClue}>
            <Text style={styles.revealBtnText}>
              {t(`كشف تلميح آخر -${toArabicNumerals(100)} نقطة`, `Reveal another clue -100 points`)}
            </Text>
          </TouchableOpacity>
        )}

        {/* Answer input */}
        {phase === 'playing' && (
          <View style={styles.answerSection}>
            <Text style={styles.answerLabel}>{t('اكتب إجابتك:', 'Type your answer:')}</Text>
            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <TextInput
                style={styles.answerInput}
                value={answer}
                onChangeText={setAnswer}
                placeholder={isEnglish ? "Your answer..." : "الإجابة هنا..."}
                placeholderTextColor="#6B7280"
                textAlign={isEnglish ? "left" : "right"}
                autoFocus={false}
              />
            </Animated.View>
            <TouchableOpacity style={styles.submitBtn} onPress={submitAnswer}>
              <Text style={styles.submitBtnText}>{t('أجب الآن', 'Answer Now')}</Text>
            </TouchableOpacity>
            {cluesRevealed >= 3 && (
              <TouchableOpacity style={styles.giveUpBtn} onPress={giveUp}>
                <Text style={styles.giveUpBtnText}>{t('استسلم', 'Give Up')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Result */}
        {(phase === 'won' || phase === 'lost') && (
          <View style={styles.resultSection}>
            <Text style={styles.resultEmoji}>{phase === 'won' ? '🎉' : '💪'}</Text>
            <Text style={styles.resultTitle}>{phase === 'won' ? t('أحسنت!', 'Well Done!') : t('حظاً أوفر', 'Better Luck Next Time')}</Text>
            <View style={styles.resultCard}>
              <Text style={styles.resultWord}>{currentWord.word}</Text>
            </View>
            {phase === 'won' && (
              <Text style={styles.resultScore}>{isEnglish ? `+${score} points` : `+${toArabicNumerals(score)} نقطة`}</Text>
            )}
            <TouchableOpacity style={styles.submitBtn} onPress={nextRound}>
              <Text style={styles.submitBtnText}>{t('الكلمة التالية', 'Next Word')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Toast */}
      {toast && (
        <Animated.View
          style={[
            styles.toast,
            { opacity: toastOpacity },
            toast.type === 'error' && { backgroundColor: '#EF4444' },
            toast.type === 'success' && { backgroundColor: '#22C55E' },
            toast.type === 'info' && { backgroundColor: '#7C3AED' },
          ]}
        >
          <Text style={styles.toastText}>{toast.msg}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0730' },
  header: {
    height: HEADER_H,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A2E',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1A1040', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#7C3AED40',
  },
  backArrow: { fontSize: 22, color: '#A78BFA', fontWeight: '600' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: '#FFF' },
  headerEmoji: { fontSize: 22, width: 36, textAlign: 'center' },

  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },

  // Points
  pointsCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2D2D50',
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  pointsLabel: { fontSize: 14, color: '#A78BFA', fontWeight: '600' },
  pointsValue: { fontSize: 36, fontWeight: '900', color: '#FFF' },

  // Clues
  clueHeader: { fontSize: 16, fontWeight: '700', color: '#A78BFA', textAlign: 'right', marginBottom: 12 },
  clueCard: {
    flexDirection: 'row-reverse',
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2D2D50',
    padding: 16,
    gap: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  clueNumber: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#7C3AED',
    textAlign: 'center',
    lineHeight: 28,
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
  clueText: { flex: 1, fontSize: 16, color: '#FFF', fontWeight: '600', lineHeight: 24 },

  // Reveal button
  revealBtn: {
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#7C3AED',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  revealBtnText: { fontSize: 15, fontWeight: '700', color: '#A78BFA' },

  // Answer section
  answerSection: { gap: 12, marginTop: 8 },
  answerLabel: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  answerInput: {
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2D2D50',
    height: 54,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  submitBtn: {
    backgroundColor: '#7C3AED',
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  giveUpBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  giveUpBtnText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },

  // Result
  resultSection: { alignItems: 'center', gap: 12, marginTop: 20 },
  resultEmoji: { fontSize: 64 },
  resultTitle: { fontSize: 28, fontWeight: '900', color: '#FFF' },
  resultCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2D2D50',
    padding: 20,
    alignItems: 'center',
    width: '100%',
  },
  resultWord: { fontSize: 36, fontWeight: '900', color: '#FFF' },
  resultScore: { fontSize: 22, fontWeight: '800', color: '#22C55E' },

  // Toast
  toast: {
    position: 'absolute',
    top: HEADER_H + 12,
    left: 24,
    right: 24,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  toastText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
