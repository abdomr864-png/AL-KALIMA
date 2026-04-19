import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { toArabicNumerals } from '../src/engine/ShareCard';
import { useCoins } from '../src/hooks/useCoins';
import { useUserStore } from '../src/store/userStore';
import { useCosmeticStore } from '../src/store/cosmeticStore';
import { useLanguage } from '../src/lib/LanguageContext';

const HEADER_H = 56;

// Tournament schedule (weekly)
function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
}

function getDayOfWeek(): number {
  return new Date().getDay(); // 0=Sun, 1=Mon, ...
}

const SCHEDULE = [
  { day: 1, label: 'الاثنين', labelEn: 'Monday', desc: 'التسجيل مفتوح', descEn: 'Registration open' },
  { day: 2, label: 'الثلاثاء', labelEn: 'Tuesday', desc: 'القرعة', descEn: 'Draw' },
  { day: 3, label: 'الأربعاء', labelEn: 'Wednesday', desc: 'الدور الأول', descEn: 'Round 1' },
  { day: 4, label: 'الخميس', labelEn: 'Thursday', desc: 'الدور الثاني', descEn: 'Round 2' },
  { day: 5, label: 'الجمعة', labelEn: 'Friday', desc: 'نصف النهائي', descEn: 'Semi-finals' },
  { day: 6, label: 'السبت', labelEn: 'Saturday', desc: 'النهائي', descEn: 'Finals' },
  { day: 0, label: 'الأحد', labelEn: 'Sunday', desc: 'راحة — توزيع الجوائز', descEn: 'Rest — Prize distribution' },
];

const PRIZES = [
  { place: '🥇 الأول', placeEn: '🥇 1st', coins: 500, badge: 'ذهبي', badgeEn: 'Gold' },
  { place: '🥈 الثاني', placeEn: '🥈 2nd', coins: 300, badge: 'فضي', badgeEn: 'Silver' },
  { place: '🥉 الثالث-الرابع', placeEn: '🥉 3rd-4th', coins: 150, badge: 'برونزي', badgeEn: 'Bronze' },
  { place: 'أفضل 16', placeEn: 'Top 16', coins: 50, badge: '', badgeEn: '' },
];

