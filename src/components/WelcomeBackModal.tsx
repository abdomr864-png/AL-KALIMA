import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated, Dimensions } from 'react-native';
import { COLORS } from '../lib/constants';
import { toArabicNumerals } from '../engine/ShareCard';
import { useLanguage } from '../lib/LanguageContext';

const { width: W } = Dimensions.get('window');

interface Props {
  visible: boolean;
  coins: number;
  daysMissed: number;
  onClose: () => void;
}

export function WelcomeBackModal({ visible, coins, daysMissed, onClose }: Props) {
  const { t, isEnglish } = useLanguage();
  const slideAnim = useRef(new Animated.Value(300)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(300);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 8, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <Animated.View style={[styles.card, { transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.emoji}>{daysMissed >= 7 ? '🎊' : '👋'}</Text>
          <Text style={styles.title}>
            {daysMissed >= 7
              ? t('مرحباً بعودتك!', 'Welcome back!')
              : t('افتقدناك!', 'We missed you!')}
          </Text>
          <Text style={styles.subtitle}>
            {daysMissed >= 7
              ? t(
                  `غبت ${toArabicNumerals(daysMissed)} أيام — نحن سعداء بعودتك`,
                  `You were away for ${daysMissed} days — glad to have you back`
                )
              : t(
                  `لم تلعب منذ ${toArabicNumerals(daysMissed)} أيام`,
                  `You haven't played in ${daysMissed} days`
                )}
          </Text>

          <View style={styles.giftBox}>
            <Text style={styles.giftEmoji}>🎁</Text>
            <Text style={styles.giftCoins}>+{isEnglish ? coins : toArabicNumerals(coins)} 🪙</Text>
            <Text style={styles.giftLabel}>{t('هدية عودتك — تمت إضافتها لرصيدك', 'Welcome back gift — added to your balance')}</Text>
          </View>

          <TouchableOpacity style={styles.playBtn} activeOpacity={0.85} onPress={onClose}>
            <Text style={styles.playText}>{t('العب الآن 🎯', 'Play now 🎯')}</Text>
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
    borderWidth: 1.5,
    borderColor: COLORS.PURPLE + '50',
  },
  emoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 20,
  },
  giftBox: {
    width: '100%',
    backgroundColor: COLORS.PURPLE + '15',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.PURPLE + '30',
  },
  giftEmoji: {
    fontSize: 40,
    marginBottom: 4,
  },
  giftCoins: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.GOLD,
  },
  giftLabel: {
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  playBtn: {
    width: '100%',
    height: 54,
    backgroundColor: COLORS.PURPLE,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
  },
});
