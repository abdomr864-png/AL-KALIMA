import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';
import { COLORS } from '../lib/constants';
import { toArabicNumerals } from '../engine/ShareCard';

interface ScorePopupProps {
  points: number;
  visible: boolean;
  boosted?: boolean;
}

export function ScorePopup({ points, visible, boosted }: ScorePopupProps) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
      opacity.setValue(1);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -80,
          duration: 1000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(600),
          Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <Text style={styles.text}>+{toArabicNumerals(points)} ⭐</Text>
      {boosted && (
        <Text style={{
          fontSize: 18, fontWeight: '900', color: '#FCD34D',
          backgroundColor: '#F59E0B30', borderRadius: 8,
          paddingHorizontal: 8, paddingVertical: 2, marginTop: 2,
          textAlign: 'center',
        }}>×2</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    top: '30%',
    zIndex: 50,
  },
  text: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.GOLD,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
