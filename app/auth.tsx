import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  Animated, Easing, Dimensions, Platform, KeyboardAvoidingView,
  ScrollView, ActivityIndicator,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { useLanguage } from '../src/lib/LanguageContext';
import { signInWithEmail, signUpWithEmail } from '../src/lib/EmailAuth';

WebBrowser.maybeCompleteAuthSession();

const { width: W, height: H } = Dimensions.get('window');

type Particle = {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
};

function FloatingParticle({ particle }: { particle: Particle }) {
  const translateY = useRef(new Animated.Value(H + 20)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    const animate = () => {
      if (cancelled) return;
      translateY.setValue(H + 20);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -20,
          duration: particle.duration,
          delay: particle.delay,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: particle.opacity, duration: 600, delay: particle.delay, useNativeDriver: true }),
          Animated.delay(particle.duration - 1200),
          Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
      ]).start(() => animate());
    };
    animate();
    return () => { cancelled = true; };
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: particle.x,
        width: particle.size,
        height: particle.size,
        borderRadius: particle.size / 2,
        backgroundColor: '#A78BFA',
        transform: [{ translateY }],
        opacity,
      }}
    />
  );
}

interface AuthButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  iconStyle?: any;
  label: string;
  style?: any;
  labelStyle?: any;
  spinnerColor?: string;
  showAppleIcon?: boolean;
}

