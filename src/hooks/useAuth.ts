import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useUserStore } from '../store/userStore';

const OFFLINE_USER = {
  id: 'offline',
  username: 'لاعب',
  avatarColor: '#7C3AED',
  totalGames: 0,
  totalWins: 0,
  currentStreak: 0,
  bestStreak: 0,
  coins: 50,
  isPlus: false,
  createdAt: new Date().toISOString(),
};

export function useAuth() {
  const { setUser, setLoading, user, isLoading, isAuthenticated } = useUserStore();

  useEffect(() => {
    initAuth();
  }, []);

  async function initAuth() {
    // 5-second timeout — never hang forever
    const timeout = setTimeout(() => {
      const current = useUserStore.getState();
      if (current.isLoading && !current.user) {
        setUser(OFFLINE_USER);
      }
    }, 5000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        await signInAnonymously();
      }
    } catch (err) {
      console.warn('Auth init failed:', err);
      setUser(OFFLINE_USER);
    }

    clearTimeout(timeout);

    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          fetchProfile(session.user.id);
        }
        // Don't call setUser(null) here — it wipes the offline fallback user
      });
      return () => subscription.unsubscribe();
    } catch (err) {
      console.warn('Auth listener failed:', err);
    }
  }

  async function fetchProfile(userId: string) {
    try {
      // Load cached username for fast display while Supabase loads
      const cachedUsername = await AsyncStorage.getItem('kalimat_username');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        setUser({
          ...OFFLINE_USER,
          id: userId,
          username: cachedUsername || OFFLINE_USER.username,
        });
        return;
      }

      const resolvedUsername = data.username || cachedUsername || 'لاعب';

      // Keep AsyncStorage in sync with Supabase
      if (data.username) {
        AsyncStorage.setItem('kalimat_username', data.username);
        AsyncStorage.setItem('kalimat_profile_username', data.username);
      }

      setUser({
        id: data.id,
        username: resolvedUsername,
        avatarColor: data.avatar_color || '#7C3AED',
        totalGames: data.total_games || 0,
        totalWins: data.total_wins || 0,
        currentStreak: data.current_streak || 0,
        bestStreak: data.best_streak || 0,
        coins: data.coins || 50,
        gems: data.gems || 0,
        isPlus: data.is_plus || false,
        isElite: data.is_elite || false,
        avatarUrl: data.avatar_url || undefined,
        usernameColor: data.username_color || 'default',
        createdAt: data.created_at,
      });
    } catch {
      const cachedUsername = await AsyncStorage.getItem('kalimat_username').catch(() => null);
      setUser({ ...OFFLINE_USER, id: userId, username: cachedUsername || OFFLINE_USER.username });
    }
  }

  async function signInAnonymously() {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInAnonymously();
      if (error) {
        console.warn('Anonymous sign-in failed:', error.message);
        setUser(OFFLINE_USER);
      }
    } catch {
      setUser(OFFLINE_USER);
    }
  }

  async function updateUsername(username: string) {
    if (!user || user.id === 'offline') return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username })
        .eq('id', user.id);
      if (!error) {
        setUser({ ...user, username });
        await AsyncStorage.setItem('kalimat_username', username);
        await AsyncStorage.setItem('kalimat_profile_username', username);
      }
      return error;
    } catch {
      return null;
    }
  }

  async function syncCoins(coins: number) {
    if (!user || user.id === 'offline') return;
    try {
      await supabase
        .from('profiles')
        .update({ coins })
        .eq('id', user.id);
    } catch {
      // silent
    }
  }

  return { user, isLoading, isAuthenticated, updateUsername, syncCoins, fetchProfile };
}
