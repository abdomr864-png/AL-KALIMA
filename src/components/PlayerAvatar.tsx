import React from 'react';
import { View, Text } from 'react-native';
import { PROFILE_ICONS, AVATAR_BORDERS, RARITY_COLORS } from '../lib/premiumCosmetics';
import { AnimatedAvatarBorder } from './AnimatedAvatarBorder';

interface PlayerAvatarProps {
  iconId: string;
  username?: string;
  size?: number;
  borderId?: string;
  showBadge?: boolean;
}

export function PlayerAvatar({
  iconId,
  username,
  size = 48,
  borderId = 'none',
  showBadge = false,
}: PlayerAvatarProps) {
  const iconData = PROFILE_ICONS.find(i => i.id === iconId);
  const rarity = RARITY_COLORS[iconData?.rarity || 'common'];

  return (
    <View style={{ alignItems: 'center' }}>
      <AnimatedAvatarBorder size={size} borderType={borderId}>
        <View style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: rarity.bg,
          borderWidth: borderId === 'none' && iconData?.rarity !== 'common' ? 2 : 0,
          borderColor: rarity.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {iconData?.emoji ? (
            <Text style={{ fontSize: size * 0.5 }}>{iconData.emoji}</Text>
          ) : (
            <Text style={{
              fontSize: size * 0.45,
              fontWeight: '900',
              color: '#FFF',
            }}>
              {username?.[0]?.toUpperCase() || '?'}
            </Text>
          )}
        </View>
      </AnimatedAvatarBorder>

      {showBadge && iconData?.rarity && iconData.rarity !== 'common' && (
        <View style={{
          backgroundColor: rarity.bg,
          borderWidth: 1,
          borderColor: rarity.border,
          borderRadius: 8,
          paddingHorizontal: 8,
          paddingVertical: 2,
          marginTop: 4,
        }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: rarity.text }}>
            {rarity.label}
          </Text>
        </View>
      )}
    </View>
  );
}
