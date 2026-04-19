import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/LanguageContext';
import { ChallengeSystem, CHALLENGE_MODES, type FriendChallenge } from '../lib/ChallengeSystem';

export function ChallengeInboxModal() {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const [challenges, setChallenges] = useState<FriendChallenge[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const pending = await ChallengeSystem.getPendingChallenges(user.id);
      if (!mounted || pending.length === 0) return;

      setChallenges(pending);
      setVisible(true);
    }
    load();
    return () => { mounted = false; };
  }, []);

  const [accepting, setAccepting] = useState<string | null>(null);

  async function handleAccept(challenge: FriendChallenge) {
    if (accepting) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setAccepting(challenge.id);
    const result = await ChallengeSystem.acceptChallenge(challenge.id, user.id);
    setAccepting(null);

    if (!result.success) {
      const msg = isArabic
        ? (result.error_ar || 'تعذر قبول التحدي، حاول مجدداً')
        : (result.error_en || 'Could not accept the challenge, try again');
      Alert.alert(isArabic ? 'تعذّر القبول' : "Couldn't accept", msg);
      if (/expired|not_pending|not available/i.test(msg)) {
        setChallenges(prev => {
          const next = prev.filter(c => c.id !== challenge.id);
          if (next.length === 0) setVisible(false);
          return next;
        });
      }
      return;
    }

    setChallenges(prev => {
      const next = prev.filter(c => c.id !== challenge.id);
      if (next.length === 0) setVisible(false);
      return next;
    });

    // New flow: route to the match lobby. Falls back to the old direct-to-game
    // route if the RPC isn't deployed yet (result.matchId will be undefined).
    if (result.matchId) {
      router.push(`/match/${result.matchId}/lobby` as any);
    } else {
      if (challenge.mode === 'duel') router.push(`/duel?challengeId=${challenge.id}` as any);
      else if (challenge.mode === 'daily') router.push(`/daily?challengeId=${challenge.id}` as any);
      else if (challenge.mode === 'classic') router.push(`/classic?challengeId=${challenge.id}` as any);
    }
  }

  async function handleDecline(challenge: FriendChallenge) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await ChallengeSystem.declineChallenge(challenge.id, user.id);
    setChallenges(prev => {
      const next = prev.filter(c => c.id !== challenge.id);
      if (next.length === 0) setVisible(false);
      return next;
    });
  }

  if (!visible || challenges.length === 0) return null;

  return (
    <Modal transparent animationType="fade" onRequestClose={() => setVisible(false)}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.header}>
            <Text style={{ fontSize: 36 }}>⚔️</Text>
            <Text style={s.title}>
              {isArabic
                ? `لديك ${challenges.length} تحدٍّ بانتظارك`
                : `${challenges.length} challenge${challenges.length > 1 ? 's' : ''} waiting`}
            </Text>
          </View>

          <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 10 }}>
            {challenges.map(c => {
              const mode = CHALLENGE_MODES.find(m => m.id === c.mode);
              const modeLabel = mode ? (isArabic ? mode.name_ar : mode.name_en) : c.mode;
              const currency = (c as any).wager_currency === 'gems' ? 'gems' : 'coins';
              const symbol = currency === 'gems' ? '💎' : '🪙';

              return (
                <View key={c.id} style={s.card}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{
                      width: 42, height: 42, borderRadius: 21,
                      backgroundColor: c.challenger?.avatar_color || '#7C3AED',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '900' }}>
                        {(c.challenger?.username || '?')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardTitle} numberOfLines={1}>
                        {isArabic
                          ? `${c.challenger?.username} يتحداك`
                          : `${c.challenger?.username} challenges you`}
                      </Text>
                      <Text style={s.cardSub}>
                        {mode?.emoji || '🎮'} {modeLabel}
                        {c.wager_amount > 0 && `  ·  ${c.wager_amount}${symbol}`}
                      </Text>
                    </View>
                  </View>

                  {c.wager_amount > 0 && (
                    <View style={s.wagerBanner}>
                      <Text style={s.wagerTxt}>
                        {isArabic
                          ? `الفائز يأخذ ${c.wager_amount * 2}${symbol} 🏆`
                          : `Winner takes ${c.wager_amount * 2}${symbol} 🏆`}
                      </Text>
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity style={s.declineBtn} onPress={() => handleDecline(c)}>
                      <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '800' }}>
                        {isArabic ? 'رفض' : 'Decline'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.acceptBtn, accepting === c.id && { opacity: 0.6 }]}
                      onPress={() => handleAccept(c)}
                      disabled={accepting !== null}
                    >
                      <Text style={{ fontSize: 14 }}>⚔️</Text>
                      <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '800' }}>
                        {accepting === c.id
                          ? (isArabic ? 'جاري...' : 'Accepting...')
                          : (isArabic ? 'قبول' : 'Accept')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity onPress={() => setVisible(false)} style={s.closeBtn}>
            <Text style={s.closeTxt}>{isArabic ? 'لاحقاً' : 'Later'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  sheet: {
    width: '100%', maxWidth: 420,
    backgroundColor: '#0D0730', borderRadius: 24, padding: 20,
    borderWidth: 1, borderColor: '#EF444460',
  },
  header: { alignItems: 'center', gap: 4, marginBottom: 16 },
  title: { color: '#FFF', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  card: {
    backgroundColor: '#13102B', borderRadius: 16, padding: 12, gap: 10,
    borderWidth: 1, borderColor: '#2D2D50',
  },
  cardTitle: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  cardSub: { color: '#9CA3AF', fontSize: 12 },
  wagerBanner: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderRadius: 10, padding: 8, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
  },
  wagerTxt: { color: '#FCD34D', fontSize: 12, fontWeight: '700' },
  acceptBtn: {
    flex: 2, height: 40, borderRadius: 12,
    backgroundColor: '#7C3AED',
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 6,
  },
  declineBtn: {
    flex: 1, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.1)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
  },
  closeBtn: {
    marginTop: 14, height: 42,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, backgroundColor: '#1A1A2E',
    borderWidth: 1, borderColor: '#2D2D50',
  },
  closeTxt: { color: '#9CA3AF', fontSize: 14, fontWeight: '700' },
});
