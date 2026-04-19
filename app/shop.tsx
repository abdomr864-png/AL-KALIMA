import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Modal, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useUserStore } from '../src/store/userStore';
import { useCosmeticStore } from '../src/store/cosmeticStore';
import { THEMES, TILE_STYLES, KEYBOARD_SKINS, PREVIEW_GRID, RESULT_COLORS } from '../src/lib/cosmetics';
import {
  PROFILE_ICONS, AVATAR_BORDERS, WIN_ANIMATIONS, PROFILE_BG_THEMES,
  RARITY_COLORS, type Rarity, type CosmeticCurrency,
} from '../src/lib/premiumCosmetics';
import { COIN_EARN_INFO, GEM_PACKS } from '../src/lib/economy';
import { toArabicNumerals } from '../src/engine/ShareCard';
import { COLORS } from '../src/lib/constants';
import { AR } from '../src/lib/strings';
import { router } from 'expo-router';
import { RewardedAdButton } from '../src/components/RewardedAdButton';
import { useSubscription, PRODUCTS } from '../src/hooks/useSubscription';
import { useCoins } from '../src/hooks/useCoins';
import { ProfileAvatar } from '../src/components/ProfileAvatar';
import { WinAnimationPlayer } from '../src/components/WinAnimations';
import { useLanguage } from '../src/lib/LanguageContext';

type Tab = 'coins' | 'gems' | 'profile' | 'plus';
type RarityFilter = 'all' | Rarity;

