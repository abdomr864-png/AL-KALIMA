import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated, Dimensions } from 'react-native';
import { COLORS } from '../lib/constants';
import { StreakManager, type MilestoneReward } from '../lib/StreakManager';
import { toArabicNumerals } from '../engine/ShareCard';
import { useLanguage } from '../lib/LanguageContext';

const { width: W } = Dimensions.get('window');

interface Props {
  visible: boolean;
  milestone: number;
  reward: MilestoneReward;
  onClaim: () => void;
}

function getMilestoneMessage(milestone: number, isEn: boolean): string {
  if (isEn) {
    if (milestone === 7)   return 'A full week without missing 🌟';
    if (milestone === 14)  return 'Two weeks — amazing ⚡';
    if (milestone === 30)  return 'A full month — legendary 💎';
    if (milestone === 50)  return 'Fifty days — iron will';
    if (milestone === 100) return 'One hundred days — unmatched 👑';
    if (milestone === 365) return 'A full year — you are the legend';
    return `${milestone} days in a row!`;
  }
  if (milestone === 7)   return 'أسبوع كامل بلا انقطاع 🌟';
  if (milestone === 14)  return 'أسبوعان — أنت مذهل ⚡';
  if (milestone === 30)  return 'شهر كامل — أنت أسطوري 💎';
  if (milestone === 50)  return 'خمسون يوم — إرادة حديدية';
  if (milestone === 100) return 'مئة يوم — لا أحد مثلك 👑';
  if (milestone === 365) return 'سنة كاملة — أنت الأسطورة';
  return `${milestone} يوم متواصل!`;
}

export function StreakMilestoneModal({ visible, milestone, reward, onClaim }: Props) {
  const { t, isEnglish } = useLanguage();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const num = isEnglish ? String(milestone) : toArabicNumerals(milestone);

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.emoji}>{StreakManager.getStreakEmoji(milestone)}</Text>
          <Text style={styles.title}>{num} {t('يوم!', 'days!')}</Text>
          <Text style={styles.subtitle}>{getMilestoneMessage(milestone, isEnglish)}</Text>

          <View style={styles.rewardBox}>
            <Text style={styles.rewardLabel}>{t('مكافأتك', 'Your reward')}</Text>
            {reward.tickets && (
              <Text style={styles.rewardLine}>
                {isEnglish ? reward.tickets.amount : toArabicNumerals(reward.tickets.amount)}{' '}
                {reward.tickets.type === 'golden'
                  ? t('تذاكر ذهبية 🏮', 'golden tickets 🏮')
                  : reward.tickets.type === 'silver'
                    ? t('تذاكر فضية 🎟️', 'silver tickets 🎟️')
                    : t('تذاكر برونزية 🎫', 'bronze tickets 🎫')}
              </Text>
            )}
            {reward.coins && (
              <Text style={styles.rewardLine}>
                🪙 {isEnglish ? reward.coins : toArabicNumerals(reward.coins)} {t('عملة', 'coins')}
              </Text>
            )}
            {reward.icon && (
              <Text style={styles.rewardLine}>{t('+ أيقونة حصرية فُتحت في ملفك ✨', '+ Exclusive icon unlocked ✨')}</Text>
            )}
          </View>

          <TouchableOpacity style={styles.claimBtn} activeOpacity={0.85} onPress={onClaim}>
            <Text style={styles.claimText}>{t('استلم المكافأة 🎁', 'Claim reward 🎁')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: W - 48,
    backgroundColor: COLORS.CARD_BG,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.GOLD + '60',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.GOLD,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 20,
  },
  rewardBox: {
    width: '100%',
    backgroundColor: COLORS.GOLD + '12',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.GOLD + '30',
  },
  rewardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 4,
  },
  rewardLine: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.GOLD,
  },
  claimBtn: {
    width: '100%',
    height: 54,
    backgroundColor: COLORS.GREEN,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
  },
});
