/**
 * Shared game result screen — used across all game modes.
 * Full-screen overlay with profile background, win animation,
 * frosted glass card with spring entrance, and 3D stat cards.
 */
import React, { useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated, Pressable, ScrollView,
  Dimensions, Platform,
} from 'react-native';
import { WinAnimationPlayer } from './WinAnimations';
import { ProfileBackground } from './ProfileBackground';
import { useCosmeticStore } from '../store/cosmeticStore';
import { useLanguage } from '../lib/LanguageContext';

const { width: SW } = Dimensions.get('window');

export interface StatCardData {
  label: string;
  value: string;
  icon: string;
  color: string;
}

interface GameResultScreenProps {
  visible: boolean;
  isWin: boolean;
  title: string;
  subtitle: string;
  /** Large word displayed in the center (optional — daily/rush show it, classic doesn't) */
  word?: string;
  /** Category pill text + emoji (optional) */
  category?: string;
  categoryEmoji?: string;
  categoryColor?: string;
  /** Up to 4 stat cards */
  stats: StatCardData[];
  /** Action buttons */
  buttons: { label: string; icon: string; onPress: () => void; primary?: boolean }[];
  /** Extra content rendered below buttons (e.g. ad button, streak freeze notice) */
  extraContent?: React.ReactNode;
  /** Footer text (tap to dismiss) */
  footerText?: string;
  onClose?: () => void;
}

export function GameResultScreen({
  visible, isWin, title, subtitle, word, category, categoryEmoji, categoryColor,
  stats, buttons, extraContent, footerText, onClose,
}: GameResultScreenProps) {
  const { activeWinAnimationId, activeProfileBgId } = useCosmeticStore();
  const { isEnglish } = useLanguage();
  const [showAnim, setShowAnim] = React.useState(true);
  const overlayOpacity = useRef(new Animated.Value(0.5)).current;

  // Reset animation visibility when screen becomes visible
  useEffect(() => {
    if (visible && isWin) {
      setShowAnim(true);
      overlayOpacity.setValue(0.5);
    }
  }, [visible]);

  const onAnimDone = useCallback(() => {
    setShowAnim(false);
    Animated.timing(overlayOpacity, {
      toValue: 0.15, duration: 600, useNativeDriver: true,
    }).start();
  }, []);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      {/* Profile background */}
      {isWin && activeProfileBgId && activeProfileBgId !== 'none' && (
        <ProfileBackground theme={activeProfileBgId} />
      )}

      {/* Dark overlay — fades after animation */}
      <Animated.View pointerEvents="none" style={[styles.darkOverlay, { opacity: overlayOpacity }]} />

      {/* Win animation */}
      {isWin && showAnim && (
        <WinAnimationPlayer
          animationId={activeWinAnimationId || 'default'}
          onDone={onAnimDone}
        />
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ResultCard
          isWin={isWin}
          title={title}
          subtitle={subtitle}
          word={word}
          category={category}
          categoryEmoji={categoryEmoji}
          categoryColor={categoryColor}
          stats={stats}
          buttons={buttons}
          extraContent={extraContent}
          footerText={footerText}
          onClose={onClose}
        />
      </ScrollView>
    </View>
  );
}

function ResultCard({
  isWin, title, subtitle, word, category, categoryEmoji, categoryColor,
  stats, buttons, extraContent, footerText, onClose,
}: Omit<GameResultScreenProps, 'visible'>) {
  const cardSlide = useRef(new Animated.Value(400)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardSlide, { toValue: 0, tension: 65, friction: 8, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.card, {
      opacity: cardOpacity,
      transform: [{ translateY: cardSlide }],
    }]}>
      {/* Title */}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {/* Word display (optional) */}
      {word && (
        <View style={styles.wordSection}>
          <Text style={styles.wordText}>{word}</Text>
          {category && (
            <View style={[styles.categoryPill, {
              backgroundColor: (categoryColor || '#7C3AED') + '20',
              borderColor: (categoryColor || '#7C3AED') + '40',
            }]}>
              {categoryEmoji && <Text style={{ fontSize: 14 }}>{categoryEmoji}</Text>}
              <Text style={[styles.categoryText, { color: categoryColor || '#7C3AED' }]}>{category}</Text>
            </View>
          )}
        </View>
      )}

      {/* Stat cards */}
      {stats.length > 0 && (
        <View style={styles.statsRow}>
          {stats.map((stat, i) => (
            <StatCard3D key={i} {...stat} delay={200 + i * 200} />
          ))}
        </View>
      )}

      {/* Buttons */}
      {buttons.length > 0 && (
        <View style={styles.btnsRow}>
          {buttons.map((btn, i) => (
            <Pressable
              key={i}
              style={btn.primary !== false ? styles.primaryBtn : styles.secondaryBtn}
              onPress={btn.onPress}
            >
              <Text style={{ fontSize: 18 }}>{btn.icon}</Text>
              <Text style={btn.primary !== false ? styles.primaryBtnText : styles.secondaryBtnText}>
                {btn.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Extra content */}
      {extraContent}

      {/* Footer */}
      {footerText && onClose && (
        <Pressable onPress={onClose} style={styles.closeArea}>
          <Text style={styles.footerText}>{footerText}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

function StatCard3D({ label, value, icon, color, delay }: StatCardData & { delay: number }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(-15)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
        Animated.spring(rotateAnim, { toValue: 0, tension: 80, friction: 8, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  const rotate = rotateAnim.interpolate({ inputRange: [-15, 0], outputRange: ['-15deg', '0deg'] });

  return (
    <Animated.View style={[styles.statCard, {
      borderColor: color + '40',
      transform: [{ scale: scaleAnim }, { rotate }],
    }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0D0730',
    zIndex: 100,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    zIndex: 10,
  },
  card: {
    backgroundColor: 'rgba(30, 30, 58, 0.85)',
    borderRadius: 28,
    padding: 24,
    width: '92%',
    maxWidth: 400,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    ...(Platform.OS === 'ios' ? {
      shadowColor: '#7C3AED',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 24,
    } : { elevation: 20 }),
    overflow: 'hidden',
  },
  title: {
    fontSize: 34, fontWeight: '900', color: '#FFF', textAlign: 'center',
  },
  subtitle: {
    fontSize: 16, color: '#A78BFA', textAlign: 'center', marginTop: -4,
  },
  wordSection: {
    width: '100%', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(13, 7, 48, 0.6)', borderRadius: 20, padding: 20,
  },
  wordText: { fontSize: 42, fontWeight: '900', color: '#FFF' },
  categoryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, borderWidth: 1,
  },
  categoryText: { fontSize: 13, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row', gap: 10, width: '100%', justifyContent: 'center',
  },
  statCard: {
    flex: 1, alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(13, 7, 48, 0.6)', borderRadius: 16,
    paddingVertical: 14, paddingHorizontal: 8,
    borderWidth: 1,
  },
  statIcon: { fontSize: 20 },
  statValue: { fontSize: 26, fontWeight: '900' },
  statLabel: { fontSize: 11, color: '#8B8BAD', fontWeight: '600' },
  btnsRow: {
    flexDirection: 'row', gap: 10, width: '100%', marginTop: 4,
  },
  primaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#7C3AED', height: 52, borderRadius: 16,
  },
  primaryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  secondaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: '#7C3AED',
  },
  secondaryBtnText: { color: '#A78BFA', fontSize: 15, fontWeight: '700' },
  closeArea: { paddingVertical: 8 },
  footerText: { fontSize: 14, color: '#8B8BAD' },
});
