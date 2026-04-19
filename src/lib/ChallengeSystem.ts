import { Linking } from 'react-native';
import { supabase } from './supabase';

export interface ChallengeMode {
  id: string;
  emoji: string;
  name_ar: string;
  name_en: string;
  desc_ar: string;
  desc_en: string;
}

export const CHALLENGE_MODES: ChallengeMode[] = [
  { id: 'daily',   emoji: '\uD83D\uDCC5', name_ar: 'كلمة اليوم',     name_en: 'Daily Word',   desc_ar: 'نفس كلمة اليوم',                 desc_en: 'Same daily word' },
  { id: 'duel',    emoji: '\u26A1',        name_ar: 'مبارزة سريعة',    name_en: 'Speed Duel',   desc_ar: 'كلمة عشوائية — الأسرع يفوز',      desc_en: 'Random word — fastest wins' },
  { id: 'classic', emoji: '\u221E',        name_ar: 'كلاسيكي',         name_en: 'Classic',      desc_ar: '5 كلمات — أعلى نقاط يفوز',        desc_en: '5 words — highest score wins' },
];

export type WagerCurrency = 'coins' | 'gems';
export const WAGER_PRESETS_COINS = [0, 10, 25, 50, 100, 200];
export const WAGER_PRESETS_GEMS  = [0,  5, 10, 25,  50, 100];
export const WAGER_PRESETS = WAGER_PRESETS_COINS;

export interface FriendChallenge {
  id: string;
  challenger_id: string;
  challenged_id: string;
  mode: string;
  wager_amount: number;
  wager_currency?: WagerCurrency;
  room_code: string;
  status: string;
  language: string;
  winner_id: string | null;
  expires_at: string;
  created_at: string;
  match_id?: string | null;
  challenger?: { id: string; username: string; avatar_color: string; push_token?: string };
  challenged?: { id: string; username: string; avatar_color: string; push_token?: string };
}

