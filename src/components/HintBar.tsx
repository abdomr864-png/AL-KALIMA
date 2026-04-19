import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, Animated, Modal } from 'react-native';
import { useUserStore } from '../store/userStore';
import { toArabicNumerals } from '../engine/ShareCard';
import { COLORS, GAME } from '../lib/constants';
import { type GameState, type LetterResult } from '../engine/WordEngine';
import { adManager } from '../lib/AdManager';
import { useLanguage } from '../lib/LanguageContext';

interface Props {
  game: GameState;
  onRevealLetter: (position: number, letter: string) => void;
  disabled?: boolean;
  hintsUsed: number;
  maxHints?: number;
}

export function HintBar({ game, onRevealLetter, disabled, hintsUsed, maxHints = 2 }: Props) {
  const { t, isEnglish } = useLanguage();
  const { user, updateCoins } = useUserStore();
  const coins = user?.coins || 0;
  const isPlus = user?.isPlus || false;
  const [showModal, setShowModal] = useState(false);
  const [adWatched, setAdWatched] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const canHint = game.gameStatus === 'playing' && !disabled && hintsUsed < maxHints;
  const hintsLeft = maxHints - hintsUsed;

  function findUnrevealedPosition(): { position: number; letter: string } | null {
    const targetLetters = [...game.targetWord];
    // Find positions not yet revealed by correct guesses
    const revealed = new Set<number>();
    game.results.forEach(row => {
      row.forEach((r, i) => {
        if (r === 'correct') revealed.add(i);
      });
    });

    // Also check current guess for correct positions (shouldn't reveal those)
    const unrevealed = targetLetters
      .map((letter, i) => ({ position: i, letter }))
      .filter(({ position }) => !revealed.has(position));

    if (unrevealed.length === 0) return null;
    return unrevealed[Math.floor(Math.random() * unrevealed.length)];
  }

  function useHintWithCoins() {
    if (!canHint) return;
    if (coins < GAME.HINT_COST) {
      setShowModal(true);
      return;
    }
    const target = findUnrevealedPosition();
    if (!target) return;
    updateCoins(-GAME.HINT_COST);
    onRevealLetter(target.position, target.letter);

    // Pulse animation
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.15, duration: 100, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  }

  async function useHintWithAd() {
    if (!canHint) return;
    setAdWatched(true);
    const earned = await adManager.showRewarded();
    if (earned) {
      const target = findUnrevealedPosition();
      if (target) {
        onRevealLetter(target.position, target.letter);
      }
    }
    setAdWatched(false);
    setShowModal(false);
  }

  if (game.gameStatus !== 'playing') return null;

  return (
    <>
      <Animated.View style={[styles.bar, { transform: [{ scale: pulseAnim }] }]}>
        {/* Coin hint */}
        <Pressable
          style={[styles.hintBtn, !canHint && styles.hintBtnDisabled]}
          onPress={useHintWithCoins}
          disabled={!canHint}
        >
          <Text style={styles.hintIcon}>💡</Text>
          <Text style={styles.hintLabel}>{isEnglish ? GAME.HINT_COST : toArabicNumerals(GAME.HINT_COST)} 🪙</Text>
        </Pressable>

        {/* Hints remaining */}
        <View style={styles.hintsLeft}>
          <Text style={styles.hintsLeftText}>{isEnglish ? `${hintsLeft}/${maxHints}` : `${toArabicNumerals(hintsLeft)}/${toArabicNumerals(maxHints)}`}</Text>
          <Text style={styles.hintsLeftLabel}>{t('تلميحات', 'hints')}</Text>
        </View>

        {/* Ad hint */}
        <Pressable
          style={[styles.hintBtn, styles.adBtn, !canHint && styles.hintBtnDisabled]}
          onPress={() => canHint && setShowModal(true)}
          disabled={!canHint}
        >
          <Text style={styles.hintIcon}>📺</Text>
          <Text style={styles.hintLabel}>{t('مجاني', 'Free')}</Text>
        </Pressable>
      </Animated.View>

      {/* Not enough coins / ad modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('💡 تلميح', '💡 Hint')}</Text>
            <Text style={styles.modalSub}>{t('اكشف حرفاً واحداً من الكلمة', 'Reveal one letter from the word')}</Text>

            {/* Coin option */}
            <Pressable
              style={[styles.modalBtn, coins < GAME.HINT_COST && styles.modalBtnDisabled]}
              onPress={() => { setShowModal(false); useHintWithCoins(); }}
              disabled={coins < GAME.HINT_COST}
            >
              <Text style={styles.modalBtnText}>
                {t(`💡 استخدم ${toArabicNumerals(GAME.HINT_COST)} عملة`, `💡 Use ${GAME.HINT_COST} coins`)}
              </Text>
              <Text style={styles.modalBtnSub}>
                {t(`رصيدك: ${toArabicNumerals(coins)} 🪙`, `Balance: ${coins} 🪙`)}
              </Text>
            </Pressable>

            {/* Ad option */}
            <Pressable
              style={[styles.modalBtn, styles.adModalBtn]}
              onPress={useHintWithAd}
              disabled={adWatched}
            >
              <Text style={styles.modalBtnText}>
                {adWatched ? t('جاري التحميل...', 'Loading...') : t('📺 شاهد إعلاناً — مجاني', '📺 Watch an ad — free')}
              </Text>
            </Pressable>

            {/* Plus upsell */}
            {!isPlus && (
              <View style={styles.plusUpsell}>
                <Text style={styles.plusText}>{t('كلمات بلس: تلميحات غير محدودة 💎', 'Kalimat Plus: unlimited hints 💎')}</Text>
              </View>
            )}

            <Pressable onPress={() => setShowModal(false)}>
              <Text style={styles.cancelText}>{t('إلغاء', 'Cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    height: 40,
    gap: 12,
  },
  hintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E1E3A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D2D50',
  },
  hintBtnDisabled: {
    opacity: 0.4,
  },
  adBtn: {
    borderColor: '#22C55E40',
    backgroundColor: '#22C55E10',
  },
  hintIcon: { fontSize: 16 },
  hintLabel: { fontSize: 13, fontWeight: '700', color: COLORS.TEXT_SECONDARY },
  hintsLeft: { alignItems: 'center' },
  hintsLeftText: { fontSize: 16, fontWeight: '800', color: COLORS.PURPLE_LIGHT },
  hintsLeftLabel: { fontSize: 10, color: COLORS.TEXT_SECONDARY },

  // Modal
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center', alignItems: 'center',
  },
  modal: {
    backgroundColor: '#1E1E3A', borderRadius: 24, padding: 24,
    width: '85%', alignItems: 'center', gap: 14,
    borderWidth: 1.5, borderColor: COLORS.PURPLE,
  },
  modalTitle: { fontSize: 28, fontWeight: '900', color: '#FFF' },
  modalSub: { fontSize: 15, color: COLORS.TEXT_SECONDARY },
  modalBtn: {
    width: '100%', backgroundColor: COLORS.PURPLE,
    height: 56, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  modalBtnDisabled: { opacity: 0.4 },
  adModalBtn: { backgroundColor: '#166534' },
  modalBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  modalBtnSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  plusUpsell: {
    backgroundColor: COLORS.PURPLE + '15', borderRadius: 12,
    padding: 12, width: '100%', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.PURPLE + '40',
  },
  plusText: { fontSize: 13, color: COLORS.PURPLE_LIGHT, fontWeight: '600' },
  cancelText: { color: COLORS.TEXT_SECONDARY, fontSize: 15, marginTop: 4 },
});
