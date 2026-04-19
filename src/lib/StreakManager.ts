import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { NotificationManager } from './NotificationManager';

const STREAK_KEY = 'kalimat_current_streak';
const LAST_PLAYED_KEY = 'kalimat_last_played_date';
const BEST_STREAK_KEY = 'kalimat_best_streak';
const STREAK_FREEZE_KEY = 'kalimat_streak_freezes';
const STREAK_HISTORY_KEY = 'kalimat_streak_history';
const FROZEN_SINCE_KEY = 'kalimat_frozen_since';

const MILESTONES = [7, 14, 30, 50, 100, 365];

export type DayStatus = 'played' | 'frozen' | 'missed' | 'today' | 'future';

export interface DayRecord {
  date: string;        // YYYY-MM-DD
  status: DayStatus;
  attempts?: number;
  success?: boolean;
}

export interface StreakData {
  current: number;
  best: number;
  freezesAvailable: number;
  isFrozen: boolean;
  frozenSince?: string;
  lastPlayed: string | null;
  history: DayRecord[];
}

export interface StreakState {
  current: number;
  best: number;
  freezes: number;
  lastPlayed: string | null;
  alreadyPlayedToday: boolean;
}

export interface PlayResult {
  newStreak: number;
  wasStreak: number;
  milestoneReached: number | null;
  streakBroken: boolean;
  freezeUsed: boolean;
  frozeThawed: boolean;
}

export interface MilestoneReward {
  coins?: number;
  tickets?: { type: 'bronze' | 'silver' | 'golden'; amount: number };
  icon?: string;
}

