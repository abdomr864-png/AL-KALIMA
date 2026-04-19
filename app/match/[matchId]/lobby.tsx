import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../src/lib/supabase';
import { ChallengeSystem, type Match } from '../../../src/lib/ChallengeSystem';
import { useLanguage } from '../../../src/lib/LanguageContext';
import { COLORS } from '../../../src/lib/constants';

const POLL_MS = 1000;
const READY_TIMEOUT_MS = 30_000;
const START_COUNTDOWN_S = 3;

type PlayerLite = {
  id: string;
  username: string;
  avatar_color: string;
};

export default function MatchLobbyScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { language } = useLanguage();
  const isArabic = language === 'ar';

  const [match, setMatch] = useState<Match | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [player1, setPlayer1] = useState<PlayerLite | null>(null);
  const [player2, setPlayer2] = useState<PlayerLite | null>(null);
  const [readying, setReadying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const navigatedRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!matchId) return;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      setMe(user?.id || null);

      const m = await ChallengeSystem.getMatch(matchId);
      if (!m) {
        Alert.alert(
          isArabic ? 'غير موجود' : 'Not found',
          isArabic ? 'المباراة غير متاحة' : 'Match not available',
          [{ text: 'OK', onPress: () => router.back() }],
        );
        return;
      }
      setMatch(m);
      await loadPlayers(m.player1_id, m.player2_id);
      if (m.status === 'active' && m.started_at) startCountdown(m);
    }
    init();

    // Realtime — fires instantly when either player readies or match flips
    // to active. Requires matches to be in the supabase_realtime publication
    // (the v2 migration adds it). Poll below is the backstop.
    const channel = supabase
      .channel(`match_${matchId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
        (payload) => {
          const m = payload.new as any as Match;
          setMatch(m);
          if (m.status === 'active' && m.started_at) startCountdown(m);
          else if (m.status === 'cancelled') handleCancelled();
        },
      )
      .subscribe();

    pollRef.current = setInterval(refresh, POLL_MS);
    tickRef.current = setInterval(() => setElapsed(e => e + 1), 1000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  function startCountdown(m: Match) {
    if (countdownRef.current || navigatedRef.current) return;
    // Use server started_at so both clients count down from the same t0,
    // regardless of who called markReady first or clock skew in RN.
    const started = new Date(m.started_at!).getTime();
    const target = started + START_COUNTDOWN_S * 1000;
    const tick = () => {
      const remaining = Math.ceil((target - Date.now()) / 1000);
      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = null;
        if (!navigatedRef.current) {
          navigatedRef.current = true;
          routeToGame(m);
        }
      } else {
        setCountdown(remaining);
      }
    };
    tick();
    countdownRef.current = setInterval(tick, 200);
  }

  function handleCancelled() {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    Alert.alert(
      isArabic ? 'ألغيت المباراة' : 'Match cancelled',
      isArabic ? 'تم إلغاء المباراة' : 'The match was cancelled',
      [{ text: 'OK', onPress: () => router.back() }],
    );
  }

  async function loadPlayers(p1: string, p2: string) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_color')
      .in('id', [p1, p2]);
    const byId = new Map((data || []).map((p: any) => [p.id, p]));
    setPlayer1((byId.get(p1) as PlayerLite) || { id: p1, username: '???', avatar_color: '#7C3AED' });
    setPlayer2((byId.get(p2) as PlayerLite) || { id: p2, username: '???', avatar_color: '#7C3AED' });
  }

  async function refresh() {
    if (!matchId || navigatedRef.current) return;
    const m = await ChallengeSystem.getMatch(matchId);
    if (!m) return;
    setMatch(m);
    if (m.status === 'active' && m.started_at) startCountdown(m);
    else if (m.status === 'cancelled') handleCancelled();
  }

  function routeToGame(m: Match) {
    const qs = m.challenge_id ? `?challengeId=${m.challenge_id}` : '';
    if (m.mode === 'duel') router.replace(`/duel${qs}` as any);
    else if (m.mode === 'daily') router.replace(`/daily${qs}` as any);
    else router.replace(`/classic${qs}` as any);
  }

  async function onReady() {
    if (!matchId || readying) return;
    setReadying(true);
    const m = await ChallengeSystem.markReady(matchId);
    setReadying(false);
    if (m) {
      setMatch(m);
      if (m.status === 'active' && m.started_at) startCountdown(m);
    }
  }

  async function onCancel() {
    if (!match) return;
    // Mark the match cancelled so the other side's poll picks it up.
    await supabase.from('matches').update({ status: 'cancelled', ended_at: new Date().toISOString() }).eq('id', match.id);
    // Refund both sides' wagers (best-effort)
    if (match.wager_amount > 0 && match.challenge_id) {
      if (match.wager_currency === 'gems') {
        for (const pid of [match.player1_id, match.player2_id]) {
          const { data } = await supabase.from('profiles').select('gems').eq('id', pid).single();
          await supabase.from('profiles')
            .update({ gems: (data?.gems || 0) + match.wager_amount })
            .eq('id', pid);
        }
      } else {
        try { await supabase.rpc('refund_escrow', { p_challenge_id: match.challenge_id }); } catch {}
      }
    }
    router.back();
  }

  if (!match || !player1 || !player2 || !me) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator size="large" color={COLORS.PURPLE} />
      </SafeAreaView>
    );
  }

  const amP1 = me === match.player1_id;
  const myReady = amP1 ? match.player1_ready : match.player2_ready;
  const oppReady = amP1 ? match.player2_ready : match.player1_ready;
  const bothReady = match.player1_ready && match.player2_ready;
  const oppTimedOut = elapsed * 1000 > READY_TIMEOUT_MS && !oppReady;
  const sym = match.wager_currency === 'gems' ? '💎' : '🪙';

  return (
    <SafeAreaView style={s.container}>
      <Text style={s.title}>{isArabic ? '⚔️ المباراة' : '⚔️ Match Lobby'}</Text>
      {match.wager_amount > 0 && (
        <Text style={s.wagerLine}>
          {isArabic
            ? `الفائز يأخذ ${match.wager_amount * 2}${sym}`
            : `Winner takes ${match.wager_amount * 2}${sym}`}
        </Text>
      )}

      <View style={s.playersRow}>
        <PlayerSlot
          player={player1}
          ready={match.player1_ready}
          isMe={me === player1.id}
          isArabic={isArabic}
        />
        <Text style={s.vs}>VS</Text>
        <PlayerSlot
          player={player2}
          ready={match.player2_ready}
          isMe={me === player2.id}
          isArabic={isArabic}
        />
      </View>

      <View style={s.statusBox}>
        {countdown !== null ? (
          <Text style={s.countdownNum}>{countdown}</Text>
        ) : bothReady ? (
          <Text style={[s.statusText, { color: '#22C55E' }]}>
            {isArabic ? '✓ جاهزان — بدء اللعبة...' : '✓ Both ready — starting...'}
          </Text>
        ) : myReady ? (
          <Text style={[s.statusText, { color: '#A78BFA' }]}>
            {isArabic ? '⌛ بانتظار الخصم...' : '⌛ Waiting for opponent...'}
          </Text>
        ) : (
          <Text style={[s.statusText, { color: '#FDE68A' }]}>
            {isArabic ? 'اضغط جاهز لبدء اللعبة' : 'Tap Ready to start'}
          </Text>
        )}
      </View>

      {!myReady && (
        <Pressable style={s.readyBtn} onPress={onReady} disabled={readying}>
          {readying
            ? <ActivityIndicator color="#FFF" />
            : <Text style={s.readyTxt}>{isArabic ? '✓ جاهز' : "I'm Ready"}</Text>}
        </Pressable>
      )}

      {oppTimedOut && !bothReady && (
        <Pressable style={s.cancelBtn} onPress={onCancel}>
          <Text style={s.cancelTxt}>
            {isArabic ? 'الخصم لم يستجب — إلغاء' : 'Opponent did not respond — Cancel'}
          </Text>
        </Pressable>
      )}

      {!oppTimedOut && (
        <Pressable style={s.secondaryBtn} onPress={() => router.back()}>
          <Text style={s.secondaryTxt}>{isArabic ? 'خروج' : 'Leave'}</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

function PlayerSlot({ player, ready, isMe, isArabic }: { player: PlayerLite; ready: boolean; isMe: boolean; isArabic: boolean }) {
  return (
    <View style={s.slot}>
      <View style={[s.avatar, { backgroundColor: player.avatar_color }]}>
        <Text style={s.avatarLetter}>
          {(player.username || '?')[0].toUpperCase()}
        </Text>
      </View>
      <Text style={s.slotName} numberOfLines={1}>
        {player.username}{isMe ? (isArabic ? ' (أنت)' : ' (You)') : ''}
      </Text>
      <View style={[s.readyPill, ready && s.readyPillOn]}>
        <Text style={[s.readyPillTxt, ready && { color: '#FFF' }]}>
          {ready ? (isArabic ? '✓ جاهز' : '✓ Ready') : (isArabic ? '⌛' : '⌛')}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.PRIMARY_BG, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 },
  title: { color: '#FFF', fontSize: 28, fontWeight: '900' },
  wagerLine: { color: '#FCD34D', fontSize: 16, fontWeight: '800' },
  playersRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginVertical: 18 },
  vs: { color: '#7C3AED', fontSize: 24, fontWeight: '900' },
  slot: { alignItems: 'center', gap: 8, width: 110 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarLetter: { color: '#FFF', fontSize: 28, fontWeight: '900' },
  slotName: { color: '#FFF', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  readyPill: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
    backgroundColor: '#1A1A2E', borderWidth: 1, borderColor: '#2D2D50',
  },
  readyPillOn: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  readyPillTxt: { color: '#9CA3AF', fontSize: 11, fontWeight: '800' },
  statusBox: { marginTop: 10, minHeight: 60, alignItems: 'center', justifyContent: 'center' },
  statusText: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  countdownNum: { fontSize: 72, fontWeight: '900', color: '#22C55E' },
  readyBtn: {
    width: '100%', height: 52, borderRadius: 14,
    backgroundColor: COLORS.PURPLE,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 8,
  },
  readyTxt: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  cancelBtn: {
    width: '100%', height: 48, borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1, borderColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center',
  },
  cancelTxt: { color: '#EF4444', fontSize: 14, fontWeight: '800' },
  secondaryBtn: {
    width: '100%', height: 44, borderRadius: 12,
    backgroundColor: '#1A1A2E', borderWidth: 1, borderColor: '#2D2D50',
    alignItems: 'center', justifyContent: 'center',
  },
  secondaryTxt: { color: '#9CA3AF', fontSize: 14, fontWeight: '700' },
});
