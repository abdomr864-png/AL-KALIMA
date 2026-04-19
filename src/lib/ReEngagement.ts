import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const LAST_OPEN_KEY = 'kalimat_last_app_open';
const WELCOME_BACK_SHOWN_KEY = 'kalimat_welcome_back_shown';

export interface AppOpenResult {
  daysSinceLastOpen: number;
  isReturningUser: boolean;
  welcomeBackReward: { coins: number } | null;
}

export const ReEngagement = {

  async recordAppOpen(): Promise<AppOpenResult> {
    const today = new Date().toISOString().split('T')[0];
    const lastOpen = await AsyncStorage.getItem(LAST_OPEN_KEY);

    await AsyncStorage.setItem(LAST_OPEN_KEY, today);

    if (!lastOpen) {
      return { daysSinceLastOpen: 0, isReturningUser: false, welcomeBackReward: null };
    }

    const daysSince = Math.floor(
      (new Date(today).getTime() - new Date(lastOpen).getTime()) / 86400000
    );

    if (daysSince < 2) {
      return { daysSinceLastOpen: daysSince, isReturningUser: false, welcomeBackReward: null };
    }

    // Player was away — check if we already showed welcome back today
    const alreadyShown = await AsyncStorage.getItem(WELCOME_BACK_SHOWN_KEY);
    if (alreadyShown === today) {
      return { daysSinceLastOpen: daysSince, isReturningUser: true, welcomeBackReward: null };
    }

    await AsyncStorage.setItem(WELCOME_BACK_SHOWN_KEY, today);

    const coins = daysSince >= 7 ? 75 : daysSince >= 3 ? 50 : 25;

    // Add coins to player's balance
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.rpc('add_coins', { amount: coins, reason: 'welcome_back' });
      }
    } catch {}

    return { daysSinceLastOpen: daysSince, isReturningUser: true, welcomeBackReward: { coins } };
  },
};
