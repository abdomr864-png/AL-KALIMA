import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEMES, TILE_STYLES, KEYBOARD_SKINS, type Theme, type TileStyle, type KeyboardSkin } from '../lib/cosmetics';
import { PROFILE_ICONS, AVATAR_BORDERS, WIN_ANIMATIONS } from '../lib/premiumCosmetics';

const KEYS = {
  ownedThemes: 'kal_owned_themes',
  ownedTiles: 'kal_owned_tiles',
  ownedKb: 'kal_owned_kb',
  activeTheme: 'kal_active_theme',
  activeTile: 'kal_active_tile',
  activeKb: 'kal_active_kb',
  // Premium cosmetics
  ownedIcons: 'kal_owned_icons',
  ownedBorders: 'kal_owned_borders',
  ownedWinAnims: 'kal_owned_win_anims',
  ownedProfileBgs: 'kal_owned_profile_bgs',
  activeIcon: 'kal_active_icon',
  activeBorder: 'kal_active_border',
  activeWinAnim: 'kal_active_win_anim',
  activeProfileBg: 'kal_active_profile_bg',
};

type CosmeticType = 'theme' | 'tile' | 'keyboard' | 'icon' | 'border' | 'winAnimation' | 'profileBg';

interface CosmeticStore {
  ownedThemes: string[];
  ownedTiles: string[];
  ownedKeyboards: string[];
  ownedIcons: string[];
  ownedBorders: string[];
  ownedWinAnimations: string[];
  ownedProfileBgs: string[];
  activeThemeId: string;
  activeTileId: string;
  activeKeyboardId: string;
  activeIconId: string;
  activeBorderId: string;
  activeWinAnimationId: string;
  activeProfileBgId: string;
  loaded: boolean;

  load: () => Promise<void>;
  addOwned: (type: CosmeticType, id: string) => Promise<void>;
  equip: (type: CosmeticType, id: string) => Promise<void>;
  isOwned: (type: CosmeticType, id: string) => boolean;

  // Resolved active cosmetics
  theme: Theme;
  tile: TileStyle;
  keyboard: KeyboardSkin;
}

