import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../src/lib/constants';
import { useLanguage } from '../src/lib/LanguageContext';

const { width: W } = Dimensions.get('window');

type Lang = 'ar' | 'en' | null;

export default function LanguageSelectScreen() {
  const [selected, setSelected] = useState<Lang>(null);
  const { setLanguage } = useLanguage();

  async function confirm() {
    if (!selected) return;
    await setLanguage(selected);
    await AsyncStorage.setItem('kalimat_language_set', 'true');
    router.replace('/tutorial');
  }

  return (
    <View style={styles.container}>
      {/* Background glows */}
      <View style={[styles.glow, { top: -100, right: -80, backgroundColor: '#7C3AED', opacity: 0.08 }]} />
      <View style={[styles.glow, { bottom: -120, left: -100, backgroundColor: '#22C55E', opacity: 0.06 }]} />

      {/* Logo */}
      <Text style={styles.logo}>
        {selected === 'en' ? 'KALIMAT' : 'كلمات'}
      </Text>
      <Text style={styles.subtitle}>
        {selected === 'en' ? 'The Arabic Word Game' : 'لعبة الكلمات'}
      </Text>

      <Text style={styles.prompt}>
        {'Choose your language\nاختر لغتك'}
      </Text>

      {/* Arabic option */}
      <TouchableOpacity
        onPress={() => setSelected('ar')}
        style={[
          styles.option,
          {
            backgroundColor: selected === 'ar' ? '#2D1B69' : '#1A1A2E',
            borderWidth: selected === 'ar' ? 2 : 1,
            borderColor: selected === 'ar' ? '#7C3AED' : '#2D2D50',
          },
        ]}
        activeOpacity={0.85}
      >
        <Text style={styles.flag}>🇸🇦</Text>
        <View style={styles.optionText}>
          <Text style={styles.langName}>العربية</Text>
          <Text style={styles.langDesc}>العب مع اللاعبين العرب</Text>
        </View>
        {selected === 'ar' && <Text style={[styles.check, { color: '#7C3AED' }]}>✓</Text>}
      </TouchableOpacity>

      {/* English option */}
      <TouchableOpacity
        onPress={() => setSelected('en')}
        style={[
          styles.option,
          {
            backgroundColor: selected === 'en' ? '#1B3A2D' : '#1A1A2E',
            borderWidth: selected === 'en' ? 2 : 1,
            borderColor: selected === 'en' ? '#22C55E' : '#2D2D50',
          },
        ]}
        activeOpacity={0.85}
      >
        <Text style={styles.flag}>🇬🇧</Text>
        <View style={styles.optionText}>
          <Text style={styles.langName}>English</Text>
          <Text style={styles.langDesc}>Play with English speakers</Text>
        </View>
        {selected === 'en' && <Text style={[styles.check, { color: '#22C55E' }]}>✓</Text>}
      </TouchableOpacity>

      {/* Confirm */}
      <TouchableOpacity
        onPress={confirm}
        style={[
          styles.confirmBtn,
          { opacity: selected ? 1 : 0.4 },
        ]}
        activeOpacity={0.85}
        disabled={!selected}
      >
        <Text style={styles.confirmText}>
          {selected === 'en' ? 'Continue →' : selected === 'ar' ? 'متابعة ←' : 'Continue / متابعة'}
        </Text>
      </TouchableOpacity>

      {/* Note */}
      <Text style={styles.note}>
        {'You can change this later in settings\nيمكن تغيير هذا لاحقاً من الإعدادات'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0730',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  glow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  logo: {
    fontSize: 56,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 2,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.PURPLE_LIGHT,
    marginBottom: 32,
  },
  prompt: {
    fontSize: 18,
    color: '#8B8BAD',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 24,
  },
  option: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  flag: {
    fontSize: 36,
  },
  optionText: {
    flex: 1,
  },
  langName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
  },
  langDesc: {
    fontSize: 14,
    color: '#8B8BAD',
    marginTop: 2,
  },
  check: {
    fontSize: 28,
    fontWeight: '900',
  },
  confirmBtn: {
    width: '100%',
    height: 58,
    borderRadius: 16,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  confirmText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
  },
  note: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 20,
  },
});
