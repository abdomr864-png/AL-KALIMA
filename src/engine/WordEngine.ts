export type LetterResult = 'correct' | 'present' | 'absent';
export type GuessResult = LetterResult[];

export interface GameState {
  targetWord: string;
  guesses: string[];
  results: GuessResult[];
  currentGuess: string;
  gameStatus: 'playing' | 'won' | 'lost';
  attempts: number;
  maxAttempts: number;
  startTime: number;
}

const NORMALIZATIONS: Record<string, string> = {
  'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا',
  'ة': 'ت',
  'ى': 'ي',
  'ؤ': 'و',
  'ئ': 'ي',
};

export class WordEngine {
  /**
   * Normalize an Arabic letter for comparison.
   * Treats alef variants, taa marbouta/taa, and yaa variants as equivalent.
   * For English letters, returns uppercase with no normalization.
   */
  static normalizeLetter(letter: string): string {
    // English letter — just uppercase, no Arabic normalization
    if (/[A-Za-z]/.test(letter)) return letter.toUpperCase();
    return NORMALIZATIONS[letter] || letter;
  }

  /**
   * Score a guess against the target word.
   * Returns an array of LetterResult ('correct' | 'present' | 'absent') for each position.
   *
   * Two-pass algorithm:
   * 1. Mark exact matches as 'correct', track remaining target letter counts
   * 2. Mark letters present elsewhere as 'present', decrementing counts
   */
  static scoreGuess(guess: string, target: string): GuessResult {
    const guessLetters = [...guess];
    const targetLetters = [...target];
    const len = guessLetters.length;
    const result: LetterResult[] = new Array(len).fill('absent');
    const targetCounts: Record<string, number> = {};

    // First pass: mark correct positions and build remaining counts
    for (let i = 0; i < len; i++) {
      const gNorm = WordEngine.normalizeLetter(guessLetters[i]);
      const tNorm = WordEngine.normalizeLetter(targetLetters[i]);
      if (gNorm === tNorm) {
        result[i] = 'correct';
      } else {
        targetCounts[tNorm] = (targetCounts[tNorm] || 0) + 1;
      }
    }

    // Second pass: mark present letters
    for (let i = 0; i < len; i++) {
      if (result[i] === 'correct') continue;
      const gNorm = WordEngine.normalizeLetter(guessLetters[i]);
      if ((targetCounts[gNorm] || 0) > 0) {
        result[i] = 'present';
        targetCounts[gNorm]--;
      }
    }

    return result;
  }

  /**
   * Build a map of letter → best state from all guesses so far.
   * Priority: correct > present > absent
   */
  static getKeyboardStates(
    guesses: string[],
    results: GuessResult[]
  ): Record<string, LetterResult> {
    const states: Record<string, LetterResult> = {};
    guesses.forEach((guess, gi) => {
      [...guess].forEach((letter, li) => {
        const norm = WordEngine.normalizeLetter(letter);
        const current = states[norm];
        const newResult = results[gi][li];
        // correct beats everything, present beats absent
        if (current === 'correct') return;
        if (current === 'present' && newResult !== 'correct') return;
        states[norm] = newResult;
      });
    });
    return states;
  }

  /**
   * Build keyboard states for English — keys are uppercase letters (A-Z).
   */
  static getKeyboardStatesEN(
    guesses: string[],
    results: GuessResult[]
  ): Record<string, LetterResult> {
    const states: Record<string, LetterResult> = {};
    guesses.forEach((guess, gi) => {
      [...guess].forEach((letter, li) => {
        const key = letter.toUpperCase();
        const current = states[key];
        const newResult = results[gi][li];
        if (current === 'correct') return;
        if (current === 'present' && newResult !== 'correct') return;
        states[key] = newResult;
      });
    });
    return states;
  }

  /** Check if the last guess was a win */
  static isWon(results: GuessResult[]): boolean {
    if (results.length === 0) return false;
    return results[results.length - 1].every((r) => r === 'correct');
  }

  /** Create initial game state */
  static createGame(targetWord: string, maxAttempts = 6): GameState {
    return {
      targetWord,
      guesses: [],
      results: [],
      currentGuess: '',
      gameStatus: 'playing',
      attempts: 0,
      maxAttempts,
      startTime: Date.now(),
    };
  }

  /** Process a guess submission and return updated game state */
  static submitGuess(state: GameState): GameState {
    const guess = state.currentGuess;
    const result = WordEngine.scoreGuess(guess, state.targetWord);
    const guesses = [...state.guesses, guess];
    const results = [...state.results, result];
    const attempts = state.attempts + 1;

    let gameStatus: GameState['gameStatus'] = 'playing';
    if (WordEngine.isWon(results)) {
      gameStatus = 'won';
    } else if (attempts >= state.maxAttempts) {
      gameStatus = 'lost';
    }

    return {
      ...state,
      guesses,
      results,
      currentGuess: '',
      gameStatus,
      attempts,
    };
  }
}
