import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../src/lib/constants';

const { width: W } = Dimensions.get('window');

export default function SplashScreen() {
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const hexScale = useRef(new Animated.Value(0.3)).current;
  const hexOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const btnSlide = useRef(new Animated.Value(40)).current;
  const btnPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Step 1: bg fades in
    Animated.timing(bgOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    // Step 2: hexagon
    Animated.parallel([
      Animated.spring(hexScale, { toValue: 1, tension: 50, friction: 7, delay: 300, useNativeDriver: true }),
      Animated.timing(hexOpacity, { toValue: 1, duration: 400, delay: 300, useNativeDriver: true }),
    ]).start();

    // Step 3: title
    Animated.parallel([
      Animated.timing(titleOpacity, { toValue: 1, duration: 400, delay: 800, useNativeDriver: true }),
      Animated.timing(titleSlide, { toValue: 0, duration: 400, delay: 800, useNativeDriver: true }),
    ]).start();

    // Step 4: subtitle
    Animated.timing(subtitleOpacity, { toValue: 1, duration: 400, delay: 1200, useNativeDriver: true }).start();

    // Step 5: button
    Animated.parallel([
      Animated.timing(btnOpacity, { toValue: 1, duration: 400, delay: 1800, useNativeDriver: true }),
      Animated.spring(btnSlide, { toValue: 0, tension: 50, friction: 8, delay: 1800, useNativeDriver: true }),
    ]).start(() => {
      // Start pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(btnPulse, { toValue: 1.04, duration: 800, useNativeDriver: true }),
          Animated.timing(btnPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    });

    // Auto-advance after 4s
    const timer = setTimeout(goHome, 5000);
    return () => clearTimeout(timer);
  }, []);

  async function goHome() {
    await AsyncStorage.setItem('seen_splash', 'true');
    router.replace('/');
  }

  return (
    <Animated.View style={[styles.container, { opacity: bgOpacity }]}>
      {/* Glow behind hex */}
      <View style={styles.glowOuter} />

      {/* Hexagon */}
      <Animated.View style={[styles.hexWrap, { opacity: hexOpacity, transform: [{ scale: hexScale }] }]}>
        <View style={styles.hexagon}>
          <View style={styles.hexInner}>
            <Text style={styles.hexLetter}>ك</Text>
          </View>
        </View>
      </Animated.View>

      {/* Title */}
      <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleSlide }] }}>
        <Text style={styles.title}>كلمات</Text>
      </Animated.View>

      {/* Subtitle */}
      <Animated.View style={{ opacity: subtitleOpacity }}>
        <Text style={styles.subtitle}>لعبة الكلمات العربية اليومية</Text>
      </Animated.View>

      {/* Play button */}
      <Animated.View style={[styles.btnWrap, { opacity: btnOpacity, transform: [{ translateY: btnSlide }, { scale: btnPulse }] }]}>
        <TouchableOpacity style={styles.playBtn} activeOpacity={0.85} onPress={goHome}>
          <Text style={styles.playBtnText}>العب الآن ◀</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.PRIMARY_BG,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  glowOuter: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.PURPLE,
    opacity: 0.08,
  },
  hexWrap: {
    marginBottom: 32,
  },
  hexagon: {
    width: 160,
    height: 160,
    borderRadius: 36,
    backgroundColor: COLORS.PURPLE,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.PURPLE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 20,
  },
  hexInner: {
    transform: [{ rotate: '-45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  hexLetter: {
    fontSize: 72,
    fontWeight: '900',
    color: '#FFF',
  },
  title: {
    fontSize: 64,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 20,
    color: COLORS.PURPLE_LIGHT,
    marginBottom: 60,
  },
  btnWrap: {
    width: '100%',
    position: 'absolute',
    bottom: 80,
    paddingHorizontal: 32,
  },
  playBtn: {
    backgroundColor: COLORS.PURPLE,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.PURPLE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  playBtnText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
  },
});
