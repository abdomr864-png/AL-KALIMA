import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getTodayDateString } from '../lib/words';

export interface LeaderboardEntry {
  id: string;
  username: string;
  avatarColor: string;
  currentStreak: number;
  attempts: number;
  durationSeconds: number;
  rank: number;
  language: string;
}

export interface AllTimeEntry {
  id: string;
  username: string;
  avatarColor: string;
  classicHighScore: number;
  currentStreak: number;
  activeIcon: string | null;
  activeBorder: string | null;
  language: string;
}

export function useLeaderboard(_language: 'ar' | 'en' = 'ar') {
  const [todayEntries, setTodayEntries] = useState<LeaderboardEntry[]>([]);
  const [allTimeEntries, setAllTimeEntries] = useState<AllTimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Wait for supabase to restore session before querying
      await supabase.auth.getSession();
      await Promise.all([fetchToday(), fetchAllTime()]);
    })();
  }, []);

  async function fetchToday() {
    setIsLoading(true);
    try {
      const today = getTodayDateString();
      const { data, error } = await supabase
        .from('daily_results')
        .select('player_id, attempts, duration_seconds, language, profiles!inner(id, username, avatar_color, current_streak, language)')
        .eq('word_date', today)
        .eq('success', true)
        .order('attempts', { ascending: true })
        .order('duration_seconds', { ascending: true })
        .limit(100);

      console.log('Today data:', data);
      console.log('Today error:', error);

      if (data) {
        setTodayEntries(
          data.map((d: any, i: number) => ({
            id: d.profiles.id,
            username: d.profiles.username || 'Player',
            avatarColor: d.profiles.avatar_color || '#7C3AED',
            currentStreak: d.profiles.current_streak || 0,
            attempts: d.attempts,
            durationSeconds: d.duration_seconds || 0,
            rank: i + 1,
            language: d.language || d.profiles.language || 'ar',
          }))
        );
      }
    } catch (err) {
      console.log('Today fetch exception:', err);
    }
    setIsLoading(false);
  }

  async function fetchAllTime() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, classic_high_score, current_streak, avatar_color, active_icon, active_border, language')
        .not('username', 'is', null)
        .order('classic_high_score', { ascending: false, nullsFirst: false })
        .limit(50);

      console.log('LEADERBOARD DATA:', JSON.stringify(data));
      console.log('LEADERBOARD ERROR:', JSON.stringify(error));

      if (data) {
        setAllTimeEntries(
          data.map((d: any) => ({
            id: d.id,
            username: d.username || 'Player',
            avatarColor: d.avatar_color || '#7C3AED',
            classicHighScore: d.classic_high_score || 0,
            currentStreak: d.current_streak || 0,
            activeIcon: d.active_icon ?? null,
            activeBorder: d.active_border ?? null,
            language: d.language || 'ar',
          }))
        );
      }
    } catch (err) {
      console.log('All time fetch exception:', err);
    }
  }

  async function refresh() {
    await Promise.all([fetchToday(), fetchAllTime()]);
  }

  return { todayEntries, allTimeEntries, isLoading, refresh };
}
