export interface ScoreResult {
  pointsEarned: number
  breakdown: {
    base: number
    attemptsBonus: number
    speedBonus: number
    hotStreakMultiplier: number
    difficultyMultiplier: number
  }
}

export function calculateWordScore(
  wordLength: number,
  attempts: number,
  durationSeconds: number,
  isHotStreak: boolean,
  wordsInSession: number
): ScoreResult {
  // Base: word length × 20
  const base = wordLength * 20

  // Attempts bonus: fewer attempts = more points
  const attemptsBonus = (7 - attempts) * 15

  // Speed bonus: solving under 60 seconds earns extra
  const speedBonus = Math.max(0, 60 - durationSeconds)

  // Difficulty multiplier: gets harder as session progresses
  const difficultyMultiplier = 1 + Math.min(wordsInSession * 0.1, 1.5) // max 2.5×

  // Hot streak multiplier: 3× when on a hot streak
  const hotStreakMultiplier = isHotStreak ? 3 : 1

  const raw = (base + attemptsBonus + speedBonus) * difficultyMultiplier
  const pointsEarned = Math.round(raw * hotStreakMultiplier)

  return {
    pointsEarned,
    breakdown: { base, attemptsBonus, speedBonus, hotStreakMultiplier, difficultyMultiplier }
  }
}
