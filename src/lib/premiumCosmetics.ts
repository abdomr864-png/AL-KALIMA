// Premium cosmetics — profile icons, animated borders, win animations

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type CosmeticCurrency = 'free' | 'coins' | 'gems' | 'achievement';

// ─── RARITY COLORS ───
export const RARITY_COLORS: Record<Rarity, {
  bg: string; border: string; text: string; label: string; animated?: boolean;
}> = {
  common:    { bg: '#1F2937', border: '#374151', text: '#9CA3AF', label: 'عادي' },
  rare:      { bg: '#1E3A5F', border: '#3B82F6', text: '#93C5FD', label: 'نادر' },
  epic:      { bg: '#2D1B69', border: '#7C3AED', text: '#C4B5FD', label: 'ملحمي' },
  legendary: { bg: '#3D1A00', border: '#F59E0B', text: '#FCD34D', label: 'أسطوري', animated: true },
  mythic:    { bg: '#2D0A3E', border: '#EC4899', text: '#F9A8D4', label: 'خرافي', animated: true },
};

// ─── PROFILE ICONS ───
export interface ProfileIcon {
  id: string;
  emoji: string;
  name: string;
  price: number;
  currency: CosmeticCurrency;
  rarity: Rarity;
  requirement?: string;
}

export const PROFILE_ICONS: ProfileIcon[] = [
  // Free
  { id: 'default_purple', emoji: '🟣', name: 'بنفسجي', price: 0, currency: 'free', rarity: 'common' },
  { id: 'default_blue',   emoji: '🔵', name: 'أزرق',   price: 0, currency: 'free', rarity: 'common' },

  // Coin icons
  { id: 'star',      emoji: '⭐', name: 'نجمة',  price: 80,  currency: 'coins', rarity: 'common' },
  { id: 'fire',      emoji: '🔥', name: 'نار',    price: 80,  currency: 'coins', rarity: 'common' },
  { id: 'brain',     emoji: '🧠', name: 'عقل',    price: 100, currency: 'coins', rarity: 'common' },
  { id: 'lightning', emoji: '⚡', name: 'برق',    price: 100, currency: 'coins', rarity: 'common' },
  { id: 'crown',     emoji: '👑', name: 'تاج',    price: 150, currency: 'coins', rarity: 'rare' },
  { id: 'diamond_icon', emoji: '💎', name: 'ماسة', price: 200, currency: 'coins', rarity: 'rare' },

  // Gem icons (exclusive)
  { id: 'arabic_calligraphy', emoji: '🖊️', name: 'خط عربي', price: 30, currency: 'gems', rarity: 'epic' },
  { id: 'falcon',   emoji: '🦅', name: 'صقر',      price: 40, currency: 'gems', rarity: 'epic' },
  { id: 'crescent', emoji: '🌙', name: 'هلال ذهبي', price: 50, currency: 'gems', rarity: 'epic' },
  { id: 'sword',    emoji: '⚔️', name: 'سيف',       price: 40, currency: 'gems', rarity: 'epic' },
  { id: 'lion',     emoji: '🦁', name: 'أسد',       price: 60, currency: 'gems', rarity: 'legendary' },
  { id: 'dragon',   emoji: '🐉', name: 'تنين',      price: 80, currency: 'gems', rarity: 'legendary' },
  { id: 'galaxy',   emoji: '🌌', name: 'مجرة',      price: 100, currency: 'gems', rarity: 'legendary' },

  // Achievement unlocks
  { id: 'champion', emoji: '🏆', name: 'بطل', price: 0, currency: 'achievement',
    requirement: 'فوز بمسابقة أسبوعية', rarity: 'legendary' },
  { id: 'streak_master', emoji: '🔥', name: 'سيد السلاسل', price: 0, currency: 'achievement',
    requirement: 'سلسلة 30 يوم', rarity: 'epic' },
  { id: 'blind_master', emoji: '👁️', name: 'أعمى البصير', price: 0, currency: 'achievement',
    requirement: 'فوز بالعمياء 10 مرات', rarity: 'legendary' },
];

// ─── AVATAR BORDERS ───
export type BorderAnimation = 'fire' | 'stars' | 'rainbow' | 'electric' | 'gold_spin' | 'galaxy' | null;

export interface AvatarBorder {
  id: string;
  name: string;
  price: number;
  currency: CosmeticCurrency;
  animation: BorderAnimation;
}

