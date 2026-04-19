import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  username: string;
  avatarColor: string;
  totalGames: number;
  totalWins: number;
  currentStreak: number;
  bestStreak: number;
  coins: number;
  gems?: number;
  isPlus: boolean;
  isElite?: boolean;
  avatarUrl?: string;
  usernameColor?: string;
  createdAt: string;
}

interface UserStore {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  updateCoins: (delta: number) => void;
  updateGems: (delta: number) => void;
  updateStreak: (streak: number) => void;
  incrementGames: () => void;
  incrementWins: () => void;
}

// Save coins to AsyncStorage whenever they change
async function persistCoins(coins: number) {
  try { await AsyncStorage.setItem('kalimat_coins', String(coins)); } catch {}
}

// Load saved coins
async function loadCoins(): Promise<number | null> {
  try {
    const val = await AsyncStorage.getItem('kalimat_coins');
    return val ? parseInt(val, 10) : null;
  } catch { return null; }
}

// Save gems to AsyncStorage
async function persistGems(gems: number) {
  try { await AsyncStorage.setItem('kalimat_gems', String(gems)); } catch {}
}

// Load saved gems
async function loadGems(): Promise<number | null> {
  try {
    const val = await AsyncStorage.getItem('kalimat_gems');
    return val ? parseInt(val, 10) : null;
  } catch { return null; }
}

// Fire-and-forget sync to Supabase (for non-currency fields only)
function syncToDb(userId: string, updates: Record<string, unknown>) {
  if (!userId || userId === 'offline') return;
  supabase.from('profiles').update(updates).eq('id', userId).then(() => {});
}

// Secure coin/gem sync via RPC (server validates)
function syncCurrencyViaRpc(type: 'coins' | 'gems', amount: number, reason: string) {
  if (amount <= 0) return;
  const fn = type === 'coins' ? 'add_coins' : 'add_gems';
  supabase.rpc(fn, { amount, reason }).then(() => {});
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => {
    if (user) {
      const userWithGems = { ...user, gems: user.gems ?? 0, isElite: user.isElite ?? false };
      set({ user: userWithGems, isAuthenticated: true, isLoading: false });
      // Load saved avatar from local storage if not already set
      if (!userWithGems.avatarUrl) {
        AsyncStorage.getItem('kalimat_avatar_url').then(saved => {
          if (saved) {
            set(s => s.user ? { user: { ...s.user, avatarUrl: saved } } : s);
          }
        });
      }
      // Load persisted coins and upgrade if saved value is higher
      loadCoins().then(saved => {
        if (saved !== null && saved !== userWithGems.coins) {
          const best = Math.max(saved, userWithGems.coins);
          set(s => s.user ? { user: { ...s.user, coins: best } } : s);
          persistCoins(best);
        } else {
          persistCoins(userWithGems.coins);
        }
      });
      // Load persisted gems
      loadGems().then(saved => {
        if (saved !== null && saved !== userWithGems.gems) {
          const best = Math.max(saved, userWithGems.gems);
          set(s => s.user ? { user: { ...s.user, gems: best } } : s);
          persistGems(best);
        } else {
          persistGems(userWithGems.gems);
        }
      });
    } else {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
  setLoading: (isLoading) => set({ isLoading }),
  updateCoins: (delta) =>
    set((s) => {
      if (!s.user) return s;
      const newCoins = Math.max(0, s.user.coins + delta);
      persistCoins(newCoins);
      // DB sync is handled by useCoins.earnCoins (RPC) or spendCoins (direct)
      // Do NOT sync here to avoid bypassing server validation
      return { user: { ...s.user, coins: newCoins } };
    }),
  updateGems: (delta) =>
    set((s) => {
      if (!s.user) return s;
      const newGems = Math.max(0, (s.user.gems || 0) + delta);
      persistGems(newGems);
      // DB sync is handled by useCoins.earnGems (RPC) or spendGems (direct)
      return { user: { ...s.user, gems: newGems } };
    }),
  updateStreak: (streak) =>
    set((s) => {
      if (!s.user) return s;
      const bestStreak = Math.max(s.user.bestStreak, streak);
      syncToDb(s.user.id, { current_streak: streak, best_streak: bestStreak });
      return {
        user: { ...s.user, currentStreak: streak, bestStreak },
      };
    }),
  incrementGames: () =>
    set((s) => {
      if (!s.user) return s;
      const totalGames = s.user.totalGames + 1;
      syncToDb(s.user.id, { total_games: totalGames });
      return { user: { ...s.user, totalGames } };
    }),
  incrementWins: () =>
    set((s) => {
      if (!s.user) return s;
      const totalWins = s.user.totalWins + 1;
      syncToDb(s.user.id, { total_wins: totalWins });
      return { user: { ...s.user, totalWins } };
    }),
}));
