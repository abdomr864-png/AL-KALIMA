import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { useCosmeticStore } from '../src/store/cosmeticStore';
import { useLanguage } from '../src/lib/LanguageContext';

const { width: W } = Dimensions.get('window');
const HEADER_H = 56;

// To re-enable a mode, remove its id from this array
const COMING_SOON_MODES = ['blitz', 'chain', 'whoami', 'blind', 'tournament', 'rush'];

const ALL_MODES = [
  { id: 'daily', name: 'كلمة اليوم', nameEn: 'Daily Word', emoji: '📅', desc: 'كلمة جديدة كل يوم', descEn: 'A new word every day', difficulty: 1, route: '/daily', color: '#7C3AED' },
  { id: 'duel', name: 'تحدٍ سريع', nameEn: 'Speed Duel', emoji: '⚡', desc: '1 ضد 1 — بوت أو لاعب', descEn: '1v1 — bot or player', difficulty: 2, route: '/duel', color: '#F59E0B' },
  { id: 'classic', name: 'الكلاسيكي', nameEn: 'Classic', emoji: '∞', desc: 'بلا حدود', descEn: 'Unlimited', difficulty: 2, route: '/classic', color: '#22C55E' },
  { id: 'rush', name: 'كلمة الساعة', nameEn: 'Word Rush', emoji: '⏰', desc: 'سباق كل ساعة', descEn: 'Hourly race', difficulty: 2, route: '/rush', color: '#0EA5E9' },
  { id: 'blitz', name: 'تحدي الفئة', nameEn: 'Category Blitz', emoji: '💥', desc: '90 ثانية — أكثر ما يمكن', descEn: '90 seconds — as many as you can', difficulty: 3, route: '/blitz', color: '#EC4899' },
  { id: 'whoami', name: 'من أنا؟', nameEn: 'Who Am I?', emoji: '🎯', desc: 'خمّن من التلميحات', descEn: 'Guess from clues', difficulty: 2, route: '/whoami', color: '#14B8A6' },
  { id: 'chain', name: 'المتسلسلة', nameEn: 'Word Chain', emoji: '🔗', desc: 'سلسلة الكلمات', descEn: 'Chain of words', difficulty: 3, route: '/chain', color: '#F97316' },
  { id: 'tournament', name: 'البطولة', nameEn: 'Tournament', emoji: '🏆', desc: 'أسبوعي — 64 لاعب', descEn: 'Weekly — 64 players', difficulty: 4, route: '/tournament', color: '#EAB308' },
  { id: 'blind', name: 'العمياء', nameEn: 'Blind Mode', emoji: '👁️', desc: 'للمحترفين فقط', descEn: 'Pros only', difficulty: 5, route: '/blind', color: '#EF4444' },
];

function DifficultyStars({ level }: { level: number }) {
  return (
    <Text style={styles.stars}>
      {'⭐'.repeat(level)}{'☆'.repeat(5 - level)}
    </Text>
  );
}

export default function ModesScreen() {
  const { theme: cosTheme } = useCosmeticStore();
  const { t, isEnglish } = useLanguage();

  const activeModes = ALL_MODES.filter(m => !COMING_SOON_MODES.includes(m.id));
  const comingSoonModes = ALL_MODES.filter(m => COMING_SOON_MODES.includes(m.id));

  return (
    <View style={[styles.container, { backgroundColor: cosTheme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
          <Text style={styles.backArrow}>{isEnglish ? '‹' : '›'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('كل الألعاب', 'All Games')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Active modes */}
        <View style={[styles.grid, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
          {activeModes.map((mode) => (
            <TouchableOpacity
              key={mode.id}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => router.push(mode.route as any)}
            >
              <Text style={styles.cardEmoji}>{mode.emoji}</Text>
              <Text style={styles.cardName}>{t(mode.name, mode.nameEn)}</Text>
              <Text style={styles.cardDesc}>{t(mode.desc, mode.descEn)}</Text>
              <DifficultyStars level={mode.difficulty} />
              <View style={[styles.cardAccent, { backgroundColor: mode.color }]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Coming Soon section */}
        {comingSoonModes.length > 0 && (
          <>
            <Text style={styles.comingSoonTitle}>{t('قريباً · Coming Soon', 'Coming Soon')}</Text>
            <View style={styles.comingSoonList}>
              {comingSoonModes.map((mode) => (
                <View key={mode.id} style={[styles.comingSoonCard, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
                  <Text style={styles.comingSoonEmoji}>{mode.emoji}</Text>
                  <View style={[styles.comingSoonInfo, { alignItems: isEnglish ? 'flex-start' : 'flex-end' }]}>
                    <Text style={styles.comingSoonName}>{t(mode.name, mode.nameEn)}</Text>
                    <Text style={styles.comingSoonDesc}>{t(mode.desc, mode.descEn)}</Text>
                  </View>
                  <View style={styles.lockedBadge}>
                    <Text style={styles.lockedText}>{t('🔒 قريباً', '🔒 Soon')}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  grid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: (W - 44) / 2,
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2D2D50',
    padding: 16,
    alignItems: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  cardEmoji: { fontSize: 40, marginBottom: 4 },
  cardName: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  cardDesc: { fontSize: 12, color: '#A78BFA', textAlign: 'center' },
  stars: { fontSize: 10 },
  cardAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },

  // Coming Soon
  comingSoonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 14,
  },
  comingSoonList: {
    gap: 10,
  },
  comingSoonCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    opacity: 0.55,
    borderWidth: 1,
    borderColor: '#2D2D50',
  },
  comingSoonEmoji: {
    fontSize: 28,
  },
  comingSoonInfo: {
    flex: 1,
  },
  comingSoonName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  comingSoonDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  lockedBadge: {
    backgroundColor: 'rgba(107,114,128,0.15)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  lockedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
});
