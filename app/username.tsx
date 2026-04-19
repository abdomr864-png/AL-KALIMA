import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Animated, Dimensions, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../src/lib/supabase';
import { useUserStore } from '../src/store/userStore';
import { COLORS } from '../src/lib/constants';
import { toArabicNumerals } from '../src/engine/ShareCard';
import { useLanguage } from '../src/lib/LanguageContext';
import { ReferralSystem } from '../src/lib/ReferralSystem';

const { width: W } = Dimensions.get('window');
const USERNAME_REGEX = /^[\u0600-\u06FFa-zA-Z0-9_]{3,20}$/;

type Status = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'short';

export default function UsernameScreen() {
  const { user } = useUserStore();
  const { setUser } = useUserStore();
  const { t, isEnglish } = useLanguage();
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [saving, setSaving] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [referralStatus, setReferralStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [referralOwner, setReferralOwner] = useState<string | null>(null);

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0.8)).current;
  const inputSlide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(titleScale, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
      Animated.timing(inputSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  // Debounced availability check
  useEffect(() => {
    if (username.length === 0) { setStatus('idle'); return; }
    if (username.length < 3) { setStatus('short'); return; }
    if (!USERNAME_REGEX.test(username)) { setStatus('invalid'); return; }

    setStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .maybeSingle();

        setStatus(data ? 'taken' : 'available');
      } catch {
        setStatus('available'); // Assume available offline
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [username]);

  // Referral code validation
  useEffect(() => {
    if (referralCode.length < 6) { setReferralStatus('idle'); setReferralOwner(null); return; }
    const timer = setTimeout(async () => {
      const owner = await ReferralSystem.validateCode(referralCode);
      setReferralStatus(owner ? 'valid' : 'invalid');
      setReferralOwner(owner);
    }, 400);
    return () => clearTimeout(timer);
  }, [referralCode]);

  async function confirmUsername() {
    if (status !== 'available' || saving) return;
    setSaving(true);

    try {
      // Get user ID from store first, fall back to auth
      let userId = user?.id;
      if (!userId || userId === 'offline') {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        userId = authUser?.id;
      }

      if (!userId || userId === 'offline') {
        // No auth at all — just save locally and proceed
        await AsyncStorage.setItem('kalimat_username_set', 'true');
        await AsyncStorage.setItem('kalimat_username', username.trim());
        await AsyncStorage.setItem('kalimat_profile_username', username.trim());
        if (user) setUser({ ...user, username: username.trim() });
        router.replace('/');
        return;
      }

      // Use RPC for secure, unique username setting (handles race conditions at DB level)
      const { data: rpcData, error } = await supabase.rpc('set_username', {
        desired_username: username.trim(),
      });

      if (error) {
        const errorMsgs: Record<string, string> = {
          'username_taken': t('هذا الاسم مستخدم، جرّب اسماً آخر', 'Username taken, try another'),
          'invalid_length': t('يجب أن يكون بين 3 و20 حرفاً', 'Must be 3–20 characters'),
          'invalid_characters': t('أحرف عربية أو إنجليزية وأرقام فقط', 'Arabic, English letters and numbers only'),
          'reserved_username': t('هذا الاسم محجوز', 'This name is reserved'),
        };
        const key = Object.keys(errorMsgs).find(k => error.message?.includes(k));
        if (key === 'username_taken') {
          setStatus('taken');
        } else {
          setStatus('invalid');
        }
        setSaving(false);
        return;
      }

      await AsyncStorage.setItem('kalimat_username_set', 'true');
      await AsyncStorage.setItem('kalimat_username', username.trim());
      await AsyncStorage.setItem('kalimat_profile_username', username.trim());

      // Apply referral code if provided
      if (referralCode.length === 6 && referralStatus === 'valid' && userId) {
        await ReferralSystem.applyReferralCode(userId, referralCode);
      }

      // Update local store
      if (user) {
        setUser({ ...user, username: username.trim() });
      }

      router.replace('/');
    } catch (e) {
      console.log('Username confirm error:', e);
      setSaving(false);
    }
  }

  const statusConfig: Record<Status, { color: string; text: string }> = {
    idle: { color: '#6B7280', text: '' },
    short: { color: '#F59E0B', text: t('الاسم قصير جداً — ٣ أحرف على الأقل', 'Too short — at least 3 characters') },
    checking: { color: '#F59E0B', text: t('جاري التحقق...', 'Checking...') },
    available: { color: '#22C55E', text: t('✓ الاسم متاح', '✓ Name available') },
    taken: { color: '#EF4444', text: t('✗ هذا الاسم مأخوذ — جرب اسماً آخر', '✗ Name taken — try another') },
    invalid: { color: '#EF4444', text: t('✗ أحرف عربية أو إنجليزية وأرقام فقط', '✗ Letters, numbers, and underscores only') },
  };

  const sc = statusConfig[status];
  const canConfirm = status === 'available' && !saving;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Animated.View style={[styles.inner, { opacity: fadeIn }]}>
        {/* Logo */}
        <Animated.Text style={[styles.logo, { transform: [{ scale: titleScale }] }]}>
          {t('الكلمة', 'The Word')}
        </Animated.Text>

        {/* Title */}
        <Text style={styles.title}>{t('اختر اسمك في اللعبة', 'Choose your game name')}</Text>
        <Text style={styles.subtitle}>
          {t('هذا الاسم سيظهر للاعبين الآخرين', 'This name will be visible to other players')}
        </Text>

        {/* Input */}
        <Animated.View style={[styles.inputWrap, { transform: [{ translateY: inputSlide }] }]}>
          <TextInput
            style={[styles.input, {
              borderColor: status === 'available' ? '#22C55E'
                : status === 'taken' || status === 'invalid' ? '#EF4444'
                : '#2D2D50',
            }]}
            placeholder={t('اكتب اسمك هنا...', 'Type your name here...')}
            placeholderTextColor="#4B5563"
            value={username}
            onChangeText={setUsername}
            textAlign="right"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
            autoFocus
          />
          <View style={styles.inputRight}>
            {status === 'checking' && <ActivityIndicator color="#F59E0B" size="small" />}
            {status === 'available' && <Text style={{ fontSize: 20 }}>✅</Text>}
            {(status === 'taken' || status === 'invalid') && <Text style={{ fontSize: 20 }}>❌</Text>}
          </View>
          <Text style={styles.charCount}>{username.length}/{isEnglish ? '20' : '٢٠'}</Text>
        </Animated.View>

        {/* Status message */}
        {sc.text.length > 0 && (
          <Text style={[styles.statusText, { color: sc.color }]}>{sc.text}</Text>
        )}

        {/* Referral code input */}
        <View style={styles.referralSection}>
          <Text style={styles.referralLabel}>
            {t('كود دعوة صديق (اختياري)', 'Friend referral code (optional)')}
          </Text>
          <TextInput
            style={[styles.referralInput, {
              borderColor: referralStatus === 'valid' ? '#22C55E'
                : referralStatus === 'invalid' ? '#EF4444' : '#2D2D50',
            }]}
            value={referralCode}
            onChangeText={text => setReferralCode(text.toUpperCase())}
            placeholder={t('أدخل الكود هنا', 'Enter code here')}
            placeholderTextColor="#4B5563"
            maxLength={6}
            autoCapitalize="characters"
          />
          {referralStatus === 'valid' && (
            <Text style={styles.referralValid}>
              {t(
                `\u2713 كود صحيح — ستحصل على 30 عملة مجاناً!`,
                `\u2713 Valid code — you get 30 free coins!`
              )}
            </Text>
          )}
          {referralStatus === 'invalid' && (
            <Text style={styles.referralInvalid}>
              {t('\u2717 كود غير صحيح', '\u2717 Invalid code')}
            </Text>
          )}
        </View>

        {/* Confirm button */}
        <TouchableOpacity
          style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
          onPress={confirmUsername}
          disabled={!canConfirm}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.confirmBtnText}>{t('ابدأ اللعب ←', '→ Start Playing')}</Text>
          )}
        </TouchableOpacity>

        {/* Rules */}
        <Text style={styles.rules}>
          {t(
            '٣ إلى ٢٠ حرفاً · أحرف عربية أو إنجليزية أو أرقام أو _\nلا مسافات · لا رموز خاصة',
            '3 to 20 characters · Letters, numbers, or _\nNo spaces · No special characters'
          )}
        </Text>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0730' },
  inner: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32, gap: 16,
  },
  logo: {
    fontSize: 56, fontWeight: '900', color: '#FFF',
    letterSpacing: 2, marginBottom: 8,
  },
  title: {
    fontSize: 22, fontWeight: '800', color: '#FFF', textAlign: 'center',
  },
  subtitle: {
    fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22,
  },
  inputWrap: { width: '100%', position: 'relative' },
  input: {
    backgroundColor: '#1A1A2E', borderRadius: 16, borderWidth: 2,
    paddingHorizontal: 20, paddingVertical: 16,
    color: '#FFF', fontSize: 20, fontWeight: '700',
    width: '100%',
  },
  inputRight: {
    position: 'absolute', left: 16, top: 0, bottom: 0,
    justifyContent: 'center',
  },
  charCount: {
    position: 'absolute', left: 16, bottom: -22,
    color: '#4B5563', fontSize: 11,
  },
  statusText: { fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 8 },
  confirmBtn: {
    backgroundColor: '#7C3AED', borderRadius: 16, width: '100%',
    height: 56, alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  confirmBtnDisabled: { backgroundColor: '#2D2D50' },
  confirmBtnText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  rules: {
    color: '#4B5563', fontSize: 11, textAlign: 'center', lineHeight: 18, marginTop: 8,
  },
  referralSection: { width: '100%', gap: 6, marginTop: 4 },
  referralLabel: { color: '#6B7280', fontSize: 13, textAlign: 'center' },
  referralInput: {
    backgroundColor: '#1A1A2E', borderRadius: 12, borderWidth: 1.5,
    paddingHorizontal: 16, paddingVertical: 14,
    color: '#FFF', fontSize: 18, fontWeight: '700',
    textAlign: 'center', letterSpacing: 6,
  },
  referralValid: { color: '#22C55E', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  referralInvalid: { color: '#EF4444', fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
