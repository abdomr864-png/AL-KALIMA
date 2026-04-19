import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../lib/constants';
import { useLanguage } from '../lib/LanguageContext';
import type { FriendResult } from '../lib/FriendActivity';

interface Props {
  friends: FriendResult[];
}

export function FriendActivityBar({ friends }: Props) {
  const { t, isEnglish } = useLanguage();
  if (friends.length === 0) return null;

  const name = friends[0].username;
  const othersCount = friends.length - 1;

  return (
    <View style={[styles.container, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
      <View style={styles.avatarStack}>
        {friends.slice(0, 3).map((f, i) => (
          <View
            key={f.player_id}
            style={[
              styles.avatar,
              { marginRight: i > 0 ? -10 : 0, zIndex: 3 - i },
            ]}
          >
            <Text style={styles.avatarText}>{f.username[0]}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.text}>
        {friends.length === 1
          ? t(`${name} حلّ كلمة اليوم — هل أنت جاهز؟`, `${name} solved today's word — are you ready?`)
          : t(`${name} و${othersCount} آخرون لعبوا اليوم`, `${name} and ${othersCount} others played today`)}
      </Text>
      <Text style={styles.eye}>👀</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PURPLE + '15',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.PURPLE + '25',
    gap: 10,
  },
  avatarStack: {
    flexDirection: 'row',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.PRIMARY_BG,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  text: {
    flex: 1,
    color: COLORS.TEXT_SECONDARY,
    fontSize: 12,
    lineHeight: 18,
  },
  eye: {
    fontSize: 18,
  },
});
