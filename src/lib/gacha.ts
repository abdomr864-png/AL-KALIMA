// Kalimat Gacha System — Tickets, Spin Tiers, Prize Pools

// ─── TICKET TYPES ───
export const TICKET_TYPES = {
  BRONZE: {
    id: 'bronze' as const,
    name: 'تذكرة برونزية',
    emoji: '🎫',
    color: '#92400E',
    borderColor: '#D97706',
    bgColor: '#1C1208',
    spinCost: 5,
    description: 'دوران عادي — جوائز بسيطة',
  },
  SILVER: {
    id: 'silver' as const,
    name: 'تذكرة فضية',
    emoji: '🎟️',
    color: '#6B7280',
    borderColor: '#9CA3AF',
    bgColor: '#111827',
    spinCost: 15,
    description: 'دوران نادر — جوائز متوسطة',
  },
  GOLDEN: {
    id: 'golden' as const,
    name: 'تذكرة ذهبية',
    emoji: '🏮',
    color: '#B45309',
    borderColor: '#F59E0B',
    bgColor: '#1C1208',
    spinCost: 50,
    description: 'دوران أسطوري — جوائز حصرية',
  },
} as const;

export type TicketTier = 'bronze' | 'silver' | 'golden';

// ─── TICKET EARN RULES ───
export const TICKET_EARN = {
  // Bronze tickets (common)
  watch_ad:             { bronze: 2 },
  daily_complete:       { bronze: 1 },
  duel_participation:   { bronze: 1 },
  blitz_complete:       { bronze: 2 },
  rush_complete:        { bronze: 1 },

  // Silver tickets (less common)
  duel_win:             { silver: 1 },
  daily_streak_7:       { silver: 3 },
  rush_top_10:          { silver: 2 },
  blitz_10_words:       { silver: 2 },
  classic_streak_10:    { silver: 1 },
  tournament_win_round: { silver: 2 },

  // Golden tickets (rare)
  daily_first_attempt:  { golden: 1 },
  tournament_champion:  { golden: 5 },
  blind_win:            { golden: 2 },
  daily_streak_30:      { golden: 3 },
  watch_5_ads_in_day:   { golden: 1 },
} as const;

// ─── PRIZE TYPES ───
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'exclusive';

export interface PrizeReward {
  type: 'coins' | 'gems' | 'icon' | 'border' | 'theme' | 'tile_style' | 'win_animation' | 'bronze_tickets' | 'silver_tickets' | 'golden_tickets';
  amount?: number;
  id?: string;
}

export interface Prize {
  id: string;
  emoji: string;
  name: string;
  shortName: string;
  rarity: Rarity;
  reward: PrizeReward;
  weight: number;
}

// ─── BRONZE SPIN (5 tickets) — common to epic ───
export const BRONZE_PRIZES: Prize[] = [
  { id: 'coins_20',     emoji: '🪙', name: '20 عملة',       shortName: '20🪙',  rarity: 'common', reward: { type: 'coins', amount: 20 },            weight: 25 },
  { id: 'coins_35',     emoji: '🪙', name: '35 عملة',       shortName: '35🪙',  rarity: 'common', reward: { type: 'coins', amount: 35 },            weight: 20 },
  { id: 'bronze_3',     emoji: '🎫', name: '3 تذاكر برونز',  shortName: '3🎫',   rarity: 'common', reward: { type: 'bronze_tickets', amount: 3 },   weight: 15 },
  { id: 'coins_75',     emoji: '🪙', name: '75 عملة',       shortName: '75🪙',  rarity: 'rare',   reward: { type: 'coins', amount: 75 },            weight: 15 },
  { id: 'silver_2',     emoji: '🎟️', name: '2 تذاكر فضية',  shortName: '2🎟️',   rarity: 'rare',   reward: { type: 'silver_tickets', amount: 2 },   weight: 10 },
  { id: 'theme_desert', emoji: '🏜️', name: 'ثيم الصحراء',   shortName: 'ثيم',   rarity: 'rare',   reward: { type: 'theme', id: 'desert' },          weight: 5 },
  { id: 'gems_5',       emoji: '💎', name: '5 جواهر',       shortName: '5💎',   rarity: 'epic',   reward: { type: 'gems', amount: 5 },              weight: 6 },
  { id: 'icon_star',    emoji: '⭐', name: 'أيقونة نجمة',   shortName: '⭐أيق', rarity: 'epic',   reward: { type: 'icon', id: 'star' },             weight: 4 },
];

// ─── SILVER SPIN (15 tickets) — rare to legendary ───
export const SILVER_PRIZES: Prize[] = [
  { id: 'coins_150',   emoji: '🪙', name: '150 عملة',       shortName: '150🪙',  rarity: 'rare',      reward: { type: 'coins', amount: 150 },           weight: 20 },
  { id: 'coins_200',   emoji: '🪙', name: '200 عملة',       shortName: '200🪙',  rarity: 'rare',      reward: { type: 'coins', amount: 200 },           weight: 15 },
  { id: 'silver_5',    emoji: '🎟️', name: '5 تذاكر فضية',   shortName: '5🎟️',    rarity: 'rare',      reward: { type: 'silver_tickets', amount: 5 },    weight: 15 },
  { id: 'gems_15',     emoji: '💎', name: '15 جواهر',       shortName: '15💎',   rarity: 'epic',      reward: { type: 'gems', amount: 15 },             weight: 15 },
  { id: 'icon_crown',  emoji: '👑', name: 'أيقونة تاج',     shortName: '👑أيق',  rarity: 'epic',      reward: { type: 'icon', id: 'crown' },            weight: 10 },
  { id: 'tile_neon',   emoji: '✨', name: 'خانات نيون',     shortName: 'نيون',   rarity: 'epic',      reward: { type: 'tile_style', id: 'neon' },       weight: 10 },
  { id: 'gems_30',     emoji: '💎', name: '30 جواهر',       shortName: '30💎',   rarity: 'legendary', reward: { type: 'gems', amount: 30 },             weight: 8 },
  { id: 'border_fire', emoji: '🔥', name: 'إطار ناري',      shortName: '🔥إطار', rarity: 'legendary', reward: { type: 'border', id: 'fire_ring' },      weight: 7 },
];

