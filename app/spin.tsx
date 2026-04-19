import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Easing,
  ScrollView, Dimensions, Pressable, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { COLORS } from '../src/lib/constants';
import { useUserStore } from '../src/store/userStore';
import { supabase } from '../src/lib/supabase';
import { useTicketStore, type SpinHistoryEntry } from '../src/store/ticketStore';
import { useCosmeticStore } from '../src/store/cosmeticStore';
import { adManager } from '../src/lib/AdManager';
import { toArabicNumerals } from '../src/engine/ShareCard';
import {
  TICKET_TYPES, type TicketTier, type Prize, type Rarity,
  getPrizesForTier, determineWinner, getSpinCost, getTicketType,
  getPrizeDescription, RARITY_COLORS,
} from '../src/lib/gacha';
import { useLanguage } from '../src/lib/LanguageContext';

const { width: W } = Dimensions.get('window');
const WHEEL_SIZE = W - 80;

// ─── MAIN SCREEN ───
export default function SpinScreen() {
  const { user, updateCoins, updateGems } = useUserStore();
  const tickets = useTicketStore();
  const cosmetics = useCosmeticStore();
  const { theme: cosTheme } = cosmetics;
  const { t, isEnglish } = useLanguage();

  const [tab, setTab] = useState<'spin' | 'history'>('spin');
  const [selectedTier, setSelectedTier] = useState<TicketTier | null>(null);
  const [spinResult, setSpinResult] = useState<Prize | null>(null);
  const [adLoading, setAdLoading] = useState(false);

  useEffect(() => {
    if (!tickets.loaded) tickets.load();
  }, []);

  function handleSpinResult(prize: Prize) {
    // Apply reward
    const r = prize.reward;
    switch (r.type) {
      case 'coins':
        updateCoins(r.amount!);
        supabase.rpc('add_coins', { amount: r.amount!, reason: 'daily_reward' }).then(() => {});
        break;
      case 'gems':
        updateGems(r.amount!);
        supabase.rpc('add_gems', { amount: r.amount!, reason: 'streak_milestone' }).then(() => {});
        break;
      case 'bronze_tickets':
        tickets.addTickets('bronze', r.amount!);
        break;
      case 'silver_tickets':
        tickets.addTickets('silver', r.amount!);
        break;
      case 'golden_tickets':
        tickets.addTickets('golden', r.amount!);
        break;
      case 'icon':
        cosmetics.addOwned('icon', r.id!);
        break;
      case 'border':
        cosmetics.addOwned('border', r.id!);
        break;
      case 'theme':
        cosmetics.addOwned('theme', r.id!);
        break;
      case 'tile_style':
        cosmetics.addOwned('tile', r.id!);
        break;
      case 'win_animation':
        cosmetics.addOwned('winAnimation', r.id!);
        break;
    }

    // Record history
    const entry: SpinHistoryEntry = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      tier: selectedTier!,
      prizeId: prize.id,
      prizeName: prize.name,
      prizeEmoji: prize.emoji,
      prizeRarity: prize.rarity,
      rewardType: r.type,
      rewardAmount: r.amount,
      rewardItemId: r.id,
      createdAt: new Date().toISOString(),
    };
    tickets.addSpinHistory(entry);
    setSpinResult(prize);
  }

  async function handleWatchAd() {
    if (adLoading) return;
    setAdLoading(true);
    const earned = await adManager.showRewarded();
    setAdLoading(false);
    if (earned) {
      tickets.addTickets('bronze', 2);
      tickets.incrementAdsToday();
      // Bonus golden ticket at 5 ads
      if (tickets.adsWatchedToday === 4) {
        // This was the 5th ad (incremented above from 4→5)
        setTimeout(() => tickets.addTickets('golden', 1), 500);
      }
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: cosTheme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { [isEnglish ? 'left' : 'right']: 16 }]}>
          <Text style={styles.backText}>{isEnglish ? '‹' : '›'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerEyebrow}>{t('عجلة الحظ', 'LUCKY WHEEL')}</Text>
        <Text style={styles.headerTitle}>{t('أدر واربح', 'Spin & Win')}</Text>
        <View style={styles.headerAccent} />
        <View style={[styles.ticketBarRow, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
          <TicketBadge tier="bronze" count={tickets.bronze} />
          <TicketBadge tier="silver" count={tickets.silver} />
          <TicketBadge tier="golden" count={tickets.golden} />
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'spin' && styles.tabBtnActive]}
          onPress={() => setTab('spin')}
        >
          <Text style={[styles.tabText, tab === 'spin' && styles.tabTextActive]}>{t('🎡 الدوران', 'Spin')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'history' && styles.tabBtnActive]}
          onPress={() => setTab('history')}
        >
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>{t('📜 السجل', 'History')}</Text>
        </TouchableOpacity>
      </View>

      {tab === 'spin' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {selectedTier ? (
            <SpinWheel
              tier={selectedTier}
              tickets={tickets}
              onResult={handleSpinResult}
              onBack={() => setSelectedTier(null)}
            />
          ) : (
            <>
              <SpinSelector
                tickets={tickets}
                onSelect={setSelectedTier}
              />

              {/* Earn Tickets Section */}
              <View style={styles.earnSection}>
                <View style={[styles.earnHeader, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
                  <View style={[styles.earnIconWrap]}>
                    <Text style={styles.earnHeaderIcon}>🎁</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.earnTitle, { textAlign: isEnglish ? 'left' : 'right' }]}>{t('احصل على تذاكر مجانية', 'Earn Free Tickets')}</Text>
                    <Text style={[styles.earnSubtitle, { textAlign: isEnglish ? 'left' : 'right' }]}>{t('شاهد الإعلانات لتربح تذاكر', 'Watch ads to earn tickets daily')}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.adBtn, { flexDirection: isEnglish ? 'row' : 'row-reverse' }, adLoading && styles.adBtnLoading]}
                  onPress={handleWatchAd}
                  disabled={adLoading || !adManager.isRewardedReady()}
                  activeOpacity={0.85}
                >
                  <Text style={styles.adBtnIcon}>{adLoading ? '⏳' : '📺'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.adBtnText, { textAlign: 'center' }]}>
                      {adLoading ? t('جاري التحميل...', 'Loading...') : t('شاهد إعلاناً', 'Watch an Ad')}
                    </Text>
                    {!adLoading && (
                      <Text style={styles.adBtnSub}>{t('🎫 تذكرتان برونزيتان', '🎫 +2 Bronze Tickets')}</Text>
                    )}
                  </View>
                  <Text style={styles.adBtnChevron}>{isEnglish ? '›' : '‹'}</Text>
                </TouchableOpacity>

                {tickets.adsWatchedToday >= 4 && (
                  <View style={[styles.goldenHint, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
                    <Text style={{ fontSize: 28 }}>🏮</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.goldenHintTitle, { textAlign: isEnglish ? 'left' : 'right' }]}>{t('إعلان أخير للحصول على تذكرة ذهبية!', 'One more ad for a golden ticket!')}</Text>
                      <Text style={[styles.goldenHintSub, { textAlign: isEnglish ? 'left' : 'right' }]}>
                        {isEnglish
                          ? `Watched ${tickets.adsWatchedToday}/5 ads today`
                          : `شاهدت ${toArabicNumerals(tickets.adsWatchedToday)}/٥ إعلانات اليوم`}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.adProgress}>
                  <View style={[styles.adProgressHeader, { flexDirection: isEnglish ? 'row' : 'row-reverse' }]}>
                    <Text style={styles.adProgressLabel}>{t('التقدم اليومي', 'Daily Progress')}</Text>
                    <Text style={styles.adProgressCount}>
                      {isEnglish
                        ? `${tickets.adsWatchedToday}/5`
                        : `${toArabicNumerals(tickets.adsWatchedToday)}/٥`}
                    </Text>
                  </View>
                  <View style={styles.adProgressBar}>
                    <View style={[styles.adProgressFill, { width: `${Math.min(100, (tickets.adsWatchedToday / 5) * 100)}%` }]} />
                  </View>
                  <Text style={[styles.adProgressText, { textAlign: isEnglish ? 'left' : 'right' }]}>
                    {isEnglish
                      ? `${5 - tickets.adsWatchedToday} ads left to unlock 🏮 golden ticket`
                      : `${toArabicNumerals(5 - tickets.adsWatchedToday)} إعلانات متبقية لفتح 🏮 التذكرة الذهبية`}
                  </Text>
                </View>
              </View>
            </>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      ) : (
        <SpinHistoryTab history={tickets.spinHistory} />
      )}

      {/* Prize Reveal Modal */}
      {spinResult && (
        <PrizeReveal
          prize={spinResult}
          onClose={() => setSpinResult(null)}
        />
      )}
    </View>
  );
}

