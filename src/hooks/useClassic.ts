import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getRandomWord, isValidWord } from '../lib/words';
import { getRandomEnglishWord, isValidEnglishWord } from '../lib/words_en';
import { WordEngine, type GameState } from '../engine/WordEngine';
import { useUserStore } from '../store/userStore';
import { useGameStore } from '../store/gameStore';
import { GAME } from '../lib/constants';
import { useLanguage } from '../lib/LanguageContext';
import { calculateWordScore } from '../lib/ClassicScoreEngine';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DifficultyLevel {
  wordLength: number;
  maxAttempts: number;
  label: string;
  dots: number; // filled dots out of 5
}

const DIFFICULTIES: DifficultyLevel[] = [
  { wordLength: 5, maxAttempts: 6, label: 'سهل', dots: 1 },
  { wordLength: 5, maxAttempts: 5, label: 'متوسط', dots: 2 },
  { wordLength: 6, maxAttempts: 5, label: 'صعب', dots: 3 },
  { wordLength: 7, maxAttempts: 4, label: 'خبير', dots: 5 },
];

function getDifficulty(wordsSolved: number): DifficultyLevel {
  if (wordsSolved < 5) return DIFFICULTIES[0];
  if (wordsSolved < 10) return DIFFICULTIES[1];
  if (wordsSolved < 20) return DIFFICULTIES[2];
  return DIFFICULTIES[3];
}

export function calculateScore(attempts: number, wordLength: number, diffIndex: number): number {
  const baseScore = wordLength * 100;
  const attemptBonus = (7 - attempts) * 50;
  const multiplier = 1 + diffIndex * 0.25;
  return Math.floor(baseScore * multiplier + attemptBonus);
}

