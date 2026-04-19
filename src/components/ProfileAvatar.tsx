import React, { useEffect, useRef, memo } from 'react';
import { View, Text, Image, Animated, Easing, StyleSheet } from 'react-native';
import { PROFILE_ICONS, RARITY_COLORS } from '../lib/premiumCosmetics';

interface ProfileAvatarProps {
  size: number;
  icon: string;
  username: string;
  borderType: string;
  avatarUrl?: string;
  showRarityGlow?: boolean;
  showRarityBadge?: boolean;
}

export const ProfileAvatar = memo(function ProfileAvatar({
  size,
  icon,
  username,
  borderType,
  avatarUrl,
  showRarityGlow = true,
  showRarityBadge = false,
}: ProfileAvatarProps) {
  const iconData = PROFILE_ICONS.find(i => i.id === icon);
  const rarity = iconData?.rarity || 'common';
  const rarityColors = RARITY_COLORS[rarity];

  const BORDER_PAD = borderType && borderType !== 'none' ? 10 : 4;
  const TOTAL = size + BORDER_PAD * 2;

  const glowColor: string | null = {
    common: null,
    rare: '#3B82F6',
    epic: '#7C3AED',
    legendary: '#F59E0B',
    mythic: '#EC4899',
  }[rarity] ?? null;

  const badgeSize = Math.max(20, size * 0.32);

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: TOTAL, height: TOTAL, alignItems: 'center', justifyContent: 'center' }}>
        {/* LAYER 1 — Animated border */}
        {borderType && borderType !== 'none' && (
          <View style={StyleSheet.absoluteFill}>
            <BorderAnimation type={borderType} size={TOTAL} />
          </View>
        )}

        {/* LAYER 2 — Rarity glow */}
        {showRarityGlow && glowColor && (
          <View style={{
            position: 'absolute',
            width: size + 6,
            height: size + 6,
            borderRadius: (size + 6) / 2,
            backgroundColor: glowColor,
            opacity: 0.15,
          }} />
        )}

        {/* LAYER 3 — Main avatar circle: ALWAYS photo (or letter fallback) */}
        <View style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#1A1A2E',
          borderWidth: borderType === 'none' ? 2 : 0,
          borderColor: rarityColors.border,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: size, height: size, borderRadius: size / 2 }}
              resizeMode="cover"
            />
          ) : (
            <Text style={{ fontSize: size * 0.42, fontWeight: '900', color: '#FFF' }}>
              {username?.[0]?.toUpperCase() || '?'}
            </Text>
          )}
        </View>

        {/* SHOP ICON BADGE — always visible, bottom-right corner */}
        {iconData?.emoji && (
          <View style={{
            position: 'absolute',
            bottom: BORDER_PAD - 2,
            right: BORDER_PAD - 2,
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize / 2,
            backgroundColor: rarityColors.bg,
            borderWidth: 3,
            borderColor: '#0D0730',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: rarityColors.border,
            shadowOpacity: 0.6,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 0 },
            elevation: 4,
          }}>
            <Text style={{ fontSize: badgeSize * 0.55 }}>{iconData.emoji}</Text>
          </View>
        )}
      </View>

      {/* Rarity badge */}
      {showRarityBadge && rarity !== 'common' && (
        <View style={{
          backgroundColor: rarityColors.bg,
          borderWidth: 1,
          borderColor: rarityColors.border,
          borderRadius: 8,
          paddingHorizontal: 8,
          paddingVertical: 2,
          marginTop: 4,
        }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: rarityColors.text }}>
            {rarityColors.label}
          </Text>
        </View>
      )}
    </View>
  );
});

// ─── BORDER ANIMATIONS ───
// Every ring is wrapped in React.memo so parent re-renders (tab switches,
// filter toggles, purchases, Supabase pushes, scroll) never remount them.
// Each loop is started once in useEffect([]) with useNativeDriver: true, so
// the animation runs on the UI thread and keeps going until the component
// truly unmounts (only when the user equips a different border type).
const BorderAnimation = memo(function BorderAnimation({ type, size }: { type: string; size: number }) {
  switch (type) {
    case 'fire_ring': return <FireRing size={size} />;
    case 'stars': return <StarRing size={size} />;
    case 'rainbow': return <RainbowRing size={size} />;
    case 'electric': return <ElectricRing size={size} />;
    case 'gold_spin': return <GoldSpin size={size} />;
    case 'galaxy_ring': return <GalaxyRing size={size} />;
    default: return null;
  }
});

const FireRing = memo(function FireRing({ size }: { size: number }) {
  const color = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(color, { toValue: 1, duration: 1800, useNativeDriver: false })).start();
  }, []);
  const borderColor = color.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['#EF4444', '#F97316', '#F59E0B', '#F97316', '#EF4444'],
  });
  return (
    <Animated.View style={{
      width: size, height: size, borderRadius: size / 2,
      borderWidth: 3, borderColor,
      shadowColor: '#EF4444', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 8,
    }} />
  );
});

