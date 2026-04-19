import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const PHASE_KEY = 'kalimat_player_phase';
const FIRST_LAUNCH_KEY = 'kalimat_first_launch_time';
const GAMES_PLAYED_KEY = 'kalimat_games_played_count';
const PHASE2_SEEN_KEY = 'kalimat_phase2_seen';
const PHASE3_GAMES_KEY = 'kalimat_phase3_games';

export type PlayerPhaseValue = 1 | 2 | 3;

export const PlayerPhase = {

  async initialize(): Promise<void> {
    const existing = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
    if (!existing) {
      await AsyncStorage.setItem(FIRST_LAUNCH_KEY, Date.now().toString());
      await AsyncStorage.setItem(PHASE_KEY, '1');
      await AsyncStorage.setItem(GAMES_PLAYED_KEY, '0');
    }
  },

  async getPhase(): Promise<PlayerPhaseValue> {
    const phase = await AsyncStorage.getItem(PHASE_KEY);
    return (parseInt(phase || '1') as PlayerPhaseValue);
  },

  async getMinutesInApp(): Promise<number> {
    const firstLaunch = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
    if (!firstLaunch) return 0;
    return (Date.now() - parseInt(firstLaunch)) / 60000;
  },

  async getGamesPlayed(): Promise<number> {
    const count = await AsyncStorage.getItem(GAMES_PLAYED_KEY);
    return parseInt(count || '0');
  },

  /** Call after any game mode finishes. Returns new phase if it changed. */
  async recordGameCompleted(): Promise<PlayerPhaseValue> {
    const current = await this.getGamesPlayed();
    const newCount = current + 1;
    await AsyncStorage.setItem(GAMES_PLAYED_KEY, newCount.toString());

    const minutes = await this.getMinutesInApp();
    const currentPhase = await this.getPhase();

    if (currentPhase === 1 && (newCount >= 1 || minutes >= 15)) {
      await AsyncStorage.setItem(PHASE_KEY, '2');
      this.syncToSupabase(2);
      return 2;
    }

    return currentPhase;
  },

  async markPhase2Seen(): Promise<void> {
    await AsyncStorage.setItem(PHASE2_SEEN_KEY, 'true');
    await AsyncStorage.setItem(PHASE_KEY, '3');
    this.syncToSupabase(3);
  },

  async isPhase1(): Promise<boolean> {
    return (await this.getPhase()) === 1;
  },

  async shouldShowAds(): Promise<boolean> {
    return (await this.getPhase()) === 3;
  },

  async shouldShowShopPrompt(): Promise<boolean> {
    const phase = await this.getPhase();
    return phase >= 2;
  },

  /** Track phase 3 games for gentle ad pacing (interstitial every 3 games) */
  async recordPhase3Game(): Promise<boolean> {
    const phase = await this.getPhase();
    if (phase !== 3) return false;
    const count = parseInt((await AsyncStorage.getItem(PHASE3_GAMES_KEY)) || '0') + 1;
    await AsyncStorage.setItem(PHASE3_GAMES_KEY, count.toString());
    return count % 3 === 0; // true = show interstitial
  },

  /** Fire-and-forget sync to Supabase */
  syncToSupabase(phase: PlayerPhaseValue) {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        // Store phase in profile metadata (won't fail if column doesn't exist)
        await supabase.from('profiles').update({
          // @ts-ignore — column may not exist yet
          player_phase: phase,
        }).eq('id', user.id);
      } catch {}
    })();
  },
};