// ─── TICKET BADGE ───
function TicketBadge({ tier, count }: { tier: TicketTier; count: number }) {
  const t = getTicketType(tier);
  return (
    <View style={[styles.ticketBadge, { backgroundColor: t.bgColor, borderColor: t.borderColor }]}>
      <Text style={{ fontSize: 12 }}>{t.emoji}</Text>
      <Text style={[styles.ticketCount, { color: t.borderColor }]}>{toArabicNumerals(count)}</Text>
    </View>
  );
}

// ─── SPIN SELECTOR ───
function SpinSelector({ tickets, onSelect }: { tickets: any; onSelect: (t: TicketTier) => void }) {
  const { t: tr, isEnglish: isEn } = useLanguage();
  const tiers: { tier: TicketTier; icon: string; name: string; desc: string; rarities: { label: string; color: string; pct: string }[] }[] = [
    {
      tier: 'bronze', icon: '🎡', name: isEn ? 'Normal Spin' : 'الدوران العادي',
      desc: isEn ? 'Coins · Small boosts · Common cosmetics' : 'عملات · قوى صغيرة · مظاهر عادية',
      rarities: [
        { label: isEn ? 'Common 60%' : 'عادي 60%', color: '#22C55E', pct: '60' },
        { label: isEn ? 'Rare 30%' : 'نادر 30%', color: '#3B82F6', pct: '30' },
        { label: isEn ? 'Epic 10%' : 'ملحمي 10%', color: '#7C3AED', pct: '10' },
      ],
    },
    {
      tier: 'silver', icon: '🎰', name: isEn ? 'Rare Spin' : 'الدوران النادر',
      desc: isEn ? 'Gems · Rare cosmetics · Many coins' : 'جواهر · مظاهر نادرة · عملات كثيرة',
      rarities: [
        { label: isEn ? 'Rare 50%' : 'نادر 50%', color: '#3B82F6', pct: '50' },
        { label: isEn ? 'Epic 35%' : 'ملحمي 35%', color: '#7C3AED', pct: '35' },
        { label: isEn ? 'Legendary 15%' : 'أسطوري 15%', color: '#F59E0B', pct: '15' },
      ],
    },
    {
      tier: 'golden', icon: '🌟', name: isEn ? 'Legendary Spin' : 'الدوران الأسطوري',
      desc: isEn ? 'Exclusive icons · Animated borders · Many gems' : 'أيقونات حصرية · إطارات متحركة · جواهر كثيرة',
      rarities: [
        { label: isEn ? 'Epic 50%' : 'ملحمي 50%', color: '#7C3AED', pct: '50' },
        { label: isEn ? 'Legendary 40%' : 'أسطوري 40%', color: '#F59E0B', pct: '40' },
        { label: isEn ? 'Exclusive 10%' : 'حصري 10%', color: '#EC4899', pct: '10' },
      ],
    },
  ];

  const rowDir = isEn ? 'row' : 'row-reverse';
  const textAlign = isEn ? 'left' : 'right';

  return (
    <View style={{ gap: 14 }}>
      <View style={[styles.selectorHeader, { flexDirection: rowDir }]}>
        <Text style={[styles.selectorTitle, { textAlign }]}>{isEn ? 'Choose your spin' : 'اختر نوع الدوران'}</Text>
        <Text style={styles.selectorHint}>{isEn ? `${tiers.length} tiers` : `${toArabicNumerals(tiers.length)} مستويات`}</Text>
      </View>
      {tiers.map((t) => {
        const tt = getTicketType(t.tier);
        const cost = tt.spinCost;
        const hasEnough = tickets[t.tier] >= cost;
        return (
          <TouchableOpacity
            key={t.tier}
            style={[
              styles.spinCard,
              { flexDirection: rowDir, backgroundColor: tt.bgColor, borderColor: tt.borderColor, opacity: hasEnough ? 1 : 0.55 },
            ]}
            onPress={() => hasEnough && onSelect(t.tier)}
            activeOpacity={0.85}
            disabled={!hasEnough}
          >
            <View style={[styles.cardIconWrap, { borderColor: tt.borderColor + '40' }]}>
              <Text style={styles.cardIcon}>{t.icon}</Text>
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 8 }}>
                <Text style={[styles.spinCardName, { color: tt.borderColor, textAlign }]}>{t.name}</Text>
                {t.tier === 'golden' && (
                  <View style={styles.exclusiveBadge}>
                    <Text style={styles.exclusiveBadgeText}>{isEn ? 'EXCLUSIVE' : 'حصري'}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.spinCardDesc, { textAlign }]}>{t.desc}</Text>
              <View style={{ flexDirection: rowDir, gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                {t.rarities.map((r) => (
                  <View key={r.label} style={[styles.rarityPill, { backgroundColor: r.color + '1A', borderColor: r.color + '55' }]}>
                    <View style={[styles.rarityDot, { backgroundColor: r.color }]} />
                    <Text style={[styles.rarityPillText, { color: r.color }]}>{r.label}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={[styles.costBadge, { borderColor: tt.borderColor + '40', backgroundColor: '#0D0730AA' }]}>
              <Text style={styles.costLabel}>{isEn ? 'COST' : 'تكلفة'}</Text>
              <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 3 }}>
                <Text style={[styles.costNum, { color: tt.borderColor }]}>{toArabicNumerals(cost)}</Text>
                <Text style={styles.costEmoji}>{tt.emoji}</Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── SPIN WHEEL ───
function SpinWheel({ tier, tickets, onResult, onBack }: {
  tier: TicketTier; tickets: any; onResult: (p: Prize) => void; onBack: () => void;
}) {
  const { t, isEnglish } = useLanguage();
  const rotation = useRef(new Animated.Value(0)).current;
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const prizes = getPrizesForTier(tier);
  const tt = getTicketType(tier);
  const cost = getSpinCost(tier);

  const sectionColors: Record<Rarity, string[]> = {
    common:    ['#1A3A1A', '#1F4A1F'],
    rare:      ['#1A2A5E', '#1E3070'],
    epic:      ['#2D1B69', '#361E7A'],
    legendary: ['#3D1A00', '#4A2000'],
    exclusive: ['#3D0020', '#4A0028'],
  };

  function spin() {
    if (isSpinning) return;
    if (!tickets.spendTickets(tier, cost)) return;

    setIsSpinning(true);
    const winner = determineWinner(tier);
    const winnerIndex = prizes.findIndex(p => p.id === winner.id);
    const sectionAngle = 360 / prizes.length;
    const targetSection = winnerIndex * sectionAngle;
    const fullRotations = 5 + Math.floor(Math.random() * 3);
    const totalRotation = currentRotation + fullRotations * 360 + (360 - targetSection - currentRotation % 360 + sectionAngle / 2);

    rotation.setValue(currentRotation);
    Animated.timing(rotation, {
      toValue: totalRotation,
      duration: 4000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setIsSpinning(false);
      setCurrentRotation(totalRotation % 360);
      onResult(winner);
    });
  }

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={{ alignItems: 'center', gap: 20 }}>
      <TouchableOpacity onPress={onBack} style={styles.backToSelector}>
        <Text style={styles.backToSelectorText}>{t('▶ العودة للاختيار', '◀ Back to selection')}</Text>
      </TouchableOpacity>

      {/* Pointer */}
      <View style={styles.pointer}>
        <Text style={{ fontSize: 28 }}>▼</Text>
      </View>

      {/* Wheel */}
      <Animated.View style={[styles.wheel, { width: WHEEL_SIZE, height: WHEEL_SIZE, transform: [{ rotate: rotateInterpolate }] }]}>
        {prizes.map((prize, i) => {
          const angle = (360 / prizes.length) * i;
          const colors = sectionColors[prize.rarity];
          const bgColor = colors[i % 2];
          return (
            <View
              key={prize.id}
              style={[styles.wheelSection, {
                width: WHEEL_SIZE,
                height: WHEEL_SIZE,
                transform: [{ rotate: `${angle}deg` }],
              }]}
            >
              <View style={[styles.sectionContent, { backgroundColor: bgColor }]}>
                <Text style={{ fontSize: 22, marginTop: 8 }}>{prize.emoji}</Text>
                <Text style={styles.sectionLabel}>{prize.shortName}</Text>
              </View>
            </View>
          );
        })}
        {/* Center circle */}
        <View style={styles.wheelCenter}>
          <Text style={{ fontSize: 24 }}>⭐</Text>
        </View>
      </Animated.View>

      {/* Spin button */}
      <TouchableOpacity
        style={[styles.spinBtn, { backgroundColor: tt.bgColor, borderColor: tt.borderColor }, isSpinning && { opacity: 0.5 }]}
        onPress={spin}
        disabled={isSpinning || !tickets.canSpin(tier, cost)}
        activeOpacity={0.85}
      >
        <Text style={[styles.spinBtnText, { color: tt.borderColor }]}>
          {isSpinning
            ? t('يدور...', 'Spinning...')
            : (isEnglish ? `🎡 Spin — ${cost} ${tt.emoji}` : `🎡 أدر العجلة — ${toArabicNumerals(cost)} ${tt.emoji}`)}
        </Text>
      </TouchableOpacity>

      <Text style={styles.balanceHint}>
        {isEnglish ? `Balance: ${tickets[tier]} ${tt.emoji}` : `رصيدك: ${toArabicNumerals(tickets[tier])} ${tt.emoji}`}
      </Text>
    </View>
  );
}

// ─── PRIZE REVEAL ───
function PrizeReveal({ prize, onClose }: { prize: Prize; onClose: () => void }) {
  const { t } = useLanguage();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const rc = RARITY_COLORS[prize.rarity];

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.2, useNativeDriver: true, tension: 100, friction: 5 }),
      Animated.spring(scaleAnim, { toValue: 1.0, useNativeDriver: true }),
    ]).start();

    if (['legendary', 'exclusive'].includes(prize.rarity)) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 800, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 800, useNativeDriver: false }),
        ])
      ).start();
    }
  }, []);

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [rc.border + '00', rc.border + '60'],
  });

  return (
    <Modal transparent animationType="fade" visible>
      <View style={styles.revealOverlay}>
        <Animated.View style={[styles.revealCard, {
          backgroundColor: rc.bg,
          borderColor: rc.border,
          transform: [{ scale: scaleAnim }],
        }]}>
          {/* Rarity label */}
          <View style={[styles.rarityLabelBg, { backgroundColor: rc.border + '20' }]}>
            <Text style={[styles.rarityLabelText, { color: rc.text }]}>✦ {rc.label} ✦</Text>
          </View>

          {/* Prize emoji */}
          <Text style={styles.revealEmoji}>{prize.emoji}</Text>

          {/* Prize name */}
          <Text style={[styles.revealName, { color: rc.text }]}>{prize.name}</Text>

          {/* Description */}
          <Text style={styles.revealDesc}>{getPrizeDescription(prize)}</Text>

          {/* Claim button */}
          <TouchableOpacity
            style={[styles.claimBtn, { backgroundColor: rc.border }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.claimBtnText}>{t('استلم الجائزة 🎁', 'Claim Prize 🎁')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── SPIN HISTORY TAB ───
function SpinHistoryTab({ history }: { history: SpinHistoryEntry[] }) {
  const { t } = useLanguage();
  if (history.length === 0) {
    return (
      <View style={styles.emptyHistory}>
        <Text style={{ fontSize: 48 }}>🎡</Text>
        <Text style={styles.emptyHistoryText}>{t('لم تقم بأي دوران بعد', 'No spins yet')}</Text>
        <Text style={styles.emptyHistorySub}>{t('اجمع التذاكر وابدأ الدوران!', 'Collect tickets and start spinning!')}</Text>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 8 }}>
      {history.map((entry) => {
        const rc = RARITY_COLORS[entry.prizeRarity as Rarity] || RARITY_COLORS.common;
        const dateStr = new Date(entry.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        return (
          <View key={entry.id} style={[styles.historyRow, { borderColor: rc.border + '40' }]}>
            <Text style={{ fontSize: 24 }}>{entry.prizeEmoji}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.historyName}>{entry.prizeName}</Text>
              <Text style={styles.historyDate}>{dateStr}</Text>
            </View>
            <View style={[styles.historyRarityBadge, { backgroundColor: rc.border + '20' }]}>
              <Text style={[styles.historyRarityText, { color: rc.text }]}>{rc.label}</Text>
            </View>
          </View>
        );
      })}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ─── STYLES ───
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0730' },
  header: { paddingTop: 48, paddingHorizontal: 20, alignItems: 'center', gap: 4 },
  backBtn: { position: 'absolute', top: 48, zIndex: 10, padding: 8 },
  backText: { color: '#A78BFA', fontSize: 22, fontWeight: '700' },
  headerEyebrow: { fontSize: 10, fontWeight: '800', color: '#A78BFA', letterSpacing: 3, textTransform: 'uppercase' },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#FFF', textAlign: 'center', letterSpacing: 0.5 },
  headerAccent: { width: 32, height: 3, borderRadius: 2, backgroundColor: '#7C3AED', marginTop: 6, marginBottom: 10 },
  ticketBarRow: { justifyContent: 'center', gap: 8 },
  ticketBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 14, paddingHorizontal: 11, paddingVertical: 5,
    borderWidth: 1,
  },
  ticketCount: { fontSize: 13, fontWeight: '800' },

  // Tabs
  tabRow: {
    marginHorizontal: 20, marginTop: 18, padding: 4, gap: 4,
    backgroundColor: '#15102E',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2D2D50',
  },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#7C3AED' },
  tabText: { color: '#9CA3AF', fontSize: 14, fontWeight: '700' },
  tabTextActive: { color: '#FFF', fontWeight: '800' },

  scrollContent: { padding: 20, gap: 24 },

  // Selector
  selectorHeader: { alignItems: 'baseline', justifyContent: 'space-between' },
  selectorTitle: { fontSize: 19, fontWeight: '800', color: '#FFF', flex: 1 },
  selectorHint: { fontSize: 11, color: '#6B7280', fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  spinCard: {
    alignItems: 'center', gap: 14,
    borderRadius: 20, borderWidth: 1.5, padding: 16,
  },
  cardIconWrap: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: '#0D0730AA',
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  cardIcon: { fontSize: 30 },
  spinCardName: { fontSize: 17, fontWeight: '800' },
  spinCardDesc: { fontSize: 12, color: '#9CA3AF', lineHeight: 16 },
  rarityPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1,
  },
  rarityDot: { width: 6, height: 6, borderRadius: 3 },
  rarityPillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  costBadge: {
    alignItems: 'center', gap: 3,
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8,
    minWidth: 62,
  },
  costLabel: { fontSize: 9, fontWeight: '800', color: '#6B7280', letterSpacing: 1.2 },
  costNum: { fontSize: 22, fontWeight: '900', lineHeight: 24 },
  costEmoji: { fontSize: 14 },
  exclusiveBadge: { backgroundColor: '#EC4899' + '25', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  exclusiveBadgeText: { fontSize: 9, fontWeight: '900', color: '#EC4899', letterSpacing: 1 },

  // Wheel
  backToSelector: { alignSelf: 'flex-end' },
  backToSelectorText: { color: '#A78BFA', fontSize: 14, fontWeight: '700' },
  pointer: { alignItems: 'center', zIndex: 10, marginBottom: -12 },
  wheel: {
    borderRadius: WHEEL_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: '#1A1A2E',
    borderWidth: 3,
    borderColor: '#2D2D50',
  },
  wheelSection: {
    position: 'absolute',
    top: 0, left: 0,
    alignItems: 'center',
  },
  sectionContent: {
    width: WHEEL_SIZE / 3,
    height: WHEEL_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
    position: 'absolute',
    top: 0,
    left: WHEEL_SIZE / 2 - WHEEL_SIZE / 6,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  sectionLabel: { fontSize: 10, color: '#FFF', fontWeight: '700', textAlign: 'center', marginTop: 2 },
  wheelCenter: {
    position: 'absolute',
    top: WHEEL_SIZE / 2 - 28,
    left: WHEEL_SIZE / 2 - 28,
    width: 56, height: 56,
    borderRadius: 28,
    backgroundColor: '#1A1A2E',
    borderWidth: 3, borderColor: '#7C3AED',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
  spinBtn: {
    paddingVertical: 16, paddingHorizontal: 40,
    borderRadius: 16, borderWidth: 2,
    alignItems: 'center',
  },
  spinBtnText: { fontSize: 18, fontWeight: '900' },
  balanceHint: { color: '#6B7280', fontSize: 13 },

  // Earn section
  earnSection: { gap: 14, marginTop: 4 },
  earnHeader: { alignItems: 'center', gap: 12, marginBottom: 2 },
  earnIconWrap: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: '#7C3AED20',
    borderWidth: 1, borderColor: '#7C3AED40',
    alignItems: 'center', justifyContent: 'center',
  },
  earnHeaderIcon: { fontSize: 20 },
  earnTitle: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  earnSubtitle: { fontSize: 12, color: '#9CA3AF' },
  adBtn: {
    alignItems: 'center', gap: 12,
    backgroundColor: '#0F2E15',
    borderWidth: 1.5, borderColor: '#22C55E',
    borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14,
  },
  adBtnLoading: { backgroundColor: '#1A1A2E', borderColor: '#2D2D50' },
  adBtnIcon: { fontSize: 22 },
  adBtnText: { color: '#22C55E', fontSize: 16, fontWeight: '800' },
  adBtnSub: { color: '#86EFAC', fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 1 },
  adBtnChevron: { color: '#22C55E', fontSize: 24, fontWeight: '300' },
  goldenHint: {
    alignItems: 'center', gap: 12,
    backgroundColor: '#1C1208',
    borderRadius: 14, borderWidth: 1, borderColor: '#F59E0B55',
    padding: 14,
  },
  goldenHintTitle: { color: '#FCD34D', fontSize: 14, fontWeight: '800' },
  goldenHintSub: { color: '#B45309', fontSize: 12 },
  adProgress: {
    gap: 8,
    backgroundColor: '#15102E',
    borderRadius: 14, borderWidth: 1, borderColor: '#2D2D50',
    padding: 14,
  },
  adProgressHeader: { alignItems: 'center', justifyContent: 'space-between' },
  adProgressLabel: { color: '#D1D5DB', fontSize: 13, fontWeight: '700' },
  adProgressCount: { color: '#F59E0B', fontSize: 14, fontWeight: '900' },
  adProgressBar: { height: 10, borderRadius: 5, backgroundColor: '#0D0730', overflow: 'hidden', borderWidth: 1, borderColor: '#2D2D50' },
  adProgressFill: { height: '100%', borderRadius: 4, backgroundColor: '#F59E0B' },
  adProgressText: { color: '#9CA3AF', fontSize: 11 },

  // Prize Reveal
  revealOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center', alignItems: 'center', padding: 30,
  },
  revealCard: {
    width: '100%', borderRadius: 24, borderWidth: 2,
    padding: 30, alignItems: 'center', gap: 16,
  },
  rarityLabelBg: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 6 },
  rarityLabelText: { fontSize: 16, fontWeight: '800' },
  revealEmoji: { fontSize: 72 },
  revealName: { fontSize: 24, fontWeight: '900', textAlign: 'center' },
  revealDesc: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
  claimBtn: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, marginTop: 8 },
  claimBtnText: { color: '#FFF', fontSize: 17, fontWeight: '800' },

  // History
  emptyHistory: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingTop: 80 },
  emptyHistoryText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  emptyHistorySub: { color: '#6B7280', fontSize: 14 },
  historyRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
    backgroundColor: '#1A1A2E', borderRadius: 14, padding: 14,
    borderWidth: 1,
  },
  historyName: { color: '#FFF', fontSize: 15, fontWeight: '700', textAlign: 'right' },
  historyDate: { color: '#6B7280', fontSize: 11, textAlign: 'right' },
  historyRarityBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  historyRarityText: { fontSize: 11, fontWeight: '700' },
});
