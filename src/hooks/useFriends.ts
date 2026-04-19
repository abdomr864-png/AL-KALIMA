import { useState, useEffect, useCallback } from 'react';
import { Share } from 'react-native';
import { supabase } from '../lib/supabase';
import { useUserStore } from '../store/userStore';
import { isRecentlyOnline } from './usePresence';

export interface FriendProfile {
  id: string;
  username: string;
  avatar_color: string;
  total_wins: number;
  current_streak: number;
  is_online: boolean;
  last_seen: string | null;
  username_color: string;
  is_elite: boolean;
}

export interface FriendRequest {
  id: string;
  requester: FriendProfile;
  created_at: string;
}

export interface Friendship {
  id: string;
  friend: FriendProfile;
  created_at: string;
}

export function useFriends() {
  const { user } = useUserStore();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id;
  const isOffline = !userId || userId === 'offline';

  // Note: presence heartbeat is mounted globally in _layout via usePresence().

  // ─── FETCH ───
  const fetchAll = useCallback(async () => {
    if (isOffline) { setLoading(false); setFriends([]); setPendingRequests([]); return; }
    setLoading(true);
    setError(null);

    try {
      const [asRequester, asAddressee] = await Promise.all([
        supabase
          .from('friendships')
          .select('id, status, created_at, requester_id, addressee_id')
          .eq('requester_id', userId)
          .limit(100),
        supabase
          .from('friendships')
          .select('id, status, created_at, requester_id, addressee_id')
          .eq('addressee_id', userId)
          .limit(100),
      ]);

      if (asRequester.error) throw asRequester.error;
      if (asAddressee.error) throw asAddressee.error;

      const merged = new Map<string, any>();
      (asRequester.data || []).forEach(r => merged.set(r.id, r));
      (asAddressee.data || []).forEach(r => merged.set(r.id, r));
      const allRows = Array.from(merged.values());

      const accepted = allRows.filter(r => r.status === 'accepted');
      const pendingToMe = allRows.filter(r => r.status === 'pending' && r.addressee_id === userId);
      const pendingFromMe = allRows.filter(r => r.status === 'pending' && r.requester_id === userId);

      // 2. Collect all friend/requester IDs we need profiles for
      const profileIds = new Set<string>();
      accepted.forEach(r => {
        const friendId = r.requester_id === userId ? r.addressee_id : r.requester_id;
        profileIds.add(friendId);
      });
      pendingToMe.forEach(r => profileIds.add(r.requester_id));

      // 3. Fetch all profiles in one query — only core columns, default the rest
      let profileMap = new Map<string, any>();
      if (profileIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_color, current_streak, username_color, is_elite')
          .in('id', Array.from(profileIds));

        (profiles || []).forEach(p => profileMap.set(p.id, p));
      }

      const toFriendProfile = (p: any): FriendProfile => ({
        id: p.id,
        username: p.username || 'لاعب',
        avatar_color: p.avatar_color || '#7C3AED',
        total_wins: p.total_wins || 0,
        current_streak: p.current_streak || 0,
        is_online: !!(p.is_online && isRecentlyOnline(p.last_seen_at)),
        last_seen: p.last_seen_at || null,
        username_color: p.username_color || 'default',
        is_elite: !!p.is_elite,
      });

      // 4. Build friends list — fallback placeholder if profile row missing/blocked
      const friendList: Friendship[] = accepted.map(r => {
        const friendId = r.requester_id === userId ? r.addressee_id : r.requester_id;
        const profile = profileMap.get(friendId) || {
          id: friendId,
          username: 'Unknown',
          avatar_color: '#7C3AED',
        };
        return { id: r.id, friend: toFriendProfile(profile), created_at: r.created_at };
      });

      setFriends(friendList);

      // 5. Build pending requests — fallback placeholder if profile row missing/blocked
      const requests: FriendRequest[] = pendingToMe.map(r => {
        const profile = profileMap.get(r.requester_id) || {
          id: r.requester_id,
          username: 'Unknown',
          avatar_color: '#7C3AED',
        };
        return { id: r.id, requester: toFriendProfile(profile), created_at: r.created_at };
      });

      setPendingRequests(requests);
      setSentRequests(pendingFromMe.map(r => r.addressee_id));

    } catch (e: any) {
      console.log('Friends load error:', e);
      setError(e.message || 'خطأ في تحميل الأصدقاء');
      setFriends([]);
      setPendingRequests([]);
    } finally {
      setLoading(false);
    }
  }, [userId, isOffline]);

  // ─── REALTIME ───
  useEffect(() => {
    if (isOffline) { setLoading(false); return; }
    fetchAll();

    const channel = supabase
      .channel(`friends_${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships' },
        () => { fetchAll(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, isOffline]);

  // ─── PRESENCE POLL — keep friends' online/offline fresh ───
  useEffect(() => {
    if (isOffline || friends.length === 0) return;

    async function refreshPresence() {
      const ids = friends.map(f => f.friend.id);
      if (ids.length === 0) return;
      const { data } = await supabase
        .from('profiles')
        .select('id, is_online, last_seen_at')
        .in('id', ids);
      if (!data) return;
      const byId = new Map(data.map((p: any) => [p.id, p]));
      setFriends(prev => prev.map(f => {
        const p = byId.get(f.friend.id);
        if (!p) return f;
        return {
          ...f,
          friend: {
            ...f.friend,
            is_online: !!(p.is_online && isRecentlyOnline(p.last_seen_at)),
            last_seen: p.last_seen_at || null,
          },
        };
      }));
    }

    const interval = setInterval(refreshPresence, 20_000);
    return () => clearInterval(interval);
  }, [userId, isOffline, friends.length]);

  // ─── SEARCH PLAYERS ───
  async function searchPlayers(query: string): Promise<FriendProfile[]> {
    if (isOffline || query.length < 2) return [];
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_color, total_wins, current_streak, is_online, last_seen_at, username_color, is_elite')
        .ilike('username', `%${query}%`)
        .neq('id', userId)
        .limit(10);

      return (data || []).map(p => ({
        id: p.id,
        username: p.username || 'لاعب',
        avatar_color: p.avatar_color || '#7C3AED',
        total_wins: p.total_wins || 0,
        current_streak: p.current_streak || 0,
        is_online: !!(p.is_online && isRecentlyOnline(p.last_seen_at)),
        last_seen: p.last_seen_at || null,
        username_color: p.username_color || 'default',
        is_elite: !!p.is_elite,
      }));
    } catch {
      return [];
    }
  }

  // ─── ACTIONS ───
  async function sendRequest(targetId: string): Promise<{ success: boolean; error?: string }> {
    if (isOffline) return { success: false, error: 'يجب تسجيل الدخول أولاً' };
    if (targetId === userId) return { success: false, error: 'لا يمكنك إضافة نفسك' };

    const { data: existing } = await supabase
      .from('friendships')
      .select('id, status')
      .or(`and(requester_id.eq.${userId},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${userId})`)
      .limit(1)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'accepted') return { success: false, error: 'أنتم أصدقاء بالفعل' };
      return { success: false, error: 'طلب الصداقة موجود بالفعل' };
    }

    const { error: insertErr } = await supabase
      .from('friendships')
      .insert({ requester_id: userId, addressee_id: targetId, status: 'pending' });

    if (insertErr) return { success: false, error: 'حدث خطأ، حاول مجدداً' };

    try {
      const { data: target } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', targetId)
        .maybeSingle();

      if (target?.push_token) {
        const senderName = user?.username || 'A player';
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: target.push_token,
            title: `📩 ${senderName}`,
            body: `${senderName} sent you a friend request / أرسل لك طلب صداقة`,
            data: { type: 'friend_request', screen: '/friends' },
            sound: 'default',
          }),
        });
      }
    } catch { /* push failure is non-fatal */ }

    return { success: true };
  }

  async function sendRequestByUsername(targetUsername: string): Promise<{ success: boolean; error?: string }> {
    if (isOffline) return { success: false, error: 'يجب تسجيل الدخول أولاً' };

    const { data: target } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', targetUsername.trim())
      .maybeSingle();

    if (!target) return { success: false, error: 'لم يتم العثور على اللاعب' };
    return sendRequest(target.id);
  }

  async function acceptRequest(friendshipId: string) {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
    await fetchAll();
  }

  async function rejectRequest(friendshipId: string) {
    await supabase.from('friendships').delete().eq('id', friendshipId);
    await fetchAll();
  }

  async function removeFriend(friendshipId: string) {
    await supabase.from('friendships').delete().eq('id', friendshipId);
    await fetchAll();
  }

  async function shareUsername() {
    const username = user?.username || '';
    if (!username) return;
    await Share.share({
      message: `Add me on Kalimat! My name: ${username} / أضفني في كلمات! اسمي: ${username} 👋`,
    });
  }

  return {
    friends,
    pendingRequests,
    sentRequests,
    loading,
    error,
    searchPlayers,
    sendRequest,
    sendRequestByUsername,
    acceptRequest,
    rejectRequest,
    removeFriend,
    shareUsername,
    refresh: fetchAll,
  };
}
