import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
  ActivityIndicator, Alert, RefreshControl, Modal, Share, Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { COLORS } from '../src/lib/constants';
import {
  useFriends,
  type Friendship, type FriendRequest, type FriendProfile,
} from '../src/hooks/useFriends';
import { useCosmeticStore } from '../src/store/cosmeticStore';
import { useUserStore } from '../src/store/userStore';
import { toArabicNumerals } from '../src/engine/ShareCard';
import { useLanguage } from '../src/lib/LanguageContext';
import { ReferralSystem, type ReferralStats } from '../src/lib/ReferralSystem';
import {
  ChallengeSystem, CHALLENGE_MODES,
  WAGER_PRESETS_COINS, WAGER_PRESETS_GEMS, type WagerCurrency,
  type FriendChallenge,
} from '../src/lib/ChallengeSystem';
import { SendGiftModal, IncomingGiftCard } from '../src/components/SendGiftModal';
import { supabase } from '../src/lib/supabase';
import { AnimatedPlayerName } from '../src/components/AnimatedPlayerName';
import { type UsernameColor } from '../src/components/ColoredUsername';

export default function FriendsScreen() {
  const { theme: cosTheme } = useCosmeticStore();
  const { user } = useUserStore();
  const { t, isEnglish, language } = useLanguage();
  const {
    friends, pendingRequests, sentRequests, loading, error,
    searchPlayers, sendRequest, sendRequestByUsername,
    acceptRequest, rejectRequest, removeFriend,
    shareUsername, refresh,
  } = useFriends();

  const [tab, setTab] = useState<'friends' | 'requests' | 'add' | 'referral'>('friends');
  const [refreshing, setRefreshing] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{ id: string; success: boolean; error?: string } | null>(null);

  // Direct username add
  const [directName, setDirectName] = useState('');
  const [directSending, setDirectSending] = useState(false);
  const [directResult, setDirectResult] = useState<{ success: boolean; error?: string } | null>(null);

  // Challenge state
  const [challengeTarget, setChallengeTarget] = useState<Friendship | null>(null);
  const [incomingChallenges, setIncomingChallenges] = useState<FriendChallenge[]>([]);

  // Gift state
  const [giftFriend, setGiftFriend] = useState<Friendship['friend'] | null>(null);
  const [incomingGifts, setIncomingGifts] = useState<any[]>([]);

  // Referral state
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);

  const userId = user?.id;

  // Debounced search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      const results = await searchPlayers(searchQuery);
      setSearchResults(results);
      setSearching(false);
    }, 500);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQuery]);

  // Load incoming challenges & referral stats
  useEffect(() => {
    if (!userId || userId === 'offline') return;
    ChallengeSystem.getPendingChallenges(userId).then(setIncomingChallenges);
    ReferralSystem.getMyStats(userId).then(setReferralStats);
    // Load incoming gifts
    supabase.from('gifts')
      .select('*, sender:sender_id(username)')
      .eq('recipient_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setIncomingGifts(data.map((g: any) => ({
            ...g,
            sender_username: g.sender?.username || '?',
          })));
        }
      });
  }, [userId]);

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    if (userId && userId !== 'offline') {
      ChallengeSystem.getPendingChallenges(userId).then(setIncomingChallenges);
      ReferralSystem.getMyStats(userId).then(setReferralStats);
      // Refresh gifts
      const { data } = await supabase.from('gifts')
        .select('*, sender:sender_id(username)')
        .eq('recipient_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (data) {
        setIncomingGifts(data.map((g: any) => ({
          ...g,
          sender_username: g.sender?.username || '?',
        })));
      }
    }
    setRefreshing(false);
  }

  async function handleClaimGift(gift: any) {
    if (!userId || userId === 'offline') return;
    await supabase.from('gifts').update({ status: 'claimed' }).eq('id', gift.id);
    const { data: profile } = await supabase.from('profiles')
      .select('coins, bronze_tickets, silver_tickets, golden_tickets, streak_freezes, owned_icons')
      .eq('id', userId).single();
    if (profile) {
      const existingIcons: string[] = Array.isArray(profile.owned_icons) ? profile.owned_icons : [];
      const giftedIcons: string[] = Array.isArray(gift.items) ? gift.items : [];
      const mergedIcons = Array.from(new Set([...existingIcons, ...giftedIcons]));

      await supabase.from('profiles').update({
        coins: (profile.coins || 0) + (gift.coins || 0),
        bronze_tickets: (profile.bronze_tickets || 0) + (gift.bronze_tickets || 0),
        silver_tickets: (profile.silver_tickets || 0) + (gift.silver_tickets || 0),
        golden_tickets: (profile.golden_tickets || 0) + (gift.golden_tickets || 0),
        streak_freezes: (profile.streak_freezes || 0) + (gift.streak_freezes || 0),
        owned_icons: mergedIcons,
      }).eq('id', userId);
    }
    setIncomingGifts(prev => prev.filter(g => g.id !== gift.id));
  }

  async function handleSendRequest(targetId: string) {
    setSendingTo(targetId);
    setSendResult(null);
    const result = await sendRequest(targetId);
    setSendResult({ id: targetId, ...result });
    setSendingTo(null);
  }

  async function handleDirectAdd() {
    if (!directName.trim() || directSending) return;
    setDirectSending(true);
    setDirectResult(null);
    const result = await sendRequestByUsername(directName.trim());
    setDirectResult(result);
    setDirectSending(false);
    if (result.success) setDirectName('');
  }

  function handleRemove(friendship: Friendship) {
    Alert.alert(
      t('إزالة صديق', 'Remove Friend'),
      t(`هل تريد إزالة ${friendship.friend.username} من قائمة أصدقائك؟`,
        `Remove ${friendship.friend.username} from your friends?`),
      [
        { text: t('إلغاء', 'Cancel'), style: 'cancel' },
        { text: t('إزالة', 'Remove'), style: 'destructive', onPress: () => removeFriend(friendship.id) },
      ]
    );
  }

  async function handleAcceptChallenge(challenge: FriendChallenge) {
    const result = await ChallengeSystem.acceptChallenge(challenge.id, userId!);
    if (result.success) {
      setIncomingChallenges(prev => prev.filter(c => c.id !== challenge.id));
      // Navigate to the appropriate game mode
      if (challenge.mode === 'duel') {
        router.push(`/duel?challengeId=${challenge.id}` as any);
      } else if (challenge.mode === 'daily') {
        router.push('/daily' as any);
      } else if (challenge.mode === 'classic') {
        router.push('/classic' as any);
      } else if (challenge.mode === 'blind') {
        router.push('/blind' as any);
      }
    } else {
      Alert.alert(t('خطأ', 'Error'), isEnglish ? result.error_en : result.error_ar);
    }
  }

  async function handleDeclineChallenge(challenge: FriendChallenge) {
    await ChallengeSystem.declineChallenge(challenge.id, userId!);
    setIncomingChallenges(prev => prev.filter(c => c.id !== challenge.id));
  }

  const onlineCount = friends.filter(f => f.friend.is_online).length;

  function getPlayerStatus(playerId: string): 'friend' | 'sent' | 'none' {
    if (friends.some(f => f.friend.id === playerId)) return 'friend';
    if (sentRequests.includes(playerId)) return 'sent';
    return 'none';
  }

  return (
    <View style={[styles.container, { backgroundColor: cosTheme.colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={['#1A0F3C', cosTheme.colors.background || '#0D0730']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>{isEnglish ? '‹' : '›'}</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{t('أصدقائي', 'My Friends')}</Text>
            <View style={styles.headerCountRow}>
              <View style={styles.headerCountPill}>
                <View style={[styles.headerCountDot, { backgroundColor: '#A78BFA' }]} />
                <Text style={styles.headerCountText}>
                  {toArabicNumerals(friends.length)} {t('صديق', 'friends')}
                </Text>
              </View>
              {onlineCount > 0 && (
                <View style={styles.headerCountPill}>
                  <View style={[styles.headerCountDot, { backgroundColor: '#22C55E' }]} />
                  <Text style={[styles.headerCountText, { color: '#22C55E' }]}>
                    {toArabicNumerals(onlineCount)} {t('متصل', 'online')}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      {/* Incoming challenges banner */}
      {incomingChallenges.length > 0 && (
        <LinearGradient colors={['#2D1B69', '#1A0F3C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.challengeBanner}>
          <Text style={styles.challengeBannerText}>
            {t(`⚔️ لديك ${toArabicNumerals(incomingChallenges.length)} تحدي جديد!`,
              `⚔️ You have ${incomingChallenges.length} new challenge(s)!`)}
          </Text>
        </LinearGradient>
      )}

      {/* Pending requests banner */}
      {pendingRequests.length > 0 && tab !== 'requests' && (
        <TouchableOpacity onPress={() => setTab('requests')}>
          <LinearGradient colors={['#2D1F08', '#1C1208']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.pendingBanner}>
            <Text style={styles.pendingBannerText}>
              {t(`📩 لديك ${toArabicNumerals(pendingRequests.length)} طلب صداقة جديد`,
                `📩 You have ${pendingRequests.length} new friend request(s)`)}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}>
          {([
            { id: 'friends' as const, icon: '👥', label: t('الأصدقاء', 'Friends'), badge: friends.length || undefined },
            { id: 'requests' as const, icon: '📩', label: t('الطلبات', 'Requests'), badge: pendingRequests.length || undefined },
            { id: 'add' as const, icon: '➕', label: t('إضافة', 'Add'), badge: undefined },
            { id: 'referral' as const, icon: '🎁', label: t('دعوة', 'Refer'), badge: undefined },
          ]).map(tb => (
            <TouchableOpacity
              key={tb.id}
              style={[styles.tabBtn, tab === tb.id && styles.tabBtnActive]}
              onPress={() => setTab(tb.id)}
              activeOpacity={0.7}
            >
              {tab === tb.id ? (
                <LinearGradient
                  colors={['#7C3AED', '#5B21B6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.tabBtnGradient}
                >
                  <Text style={styles.tabIcon}>{tb.icon}</Text>
                  <Text style={[styles.tabText, styles.tabTextActive]}>{tb.label}</Text>
                  {tb.badge != null && tb.badge > 0 && (
                    <View style={styles.tabBadge}>
                      <Text style={styles.tabBadgeText}>{toArabicNumerals(tb.badge)}</Text>
                    </View>
                  )}
                </LinearGradient>
              ) : (
                <View style={styles.tabBtnInner}>
                  <Text style={styles.tabIcon}>{tb.icon}</Text>
                  <Text style={styles.tabText}>{tb.label}</Text>
                  {tb.badge != null && tb.badge > 0 && (
                    <View style={styles.tabBadge}>
                      <Text style={styles.tabBadgeText}>{toArabicNumerals(tb.badge)}</Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ═══ FRIENDS TAB ═══ */}
      {tab === 'friends' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.PURPLE} />}
        >
          {/* Incoming challenges */}
          {incomingChallenges.map(challenge => (
            <IncomingChallengeCard
              key={challenge.id}
              challenge={challenge}
              isEnglish={isEnglish}
              t={t}
              onAccept={() => handleAcceptChallenge(challenge)}
              onDecline={() => handleDeclineChallenge(challenge)}
            />
          ))}

          {/* Incoming gifts */}
          {incomingGifts.map(gift => (
            <IncomingGiftCard
              key={gift.id}
              gift={gift}
              language={language}
              onClaim={handleClaimGift}
            />
          ))}

          {loading && friends.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator color={COLORS.PURPLE} size="large" />
              <Text style={styles.loadingText}>{t('جاري تحميل الأصدقاء...', 'Loading friends...')}</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 40 }}>⚠️</Text>
              <Text style={styles.emptyTitle}>{t('حدث خطأ', 'An error occurred')}</Text>
              <Text style={styles.emptySub}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
                <Text style={styles.retryBtnText}>{t('إعادة المحاولة', 'Retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : friends.length === 0 ? (
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={['#7C3AED15', '#7C3AED05', 'transparent']}
                style={styles.emptyGlow}
              />
              <View style={styles.emptyIconWrap}>
                <LinearGradient
                  colors={['#2D1B69', '#1A1035']}
                  style={styles.emptyIconCircle}
                >
                  <Text style={{ fontSize: 40 }}>👥</Text>
                </LinearGradient>
              </View>
              <Text style={styles.emptyTitle}>{t('لا أصدقاء بعد', 'No friends yet')}</Text>
              <Text style={styles.emptySub}>{t('أضف أصدقاءك وتنافس معهم يومياً', 'Add friends and compete daily')}</Text>
              <TouchableOpacity style={styles.addFriendBtn} onPress={() => setTab('add')} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#7C3AED', '#5B21B6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.addFriendBtnGradient}
                >
                  <Text style={styles.addFriendBtnText}>{t('أضف صديقاً', 'Add a Friend')}</Text>
                  <Text style={{ fontSize: 16 }}>+</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setTab('referral')} style={styles.emptyReferralLink}>
                <Text style={styles.emptyReferralText}>{t('أو ادعُ أصدقاءك عبر الكود 🎁', 'Or invite friends with a code 🎁')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            friends
              .sort((a, b) => (b.friend.is_online ? 1 : 0) - (a.friend.is_online ? 1 : 0))
              .map((f) => (
                <FriendCard
                  key={f.id}
                  friendship={f}
                  t={t}
                  isEnglish={isEnglish}
                  onChallenge={() => setChallengeTarget(f)}
                  onRemove={() => handleRemove(f)}
                  onGift={() => setGiftFriend(f.friend)}
                />
              ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ═══ REQUESTS TAB ═══ */}
      {tab === 'requests' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {pendingRequests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <LinearGradient colors={['#2D1B69', '#1A1035']} style={styles.emptyIconCircle}>
                  <Text style={{ fontSize: 36 }}>📭</Text>
                </LinearGradient>
              </View>
              <Text style={styles.emptyTitle}>{t('لا طلبات صداقة جديدة', 'No new friend requests')}</Text>
              <Text style={styles.emptySub}>{t('عندما يضيفك شخص ستظهر الطلبات هنا', 'Requests will appear here when someone adds you')}</Text>
            </View>
          ) : (
            pendingRequests.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                t={t}
                onAccept={() => acceptRequest(req.id)}
                onReject={() => rejectRequest(req.id)}
              />
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ═══ ADD TAB ═══ */}
      {tab === 'add' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          <Text style={[styles.sectionTitle, { textAlign: isEnglish ? 'left' : 'right' }]}>{t('أضف باسم المستخدم', 'Add by Username')}</Text>
          <View style={styles.directRow}>
            <TextInput
              style={styles.directInput}
              placeholder={t('اسم المستخدم بالضبط...', 'Exact username...')}
              placeholderTextColor="#4B5563"
              value={directName}
              onChangeText={(txt) => { setDirectName(txt); setDirectResult(null); }}
              textAlign={isEnglish ? 'left' : 'right'}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.directBtn, (!directName.trim() || directSending) && { opacity: 0.5 }]}
              onPress={handleDirectAdd}
              disabled={!directName.trim() || directSending}
            >
              {directSending ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.directBtnText}>{t('إرسال', 'Send')}</Text>
              )}
            </TouchableOpacity>
          </View>
          {directResult && (
            <View style={[styles.resultBanner, {
              backgroundColor: directResult.success ? '#1C4A1C' : '#4A1C1C',
              borderColor: directResult.success ? '#22C55E' : '#EF4444',
            }]}>
              <Text style={{ color: directResult.success ? '#22C55E' : '#EF4444', fontSize: 14, fontWeight: '700', textAlign: isEnglish ? 'left' : 'right' }}>
                {directResult.success
                  ? t('✅ تم إرسال طلب الصداقة!', '✅ Friend request sent!')
                  : `❌ ${directResult.error}`}
              </Text>
            </View>
          )}

          <Text style={[styles.sectionTitle, { marginTop: 20, textAlign: isEnglish ? 'left' : 'right' }]}>{t('🔍 ابحث عن لاعبين', '🔍 Search Players')}</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder={t('ابحث باسم المستخدم...', 'Search by username...')}
              placeholderTextColor="#4B5563"
              value={searchQuery}
              onChangeText={setSearchQuery}
              textAlign={isEnglish ? 'left' : 'right'}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {searching && <ActivityIndicator color={COLORS.PURPLE} style={{ marginTop: 16 }} />}

          {searchResults.length > 0 && searchResults.map(player => {
            const playerStatus = getPlayerStatus(player.id);
            return (
              <View key={player.id} style={styles.searchResultCard}>
                <View style={styles.searchResultLeft}>
                  <View style={[styles.avatar, { backgroundColor: player.avatar_color }]}>
                    <Text style={styles.avatarText}>{player.username?.charAt(0) || '?'}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {player.is_elite && <Text style={{ fontSize: 13 }}>👑</Text>}
                      <AnimatedPlayerName
                        name={player.username}
                        colorEffect={(player.username_color as UsernameColor) || 'default'}
                        fontSize={15}
                        fontWeight="700"
                      />
                    </View>
                    <Text style={styles.friendStats}>
                      {t(
                        `🏆 ${toArabicNumerals(player.total_wins)} فوز · 🔥 ${toArabicNumerals(player.current_streak)}`,
                        `🏆 ${player.total_wins} wins · 🔥 ${player.current_streak}`
                      )}
                    </Text>
                  </View>
                </View>
                {playerStatus === 'friend' ? (
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>{t('صديق ✓', 'Friend ✓')}</Text>
                  </View>
                ) : playerStatus === 'sent' ? (
                  <View style={[styles.statusBadge, { borderColor: '#F59E0B40', backgroundColor: '#1C1208' }]}>
                    <Text style={[styles.statusBadgeText, { color: '#F59E0B' }]}>
                      {t('بانتظار القبول', 'Pending')}
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.addSmallBtn, sendingTo === player.id && { opacity: 0.5 }]}
                    onPress={() => handleSendRequest(player.id)}
                    disabled={sendingTo === player.id}
                  >
                    {sendingTo === player.id ? (
                      <ActivityIndicator color="#7C3AED" size="small" />
                    ) : (
                      <Text style={styles.addSmallBtnText}>
                        {sendResult?.id === player.id && sendResult.success
                          ? t('✓ تم', '✓ Done')
                          : t('➕ أضف', '➕ Add')}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
            <Text style={styles.noResults}>
              {t(`لا نتائج لـ "${searchQuery}"`, `No results for "${searchQuery}"`)}
            </Text>
          )}

          <View style={styles.myIdCard}>
            <Text style={styles.myIdLabel}>{t('اسمك في اللعبة:', 'Your in-game name:')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
              {user?.isElite && <Text style={{ fontSize: 16 }}>👑</Text>}
              <AnimatedPlayerName
                name={user?.username || '—'}
                colorEffect={(user?.usernameColor as UsernameColor) || 'default'}
                fontSize={18}
                fontWeight="800"
              />
            </View>
            <TouchableOpacity style={styles.shareBtn} onPress={shareUsername}>
              <Text style={styles.shareBtnText}>{t('📤 شارك اسمك مع أصدقائك', '📤 Share your name with friends')}</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ═══ REFERRAL TAB ═══ */}
      {tab === 'referral' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.PURPLE} />}
        >
          <ReferralTab
            stats={referralStats}
            language={language}
            isEnglish={isEnglish}
            t={t}
            username={user?.username || ''}
          />
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ═══ CHALLENGE BOTTOM SHEET ═══ */}
      {challengeTarget && (
        <ChallengeSheet
          friend={challengeTarget.friend}
          myCoins={user?.coins || 0}
          myGems={user?.gems || 0}
          userId={userId!}
          username={user?.username || ''}
          language={language}
          isEnglish={isEnglish}
          t={t}
          onClose={() => setChallengeTarget(null)}
        />
      )}

      {giftFriend && (
        <SendGiftModal friend={giftFriend} onClose={() => setGiftFriend(null)} />
      )}
    </View>
  );
}

// ─── REFERRAL TAB COMPONENT ───
function ReferralTab({ stats, language, isEnglish, t, username }: {
  stats: ReferralStats | null;
  language: string;
  isEnglish: boolean;
  t: (ar: string, en: string) => string;
  username: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    if (!stats) return;
    await Clipboard.setStringAsync(stats.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareCode() {
    if (!stats) return;
    const message = isEnglish
      ? `Play Kalimat with me — the daily Arabic word game!\nUse my code at signup for 30 free coins: ${stats.code}\nDownload: kalimat.app`
      : `العب معي كلمات — لعبة الكلمات العربية اليومية!\nاستخدم كودي عند التسجيل واحصل على 30 عملة مجاناً: ${stats.code}\nحمّل التطبيق: kalimat.app`;
    await Share.share({ message });
  }

  if (!stats) return <ActivityIndicator color={COLORS.PURPLE} style={{ marginTop: 40 }} />;

  const progress = stats.nextMilestone
    ? stats.confirmedReferrals / stats.nextMilestone.at
    : 1;

  return (
    <View style={{ gap: 16 }}>
      {/* Code display */}
      <View style={refStyles.codeCard}>
        <Text style={refStyles.codeLabel}>
          {t('كود الدعوة الخاص بك', 'Your referral code')}
        </Text>
        <View style={refStyles.codeBig}>
          <Text style={refStyles.codeText}>{stats.code}</Text>
        </View>
        <View style={refStyles.codeActions}>
          <TouchableOpacity style={refStyles.copyBtn} onPress={copyCode}>
            <Text style={refStyles.copyBtnIcon}>{copied ? '✓' : '📋'}</Text>
            <Text style={refStyles.copyBtnText}>
              {copied ? t('تم النسخ', 'Copied!') : t('نسخ', 'Copy')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={refStyles.shareCodeBtn} onPress={shareCode}>
            <Text style={refStyles.copyBtnIcon}>📤</Text>
            <Text style={refStyles.copyBtnText}>{t('شارك الكود', 'Share code')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress to next milestone */}
      {stats.nextMilestone && (
        <View style={refStyles.progressCard}>
          <View style={refStyles.progressHeader}>
            <Text style={refStyles.progressLabel}>
              {t('التقدم نحو المكافأة', 'Progress to reward')}
            </Text>
            <Text style={refStyles.progressCount}>
              {isEnglish ? `${stats.confirmedReferrals}/${stats.nextMilestone.at}` :
                `${toArabicNumerals(stats.confirmedReferrals)}/${toArabicNumerals(stats.nextMilestone.at)}`}
            </Text>
          </View>
          <View style={refStyles.progressBarBg}>
            <View style={[refStyles.progressBarFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
          </View>
          <Text style={refStyles.progressHint}>
            {isEnglish
              ? `${stats.nextMilestone.at - stats.confirmedReferrals} more referrals to get ${stats.nextMilestone.reward_en}`
              : `${toArabicNumerals(stats.nextMilestone.at - stats.confirmedReferrals)} دعوات أخرى للحصول على ${stats.nextMilestone.reward_ar}`}
          </Text>
        </View>
      )}

      {/* Milestones list */}
      <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFF', textAlign: isEnglish ? 'left' : 'right' }}>
        {t('جدول المكافآت', 'Reward milestones')}
      </Text>

      {[
        { at: 5,  reward_ar: '💎 50 جوهرة',                       reward_en: '💎 50 gems' },
        { at: 15, reward_ar: '💎 100 جوهرة + 🏮 تذكرة ذهبية',     reward_en: '💎 100 gems + 🏮 Golden ticket' },
        { at: 50, reward_ar: '💎 300 جوهرة + 👑 أيقونة السفير',    reward_en: '💎 300 gems + 👑 Ambassador icon' },
      ].map((m) => {
        const reached = stats.confirmedReferrals >= m.at;
        return (
          <View key={m.at} style={[refStyles.milestoneRow, {
            backgroundColor: reached ? '#14532D' : '#1A1A2E',
            borderColor: reached ? '#22C55E' : '#2D2D50',
          }]}>
            <View style={[refStyles.milestoneCircle, {
              backgroundColor: reached ? '#22C55E' : '#2D2D50',
            }]}>
              <Text style={refStyles.milestoneCircleText}>
                {reached ? '✓' : isEnglish ? String(m.at) : toArabicNumerals(m.at)}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={refStyles.milestoneTitle}>
                {isEnglish ? `${m.at} confirmed referrals` : `${toArabicNumerals(m.at)} دعوات مؤكدة`}
              </Text>
              <Text style={refStyles.milestoneReward}>
                {isEnglish ? m.reward_en : m.reward_ar}
              </Text>
            </View>
          </View>
        );
      })}

      {/* Pending notice */}
      {stats.pendingReferrals > 0 && (
        <Text style={refStyles.pendingNotice}>
          {isEnglish
            ? `${stats.pendingReferrals} pending — confirmed after friend plays first game`
            : `${toArabicNumerals(stats.pendingReferrals)} دعوة في الانتظار — تُؤكد بعد أول لعبة للصديق`}
        </Text>
      )}
    </View>
  );
}

// ─── CHALLENGE BOTTOM SHEET ───
function ChallengeSheet({ friend, myCoins, myGems, userId, username, language, isEnglish, t, onClose }: {
  friend: FriendProfile;
  myCoins: number;
  myGems: number;
  userId: string;
  username: string;
  language: string;
  isEnglish: boolean;
  t: (ar: string, en: string) => string;
  onClose: () => void;
}) {
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [wagerAmount, setWagerAmount] = useState(0);
  const [wagerCurrency, setWagerCurrency] = useState<WagerCurrency>('coins');
  const [sending, setSending] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const presets = wagerCurrency === 'gems' ? WAGER_PRESETS_GEMS : WAGER_PRESETS_COINS;
  const myBalance = wagerCurrency === 'gems' ? myGems : myCoins;
  const currencySymbol = wagerCurrency === 'gems' ? '💎' : '🪙';

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 1, tension: 60, friction: 12, useNativeDriver: true }).start();
  }, []);

  useEffect(() => { setWagerAmount(0); }, [wagerCurrency]);

  function closeSheet() {
    Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(onClose);
  }

  async function sendChallenge() {
    if (!selectedMode || sending) return;
    if (wagerAmount > myBalance) {
      Alert.alert(
        t('خطأ', 'Error'),
        wagerCurrency === 'gems'
          ? t('جواهرك غير كافية للرهان', 'Not enough gems to wager')
          : t('عملاتك غير كافية للرهان', 'Not enough coins to wager')
      );
      return;
    }
    setSending(true);

    const result = await ChallengeSystem.sendChallenge({
      challengerId: userId,
      challengedId: friend.id,
      mode: selectedMode,
      wagerAmount,
      wagerCurrency,
      language,
      challengerUsername: username,
    });

    if (result.success) {
      Alert.alert(
        t('✅ تم الإرسال', '✅ Sent'),
        t(`أُرسل التحدي إلى ${friend.username} — سيصله إشعار داخل التطبيق`,
          `Challenge sent to ${friend.username} — they'll get an in-app notification`)
      );
      closeSheet();
    } else {
      Alert.alert(t('خطأ', 'Error'), isEnglish ? result.error_en : result.error_ar);
    }
    setSending(false);
  }

  return (
    <Modal transparent visible animationType="none" onRequestClose={closeSheet}>
      <TouchableOpacity style={csStyles.overlay} activeOpacity={1} onPress={closeSheet}>
        <Animated.View
          style={[csStyles.sheet, {
            transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }) }],
          }]}
        >
          <TouchableOpacity activeOpacity={1}>
            {/* Header */}
            <View style={csStyles.header}>
              <Text style={csStyles.headerTitle}>
                {t(`تحدٍ ${friend.username}`, `Challenge ${friend.username}`)}
              </Text>
              <TouchableOpacity onPress={closeSheet}>
                <Text style={{ color: '#6B7280', fontSize: 22 }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Step 1: Mode selection */}
            <Text style={csStyles.stepLabel}>
              {t('١. اختر الوضع', '1. Choose mode')}
            </Text>
            <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
              {CHALLENGE_MODES.map(mode => (
                <TouchableOpacity
                  key={mode.id}
                  onPress={() => setSelectedMode(mode.id)}
                  style={[csStyles.modeRow, {
                    backgroundColor: selectedMode === mode.id ? '#2D1B69' : '#1A1A2E',
                    borderColor: selectedMode === mode.id ? '#7C3AED' : '#2D2D50',
                    borderWidth: selectedMode === mode.id ? 2 : 1,
                  }]}
                >
                  <Text style={{ fontSize: 24 }}>{mode.emoji}</Text>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={csStyles.modeName}>{isEnglish ? mode.name_en : mode.name_ar}</Text>
                    <Text style={csStyles.modeDesc}>{isEnglish ? mode.desc_en : mode.desc_ar}</Text>
                  </View>
                  {selectedMode === mode.id && (
                    <Text style={{ color: '#7C3AED', fontSize: 18, fontWeight: '800' }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Step 2: Wager */}
            <Text style={[csStyles.stepLabel, { marginTop: 16 }]}>
              {t('٢. الرهان (اختياري)', '2. Wager (optional)')}
            </Text>

            {/* Currency toggle */}
            <View style={{
              flexDirection: 'row', backgroundColor: '#0D0730',
              borderRadius: 14, padding: 4, marginBottom: 10,
              borderWidth: 1, borderColor: '#2D2D50',
            }}>
              {(['coins', 'gems'] as WagerCurrency[]).map(cur => (
                <TouchableOpacity
                  key={cur}
                  onPress={() => setWagerCurrency(cur)}
                  style={{
                    flex: 1, height: 36, borderRadius: 10,
                    backgroundColor: wagerCurrency === cur ? (cur === 'gems' ? '#A855F7' : '#F59E0B') : 'transparent',
                    alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'row', gap: 6,
                  }}
                >
                  <Text style={{ fontSize: 15 }}>{cur === 'gems' ? '💎' : '🪙'}</Text>
                  <Text style={{
                    color: wagerCurrency === cur ? '#FFF' : '#9CA3AF',
                    fontSize: 13, fontWeight: '800',
                  }}>
                    {cur === 'gems' ? t('جواهر', 'Gems') : t('عملات', 'Coins')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={csStyles.wagerInfo}>
              <Text style={csStyles.wagerInfoText}>
                {t('الفائز يأخذ كل شيء 🏆', 'Winner takes all 🏆')}
              </Text>
              <Text style={csStyles.wagerBalance}>
                {isEnglish
                  ? `Your balance: ${myBalance} ${currencySymbol}`
                  : `رصيدك: ${toArabicNumerals(myBalance)} ${currencySymbol}`}
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={csStyles.wagerPresets}>
              {presets.map(amount => (
                <TouchableOpacity
                  key={amount}
                  onPress={() => setWagerAmount(amount)}
                  disabled={amount > myBalance}
                  style={[csStyles.wagerChip, {
                    backgroundColor: wagerAmount === amount ? '#7C3AED' : '#0D0730',
                    borderColor: wagerAmount === amount ? '#7C3AED' : '#2D2D50',
                    opacity: amount > myBalance ? 0.35 : 1,
                  }]}
                >
                  <Text style={[csStyles.wagerChipText, {
                    color: wagerAmount === amount ? '#FFF' : '#A78BFA',
                  }]}>
                    {amount === 0 ? t('بدون', 'None') : `${isEnglish ? amount : toArabicNumerals(amount)} ${currencySymbol}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              value={wagerAmount > 0 && !presets.includes(wagerAmount) ? String(wagerAmount) : ''}
              onChangeText={txt => {
                const n = parseInt(txt) || 0;
                if (n <= myBalance) setWagerAmount(n);
              }}
              placeholder={t('أو أدخل مبلغاً مخصصاً...', 'Or enter custom amount...')}
              placeholderTextColor="#4B5563"
              keyboardType="numeric"
              style={csStyles.customInput}
            />

            {wagerAmount > 0 && (
              <View style={csStyles.wagerWarning}>
                <Text style={csStyles.wagerWarningText}>
                  {isEnglish
                    ? `\u26A0\uFE0F ${wagerAmount}${currencySymbol} will be deducted now. Win to get them back + ${wagerAmount}${currencySymbol} from your friend.`
                    : `\u26A0\uFE0F ستُخصم ${toArabicNumerals(wagerAmount)} ${currencySymbol} الآن. إذا فزت استعدتها + ${toArabicNumerals(wagerAmount)} ${currencySymbol} من صديقك.`}
                </Text>
              </View>
            )}

            {/* Send button */}
            <TouchableOpacity
              style={[csStyles.sendBtn, (!selectedMode || sending) && { opacity: 0.5 }]}
              onPress={sendChallenge}
              disabled={!selectedMode || sending}
            >
              {sending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={{ fontSize: 20 }}>⚔️</Text>
                  <Text style={csStyles.sendBtnText}>{t('أرسل التحدي', 'Send challenge')}</Text>
                </>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── INCOMING CHALLENGE CARD ───
const IncomingChallengeCard = React.memo(function IncomingChallengeCard({ challenge, isEnglish, t, onAccept, onDecline }: {
  challenge: FriendChallenge;
  isEnglish: boolean;
  t: (ar: string, en: string) => string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const modeEmojis: Record<string, string> = { daily: '📅', duel: '⚡', classic: '∞' };
  const mode = CHALLENGE_MODES.find(m => m.id === challenge.mode);
  const modeLabel = mode ? (isEnglish ? mode.name_en : mode.name_ar) : challenge.mode;
  const currency = (challenge as any).wager_currency === 'gems' ? 'gems' : 'coins';
  const symbol = currency === 'gems' ? '💎' : '🪙';

  return (
    <View style={icStyles.card}>
      <View style={icStyles.top}>
        <Text style={{ fontSize: 24 }}>⚔️</Text>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={icStyles.title}>
            {isEnglish
              ? `${challenge.challenger?.username} challenges you!`
              : `${challenge.challenger?.username} يتحداك!`}
          </Text>
          <View style={icStyles.metaRow}>
            <Text style={icStyles.modeTag}>
              {modeEmojis[challenge.mode] || '🎮'} {modeLabel}
            </Text>
            {challenge.wager_amount > 0 && (
              <Text style={icStyles.wagerTag}>
                {symbol} {isEnglish ? `Wager: ${challenge.wager_amount}` : `رهان: ${toArabicNumerals(challenge.wager_amount)}`}
              </Text>
            )}
          </View>
        </View>
      </View>

      {challenge.wager_amount > 0 && (
        <View style={icStyles.wagerBanner}>
          <Text style={icStyles.wagerBannerText}>
            {isEnglish
              ? `Winner gets ${challenge.wager_amount * 2}${symbol} 🏆`
              : `الفائز يحصل على ${toArabicNumerals(challenge.wager_amount * 2)}${symbol} 🏆`}
          </Text>
        </View>
      )}

      <View style={icStyles.actions}>
        <TouchableOpacity style={icStyles.acceptBtn} onPress={onAccept}>
          <Text style={{ fontSize: 14 }}>⚔️</Text>
          <Text style={icStyles.acceptText}>{t('قبول', 'Accept')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={icStyles.declineBtn} onPress={onDecline}>
          <Text style={icStyles.declineText}>{t('رفض', 'Decline')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ─── FRIEND CARD ───
const FriendCard = React.memo(function FriendCard({ friendship, onChallenge, onRemove, onGift, t, isEnglish }: {
  friendship: Friendship; onChallenge: () => void; onRemove: () => void;
  onGift: () => void;
  t: (ar: string, en: string) => string; isEnglish: boolean;
}) {
  const f = friendship.friend;
  const initial = f.username?.charAt(0) || '?';

  return (
    <View style={[styles.friendCard, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
      <TouchableOpacity onLongPress={onRemove} style={[styles.friendLeft, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: f.avatar_color || COLORS.PURPLE }]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={[styles.onlineDot, { backgroundColor: f.is_online ? '#22C55E' : '#4B5563' }]} />
        </View>
        <View style={styles.friendInfo}>
          <View style={{ flexDirection: isEnglish ? 'row' : 'row-reverse', alignItems: 'center', gap: 4 }}>
            {f.is_elite && <Text style={{ fontSize: 13 }}>👑</Text>}
            <AnimatedPlayerName
              name={f.username}
              colorEffect={(f.username_color as UsernameColor) || 'default'}
              fontSize={15}
              fontWeight="700"
            />
          </View>
          <Text style={styles.friendStatus}>
            {f.is_online ? t('🟢 متصل الآن', '🟢 Online') : t('⚫ غير متصل', '⚫ Offline')}
          </Text>
          <Text style={styles.friendStats}>
            {t(
              `🏆 ${toArabicNumerals(f.total_wins || 0)} فوز · 🔥 ${toArabicNumerals(f.current_streak || 0)}`,
              `🏆 ${f.total_wins || 0} wins · 🔥 ${f.current_streak || 0}`
            )}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
        <TouchableOpacity
          onPress={onGift}
          activeOpacity={0.85}
          style={{
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: 'rgba(245,158,11,0.15)',
            borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 16 }}>🎁</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.challengeBtn} onPress={onChallenge} activeOpacity={0.85}>
          <Text style={styles.challengeIcon}>⚔️</Text>
          <Text style={styles.challengeText}>{t('تحدّي', 'Challenge')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ─── REQUEST CARD ───
const RequestCard = React.memo(function RequestCard({ request, onAccept, onReject, t }: {
  request: FriendRequest; onAccept: () => void; onReject: () => void;
  t: (ar: string, en: string) => string;
}) {
  const r = request.requester;
  const initial = r.username?.charAt(0) || '?';

  return (
    <View style={styles.requestCard}>
      <View style={styles.requestTop}>
        <View style={[styles.avatar, { backgroundColor: r.avatar_color || COLORS.PURPLE, width: 44, height: 44 }]}>
          <Text style={[styles.avatarText, { fontSize: 18 }]}>{initial}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {r.is_elite && <Text style={{ fontSize: 13 }}>👑</Text>}
            <AnimatedPlayerName
              name={r.username}
              colorEffect={(r.username_color as UsernameColor) || 'default'}
              fontSize={15}
              fontWeight="700"
            />
          </View>
          <Text style={styles.friendStats}>
            {t(
              `🏆 ${toArabicNumerals(r.total_wins || 0)} فوز · يريد إضافتك كصديق`,
              `🏆 ${r.total_wins || 0} wins · Wants to add you`
            )}
          </Text>
        </View>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
          <Text style={styles.acceptText}>{t('✓ قبول', '✓ Accept')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rejectBtn} onPress={onReject}>
          <Text style={styles.rejectText}>{t('✕ رفض', '✕ Decline')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ─── REFERRAL STYLES ───
const refStyles = StyleSheet.create({
  codeCard: {
    backgroundColor: '#13102B', borderRadius: 18, padding: 22,
    borderWidth: 1, borderColor: '#FFFFFF08', alignItems: 'center', gap: 14,
  },
  codeLabel: { color: '#6B7280', fontSize: 14 },
  codeBig: {
    backgroundColor: '#0D0730', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32,
    borderWidth: 1.5, borderColor: '#7C3AED',
  },
  codeText: { color: '#FFF', fontSize: 32, fontWeight: '900', letterSpacing: 8 },
  codeActions: { flexDirection: 'row', gap: 12 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#7C3AED20', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 16,
    borderWidth: 1, borderColor: '#7C3AED40',
  },
  shareCodeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#22C55E20', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 16,
    borderWidth: 1, borderColor: '#22C55E40',
  },
  copyBtnIcon: { fontSize: 16 },
  copyBtnText: { color: '#A78BFA', fontSize: 14, fontWeight: '700' },
  progressCard: {
    backgroundColor: '#1A1A2E', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#2D2D50', gap: 10,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { color: '#6B7280', fontSize: 13 },
  progressCount: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  progressBarBg: {
    height: 8, backgroundColor: '#0D0730', borderRadius: 4, overflow: 'hidden',
  },
  progressBarFill: { height: '100%', backgroundColor: '#7C3AED', borderRadius: 4 },
  progressHint: { color: '#A78BFA', fontSize: 12 },
  milestoneRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 14,
    borderWidth: 1,
  },
  milestoneCircle: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  milestoneCircleText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  milestoneTitle: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  milestoneReward: { color: '#A78BFA', fontSize: 12 },
  pendingNotice: {
    color: '#F59E0B', fontSize: 13, textAlign: 'center',
    backgroundColor: '#1C1208', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#F59E0B40',
  },
});

// ─── CHALLENGE SHEET STYLES ───
const csStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0D0730', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40, maxHeight: '85%',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  stepLabel: { color: '#A78BFA', fontSize: 15, fontWeight: '800', marginBottom: 10 },
  modeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 14, marginBottom: 8,
  },
  modeName: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  modeDesc: { color: '#6B7280', fontSize: 12 },
  wagerInfo: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  wagerInfoText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  wagerBalance: { color: '#6B7280', fontSize: 13 },
  wagerPresets: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  wagerChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1,
  },
  wagerChipText: { fontSize: 14, fontWeight: '700' },
  customInput: {
    backgroundColor: '#0D0730', borderRadius: 10,
    borderWidth: 1, borderColor: '#2D2D50',
    color: '#FFF', fontSize: 15, padding: 12, marginTop: 4,
  },
  wagerWarning: {
    backgroundColor: '#1C1208', borderRadius: 10, padding: 12, marginTop: 8,
    borderWidth: 1, borderColor: '#F59E0B40',
  },
  wagerWarningText: { color: '#F59E0B', fontSize: 12, lineHeight: 18 },
  sendBtn: {
    backgroundColor: '#7C3AED', borderRadius: 14, height: 52,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 16,
  },
  sendBtnText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
});

// ─── INCOMING CHALLENGE CARD STYLES ───
const icStyles = StyleSheet.create({
  card: {
    backgroundColor: '#13102B', borderRadius: 18, padding: 14,
    borderWidth: 1.5, borderColor: '#7C3AED60', gap: 12, marginBottom: 4,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  metaRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  modeTag: { color: '#A78BFA', fontSize: 13, fontWeight: '600' },
  wagerTag: { color: '#F59E0B', fontSize: 13, fontWeight: '600' },
  wagerBanner: {
    backgroundColor: '#1C1208', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#F59E0B40', alignItems: 'center',
  },
  wagerBannerText: { color: '#FCD34D', fontSize: 13, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10 },
  acceptBtn: {
    flex: 1, height: 46, backgroundColor: '#7C3AED',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 6,
  },
  acceptText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  declineBtn: {
    flex: 1, height: 46, backgroundColor: '#1F2937',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#374151',
  },
  declineText: { color: '#9CA3AF', fontSize: 15, fontWeight: '700' },
});

// ─── MAIN STYLES ───
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0730' },
  headerGradient: { paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 8 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FFFFFF10', alignItems: 'center', justifyContent: 'center',
  },
  backText: { color: '#A78BFA', fontSize: 26, fontWeight: '300', marginTop: -2 },
  headerCenter: { alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#FFF', letterSpacing: 0.5 },
  headerCountRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  headerCountPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FFFFFF08', borderRadius: 20,
    paddingVertical: 4, paddingHorizontal: 10,
  },
  headerCountDot: { width: 6, height: 6, borderRadius: 3 },
  headerCountText: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },

  challengeBanner: {
    marginHorizontal: 16, marginTop: 10,
    borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#7C3AED60',
  },
  challengeBannerText: { color: '#C4B5FD', fontSize: 14, fontWeight: '700', textAlign: 'center' },

  pendingBanner: {
    marginHorizontal: 16, marginTop: 8,
    borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#F59E0B30',
  },
  pendingBannerText: { color: '#FCD34D', fontSize: 14, fontWeight: '700', textAlign: 'center' },

  tabContainer: {
    borderBottomWidth: 1, borderBottomColor: '#FFFFFF08',
  },
  tabRow: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, gap: 8 },
  tabBtn: { borderRadius: 24, overflow: 'hidden' },
  tabBtnActive: {},
  tabBtnGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 9, paddingHorizontal: 18, borderRadius: 24,
  },
  tabBtnInner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 9, paddingHorizontal: 18, borderRadius: 24,
    backgroundColor: '#FFFFFF08',
  },
  tabIcon: { fontSize: 14 },
  tabText: { color: '#6B7280', fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: '#FFF' },
  tabBadge: {
    backgroundColor: '#EF4444', borderRadius: 10, minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    marginLeft: 2,
  },
  tabBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },

  listContent: { padding: 16, gap: 10 },
  center: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  loadingText: { color: '#6B7280', fontSize: 14 },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 14 },
  emptyGlow: {
    position: 'absolute', top: 40, width: 200, height: 200, borderRadius: 100,
  },
  emptyIconWrap: { marginBottom: 4 },
  emptyIconCircle: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#7C3AED30',
  },
  emptyTitle: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  emptySub: { color: '#6B7280', fontSize: 14, textAlign: 'center', maxWidth: 260 },
  addFriendBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 4 },
  addFriendBtnGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 14, paddingHorizontal: 28, borderRadius: 16,
  },
  addFriendBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  emptyReferralLink: { marginTop: 4 },
  emptyReferralText: { color: '#A78BFA', fontSize: 13, fontWeight: '600' },

  retryBtn: { backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 28 },
  retryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  friendCard: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: '#13102B', borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: '#FFFFFF08',
  },
  friendLeft: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2.5, borderColor: '#13102B',
  },
  friendInfo: { flex: 1, gap: 3 },
  friendName: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  friendStatus: { fontSize: 12, color: '#6B7280' },
  friendStats: { fontSize: 11, color: '#4B5563' },

  challengeBtn: {
    backgroundColor: '#7C3AED18', borderRadius: 14,
    paddingVertical: 10, paddingHorizontal: 16,
    alignItems: 'center', gap: 3,
    borderWidth: 1, borderColor: '#7C3AED30',
  },
  challengeIcon: { fontSize: 18 },
  challengeText: { color: '#A78BFA', fontSize: 12, fontWeight: '800' },

  requestCard: {
    backgroundColor: '#13102B', borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: '#7C3AED20', gap: 12,
  },
  requestTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  requestActions: { flexDirection: 'row-reverse', gap: 10 },
  acceptBtn: {
    flex: 1, backgroundColor: '#14532D', borderRadius: 12,
    paddingVertical: 11, alignItems: 'center',
    borderWidth: 1, borderColor: '#22C55E60',
  },
  acceptText: { color: '#22C55E', fontSize: 14, fontWeight: '800' },
  rejectBtn: {
    flex: 1, backgroundColor: '#2D1215', borderRadius: 12,
    paddingVertical: 11, alignItems: 'center',
    borderWidth: 1, borderColor: '#EF444430',
  },
  rejectText: { color: '#EF4444', fontSize: 14, fontWeight: '700' },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  directRow: { flexDirection: 'row-reverse', gap: 10 },
  directInput: {
    flex: 1, backgroundColor: '#13102B', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 13,
    color: '#FFF', fontSize: 16, borderWidth: 1, borderColor: '#FFFFFF10',
  },
  directBtn: {
    backgroundColor: '#7C3AED', borderRadius: 14,
    paddingHorizontal: 22, justifyContent: 'center',
  },
  directBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  resultBanner: { borderRadius: 12, padding: 12, borderWidth: 1 },

  searchRow: { flexDirection: 'row-reverse', position: 'relative' },
  searchInput: {
    flex: 1, backgroundColor: '#13102B', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 13, paddingLeft: 40,
    color: '#FFF', fontSize: 16, borderWidth: 1, borderColor: '#FFFFFF10',
  },
  clearBtn: { position: 'absolute', left: 12, top: 0, bottom: 0, justifyContent: 'center' },
  clearBtnText: { color: '#6B7280', fontSize: 18 },

  searchResultCard: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: '#13102B', borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: '#FFFFFF08',
  },
  searchResultLeft: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  addSmallBtn: {
    backgroundColor: '#7C3AED18', borderRadius: 12,
    paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1, borderColor: '#7C3AED30',
  },
  addSmallBtnText: { color: '#A78BFA', fontSize: 13, fontWeight: '700' },
  statusBadge: {
    backgroundColor: '#14532D', borderRadius: 12,
    paddingVertical: 6, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#22C55E30',
  },
  statusBadgeText: { color: '#22C55E', fontSize: 11, fontWeight: '700' },
  noResults: { color: '#6B7280', fontSize: 14, textAlign: 'center', marginTop: 16 },

  myIdCard: {
    backgroundColor: '#13102B', borderRadius: 16, padding: 18, gap: 10,
    borderWidth: 1, borderColor: '#FFFFFF08', marginTop: 20, alignItems: 'center',
  },
  myIdLabel: { color: '#6B7280', fontSize: 12 },
  myIdValue: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  shareBtn: {
    backgroundColor: '#7C3AED18', borderRadius: 12,
    paddingVertical: 9, paddingHorizontal: 22,
    borderWidth: 1, borderColor: '#7C3AED30',
  },
  shareBtnText: { color: '#A78BFA', fontSize: 13, fontWeight: '700' },
});
