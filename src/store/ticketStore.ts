import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TicketTier, Prize } from '../lib/gacha';

const KEYS = {
  bronze: 'kal_tickets_bronze',
  silver: 'kal_tickets_silver',
  golden: 'kal_tickets_golden',
  adsToday: 'kal_ads_watched_today',
  adsResetDate: 'kal_ads_reset_date',
  spinHistory: 'kal_spin_history',
};

export interface SpinHistoryEntry {
  id: string;
  tier: TicketTier;
  prizeId: string;
  prizeName: string;
  prizeEmoji: string;
  prizeRarity: string;
  rewardType: string;
  rewardAmount?: number;
  rewardItemId?: string;
  createdAt: string;
}

interface TicketStore {
  bronze: number;
  silver: number;
  golden: number;
  adsWatchedToday: number;
  spinHistory: SpinHistoryEntry[];
  loaded: boolean;

  load: () => Promise<void>;
  addTickets: (tier: TicketTier, amount: number) => void;
  spendTickets: (tier: TicketTier, amount: number) => boolean;
  canSpin: (tier: TicketTier, cost: number) => boolean;
  incrementAdsToday: () => void;
  addSpinHistory: (entry: SpinHistoryEntry) => void;
  getTicketCount: (tier: TicketTier) => number;
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

async function persist(key: string, value: any) {
  try { await AsyncStorage.setItem(key, JSON.stringify(value)); } catch {}
}

async function loadNum(key: string): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(key);
    return v ? parseInt(v, 10) || 0 : 0;
  } catch { return 0; }
}

export const useTicketStore = create<TicketStore>((set, get) => ({
  bronze: 0,
  silver: 0,
  golden: 0,
  adsWatchedToday: 0,
  spinHistory: [],
  loaded: false,

  load: async () => {
    try {
      const [b, s, g, ads, resetDate, hist] = await Promise.all([
        loadNum(KEYS.bronze),
        loadNum(KEYS.silver),
        loadNum(KEYS.golden),
        loadNum(KEYS.adsToday),
        AsyncStorage.getItem(KEYS.adsResetDate),
        AsyncStorage.getItem(KEYS.spinHistory),
      ]);

      // Reset daily ad count if new day
      const today = getTodayStr();
      let adsToday = ads;
      if (resetDate !== today) {
        adsToday = 0;
        await AsyncStorage.setItem(KEYS.adsResetDate, today);
        await AsyncStorage.setItem(KEYS.adsToday, '0');
      }

      const history: SpinHistoryEntry[] = hist ? JSON.parse(hist) : [];

      set({ bronze: b, silver: s, golden: g, adsWatchedToday: adsToday, spinHistory: history, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  addTickets: (tier, amount) => {
    set((s) => {
      const newVal = s[tier] + amount;
      persist(KEYS[tier], newVal);
      return { [tier]: newVal } as any;
    });
  },

  spendTickets: (tier, amount) => {
    const s = get();
    if (s[tier] < amount) return false;
    const newVal = s[tier] - amount;
    set({ [tier]: newVal } as any);
    persist(KEYS[tier], newVal);
    return true;
  },

  canSpin: (tier, cost) => get()[tier] >= cost,

  incrementAdsToday: () => {
    set((s) => {
      const newVal = s.adsWatchedToday + 1;
      persist(KEYS.adsToday, newVal);
      return { adsWatchedToday: newVal };
    });
  },

  addSpinHistory: (entry) => {
    set((s) => {
      const updated = [entry, ...s.spinHistory].slice(0, 50); // keep last 50
      persist(KEYS.spinHistory, updated);
      return { spinHistory: updated };
    });
  },

  getTicketCount: (tier) => get()[tier],
}));
