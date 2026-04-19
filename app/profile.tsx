import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, TextInput, Switch, ScrollView, Modal, Alert, Platform, TouchableOpacity, Linking, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../src/hooks/useAuth';
import { useUserStore } from '../src/store/userStore';
import { supabase } from '../src/lib/supabase';
import { useGameStore } from '../src/store/gameStore';
import { useCosmeticStore } from '../src/store/cosmeticStore';
import { WIN_ANIMATIONS } from '../src/lib/premiumCosmetics';
import { toArabicNumerals } from '../src/engine/ShareCard';
import { COLORS } from '../src/lib/constants';
import { AR } from '../src/lib/strings';
import { BackButton } from '../src/components/BackButton';
import { ProfileAvatar } from '../src/components/ProfileAvatar';
import { WinAnimationPlayer } from '../src/components/WinAnimations';
import { ProfileBackground } from '../src/components/ProfileBackground';
import { useLanguage } from '../src/lib/LanguageContext';
import { ProfileShareCard } from '../src/components/ProfileShareCard';
import { ReferralSystem } from '../src/lib/ReferralSystem';
import { useGoogleSignIn } from '../src/hooks/useGoogleSignIn';
import { UsernameColorPicker } from '../src/components/UsernameColorPicker';
import { type UsernameColor } from '../src/components/ColoredUsername';
import { AnimatedPlayerName } from '../src/components/AnimatedPlayerName';

function GoogleLinkBanner({ onPress, loading, language, t }: {
  onPress: () => void; loading: boolean; language: string;
  t: (ar: string, en: string) => string;
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.02, duration: 1500, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1.0, duration: 1500, useNativeDriver: true }),
    ])).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }], width: '100%' }}>
      <Pressable
        onPress={onPress}
        disabled={loading}
        style={{
          flexDirection: language === 'ar' ? 'row-reverse' : 'row',
          alignItems: 'center', gap: 12,
          backgroundColor: 'rgba(234,67,53,0.08)',
          borderRadius: 16, padding: 14,
          borderWidth: 1.5, borderColor: 'rgba(234,67,53,0.3)',
          width: '100%',
        }}
      >
        <View style={{
          width: 44, height: 44, borderRadius: 22,
          backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 24, fontWeight: '900', color: '#4285F4' }}>G</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: '#FCA5A5', fontSize: 14, fontWeight: '800', textAlign: language === 'ar' ? 'right' : 'left' }}>
            {t('⚠️ تقدمك غير محفوظ', '⚠️ Progress not saved')}
          </Text>
          <Text style={{ color: '#9CA3AF', fontSize: 12, textAlign: language === 'ar' ? 'right' : 'left', lineHeight: 18 }}>
            {t(
              'سجّل بـ Google لحفظ نقاطك وعملاتك وسلسلتك على أي جهاز',
              'Sign in with Google to save your progress across all devices'
            )}
          </Text>
        </View>
        <Text style={{ color: '#6B7280', fontSize: 18 }}>{language === 'ar' ? '←' : '→'}</Text>
      </Pressable>
    </Animated.View>
  );
}

