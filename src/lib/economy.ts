// Kalimat Economy — Two currency system: Coins (earned) + Gems (premium)

// ─── COIN REWARDS (earned through gameplay only) ───
export const COIN_REWARDS = {
  daily_complete: 3,
  daily_first_attempt: 15,
  daily_second_attempt: 8,
  duel_win: 6,
  duel_participation: 1,
  classic_per_word: 2,
  classic_streak_5: 10,
  classic_streak_10: 25,
  rush_top_10: 12,
  rush_top_100: 6,
  rush_complete: 3,
  blitz_per_word: 3,
  tournament_win_round: 8,
  tournament_champion: 50,
  watch_ad: 8,
  seven_day_streak: 20,
  thirty_day_streak: 75,
  blind_word_win: 40,
  first_time_each_mode: 20,
} as const;

// ─── COIN SPEND COSTS ───
export const COIN_COSTS = {
  hint: 20,
  continue_after_game_over: 40,
  enter_blind_mode: 20,
  tournament_entry: 50,
  skip_hard_word: 30,
} as const;

// ─── GEM REWARDS (very rare from gameplay) ───
export const GEM_REWARDS = {
  tournament_champion: 50,
  tournament_top_4: 20,
  tournament_top_16: 5,
  monthly_streak_30: 10,
  first_purchase_bonus: 5,
} as const;

// ─── GEM PACKS (real money via IAP) ───
export interface GemPack {
  id: string;
  gems: number;
  price: string;
  bonus: number;
  bestValue?: boolean;
}

export const GEM_PACKS: GemPack[] = [
  { id: 'gems_50',   gems: 50,   price: '$0.99',  bonus: 0 },
  { id: 'gems_120',  gems: 120,  price: '$1.99',  bonus: 20 },
  { id: 'gems_300',  gems: 300,  price: '$4.99',  bonus: 80,  bestValue: true },
  { id: 'gems_650',  gems: 650,  price: '$9.99',  bonus: 200 },
  { id: 'gems_1400', gems: 1400, price: '$19.99', bonus: 500 },
];

// ─── EARN INFO (for display in shop) ───
export const COIN_EARN_INFO = [
  { label: 'حلّ كلمة اليوم', amount: COIN_REWARDS.daily_complete, emoji: '🎯' },
  { label: 'حلّها من أول محاولة', amount: COIN_REWARDS.daily_first_attempt, emoji: '🏆' },
  { label: 'حلّها من ثاني محاولة', amount: COIN_REWARDS.daily_second_attempt, emoji: '🥈' },
  { label: 'فوز بالتحدي', amount: COIN_REWARDS.duel_win, emoji: '⚡' },
  { label: 'مشاركة بالتحدي', amount: COIN_REWARDS.duel_participation, emoji: '🤝' },
  { label: 'كلاسيكي — كل كلمة', amount: COIN_REWARDS.classic_per_word, emoji: '♾️' },
  { label: 'سلسلة 5 كلمات كلاسيكي', amount: COIN_REWARDS.classic_streak_5, emoji: '🔥' },
  { label: 'سلسلة 10 كلمات كلاسيكي', amount: COIN_REWARDS.classic_streak_10, emoji: '💪' },
  { label: 'كلمة الساعة — أفضل 10', amount: COIN_REWARDS.rush_top_10, emoji: '⏰' },
  { label: 'كلمة الساعة — أفضل 100', amount: COIN_REWARDS.rush_top_100, emoji: '📊' },
  { label: 'إكمال كلمة الساعة', amount: COIN_REWARDS.rush_complete, emoji: '✅' },
  { label: 'تحدي الفئة — كل كلمة', amount: COIN_REWARDS.blitz_per_word, emoji: '💥' },
  { label: 'جولة في المسابقة', amount: COIN_REWARDS.tournament_win_round, emoji: '🏅' },
  { label: 'بطل المسابقة', amount: COIN_REWARDS.tournament_champion, emoji: '👑' },
  { label: 'فوز بالعمياء', amount: COIN_REWARDS.blind_word_win, emoji: '👁️' },
  { label: 'شاهد إعلاناً', amount: COIN_REWARDS.watch_ad, emoji: '📺' },
  { label: 'سلسلة 7 أيام', amount: COIN_REWARDS.seven_day_streak, emoji: '🔥' },
  { label: 'سلسلة 30 يوم', amount: COIN_REWARDS.thirty_day_streak, emoji: '🌟' },
  { label: 'أول مرة لكل نمط', amount: COIN_REWARDS.first_time_each_mode, emoji: '🆕' },
];
