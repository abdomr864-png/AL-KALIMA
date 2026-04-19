import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export const AntiCheat = {
  // LAYER 1 — Time-based detection
  MIN_SOLVE_SECONDS: 10,

  async checkSolveTime(durationSeconds: number, attempts: number): Promise<boolean> {
    if (attempts === 1 && durationSeconds < this.MIN_SOLVE_SECONDS) return true;
    if (durationSeconds < 5) return true;
    return false;
  },

  // LAYER 2 — Statistical pattern detection
  SUSPICIOUS_WIN_RATE_THRESHOLD: 0.35,
  MIN_GAMES_FOR_ANALYSIS: 10,

  async checkWinPattern(playerId: string): Promise<{
    suspicious: boolean;
    reason: string | null;
  }> {
    const { data } = await supabase
      .from('daily_results')
      .select('attempts, success')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (!data || data.length < this.MIN_GAMES_FOR_ANALYSIS) {
      return { suspicious: false, reason: null };
    }

    const firstAttemptWins = data.filter((r: any) => r.attempts === 1 && r.success).length;
    const totalGames = data.length;
    const firstAttemptRate = firstAttemptWins / totalGames;

    if (firstAttemptRate > this.SUSPICIOUS_WIN_RATE_THRESHOLD) {
      return {
        suspicious: true,
        reason: `first_attempt_rate: ${Math.round(firstAttemptRate * 100)}%`,
      };
    }

    return { suspicious: false, reason: null };
  },

  // LAYER 3 — Device fingerprint (multiple accounts from same device)
  async checkDeviceDuplication(deviceId: string, playerId: string): Promise<boolean> {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('device_id', deviceId)
      .neq('id', playerId);

    return (data?.length || 0) > 2;
  },

  // FLAG a result — does NOT delete or ban, just marks it
  async flagResult(playerId: string, reason: string) {
    await supabase.from('profiles').update({
      is_flagged: true,
      flag_reason: reason,
      flagged_at: new Date().toISOString(),
    }).eq('id', playerId);

    const today = new Date().toISOString().split('T')[0];
    await supabase
      .from('daily_results')
      .update({ is_flagged: true, flag_reason: reason })
      .eq('player_id', playerId)
      .eq('word_date', today);
  },

  // Run all checks after a daily result is submitted
  async runAllChecks(playerId: string, durationSeconds: number, attempts: number) {
    const deviceId = await AsyncStorage.getItem('kalimat_device_id');

    const [timeSuspicious, patternCheck, deviceSuspicious] = await Promise.all([
      this.checkSolveTime(durationSeconds, attempts),
      this.checkWinPattern(playerId),
      deviceId ? this.checkDeviceDuplication(deviceId, playerId) : Promise.resolve(false),
    ]);

    if (timeSuspicious) {
      await this.flagResult(playerId, 'impossible_solve_time');
    } else if (patternCheck.suspicious) {
      await this.flagResult(playerId, patternCheck.reason!);
    } else if (deviceSuspicious) {
      await this.flagResult(playerId, 'multiple_accounts_same_device');
    }
  },
};