const StarRing = memo(function StarRing({ size }: { size: number }) {
  const rotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(rotation, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })).start();
  }, []);
  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const R = size / 2;

  return (
    <Animated.View style={{ width: size, height: size, transform: [{ rotate }] }}>
      {[0, 90, 180, 270].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <Text key={i} style={{
            position: 'absolute', fontSize: 12,
            left: R + (R - 8) * Math.cos(rad) - 8,
            top: R + (R - 8) * Math.sin(rad) - 8,
          }}>
            {i % 2 === 0 ? '⭐' : '✨'}
          </Text>
        );
      })}
    </Animated.View>
  );
});

const RainbowRing = memo(function RainbowRing({ size }: { size: number }) {
  const color = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(color, { toValue: 1, duration: 2500, easing: Easing.linear, useNativeDriver: false })).start();
  }, []);
  const borderColor = color.interpolate({
    inputRange: [0, 0.17, 0.33, 0.5, 0.67, 0.83, 1],
    outputRange: ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EF4444'],
  });
  return (
    <Animated.View style={{
      width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor,
    }} />
  );
});

const ElectricRing = memo(function ElectricRing({ size }: { size: number }) {
  const color = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(color, { toValue: 1, duration: 100, useNativeDriver: false }),
      Animated.timing(color, { toValue: 0, duration: 100, useNativeDriver: false }),
      Animated.timing(color, { toValue: 0.8, duration: 80, useNativeDriver: false }),
      Animated.timing(color, { toValue: 0.2, duration: 120, useNativeDriver: false }),
      Animated.timing(color, { toValue: 1, duration: 60, useNativeDriver: false }),
      Animated.timing(color, { toValue: 0, duration: 200, useNativeDriver: false }),
      Animated.delay(300),
    ])).start();
  }, []);
  const borderColor = color.interpolate({
    inputRange: [0, 0.5, 1], outputRange: ['#3B82F6', '#93C5FD', '#FFFFFF'],
  });
  const borderWidth = color.interpolate({ inputRange: [0, 1], outputRange: [2, 4] });
  return (
    <Animated.View style={{
      width: size, height: size, borderRadius: size / 2, borderWidth, borderColor,
      shadowColor: '#60A5FA', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10,
    }} />
  );
});

const GoldSpin = memo(function GoldSpin({ size }: { size: number }) {
  const spin = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 1000, useNativeDriver: false }),
      Animated.timing(glow, { toValue: 0, duration: 1000, useNativeDriver: false }),
    ])).start();
  }, []);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const R = size / 2;
  const dotCount = 8;

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: 3, borderColor: '#F59E0B',
        shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.0] }), shadowRadius: 8,
      }} />
      <Animated.View style={{ width: size, height: size, transform: [{ rotate }] }}>
        {Array.from({ length: dotCount }).map((_, i) => {
          const rad = (i / dotCount) * 2 * Math.PI;
          return (
            <View key={i} style={{
              position: 'absolute',
              left: R + (R - 4) * Math.cos(rad) - 3,
              top: R + (R - 4) * Math.sin(rad) - 3,
              width: 6, height: 6, borderRadius: 3,
              backgroundColor: i % 2 === 0 ? '#FCD34D' : '#F59E0B',
            }} />
          );
        })}
      </Animated.View>
    </View>
  );
});

const GalaxyRing = memo(function GalaxyRing({ size }: { size: number }) {
  const fast = useRef(new Animated.Value(0)).current;
  const slow = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const R = size / 2;

  useEffect(() => {
    Animated.loop(Animated.timing(fast, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(slow, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1500, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0, duration: 1500, useNativeDriver: false }),
    ])).start();
  }, []);

  const fastRotate = fast.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const slowRotate = slow.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  const borderColor = pulse.interpolate({ inputRange: [0, 1], outputRange: ['#4338CA', '#818CF8'] });

  const dots = (orbitR: number) => [0, 120, 240].map(deg => {
    const rad = (deg * Math.PI) / 180;
    return { x: R + orbitR * Math.cos(rad) - 4, y: R + orbitR * Math.sin(rad) - 4 };
  });

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: 3, borderColor,
        shadowColor: '#818CF8', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 10,
      }} />
      <Animated.View style={{ position: 'absolute', width: size, height: size, transform: [{ rotate: fastRotate }] }}>
        {dots(R - 4).map((pos, i) => (
          <View key={i} style={{
            position: 'absolute', left: pos.x, top: pos.y,
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: ['#A78BFA', '#EC4899', '#818CF8'][i],
          }} />
        ))}
      </Animated.View>
      <Animated.View style={{ position: 'absolute', width: size, height: size, transform: [{ rotate: slowRotate }] }}>
        {dots(R - 4).map((pos, i) => (
          <View key={i} style={{
            position: 'absolute', left: pos.x, top: pos.y,
            width: 5, height: 5, borderRadius: 2.5,
            backgroundColor: '#6366F1', opacity: 0.6,
          }} />
        ))}
      </Animated.View>
    </View>
  );
});
