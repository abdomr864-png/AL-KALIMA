import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { useLanguage } from '../src/lib/LanguageContext';
import { type UsernameColor } from '../src/components/ColoredUsername';
import { AnimatedPlayerName } from '../src/components/AnimatedPlayerName';
import { isRecentlyOnline } from '../src/hooks/usePresence';

function GameAvatar({ player, size }: { player: Player; size: number }) {
  const initial = (player.username || '?')[0].toUpperCase();
  const icon = player.active_icon;
  const color = player.avatar_color || '#7C3AED';
  const online = !!(player.is_online && isRecentlyOnline(player.last_seen_at));
  const dotSize = Math.max(10, size * 0.26);

  return (
    <View style={{ width: size, height: size }}>
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2.5,
        borderColor: player.active_border ? '#A78BFA' : 'rgba(255,255,255,0.15)',
      }}>
        <Text style={{ fontSize: size * 0.42 }}>
          {icon || initial}
        </Text>
      </View>
      <View style={{
        position: 'absolute',
        bottom: 0, right: 0,
        width: dotSize, height: dotSize, borderRadius: dotSize / 2,
        backgroundColor: online ? '#22C55E' : '#4B5563',
        borderWidth: 2, borderColor: '#07041A',
      }} />
    </View>
  );
}

type Player = {
  id: string;
  username: string;
  classic_high_score?: number;
  current_streak?: number;
  avatar_color?: string;
  active_icon?: string | null;
  active_border?: string | null;
  language?: string;
  is_elite?: boolean;
  is_plus?: boolean;
  username_color?: string;
  is_online?: boolean;
  last_seen_at?: string | null;
};

const PROFILE_COLS = 'id, username, classic_high_score, current_streak, avatar_color, language, username_color, is_elite, is_online, last_seen_at';

function openPlayerProfile(player: Player) {
  if (!player.id) return;
  router.push({
    pathname: '/player-profile',
    params: { playerId: player.id },
  } as any);
}

