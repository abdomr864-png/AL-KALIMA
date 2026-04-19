import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link, usePathname } from 'expo-router';
import { COLORS } from '../lib/constants';
import { AR } from '../lib/strings';
import { useLanguage } from '../lib/LanguageContext';

const TABS_AR = [
  { path: '/', label: 'الرئيسية', icon: '🏠' },
  { path: '/modes', label: 'الألعاب', icon: '🎮' },
  { path: '/leaderboard', label: AR.leaderboard, icon: '🏆' },
  { path: '/shop', label: AR.shop, icon: '🛍️' },
  { path: '/profile', label: AR.profile, icon: '👤' },
] as const;

const TABS_EN = [
  { path: '/', label: 'Home', icon: '🏠' },
  { path: '/modes', label: 'Games', icon: '🎮' },
  { path: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
  { path: '/shop', label: 'Shop', icon: '🛍️' },
  { path: '/profile', label: 'Profile', icon: '👤' },
] as const;

export function NavBar() {
  const pathname = usePathname();
  const { isEnglish } = useLanguage();
  const TABS = isEnglish ? TABS_EN : TABS_AR;

  return (
    <View style={[styles.container, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
      {TABS.map((tab) => {
        const isActive = pathname === tab.path || (tab.path === '/' && (pathname === '/index' || pathname === ''));
        return (
          <Link
            key={tab.path}
            href={tab.path as any}
            replace
            style={styles.tab}
          >
            <View style={styles.tabInner}>
              <Text style={styles.icon}>{tab.icon}</Text>
              <Text style={[styles.label, isActive && styles.activeLabel]}>
                {tab.label}
              </Text>
            </View>
          </Link>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.CARD_BG,
    borderTopWidth: 1,
    borderTopColor: COLORS.CELL_BORDER,
    paddingBottom: 20,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
  },
  tabInner: {
    alignItems: 'center',
    gap: 2,
  },
  icon: {
    fontSize: 20,
  },
  label: {
    fontSize: 10,
    color: COLORS.TEXT_SECONDARY,
  },
  activeLabel: {
    color: COLORS.PURPLE,
    fontWeight: 'bold',
  },
});
