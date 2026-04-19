import { useState, useEffect, useCallback, useRef } from 'react';
import { DuelEngine, type DuelState } from '../engine/DuelEngine';
import { WordEngine } from '../engine/WordEngine';
import { isValidWord } from '../lib/words';
import { isValidEnglishWord } from '../lib/words_en';
import { useUserStore } from '../store/userStore';
import { supabase } from '../lib/supabase';
import { GAME } from '../lib/constants';
import { useLanguage } from '../lib/LanguageContext';

export function useDuel() {
  const { user } = useUserStore();
  const { updateCoins } = useUserStore();
  const { language } = useLanguage();
  const [duelState, setDuelState] = useState<DuelState | null>(null);
  const [myGame, setMyGame] = useState(WordEngine.createGame('', GAME.MAX_ATTEMPTS));
  const [isSearching, setIsSearching] = useState(false);
  const [shake, setShake] = useState(false);
  const [isPlayer1, setIsPlayer1] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      unsubRef.current?.();
    };
  }, []);

  async function startMatchmaking() {
    if (!user) return;
    setIsSearching(true);

    try {
      const { duelId, word, isCreator } = await DuelEngine.findOrCreateDuel(user.id, language);
      setIsPlayer1(isCreator);

      const state: DuelState = {
        duelId,
        word,
        wordLength: word.length,
        myId: user.id,
        opponentId: null,
        status: isCreator ? 'waiting' : 'active',
        myGuesses: [],
        myResults: [],
        opponentAttempts: 0,
        opponentFinished: false,
        opponentSuccess: null,
        winnerId: null,
        startTime: Date.now(),
      };

      setDuelState(state);
      setMyGame(WordEngine.createGame(word, GAME.MAX_ATTEMPTS));

      // Subscribe to realtime updates
      const unsub = DuelEngine.subscribeToDuel(
        duelId,
        (move) => {
          if (move.player_id !== user.id) {
            setDuelState((prev) => {
              if (!prev) return prev;
              const result = JSON.parse(move.result);
              const isWin = result.every((r: string) => r === 'correct');
              return {
                ...prev,
                opponentAttempts: move.attempt_number,
                opponentFinished: isWin || move.attempt_number >= GAME.MAX_ATTEMPTS,
                opponentSuccess: isWin ? true : move.attempt_number >= GAME.MAX_ATTEMPTS ? false : prev.opponentSuccess,
              };
            });
          }
        },
        (duel: any) => {
          if (duel.status === 'active') {
            setIsSearching(false);
            setDuelState((prev) => prev ? { ...prev, status: 'active', opponentId: duel.player2_id || duel.player1_id } : prev);
          }
          if (duel.status === 'finished') {
            setDuelState((prev) => prev ? { ...prev, status: 'finished', winnerId: duel.winner_id } : prev);
            // Award coins
            if (duel.winner_id === user.id) {
              updateCoins(GAME.DUEL_WIN_COINS);
              supabase.rpc('add_coins', { amount: GAME.DUEL_WIN_COINS, reason: 'duel_win' }).then(() => {});
            } else {
              updateCoins(GAME.DUEL_PARTICIPATE_COINS);
              supabase.rpc('add_coins', { amount: GAME.DUEL_PARTICIPATE_COINS, reason: 'duel_win' }).then(() => {});
            }
          }
        }
      );
      unsubRef.current = unsub;

      // Timeout for matchmaking
      if (isCreator) {
        setTimeout(() => {
          setDuelState((prev) => {
            if (prev && prev.status === 'waiting') {
              setIsSearching(false);
              return { ...prev, status: 'active' }; // Play vs "computer" (just play alone)
            }
            return prev;
          });
        }, GAME.MATCHMAKING_TIMEOUT_MS);
      } else {
        setIsSearching(false);
      }
    } catch (err) {
      console.error('Matchmaking error:', err);
      setIsSearching(false);
    }
  }

  const addLetter = useCallback((letter: string) => {
    if (myGame.gameStatus !== 'playing') return;
    if (myGame.currentGuess.length >= (duelState?.wordLength || 5)) return;
    setMyGame({ ...myGame, currentGuess: myGame.currentGuess + letter });
  }, [myGame, duelState]);

  const deleteLetter = useCallback(() => {
    if (myGame.gameStatus !== 'playing') return;
    if (myGame.currentGuess.length === 0) return;
    setMyGame({ ...myGame, currentGuess: myGame.currentGuess.slice(0, -1) });
  }, [myGame]);

  const submitGuess = useCallback(async () => {
    if (!duelState || !user || myGame.gameStatus !== 'playing') return;
    if (myGame.currentGuess.length !== duelState.wordLength) {
      setShake(true);
      setTimeout(() => setShake(false), GAME.SHAKE_DURATION);
      return;
    }
    const wordValid = language === 'en'
      ? isValidEnglishWord(myGame.currentGuess)
      : isValidWord(myGame.currentGuess);
    if (!wordValid) {
      setShake(true);
      setTimeout(() => setShake(false), GAME.SHAKE_DURATION);
      return;
    }

    const attemptNum = myGame.attempts + 1;
    const result = await DuelEngine.submitDuelGuess(
      duelState.duelId,
      user.id,
      myGame.currentGuess,
      duelState.word,
      attemptNum
    );

    const newState = WordEngine.submitGuess(myGame);
    setMyGame(newState);

    if (newState.gameStatus !== 'playing') {
      const duration = Math.floor((Date.now() - duelState.startTime) / 1000);
      await DuelEngine.finishDuel(
        duelState.duelId,
        user.id,
        isPlayer1,
        newState.gameStatus === 'won',
        newState.attempts,
        duration
      );
    }
  }, [myGame, duelState, user, isPlayer1]);

  function cleanup() {
    unsubRef.current?.();
    unsubRef.current = null;
    setDuelState(null);
    setIsSearching(false);
  }

  return {
    duelState,
    myGame,
    isSearching,
    shake,
    addLetter,
    deleteLetter,
    submitGuess,
    startMatchmaking,
    cleanup,
  };
}