// ─── GOLDEN SPIN (50 tickets) — epic to exclusive ───
export const GOLDEN_PRIZES: Prize[] = [
  { id: 'gems_40',             emoji: '💎', name: '40 جواهر',            shortName: '40💎',   rarity: 'epic',      reward: { type: 'gems', amount: 40 },             weight: 20 },
  { id: 'golden_3',            emoji: '🏮', name: '3 تذاكر ذهبية',       shortName: '3🏮',    rarity: 'epic',      reward: { type: 'golden_tickets', amount: 3 },    weight: 15 },
  { id: 'icon_lion',           emoji: '🦁', name: 'أيقونة الأسد',        shortName: '🦁أيق',  rarity: 'epic',      reward: { type: 'icon', id: 'lion' },             weight: 15 },
  { id: 'gems_80',             emoji: '💎', name: '80 جواهر',            shortName: '80💎',   rarity: 'legendary', reward: { type: 'gems', amount: 80 },             weight: 15 },
  { id: 'border_galaxy',       emoji: '🌌', name: 'إطار مجرة',           shortName: '🌌إطار', rarity: 'legendary', reward: { type: 'border', id: 'galaxy_ring' },    weight: 15 },
  { id: 'win_anim_fireworks',  emoji: '🎆', name: 'انتصار ألعاب نارية',  shortName: '🎆فوز',  rarity: 'legendary', reward: { type: 'win_animation', id: 'fireworks' }, weight: 10 },
  { id: 'gems_150',            emoji: '💎', name: '150 جواهر',           shortName: '150💎',  rarity: 'exclusive', reward: { type: 'gems', amount: 150 },            weight: 5 },
  { id: 'icon_galaxy',         emoji: '🌌', name: 'أيقونة المجرة',       shortName: '🌌أيق',  rarity: 'exclusive', reward: { type: 'icon', id: 'galaxy' },           weight: 5 },
];

// ─── RARITY COLORS ───
export const RARITY_COLORS: Record<Rarity, { bg: string; border: string; text: string; label: string }> = {
  common:    { bg: '#1A3A1A', border: '#22C55E', text: '#22C55E', label: 'عادي' },
  rare:      { bg: '#1A2A5E', border: '#3B82F6', text: '#93C5FD', label: 'نادر' },
  epic:      { bg: '#2D1B69', border: '#7C3AED', text: '#C4B5FD', label: 'ملحمي' },
  legendary: { bg: '#3D1A00', border: '#F59E0B', text: '#FCD34D', label: 'أسطوري' },
  exclusive: { bg: '#3D0020', border: '#EC4899', text: '#F9A8D4', label: 'حصري' },
};

// ─── HELPERS ───
export function getPrizesForTier(tier: TicketTier): Prize[] {
  switch (tier) {
    case 'bronze': return BRONZE_PRIZES;
    case 'silver': return SILVER_PRIZES;
    case 'golden': return GOLDEN_PRIZES;
  }
}

export function determineWinner(tier: TicketTier): Prize {
  const prizes = getPrizesForTier(tier);
  const totalWeight = prizes.reduce((sum, p) => sum + p.weight, 0);
  let random = Math.random() * totalWeight;
  for (const prize of prizes) {
    random -= prize.weight;
    if (random <= 0) return prize;
  }
  return prizes[0];
}

export function getTicketType(tier: TicketTier) {
  return TICKET_TYPES[tier.toUpperCase() as keyof typeof TICKET_TYPES];
}

export function getSpinCost(tier: TicketTier): number {
  return getTicketType(tier).spinCost;
}

export function getPrizeDescription(prize: Prize): string {
  switch (prize.reward.type) {
    case 'coins':           return `تمت إضافة ${prize.reward.amount} عملة لرصيدك`;
    case 'gems':            return `تمت إضافة ${prize.reward.amount} جوهرة لرصيدك`;
    case 'icon':            return 'تمت إضافة الأيقونة لملفك الشخصي';
    case 'border':          return 'تمت إضافة الإطار المتحرك لملفك الشخصي';
    case 'theme':           return 'تم فتح ثيم جديد — فعّله من المتجر';
    case 'tile_style':      return 'تم فتح شكل خانات جديد — فعّله من المتجر';
    case 'win_animation':   return 'تم فتح تأثير انتصار جديد';
    case 'bronze_tickets':  return `تمت إضافة ${prize.reward.amount} تذاكر برونزية`;
    case 'silver_tickets':  return `تمت إضافة ${prize.reward.amount} تذاكر فضية`;
    case 'golden_tickets':  return `تمت إضافة ${prize.reward.amount} تذاكر ذهبية`;
    default:                return 'تم استلام جائزتك!';
  }
}