export interface Match {
  id: string;
  challenge_id: string | null;
  mode: string;
  language: string;
  player1_id: string;
  player2_id: string;
  player1_ready: boolean;
  player2_ready: boolean;
  player1_score: { score: number; at: string } | null;
  player2_score: { score: number; at: string } | null;
  wager_amount: number;
  wager_currency: WagerCurrency;
  status: 'lobby' | 'active' | 'completed' | 'cancelled';
  winner_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

function getModeLabel(modeId: string, isEnglish: boolean): string {
  const mode = CHALLENGE_MODES.find(m => m.id === modeId);
  if (!mode) return modeId;
  return isEnglish ? mode.name_en : mode.name_ar;
}

export const ChallengeSystem = {

  async sendChallenge(params: {
    challengerId: string;
    challengedId: string;
    mode: string;
    wagerAmount: number;
    wagerCurrency?: WagerCurrency;
    language: string;
    challengerUsername: string;
  }): Promise<{ success: boolean; challenge?: FriendChallenge; error_ar?: string; error_en?: string }> {
    const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const isEn = params.language === 'en';
    const currency: WagerCurrency = params.wagerCurrency || 'coins';

    if (params.wagerAmount > 0) {
      const col = currency === 'gems' ? 'gems' : 'coins';
      const { data: me } = await supabase.from('profiles').select(col).eq('id', params.challengerId).single();
      if (!me || (me as any)[col] < params.wagerAmount) {
        return {
          success: false,
          error_ar: currency === 'gems' ? 'جواهرك غير كافية للرهان' : 'عملاتك غير كافية للرهان',
          error_en: currency === 'gems' ? 'Not enough gems to wager' : 'Not enough coins to wager',
        };
      }
    }

    const basePayload = {
      challenger_id: params.challengerId,
      challenged_id: params.challengedId,
      mode: params.mode,
      wager_amount: params.wagerAmount,
      room_code: roomCode,
      status: 'pending',
      language: params.language,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    let insertRes = await supabase
      .from('friend_challenges')
      .insert({ ...basePayload, wager_currency: currency })
      .select()
      .single();

    if (insertRes.error && /wager_currency/i.test(insertRes.error.message || '')) {
      console.log('friend_challenges.wager_currency column missing, retrying without it');
      insertRes = await supabase
        .from('friend_challenges')
        .insert(basePayload)
        .select()
        .single();
    }

    const challenge = insertRes.data;
    if (insertRes.error || !challenge) {
      console.log('Challenge insert error:', JSON.stringify(insertRes.error));
      return {
        success: false,
        error_ar: 'حدث خطأ: ' + (insertRes.error?.message || ''),
        error_en: 'Error: ' + (insertRes.error?.message || 'try again'),
      };
    }

    if (params.wagerAmount > 0) {
      if (currency === 'coins') {
        const { error: escrowErr } = await supabase.rpc('hold_coins_escrow', {
          p_user_id: params.challengerId,
          p_challenge_id: challenge.id,
          p_amount: params.wagerAmount,
        });
        if (escrowErr) {
          await supabase.from('friend_challenges').delete().eq('id', challenge.id);
          return { success: false, error_ar: 'عملاتك غير كافية للرهان', error_en: 'Not enough coins to wager' };
        }
      } else {
        const { data: me } = await supabase.from('profiles').select('gems').eq('id', params.challengerId).single();
        const current = me?.gems || 0;
        if (current < params.wagerAmount) {
          await supabase.from('friend_challenges').delete().eq('id', challenge.id);
          return { success: false, error_ar: 'جواهرك غير كافية للرهان', error_en: 'Not enough gems to wager' };
        }
        await supabase.from('profiles').update({ gems: current - params.wagerAmount }).eq('id', params.challengerId);
      }
    }

    // Fetch the friend's push token and fire an in-app push notification
    try {
      const { data: target } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', params.challengedId)
        .maybeSingle();

      if (target?.push_token) {
        const modeLabel = getModeLabel(params.mode, isEn);
        const currencySymbol = currency === 'gems' ? '💎' : '🪙';
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: target.push_token,
            title: isEn ? `⚔️ ${params.challengerUsername} challenges you!` : `⚔️ ${params.challengerUsername} يتحداك!`,
            body: params.wagerAmount > 0
              ? (isEn
                  ? `${modeLabel} · ${params.wagerAmount}${currencySymbol} at stake`
                  : `${modeLabel} · ${params.wagerAmount}${currencySymbol} على المحك`)
              : (isEn ? `${modeLabel} — do you dare?` : `${modeLabel} — هل تجرؤ؟`),
            data: { type: 'friend_challenge', challengeId: challenge.id, screen: '/friends' },
            sound: 'default',
          }),
        });
      }
    } catch { /* push failure is non-fatal */ }

    return { success: true, challenge };
  },

  async acceptChallenge(challengeId: string, userId: string): Promise<{ success: boolean; matchId?: string; error_ar?: string; error_en?: string }> {
    // Preferred path: atomic RPC (two-phase handshake, no races).
    // Falls back to the legacy client-side flow if the RPC hasn't been
    // deployed to Supabase yet (sql/challenge_matches_v2.sql).
    const rpc = await supabase.rpc('accept_challenge_atomic', { p_challenge_id: challengeId });
    if (!rpc.error) {
      return { success: true, matchId: rpc.data as string };
    }

    const msg = String(rpc.error?.message || '');
    if (/CHALLENGE_NOT_FOUND|CHALLENGE_NOT_PENDING/i.test(msg)) {
      return { success: false, error_ar: 'التحدي لم يعد متاحاً', error_en: 'Challenge no longer available' };
    }
    if (/NOT_RECIPIENT/i.test(msg)) {
      return { success: false, error_ar: 'هذا التحدي ليس لك', error_en: 'This challenge is not for you' };
    }
    if (/CHALLENGE_EXPIRED/i.test(msg)) {
      return { success: false, error_ar: 'انتهت صلاحية التحدي', error_en: 'Challenge has expired' };
    }
    if (/INSUFFICIENT_GEMS/i.test(msg)) {
      return { success: false, error_ar: 'جواهرك غير كافية', error_en: "You don't have enough gems" };
    }
    if (/SENDER_INSUFFICIENT_GEMS/i.test(msg)) {
      return { success: false, error_ar: 'جواهر الخصم لم تعد كافية', error_en: 'Your opponent no longer has enough gems' };
    }
    if (/insufficient_coins/i.test(msg)) {
      return { success: false, error_ar: 'عملاتك غير كافية للرهان', error_en: 'Not enough coins to wager' };
    }
    // Only fall through to legacy flow for "function does not exist" errors
    if (!/function .* does not exist|could not find the function/i.test(msg)) {
      console.log('accept_challenge_atomic error:', msg);
      return { success: false, error_ar: 'تعذّر قبول التحدي', error_en: 'Could not accept challenge' };
    }

    // ── Legacy fallback (no matchId is returned — caller routes straight to game) ──
    const { data: challenge } = await supabase
      .from('friend_challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (!challenge || challenge.status !== 'pending') {
      return { success: false, error_ar: 'التحدي لم يعد متاحاً', error_en: 'Challenge no longer available' };
    }

    if (challenge.challenged_id !== userId) {
      return { success: false, error_ar: 'هذا التحدي ليس لك', error_en: 'This challenge is not for you' };
    }

    if (new Date(challenge.expires_at) < new Date()) {
      await supabase.from('friend_challenges').update({ status: 'expired' }).eq('id', challengeId);
      if (challenge.wager_amount > 0) {
        await supabase.rpc('refund_escrow', { p_challenge_id: challengeId });
      }
      return { success: false, error_ar: 'انتهت صلاحية التحدي', error_en: 'Challenge has expired' };
    }

    // Hold challenged player's wager. Currency-aware: gems get a manual
    // deduction (same semantics the send side uses), coins use the escrow RPC.
    if (challenge.wager_amount > 0) {
      const currency: WagerCurrency = (challenge as any).wager_currency === 'gems' ? 'gems' : 'coins';

      if (currency === 'gems') {
        const { data: me } = await supabase.from('profiles').select('gems').eq('id', userId).single();
        const current = me?.gems || 0;
        if (current < challenge.wager_amount) {
          return { success: false, error_ar: 'جواهرك غير كافية للرهان', error_en: 'Not enough gems to wager' };
        }
        const { error: deductErr } = await supabase
          .from('profiles')
          .update({ gems: current - challenge.wager_amount })
          .eq('id', userId);
        if (deductErr) {
          return { success: false, error_ar: 'فشل الخصم، حاول مجدداً', error_en: 'Deduction failed, try again' };
        }
      } else {
        const { error: escrowErr } = await supabase.rpc('hold_coins_escrow', {
          p_user_id: userId,
          p_challenge_id: challengeId,
          p_amount: challenge.wager_amount,
        });
        if (escrowErr) {
          return { success: false, error_ar: 'عملاتك غير كافية للرهان', error_en: 'Not enough coins to wager' };
        }
      }
    }

    await supabase.from('friend_challenges')
      .update({ status: 'accepted' })
      .eq('id', challengeId);

    return { success: true };
  },

  async getMatch(matchId: string): Promise<Match | null> {
    const { data } = await supabase.from('matches').select('*').eq('id', matchId).single();
    return (data as Match) || null;
  },

  async markReady(matchId: string): Promise<Match | null> {
    const { data, error } = await supabase.rpc('mark_ready', { p_match_id: matchId });
    if (error) {
      console.log('mark_ready error:', error.message);
      return null;
    }
    return (data as Match) || null;
  },

  async cancelChallenge(challengeId: string): Promise<{ success: boolean }> {
    const { error } = await supabase.rpc('cancel_challenge', { p_challenge_id: challengeId });
    if (error) {
      console.log('cancel_challenge error:', error.message);
      return { success: false };
    }
    return { success: true };
  },

  async expireOldChallenges(): Promise<void> {
    // Best-effort cleanup — called lazily from the notification hook.
    try { await supabase.rpc('expire_old_challenges'); } catch {}
  },

  async declineChallenge(challengeId: string, userId: string): Promise<void> {
    const { data: challenge } = await supabase
      .from('friend_challenges')
      .select('wager_amount, challenger_id')
      .eq('id', challengeId)
      .single();

    await supabase.from('friend_challenges')
      .update({ status: 'declined' })
      .eq('id', challengeId);

    // Refund challenger's escrow
    if (challenge?.wager_amount > 0) {
      await supabase.rpc('refund_escrow', { p_challenge_id: challengeId });
    }
  },

  async resolveChallenge(challengeId: string, winnerId: string | null): Promise<void> {
    const { data: challenge } = await supabase
      .from('friend_challenges')
      .select('wager_amount, wager_currency, challenger_id, challenged_id, status')
      .eq('id', challengeId)
      .single();

    if (!challenge || challenge.status === 'finished') return;

    const currency: WagerCurrency = (challenge as any).wager_currency === 'gems' ? 'gems' : 'coins';

    // Tie (winnerId === null) → refund both sides
    if (!winnerId) {
      if (challenge.wager_amount > 0) {
        if (currency === 'gems') {
          const [{ data: a }, { data: b }] = await Promise.all([
            supabase.from('profiles').select('gems').eq('id', challenge.challenger_id).single(),
            supabase.from('profiles').select('gems').eq('id', challenge.challenged_id).single(),
          ]);
          await Promise.all([
            supabase.from('profiles').update({ gems: (a?.gems || 0) + challenge.wager_amount }).eq('id', challenge.challenger_id),
            supabase.from('profiles').update({ gems: (b?.gems || 0) + challenge.wager_amount }).eq('id', challenge.challenged_id),
          ]);
        } else {
          await supabase.rpc('refund_escrow', { p_challenge_id: challengeId });
        }
      }
      await supabase.from('friend_challenges')
        .update({ status: 'finished' })
        .eq('id', challengeId);
      return;
    }

    if (challenge.wager_amount > 0) {
      if (currency === 'gems') {
        const { data: w } = await supabase.from('profiles').select('gems').eq('id', winnerId).single();
        await supabase
          .from('profiles')
          .update({ gems: (w?.gems || 0) + challenge.wager_amount * 2 })
          .eq('id', winnerId);
        await supabase.from('friend_challenges')
          .update({ winner_id: winnerId, status: 'finished' })
          .eq('id', challengeId);
      } else {
        await supabase.rpc('release_escrow_to_winner', {
          p_challenge_id: challengeId,
          p_winner_id: winnerId,
        });
      }
    } else {
      await supabase.from('friend_challenges')
        .update({ winner_id: winnerId, status: 'finished' })
        .eq('id', challengeId);
    }
  },

  // Called by each player when their game ends. Prefers the atomic server
  // RPC (submit_match_score) so the payout bypasses RLS and is idempotent.
  // Falls back to a legacy client-side flow for rows created before the v2
  // migration ran (no match_id).
  async submitScore(
    challengeId: string,
    userId: string,
    score: number,
  ): Promise<{ resolved: boolean; winnerId: string | null; myScore: number; opponentScore: number | null }> {
    const { data: challenge } = await supabase
      .from('friend_challenges')
      .select('challenger_id, challenged_id, challenger_score, challenged_score, status, match_id')
      .eq('id', challengeId)
      .single();

    if (!challenge) return { resolved: false, winnerId: null, myScore: score, opponentScore: null };

    // ── Preferred path: call the server RPC against the match row ──
    if ((challenge as any).match_id) {
      const { data: m, error } = await supabase.rpc('submit_match_score', {
        p_match_id: (challenge as any).match_id,
        p_score: score,
      });
      if (!error && m) {
        const matchRow = m as any;
        const oppScoreRaw = userId === matchRow.player1_id ? matchRow.player2_score : matchRow.player1_score;
        const opponentScore = oppScoreRaw && typeof oppScoreRaw === 'object' ? Number(oppScoreRaw.score) : null;
        const resolved = matchRow.status === 'completed';
        return { resolved, winnerId: resolved ? matchRow.winner_id : null, myScore: score, opponentScore };
      }
      // Fall through to legacy path if RPC is missing / errored
      if (error) console.log('submit_match_score error:', error.message);
    }

    // ── Legacy fallback (pre-v2 rows; client-side update) ──
    const isChallenger = challenge.challenger_id === userId;
    const myCol = isChallenger ? 'challenger_score' : 'challenged_score';
    const oppScoreRaw = isChallenger ? challenge.challenged_score : challenge.challenger_score;

    await supabase
      .from('friend_challenges')
      .update({ [myCol]: { score, at: new Date().toISOString() } })
      .eq('id', challengeId);

    const opponentScore = oppScoreRaw && typeof oppScoreRaw === 'object' ? Number((oppScoreRaw as any).score) : null;

    if (opponentScore == null) {
      if (challenge.status !== 'active') {
        await supabase.from('friend_challenges').update({ status: 'active' }).eq('id', challengeId);
      }
      return { resolved: false, winnerId: null, myScore: score, opponentScore: null };
    }

    let winnerId: string | null;
    if (score > opponentScore) winnerId = userId;
    else if (score < opponentScore) winnerId = isChallenger ? challenge.challenged_id : challenge.challenger_id;
    else winnerId = null;

    await this.resolveChallenge(challengeId, winnerId);
    return { resolved: true, winnerId, myScore: score, opponentScore };
  },

  async forfeitChallenge(challengeId: string, quitterId: string): Promise<void> {
    const { data: challenge } = await supabase
      .from('friend_challenges')
      .select('challenger_id, challenged_id, wager_amount')
      .eq('id', challengeId)
      .single();

    if (!challenge) return;

    const winnerId = quitterId === challenge.challenger_id
      ? challenge.challenged_id
      : challenge.challenger_id;

    if (challenge.wager_amount > 0) {
      await supabase.rpc('release_escrow_to_winner', {
        p_challenge_id: challengeId,
        p_winner_id: winnerId,
      });
    } else {
      await supabase.from('friend_challenges')
        .update({ winner_id: winnerId, status: 'finished' })
        .eq('id', challengeId);
    }
  },

  async getPendingChallenges(userId: string): Promise<FriendChallenge[]> {
    const { data } = await supabase
      .from('friend_challenges')
      .select('*')
      .eq('challenged_id', userId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (!data || data.length === 0) return [];

    // Fetch challenger profiles
    const challengerIds = [...new Set(data.map(c => c.challenger_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar_color')
      .in('id', challengerIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    return data.map(c => ({
      ...c,
      challenger: profileMap.get(c.challenger_id) || { id: c.challenger_id, username: '???', avatar_color: '#7C3AED' },
    }));
  },

  async getActiveChallenges(userId: string): Promise<FriendChallenge[]> {
    const { data } = await supabase
      .from('friend_challenges')
      .select('*')
      .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
      .in('status', ['accepted', 'active'])
      .order('created_at', { ascending: false });

    return data || [];
  },

  shareViaWhatsApp(params: {
    username: string;
    mode: string;
    wagerAmount: number;
    roomCode: string;
    language: string;
  }) {
    const isEn = params.language === 'en';
    const modeLabel = getModeLabel(params.mode, isEn);
    const msg = isEn
      ? `${params.username} challenges you on Kalimat! \u2694\uFE0F\nMode: ${modeLabel}${params.wagerAmount > 0 ? `\nWager: ${params.wagerAmount} coins` : ''}\nCode: ${params.roomCode}\nOpen the app to accept!`
      : `${params.username} يتحداك في كلمات! \u2694\uFE0F\nالوضع: ${modeLabel}${params.wagerAmount > 0 ? `\nالرهان: ${params.wagerAmount} عملة` : ''}\nالكود: ${params.roomCode}\nافتح التطبيق وقبل التحدي!`;

    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(() => {});
  },
};
