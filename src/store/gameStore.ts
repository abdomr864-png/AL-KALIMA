import { create } from 'zustand';
import { type GameState } from '../engine/WordEngine';

interface GameStore {
  // Daily mode
  dailyGame: GameState | null;
  dailyCompleted: boolean;
  setDailyGame: (game: GameState | null) => void;
  setDailyCompleted: (completed: boolean) => void;

  // Classic mode
  classicGame: GameState | null;
  classicScore: number;
  classicWordsSolved: number;
  classicMaxStreak: number;
  setClassicGame: (game: GameState | null) => void;
  setClassicScore: (score: number) => void;
  incrementClassicScore: (points: number) => void;
  incrementClassicWordsSolved: () => void;
  setClassicMaxStreak: (streak: number) => void;

  // Duel mode
  duelId: string | null;
  setDuelId: (id: string | null) => void;

  // Sound
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  dailyGame: null,
  dailyCompleted: false,
  setDailyGame: (game) => set({ dailyGame: game }),
  setDailyCompleted: (completed) => set({ dailyCompleted: completed }),

  classicGame: null,
  classicScore: 0,
  classicWordsSolved: 0,
  classicMaxStreak: 0,
  setClassicGame: (game) => set({ classicGame: game }),
  setClassicScore: (score) => set({ classicScore: score }),
  incrementClassicScore: (points) => set((s) => ({ classicScore: s.classicScore + points })),
  incrementClassicWordsSolved: () => set((s) => ({ classicWordsSolved: s.classicWordsSolved + 1 })),
  setClassicMaxStreak: (streak) => set({ classicMaxStreak: streak }),

  duelId: null,
  setDuelId: (id) => set({ duelId: id }),

  soundEnabled: true,
  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
}));
