import { useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useUserStore } from '../store/userStore';
import { useLanguage } from '../lib/LanguageContext';
import { ChallengeSystem } from '../lib/ChallengeSystem';

// Mounted at the app root. Polls friend_challenges every 5s for:
//  • Challenges I sent that just flipped to 'accepted' → prompt me to play.
//  • Challenges I'm in that just resolved to 'finished' → show win/loss.
// Polling (not realtime) because friend_challenges isn't in the
// supabase_realtime publication — the subscription silently receives nothing
// until someone adds "ALTER PUBLICATION supabase_realtime ADD TABLE
// friend_challenges;" in the database, which we can't assume.
const POLL_MS = 5_000;

export function useChallengeNotifications() {
  const { user } = useUserStore();
  const userId = user?.id;
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const shownRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!userId || userId === 'offline') return;

    async function check() {
      // Lazy expiration cleanup — reaches into the DB to flip stale pending
      // rows to 'expired'. Fails silently if the RPC isn't deployed yet.
      ChallengeSystem.expireOldChallenges();

      // A. My sent challenges that were just accepted. Prefer routing
      // straight to the lobby if a match_id is present (new flow).
      const { data: accepted } = await supabase
        .from('friend_challenges')
        .select('id, mode, status, challenger_id, challenged_id, wager_amount, wager_currency, winner_id, match_id')
        .eq('challenger_id', userId)
        .eq('status', 'accepted')
        .limit(20);

      (accepted || []).forEach((row: any) => {
        const key = `accept:${row.id}`;
        if (shownRef.current.has(key)) return;
        shownRef.current.add(key);
        Alert.alert(
          isArabic ? '⚔️ قُبل التحدي!' : '⚔️ Challenge accepted!',
          isArabic ? 'الخصم جاهز — اللعب الآن؟' : 'Opponent is ready — play now?',
          [
            { text: isArabic ? 'لاحقاً' : 'Later', style: 'cancel' },
            {
              text: isArabic ? 'العب الآن' : 'Play now',
              onPress: () => {
                if (row.match_id) {
                  router.push(`/match/${row.match_id}/lobby` as any);
                } else if (row.mode === 'duel') {
                  router.push(`/duel?challengeId=${row.id}` as any);
                } else if (row.mode === 'daily') {
                  router.push(`/daily?challengeId=${row.id}` as any);
                } else {
                  router.push(`/classic?challengeId=${row.id}` as any);
                }
              },
            },
          ],
        );
      });

      // B. Finished challenges I participated in
      const { data: finished } = await supabase
        .from('friend_challenges')
        .select('id, status, winner_id, wager_amount, wager_currency, challenger_id, challenged_id')
        .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
        .eq('status', 'finished')
        .limit(20);

      (finished || []).forEach((row: any) => {
        const key = `done:${row.id}`;
        if (shownRef.current.has(key)) return;
        shownRef.current.add(key);
        const iWon = row.winner_id === userId;
        const tied = row.winner_id == null;
        const sym = row.wager_currency === 'gems' ? '💎' : '🪙';
        const wager = Number(row.wager_amount || 0);
        const title = tied
          ? (isArabic ? '🤝 تعادل' : '🤝 Tie')
          : iWon
            ? (isArabic ? '🏆 فزت!' : '🏆 You won!')
            : (isArabic ? '💔 خسرت' : '💔 You lost');
        const body = tied
          ? (isArabic ? 'رُدّت الرهانات' : 'Wagers refunded')
          : iWon && wager > 0
            ? `+${wager * 2}${sym}`
            : '';
        Alert.alert(title, body);
      });
    }

    // Prime the "seen" set with whatever's already there so we don't flood
    // the user with old alerts on first mount after they signed in.
    async function seedSeen() {
      const [a, f] = await Promise.all([
        supabase
          .from('friend_challenges')
          .select('id')
          .eq('challenger_id', userId)
          .eq('status', 'accepted')
          .limit(50),
        supabase
          .from('friend_challenges')
          .select('id')
          .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
          .eq('status', 'finished')
          .limit(50),
      ]);
      (a.data || []).forEach((r: any) => shownRef.current.add(`accept:${r.id}`));
      (f.data || []).forEach((r: any) => shownRef.current.add(`done:${r.id}`));
    }

    (async () => {
      await seedSeen();
      // From now on, any newly flipped status will trigger the alert.
      timerRef.current = setInterval(check, POLL_MS);
    })();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      sub.remove();
    };
  }, [userId, isArabic]);
}