function AuthButton({
  onPress, loading, disabled, icon, iconStyle, label, style, labelStyle, spinnerColor, showAppleIcon,
}: AuthButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[styles.authBtn, style, (disabled || loading) && { opacity: 0.7 }]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor || '#4B5563'} />
      ) : (
        <>
          {showAppleIcon ? (
            <Text style={[styles.authBtnIcon, iconStyle, { fontSize: 22 }]}></Text>
          ) : icon ? (
            <Text style={[styles.authBtnIcon, iconStyle]}>{icon}</Text>
          ) : null}
          <Text style={[styles.authBtnLabel, labelStyle]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export default function AuthScreen() {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const [mode, setMode] = useState<'main' | 'email'>('main');
  const [emailMode, setEmailMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<'' | 'google' | 'apple' | 'email' | 'guest'>('');
  const [error, setError] = useState('');
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => setAppleAvailable(false));
    }
  }, []);

  const particles = useMemo<Particle[]>(() => Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * W,
    size: 2 + Math.random() * 4,
    duration: 4000 + Math.random() * 4000,
    delay: Math.random() * 3000,
    opacity: 0.3 + Math.random() * 0.4,
  })), []);

  const cardSlide = useRef(new Animated.Value(60)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const emailFormSlide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(cardSlide, { toValue: 0, tension: 50, friction: 9, delay: 200, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    emailFormSlide.setValue(mode === 'email' ? 20 : 0);
    if (mode === 'email') {
      Animated.spring(emailFormSlide, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }).start();
    }
  }, [mode]);

  async function getCurrentAnonUserId(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (uid && session?.user?.is_anonymous) return uid;
      return null;
    } catch {
      return null;
    }
  }

  async function handleGuest() {
    setLoading(true); setLoadingType('guest'); setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { error: anonError } = await supabase.auth.signInAnonymously();
        if (anonError) throw anonError;
      }
      await AsyncStorage.setItem('kalimat_is_guest', 'true');
      router.replace('/');
    } catch (e: any) {
      setError(e.message || 'Failed to continue as guest');
    }
    setLoading(false); setLoadingType('');
  }

  async function handleGoogle() {
    setLoading(true); setLoadingType('google'); setError('');
    try {
      const redirectTo = 'kalimat://auth/callback';
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (oauthError) throw oauthError;
      if (!data?.url) throw new Error('Google sign-in failed to initialize');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success' || !result.url) {
        setLoading(false); setLoadingType('');
        return;
      }
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.url);
      if (exchangeError) throw exchangeError;

      await syncProfile();
      await AsyncStorage.setItem('kalimat_is_linked', 'true');
      await AsyncStorage.setItem('kalimat_is_google_linked', 'true');
      await routeAfterAuth();
    } catch (e: any) {
      setError(e.message || 'Google sign-in failed');
    }
    setLoading(false); setLoadingType('');
  }

  async function handleApple() {
    setLoading(true); setLoadingType('apple'); setError('');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('Apple did not return an identity token');

      const { error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (authError) throw authError;

      await syncProfile(credential.fullName?.givenName || null);
      await AsyncStorage.setItem('kalimat_is_linked', 'true');
      await AsyncStorage.setItem('kalimat_is_apple_linked', 'true');
      await routeAfterAuth();
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        setError(e.message || 'Apple sign-in failed');
      }
    }
    setLoading(false); setLoadingType('');
  }

  async function handleEmail() {
    if (!email.trim() || !password.trim()) {
      setError(isArabic ? 'أدخل البريد وكلمة المرور' : 'Enter email and password');
      return;
    }
    if (password.length < 6) {
      setError(isArabic ? 'كلمة المرور يجب أن تكون ٦ أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }
    setLoading(true); setLoadingType('email'); setError('');

    const anonId = await getCurrentAnonUserId();
    const result = emailMode === 'signup'
      ? await signUpWithEmail(email.trim(), password, anonId)
      : await signInWithEmail(email.trim(), password);

    if (!result.success) {
      const raw = result.error || '';
      if (/rate limit|too many|wait/i.test(raw)) {
        setError(isArabic ? 'انتظر قليلاً وحاول مجدداً' : 'Please wait a moment and try again');
      } else if (/invalid login|invalid.*credentials/i.test(raw)) {
        setError(isArabic ? 'بريد أو كلمة مرور خاطئة' : 'Wrong email or password');
      } else if (/already registered|already exists/i.test(raw)) {
        setError(isArabic ? 'هذا البريد مسجّل بالفعل، سجّل دخولك' : 'Email already registered, please sign in');
        setEmailMode('login');
      } else if (/confirm.*email|email.*not.*confirm/i.test(raw)) {
        setError(isArabic ? 'فعّل بريدك الإلكتروني أولاً' : 'Please confirm your email first');
      } else {
        setError(raw || (isArabic ? 'فشل تسجيل الدخول' : 'Sign-in failed'));
      }
      setLoading(false); setLoadingType('');
      return;
    }

    await AsyncStorage.setItem('kalimat_is_linked', 'true');
    await AsyncStorage.setItem('kalimat_is_email_linked', 'true');
    setLoading(false); setLoadingType('');
    await routeAfterAuth();
  }

  async function routeAfterAuth() {
    const username = await AsyncStorage.getItem('kalimat_username');
    if (!username) {
      router.replace('/username' as any);
    } else {
      router.replace('/');
    }
  }

  async function syncProfile(firstName?: string | null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [localUsername, coinsStr, gemsStr, streakStr, scoreStr, colorStr, langStr] = await Promise.all([
      AsyncStorage.getItem('kalimat_username'),
      AsyncStorage.getItem('kalimat_coins'),
      AsyncStorage.getItem('kalimat_gems'),
      AsyncStorage.getItem('kalimat_current_streak'),
      AsyncStorage.getItem('kalimat_classic_highscore'),
      AsyncStorage.getItem('kalimat_avatar_color'),
      AsyncStorage.getItem('kalimat_language'),
    ]);

    const localCoins = parseInt(coinsStr || '0', 10);
    const localGems = parseInt(gemsStr || '0', 10);
    const localStreak = parseInt(streakStr || '0', 10);
    const localScore = parseInt(scoreStr || '0', 10);
    const localColor = colorStr || '#7C3AED';
    const localLang = langStr || 'ar';

    const { data: existing } = await supabase
      .from('profiles').select('*').eq('id', user.id).single();

    if (!existing) {
      await supabase.from('profiles').insert({
        id: user.id,
        username: localUsername || firstName || null,
        coins: localCoins || 30,
        gems: localGems,
        current_streak: localStreak,
        classic_high_score: localScore,
        avatar_color: localColor,
        language: localLang,
      });
    } else if (localScore > (existing.classic_high_score || 0)) {
      await supabase.from('profiles')
        .update({ classic_high_score: localScore })
        .eq('id', user.id);
    }

    if (existing?.username) {
      await AsyncStorage.setItem('kalimat_username', existing.username);
    }
    if (existing?.coins != null) {
      await AsyncStorage.setItem('kalimat_coins', String(existing.coins));
    }
  }

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFillObject} />

      {particles.map(p => <FloatingParticle key={p.id} particle={p} />)}

      <View style={styles.glow1} pointerEvents="none" />
      <View style={styles.glow2} pointerEvents="none" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Animated.View style={[styles.logoSection, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoAr}>الكلمة</Text>
            </View>
            <Text style={styles.appName}>Al Kalima</Text>
            <Text style={styles.appTagline}>
              {isArabic ? 'لعبة الكلمات العربية' : 'The Arabic Word Game'}
            </Text>
          </Animated.View>

          <Animated.View style={[styles.card, { opacity: cardOpacity, transform: [{ translateY: cardSlide }] }]}>
            {mode === 'main' ? (
              <>
                <Text style={styles.cardTitle}>
                  {isArabic ? 'ابدأ اللعب' : 'Get started'}
                </Text>
                <Text style={styles.cardSub}>
                  {isArabic
                    ? 'سجّل لحفظ تقدمك على جميع أجهزتك'
                    : 'Sign in to save your progress across all devices'}
                </Text>

                <AuthButton
                  onPress={handleGoogle}
                  loading={loading && loadingType === 'google'}
                  disabled={loading}
                  icon="G"
                  iconStyle={styles.googleIcon}
                  label={isArabic ? 'المتابعة بحساب Google' : 'Continue with Google'}
                  style={styles.googleBtn}
                  labelStyle={styles.googleLabel}
                  spinnerColor="#4285F4"
                />

                {appleAvailable && (
                  <AuthButton
                    onPress={handleApple}
                    loading={loading && loadingType === 'apple'}
                    disabled={loading}
                    showAppleIcon
                    iconStyle={styles.appleIcon}
                    label={isArabic ? 'المتابعة بحساب Apple' : 'Continue with Apple'}
                    style={styles.appleBtn}
                    labelStyle={styles.appleLabel}
                    spinnerColor="#FFFFFF"
                  />
                )}

                <AuthButton
                  onPress={() => setMode('email')}
                  disabled={loading}
                  icon="✉"
                  iconStyle={styles.emailIcon}
                  label={isArabic ? 'المتابعة بالبريد الإلكتروني' : 'Continue with Email'}
                  style={styles.emailBtn}
                  labelStyle={styles.emailLabel}
                />

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>{isArabic ? 'أو' : 'or'}</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  onPress={handleGuest}
                  disabled={loading}
                  style={[styles.guestBtn, loading && { opacity: 0.7 }]}
                  activeOpacity={0.8}
                >
                  {loading && loadingType === 'guest' ? (
                    <ActivityIndicator color="#9CA3AF" />
                  ) : (
                    <Text style={styles.guestLabel}>
                      {isArabic ? '🎮 العب كضيف بدون تسجيل' : '🎮 Play as guest without signing in'}
                    </Text>
                  )}
                </TouchableOpacity>

                <Text style={styles.guestWarning}>
                  {isArabic
                    ? '⚠️ الضيوف لا يظهرون في المتصدرين وقد يفقدون تقدمهم'
                    : "⚠️ Guests don't appear on leaderboards and may lose progress"}
                </Text>
              </>
            ) : (
              <Animated.View style={{ transform: [{ translateY: emailFormSlide }] }}>
                <TouchableOpacity onPress={() => { setMode('main'); setError(''); }} style={styles.backBtn}>
                  <Text style={styles.backBtnText}>
                    {isArabic ? '→ رجوع' : '← Back'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.cardTitle}>
                  {emailMode === 'signup'
                    ? (isArabic ? 'إنشاء حساب' : 'Create account')
                    : (isArabic ? 'تسجيل الدخول' : 'Sign in')}
                </Text>
                <Text style={styles.cardSub}>
                  {emailMode === 'signup'
                    ? (isArabic ? 'احفظ تقدمك على جميع أجهزتك' : 'Save your progress across devices')
                    : (isArabic ? 'سجّل دخولك لاسترجاع تقدمك' : 'Sign in to restore your progress')}
                </Text>

                <TextInput
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(''); }}
                  placeholder={isArabic ? 'البريد الإلكتروني' : 'Email address'}
                  placeholderTextColor="#4B5563"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
                <TextInput
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(''); }}
                  placeholder={isArabic ? 'كلمة المرور (٦ أحرف على الأقل)' : 'Password (min 6 characters)'}
                  placeholderTextColor="#4B5563"
                  secureTextEntry
                  autoCapitalize="none"
                  style={styles.input}
                />

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <TouchableOpacity
                  onPress={handleEmail}
                  disabled={loading}
                  style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                  activeOpacity={0.85}
                >
                  {loading && loadingType === 'email' ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitLabel}>
                      {emailMode === 'signup'
                        ? (isArabic ? 'إنشاء الحساب' : 'Create account')
                        : (isArabic ? 'تسجيل الدخول' : 'Sign in')}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => { setEmailMode(m => (m === 'login' ? 'signup' : 'login')); setError(''); }}
                  style={{ alignItems: 'center', marginTop: 12 }}
                >
                  <Text style={{ color: '#A78BFA', fontSize: 13 }}>
                    {emailMode === 'login'
                      ? (isArabic ? 'ليس لديك حساب؟ أنشئ واحداً' : 'No account? Create one')
                      : (isArabic ? 'لديك حساب؟ سجّل دخولك' : 'Have an account? Sign in')}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            <Text style={styles.terms}>
              {isArabic
                ? 'بالمتابعة توافق على شروط الاستخدام وسياسة الخصوصية'
                : 'By continuing you agree to our Terms of Service and Privacy Policy'}
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07041A' },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 40 },

  glow1: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(124,58,237,0.12)',
    top: H * 0.1, left: -80,
  },
  glow2: {
    position: 'absolute', width: 250, height: 250, borderRadius: 125,
    backgroundColor: 'rgba(99,38,237,0.08)',
    bottom: H * 0.15, right: -60,
  },

  logoSection: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 90, height: 90, borderRadius: 28,
    backgroundColor: 'rgba(124,58,237,0.2)',
    borderWidth: 2, borderColor: 'rgba(124,58,237,0.5)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  logoAr: { color: 'white', fontSize: 20, fontWeight: '900' },
  appName: { color: 'white', fontSize: 32, fontWeight: '900', letterSpacing: 1 },
  appTagline: { color: '#6B7280', fontSize: 14, marginTop: 4 },

  card: {
    backgroundColor: 'rgba(13,7,48,0.92)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.25)',
    padding: 24,
  },
  cardTitle: { color: 'white', fontSize: 22, fontWeight: '900', marginBottom: 6, textAlign: 'center' },
  cardSub: { color: '#6B7280', fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 20 },

  authBtn: {
    height: 54, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginBottom: 12,
  },
  authBtnIcon: { fontSize: 18, fontWeight: '900' },
  authBtnLabel: { fontSize: 15, fontWeight: '700' },

  googleBtn: { backgroundColor: 'white' },
  googleIcon: { color: '#4285F4', fontSize: 20, fontWeight: '900' },
  googleLabel: { color: '#1F2937' },

  appleBtn: { backgroundColor: '#000000', borderWidth: 1, borderColor: '#374151' },
  appleIcon: { color: 'white' },
  appleLabel: { color: 'white' },

  emailBtn: { backgroundColor: 'rgba(124,58,237,0.15)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.4)' },
  emailIcon: { color: '#A78BFA' },
  emailLabel: { color: '#A78BFA' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1F2937' },
  dividerText: { color: '#4B5563', fontSize: 12 },

  guestBtn: {
    height: 46, borderRadius: 14,
    borderWidth: 1, borderColor: '#374151',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  guestLabel: { color: '#9CA3AF', fontSize: 14 },
  guestWarning: { color: '#4B5563', fontSize: 11, textAlign: 'center', lineHeight: 16, marginBottom: 8 },

  backBtn: { marginBottom: 16, alignSelf: 'flex-start' },
  backBtnText: { color: '#7C3AED', fontSize: 14, fontWeight: '700' },
  input: {
    backgroundColor: '#111827', borderRadius: 14,
    borderWidth: 1, borderColor: '#1F2937',
    color: 'white', fontSize: 15, padding: 14,
    marginBottom: 12,
  },
  errorText: { color: '#FCA5A5', fontSize: 13, textAlign: 'center', marginBottom: 10 },
  submitBtn: {
    height: 52, backgroundColor: '#7C3AED',
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
  },
  submitLabel: { color: 'white', fontSize: 16, fontWeight: '900' },

  terms: { color: '#374151', fontSize: 11, textAlign: 'center', marginTop: 16, lineHeight: 16 },
});
