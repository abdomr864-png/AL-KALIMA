import React, { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
let NavigationBar: any = { setBackgroundColorAsync: () => {}, setButtonStyleAsync: () => {} };
let addNotificationReceivedListener: any = () => ({ remove: () => {} });
if (Platform.OS !== 'web') {
  try { NavigationBar = require('expo-navigation-bar'); } catch {}
  try { addNotificationReceivedListener = require('expo-notifications').addNotificationReceivedListener; } catch {}
}
import type { EventSubscription } from 'expo-modules-core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { initMonitoring, setMonitoringUser } from '../src/lib/monitoring';
import { checkForceUpdate, showForceUpdateAlert } from '../src/lib/ForceUpdate';
import { useAuth } from '../src/hooks/useAuth';
import { useSubscription } from '../src/hooks/useSubscription';
import { usePresence } from '../src/hooks/usePresence';
import { useChallengeNotifications } from '../src/hooks/useChallengeNotifications';

// Initialize Sentry before anything else
initMonitoring();
import { COLORS } from '../src/lib/constants';
import { supabase } from '../src/lib/supabase';
import { useUserStore } from '../src/store/userStore';
import { useCosmeticStore } from '../src/store/cosmeticStore';
import { adManager } from '../src/lib/AdManager';
import { useTicketStore } from '../src/store/ticketStore';
import { PlayerPhase } from '../src/lib/PlayerPhase';
import { LanguageProvider, useLanguage } from '../src/lib/LanguageContext';
import { NotificationManager } from '../src/lib/NotificationManager';
import { ReEngagement, type AppOpenResult } from '../src/lib/ReEngagement';
import { WelcomeBackModal } from '../src/components/WelcomeBackModal';
import { GiftInboxModal } from '../src/components/GiftInboxModal';
import { FriendRequestInboxModal } from '../src/components/FriendRequestInboxModal';
import { ChallengeInboxModal } from '../src/components/ChallengeInboxModal';
import { StreakManager } from '../src/lib/StreakManager';
import { restoreGoogleSession } from '../src/lib/GoogleAuth';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  state = { hasError: false, error: '' };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={ebStyles.container}>
          <Text style={ebStyles.title}>Error / حدث خطأ</Text>
          <Text style={ebStyles.message}>{this.state.error}</Text>
          <TouchableOpacity
            style={ebStyles.button}
            onPress={() => this.setState({ hasError: false, error: '' })}
          >
            <Text style={ebStyles.buttonText}>Try Again / حاول مرة أخرى</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const ebStyles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: COLORS.PRIMARY_BG,
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.TEXT_PRIMARY, marginBottom: 12 },
  message: { fontSize: 14, color: COLORS.TEXT_SECONDARY, textAlign: 'center', marginBottom: 24 },
  button: { backgroundColor: COLORS.PURPLE, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32 },
  buttonText: { color: COLORS.TEXT_PRIMARY, fontSize: 16, fontWeight: 'bold' },
});

const NAV_ITEMS = [
  { labelAr: 'ملفي',       labelEn: 'Profile',      emoji: '👤', route: '/profile'     },
  { labelAr: 'المتجر',     labelEn: 'Shop',          emoji: '🛍️', route: '/shop'        },
  { labelAr: 'الدوران',    labelEn: 'Spin',          emoji: '🎡', route: '/spin'        },
  { labelAr: 'المتصدرون',  labelEn: 'Leaderboard',   emoji: '🏆', route: '/leaderboard' },
  { labelAr: 'الألعاب',    labelEn: 'Games',         emoji: '🎮', route: '/modes'       },
  { labelAr: 'الرئيسية',   labelEn: 'Home',          emoji: '🏠', route: '/'            },
];

// Screens where bottom nav should be hidden (game screens, onboarding, etc.)
const HIDE_NAV_ROUTES = [
  '/classic', '/daily', '/blind', '/duel', '/rush', '/memory',
  '/tournament', '/friends', '/settings', '/auth',
  '/splash', '/language-select', '/tutorial', '/username', '/whoami',
  '/player-profile', '/match',
];

// No-op: scroll-hide removed — bottom nav stays visible while scrolling.
export function setBottomNavVisible(_visible: boolean) {}

