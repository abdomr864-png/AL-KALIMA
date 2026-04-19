import { useUserStore } from '../store/userStore';
import { supabase } from '../lib/supabase';
import { GAME } from '../lib/constants';

type CoinReason =
  | 'daily_complete' | 'duel_win' | 'classic_word' | 'ad_reward'
  | 'daily_reward' | 'referral_bonus' | 'welcome_back' | 'streak_milestone'
  | 'mission_complete' | 'hourly_word' | 'night_owl' | 'clan_reward'
  | 'friend_challenge_win' | 'tournament_reward';

type GemReason =
  | 'iap_purchase' | 'elite_monthly' | 'referral_milestone'
  | 'tournament_reward' | 'admin_grant' | 'streak_milestone';

export function useCoins() {
  const { user, updateCoins, updateGems } = useUserStore();

  const balance = user?.coins || 0;
  const gems = user?.gems || 0;

  async function spendCoins(amount: number): Promise<boolean> {
    if (!user || user.coins < amount) return false;
    updateCoins(-amount);
    // Spending is still done via direct update (RPC only for earning)
    try {
      if (user.id !== 'offline') {
        await supabase
          .from('profiles')
          .update({ coins: user.coins - amount })
          .eq('id', user.id);
      }
    } catch { /* offline */ }
    return true;
  }

  async function earnCoins(amount: number, reason: CoinReason) {
    if (!user) return;
    updateCoins(amount);
    try {
      if (user.id !== 'offline') {
        await supabase.rpc('add_coins', { amount, reason });
      }
    } catch { /* offline */ }
  }

  async function spendGems(amount: number): Promise<boolean> {
    if (!user || (user.gems || 0) < amount) return false;
    updateGems(-amount);
    try {
      if (user.id !== 'offline') {
        await supabase
          .from('profiles')
          .update({ gems: (user.gems || 0) - amount })
          .eq('id', user.id);
      }
    } catch { /* offline */ }
    return true;
  }

  async function earnGems(amount: number, reason: GemReason) {
    if (!user) return;
    updateGems(amount);
    try {
      if (user.id !== 'offline') {
        await supabase.rpc('add_gems', { amount, reason });
      }
    } catch { /* offline */ }
  }

  async function useHint(): Promise<boolean> {
    // Plus users get free hints
    if (user?.isPlus) return true;
    return spendCoins(GAME.HINT_COST);
  }

  return { balance, gems, spendCoins, earnCoins, spendGems, earnGems, useHint };
}