function EmailLinkBanner({ onPress, language, t }: {
  onPress: () => void; language: string;
  t: (ar: string, en: string) => string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: language === 'ar' ? 'row-reverse' : 'row',
        alignItems: 'center', gap: 12,
        backgroundColor: 'rgba(124,58,237,0.1)',
        borderRadius: 16, padding: 14,
        borderWidth: 1.5, borderColor: 'rgba(124,58,237,0.35)',
        width: '100%',
      }}
    >
      <View style={{
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontSize: 22 }}>✉️</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: '#E9D5FF', fontSize: 14, fontWeight: '800', textAlign: language === 'ar' ? 'right' : 'left' }}>
          {t('ربط بالبريد الإلكتروني', 'Link with Email')}
        </Text>
        <Text style={{ color: '#9CA3AF', fontSize: 12, textAlign: language === 'ar' ? 'right' : 'left', lineHeight: 18 }}>
          {t('سجّل بالبريد وكلمة السر لحفظ تقدمك', 'Sign in with email & password to save progress')}
        </Text>
      </View>
      <Text style={{ color: '#6B7280', fontSize: 18 }}>{language === 'ar' ? '←' : '→'}</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { user } = useUserStore();
  const { updateUsername } = useAuth();
  const { soundEnabled, setSoundEnabled } = useGameStore();
  const { activeIconId, activeBorderId, activeWinAnimationId, activeProfileBgId } = useCosmeticStore();
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameStatus, setNameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'short'>('idle');
  const [nameSaving, setNameSaving] = useState(false);
  const [usernameChangedCount, setUsernameChangedCount] = useState(0);
  const [showWinPreview, setShowWinPreview] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isGoogleLinked, setIsGoogleLinked] = useState(false);
  const [isEmailLinked, setIsEmailLinked] = useState(false);
  const [usernameColor, setUsernameColor] = useState<UsernameColor>('default');
  const { request, response, promptAsync, loading: googleLoading, handleGoogleResponse } = useGoogleSignIn();
  const { language, setLanguage, t, isEnglish } = useLanguage();

  async function pickAndUploadPhoto() {
    if (!user) return;

    try {
      const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permResult.granted) {
        Alert.alert(t('تنبيه', 'Notice'), t('نحتاج إذن الوصول للصور', 'We need photo library access'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled || !result.assets?.[0]) return;

      setUploadingPhoto(true);
      const asset = result.assets[0];
      const localUri = asset.uri;

      // Always save locally so it works even offline
      await AsyncStorage.setItem('kalimat_avatar_url', localUri);
      useUserStore.getState().setUser({ ...user, avatarUrl: localUri });

      // If user is online, also upload to Supabase
      if (user.id !== 'offline') {
        try {
          const filePath = `${user.id}.jpg`;
          const response = await fetch(localUri);
          const blob = await response.blob();

          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, blob, { upsert: true, contentType: 'image/jpeg' });

          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
            const remoteUrl = urlData.publicUrl + '?t=' + Date.now();
            await supabase.from('profiles').update({ avatar_url: remoteUrl }).eq('id', user.id);
            await AsyncStorage.setItem('kalimat_avatar_url', remoteUrl);
            useUserStore.getState().setUser({ ...user, avatarUrl: remoteUrl });
          }
        } catch {
          // Supabase upload failed — local photo still works
        }
      }
    } catch (e: any) {
      Alert.alert(t('خطأ', 'Error'), t('حدث خطأ', 'Something went wrong'));
    } finally {
      setUploadingPhoto(false);
    }
  }

  // Load username_changed_count + referral code
  useEffect(() => {
    if (!user || user.id === 'offline') return;
    supabase.from('profiles').select('username_changed_count, username_color').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setUsernameChangedCount(data.username_changed_count || 0);
          if (data.username_color) setUsernameColor(data.username_color as UsernameColor);
        }
      });
    ReferralSystem.getOrCreateCode(user.id).then(setReferralCode);

    // Check if Google-linked
    AsyncStorage.getItem('kalimat_is_google_linked').then(v => {
      if (v === 'true') setIsGoogleLinked(true);
    });
    AsyncStorage.getItem('kalimat_is_email_linked').then(v => {
      if (v === 'true') setIsEmailLinked(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      const provider = session?.user?.app_metadata?.provider;
      if (provider === 'google') {
        setIsGoogleLinked(true);
        AsyncStorage.setItem('kalimat_is_google_linked', 'true');
      } else if (provider === 'email') {
        setIsEmailLinked(true);
        AsyncStorage.setItem('kalimat_is_email_linked', 'true');
      }
    });
    supabase.from('profiles').select('is_email_linked').eq('id', user.id).single()
      .then(({ data }) => {
        if (data?.is_email_linked) setIsEmailLinked(true);
      });
  }, [user?.id]);

  // Handle Google sign-in response
  useEffect(() => {
    if (response) {
      handleGoogleResponse(response, user?.id || null, (result) => {
        setIsGoogleLinked(true);
        AsyncStorage.setItem('kalimat_is_google_linked', 'true');
        if (result.mergedData) {
          useUserStore.getState().setUser({
            ...user!,
            coins: result.mergedData.coins,
            gems: result.mergedData.gems,
            currentStreak: result.mergedData.streak,
          });
        }
        Alert.alert(
          t('تم!', 'Done!'),
          t('✅ تم ربط حسابك بـ Google! تقدمك محفوظ الآن', '✅ Account linked! Your progress is now saved')
        );
      });
    }
  }, [response]);

  const profile = user || {
    id: 'offline',
    username: 'لاعب',
    avatarColor: '#7C3AED',
    totalGames: 0,
    totalWins: 0,
    currentStreak: 0,
    bestStreak: 0,
    coins: 50,
    gems: 0,
    isPlus: false,
    createdAt: new Date().toISOString(),
  };

  const successRate = profile.totalGames > 0
    ? Math.round((profile.totalWins / profile.totalGames) * 100)
    : 0;

  const activeWinAnim = WIN_ANIMATIONS.find(a => a.id === activeWinAnimationId);
  const hasBg = activeProfileBgId && activeProfileBgId !== 'none';

  // Debounced name availability check
  useEffect(() => {
    if (!editing) return;
    const name = newName.trim();
    if (name.length === 0) { setNameStatus('idle'); return; }
    if (name.length < 3) { setNameStatus('short'); return; }
    if (!/^[\u0600-\u06FFa-zA-Z0-9_]{3,20}$/.test(name)) { setNameStatus('invalid'); return; }
    setNameStatus('checking');
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles').select('id').eq('username', name).maybeSingle();
      setNameStatus(data && data.id !== user?.id ? 'taken' : 'available');
    }, 500);
    return () => clearTimeout(timer);
  }, [newName, editing]);

  const GEM_RENAME_COST = 50;
  const isFreeRename = usernameChangedCount < 1;
  const canAffordRename = (user?.gems || 0) >= GEM_RENAME_COST;

  async function saveName() {
    if (nameStatus !== 'available' || nameSaving) return;
    if (!isFreeRename && !canAffordRename) return;
    setNameSaving(true);
    const err = await updateUsername(newName.trim());
    if (!err) {
      // Deduct gems if paid rename
      if (!isFreeRename) {
        useUserStore.getState().updateGems(-GEM_RENAME_COST);
      }
      await supabase.from('profiles')
        .update({ username_changed_count: usernameChangedCount + 1 })
        .eq('id', user!.id);
      setUsernameChangedCount(prev => prev + 1);
      setEditing(false);
    }
    setNameSaving(false);
  }

  // Card style: frosted glass when background is active, solid otherwise
  const cardBg = hasBg ? 'rgba(13, 7, 48, 0.75)' : COLORS.CARD_BG;
  const cardBorder = hasBg ? 'rgba(255,255,255,0.08)' : 'transparent';

  return (
    <View style={styles.root}>
      {/* LAYER 1: Animated background */}
      {hasBg && <ProfileBackground theme={activeProfileBgId} />}

      {/* Base color for non-bg */}
      {!hasBg && <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.PRIMARY_BG }]} />}

      <SafeAreaView style={styles.container}>
        <BackButton />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Avatar with animated border — tap to change photo */}
          <TouchableOpacity onPress={pickAndUploadPhoto} activeOpacity={0.7} disabled={uploadingPhoto}>
            <ProfileAvatar
              size={80}
              icon={activeIconId}
              username={profile.username}
              borderType={activeBorderId}
              avatarUrl={user?.avatarUrl}
              showRarityBadge
            />
          </TouchableOpacity>

          {/* Username */}
          {editing ? (
            <View style={{ gap: 8, width: '100%', alignItems: 'center' }}>
              <View style={styles.editRow}>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: cardBg,
                    borderColor: nameStatus === 'available' ? '#22C55E'
                      : nameStatus === 'taken' || nameStatus === 'invalid' ? '#EF4444'
                      : COLORS.PURPLE,
                  }]}
                  value={newName}
                  onChangeText={setNewName}
                  autoFocus
                  textAlign="right"
                  maxLength={20}
                  autoCapitalize="none"
                />
                <Pressable
                  style={[styles.saveButton, (nameStatus !== 'available' || (!isFreeRename && !canAffordRename)) && { backgroundColor: '#2D2D50' }]}
                  onPress={saveName}
                  disabled={nameStatus !== 'available' || nameSaving || (!isFreeRename && !canAffordRename)}
                >
                  <Text style={styles.saveText}>
                    {nameSaving ? '...' : isFreeRename ? t(AR.save, 'Save') : t(`${AR.save} (${toArabicNumerals(GEM_RENAME_COST)} 💎)`, `Save (${GEM_RENAME_COST} 💎)`)}
                  </Text>
                </Pressable>
                <Pressable onPress={() => setEditing(false)}>
                  <Text style={styles.cancelText}>{t(AR.cancel, 'Cancel')}</Text>
                </Pressable>
              </View>
              <Text style={{
                fontSize: 12, textAlign: 'center',
                color: nameStatus === 'available' ? '#22C55E'
                  : nameStatus === 'taken' || nameStatus === 'invalid' ? '#EF4444'
                  : '#6B7280',
              }}>
                {nameStatus === 'short' ? t('الاسم قصير — ٣ أحرف على الأقل', 'Name too short — 3 characters minimum')
                  : nameStatus === 'checking' ? t('جاري التحقق...', 'Checking...')
                  : nameStatus === 'available' ? t('✓ الاسم متاح', '✓ Name available')
                  : nameStatus === 'taken' ? t('✗ مأخوذ — جرب اسماً آخر', '✗ Taken — try another name')
                  : nameStatus === 'invalid' ? t('✗ أحرف عربية/إنجليزية وأرقام فقط', '✗ Arabic/English letters and numbers only')
                  : ''}
              </Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center', gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {profile.isElite && <Text style={{ fontSize: 18 }}>👑</Text>}
                <AnimatedPlayerName name={profile.username} colorEffect={usernameColor} fontSize={22} fontWeight="900" />
              </View>
              {isFreeRename ? (
                <Pressable onPress={() => { setEditing(true); setNewName(profile.username); setNameStatus('idle'); }}>
                  <Text style={{ color: COLORS.PURPLE, fontSize: 13 }}>
                    {t('✎ تغيير الاسم (مجاناً)', '✎ Change name (Free)')}
                  </Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => {
                  if (!canAffordRename) return;
                  setEditing(true); setNewName(profile.username); setNameStatus('idle');
                }}>
                  <Text style={{ color: canAffordRename ? '#A78BFA' : '#4B5563', fontSize: 13 }}>
                    {t(`✎ تغيير الاسم (${toArabicNumerals(GEM_RENAME_COST)} 💎)`, `✎ Change name (${GEM_RENAME_COST} 💎)`)}
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Google link banner / badge */}
          {!isGoogleLinked && !isEmailLinked ? (
            <GoogleLinkBanner onPress={() => promptAsync()} loading={googleLoading} language={language} t={t} />
          ) : isGoogleLinked ? (
            <View style={styles.googleLinkedBadge}>
              <Text style={styles.googleG}>G</Text>
              <Text style={styles.googleLinkedText}>
                {t('محفوظ بـ Google ✓', 'Saved with Google ✓')}
              </Text>
            </View>
          ) : null}

          {/* Email link banner / badge */}
          {!isEmailLinked && !isGoogleLinked ? (
            <EmailLinkBanner onPress={() => router.push('/auth' as any)} language={language} t={t} />
          ) : isEmailLinked ? (
            <View style={styles.emailLinkedBadge}>
              <Text style={{ fontSize: 16 }}>✉️</Text>
              <Text style={styles.emailLinkedText}>
                {t('محفوظ بالبريد ✓', 'Saved with Email ✓')}
              </Text>
            </View>
          ) : null}

          {/* Win animation preview button (only if non-default) */}
          {activeWinAnimationId !== 'default' && activeWinAnim && (
            <Pressable
              onPress={() => setShowWinPreview(true)}
              style={styles.winPreviewBtn}
            >
              <Text style={{ fontSize: 20 }}>{activeWinAnim.preview}</Text>
              <Text style={styles.winPreviewText}>{t('معاينة الانتصار', 'Preview Win')}</Text>
            </Pressable>
          )}

          {/* Share profile button */}
          <Pressable
            onPress={() => setShowShareCard(true)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              backgroundColor: 'rgba(124,58,237,0.2)',
              borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
              borderWidth: 1, borderColor: 'rgba(124,58,237,0.4)',
              marginTop: 4,
            }}
          >
            <Text style={{ fontSize: 18 }}>📤</Text>
            <Text style={{ color: '#A78BFA', fontSize: 14, fontWeight: '700' }}>
              {t('شارك ملفك', 'Share profile')}
            </Text>
          </Pressable>

          {/* Referral code card */}
          {referralCode && (
            <View style={{
              backgroundColor: cardBg, borderRadius: 14, padding: 14, width: '100%',
              borderWidth: hasBg ? 1 : 0, borderColor: cardBorder, alignItems: 'center', gap: 6,
            }}>
              <Text style={{ color: COLORS.TEXT_SECONDARY, fontSize: 12 }}>
                {t('كود الدعوة', 'Referral Code')}
              </Text>
              <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 6 }}>
                {referralCode}
              </Text>
              <Pressable
                onPress={() => router.push('/friends?tab=referral' as any)}
                style={{
                  backgroundColor: 'rgba(124,58,237,0.2)', borderRadius: 10,
                  paddingVertical: 6, paddingHorizontal: 14,
                  borderWidth: 1, borderColor: 'rgba(124,58,237,0.4)',
                }}
              >
                <Text style={{ color: '#A78BFA', fontSize: 12, fontWeight: '700' }}>
                  {t('ادعُ أصدقاءك واكسب جواهر', 'Invite friends & earn gems')}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Username Color Picker */}
          <View style={{ width: '100%', backgroundColor: cardBg, borderRadius: 18, padding: 16, borderWidth: hasBg ? 1 : 0, borderColor: cardBorder }}>
            <UsernameColorPicker
              activeColorId={usernameColor}
              username={profile.username}
              myGems={profile.gems || 0}
              isElite={profile.isElite}
              onSelect={async (uc) => {
                if (!user || user.id === 'offline') return;
                if (uc.id === 'default') {
                  // Free — switch to default
                  await supabase.from('profiles').update({ username_color: 'default' }).eq('id', user.id);
                  setUsernameColor('default');
                  return;
                }
                const cost = uc.cost;
                if ((user.gems || 0) < cost) return;
                // Deduct gems
                useUserStore.getState().updateGems(-cost);
                await supabase.from('profiles').update({
                  gems: (user.gems || 0) - cost,
                }).eq('id', user.id);
                // Set color + expiry
                const expiresAt = new Date();
                expiresAt.setMonth(expiresAt.getMonth() + 1);
                await supabase.from('profiles').update({
                  username_color: uc.id,
                  username_color_expires_at: expiresAt.toISOString(),
                }).eq('id', user.id);
                setUsernameColor(uc.id as UsernameColor);
              }}
            />
          </View>

          {/* Customize button */}
          <Pressable style={styles.customizeBtn} onPress={() => router.push('/shop?tab=profile' as any)}>
            <Text style={styles.customizeBtnText}>{t('✨ تخصيص الملف الشخصي', '✨ Customize Profile')}</Text>
          </Pressable>

          {/* Stats Grid */}
          <View style={[styles.statsGrid, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
            {[
              { value: isEnglish ? `🔥 ${profile.bestStreak}` : `🔥 ${toArabicNumerals(profile.bestStreak)}`, label: t(AR.best_streak, 'Best Streak') },
              { value: isEnglish ? String(profile.totalWins) : toArabicNumerals(profile.totalWins), label: t(AR.duels_won, 'Duels Won') },
              { value: profile.totalGames > 0 ? (profile.totalWins / profile.totalGames * 6).toFixed(1) : '—', label: t(AR.avg_attempts, 'Avg Attempts') },
              { value: isEnglish ? `${successRate}%` : `${toArabicNumerals(successRate)}%`, label: t(AR.success_rate, 'Success Rate') },
            ].map((stat, i) => (
              <View key={i} style={[styles.statCard, { backgroundColor: cardBg, borderColor: cardBorder, borderWidth: hasBg ? 1 : 0 }]}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Currencies */}
          <View style={[styles.currencyRow, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
            <View style={[styles.currencyCard, { backgroundColor: cardBg, borderColor: cardBorder, borderWidth: hasBg ? 1 : 0 }]}>
              <Text style={styles.currencyLabel}>{t('عملات', 'Coins')}</Text>
              <Text style={styles.coinsValue}>🪙 {toArabicNumerals(profile.coins)}</Text>
            </View>
            <View style={[styles.currencyCard, { backgroundColor: cardBg, borderColor: cardBorder, borderWidth: hasBg ? 1 : 0 }]}>
              <Text style={styles.currencyLabel}>{t('جواهر', 'Gems')}</Text>
              <Text style={styles.gemsValue}>💎 {toArabicNumerals(profile.gems || 0)}</Text>
            </View>
          </View>

          {/* Settings */}
          <View style={styles.settingsSection}>
            <View style={[styles.settingRow, { backgroundColor: cardBg, borderColor: cardBorder, borderWidth: hasBg ? 1 : 0 }]}>
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{ false: COLORS.GRAY_DARK, true: COLORS.PURPLE }}
              />
              <Text style={styles.settingLabel}>{t(AR.sounds, 'Sounds')}</Text>
            </View>
          </View>

          {/* Language Settings */}
          <View style={styles.settingsSection}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFF', textAlign: 'right', marginBottom: 8 }}>
              {t('اللغة', 'Language')}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setLanguage('ar')}
                style={[
                  styles.langBtn,
                  { borderColor: language === 'ar' ? '#7C3AED' : '#2D2D50', backgroundColor: language === 'ar' ? '#2D1B69' : cardBg },
                ]}
              >
                <Text style={{ fontSize: 24 }}>🇸🇦</Text>
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>العربية</Text>
              </Pressable>
              <Pressable
                onPress={() => setLanguage('en')}
                style={[
                  styles.langBtn,
                  { borderColor: language === 'en' ? '#22C55E' : '#2D2D50', backgroundColor: language === 'en' ? '#1B3A2D' : cardBg },
                ]}
              >
                <Text style={{ fontSize: 24 }}>🇬🇧</Text>
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>English</Text>
              </Pressable>
            </View>
            <Text style={{ fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 6 }}>
              {t('تغيير اللغة سيحدّث جميع الأوضاع', 'Changing language updates all game modes')}
            </Text>
          </View>

          {/* Legal Links */}
          <View style={{ width: '100%', gap: 10 }}>
            <Pressable
              onPress={() => Linking.openURL('https://kalimat.app/privacy')}
              style={[styles.settingRow, { backgroundColor: cardBg, borderColor: cardBorder, borderWidth: hasBg ? 1 : 0 }]}
            >
              <Text style={styles.settingLabel}>
                {language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL('https://kalimat.app/terms')}
              style={[styles.settingRow, { backgroundColor: cardBg, borderColor: cardBorder, borderWidth: hasBg ? 1 : 0 }]}
            >
              <Text style={styles.settingLabel}>
                {language === 'ar' ? 'شروط الاستخدام' : 'Terms of Service'}
              </Text>
            </Pressable>
            <Text style={{ fontSize: 12, color: '#6B7280', textAlign: 'center' }}>
              v{require('expo-constants').default?.expoConfig?.version || '1.0.0'}
            </Text>
          </View>

          {/* Plus Banner */}
          {!profile.isPlus && (
            <View style={[styles.plusCard, hasBg && { backgroundColor: 'rgba(124,58,237,0.15)' }]}>
              <Text style={styles.plusTitle}>{t('كلمات بلس', 'Kalimat Plus')}</Text>
              <Text style={styles.plusDesc}>{t(`${AR.no_ads} • ${AR.with_hints}`, 'No ads • Unlimited hints')}</Text>
              <Pressable style={styles.plusButton} onPress={() => router.push('/shop?tab=plus' as any)}>
                <Text style={styles.plusButtonText}>{t(AR.plus_subscribe, 'Subscribe')}</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Share card overlay */}
      {showShareCard && (
        <ProfileShareCard
          username={profile.username}
          avatarColor={profile.avatarColor}
          activeIcon={activeIconId}
          activeBorder={activeBorderId}
          activeProfileBg={activeProfileBgId}
          currentStreak={profile.currentStreak}
          bestScore={profile.bestStreak}
          totalGames={profile.totalGames}
          totalWins={profile.totalWins}
          language={language}
          onClose={() => setShowShareCard(false)}
        />
      )}

      {/* Win animation preview modal */}
      {showWinPreview && (
        <Modal transparent visible animationType="fade">
          <Pressable style={styles.previewOverlay} onPress={() => setShowWinPreview(false)}>
            <WinAnimationPlayer
              animationId={activeWinAnimationId}
              onDone={() => setTimeout(() => setShowWinPreview(false), 500)}
            />
            <Text style={styles.previewDismiss}>{t('اضغط للإغلاق', 'Tap to close')}</Text>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 20, alignItems: 'center', gap: 16, paddingBottom: 40 },
  username: { fontSize: 22, fontWeight: 'bold', color: COLORS.TEXT_PRIMARY },
  editRow: { flexDirection: 'row-reverse', gap: 8, alignItems: 'center' },
  input: {
    color: COLORS.TEXT_PRIMARY,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 18, minWidth: 150, borderWidth: 1, borderColor: COLORS.PURPLE,
  },
  saveButton: { backgroundColor: COLORS.PURPLE, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  saveText: { color: COLORS.TEXT_PRIMARY, fontWeight: 'bold' },
  cancelText: { color: COLORS.TEXT_SECONDARY },

  winPreviewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(26,26,46,0.8)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  winPreviewText: { fontSize: 13, color: COLORS.TEXT_SECONDARY },

  langBtn: {
    flex: 1, borderRadius: 16, borderWidth: 1.5, padding: 16,
    alignItems: 'center', gap: 8,
  },

  customizeBtn: {
    backgroundColor: COLORS.PURPLE, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 24,
  },
  customizeBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  statsGrid: {
    flexDirection: 'row-reverse', flexWrap: 'wrap',
    gap: 12, width: '100%',
  },
  statCard: {
    borderRadius: 12, padding: 16,
    alignItems: 'center', width: '47%',
  },
  statValue: { fontSize: 24, fontWeight: 'bold', color: COLORS.TEXT_PRIMARY },
  statLabel: { fontSize: 12, color: COLORS.TEXT_SECONDARY, marginTop: 4 },

  currencyRow: { flexDirection: 'row-reverse', gap: 12, width: '100%' },
  currencyCard: {
    flex: 1, flexDirection: 'row-reverse', justifyContent: 'space-between',
    alignItems: 'center', borderRadius: 12, padding: 16,
  },
  currencyLabel: { fontSize: 14, color: COLORS.TEXT_SECONDARY },
  coinsValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.GOLD },
  gemsValue: { fontSize: 20, fontWeight: 'bold', color: '#A78BFA' },

  settingsSection: { width: '100%', gap: 12 },
  settingRow: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: 12, padding: 16,
  },
  settingLabel: { fontSize: 16, color: COLORS.TEXT_PRIMARY },
  plusCard: {
    width: '100%', backgroundColor: `${COLORS.PURPLE}20`,
    borderRadius: 16, padding: 20, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: COLORS.PURPLE,
  },
  plusTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.PURPLE },
  plusDesc: { fontSize: 14, color: COLORS.TEXT_SECONDARY },
  plusButton: {
    backgroundColor: COLORS.PURPLE, borderRadius: 12, paddingVertical: 12,
    paddingHorizontal: 32, marginTop: 8,
  },
  plusButtonText: { color: COLORS.TEXT_PRIMARY, fontSize: 16, fontWeight: 'bold' },

  previewOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
  previewDismiss: { color: '#FFF', fontSize: 16, marginTop: 40 },

  googleLinkedBadge: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
  },
  googleG: {
    fontSize: 16, fontWeight: '900', color: '#4285F4',
    backgroundColor: '#FFF', width: 28, height: 28, borderRadius: 14,
    textAlign: 'center', lineHeight: 28,
  },
  googleLinkedText: { color: '#22C55E', fontSize: 13, fontWeight: '700' },

  emailLinkedBadge: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(124,58,237,0.12)', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.35)',
  },
  emailLinkedText: { color: '#A78BFA', fontSize: 13, fontWeight: '700' },
});