export function useClassic() {
  const { user } = useUserStore();
  const { language } = useLanguage();
  const {
    classicGame, setClassicGame,
    classicScore, incrementClassicScore, setClassicScore,
    classicWordsSolved, incrementClassicWordsSolved,
    classicMaxStreak, setClassicMaxStreak,
  } = useGameStore();
  const { updateCoins } = useUserStore();
  const [shake, setShake] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [totalAttempted, setTotalAttempted] = useState(0);
  const [lastScore, setLastScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // === NEW SCORE SYSTEM STATE ===
  const [sessionScore, setSessionScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [wordsInSession, setWordsInSession] = useState(0);
  const [isHotStreak, setIsHotStreak] = useState(false);
  const [hotStreakCount, setHotStreakCount] = useState(0);
  const [showScorePopup, setShowScorePopup] = useState(false);
  const [lastPointsEarned, setLastPointsEarned] = useState(0);
  const [showLossScreen, setShowLossScreen] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const wordStartTime = useRef<number>(Date.now());

  const diff = getDifficulty(classicWordsSolved);

  // Load high score on mount
  useEffect(() => {
    async function loadHighScore() {
      const local = await AsyncStorage.getItem('kalimat_classic_highscore');
      if (local) setHighScore(parseInt(local));

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data } = await supabase
          .from('profiles')
          .select('classic_high_score')
          .eq('id', authUser.id)
          .single();
        if (data?.classic_high_score > (parseInt(local || '0'))) {
          setHighScore(data.classic_high_score);
          await AsyncStorage.setItem('kalimat_classic_highscore', String(data.classic_high_score));
        }
      }
    }
    loadHighScore();
  }, []);

  function startFresh() {
    setCurrentStreak(0);
    setTotalAttempted(0);
    setLastScore(0);
    setGameOver(false);
    // Reset session score state
    setSessionScore(0);
    setWordsInSession(0);
    setIsHotStreak(false);
    setHotStreakCount(0);
    setFinalScore(0);
    setShowLossScreen(false);
    useGameStore.setState({ classicScore: 0, classicWordsSolved: 0, classicMaxStreak: 0 });
    const d = DIFFICULTIES[0];
    const word = language === 'en' ? getRandomEnglishWord().word : getRandomWord(d.wordLength);
    setClassicGame(WordEngine.createGame(word, d.maxAttempts));
    wordStartTime.current = Date.now();
  }

  function nextWord() {
    setLastScore(0);
    const d = getDifficulty(classicWordsSolved);
    const word = language === 'en' ? getRandomEnglishWord().word : getRandomWord(d.wordLength);
    setClassicGame(WordEngine.createGame(word, d.maxAttempts));
    wordStartTime.current = Date.now();
  }

  function onPlayAgain() {
    setSessionScore(0);
    setWordsInSession(0);
    setIsHotStreak(false);
    setHotStreakCount(0);
    setFinalScore(0);
    setShowLossScreen(false);
    setCurrentStreak(0);
    setTotalAttempted(0);
    setLastScore(0);
    setGameOver(false);
    useGameStore.setState({ classicScore: 0, classicWordsSolved: 0, classicMaxStreak: 0 });
    const d = DIFFICULTIES[0];
    const word = language === 'en' ? getRandomEnglishWord().word : getRandomWord(d.wordLength);
    setClassicGame(WordEngine.createGame(word, d.maxAttempts));
    wordStartTime.current = Date.now();
  }

  async function onWordSolved(attempts: number) {
    const durationSeconds = Math.round((Date.now() - wordStartTime.current) / 1000);
    const newWordsInSession = wordsInSession + 1;
    setWordsInSession(newWordsInSession);

    const newHotStreakCount = hotStreakCount + 1;
    setHotStreakCount(newHotStreakCount);
    const newIsHotStreak = newHotStreakCount >= 3;
    setIsHotStreak(newIsHotStreak);

    const currentWord = classicGame?.targetWord || '';
    const scoreResult = calculateWordScore(
      currentWord.length,
      attempts,
      durationSeconds,
      newIsHotStreak,
      wordsInSession
    );

    const newSessionScore = sessionScore + scoreResult.pointsEarned;
    setSessionScore(newSessionScore);
    setLastPointsEarned(scoreResult.pointsEarned);

    setShowScorePopup(true);
    setTimeout(() => setShowScorePopup(false), 1200);

    if (newSessionScore > highScore) {
      setHighScore(newSessionScore);
      await AsyncStorage.setItem('kalimat_classic_highscore', String(newSessionScore));

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        // Use RPC for server-validated score submission
        await supabase.rpc('submit_classic_word', {
          p_word_id: currentWord,
          p_attempts: attempts,
          p_duration_seconds: durationSeconds,
          p_words_in_session: newWordsInSession,
          p_is_hot_streak: newIsHotStreak,
          p_language: language,
        });
      }
    }
  }

  function onWordFailed() {
    setFinalScore(sessionScore);
    setShowLossScreen(true);
    setHotStreakCount(0);
    setIsHotStreak(false);
  }

  const addLetter = useCallback((letter: string) => {
    if (!classicGame || classicGame.gameStatus !== 'playing') return;
    if (classicGame.currentGuess.length >= classicGame.targetWord.length) return;
    setClassicGame({ ...classicGame, currentGuess: classicGame.currentGuess + letter });
  }, [classicGame]);

  const deleteLetter = useCallback(() => {
    if (!classicGame || classicGame.gameStatus !== 'playing') return;
    if (classicGame.currentGuess.length === 0) return;
    setClassicGame({ ...classicGame, currentGuess: classicGame.currentGuess.slice(0, -1) });
  }, [classicGame]);

  const submitGuess = useCallback(() => {
    if (!classicGame || classicGame.gameStatus !== 'playing') return;
    if (classicGame.currentGuess.length !== classicGame.targetWord.length) {
      triggerShake();
      return 'short';
    }
    const wordValid = language === 'en'
      ? isValidEnglishWord(classicGame.currentGuess)
      : isValidWord(classicGame.currentGuess);
    if (!wordValid) {
      triggerShake();
      return 'invalid';
    }

    const newState = WordEngine.submitGuess(classicGame);
    setClassicGame(newState);

    if (newState.gameStatus === 'won') {
      const diffIndex = DIFFICULTIES.indexOf(diff);
      const pts = calculateScore(newState.attempts, diff.wordLength, diffIndex);
      incrementClassicScore(pts);
      incrementClassicWordsSolved();
      setLastScore(pts);
      setTotalAttempted(t => t + 1);
      const newStreak = currentStreak + 1;
      setCurrentStreak(newStreak);
      if (newStreak > classicMaxStreak) setClassicMaxStreak(newStreak);

      // New score engine
      onWordSolved(newState.attempts);
      return 'won';
    } else if (newState.gameStatus === 'lost') {
      setCurrentStreak(0);
      setTotalAttempted(t => t + 1);
      onWordFailed();
      return 'lost';
    }
    return 'playing';
  }, [classicGame, currentStreak, diff, classicMaxStreak, classicWordsSolved, sessionScore, highScore, wordsInSession, hotStreakCount, isHotStreak]);

  function endGame() {
    setGameOver(true);
    saveClassicScore();
  }

  async function saveClassicScore() {
    if (!user || user.id === 'offline') return;
    try {
      await supabase.from('classic_scores').insert({
        player_id: user.id,
        score: classicScore,
        words_solved: classicWordsSolved,
        max_streak: classicMaxStreak,
      });
    } catch {}
  }

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), GAME.SHAKE_DURATION);
  }

  return {
    game: classicGame,
    shake,
    score: classicScore,
    wordsSolved: classicWordsSolved,
    totalAttempted,
    currentStreak,
    maxStreak: classicMaxStreak,
    difficulty: diff,
    lastScore,
    gameOver,
    addLetter,
    deleteLetter,
    submitGuess,
    startFresh,
    nextWord,
    endGame,
    // New score system
    sessionScore,
    highScore,
    isHotStreak,
    showScorePopup,
    lastPointsEarned,
    showLossScreen,
    finalScore,
    onPlayAgain,
  };
}
