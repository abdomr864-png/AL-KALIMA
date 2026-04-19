import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const PUSH_TOKEN_KEY = 'kalimat_push_token';
const NOTIFICATIONS_ENABLED_KEY = 'kalimat_notifications_enabled';

async function isEn(): Promise<boolean> {
  const lang = await AsyncStorage.getItem('kalimat_language');
  return lang === 'en';
}

function t(ar: string, en: string, english: boolean): string {
  return english ? en : ar;
}

export const NotificationManager = {

  // ── SETUP ──

  async requestPermission(): Promise<boolean> {
    if (!Device.isDevice) return false;

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return false;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'كلمات',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#7C3AED',
      });

      await Notifications.setNotificationChannelAsync('streak', {
        name: 'تحذيرات السلسلة',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#EF4444',
      });

      await Notifications.setNotificationChannelAsync('rewards', {
        name: 'المكافآت اليومية',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#F59E0B',
      });
    }

    await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, 'true');
    return true;
  },

  async getPushToken(): Promise<string | null> {
    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: '6d33de9e-032f-4eb4-9960-b1861f37c31f',
      });
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token.data);
      // Save to Supabase so server can send push notifications
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles')
          .update({ push_token: token.data })
          .eq('id', user.id);
      }
      return token.data;
    } catch (e) {
      console.log('Push token error:', e);
      return null;
    }
  },

  async isEnabled(): Promise<boolean> {
    const val = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
    return val === 'true';
  },

  // ── SCHEDULE LOCAL NOTIFICATIONS ──

  async scheduleAllDailyNotifications() {
    // Cancel existing scheduled notifications first
    await Notifications.cancelAllScheduledNotificationsAsync();

    const enabled = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
    if (enabled !== 'true') return;

    // 1. Daily word notification — 9:00 AM every day
    await this.scheduleDailyWordNotification();

    // 2. Streak danger — 10:00 PM every day
    await this.scheduleStreakDangerNotification();

    // 3. Weekly reward reminder — Friday 8:00 PM
    await this.scheduleWeeklyRewardNotification();
  },

  async scheduleDailyWordNotification() {
    const en = await isEn();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('كلمة اليوم جاهزة ☀️', "Today's word is ready ☀️", en),
        body: t('كلمة جديدة تنتظرك — كن من أوائل الحالّين اليوم', 'A new word awaits — be among the first to solve it', en),
        badge: 1,
        data: { type: 'daily_word', screen: '/daily' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 9,
        minute: 0,
        channelId: 'default',
      },
    });
  },

  async scheduleStreakDangerNotification() {
    const streakStr = await AsyncStorage.getItem('kalimat_current_streak');
    const streak = parseInt(streakStr || '0');
    if (streak < 2) return;

    const en = await isEn();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('⚠️ سلسلتك على وشك الانكسار!', '⚠️ Your streak is about to break!', en),
        body: t(
          `سلسلتك ${streak} يوم تنتهي خلال ساعتين 🔥 لا تدعها تنكسر!`,
          `Your ${streak}-day streak expires in 2 hours 🔥 Don't let it break!`,
          en
        ),
        badge: 1,
        data: { type: 'streak_danger', screen: '/daily' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 22,
        minute: 0,
        channelId: 'streak',
      },
    });
  },

  async scheduleWeeklyRewardNotification() {
    const en = await isEn();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('🏮 مكافأة الجمعة تنتظرك!', '🏮 Your Friday reward is waiting!', en),
        body: t('تذكرة ذهبية مجانية — افتح التطبيق واستلمها قبل منتصف الليل', 'Free golden ticket — open the app and claim it before midnight', en),
        badge: 1,
        data: { type: 'weekly_reward', screen: '/' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 6, // Friday
        hour: 20,
        minute: 0,
        channelId: 'rewards',
      },
    });
  },

  // ── IMMEDIATE NOTIFICATIONS (for friend events etc.) ──

  async sendFriendChallengeNotification(friendName: string, roomCode: string) {
    const en = await isEn();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t(`⚡ ${friendName} يتحداك!`, `⚡ ${friendName} challenges you!`, en),
        body: t(`انضم للمبارزة برمز: ${roomCode} — هل تجرؤ؟`, `Join the duel with code: ${roomCode} — do you dare?`, en),
        badge: 1,
        data: { type: 'friend_challenge', roomCode, screen: '/duel' },
      },
      trigger: null,
    });
  },

  async sendFriendResultNotification(friendName: string, attempts: number) {
    const en = await isEn();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t(`${friendName} حلّ كلمة اليوم 🎯`, `${friendName} solved today's word 🎯`, en),
        body: t(`حلّها في ${attempts} محاولات — هل لعبت أنت؟`, `Solved it in ${attempts} attempts — have you played?`, en),
        data: { type: 'friend_result', screen: '/daily' },
      },
      trigger: null,
    });
  },

  async sendStreakBrokenNotification() {
    const en = await isEn();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('💔 انكسرت سلسلتك', '💔 Your streak broke', en),
        body: t('لا تستسلم — ابدأ سلسلة جديدة اليوم وكن أقوى', "Don't give up — start a new streak today and come back stronger", en),
        data: { type: 'streak_broken', screen: '/daily' },
      },
      trigger: null,
    });
  },

  async sendWelcomeBackNotification(coins: number) {
    const en = await isEn();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('🎁 هدية عودتك تنتظرك', '🎁 Your welcome back gift is waiting', en),
        body: t(`افتقدناك! ${coins} عملة مجانية تنتظرك داخل اللعبة`, `We missed you! ${coins} free coins are waiting for you`, en),
        badge: 1,
        data: { type: 'welcome_back', coins, screen: '/' },
      },
      trigger: null,
    });
  },

  // ── CANCEL ──

  async cancelAll() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  // Handle notification tap — navigate to correct screen
  setupNotificationResponseHandler(router: any) {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.screen) {
        router.push(data.screen);
      }
    });
    return subscription;
  },
};
