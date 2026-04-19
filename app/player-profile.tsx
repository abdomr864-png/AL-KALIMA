import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { useLanguage } from '../src/lib/LanguageContext';
import { type UsernameColor } from '../src/components/ColoredUsername';
import { AnimatedPlayerName } from '../src/components/AnimatedPlayerName';
import { ProfileBackground } from '../src/components/ProfileBackground';
import { SendGiftModal } from '../src/components/SendGiftModal';
import { getRandomWord } from '../src/lib/words';
import { getRandomEnglishWord } from '../src/lib/words_en';

function ownedCount(value: any): number {
  if (Array.isArray(value)) return value.length;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  }
  return 0;
}

export default function PlayerProfileScreen() {
  const params = useLocalSearchParams();
  const playerId = params.playerId as string;
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [giftOpen, setGiftOpen] = useState(false);

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    setMyId(user?.id || null);

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', playerId)
      .single();

    if (data) setProfile(data);
    setLoading(false);
  }

  useEffect(() => {
    if (!playerId) { setLoading(false); return; }
    load();
  }, [playerId]);

  async function sendChallenge() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showToast(isArabic ? 'سجّل دخولك أولاً' : 'Sign in first', 'error');
      return;
    }

    if (user.id === profile.id) {
      showToast(isArabic ? 'لا يمكنك تحدي نفسك' : 'Cannot challenge yourself', 'error');
      return;
    }

    const word = language === 'en' ? getRandomEnglishWord().word : getRandomWord(5);

    const { data: duel, error } = await supabase
      .from('duels')
      .insert({
        word,
        word_length: 5,
        player1_id: user.id,
        player2_id: profile.id,
        status: 'waiting',
        language,
      })
      .select()
      .single();

    if (error) {
      console.log('Duel insert error:', JSON.stringify(error));
      showToast(isArabic ? 'فشل إرسال التحدي' : 'Failed to send challenge', 'error');
      return;
    }

    if (profile.push_token) {
      const myUsername = await AsyncStorage.getItem('kalimat_username');
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: profile.push_token,
          title: isArabic ? `⚔️ ${myUsername} يتحداك!` : `⚔️ ${myUsername} challenged you!`,
          body: isArabic ? 'افتح التطبيق وأثبت أنك الأفضل' : 'Open the app and prove you are the best',
          data: { type: 'challenge', duelId: duel.id, screen: '/duel' },
          sound: 'default',
        }),
      });
    }

    showToast(
      isArabic ? `✅ تم إرسال التحدي لـ ${profile.username}!` : `✅ Challenge sent to ${profile.username}!`,
      'success'
    );

    router.replace({ pathname: '/duel', params: { duelId: duel.id } } as any);
  }

  if (loading) {
    return (
      <View style={{
        flex: 1, backgroundColor: '#07041A',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <ActivityIndicator color="#7C3AED" size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{
        flex: 1, backgroundColor: '#07041A',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ color: 'white' }}>
          {isArabic ? 'لاعب غير موجود' : 'Player not found'}
        </Text>
      </View>
    );
  }

  const isOwnProfile = profile.id === myId;

  return (
    <View style={{ flex: 1, backgroundColor: '#07041A' }}>
      <Stack.Screen options={{ presentation: 'modal', headerShown: false }} />

      <ProfileBackground theme={profile.active_profile_bg} active={true} />

      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          position: 'absolute', top: 52, left: 20,
          width: 38, height: 38, borderRadius: 19,
          backgroundColor: 'rgba(0,0,0,0.5)',
          alignItems: 'center', justifyContent: 'center',
          zIndex: 10,
        }}
      >
        <Text style={{ color: 'white', fontSize: 18 }}>←</Text>
      </TouchableOpacity>

      {profile.is_elite && (
        <View style={{
          position: 'absolute', top: 52, right: 20,
          backgroundColor: 'rgba(245,158,11,0.2)',
          borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5,
          borderWidth: 1, borderColor: '#F59E0B',
          zIndex: 10,
        }}>
          <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '800' }}>
            👑 Elite
          </Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', paddingTop: 90, paddingHorizontal: 20 }}>

          <View style={{
            width: 100, height: 100, borderRadius: 50,
            backgroundColor: profile.avatar_color || '#7C3AED',
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 3,
            borderColor: '#A78BFA',
            marginBottom: 6,
          }}>
            <Text style={{ fontSize: 44 }}>
              {profile.active_icon || profile.username?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>

          <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center' }}>
            {profile.is_elite && <Text style={{ fontSize: 20, marginRight: 4 }}>👑</Text>}
            <AnimatedPlayerName
              name={profile.username || (isArabic ? 'لاعب' : 'Player')}
              colorEffect={(profile.username_color as UsernameColor) || 'default'}
              fontSize={24}
              fontWeight="900"
            />
          </View>

          {profile.is_plus && !profile.is_elite && (
            <View style={{
              backgroundColor: 'rgba(124,58,237,0.2)',
              borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3,
              borderWidth: 1, borderColor: '#7C3AED', marginTop: 6,
            }}>
              <Text style={{ color: '#A78BFA', fontSize: 12, fontWeight: '700' }}>
                ✦ Plus
              </Text>
            </View>
          )}

          <View style={{
            flexDirection: 'row', gap: 10, marginTop: 24, width: '100%',
          }}>
            {[
              { label: isArabic ? 'أعلى نقاط' : 'Best Score', value: (profile.classic_high_score || 0).toLocaleString(), icon: '🏆' },
              { label: isArabic ? 'السلسلة' : 'Streak', value: profile.current_streak || 0, icon: '🔥' },
              { label: isArabic ? 'أفضل سلسلة' : 'Best Streak', value: profile.best_streak || 0, icon: '⚡' },
            ].map((stat, i) => (
              <View key={i} style={{
                flex: 1, backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: 18, padding: 14, alignItems: 'center',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
              }}>
                <Text style={{ fontSize: 22 }}>{stat.icon}</Text>
                <Text style={{ color: 'white', fontSize: 18, fontWeight: '900', marginTop: 4 }}>
                  {stat.value}
                </Text>
                <Text style={{ color: '#6B7280', fontSize: 11, marginTop: 2, textAlign: 'center' }}>
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>

          {profile.active_win_animation && profile.active_win_animation !== 'none' && profile.active_win_animation !== 'default' && (
            <View style={{
              width: '100%', backgroundColor: 'rgba(255,255,255,0.04)',
              borderRadius: 20, padding: 16, marginTop: 16,
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
              alignItems: 'center',
            }}>
              <Text style={{ color: '#6B7280', fontSize: 12, marginBottom: 8 }}>
                {isArabic ? 'مظهر الانتصار' : 'Win animation'}
              </Text>
              <Text style={{ fontSize: 32 }}>
                {profile.active_win_animation === 'spirit_bomb' ? '🔵'
                  : profile.active_win_animation === 'rasengan' ? '🌀'
                  : profile.active_win_animation === 'hollow_purple' ? '🟣'
                  : profile.active_win_animation === 'conquerors_haki' ? '👑'
                  : profile.active_win_animation === 'thunder_spear' ? '⚡'
                  : profile.active_win_animation === 'breath_of_fire' ? '🔥'
                  : '🎉'}
              </Text>
              <Text style={{ color: '#A78BFA', fontSize: 13, marginTop: 4, fontWeight: '700' }}>
                {profile.active_win_animation.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </Text>
            </View>
          )}

          <View style={{
            width: '100%', marginTop: 12,
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderRadius: 20, padding: 16,
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
          }}>
            <Text style={{ color: '#6B7280', fontSize: 12, marginBottom: 12 }}>
              {isArabic ? 'مجموعة الكوزمتكس' : 'Cosmetics collection'}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              {[
                { label: isArabic ? 'أيقونات' : 'Icons', value: ownedCount(profile.owned_icons), emoji: '🎨' },
                { label: isArabic ? 'حدود' : 'Borders', value: ownedCount(profile.owned_borders), emoji: '✨' },
                { label: isArabic ? 'تذاكر ذهبية' : 'Golden', value: profile.golden_tickets || 0, emoji: '🏮' },
              ].map((item, i) => (
                <View key={i} style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
                  <Text style={{ color: 'white', fontSize: 18, fontWeight: '900', marginTop: 2 }}>
                    {item.value}
                  </Text>
                  <Text style={{ color: '#6B7280', fontSize: 11 }}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {!isOwnProfile && (
            <TouchableOpacity
              onPress={sendChallenge}
              style={{
                width: '100%', height: 54,
                backgroundColor: '#7C3AED',
                borderRadius: 18, alignItems: 'center',
                justifyContent: 'center', marginTop: 20,
                flexDirection: 'row', gap: 8,
              }}
            >
              <Text style={{ fontSize: 20 }}>⚔️</Text>
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '900' }}>
                {isArabic ? 'تحدَّ هذا اللاعب' : 'Challenge this player'}
              </Text>
            </TouchableOpacity>
          )}

          {!isOwnProfile && (
            <TouchableOpacity
              onPress={() => setGiftOpen(true)}
              style={{
                width: '100%', height: 46,
                backgroundColor: 'rgba(245,158,11,0.15)',
                borderRadius: 14, alignItems: 'center',
                justifyContent: 'center', marginTop: 10,
                flexDirection: 'row', gap: 8, marginBottom: 40,
                borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
              }}
            >
              <Text style={{ fontSize: 18 }}>🎁</Text>
              <Text style={{ color: '#F59E0B', fontSize: 15, fontWeight: '700' }}>
                {isArabic ? 'أرسل هدية' : 'Send a gift'}
              </Text>
            </TouchableOpacity>
          )}

          {isOwnProfile && (
            <TouchableOpacity
              onPress={() => router.replace('/profile' as any)}
              style={{
                width: '100%', height: 46,
                backgroundColor: 'rgba(124,58,237,0.15)',
                borderRadius: 14, alignItems: 'center',
                justifyContent: 'center', marginTop: 10, marginBottom: 40,
                borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)',
              }}
            >
              <Text style={{ color: '#A78BFA', fontSize: 15, fontWeight: '700' }}>
                {isArabic ? 'عدّل ملفك الشخصي' : 'Edit your profile'}
              </Text>
            </TouchableOpacity>
          )}

        </View>
      </ScrollView>

      {giftOpen && (
        <SendGiftModal
          friend={{ id: profile.id, username: profile.username, push_token: profile.push_token }}
          onClose={() => setGiftOpen(false)}
        />
      )}

      {toast && (
        <View style={{
          position: 'absolute', bottom: 40, left: 20, right: 20,
          backgroundColor: toast.type === 'success' ? 'rgba(34,197,94,0.95)' : 'rgba(239,68,68,0.95)',
          borderRadius: 14, padding: 14,
          alignItems: 'center', zIndex: 100,
        }}>
          <Text style={{ color: 'white', fontSize: 14, fontWeight: '800', textAlign: 'center' }}>
            {toast.msg}
          </Text>
        </View>
      )}
    </View>
  );
}
