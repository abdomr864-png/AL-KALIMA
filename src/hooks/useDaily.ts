import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getDailyWord, getTodayDateString, isValidWord } from '../lib/words';
import { getDailyWordEN, isValidEnglishWord } from '../lib/words_en';
import { WordEngine, type GameState } from '../engine/WordEngine';
import { useUserStore } from '../store/userStore';
import { useGameStore } from '../store/gameStore';
import { GAME } from '../lib/constants';
import { useLanguage } from '../lib/LanguageContext';
import { AntiCheat } from '../lib/AntiCheat';

export function useDaily() {
  const { user } = useUserStore();
  const { dailyGame, setDailyGame, dailyCompleted, setDailyCompleted } = useGameStore();
  const { updateCoins, updateStreak, incrementGames, incrementWins } = useUserStore();
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [shake, setShake] = useState(false);
  const [todayDate] = useState(getTodayDateString());

  useEffect(() => {
    // Always start a game immediately with local word, then try Supabase in background
    const date = getTodayDateString();
    const word = language === 'en'
      ? getDailyWordEN(date).word
      : getDailyWord(date);
    const existingMatchesLanguage = dailyGame
      ? (language === 'en'
          ? /^[A-Za-z]+$/.test(dailyGame.targetWord)
          : /[\u0600-\u06FF]/.test(dailyGame.targetWord))
      : false;
    if (!dailyGame || !existingMatchesLanguage) {
      setDailyGame(WordEngine.createGame(word, GAME.MAX_ATTEMPTS));
      setDailyCompleted(false);
    }
    setIsLoading(false);

    // Try to upgrade from Supabase in background (non-blocking)
    if (user && user.id !== 'offline') {
      loadFromSupabase(date);
    }
  }, [user?.id, language]);

  async function loadFromSupabase(date: string) {
    try {
      // Race against a 3-second timeout
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));

      const result = await Promise.race([
        supabase.from('daily_results').select('*').eq('player_id', user!.id).eq('word_date', date).eq('language', language).single(),
        timeout,
      ]) as any;

      if (result?.data) {
        const existing = result.data;
        setDailyCompleted(true);
        const word = await getWord(date);
        const pattern = JSON.parse(existing.guess_pattern);
        setDailyGame({
          targetWord: word,
          guesses: [],
          results: pattern,
          currentGuess: '',
          gameStatus: existing.success ? 'won' : 'lost',
          attempts: existing.attempts,
          maxAttempts: GAME.MAX_ATTEMPTS,
          startTime: 0,
        });
      }
    } catch {
      // Supabase unavailable — local game already loaded, nothing to do
    }
  }

  async function getWord(date: string): Promise<string> {
    try {
      const { data } = await supabase
        .from('daily_words')
        .select('word')
        .eq('word_date', date)
        .eq('language', language)
        .single();
      if (data) return language === 'en' ? data.word.toUpperCase() : data.word;
    } catch {
      // fall through
    }

    return language === 'en' ? getDailyWordEN(date).word : getDailyWord(date);
  }

  const addLetter = useCallback((letter: string) => {
    if (!dailyGame || dailyGame.gameStatus !== 'playing') return;
    if (dailyGame.currentGuess.length >= dailyGame.targetWord.length) return;
    setDailyGame({ ...dailyGame, currentGuess: dailyGame.currentGuess + letter });
  }, [dailyGame]);

  const deleteLetter = useCallback(() => {
    if (!dailyGame || dailyGame.gameStatus !== 'playing') return;
    if (dailyGame.currentGuess.length === 0) return;
    setDailyGame({ ...dailyGame, currentGuess: dailyGame.currentGuess.slice(0, -1) });
  }, [dailyGame]);

  const submitGuess = useCallback(async () => {
    if (!dailyGame || dailyGame.gameStatus !== 'playing') return;
    if (dailyGame.currentGuess.length !== dailyGame.targetWord.length) {
      triggerShake();
      return;
    }
    const wordValid = language === 'en'
      ? isValidEnglishWord(dailyGame.currentGuess)
      : isValidWord(dailyGame.currentGuess);
    if (!wordValid) {
      triggerShake();
      return;
    }

    const newState = WordEngine.submitGuess(dailyGame);
    setDailyGame(newState);

    if (newState.gameStatus !== 'playing') {
      await submitResult(newState);
    }
  }, [dailyGame, user]);

  async function submitResult(state: GameState) {
    if (!user || user.id === 'offline') return;
    const durationSeconds = Math.floor((Date.now() - state.startTime) / 1000);
    const won = state.gameStatus === 'won';

    try {
      await supabase.from('daily_results').insert({
        player_id: user.id,
        word_date: todayDate,
        attempts: state.attempts,
        success: won,
        guess_pattern: JSON.stringify(state.results),
        duration_seconds: durationSeconds,
        language,
      });

      // Anti-cheat: run checks in background (non-blocking)
      AntiCheat.runAllChecks(user.id, durationSeconds, state.attempts).catch(() => {});

      incrementGames();
      if (won) {
        incrementWins();
        updateCoins(GAME.WIN_COINS);
        supabase.rpc('add_coins', { amount: GAME.WIN_COINS, reason: 'daily_complete' }).then(() => {});
        updateStreak(user.currentStreak + 1);
        await supabase.from('profiles').update({
          total_games: user.totalGames + 1,
          total_wins: user.totalWins + 1,
          current_streak: user.currentStreak + 1,
          best_streak: Math.max(user.bestStreak, user.currentStreak + 1),
        }).eq('id', user.id);
      } else {
        updateStreak(0);
        await supabase.from('profiles').update({
          total_games: user.totalGames + 1,
          current_streak: 0,
        }).eq('id', user.id);
      }
    } catch {
      // offline — stats saved locally via zustand
      incrementGames();
      if (won) incrementWins();
    }

    setDailyCompleted(true);
  }

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), GAME.SHAKE_DURATION);
  }

  return {
    game: dailyGame,
    isLoading,
    dailyCompleted,
    shake,
    todayDate,
    addLetter,
    deleteLetter,
    submitGuess,
  };
}
