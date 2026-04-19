import AsyncStorage from '@react-native-async-storage/async-storage';

const QUIT_KEY = 'kalimat_consecutive_quits';
const BAN_KEY = 'kalimat_ban_until';
const BAN_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CONSECUTIVE_QUITS = 5;
const QUIT_PENALTY_COINS = 5;

export const QuitTracker = {
  async recordQuit(): Promise<number> {
    const current = await this.getConsecutiveQuits();
    const newCount = current + 1;
    await AsyncStorage.setItem(QUIT_KEY, String(newCount));

    if (newCount >= MAX_CONSECUTIVE_QUITS) {
      const banUntil = Date.now() + BAN_DURATION_MS;
      await AsyncStorage.setItem(BAN_KEY, String(banUntil));
      await AsyncStorage.setItem(QUIT_KEY, '0');
    }
    return newCount;
  },

  async recordComplete(): Promise<void> {
    await AsyncStorage.setItem(QUIT_KEY, '0');
  },

  async getConsecutiveQuits(): Promise<number> {
    const val = await AsyncStorage.getItem(QUIT_KEY);
    return val ? parseInt(val, 10) : 0;
  },

  async isBanned(): Promise<{ banned: boolean; remainingMs: number; remainingText: string }> {
    const banUntil = await AsyncStorage.getItem(BAN_KEY);
    if (!banUntil) return { banned: false, remainingMs: 0, remainingText: '' };

    const banUntilMs = parseInt(banUntil, 10);
    const now = Date.now();

    if (now >= banUntilMs) {
      await AsyncStorage.removeItem(BAN_KEY);
      return { banned: false, remainingMs: 0, remainingText: '' };
    }

    const remainingMs = banUntilMs - now;
    const mins = Math.floor(remainingMs / 60000);
    const secs = Math.ceil((remainingMs % 60000) / 1000);
    return {
      banned: true,
      remainingMs,
      remainingText: `${mins}:${secs.toString().padStart(2, '0')}`,
    };
  },

  PENALTY_COINS: QUIT_PENALTY_COINS,
  MAX_QUITS: MAX_CONSECUTIVE_QUITS,
};
