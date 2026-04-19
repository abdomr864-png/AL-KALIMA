import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, TouchableOpacity, StyleSheet, Dimensions, TouchableWithoutFeedback } from 'react-native';
import type { StreakData, DayRecord } from '../lib/StreakManager';
import { useLanguage } from '../lib/LanguageContext';

const { height: SH } = Dimensions.get('window');

export function StreakHistoryModal({ streakData, onClose }: {
  streakData: StreakData;
  onClose: () => void;
}) {
  const { t, isEnglish } = useLanguage();
  const slideAnim = useRef(new Animated.Value(600)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 9, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  function close() {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 600, duration: 250, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  }

  // Group history into rows of 7
  const last30 = streakData.history.slice(-30).reverse();
  const weeks: DayRecord[][] = [];
  for (let i = 0; i < last30.length; i += 7) {
    weeks.push(last30.slice(i, i + 7));
  }

  const dayNames = isEnglish ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Overlay */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)', opacity: overlayOpacity }]}>
        <TouchableWithoutFeedback onPress={close}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
      </Animated.View>

      {/* Bottom sheet */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>

        {/* Handle */}
        <View style={styles.handle} />

        {/* Header stats */}
        <View style={styles.headerStats}>
          <View style={styles.headerRow}>
            {/* Current streak */}
            <View style={styles.currentStreakBlock}>
              <Text style={styles.bigEmoji}>
                {streakData.isFrozen ? '🧊' : '🔥'}
              </Text>
              <Text style={styles.bigNumber}>
                {streakData.current}
              </Text>
              <Text style={styles.bigLabel}>
                {streakData.isFrozen ? t('سلسلة مجمّدة', 'Frozen streak') : t('السلسلة الحالية', 'Current streak')}
              </Text>
              {streakData.isFrozen && (
                <View style={styles.frozenHint}>
                  <Text style={styles.frozenHintText}>
                    {t('❄️ العب اليوم لإذابة الجليد', '❄️ Play today to thaw the ice')}
                  </Text>
                </View>
              )}
            </View>

            {/* Best streak + freezes */}
            <View style={styles.sideStats}>
              <View style={styles.sideStat}>
                <Text style={{ fontSize: 18 }}>🏆</Text>
                <Text style={styles.sideStatNum}>{streakData.best}</Text>
                <Text style={styles.sideStatLabel}>{t('أفضل سلسلة', 'Best streak')}</Text>
              </View>
              <View style={styles.sideStat}>
                <Text style={{ fontSize: 18 }}>🛡️</Text>
                <Text style={styles.sideStatNum}>{streakData.freezesAvailable}</Text>
                <Text style={styles.sideStatLabel}>{t('تجميد متاح', 'Freezes available')}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Calendar title + legend */}
        <View style={styles.calTitle}>
          <Text style={styles.calTitleText}>{t('آخر 30 يوم', 'Last 30 days')}</Text>
          <View style={[styles.legend, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
            {[
              { color: '#F59E0B', label: t('لعبت', 'Played') },
              { color: '#60A5FA', label: t('مجمّد', 'Frozen') },
              { color: '#374151', label: t('فاتك', 'Missed') },
            ].map((l, i) => (
              <View key={i} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                <Text style={styles.legendText}>{l.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Day name headers */}
        <View style={styles.dayNamesRow}>
          {dayNames.map((d, i) => (
            <Text key={i} style={styles.dayNameText}>{d}</Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.calGrid}>
          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {Array.from({ length: 7 }, (_, di) => {
                const day = week[di];
                if (!day) return <View key={di} style={styles.dayCell} />;

                const isToday = day.status === 'today';
                const isPlayed = day.status === 'played';
                const isFrozen = day.status === 'frozen';
                const isMissed = day.status === 'missed';

                const bgColor = isPlayed ? '#92400E'
                  : isFrozen ? '#1E3A5F'
                  : isMissed ? '#1F2937'
                  : isToday ? '#2D1B69'
                  : '#111827';

                const borderColor = isPlayed ? '#F59E0B'
                  : isFrozen ? '#3B82F6'
                  : isMissed ? '#374151'
                  : isToday ? '#7C3AED'
                  : 'transparent';

                const icon = isPlayed ? '🔥'
                  : isFrozen ? '🧊'
                  : isMissed ? '✗'
                  : isToday ? '○'
                  : '';

                const dateNum = parseInt(day.date.split('-')[2]);

                return (
                  <View key={di} style={[styles.dayCell, { backgroundColor: bgColor, borderColor, borderWidth: 1.5 }]}>
                    <View style={styles.dayCellInner}>
                      <Text style={styles.dayCellIcon}>{icon}</Text>
                      {isPlayed && day.attempts != null && (
                        <Text style={styles.dayCellAttempts}>{day.attempts}</Text>
                      )}
                    </View>
                    <Text style={styles.dayCellDate}>{dateNum}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* Attempts legend */}
        <View style={styles.footnote}>
          <Text style={styles.footnoteText}>
            {t('الرقم الصغير داخل الخانة = عدد المحاولات لذلك اليوم', 'The small number inside the cell = number of attempts for that day')}
          </Text>
        </View>

        {/* How to get freezes */}
        {streakData.freezesAvailable === 0 && (
          <View style={styles.freezeHint}>
            <Text style={styles.freezeHintText}>
              {t('🛡️ احصل على تجميدات من المكافآت اليومية والإنجازات', '🛡️ Earn freezes from daily rewards and achievements')}
            </Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#111827',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: SH * 0.85,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#374151',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  headerStats: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  currentStreakBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  bigEmoji: { fontSize: 36 },
  bigNumber: { fontSize: 42, fontWeight: '900', color: '#FFF' },
  bigLabel: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  frozenHint: {
    backgroundColor: '#1E3A5F',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  frozenHintText: { color: '#60A5FA', fontSize: 11, fontWeight: '700' },
  sideStats: {
    gap: 12,
    alignItems: 'center',
  },
  sideStat: {
    alignItems: 'center',
    gap: 2,
  },
  sideStatNum: { fontSize: 22, fontWeight: '900', color: '#FFF' },
  sideStatLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  calTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calTitleText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  legend: {
    flexDirection: 'row',
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: { fontSize: 10, color: '#9CA3AF' },
  dayNamesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  dayNameText: {
    width: 40,
    textAlign: 'center',
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  calGrid: {
    gap: 6,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dayCell: {
    width: 40,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellIcon: { fontSize: 14 },
  dayCellAttempts: {
    fontSize: 8,
    color: '#FCD34D',
    fontWeight: '700',
    position: 'absolute',
    bottom: -6,
  },
  dayCellDate: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 1,
  },
  footnote: {
    marginTop: 12,
    alignItems: 'center',
  },
  footnoteText: {
    fontSize: 11,
    color: '#4B5563',
    fontStyle: 'italic',
  },
  freezeHint: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  freezeHintText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
});
