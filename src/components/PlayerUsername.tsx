import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

interface PlayerUsernameProps {
  username: string;
  isElite: boolean;
  isPlus: boolean;
  fontSize?: number;
}

export function PlayerUsername({ username, isElite, isPlus, fontSize = 16 }: PlayerUsernameProps) {
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isElite) {
      Animated.loop(Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: false }),
      ])).start();
    }
  }, [isElite]);

  const color = isElite
    ? glowAnim.interpolate({ inputRange: [0, 1], outputRange: ['#F59E0B', '#FDE68A'] })
    : undefined;

  return (
    <View style={styles.container}>
      {isElite && <Text style={styles.crownIcon}>👑</Text>}
      {isElite ? (
        <Animated.Text style={[styles.username, { fontSize, color }]}>
          {username}
        </Animated.Text>
      ) : (
        <Text style={[styles.username, { fontSize, color: '#FFF' }]}>
          {username}
        </Text>
      )}
      {isPlus && !isElite && (
        <View style={styles.plusBadge}>
          <Text style={styles.plusText}>PLUS</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  crownIcon: { fontSize: 14 },
  username: { fontWeight: '700' },
  plusBadge: {
    backgroundColor: '#7C3AED',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  plusText: { color: '#FFF', fontSize: 8, fontWeight: '800' },
});
