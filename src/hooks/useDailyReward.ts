import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'kalimat_daily_reward';

// Escalating coin rewards for 7 days
export const DAILY_REWARDS = [5, 8, 10, 15, 20, 30, 50] as const;

// Gem reward rules — gems can appear once per 7-day cycle on days 4-6
export const GEM_RULES = {
  allowedDays: [4, 5, 6] as readonly number[], // 1-indexed days (never 1-3 or 7)
  maxPerCycle: 1,
  amounts: {
    4: { min: 5, max: 8 },
    5: { min: 8, max: 12 },
    6: { min: 10, max: 15 },
  } as Record<number, { min: number; max: number }>,
  probability: 0.22,
} as const;

export interface DailyRewardInfo {
  type: 'coins' | 'gems';
  amount: number;
  rarity?: 'epic';
}

interface DailyRewardState {
  /** Which day the user is on (0-6), or 7 if all claimed */
  currentDay: number;
  /** Date string (YYYY-MM-DD) of last claim */
  lastClaimDate: string | null;
  /** Whether the user has already claimed today */
  claimedToday: boolean;
  /** Pre-determined gem day for this cycle (1-indexed), or null if no gems */
  gemDay: number | null;
  /** Pre-determined gem amount, if gemDay is set */
  gemAmount: number;
  /** 0-indexed days in the current cycle that were missed (grey in UI) */
  missedDays: number[];
}

interface SavedState {
  currentDay: number;
  lastClaimDate: string;
  gemDay?: number | null;
  gemAmount?: number;
  missedDays?: number[];
}

/** Roll gem rewards for a new cycle: pick at most 1 gem day from eligible days */
function rollGemReward(): { gemDay: number | null; gemAmount: number } {
  for (const day of GEM_RULES.allowedDays) {
    if (Math.random() < GEM_RULES.probability) {
      const range = GEM_RULES.amounts[day];
      const amount = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
      return { gemDay: day, gemAmount: amount };
    }
  }
  return { gemDay: null, gemAmount: 0 };
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Get the reward info for a given day (0-indexed) within the cycle */
export function getRewardForDay(
  dayIndex: number,
  gemDay: number | null,
  gemAmount: number,
): DailyRewardInfo {
  const day1Indexed = dayIndex + 1;
  if (gemDay === day1Indexed && gemAmount > 0) {
    return { type: 'gems', amount: gemAmount, rarity: 'epic' };
  }
  return { type: 'coins', amount: DAILY_REWARDS[dayIndex] ?? 0 };
}

export function useDailyReward() {
  const [state, setState] = useState<DailyRewardState>({
    currentDay: 0,
    lastClaimDate: null,
    claimedToday: false,
    gemDay: null,
    gemAmount: 0,
    missedDays: [],
  });
  const [ready, setReady] = useState(false);

  // Load persisted state
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as SavedState;
          const today = getTodayStr();
          const claimedToday = saved.lastClaimDate === today;

          // If the user skipped days, mark them as missed and advance currentDay.
          // Only reset the cycle if skipping would blow past day 7.
          if (saved.lastClaimDate && !claimedToday) {
            const last = new Date(saved.lastClaimDate);
            const now = new Date(today);
            const diffDays = Math.floor((now.getTime() - last.getTime()) / 86400000);

            if (diffDays > 1) {
              const skipped = diffDays - 1;
              const prevMissed = saved.missedDays ?? [];
              const nextDay = saved.currentDay + skipped;

              // If skipping overruns the 7-day cycle, roll a fresh one
              if (nextDay >= 7) {
                const gem = rollGemReward();
                const fresh: SavedState = {
                  currentDay: 0,
                  lastClaimDate: '',
                  gemDay: gem.gemDay,
                  gemAmount: gem.gemAmount,
                  missedDays: [],
                };
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
                setState({
                  currentDay: 0,
                  lastClaimDate: null,
                  claimedToday: false,
                  missedDays: [],
                  gemDay: gem.gemDay,
                  gemAmount: gem.gemAmount,
                });
                setReady(true);
                return;
              }

              // Mark each skipped day as missed
              const newMissed = [...prevMissed];
              for (let i = 0; i < skipped; i++) {
                const idx = saved.currentDay + i;
                if (!newMissed.includes(idx)) newMissed.push(idx);
              }

              const updated: SavedState = {
                currentDay: nextDay,
                lastClaimDate: saved.lastClaimDate,
                gemDay: saved.gemDay ?? null,
                gemAmount: saved.gemAmount ?? 0,
                missedDays: newMissed,
              };
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
              setState({
                currentDay: nextDay,
                lastClaimDate: saved.lastClaimDate,
                claimedToday: false,
                gemDay: saved.gemDay ?? null,
                gemAmount: saved.gemAmount ?? 0,
                missedDays: newMissed,
              });
              setReady(true);
              return;
            }
          }

          setState({
            currentDay: saved.currentDay,
            lastClaimDate: saved.lastClaimDate,
            claimedToday,
            gemDay: saved.gemDay ?? null,
            gemAmount: saved.gemAmount ?? 0,
            missedDays: saved.missedDays ?? [],
          });
        } else {
          // First launch — roll gem reward for first cycle
          const gem = rollGemReward();
          setState(s => ({ ...s, ...gem }));
          // Will be persisted on first claim
        }
      } catch { /* first launch */ }
      setReady(true);
    })();
  }, []);

  /** Whether the modal should auto-pop (unclaimed reward, within cycle) */
  const shouldShow = ready && !state.claimedToday && state.currentDay < 7;

  /** The reward the user will get if they claim now */
  const todayReward: DailyRewardInfo = state.currentDay < 7
    ? getRewardForDay(state.currentDay, state.gemDay, state.gemAmount)
    : { type: 'coins', amount: 0 };

  /** Claim today's reward — returns the reward info */
  const claim = useCallback(async (): Promise<DailyRewardInfo> => {
    if (state.claimedToday || state.currentDay >= 7) return { type: 'coins', amount: 0 };
    const reward = getRewardForDay(state.currentDay, state.gemDay, state.gemAmount);
    const today = getTodayStr();
    const nextDay = state.currentDay + 1;

    const saved: SavedState = {
      currentDay: nextDay,
      lastClaimDate: today,
      gemDay: state.gemDay,
      gemAmount: state.gemAmount,
      missedDays: state.missedDays,
    };

    // If the cycle just finished, roll gems for next cycle and clear missed days
    if (nextDay >= 7) {
      const nextGem = rollGemReward();
      saved.gemDay = nextGem.gemDay;
      saved.gemAmount = nextGem.gemAmount;
      saved.missedDays = [];
    }

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    setState({
      currentDay: nextDay,
      lastClaimDate: today,
      claimedToday: true,
      gemDay: saved.gemDay ?? null,
      gemAmount: saved.gemAmount ?? 0,
      missedDays: saved.missedDays ?? [],
    });
    return reward;
  }, [state.currentDay, state.claimedToday, state.gemDay, state.gemAmount, state.missedDays]);

  return {
    ...state,
    shouldShow,
    todayReward,
    /** @deprecated Use todayReward.amount instead */
    rewardAmount: todayReward.amount,
    claim,
    ready,
  };
}