export const useCosmeticStore = create<CosmeticStore>((set, get) => ({
  ownedThemes: ['default'],
  ownedTiles: ['classic'],
  ownedKeyboards: ['default'],
  ownedIcons: ['default_purple', 'default_blue'],
  ownedBorders: ['none'],
  ownedWinAnimations: ['default'],
  ownedProfileBgs: ['none'],
  activeThemeId: 'default',
  activeTileId: 'classic',
  activeKeyboardId: 'default',
  activeIconId: 'default_purple',
  activeBorderId: 'none',
  activeWinAnimationId: 'default',
  activeProfileBgId: 'none',
  loaded: false,

  theme: THEMES[0],
  tile: TILE_STYLES[0],
  keyboard: KEYBOARD_SKINS[0],

  load: async () => {
    try {
      const [t, ti, k, at, ati, ak, oi, ob, ow, ai, ab, aw, opb, apb] = await Promise.all([
        AsyncStorage.getItem(KEYS.ownedThemes),
        AsyncStorage.getItem(KEYS.ownedTiles),
        AsyncStorage.getItem(KEYS.ownedKb),
        AsyncStorage.getItem(KEYS.activeTheme),
        AsyncStorage.getItem(KEYS.activeTile),
        AsyncStorage.getItem(KEYS.activeKb),
        AsyncStorage.getItem(KEYS.ownedIcons),
        AsyncStorage.getItem(KEYS.ownedBorders),
        AsyncStorage.getItem(KEYS.ownedWinAnims),
        AsyncStorage.getItem(KEYS.activeIcon),
        AsyncStorage.getItem(KEYS.activeBorder),
        AsyncStorage.getItem(KEYS.activeWinAnim),
        AsyncStorage.getItem(KEYS.ownedProfileBgs),
        AsyncStorage.getItem(KEYS.activeProfileBg),
      ]);

      set({
        ownedThemes: t ? JSON.parse(t) : ['default'],
        ownedTiles: ti ? JSON.parse(ti) : ['classic'],
        ownedKeyboards: k ? JSON.parse(k) : ['default'],
        ownedIcons: oi ? JSON.parse(oi) : ['default_purple', 'default_blue'],
        ownedBorders: ob ? JSON.parse(ob) : ['none'],
        ownedWinAnimations: ow ? JSON.parse(ow) : ['default'],
        ownedProfileBgs: opb ? JSON.parse(opb) : ['none'],
        activeThemeId: at || 'default',
        activeTileId: ati || 'classic',
        activeKeyboardId: ak || 'default',
        activeIconId: ai || 'default_purple',
        activeBorderId: ab || 'none',
        activeWinAnimationId: aw || 'default',
        activeProfileBgId: apb || 'none',
        theme: THEMES.find(x => x.id === (at || 'default')) || THEMES[0],
        tile: TILE_STYLES.find(x => x.id === (ati || 'classic')) || TILE_STYLES[0],
        keyboard: KEYBOARD_SKINS.find(x => x.id === (ak || 'default')) || KEYBOARD_SKINS[0],
        loaded: true,
      });
    } catch {
      set({ loaded: true });
    }
  },

  addOwned: async (type, id) => {
    const s = get();
    const addToSet = (arr: string[]) => [...new Set([...arr, id])];

    switch (type) {
      case 'theme': {
        const updated = addToSet(s.ownedThemes);
        set({ ownedThemes: updated });
        await AsyncStorage.setItem(KEYS.ownedThemes, JSON.stringify(updated));
        break;
      }
      case 'tile': {
        const updated = addToSet(s.ownedTiles);
        set({ ownedTiles: updated });
        await AsyncStorage.setItem(KEYS.ownedTiles, JSON.stringify(updated));
        break;
      }
      case 'keyboard': {
        const updated = addToSet(s.ownedKeyboards);
        set({ ownedKeyboards: updated });
        await AsyncStorage.setItem(KEYS.ownedKb, JSON.stringify(updated));
        break;
      }
      case 'icon': {
        const updated = addToSet(s.ownedIcons);
        set({ ownedIcons: updated });
        await AsyncStorage.setItem(KEYS.ownedIcons, JSON.stringify(updated));
        break;
      }
      case 'border': {
        const updated = addToSet(s.ownedBorders);
        set({ ownedBorders: updated });
        await AsyncStorage.setItem(KEYS.ownedBorders, JSON.stringify(updated));
        break;
      }
      case 'winAnimation': {
        const updated = addToSet(s.ownedWinAnimations);
        set({ ownedWinAnimations: updated });
        await AsyncStorage.setItem(KEYS.ownedWinAnims, JSON.stringify(updated));
        break;
      }
      case 'profileBg': {
        const updated = addToSet(s.ownedProfileBgs);
        set({ ownedProfileBgs: updated });
        await AsyncStorage.setItem(KEYS.ownedProfileBgs, JSON.stringify(updated));
        break;
      }
    }
  },

  equip: async (type, id) => {
    switch (type) {
      case 'theme':
        set({ activeThemeId: id, theme: THEMES.find(x => x.id === id) || THEMES[0] });
        await AsyncStorage.setItem(KEYS.activeTheme, id);
        break;
      case 'tile':
        set({ activeTileId: id, tile: TILE_STYLES.find(x => x.id === id) || TILE_STYLES[0] });
        await AsyncStorage.setItem(KEYS.activeTile, id);
        break;
      case 'keyboard':
        set({ activeKeyboardId: id, keyboard: KEYBOARD_SKINS.find(x => x.id === id) || KEYBOARD_SKINS[0] });
        await AsyncStorage.setItem(KEYS.activeKb, id);
        break;
      case 'icon':
        set({ activeIconId: id });
        await AsyncStorage.setItem(KEYS.activeIcon, id);
        break;
      case 'border':
        set({ activeBorderId: id });
        await AsyncStorage.setItem(KEYS.activeBorder, id);
        break;
      case 'winAnimation':
        set({ activeWinAnimationId: id });
        await AsyncStorage.setItem(KEYS.activeWinAnim, id);
        break;
      case 'profileBg':
        set({ activeProfileBgId: id });
        await AsyncStorage.setItem(KEYS.activeProfileBg, id);
        break;
    }
  },

  isOwned: (type, id) => {
    const s = get();
    switch (type) {
      case 'theme': return s.ownedThemes.includes(id);
      case 'tile': return s.ownedTiles.includes(id);
      case 'keyboard': return s.ownedKeyboards.includes(id);
      case 'icon': return s.ownedIcons.includes(id);
      case 'border': return s.ownedBorders.includes(id);
      case 'winAnimation': return s.ownedWinAnimations.includes(id);
      case 'profileBg': return s.ownedProfileBgs.includes(id);
      default: return false;
    }
  },
}));
