import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, Animated, ScrollView,
  StyleSheet, Dimensions, Pressable,
} from 'react-native';
import { COLORS } from '../lib/constants';
import { supabase } from '../lib/supabase';
import { ProfileAvatar } from './ProfileAvatar';
import { toArabicNumerals } from '../engine/ShareCard';
import { useLanguage } from '../lib/LanguageContext';

const { height: SH } = Dimensions.get('window');

interface LeaderboardPlayer {
  id: string;
  username: string;
  classic_high_score: number;
  avatar_color?: string;
  active_icon?: string;
  active_border?: string;
  current_streak?: number;
  language?: string;
}

interface ClassicLeaderboardProps {
  onClose: () => void;
}

export function ClassicLeaderboard({ onClose }: ClassicLeaderboardProps) {
  const { t, isEnglish } = useLanguage();
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [myRank, setMyRank] = useState<(LeaderboardPlayer & { rank: number }) | null>(null);
  const [loading, setLoading] = useState(true);
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0, tension: 65, friction: 9, useNativeDriver: true,
    }).start();
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setMyId(user.id);

    const { data } = await supabase
      .from('profiles')
      .select('id, username, classic_high_score, avatar_color, active_icon, active_border, current_streak, language')
      .not('classic_high_score', 'is', null)
      .gt('classic_high_score', 0)
      .order('classic_high_score', { ascending: false })
      .limit(50);

    setPlayers(data || []);

    if (user && data) {
      const rank = data.findIndex(p => p.id === user.id);
      if (rank >= 0) setMyRank({ ...data[rank], rank: rank + 1 });
    }

    setLoading(false);
  }

  function close() {
    Animated.timing(slideAnim, {
      toValue: 600, duration: 250, useNativeDriver: true,
    }).start(onClose);
  }

  const top3 = players.slice(0, 3);
  const rest = players.slice(3);

  return (
    <View style={styles.overlay}>
      {/* Background overlay */}
      <Pressable style={styles.backdrop} onPress={close} />

      {/* Sheet */}
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
      >
        {/* Handle */}
        <View style={styles.handle} />

        {/* Title bar */}
        <View style={styles.titleBar}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.titleText, { textAlign: isEnglish ? 'left' : 'right' }]}>{t('متصدرو الكلاسيكي', 'Classic Leaderboard')}</Text>
            <Text style={[styles.subtitleText, { textAlign: isEnglish ? 'left' : 'right' }]}>{t('أعلى النقاط كل الأوقات', 'All-time high scores')}</Text>
          </View>
          <TouchableOpacity onPress={close} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <Text style={styles.loadingText}>{t('جاري التحميل...', 'Loading...')}</Text>
          ) : (
            <>
              {/* PODIUM — top 3 */}
              {top3.length >= 3 && (
                <View style={styles.podiumSection}>
                  <View style={styles.podiumRow}>
                    {/* 2nd place */}
                    <PodiumPlayer player={top3[1]} rank={2} podiumHeight={90} />
                    {/* 1st place — tallest */}
                    <PodiumPlayer player={top3[0]} rank={1} podiumHeight={120} />
                    {/* 3rd place */}
                    <PodiumPlayer player={top3[2]} rank={3} podiumHeight={70} />
                  </View>
                </View>
              )}

              {/* MY RANK (if not in top 50) */}
              {myRank && myRank.rank > 50 && (
                <View style={styles.myRankSection}>
                  <Text style={[styles.myRankLabel, { textAlign: isEnglish ? 'left' : 'right' }]}>{t('مرتبتي', 'My rank')}</Text>
                  <LeaderboardRow
                    player={myRank}
                    rank={myRank.rank}
                    isMe={true}
                  />
                </View>
              )}

              {/* REST OF LIST */}
              <View style={styles.listSection}>
                {rest.map((player, i) => (
                  <LeaderboardRow
                    key={player.id}
                    player={player}
                    rank={i + 4}
                    isMe={player.id === myId}
                  />
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// Podium card for top 3
function PodiumPlayer({
  player, rank, podiumHeight,
}: {
  player: LeaderboardPlayer; rank: number; podiumHeight: number;
}) {
  const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const podiumColors: Record<number, string> = {
    1: 'rgba(245,158,11,0.2)',
    2: 'rgba(156,163,175,0.15)',
    3: 'rgba(205,124,47,0.15)',
  };

  return (
    <View style={styles.podiumPlayer}>
      {/* Medal */}
      <Text style={styles.medal}>{medals[rank]}</Text>

      {/* Profile avatar */}
      <ProfileAvatar
        size={rank === 1 ? 56 : 46}
        icon={player.active_icon || ''}
        username={player.username || ''}
        borderType={player.active_border || 'none'}
      />

      {/* Username */}
      <Text style={styles.podiumName} numberOfLines={1}>
        {player.username}
      </Text>

      {/* Score */}
      <Text style={styles.podiumScore}>
        {toArabicNumerals(player.classic_high_score || 0)}
      </Text>

      {/* Podium block */}
      <View
        style={[
          styles.podiumBlock,
          { height: podiumHeight, backgroundColor: podiumColors[rank] },
        ]}
      >
        <Text style={styles.podiumRank}>{rank}</Text>
      </View>
    </View>
  );
}

// Regular leaderboard row
function LeaderboardRow({
  player, rank, isMe,
}: {
  player: LeaderboardPlayer; rank: number; isMe: boolean;
}) {
  const { t, isEnglish } = useLanguage();
  return (
    <View style={[styles.row, isMe && styles.rowMe]}>
      {/* Rank number */}
      <Text style={styles.rowRank}>{toArabicNumerals(rank)}</Text>

      {/* Avatar */}
      <ProfileAvatar
        size={36}
        icon={player.active_icon || ''}
        username={player.username || ''}
        borderType={player.active_border || 'none'}
      />

      {/* Name + streak */}
      <View style={styles.rowInfo}>
        <Text style={[styles.rowName, isMe && styles.rowNameMe]} numberOfLines={1}>
          {player.username}{isMe ? t(' (أنت)', ' (you)') : ''}
        </Text>
        {(player.current_streak || 0) > 0 && (
          <Text style={styles.rowStreak}>🔥 {toArabicNumerals(player.current_streak || 0)} {t('يوم', 'days')}</Text>
        )}
      </View>

      {/* Score */}
      <Text style={styles.rowScore}>
        {toArabicNumerals(player.classic_high_score || 0)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SH * 0.85,
    backgroundColor: '#0D0730',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#3A3A5C',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E3A',
  },
  titleText: {
    fontSize: 20, fontWeight: '900', color: '#FFF',
  },
  subtitleText: {
    fontSize: 12, color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#1E1E3A',
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 12,
  },
  closeBtnText: { fontSize: 16, color: '#FFF', fontWeight: '700' },
  scrollArea: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  loadingText: {
    textAlign: 'center', color: COLORS.TEXT_SECONDARY,
    fontSize: 16, marginTop: 40,
  },

  // Podium
  podiumSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
  },
  podiumPlayer: {
    flex: 1,
    alignItems: 'center',
    maxWidth: 110,
  },
  medal: { fontSize: 24, marginBottom: 4 },
  podiumName: {
    fontSize: 12, fontWeight: '700', color: '#FFF',
    marginTop: 6, textAlign: 'center',
    width: '100%',
  },
  podiumScore: {
    fontSize: 14, fontWeight: '900', color: COLORS.GOLD,
    marginTop: 2,
  },
  podiumBlock: {
    width: '100%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
    marginTop: 6,
  },
  podiumRank: {
    fontSize: 20, fontWeight: '900', color: 'rgba(255,255,255,0.4)',
  },

  // My rank section
  myRankSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  myRankLabel: {
    fontSize: 13, fontWeight: '700', color: COLORS.PURPLE_LIGHT,
    marginBottom: 6,
  },

  // List
  listSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
    gap: 10,
  },
  rowMe: {
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
  },
  rowRank: {
    fontSize: 14, fontWeight: '800', color: COLORS.TEXT_SECONDARY,
    width: 28, textAlign: 'center',
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 14, fontWeight: '700', color: '#FFF',
  },
  rowNameMe: { color: COLORS.PURPLE_LIGHT },
  rowStreak: {
    fontSize: 11, color: COLORS.TEXT_SECONDARY, marginTop: 2,
  },
  rowScore: {
    fontSize: 16, fontWeight: '900', color: COLORS.GOLD,
  },
});
