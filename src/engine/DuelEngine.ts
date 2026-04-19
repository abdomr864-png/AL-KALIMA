import { supabase } from '../lib/supabase';
import { getRandomWord } from '../lib/words';
import { getRandomEnglishWord } from '../lib/words_en';
import { WordEngine, type GuessResult } from './WordEngine';

export interface DuelState {
  duelId: string;
  word: string;
  wordLength: number;
  myId: string;
  opponentId: string | null;
  status: 'waiting' | 'active' | 'finished';
  myGuesses: string[];
  myResults: GuessResult[];
  opponentAttempts: number;
  opponentFinished: boolean;
  opponentSuccess: boolean | null;
  winnerId: string | null;
  startTime: number;
}

export class DuelEngine {
  /**
   * Find or create a duel match.
   * Looks for waiting duels first, creates one if none found.
   */
  static async findOrCreateDuel(playerId: string, language: 'ar' | 'en' = 'ar'): Promise<{ duelId: string; word: string; isCreator: boolean }> {
    // Look for a waiting duel — ONLY match same language
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
    const { data: waiting } = await supabase
      .from('duels')
      .select('id, word')
      .eq('status', 'waiting')
      .eq('language', language)
      .is('player2_id', null)
      .neq('player1_id', playerId)
      .gte('created_at', thirtySecondsAgo)
      .limit(1)
      .single();

    if (waiting) {
      // Join existing duel
      await supabase
        .from('duels')
        .update({ player2_id: playerId, status: 'active' })
        .eq('id', waiting.id);

      return { duelId: waiting.id, word: waiting.word, isCreator: false };
    }

    // Create new duel
    const word = language === 'en'
      ? getRandomEnglishWord().word
      : getRandomWord(5);
    const { data: newDuel, error } = await supabase
      .from('duels')
      .insert({
        word,
        word_length: 5,
        player1_id: playerId,
        status: 'waiting',
        language,
      })
      .select('id')
      .single();

    if (error || !newDuel) throw new Error('Failed to create duel');

    return { duelId: newDuel.id, word, isCreator: true };
  }

  /** Submit a guess in a duel */
  static async submitDuelGuess(
    duelId: string,
    playerId: string,
    guess: string,
    target: string,
    attemptNumber: number
  ): Promise<GuessResult> {
    const result = WordEngine.scoreGuess(guess, target);

    await supabase.from('duel_moves').insert({
      duel_id: duelId,
      player_id: playerId,
      attempt_number: attemptNumber,
      guess,
      result: JSON.stringify(result),
    });

    return result;
  }

  /** Mark a player as finished in a duel */
  static async finishDuel(
    duelId: string,
    playerId: string,
    isPlayer1: boolean,
    success: boolean,
    attempts: number,
    durationSeconds: number
  ) {
    const updates: Record<string, unknown> = {};
    const prefix = isPlayer1 ? 'player1' : 'player2';
    updates[`${prefix}_success`] = success;
    updates[`${prefix}_attempts`] = attempts;
    updates[`${prefix}_duration`] = durationSeconds;

    await supabase.from('duels').update(updates).eq('id', duelId);

    // Check if both players are done
    const { data: duel } = await supabase
      .from('duels')
      .select('*')
      .eq('id', duelId)
      .single();

    if (duel && duel.player1_attempts != null && duel.player2_attempts != null) {
      // Both done — determine winner
      let winnerId: string | null = null;
      if (duel.player1_success && !duel.player2_success) {
        winnerId = duel.player1_id;
      } else if (!duel.player1_success && duel.player2_success) {
        winnerId = duel.player2_id;
      } else if (duel.player1_success && duel.player2_success) {
        // Both solved: fewer attempts wins, then faster time
        if (duel.player1_attempts < duel.player2_attempts) {
          winnerId = duel.player1_id;
        } else if (duel.player2_attempts < duel.player1_attempts) {
          winnerId = duel.player2_id;
        } else if (duel.player1_duration < duel.player2_duration) {
          winnerId = duel.player1_id;
        } else {
          winnerId = duel.player2_id;
        }
      }

      await supabase
        .from('duels')
        .update({ status: 'finished', winner_id: winnerId })
        .eq('id', duelId);
    }
  }

  /** Subscribe to duel updates */
  static subscribeToDuel(
    duelId: string,
    onMove: (move: { player_id: string; attempt_number: number; result: string }) => void,
    onStatusChange: (duel: Record<string, unknown>) => void
  ) {
    const movesChannel = supabase
      .channel(`duel_moves:${duelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'duel_moves',
          filter: `duel_id=eq.${duelId}`,
        },
        (payload) => onMove(payload.new as any)
      )
      .subscribe();

    const statusChannel = supabase
      .channel(`duel_status:${duelId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'duels',
          filter: `id=eq.${duelId}`,
        },
        (payload) => onStatusChange(payload.new as any)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(movesChannel);
      supabase.removeChannel(statusChannel);
    };
  }
}