function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, isEnglish } = useLanguage();

  // Hide on game/detail screens
  if (HIDE_NAV_ROUTES.some(r => pathname.startsWith(r))) return null;

  return (
    <View style={[navStyles.bottomNav, { flexDirection: 'row-reverse' }]}>
      {NAV_ITEMS.map(item => {
        const isActive = pathname === item.route ||
          (item.route !== '/' && pathname.startsWith(item.route));

        return (
          <TouchableOpacity
            key={item.route}
            onPress={() => router.push(item.route as any)}
            style={navStyles.navItem}
            activeOpacity={0.7}
          >
            {isActive && (
              <View style={navStyles.activeDot} />
            )}

            <Text style={{ fontSize: 20 }}>
              {item.emoji}
            </Text>

            <Text style={[
              navStyles.navLabel,
              isActive && navStyles.navLabelActive,
            ]}>
              {isEnglish ? item.labelEn : item.labelAr}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const navStyles = StyleSheet.create({
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1A1A2E',
    borderTopWidth: 1,
    borderTopColor: '#2D2D50',
    height: 72,
    alignItems: 'center',
    paddingBottom: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#7C3AED',
    marginBottom: 2,
  },
  navLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },
  navLabelActive: {
    color: '#7C3AED',
    fontWeight: '800',
  },
});

function RootLayoutInner() {
  useAuth();
  usePresence();
  useChallengeNotifications();
  const { deliverMonthlyEliteGems } = useSubscription();
  const { user } = useUserStore();
  const { loaded: languageLoaded } = useLanguage();
  const router = useRouter();
  const notificationListener = useRef<EventSubscription>(null);
  const responseListener = useRef<EventSubscription>(null);
  const [welcomeBack, setWelcomeBack] = useState<{ coins: number; days: number } | null>(null);
  const [blocked, setBlocked] = useState(false);

  // Set Sentry user when authenticated
  useEffect(() => {
    if (user) {
      setMonitoringUser(user.id, user.username);
    }
  }, [user?.id]);

  // Force update check
  useEffect(() => {
    async function checkUpdate() {
      const { needsUpdate, maintenanceMode } = await checkForceUpdate();
      if (needsUpdate) {
        setBlocked(true);
        showForceUpdateAlert('ar');
        return;
      }
      if (maintenanceMode) {
        setBlocked(true);
      }
    }
    checkUpdate();
  }, []);

  useEffect(() => {
    PlayerPhase.initialize();
    useCosmeticStore.getState().load();
    useTicketStore.getState().load();
    adManager.initialize();

    // Retention systems init
    (async () => {
      // 0. Check if streak freeze should be applied for missed day
      await StreakManager.checkAndApplyFreeze();

      // 1. Re-engagement: check if returning user
      const result = await ReEngagement.recordAppOpen();
      if (result.welcomeBackReward) {
        setTimeout(() => setWelcomeBack({
          coins: result.welcomeBackReward!.coins,
          days: result.daysSinceLastOpen,
        }), 1000);
      }

      // 2-4. Notifications (native only)
      if (Platform.OS !== 'web') {
        responseListener.current = NotificationManager.setupNotificationResponseHandler(router);
        notificationListener.current = addNotificationReceivedListener(() => {});
        const enabled = await NotificationManager.isEnabled();
        if (enabled) {
          await NotificationManager.scheduleAllDailyNotifications();
        }
      }

      // 5. Device ID for anti-cheat
      let deviceId = 'unknown';
      try {
        if (Platform.OS === 'android') {
          deviceId = (Application as any).androidId || 'unknown';
        } else if (Platform.OS === 'ios') {
          deviceId = await Application.getIosIdForVendorAsync() || 'unknown';
        }
      } catch { /* web — not available */ }
      if (typeof deviceId === 'string' && deviceId !== 'unknown') {
        await AsyncStorage.setItem('kalimat_device_id', deviceId);
      }

      // 6. Elite monthly gems delivery
      deliverMonthlyEliteGems();

      // 7. Restore Google session data if linked
      restoreGoogleSession().catch(() => {});

      // 8. Check username color subscription renewal
      (async () => {
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (!authUser) return;
          const { data: prof } = await supabase
            .from('profiles')
            .select('username_color, username_color_expires_at, gems')
            .eq('id', authUser.id)
            .single();
          if (!prof || prof.username_color === 'default' || !prof.username_color_expires_at) return;
          const expired = new Date(prof.username_color_expires_at) < new Date();
          if (expired) {
            if (prof.gems >= 60) {
              // Auto-renew
              const newExpiry = new Date();
              newExpiry.setMonth(newExpiry.getMonth() + 1);
              await supabase.from('profiles').update({
                username_color_expires_at: newExpiry.toISOString(),
                gems: prof.gems - 60,
              }).eq('id', authUser.id);
            } else {
              // Reset to default
              await supabase.from('profiles').update({ username_color: 'default' }).eq('id', authUser.id);
            }
          }
        } catch { /* ignore */ }
      })();
    })();

    return () => {
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
      NavigationBar.setBehaviorAsync('overlay-swipe');
      NavigationBar.setBackgroundColorAsync(COLORS.PRIMARY_BG);
    }
  }, []);

  // Wait for language to load before rendering game screens
  if (!languageLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.PRIMARY_BG, justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar style="light" hidden={true} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.PRIMARY_BG }}>
      <StatusBar style="light" hidden={true} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.PRIMARY_BG },
          animation: 'none',
        }}
      />
      <BottomNav />
      <WelcomeBackModal
        visible={!!welcomeBack}
        coins={welcomeBack?.coins || 0}
        daysMissed={welcomeBack?.days || 0}
        onClose={() => setWelcomeBack(null)}
      />
      <GiftInboxModal />
      <FriendRequestInboxModal />
      <ChallengeInboxModal />
    </View>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <RootLayoutInner />
      </LanguageProvider>
    </ErrorBoundary>
  );
}