export const StreakManager = {

  async getStreak(): Promise<StreakState> {
    const [current, best, freezes, lastPlayed] = await Promise.all([
      AsyncStorage.getItem(STREAK_KEY),
      AsyncStorage.getItem(BEST_STREAK_KEY),
      AsyncStorage.getItem(STREAK_FREEZE_KEY),
      AsyncStorage.getItem(LAST_PLAYED_KEY),
    ]);

    const today = new Date().toISOString().split('T')[0];
    const alreadyPlayedToday = lastPlayed === today;

    return {
      current: parseInt(current || '0'),
      best: parseInt(best || '0'),
      freezes: parseInt(freezes || '0'),
      lastPlayed,
      alreadyPlayedToday,
    };
  },

  async getFullStreakData(): Promise<StreakData> {
    const [current, best, freezes, lastPlayed, historyRaw, frozenSince] = await Promise.all([
      AsyncStorage.getItem(STREAK_KEY),
      AsyncStorage.getItem(BEST_STREAK_KEY),
      AsyncStorage.getItem(STREAK_FREEZE_KEY),
      AsyncStorage.getItem(LAST_PLAYED_KEY),
      AsyncStorage.getItem(STREAK_HISTORY_KEY),
      AsyncStorage.getItem(FROZEN_SINCE_KEY),
    ]);

    const history: DayRecord[] = historyRaw ? JSON.parse(historyRaw) : [];
    const isFrozen = !!frozenSince;
    const today = new Date().toISOString().split('T')[0];

    // Build last 30 days
    const fullHistory: DayRecord[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      const existing = history.find(h => h.date === date);

      if (existing) {
        fullHistory.push(existing);
      } else if (date === today) {
        fullHistory.push({ date, status: 'today' });
      } else if (date > today) {
        fullHistory.push({ date, status: 'future' });
      } else {
        fullHistory.push({ date, status: 'missed' });
      }
    }

    return {
      current: parseInt(current || '0'),
      best: parseInt(best || '0'),
      freezesAvailable: parseInt(freezes || '0'),
      isFrozen,
      frozenSince: frozenSince || undefined,
      lastPlayed,
      history: fullHistory,
    };
  },

  async recordDailyPlay(attempts?: number, success?: boolean): Promise<PlayResult> {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const data = await this.getFullStreakData();

    // Already played today
    if (data.lastPlayed === today) {
      return { newStreak: data.current, wasStreak: data.current, milestoneReached: null, streakBroken: false, freezeUsed: false, frozeThawed: false };
    }

    let newStreak = data.current;
    let streakBroken = false;
    let freezeUsed = false;
    let frozeThawed = false;

    if (data.lastPlayed === yesterday) {
      // Perfect consecutive day
      newStreak = data.current + 1;

      // If it was frozen, thaw it
      if (data.isFrozen) {
        frozeThawed = true;
        await AsyncStorage.removeItem(FROZEN_SINCE_KEY);
      }
    } else if (data.lastPlayed) {
      const daysMissed = Math.floor(
        (new Date(today).getTime() - new Date(data.lastPlayed).getTime()) / 86400000
      ) - 1;

      if (daysMissed === 1 && data.freezesAvailable > 0) {
        // Missed exactly 1 day AND has a freeze — use it
        newStreak = data.current + 1;
        freezeUsed = true;
        frozeThawed = true;
        const newFreezes = data.freezesAvailable - 1;
        await AsyncStorage.setItem(STREAK_FREEZE_KEY, String(newFreezes));
        await AsyncStorage.removeItem(FROZEN_SINCE_KEY);

        // Mark the missed day as frozen in history
        await this.updateDayHistory(yesterday, { date: yesterday, status: 'frozen' });
      } else if (data.isFrozen && daysMissed <= 1) {
        // Was frozen, coming back — thaw
        newStreak = data.current + 1;
        frozeThawed = true;
        await AsyncStorage.removeItem(FROZEN_SINCE_KEY);
      } else {
        // Streak broken
        newStreak = 1;
        streakBroken = data.current >= 3;
        await AsyncStorage.removeItem(FROZEN_SINCE_KEY);
        if (streakBroken) {
          try { await NotificationManager.sendStreakBrokenNotification(); } catch {}
        }
      }
    } else {
      // First ever play
      newStreak = 1;
    }

    // Persist locally
    await Promise.all([
      AsyncStorage.setItem(STREAK_KEY, String(newStreak)),
      AsyncStorage.setItem(LAST_PLAYED_KEY, today),
      this.updateDayHistory(today, { date: today, status: 'played', attempts, success }),
    ]);

    const best = parseInt(await AsyncStorage.getItem(BEST_STREAK_KEY) || '0');
    const newBest = Math.max(newStreak, best);
    if (newStreak > best) {
      await AsyncStorage.setItem(BEST_STREAK_KEY, String(newBest));
    }

    // Sync to Supabase
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({
          current_streak: newStreak,
          best_streak: newBest,
          last_played_date: today,
        }).eq('id', user.id);
      }
    } catch {}

    // Re-schedule streak danger notification
    try {
      const enabled = await NotificationManager.isEnabled();
      if (enabled) {
        await NotificationManager.scheduleAllDailyNotifications();
      }
    } catch {}

    const milestoneReached = MILESTONES.includes(newStreak) ? newStreak : null;

    return { newStreak, wasStreak: data.current, milestoneReached, streakBroken, freezeUsed, frozeThawed };
  },

  async checkAndApplyFreeze(): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const data = await this.getFullStreakData();

    if (
      data.lastPlayed &&
      data.lastPlayed !== today &&
      data.lastPlayed !== yesterday &&
      !data.isFrozen &&
      data.freezesAvailable > 0 &&
      data.current > 0
    ) {
      // Player missed yesterday but has freezes — auto apply
      await AsyncStorage.setItem(FROZEN_SINCE_KEY, yesterday);
      await this.updateDayHistory(yesterday, { date: yesterday, status: 'frozen' });
      return true;
    }
    return false;
  },

  async updateDayHistory(date: string, record: DayRecord) {
    const raw = await AsyncStorage.getItem(STREAK_HISTORY_KEY);
    const history: DayRecord[] = raw ? JSON.parse(raw) : [];
    const idx = history.findIndex(h => h.date === date);
    if (idx >= 0) history[idx] = record;
    else history.push(record);
    // Keep only last 365 days
    const sorted = history.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 365);
    await AsyncStorage.setItem(STREAK_HISTORY_KEY, JSON.stringify(sorted));
  },

  async addStreakFreeze(count: number = 1) {
    const current = parseInt(await AsyncStorage.getItem(STREAK_FREEZE_KEY) || '0');
    await AsyncStorage.setItem(STREAK_FREEZE_KEY, String(current + count));
  },

  getStreakEmoji(streak: number): string {
    if (streak >= 100) return '\u{1F451}';
    if (streak >= 50) return '\u{1F48E}';
    if (streak >= 30) return '\u{1F525}';
    if (streak >= 14) return '\u{26A1}';
    if (streak >= 7) return '\u{1F31F}';
    return '\u{1F525}';
  },

  getMilestoneReward(milestone: number): MilestoneReward {
    const rewards: Record<number, MilestoneReward> = {
      7:   { tickets: { type: 'silver', amount: 3 } },
      14:  { coins: 50 },
      30:  { tickets: { type: 'golden', amount: 1 }, icon: 'streak_master' },
      50:  { coins: 150 },
      100: { tickets: { type: 'golden', amount: 3 }, icon: 'legend' },
      365: { coins: 500, icon: 'one_year' },
    };
    return rewards[milestone] || { coins: 20 };
  },
};