export default function ShopScreen() {
  const { user, updateCoins } = useUserStore();
  const cosmetics = useCosmeticStore();
  const { purchaseProduct, loading: purchaseLoading } = useSubscription();
  const { balance: coins, gems, spendCoins, spendGems } = useCoins();
  const { t, isEnglish } = useLanguage();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>((params.tab as Tab) || 'coins');
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all');
  const [previewAnim, setPreviewAnim] = useState<string | null>(null);
  const [animeFilter, setAnimeFilter] = useState<'all' | 'anime'>('all');

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(''), 2500);
  }

  function buyWithCoins(type: 'theme' | 'tile' | 'keyboard' | 'icon', id: string, price: number) {
    if (coins < price) {
      showToast(t('عملاتك غير كافية 🪙', 'Not enough coins 🪙'), 'error');
      return;
    }
    spendCoins(price);
    cosmetics.addOwned(type, id);
    cosmetics.equip(type, id);
    showToast(t('تم الشراء والتفعيل! ✨', 'Purchased & equipped! ✨'));
  }

  function buyWithGems(type: 'icon' | 'border' | 'winAnimation' | 'profileBg', id: string, price: number) {
    if (gems < price) {
      showToast(t('جواهرك غير كافية 💎', 'Not enough gems 💎'), 'error');
      return;
    }
    spendGems(price);
    cosmetics.addOwned(type, id);
    cosmetics.equip(type, id);
    showToast(t('تم الشراء! ✨', 'Purchased! ✨'));
  }

  const filteredIcons = rarityFilter === 'all'
    ? PROFILE_ICONS
    : PROFILE_ICONS.filter(i => i.rarity === rarityFilter);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header row with back button, title, currency */}
      <View style={[styles.headerRow, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/');
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>{isEnglish ? '‹' : '›'}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{t('المتجر', 'Shop')}</Text>

        <View style={styles.currencyBar}>
          <View style={styles.currencyItem}>
            <Text style={styles.currencyIcon}>🪙</Text>
            <Text style={styles.currencyAmount}>{toArabicNumerals(coins)}</Text>
          </View>
          <View style={styles.currencyDivider} />
          <View style={styles.currencyItem}>
            <Text style={styles.currencyIcon}>💎</Text>
            <Text style={[styles.currencyAmount, { color: '#A78BFA' }]}>{toArabicNumerals(gems)}</Text>
          </View>
        </View>
      </View>

      {/* 4 Tabs */}
      <View style={[styles.tabsRow, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
        {([
          { key: 'coins' as Tab, label: t('عملاتي', 'Coins'), emoji: '🪙', color: '#F59E0B' },
          { key: 'gems' as Tab, label: t('جواهر', 'Gems'), emoji: '💎', color: '#A78BFA' },
          { key: 'profile' as Tab, label: t('ملف شخصي', 'Profile'), emoji: '👤', color: '#60A5FA' },
          { key: 'plus' as Tab, label: t('بلس', 'Plus'), emoji: '👑', color: '#FBBF24' },
        ]).map(tb => {
          const active = tab === tb.key;
          return (
            <Pressable
              key={tb.key}
              style={[
                styles.tab,
                active && { backgroundColor: tb.color },
              ]}
              onPress={() => setTab(tb.key)}
            >
              <Text style={styles.tabEmoji}>{tb.emoji}</Text>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tb.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* ════════════ TAB 1: COINS ════════════ */}
        {tab === 'coins' && (
          <>
            {/* Big balance */}
            <View style={styles.bigBalanceCard}>
              <Text style={styles.bigBalanceEmoji}>🪙</Text>
              <Text style={styles.bigBalanceNum}>{toArabicNumerals(coins)}</Text>
              <Text style={styles.bigBalanceLabel}>{t('عملاتك', 'Your Coins')}</Text>
            </View>

            {/* Rewarded ad */}
            <RewardedAdButton />

            {/* How to earn */}
            <Text style={styles.sectionTitle}>{t('كيف تكسب عملات؟', 'How to earn coins?')}</Text>
            <View style={styles.earnCard}>
              {COIN_EARN_INFO.map((item, i) => (
                <View key={i} style={styles.earnRow}>
                  <Text style={styles.earnEmoji}>{item.emoji}</Text>
                  <Text style={styles.earnLabel}>{item.label}</Text>
                  <Text style={styles.earnAmount}>+{toArabicNumerals(item.amount)}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.noSaleNote}>{t('العملات تُكسب من اللعب فقط — لا يمكن شراؤها!', 'Coins are earned by playing only — they cannot be purchased!')}</Text>
          </>
        )}

        {/* ════════════ TAB 2: GEMS ════════════ */}
        {tab === 'gems' && (
          <>
            {/* Big balance */}
            <View style={[styles.bigBalanceCard, { borderColor: '#7C3AED' }]}>
              <Text style={styles.bigBalanceEmoji}>💎</Text>
              <Text style={[styles.bigBalanceNum, { color: '#A78BFA' }]}>{toArabicNumerals(gems)}</Text>
              <Text style={styles.bigBalanceLabel}>{t('جواهرك', 'Your Gems')}</Text>
            </View>

            {/* Gem packs */}
            <Text style={styles.sectionTitle}>{t('شراء جواهر', 'Buy Gems')}</Text>
            <View style={styles.gemPacksContainer}>
              {GEM_PACKS.map(pack => (
                <Pressable
                  key={pack.id}
                  style={[styles.gemPack, pack.bestValue && styles.gemPackBest]}
                  onPress={() => purchaseProduct(pack.id)}
                  disabled={purchaseLoading}
                >
                  {pack.bestValue && (
                    <View style={styles.bestValueBadge}>
                      <Text style={styles.bestValueText}>{t('أفضل قيمة', 'Best Value')}</Text>
                    </View>
                  )}
                  <Text style={styles.gemPackEmoji}>💎</Text>
                  <Text style={styles.gemPackAmount}>{toArabicNumerals(pack.gems)}</Text>
                  {pack.bonus > 0 && (
                    <Text style={styles.gemPackBonus}>{isEnglish ? `+${pack.bonus} free` : `+${toArabicNumerals(pack.bonus)} مجاناً`}</Text>
                  )}
                  <Text style={styles.gemPackPrice}>{pack.price}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.gemNote}>{t('الجواهر تُستخدم للحصول على مظاهر حصرية', 'Gems are used to get exclusive cosmetics')}</Text>
          </>
        )}

        {/* ════════════ TAB 3: PROFILE COSMETICS ════════════ */}
        {tab === 'profile' && (
          <>
            {/* ── Section A: Profile Icons ── */}
            <Text style={styles.sectionTitle}>{t('الأيقونة', 'Icon')}</Text>

            {/* Rarity filter pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {([
                { id: 'all' as RarityFilter, label: t('الكل', 'All'), color: '#7C3AED', bg: 'rgba(124,58,237,0.15)' },
                { id: 'common' as RarityFilter, label: t('عادي', 'Common'), color: '#9CA3AF', bg: 'rgba(156,163,175,0.1)' },
                { id: 'rare' as RarityFilter, label: t('نادر', 'Rare'), color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
                { id: 'epic' as RarityFilter, label: t('ملحمي', 'Epic'), color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
                { id: 'legendary' as RarityFilter, label: t('أسطوري', 'Legendary'), color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
              ]).map(filter => {
                const isActive = rarityFilter === filter.id;
                return (
                  <TouchableOpacity
                    key={filter.id}
                    onPress={() => setRarityFilter(filter.id)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 99,
                      backgroundColor: isActive ? filter.bg : 'transparent',
                      borderWidth: 1,
                      borderColor: isActive ? filter.color : '#2D2D50',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    {filter.id !== 'all' && (
                      <View style={{
                        width: 8, height: 8, borderRadius: 4,
                        backgroundColor: filter.color,
                      }} />
                    )}
                    <Text style={{
                      fontSize: 13, fontWeight: '700',
                      color: isActive ? filter.color : '#9CA3AF',
                    }}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Icons grid — Discord-style */}
            <FlatList
              data={filteredIcons}
              numColumns={3}
              scrollEnabled={false}
              keyExtractor={item => item.id}
              columnWrapperStyle={{ gap: 10 }}
              contentContainerStyle={{ gap: 10, paddingBottom: 10 }}
              renderItem={({ item: icon }) => {
                const owned = cosmetics.isOwned('icon', icon.id);
                const active = cosmetics.activeIconId === icon.id;
                const rarity = RARITY_COLORS[icon.rarity];
                const isLegendary = icon.rarity === 'legendary';
                const isAchievement = icon.currency === 'achievement';

                return (
                  <TouchableOpacity
                    onPress={owned ? () => cosmetics.equip('icon', icon.id) : () => {
                      if (isAchievement) return;
                      if (icon.currency === 'gems') buyWithGems('icon', icon.id, icon.price);
                      else buyWithCoins('icon', icon.id, icon.price);
                    }}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      backgroundColor: '#1A1A2E',
                      borderRadius: 18,
                      padding: 14,
                      borderWidth: active ? 2 : 1,
                      borderColor: active ? '#7C3AED' : '#2D2D50',
                      position: 'relative',
                    }}
                    activeOpacity={0.8}
                  >
                    {/* DISCORD-STYLE AVATAR — user photo + icon badge */}
                    <View style={{ marginBottom: 8 }}>
                      <ProfileAvatar
                        size={56}
                        icon={icon.id}
                        username=""
                        borderType={cosmetics.activeBorderId || 'none'}
                        avatarUrl={user?.avatarUrl}
                        showRarityGlow={isLegendary}
                        showRarityBadge={false}
                      />

                      {/* Active checkmark overlay */}
                      {active && (
                        <View style={{
                          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                          borderRadius: 999, backgroundColor: 'rgba(124,58,237,0.45)',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900' }}>✓</Text>
                        </View>
                      )}
                    </View>

                    {/* Icon name */}
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF', textAlign: 'center' }}>
                      {icon.name}
                    </Text>

                    {/* Rarity pill */}
                    <View style={{
                      borderWidth: 1, borderColor: rarity.border, borderRadius: 6,
                      paddingHorizontal: 6, paddingVertical: 1, marginTop: 4,
                    }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: rarity.text }}>
                        {rarity.label}
                      </Text>
                    </View>

                    {/* Price or owned state */}
                    {isAchievement ? (
                      <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 6, textAlign: 'center' }}>
                        {t('🔒 إنجاز', '🔒 Achievement')}
                      </Text>
                    ) : owned ? (
                      <TouchableOpacity
                        onPress={() => cosmetics.equip('icon', icon.id)}
                        style={{
                          backgroundColor: active ? '#7C3AED' : '#1E2A5E',
                          borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6,
                          borderWidth: 1, borderColor: active ? '#7C3AED' : '#2D3A6E',
                          marginTop: 6,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFF' }}>
                          {active ? t('✓ مفعّل', '✓ Active') : t('تفعيل', 'Equip')}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => {
                          if (icon.currency === 'gems') buyWithGems('icon', icon.id, icon.price);
                          else buyWithCoins('icon', icon.id, icon.price);
                        }}
                        style={{
                          flexDirection: 'row', gap: 4, alignItems: 'center',
                          backgroundColor: icon.currency === 'gems'
                            ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.15)',
                          borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
                          borderWidth: 1,
                          borderColor: icon.currency === 'gems' ? '#3B82F6' : '#D97706',
                          marginTop: 6,
                        }}
                      >
                        <Text style={{ fontSize: 14 }}>
                          {icon.currency === 'gems' ? '💎' : '🪙'}
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: icon.currency === 'gems' ? '#93C5FD' : '#FDE68A' }}>
                          {toArabicNumerals(icon.price)}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              }}
            />

            {/* ── Section B: Avatar Borders ── */}
            <Text style={styles.sectionTitle}>{t('إطار الصورة', 'Avatar Border')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizScroll}>
              {AVATAR_BORDERS.map(border => {
                const owned = cosmetics.isOwned('border', border.id);
                const active = cosmetics.activeBorderId === border.id;

                return (
                  <View key={border.id} style={[styles.borderCard, active && styles.borderCardActive]}>
                    {/* Border preview */}
                    <View style={styles.borderPreview}>
                      <ProfileAvatar
                        size={40}
                        icon={cosmetics.activeIconId}
                        username=""
                        borderType={border.id}
                        showRarityGlow={false}
                      />
                    </View>
                    <Text style={styles.borderName}>{border.name}</Text>
                    {owned ? (
                      <Pressable
                        style={[styles.equipBtn, active && styles.equipBtnActive]}
                        onPress={() => cosmetics.equip('border', border.id)}
                      >
                        <Text style={styles.equipBtnText}>{active ? t('✓ مفعّل', '✓ Active') : t('تفعيل', 'Equip')}</Text>
                      </Pressable>
                    ) : border.currency === 'free' ? (
                      <Pressable style={styles.equipBtn} onPress={() => cosmetics.equip('border', border.id)}>
                        <Text style={styles.equipBtnText}>{t('مجاني', 'Free')}</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        style={[styles.buyBtn, styles.buyBtnGems]}
                        onPress={() => buyWithGems('border', border.id, border.price)}
                      >
                        <Text style={styles.buyBtnText}>💎 {toArabicNumerals(border.price)}</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            {/* ── Section C: Win Animations ── */}
            <Text style={styles.sectionTitle}>{t('مظهر الانتصار', 'Win Animation')}</Text>
            {/* Anime filter tabs */}
            <View style={styles.animeFilterRow}>
              <Pressable
                style={[styles.animeFilterTab, animeFilter === 'all' && styles.animeFilterTabActive]}
                onPress={() => setAnimeFilter('all')}
              >
                <Text style={[styles.animeFilterText, animeFilter === 'all' && styles.animeFilterTextActive]}>
                  {t('الكل', 'All')}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.animeFilterTab, animeFilter === 'anime' && styles.animeFilterTabActive]}
                onPress={() => setAnimeFilter('anime')}
              >
                <Text style={[styles.animeFilterText, animeFilter === 'anime' && styles.animeFilterTextActive]}>
                  {t('أنمي ✨', 'Anime ✨')}
                </Text>
              </Pressable>
            </View>
            <View style={styles.iconsGrid}>
              {WIN_ANIMATIONS
                .filter(anim => animeFilter === 'all' ? true : !!anim.anime)
                .map(anim => {
                const owned = cosmetics.isOwned('winAnimation', anim.id);
                const active = cosmetics.activeWinAnimationId === anim.id;
                const rarity = anim.rarity ? RARITY_COLORS[anim.rarity] : null;

                return (
                  <View key={anim.id} style={[
                    styles.animCard,
                    active && { borderColor: COLORS.PURPLE },
                    rarity && { borderColor: rarity.border },
                  ]}>
                    <Pressable onPress={() => setPreviewAnim(anim.id)}>
                      <Text style={styles.animPreview}>{anim.preview}</Text>
                    </Pressable>
                    <Text style={styles.animName}>{isEnglish && anim.nameEn ? anim.nameEn : anim.name}</Text>
                    {anim.anime && (
                      <View style={[styles.animeBadge, rarity && { borderColor: rarity.border }]}>
                        <Text style={[styles.animeBadgeText, rarity && { color: rarity.text }]}>{anim.anime}</Text>
                      </View>
                    )}
                    {rarity && (
                      <View style={[styles.rarityBadge, { borderColor: rarity.border }]}>
                        <Text style={[styles.rarityText, { color: rarity.text }]}>{rarity.label}</Text>
                      </View>
                    )}
                    <Text style={styles.animTap}>{t('اضغط للمعاينة', 'Tap to preview')}</Text>
                    {owned ? (
                      <Pressable
                        style={[styles.equipBtn, active && styles.equipBtnActive]}
                        onPress={() => cosmetics.equip('winAnimation', anim.id)}
                      >
                        <Text style={styles.equipBtnText}>{active ? t('✓ مفعّل', '✓ Active') : t('تفعيل', 'Equip')}</Text>
                      </Pressable>
                    ) : anim.currency === 'free' ? (
                      <Pressable style={styles.equipBtn} onPress={() => cosmetics.equip('winAnimation', anim.id)}>
                        <Text style={styles.equipBtnText}>{t('مجاني', 'Free')}</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        style={[styles.buyBtn, styles.buyBtnGems]}
                        onPress={() => buyWithGems('winAnimation', anim.id, anim.price)}
                      >
                        <Text style={styles.buyBtnText}>💎 {isEnglish ? anim.price : toArabicNumerals(anim.price)}</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>

            {/* ── Existing cosmetics (themes, tiles, keyboards) ── */}
            {/* ── Section D: Profile Backgrounds ── */}
            <Text style={styles.sectionTitle}>{t('خلفية الملف الشخصي', 'Profile Background')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizScroll}>
              {PROFILE_BG_THEMES.map(bg => {
                const owned = cosmetics.isOwned('profileBg', bg.id);
                const active = cosmetics.activeProfileBgId === bg.id;
                const rarity = bg.rarity ? RARITY_COLORS[bg.rarity] : RARITY_COLORS.common;

                return (
                  <View key={bg.id} style={[styles.bgCard, active && { borderColor: COLORS.PURPLE }]}>
                    <View style={[styles.bgPreview, { backgroundColor: rarity.bg }]}>
                      <Text style={{ fontSize: 32 }}>{bg.emoji}</Text>
                    </View>
                    <Text style={styles.bgName}>{bg.name}</Text>
                    {bg.rarity !== 'common' && (
                      <View style={[styles.rarityBadge, { borderColor: rarity.border }]}>
                        <Text style={[styles.rarityText, { color: rarity.text }]}>{rarity.label}</Text>
                      </View>
                    )}
                    {owned ? (
                      <Pressable
                        style={[styles.equipBtn, active && styles.equipBtnActive]}
                        onPress={() => cosmetics.equip('profileBg', bg.id)}
                      >
                        <Text style={styles.equipBtnText}>{active ? t('✓ مفعّل', '✓ Active') : t('تفعيل', 'Equip')}</Text>
                      </Pressable>
                    ) : bg.currency === 'free' ? (
                      <Pressable style={styles.equipBtn} onPress={() => cosmetics.equip('profileBg', bg.id)}>
                        <Text style={styles.equipBtnText}>{t('مجاني', 'Free')}</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        style={[styles.buyBtn, styles.buyBtnGems]}
                        onPress={() => buyWithGems('profileBg' as any, bg.id, bg.price)}
                      >
                        <Text style={styles.buyBtnText}>💎 {toArabicNumerals(bg.price)}</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionTitle}>{t('ثيمات اللوحة', 'Board Themes')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizScroll}>
              {THEMES.map(theme => {
                const owned = cosmetics.isOwned('theme', theme.id);
                const active = cosmetics.activeThemeId === theme.id;
                return (
                  <View key={theme.id} style={[styles.cosCard, active && styles.cosCardActive]}>
                    <View style={[styles.miniBoard, { backgroundColor: theme.colors.background }]}>
                      {PREVIEW_GRID.map((row, ri) => (
                        <View key={ri} style={styles.miniRow}>
                          {row.map((state, ci) => (
                            <View key={ci} style={[
                              styles.miniCell,
                              { backgroundColor: RESULT_COLORS[state], borderColor: theme.colors.emptyBorder },
                            ]} />
                          ))}
                        </View>
                      ))}
                    </View>
                    <Text style={styles.cosName}>{theme.name}</Text>
                    {owned ? (
                      <Pressable
                        style={[styles.equipBtn, active && styles.equipBtnActive]}
                        onPress={() => cosmetics.equip('theme', theme.id)}
                      >
                        <Text style={styles.equipBtnText}>{active ? t('✓ مفعّل', '✓ Active') : t('تفعيل', 'Equip')}</Text>
                      </Pressable>
                    ) : (
                      <Pressable style={[styles.buyBtn, styles.buyBtnCoins]} onPress={() => buyWithCoins('theme', theme.id, theme.price)}>
                        <Text style={styles.buyBtnText}>🪙 {toArabicNumerals(theme.price)}</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionTitle}>{t('شكل الخانات', 'Tile Styles')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizScroll}>
              {TILE_STYLES.map(tile => {
                const owned = cosmetics.isOwned('tile', tile.id);
                const active = cosmetics.activeTileId === tile.id;
                return (
                  <View key={tile.id} style={[styles.cosCard, active && styles.cosCardActive]}>
                    <View style={styles.tilePreview}>
                      <View style={[
                        styles.tileCell,
                        { backgroundColor: tile.correctColor || '#22C55E' },
                        tile.borderRadius ? { borderRadius: 20 } : {},
                        tile.glowEffect ? { shadowColor: '#22C55E', shadowOpacity: 0.8, shadowRadius: 8, elevation: 6 } : {},
                        tile.opacity ? { opacity: tile.opacity } : {},
                      ]}>
                        <Text style={styles.tileCellText}>ك</Text>
                      </View>
                      <View style={[styles.tileCell, { backgroundColor: '#F59E0B' },
                        tile.borderRadius ? { borderRadius: 20 } : {},
                      ]}>
                        <Text style={styles.tileCellText}>ت</Text>
                      </View>
                    </View>
                    <Text style={styles.cosName}>{tile.name}</Text>
                    {owned ? (
                      <Pressable
                        style={[styles.equipBtn, active && styles.equipBtnActive]}
                        onPress={() => cosmetics.equip('tile', tile.id)}
                      >
                        <Text style={styles.equipBtnText}>{active ? t('✓ مفعّل', '✓ Active') : t('تفعيل', 'Equip')}</Text>
                      </Pressable>
                    ) : (
                      <Pressable style={[styles.buyBtn, styles.buyBtnCoins]} onPress={() => buyWithCoins('tile', tile.id, tile.price)}>
                        <Text style={styles.buyBtnText}>🪙 {toArabicNumerals(tile.price)}</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionTitle}>{t('لوحة المفاتيح', 'Keyboard')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizScroll}>
              {KEYBOARD_SKINS.map(skin => {
                const owned = cosmetics.isOwned('keyboard', skin.id);
                const active = cosmetics.activeKeyboardId === skin.id;
                return (
                  <View key={skin.id} style={[styles.cosCard, active && styles.cosCardActive]}>
                    <View style={styles.kbPreview}>
                      {['ك', 'ل', 'م'].map(letter => (
                        <View key={letter} style={[styles.kbKey, {
                          backgroundColor: skin.keyBg,
                          borderColor: skin.keyBorder,
                          borderRadius: skin.keyRadius,
                        }]}>
                          <Text style={[styles.kbKeyText, { color: skin.keyTextColor }]}>{letter}</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={styles.cosName}>{skin.name}</Text>
                    {owned ? (
                      <Pressable
                        style={[styles.equipBtn, active && styles.equipBtnActive]}
                        onPress={() => cosmetics.equip('keyboard', skin.id)}
                      >
                        <Text style={styles.equipBtnText}>{active ? t('✓ مفعّل', '✓ Active') : t('تفعيل', 'Equip')}</Text>
                      </Pressable>
                    ) : (
                      <Pressable style={[styles.buyBtn, styles.buyBtnCoins]} onPress={() => buyWithCoins('keyboard', skin.id, skin.price)}>
                        <Text style={styles.buyBtnText}>🪙 {toArabicNumerals(skin.price)}</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* ════════════ TAB 4: PLUS & ELITE ════════════ */}
        {tab === 'plus' && (
          <>
            {/* Elite Card */}
            <View style={[styles.plusCard, { borderColor: '#F59E0B', position: 'relative' }]}>
              <View style={{
                position: 'absolute', top: -12, alignSelf: 'center',
                backgroundColor: '#F59E0B', borderRadius: 10,
                paddingHorizontal: 14, paddingVertical: 4,
              }}>
                <Text style={{ color: '#000', fontSize: 12, fontWeight: '800' }}>
                  {t('👑 الأفضل', '👑 Best Value')}
                </Text>
              </View>

              <Text style={[styles.plusTitle, { color: '#F59E0B', marginTop: 8 }]}>Kalimat Elite</Text>
              <Text style={styles.plusPrice}>{t('4.99$ / شهر', '$4.99 / month')}</Text>

              <View style={styles.plusFeatures}>
                <Text style={styles.feature}>{t('🥇 اسم ذهبي متوهج في المتصدرين والمبارزات', '🥇 Glowing gold username on leaderboards and in duels')}</Text>
                <Text style={styles.feature}>{t('⚡ وصول مبكر للأوضاع الجديدة — أسبوعين قبل الجميع', '⚡ Early access to new modes — 2 weeks before everyone')}</Text>
                <Text style={styles.feature}>{t('💎 80 جوهرة كل شهر تلقائياً', '💎 80 gems every month automatically')}</Text>
                <Text style={styles.feature}>{t('👑 شارة Elite حصرية بجانب اسمك', '👑 Exclusive Elite badge next to your name')}</Text>
              </View>

              <Text style={{ color: '#22C55E', fontSize: 13, textAlign: 'center', marginTop: 4 }}>
                {t('✓ يشمل كل مميزات كلمات بلس', '✓ Includes all Kalimat Plus benefits')}
              </Text>

              <Pressable
                style={[styles.subscribeButton, { backgroundColor: '#F59E0B' }]}
                onPress={() => purchaseProduct(PRODUCTS.ELITE_MONTHLY)}
                disabled={purchaseLoading}
              >
                <Text style={[styles.subscribeText, { color: '#000' }]}>
                  {t('اشترك في Elite 👑', 'Subscribe to Elite 👑')}
                </Text>
              </Pressable>
            </View>

            <View style={styles.plusCard}>
              <Text style={styles.plusTitle}>{t('كلمات بلس 👑', 'Kalimat Plus 👑')}</Text>
              <Text style={styles.plusPrice}>{t('3.99$ / شهر', '$3.99 / month')}</Text>
              <View style={styles.plusFeatures}>
                <Text style={styles.feature}>{t('✓ بدون إعلانات', '✓ No ads')}</Text>
                <Text style={styles.feature}>{t('✓ تلميحات غير محدودة', '✓ Unlimited hints')}</Text>
                <Text style={styles.feature}>{t('✓ ثيمات حصرية', '✓ Exclusive themes')}</Text>
                <Text style={styles.feature}>{t('✓ أولوية في المطابقة', '✓ Priority matchmaking')}</Text>
                <Text style={styles.feature}>{t('✓ دخول مجاني للمسابقات', '✓ Free tournament entry')}</Text>
                <Text style={styles.feature}>{t('✓ +2 عملات إضافية لكل لعبة', '✓ +2 bonus coins per game')}</Text>
              </View>
              <Pressable
                style={styles.subscribeButton}
                onPress={() => purchaseProduct(PRODUCTS.PLUS_MONTHLY)}
                disabled={purchaseLoading}
              >
                <Text style={styles.subscribeText}>{t(AR.plus_subscribe, 'Subscribe')}</Text>
              </Pressable>
            </View>

            {/* Remove ads */}
            <Pressable
              style={styles.removeAdsCard}
              onPress={() => purchaseProduct(PRODUCTS.REMOVE_ADS)}
              disabled={purchaseLoading}
            >
              <Text style={styles.removeAdsTitle}>{t('إزالة الإعلانات للأبد', 'Remove Ads Forever')}</Text>
              <Text style={styles.removeAdsPrice}>2.99$</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {/* Win animation preview modal */}
      {previewAnim && (
        <Modal transparent visible animationType="fade">
          <Pressable style={styles.previewOverlay} onPress={() => setPreviewAnim(null)}>
            <WinAnimationPlayer animationId={previewAnim} onDone={() => setTimeout(() => setPreviewAnim(null), 500)} />
            <Text style={styles.previewDismiss}>{t('اضغط للإغلاق', 'Tap to close')}</Text>
          </Pressable>
        </Modal>
      )}

      {/* Toast */}
      {toast !== '' && (
        <View style={[styles.toastBar, toastType === 'error' && styles.toastError]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.PRIMARY_BG },

  // Header
  headerRow: {
    flexDirection: 'row-reverse', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#1E1E3A',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1A1040', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#7C3AED40',
  },
  backArrow: { fontSize: 22, color: '#A78BFA', fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '800', color: '#FFF', marginRight: 12 },

  // Currency bar
  currencyBar: {
    flexDirection: 'row-reverse', alignItems: 'center',
    marginRight: 'auto' as any, gap: 12,
  },
  currencyItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  currencyIcon: { fontSize: 18 },
  currencyAmount: { fontSize: 18, fontWeight: '900', color: COLORS.GOLD },
  currencyDivider: { width: 1, height: 20, backgroundColor: '#2D2D50' },

  // Tabs
  tabsRow: {
    flexDirection: 'row-reverse', paddingHorizontal: 12, gap: 8,
    marginVertical: 10,
  },
  tab: {
    flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: 14,
    backgroundColor: COLORS.CARD_BG,
  },
  tabEmoji: { fontSize: 14 },
  tabText: { fontSize: 13, fontWeight: '700', color: COLORS.TEXT_SECONDARY },
  tabTextActive: { color: '#FFF' },

  content: { padding: 16, gap: 16, paddingBottom: 40 },

  // Big balance
  bigBalanceCard: {
    alignItems: 'center', gap: 8, padding: 24,
    backgroundColor: COLORS.CARD_BG, borderRadius: 20,
    borderWidth: 2, borderColor: COLORS.GOLD,
  },
  bigBalanceEmoji: { fontSize: 48 },
  bigBalanceNum: { fontSize: 40, fontWeight: '900', color: COLORS.GOLD },
  bigBalanceLabel: { fontSize: 16, color: COLORS.TEXT_SECONDARY },

  // Earn info
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  earnCard: {
    backgroundColor: COLORS.CARD_BG, borderRadius: 16, padding: 16, gap: 10,
  },
  earnRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
  },
  earnEmoji: { fontSize: 18, width: 28, textAlign: 'center' },
  earnLabel: { flex: 1, fontSize: 14, color: COLORS.TEXT_SECONDARY, textAlign: 'right' },
  earnAmount: { fontSize: 14, fontWeight: '800', color: COLORS.GOLD },
  noSaleNote: {
    fontSize: 13, color: COLORS.TEXT_SECONDARY, textAlign: 'center',
    fontStyle: 'italic', marginTop: 4,
  },

  // Gem packs
  gemPacksContainer: { gap: 10 },
  gemPack: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.CARD_BG, borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  gemPackBest: { borderColor: '#7C3AED' },
  bestValueBadge: {
    position: 'absolute', top: -8, left: 12,
    backgroundColor: '#7C3AED', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  bestValueText: { fontSize: 11, fontWeight: '800', color: '#FFF' },
  gemPackEmoji: { fontSize: 28 },
  gemPackAmount: { fontSize: 20, fontWeight: '900', color: '#FFF', flex: 1, textAlign: 'right' },
  gemPackBonus: { fontSize: 12, fontWeight: '700', color: '#22C55E' },
  gemPackPrice: { fontSize: 16, fontWeight: '800', color: '#A78BFA' },
  gemNote: {
    fontSize: 13, color: COLORS.TEXT_SECONDARY, textAlign: 'center', marginTop: 4,
  },

  // Filter
  filterRow: { flexDirection: 'row-reverse', gap: 8, paddingVertical: 8 },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10,
    backgroundColor: COLORS.CARD_BG, borderWidth: 1, borderColor: '#374151',
  },
  filterBtnActive: { backgroundColor: COLORS.PURPLE, borderColor: COLORS.PURPLE },
  filterText: { fontSize: 13, fontWeight: '700', color: COLORS.TEXT_SECONDARY },
  filterTextActive: { color: '#FFF' },

  // Icons grid
  iconsGrid: {
    flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10,
  },
  iconCard: {
    width: '31%', borderRadius: 16, padding: 12, alignItems: 'center', gap: 6,
    borderWidth: 2, borderColor: 'transparent',
  },
  iconEmoji: { fontSize: 32 },
  iconName: { fontSize: 12, fontWeight: '700' },
  rarityBadge: {
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1,
  },
  rarityText: { fontSize: 9, fontWeight: '700' },
  achievementLock: { alignItems: 'center' },
  achievementText: { fontSize: 9, color: '#6B7280', textAlign: 'center' },

  // Equip / buy buttons
  equipBtn: {
    backgroundColor: '#1E2A5E', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6,
  },
  equipBtnActive: { backgroundColor: COLORS.PURPLE },
  equipBtnText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  buyBtn: {
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6,
  },
  buyBtnCoins: { backgroundColor: '#854D0E' },
  buyBtnGems: { backgroundColor: '#4C1D95' },
  buyBtnText: { fontSize: 12, fontWeight: '800', color: '#FDE68A' },

  // Border cards
  borderCard: {
    width: 130, backgroundColor: COLORS.CARD_BG, borderRadius: 16,
    padding: 12, alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  borderCardActive: { borderColor: COLORS.PURPLE },
  borderPreview: {
    width: 64, height: 64, alignItems: 'center', justifyContent: 'center',
  },
  borderPreviewInner: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center',
  },
  borderName: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  // Animation cards
  animCard: {
    width: '31%', backgroundColor: COLORS.CARD_BG, borderRadius: 16,
    padding: 12, alignItems: 'center', gap: 6,
    borderWidth: 2, borderColor: 'transparent',
  },
  animPreview: { fontSize: 36 },
  animName: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  animTap: { fontSize: 9, color: COLORS.TEXT_SECONDARY },
  animeFilterRow: {
    flexDirection: 'row', gap: 8, marginBottom: 12, justifyContent: 'center',
  },
  animeFilterTab: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  animeFilterTabActive: {
    borderColor: COLORS.PURPLE, backgroundColor: 'rgba(124,58,237,0.2)',
  },
  animeFilterText: {
    fontSize: 13, fontWeight: '700', color: COLORS.TEXT_SECONDARY,
  },
  animeFilterTextActive: {
    color: '#C4B5FD',
  },
  animeBadge: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  animeBadgeText: {
    fontSize: 8, fontWeight: '800', color: COLORS.TEXT_SECONDARY,
  },

  // Profile background cards
  bgCard: {
    width: 140, backgroundColor: COLORS.CARD_BG, borderRadius: 16,
    padding: 12, alignItems: 'center', gap: 6,
    borderWidth: 2, borderColor: 'transparent',
  },
  bgPreview: {
    width: 110, height: 70, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  bgName: { fontSize: 12, fontWeight: '700', color: '#FFF', textAlign: 'center' },

  // Existing cosmetic cards
  horizScroll: { gap: 12, paddingVertical: 8, paddingHorizontal: 4 },
  cosCard: {
    width: 130, backgroundColor: COLORS.CARD_BG, borderRadius: 16,
    padding: 12, alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  cosCardActive: { borderColor: COLORS.PURPLE },
  cosName: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  // Mini board preview
  miniBoard: { width: 100, height: 60, borderRadius: 8, padding: 4, justifyContent: 'center', gap: 3 },
  miniRow: { flexDirection: 'row', justifyContent: 'center', gap: 3 },
  miniCell: { width: 18, height: 14, borderRadius: 3, borderWidth: 1 },

  // Tile preview
  tilePreview: { flexDirection: 'row', gap: 8 },
  tileCell: {
    width: 40, height: 44, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  tileCellText: { fontSize: 20, fontWeight: '900', color: '#FFF' },

  // Keyboard preview
  kbPreview: { flexDirection: 'row', gap: 4 },
  kbKey: {
    width: 30, height: 34, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  kbKeyText: { fontSize: 16, fontWeight: '700' },

  // Plus card
  plusCard: {
    backgroundColor: `${COLORS.PURPLE}15`, borderRadius: 20, padding: 24,
    alignItems: 'center', gap: 12, borderWidth: 2, borderColor: COLORS.PURPLE,
  },
  plusTitle: { fontSize: 24, fontWeight: '800', color: COLORS.PURPLE },
  plusPrice: { fontSize: 18, color: '#FFF' },
  plusFeatures: { gap: 8, alignSelf: 'stretch' },
  feature: { fontSize: 16, color: '#FFF', textAlign: 'right' },
  subscribeButton: {
    backgroundColor: COLORS.PURPLE, borderRadius: 14, paddingVertical: 14,
    paddingHorizontal: 40, marginTop: 8,
  },
  subscribeText: { color: '#FFF', fontSize: 18, fontWeight: '800' },

  // Remove ads
  removeAdsCard: {
    backgroundColor: COLORS.CARD_BG, borderRadius: 16, padding: 18,
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
  },
  removeAdsTitle: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  removeAdsPrice: { fontSize: 16, fontWeight: '800', color: COLORS.GOLD },

  // Preview
  previewOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
  previewDismiss: { color: '#FFF', fontSize: 16, marginTop: 40 },

  // Toast
  toastBar: {
    position: 'absolute', bottom: 40, left: 20, right: 20,
    backgroundColor: '#22C55E', borderRadius: 14, padding: 14, alignItems: 'center',
  },
  toastError: { backgroundColor: '#EF4444' },
  toastText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
