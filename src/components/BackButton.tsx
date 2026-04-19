import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { COLORS } from '../lib/constants';

export function BackButton() {
  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/');
        }
      }}
      activeOpacity={0.7}
    >
      <Text style={styles.arrow}>←</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    top: 52,
    left: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.CARD_BG,
    borderWidth: 1,
    borderColor: COLORS.CELL_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  arrow: {
    fontSize: 20,
    lineHeight: 38,
    textAlign: 'center',
    width: 38,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
