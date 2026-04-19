import { supabase } from './supabase';
import { NotificationManager } from './NotificationManager';

export interface FriendResult {
  player_id: string;
  attempts: number;
  success: boolean;
  username: string;
}

export const FriendActivity = {

  async loadFriendsWhoPlayedToday(userId: string): Promise<FriendResult[]> {
    const today = new Date().toISOString().split('T')[0];

    // Get accepted friendships
    const { data: friendships } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (!friendships?.length) return [];

    const friendIds = friendships.map(f =>
      f.requester_id === userId ? f.addressee_id : f.requester_id
    );

    // Get friends' daily results for today
    const { data: results } = await supabase
      .from('daily_results')
      .select('player_id, attempts, success')
      .eq('word_date', today)
      .eq('success', true)
      .in('player_id', friendIds)
      .order('attempts', { ascending: true })
      .limit(5);

    if (!results?.length) return [];

    // Get usernames for those friends
    const playerIds = results.map(r => r.player_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', playerIds);

    const usernameMap = new Map(
      (profiles || []).map(p => [p.id, p.username])
    );

    return results.map(r => ({
      ...r,
      username: usernameMap.get(r.player_id) || 'لاعب',
    }));
  },

  async checkAndNotifyIfFriendsPlayed(userId: string) {
    const today = new Date().toISOString().split('T')[0];

    // Check if I already played today
    const { data: myResult } = await supabase
      .from('daily_results')
      .select('id')
      .eq('player_id', userId)
      .eq('word_date', today)
      .maybeSingle();

    if (myResult) return; // Already played, no need to notify

    const friends = await this.loadFriendsWhoPlayedToday(userId);
    if (friends.length > 0) {
      try {
        await NotificationManager.sendFriendResultNotification(
          friends[0].username,
          friends[0].attempts
        );
      } catch {}
    }
  },
};