export default function TournamentScreen() {
  const { theme: cosTheme } = useCosmeticStore();
  const { balance, spendCoins } = useCoins();
  const { user } = useUserStore();
  const { t, isEnglish } = useLanguage();
  const [registered, setRegistered] = useState(false);
  const weekNumber = getWeekNumber();
  const today = getDayOfWeek();

  const isRegistrationOpen = today === 1; // Monday
  const currentRound = today >= 3 && today <= 6
    ? (isEnglish ? SCHEDULE.find(s => s.day === today)?.descEn : SCHEDULE.find(s => s.day === today)?.desc) || ''
    : '';

  async function handleRegister() {
    const isPlus = user?.isPlus;
    if (!isPlus) {
      const success = await spendCoins(50);
      if (!success) {
        return; // not enough coins
      }
    }
    setRegistered(true);
  }

  return (
    <View style={[styles.container, { backgroundColor: cosTheme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
          <Text style={styles.backArrow}>{isEnglish ? '‹' : '›'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('المسابقة الكبرى', 'Grand Tournament')}</Text>
        <Text style={styles.headerEmoji}>🏆</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Week info */}
        <View style={styles.weekCard}>
          <Text style={styles.weekLabel}>{t(`الأسبوع ${toArabicNumerals(weekNumber)}`, `Week ${weekNumber}`)}</Text>
          {currentRound ? (
            <Text style={styles.weekRound}>{currentRound}</Text>
          ) : (
            <Text style={styles.weekRound}>
              {today === 0 ? t('يوم الراحة', 'Rest Day') : today === 1 ? t('التسجيل مفتوح!', 'Registration Open!') : t('القرعة غداً', 'Draw Tomorrow')}
            </Text>
          )}
        </View>

        {/* Bracket placeholder */}
        <View style={styles.bracketCard}>
          <Text style={[styles.bracketTitle, { textAlign: isEnglish ? 'left' : 'right' }]}>{t('الشجرة', 'Bracket')}</Text>
          <View style={styles.bracketPlaceholder}>
            <Text style={styles.bracketLine}>{isEnglish ? '  Player 1  ──┐' : '  لاعب 1  ──┐'}</Text>
            <Text style={styles.bracketLine}>{isEnglish ? '              ├── ?' : '            ├── ؟'}</Text>
            <Text style={styles.bracketLine}>{isEnglish ? '  Player 2  ──┘' : '  لاعب 2  ──┘'}</Text>
            <Text style={styles.bracketEmpty} />
            <Text style={styles.bracketLine}>{isEnglish ? '  Player 3  ──┐' : '  لاعب 3  ──┐'}</Text>
            <Text style={styles.bracketLine}>{isEnglish ? '              ├── ?' : '            ├── ؟'}</Text>
            <Text style={styles.bracketLine}>{isEnglish ? '  Player 4  ──┘' : '  لاعب 4  ──┘'}</Text>
          </View>
          <Text style={styles.bracketNote}>{t('64 لاعب — 6 جولات', '64 players — 6 rounds')}</Text>
        </View>

        {/* Schedule */}
        <Text style={styles.sectionTitle}>{t('الجدول الأسبوعي', 'Weekly Schedule')}</Text>
        <View style={styles.scheduleCard}>
          {SCHEDULE.map((item) => (
            <View key={item.day} style={[styles.scheduleRow, today === item.day && styles.scheduleRowActive, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
              <Text style={[styles.scheduleDay, today === item.day && { color: '#7C3AED' }]}>{isEnglish ? item.labelEn : item.label}</Text>
              <Text style={[styles.scheduleDesc, today === item.day && { color: '#FFF', fontWeight: '800' }]}>{isEnglish ? item.descEn : item.desc}</Text>
              {today === item.day && <View style={styles.activeDot} />}
            </View>
          ))}
        </View>

        {/* Prizes */}
        <Text style={styles.sectionTitle}>{t('الجوائز', 'Prizes')}</Text>
        <View style={styles.prizesCard}>
          {PRIZES.map((prize, i) => (
            <View key={i} style={[styles.prizeRow, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
              <Text style={styles.prizePlace}>{isEnglish ? prize.placeEn : prize.place}</Text>
              <Text style={styles.prizeCoins}>🪙 {toArabicNumerals(prize.coins)}</Text>
            </View>
          ))}
        </View>

        {/* Register button */}
        {!registered ? (
          <TouchableOpacity
            style={[styles.primaryBtn, !isRegistrationOpen && styles.disabledBtn]}
            activeOpacity={isRegistrationOpen ? 0.85 : 1}
            onPress={isRegistrationOpen ? handleRegister : undefined}
          >
            <Text style={styles.primaryBtnText}>
              {isRegistrationOpen
                ? (user?.isPlus ? t('سجل في البطولة (مجاني)', 'Register (Free)') : t('سجل في البطولة (🪙50)', 'Register (🪙50)'))
                : t('التسجيل يفتح الاثنين', 'Registration opens Monday')}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.registeredCard}>
            <Text style={styles.registeredText}>{t('✓ مسجل في البطولة', '✓ Registered')}</Text>
            <Text style={styles.registeredSub}>{t('ستبدأ المباريات الأربعاء', 'Matches start Wednesday')}</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0730', paddingTop: 44 },
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

  // Week card
  weekCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#EAB308' + '40',
    padding: 20,
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  weekLabel: { fontSize: 16, fontWeight: '700', color: '#EAB308' },
  weekRound: { fontSize: 22, fontWeight: '900', color: '#FFF' },

  // Bracket
  bracketCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2D2D50',
    padding: 20,
    marginBottom: 16,
  },
  bracketTitle: { fontSize: 16, fontWeight: '800', color: '#FFF', textAlign: 'right', marginBottom: 12 },
  bracketPlaceholder: { gap: 2, alignItems: 'center' },
  bracketLine: { fontSize: 14, fontFamily: 'monospace', color: '#A78BFA', lineHeight: 22 },
  bracketEmpty: { height: 8 },
  bracketNote: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 12 },

  // Section title
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#FFF', textAlign: 'right', marginBottom: 12, marginTop: 8 },

  // Schedule
  scheduleCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2D2D50',
    overflow: 'hidden',
    marginBottom: 16,
  },
  scheduleRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D50',
  },
  scheduleRowActive: { backgroundColor: '#7C3AED' + '18' },
  scheduleDay: { fontSize: 15, fontWeight: '700', color: '#A78BFA', width: 70 },
  scheduleDesc: { fontSize: 15, color: '#6B7280', fontWeight: '600', flex: 1, textAlign: 'left' },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },

  // Prizes
  prizesCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2D2D50',
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  prizeRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prizePlace: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  prizeCoins: { fontSize: 16, fontWeight: '800', color: '#F59E0B' },

  // Register
  primaryBtn: {
    backgroundColor: '#7C3AED',
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  disabledBtn: { opacity: 0.5 },
  registeredCard: {
    backgroundColor: '#22C55E' + '18',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#22C55E' + '40',
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  registeredText: { fontSize: 18, fontWeight: '800', color: '#22C55E' },
  registeredSub: { fontSize: 14, color: '#A78BFA' },
});
