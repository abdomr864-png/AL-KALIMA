import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, Animated } from 'react-native';
import { adManager } from '../lib/AdManager';
import { useUserStore } from '../store/userStore';
import { supabase } from '../lib/supabase';
import { toArabicNumerals } from '../engine/ShareCard';
import { COLORS } from '../lib/constants';
import { useLanguage } from '../lib/LanguageContext';

interface Props {
  label?: string;
  onEarned?: () => void;
}

export function RewardedAdButton({ label, onEarned }: Props) {
  const { t, isEnglish } = useLanguage();
  const { updateCoins } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [showCoinAnim, setShowCoinAnim] = useState(false);
  const coinY = useRef(new Animated.Value(0)).current;
  const coinOp = useRef(new Animated.Value(0)).current;
  const coinScale = useRef(new Animated.Value(0.5)).current;

  // Check cooldown
  useEffect(() => {
    const interval = setInterval(() => {
      setCooldown(adManager.getCooldownRemaining());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  function animateCoins() {
    setShowCoinAnim(true);
    coinY.setValue(0);
    coinOp.setValue(1);
    coinScale.setValue(0.5);
    Animated.sequence([
      Animated.parallel([
        Animated.spring(coinScale, { toValue: 1.3, tension: 60, friction: 6, useNativeDriver: true }),
        Animated.timing(coinOp, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(coinY, { toValue: -80, duration: 1000, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(500),
          Animated.timing(coinOp, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
      ]),
    ]).start(() => setShowCoinAnim(false));
  }

  async function handlePress() {
    if (loading || cooldown > 0) return;
    setLoading(true);

    const earned = await adManager.showRewarded();
    setLoading(false);

    if (earned) {
      updateCoins(adManager.REWARD_AMOUNT);
      supabase.rpc('add_coins', { amount: adManager.REWARD_AMOUNT, reason: 'ad_reward' }).then(() => {});
      animateCoins();
      onEarned?.();
    }

    setCooldown(adManager.getCooldownRemaining());
  }

  const fmtCooldown = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (cooldown > 0) {
    return (
      <View style={[styles.btn, styles.cooldownBtn]}>
        <Text style={styles.cooldownText}>⏱ {fmtCooldown(cooldown)}</Text>
        <Text style={styles.cooldownSub}>{t('حتى الإعلان التالي', 'Until next ad')}</Text>
      </View>
    );
  }

  return (
    <View>
      <Pressable
        style={[styles.btn, loading && styles.loadingBtn]}
        onPress={handlePress}
        disabled={loading}
      >
        <Text style={styles.btnIcon}>{loading ? '⏳' : '📺'}</Text>
        <Text style={styles.btnText}>
          {loading
            ? t('جاري التحميل...', 'Loading...')
            : label || t(`شاهد إعلاناً واحصل على 🪙${toArabicNumerals(adManager.REWARD_AMOUNT)}`, `Watch an ad and earn 🪙${adManager.REWARD_AMOUNT}`)}
        </Text>
      </Pressable>

      {showCoinAnim && (
        <Animated.View style={[styles.coinAnim, { opacity: coinOp, transform: [{ translateY: coinY }, { scale: coinScale }] }]}>
          <Text style={styles.coinAnimText}>+{isEnglish ? adManager.REWARD_AMOUNT : toArabicNumerals(adManager.REWARD_AMOUNT)} 🪙</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1C4A1C',
    borderWidth: 1.5,
    borderColor: '#22C55E',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  loadingBtn: {
    backgroundColor: '#1A1A2E',
    borderColor: '#2D2D50',
  },
  cooldownBtn: {
    backgroundColor: '#1A1A2E',
    borderColor: '#374151',
    flexDirection: 'column',
    gap: 2,
  },
  btnIcon: { fontSize: 20 },
  btnText: { color: '#22C55E', fontSize: 15, fontWeight: '700' },
  cooldownText: { color: '#6B7280', fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  cooldownSub: { color: '#4B5563', fontSize: 12 },
  coinAnim: {
    position: 'absolute',
    alignSelf: 'center',
    top: -20,
    backgroundColor: '#1C4A1C',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: '#22C55E',
    zIndex: 999,
  },
  coinAnimText: { color: '#22C55E', fontSize: 24, fontWeight: '900' },
});