export default function LeaderboardScreen() {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const [activeServer, setActiveServer] = useState<'ar' | 'en'>('ar');

  useEffect(() => {
    AsyncStorage.getItem('kalimat_language').then(lang => {
      setActiveServer((lang as 'ar' | 'en') || 'ar');
    });
  }, []);
  const [activeTab, setActiveTab] = useState<'alltime' | 'today' | 'friends'>('alltime');
  const [allTimePlayers, setAllTimePlayers] = useState<Player[]>([]);
  const [todayPlayers, setTodayPlayers] = useState<Player[]>([]);
  const [friendsPlayers, setFriendsPlayers] = useState<Player[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadAllTime() {
    setLoading(true);

    const { data } = await supabase
      .from('profiles')
      .select(PROFILE_COLS)
      .not('username', 'is', null)
      .order('classic_high_score', { ascending: false, nullsFirst: false })
      .limit(50);

    setAllTimePlayers((data as Player[]) || []);
    setLoading(false);
  }

  async function loadToday() {
    const today = new Date().toISOString().split('T')[0];

    const { data: dailyData } = await supabase
      .from('daily_results')
      .select(`
        player_id,
        attempts,
        duration_seconds,
        profiles:player_id (
          id, username, avatar_color, language, classic_high_score, current_streak, username_color, is_elite, is_online, last_seen_at
        )
      `)
      .eq('word_date', today)
      .eq('success', true)
      .order('attempts', { ascending: true })
      .order('duration_seconds', { ascending: true })
      .limit(50);

    if (dailyData && dailyData.length > 0) {
      const flattened: Player[] = dailyData
        .map((d: any) => d.profiles ? { ...d.profiles, attempts: d.attempts, duration_seconds: d.duration_seconds } : null)
        .filter(Boolean);
      setTodayPlayers(flattened);
      return;
    }

    const { data: fallback } = await supabase
      .from('profiles')
      .select(PROFILE_COLS)
      .not('username', 'is', null)
      .order('classic_high_score', { ascending: false, nullsFirst: false })
      .limit(50);

    setTodayPlayers((fallback as Player[]) || []);
  }

  async function loadFriends() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setFriendsPlayers([]);
      return;
    }

    const { data: friendships } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    const friendIds = (friendships || []).map((f: any) =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );

    const allIds = [user.id, ...friendIds];

    const { data } = await supabase
      .from('profiles')
      .select(PROFILE_COLS)
      .in('id', allIds)
      .not('username', 'is', null)
      .order('classic_high_score', { ascending: false, nullsFirst: false })
      .limit(50);

    setFriendsPlayers((data as Player[]) || []);
  }

  const matchesServer = (p: Player) =>
    activeServer === 'ar'
      ? (p.language === 'ar' || p.language == null)
      : p.language === 'en';

  const filtered =
    activeTab === 'alltime' ? allTimePlayers.filter(matchesServer)
    : activeTab === 'today' ? todayPlayers.filter(matchesServer)
    : friendsPlayers;

  const top3 = filtered.slice(0, 3);
  const rest = filtered.slice(3);
  const myRank = filtered.findIndex(p => p.id === myId) + 1;

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      setMyId(user?.id || null);
      setLoading(true);
      await Promise.all([
        loadAllTime(),
        loadToday(),
        loadFriends(),
      ]);
      setLoading(false);
    }
    init();
  }, []);

  // Keep online dots fresh — every 20s re-fetch is_online/last_seen_at
  // for the players currently visible on whichever tab is active.
  useEffect(() => {
    const refresh = async () => {
      const current =
        activeTab === 'alltime' ? allTimePlayers
        : activeTab === 'today' ? todayPlayers
        : friendsPlayers;
      const ids = current.map(p => p.id).filter(Boolean);
      if (ids.length === 0) return;
      const { data } = await supabase
        .from('profiles')
        .select('id, is_online, last_seen_at')
        .in('id', ids);
      if (!data) return;
      const byId = new Map(data.map((p: any) => [p.id, p]));
      const merge = (list: Player[]) =>
        list.map(p => {
          const fresh = byId.get(p.id);
          return fresh ? { ...p, is_online: fresh.is_online, last_seen_at: fresh.last_seen_at } : p;
        });
      if (activeTab === 'alltime') setAllTimePlayers(merge);
      else if (activeTab === 'today') setTodayPlayers(merge);
      else setFriendsPlayers(merge);
    };
    const id = setInterval(refresh, 20_000);
    return () => clearInterval(id);
  }, [activeTab, allTimePlayers.length, todayPlayers.length, friendsPlayers.length]);

  return (
    <View style={{ flex: 1, backgroundColor: '#07041A' }}>

      {/* Background glow */}
      <View style={{
        position: 'absolute', width: 300, height: 300,
        borderRadius: 150, top: -50, alignSelf: 'center',
        backgroundColor: 'rgba(124,58,237,0.12)',
      }} />

      {/* Header */}
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12 }}>
        <Text style={{ color: 'white', fontSize: 26, fontWeight: '900', textAlign: 'center' }}>
          {isArabic ? '🏆 المتصدرون' : '🏆 Leaderboard'}
        </Text>

        {/* Server toggle */}
        <View style={{
          flexDirection: 'row', backgroundColor: '#111827',
          borderRadius: 16, padding: 4, marginTop: 14,
        }}>
          {(['ar', 'en'] as const).map(s => (
            <TouchableOpacity
              key={s}
              onPress={() => setActiveServer(s)}
              style={{
                flex: 1, height: 38, borderRadius: 12,
                backgroundColor: activeServer === s ? '#7C3AED' : 'transparent',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{
                color: activeServer === s ? 'white' : '#6B7280',
                fontSize: 14, fontWeight: '700',
              }}>
                {s === 'ar' ? '🇸🇦 العربية' : '🇬🇧 English'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab selector */}
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
          {[
            { id: 'alltime', label: isArabic ? 'كل الأوقات' : 'All Time' },
            { id: 'today', label: isArabic ? 'اليوم' : 'Today' },
            { id: 'friends', label: isArabic ? 'الأصدقاء' : 'Friends' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => {
                setActiveTab(tab.id as any);
                if (tab.id === 'alltime') loadAllTime();
              }}
              style={{
                flex: 1, height: 36, borderRadius: 10,
                backgroundColor: activeTab === tab.id ? '#7C3AED' : '#111827',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: activeTab === tab.id ? 0 : 1,
                borderColor: '#1F2937',
              }}
            >
              <Text style={{
                color: activeTab === tab.id ? 'white' : '#6B7280',
                fontSize: 13, fontWeight: '700',
              }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#7C3AED" size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🏜️</Text>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '800', textAlign: 'center' }}>
            {isArabic ? 'لا يوجد لاعبون بعد' : 'No players yet'}
          </Text>
          <Text style={{ color: '#6B7280', fontSize: 13, textAlign: 'center', marginTop: 6 }}>
            {activeTab === 'friends'
              ? (isArabic ? 'أضف أصدقاء لترى ترتيبك' : 'Add friends to see your ranking')
              : activeServer === 'en'
                ? (isArabic ? 'كن أول من يلعب بالإنجليزية!' : 'Be the first English player!')
                : (isArabic ? 'كن أول من يلعب بالعربية!' : 'Be the first Arabic player!')}
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>

          {/* PODIUM — top 3 */}
          {top3.length >= 2 && (
            <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
              <View style={{
                flexDirection: 'row', alignItems: 'flex-end',
                justifyContent: 'center', gap: 6,
              }}>
                {top3[1] && (
                  <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.8} onPress={() => openPlayerProfile(top3[1])}>
                    <PodiumCard player={top3[1]} rank={2} isMe={top3[1].id === myId} />
                  </TouchableOpacity>
                )}
                {top3[0] && (
                  <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.8} onPress={() => openPlayerProfile(top3[0])}>
                    <PodiumCard player={top3[0]} rank={1} isMe={top3[0].id === myId} />
                  </TouchableOpacity>
                )}
                {top3[2] && (
                  <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.8} onPress={() => openPlayerProfile(top3[2])}>
                    <PodiumCard player={top3[2]} rank={3} isMe={top3[2].id === myId} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* My rank banner if not in top 3 */}
          {myId && myRank > 3 && (
            <View style={{ marginHorizontal: 16, marginBottom: 10 }}>
              <View style={{
                backgroundColor: 'rgba(124,58,237,0.15)',
                borderRadius: 16, padding: 12,
                borderWidth: 1.5, borderColor: '#7C3AED',
                flexDirection: 'row', alignItems: 'center', gap: 10,
              }}>
                <Text style={{ color: '#A78BFA', fontSize: 16, fontWeight: '900', width: 32, textAlign: 'center' }}>
                  #{myRank}
                </Text>
                <Text style={{ color: '#A78BFA', fontSize: 14, fontWeight: '700', flex: 1 }}>
                  {isArabic ? 'مرتبتك' : 'Your rank'}
                </Text>
                <Text style={{ color: '#FDE68A', fontSize: 15, fontWeight: '900' }}>
                  {filtered.find(p => p.id === myId)?.classic_high_score?.toLocaleString()}
                </Text>
              </View>
            </View>
          )}

          {/* Rest of list */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 100 }}>
            {rest.map((player, i) => (
              <TouchableOpacity
                key={player.id}
                activeOpacity={0.7}
                onPress={() => openPlayerProfile(player)}
              >
                <PlayerRow
                  player={player}
                  rank={i + 4}
                  isMe={player.id === myId}
                  isArabic={isArabic}
                />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function PodiumCard({ player, rank }: { player: Player; rank: number; isMe: boolean }) {
  const medals = ['🥇', '🥈', '🥉'];
  const heights = [130, 100, 80];
  const colors = ['#F59E0B', '#9CA3AF', '#CD7C2F'];
  const sizes = [64, 54, 48];

  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: rank === 1 ? 28 : 22, marginBottom: 4 }}>{medals[rank - 1]}</Text>

      <View style={{ marginBottom: 6 }}>
        <GameAvatar player={player} size={sizes[rank - 1]} />
      </View>

      <View style={{ maxWidth: 80, flexDirection: 'row', alignItems: 'center' }}>
        <AnimatedPlayerName
          name={player.username}
          colorEffect={(player.username_color as UsernameColor) || 'default'}
          fontSize={rank === 1 ? 13 : 11}
          fontWeight="800"
        />
        {player.is_elite && <Text style={{ fontSize: 11, marginLeft: 3 }}>👑</Text>}
      </View>
      <Text style={{
        color: colors[rank - 1],
        fontSize: rank === 1 ? 14 : 12,
        fontWeight: '900', marginTop: 2,
      }}>
        {(player.classic_high_score || 0).toLocaleString()}
      </Text>

      {/* Podium block */}
      <View style={{
        width: '100%', height: heights[rank - 1],
        backgroundColor: `${colors[rank - 1]}18`,
        borderTopLeftRadius: 10, borderTopRightRadius: 10,
        borderWidth: 1, borderColor: `${colors[rank - 1]}40`,
        marginTop: 8, alignItems: 'center', paddingTop: 10,
      }}>
        <Text style={{ color: colors[rank - 1], fontSize: 20, fontWeight: '900' }}>{rank}</Text>
      </View>
    </View>
  );
}

function PlayerRow({ player, rank, isMe, isArabic }: { player: Player; rank: number; isMe: boolean; isArabic: boolean }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 10, paddingHorizontal: isMe ? 10 : 0,
      marginBottom: 4,
      backgroundColor: isMe ? 'rgba(124,58,237,0.1)' : 'transparent',
      borderRadius: isMe ? 14 : 0,
      borderWidth: isMe ? 1 : 0,
      borderColor: 'rgba(124,58,237,0.3)',
    }}>
      {/* Rank */}
      <Text style={{
        color: rank <= 10 ? '#F59E0B' : '#6B7280',
        fontSize: 14, fontWeight: '800',
        width: 32, textAlign: 'center',
      }}>
        {rank}
      </Text>

      <View style={{ marginRight: 10 }}>
        <GameAvatar player={player} size={40} />
      </View>

      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <AnimatedPlayerName
          name={player.username}
          colorEffect={(player.username_color as UsernameColor) || 'default'}
          fontSize={14}
          fontWeight={isMe ? '800' : '600'}
        />
        {player.is_elite && <Text style={{ fontSize: 12 }}>👑</Text>}
        {isMe && (
          <Text style={{ color: '#A78BFA', fontSize: 12, fontWeight: '800' }}>
            {isArabic ? '(أنت)' : '(You)'}
          </Text>
        )}
        {(player.current_streak || 0) > 0 && (
          <Text style={{ color: '#F59E0B', fontSize: 11 }}>
            🔥 {player.current_streak}
          </Text>
        )}
      </View>

      {/* Score */}
      <Text style={{ color: '#FDE68A', fontSize: 15, fontWeight: '900' }}>
        {(player.classic_high_score || 0).toLocaleString()}
      </Text>
    </View>
  );
}