export const AVATAR_BORDERS: AvatarBorder[] = [
  { id: 'none',        name: 'بدون إطار',  price: 0,   currency: 'free',  animation: null },
  { id: 'fire_ring',   name: 'حلقة نار',   price: 60,  currency: 'gems',  animation: 'fire' },
  { id: 'stars',       name: 'نجوم',       price: 50,  currency: 'gems',  animation: 'stars' },
  { id: 'rainbow',     name: 'قوس قزح',    price: 80,  currency: 'gems',  animation: 'rainbow' },
  { id: 'electric',    name: 'كهربائي',    price: 70,  currency: 'gems',  animation: 'electric' },
  { id: 'gold_spin',   name: 'ذهبي دوار',  price: 100, currency: 'gems',  animation: 'gold_spin' },
  { id: 'galaxy_ring', name: 'مجرة',       price: 150, currency: 'gems',  animation: 'galaxy' },
];

// ─── WIN ANIMATIONS ───
export interface WinAnimation {
  id: string;
  name: string;
  nameEn?: string;
  price: number;
  currency: CosmeticCurrency;
  preview: string;
  rarity?: Rarity;
  anime?: string;
}

export const WIN_ANIMATIONS: WinAnimation[] = [
  { id: 'default',    name: 'افتراضي',     price: 0,   currency: 'free',  preview: '🎉' },
  { id: 'fireworks',  name: 'ألعاب نارية', price: 40,  currency: 'gems',  preview: '🎆' },
  { id: 'confetti',   name: 'كونفيتي',     price: 40,  currency: 'gems',  preview: '🎊' },
  { id: 'stars_fall', name: 'نجوم ساقطة',  price: 50,  currency: 'gems',  preview: '⭐' },
  { id: 'gold_rain',  name: 'مطر ذهبي',    price: 60,  currency: 'gems',  preview: '💰' },
  { id: 'arabic_calligraphy_burst', name: 'خط عربي', price: 80, currency: 'gems', preview: '✍️' },
  { id: 'galaxy_explosion', name: 'انفجار مجري', price: 100, currency: 'gems', preview: '🌌' },

  // Anime collection
  { id: 'breath_of_fire',  name: 'نفس اللهب',   nameEn: 'Breath of Fire',      preview: '🔥', price: 90,  currency: 'gems', rarity: 'epic',      anime: 'Demon Slayer' },
  { id: 'rasengan',         name: 'رنسجان',       nameEn: 'Rasengan',            preview: '🌀', price: 100, currency: 'gems', rarity: 'epic',      anime: 'Naruto' },
  { id: 'thunder_spear',    name: 'رمح الرعد',    nameEn: 'Thunder Spear',       preview: '⚡', price: 110, currency: 'gems', rarity: 'legendary', anime: 'Attack on Titan' },
  { id: 'spirit_bomb',      name: 'درع الطاقة',   nameEn: 'Spirit Bomb',         preview: '🔵', price: 120, currency: 'gems', rarity: 'legendary', anime: 'Dragon Ball' },
  { id: 'conquerors_haki',   name: 'هاكي الملوك',  nameEn: "Conqueror's Haki",    preview: '👑', price: 130, currency: 'gems', rarity: 'legendary', anime: 'One Piece' },
  { id: 'hollow_purple',    name: 'أرجواني فارغ',  nameEn: 'Hollow Purple',       preview: '🟣', price: 150, currency: 'gems', rarity: 'mythic',    anime: 'Jujutsu Kaisen' },
];

// ─── PROFILE BACKGROUND THEMES ───
export interface ProfileBgTheme {
  id: string;
  name: string;
  emoji: string;
  price: number;
  currency: CosmeticCurrency;
  rarity: Rarity;
}

export const PROFILE_BG_THEMES: ProfileBgTheme[] = [
  { id: 'none',        name: 'بدون خلفية',    emoji: '⬛', price: 0,   currency: 'free',  rarity: 'common' },
  { id: 'sakura',      name: 'أزهار الكرز',   emoji: '🌸', price: 40,  currency: 'gems',  rarity: 'rare' },
  { id: 'galaxy',      name: 'الفضاء',         emoji: '🌌', price: 50,  currency: 'gems',  rarity: 'epic' },
  { id: 'ocean_wave',  name: 'أمواج المحيط',  emoji: '🌊', price: 40,  currency: 'gems',  rarity: 'rare' },
  { id: 'dragon_fire', name: 'نار التنين',     emoji: '🔥', price: 70,  currency: 'gems',  rarity: 'epic' },
  { id: 'matrix',      name: 'المصفوفة',       emoji: '💚', price: 60,  currency: 'gems',  rarity: 'epic' },
  { id: 'aurora',      name: 'الشفق القطبي',  emoji: '🌈', price: 80,  currency: 'gems',  rarity: 'legendary' },
  { id: 'desert_wind', name: 'رياح الصحراء',  emoji: '🏜️', price: 45,  currency: 'gems',  rarity: 'rare' },
  { id: 'lightning',   name: 'العاصفة',        emoji: '⚡', price: 65,  currency: 'gems',  rarity: 'epic' },
];
