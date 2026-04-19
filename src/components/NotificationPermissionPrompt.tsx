import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../lib/constants';
import { NotificationManager } from '../lib/NotificationManager';
import { useLanguage } from '../lib/LanguageContext';

const { width: W } = Dimensions.get('window');

interface Props {
  onDone: () => void;
}

export function NotificationPermissionPrompt({ onDone }: Props) {
  const { t } = useLanguage();

  async function handleAccept() {
    const granted = await NotificationManager.requestPermission();
    if (granted) {
      await NotificationManager.getPushToken();
      await NotificationManager.scheduleAllDailyNotifications();
    }
    await AsyncStorage.setItem('kalimat_notification_prompt_shown', 'true');
    onDone();
  }

  async function handleDecline() {
    await AsyncStorage.setItem('kalimat_notification_prompt_shown', 'true');
    onDone();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🔔</Text>
      <Text style={styles.title}>{t('لا تفوّت كلمة اليوم', "Don't miss today's word")}</Text>
      <Text style={styles.body}>
        {t(
          'سنذكّرك كل يوم بكلمة جديدة\nوننبّهك إذا كانت سلسلتك على وشك الانكسار',
          "We'll remind you daily with a new word\nand alert you if your streak is about to break"
        )}
      </Text>

      <TouchableOpacity style={styles.acceptBtn} activeOpacity={0.85} onPress={handleAccept}>
        <Text style={styles.acceptText}>{t('🔔 نعم، ذكّرني يومياً', '🔔 Yes, remind me daily')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.declineBtn} activeOpacity={0.7} onPress={handleDecline}>
        <Text style={styles.declineText}>{t('ليس الآن', 'Not now')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: W - 64,
    backgroundColor: COLORS.CARD_BG,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.PURPLE + '40',
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  acceptBtn: {
    width: '100%',
    height: 54,
    backgroundColor: COLORS.PURPLE,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  acceptText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
  },
  declineBtn: {
    paddingVertical: 10,
  },
  declineText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 14,
  },
});
