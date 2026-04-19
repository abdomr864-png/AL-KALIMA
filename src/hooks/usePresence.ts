import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase';
import { useUserStore } from '../store/userStore';

const HEARTBEAT_MS = 30_000;
export const OFFLINE_THRESHOLD_MS = 2 * 60_000;

export function isRecentlyOnline(lastSeen: string | null | undefined): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < OFFLINE_THRESHOLD_MS;
}

// Mount once at the app root. Keeps the signed-in user marked online
// regardless of which screen they're on (home, leaderboard, shop, etc.).
export function usePresence() {
  const { user } = useUserStore();
  const userId = user?.id;
  const isOffline = !userId || userId === 'offline';
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isOffline) return;

    async function ping(online: boolean) {
      try {
        await supabase
          .from('profiles')
          .update({
            is_online: online,
            last_seen_at: new Date().toISOString(),
          })
          .eq('id', userId);
      } catch {}
    }

    ping(true);
    heartbeatRef.current = setInterval(() => ping(true), HEARTBEAT_MS);

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') ping(true);
      else ping(false);
    });

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      ping(false);
      sub.remove();
    };
  }, [userId, isOffline]);
}
