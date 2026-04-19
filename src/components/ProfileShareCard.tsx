import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Share } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { ProfileAvatar } from './ProfileAvatar';
import { ProfileBackground } from './ProfileBackground';

interface ProfileCardProps {
  username: string;
  avatarColor: string;
  activeIcon: string;
  activeBorder: string;
  activeProfileBg: string;
  currentStreak: number;
  bestScore: number;
  totalGames: number;
  totalWins: number;
  language: 'ar' | 'en';
  rarestCosmetic?: string;
  onClose: () => void;
}

export function ProfileShareCard({
  username, avatarColor, activeIcon, activeBorder,
  activeProfileBg, currentStreak, bestScore,
  totalGames, totalWins, language, rarestCosmetic, onClose,
}: ProfileCardProps) {
  const cardRef = useRef<ViewShot>(null);
  const [sharing, setSharing] = useState(false);

  async function captureAndShare() {
    if (!cardRef.current || sharing) return;
    setSharing(true);

    try {
      const uri = await (cardRef.current as any).capture();

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: language === 'ar' ? 'شارك ملفك' : 'Share your profile',
        });
      } else {
        await Share.share({
          message: language === 'ar'
            ? `أنا ${username} في كلمات\nسلسلتي: ${currentStreak} أيام\nحمّل التطبيق: kalimat.app`
            : `I'm ${username} on Kalimat\nStreak: ${currentStreak} days\nDownload: kalimat.app`,
        });
      }
    } catch (e) {
      console.log('Share error:', e);
    } finally {
      setSharing(false);
    }
  }

  const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
  const hasBg = activeProfileBg && activeProfileBg !== 'none';

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>

        {/* THE CARD — this gets captured */}
        <ViewShot ref={cardRef} options={{ format: 'png', quality: 1 }}>
          <View style={styles.card}>
            {/* Background */}
            {hasBg && (
              <View style={StyleSheet.absoluteFill}>
                <ProfileBackground theme={activeProfileBg} />
              </View>
            )}

            {/* Dark overlay so text is readable */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: hasBg ? 'rgba(0,0,0,0.45)' : '#0D0730' }]} />

            {/* Card content */}
            <View style={styles.cardContent}>

              {/* Top: Kalimat branding */}
              <View style={styles.cardHeader}>
                <Text style={styles.brandText}>كلمات · KALIMAT</Text>
                <View style={styles.brandDot} />
              </View>

              {/* Avatar centered */}
              <View style={styles.avatarSection}>
                <ProfileAvatar
                  size={64}
                  icon={activeIcon}
                  username={username}
                  borderType={activeBorder}
                />
              </View>

              {/* Username */}
              <Text style={styles.cardUsername}>{username}</Text>

              {/* Streak badge */}
              {currentStreak > 0 && (
                <View style={styles.streakBadge}>
                  <Text style={styles.streakText}>
                    {currentStreak} {language === 'ar' ? 'يوم' : 'days'}
                  </Text>
                </View>
              )}

              {/* Stats row */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNum}>{bestScore?.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>{language === 'ar' ? 'أفضل نتيجة' : 'Best score'}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNum}>{totalGames}</Text>
                  <Text style={styles.statLabel}>{language === 'ar' ? 'مباراة' : 'Games'}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNum}>{winRate}%</Text>
                  <Text style={styles.statLabel}>{language === 'ar' ? 'انتصارات' : 'Win rate'}</Text>
                </View>
              </View>

              {/* Rarest cosmetic badge */}
              {rarestCosmetic && (
                <View style={styles.cosmeticBadge}>
                  <Text style={styles.cosmeticText}>{rarestCosmetic}</Text>
                </View>
              )}

              {/* Bottom CTA */}
              <Text style={styles.ctaText}>
                {language === 'ar' ? 'العب معي على kalimat.app' : 'Play with me at kalimat.app'}
              </Text>
            </View>
          </View>
        </ViewShot>

        {/* Share and close buttons below card */}
        <Pressable style={styles.shareBtn} onPress={captureAndShare} disabled={sharing}>
          <Text style={styles.shareBtnText}>
            {sharing
              ? (language === 'ar' ? 'جاري التحضير...' : 'Preparing...')
              : (language === 'ar' ? 'شارك البطاقة' : 'Share card')}
          </Text>
        </Pressable>

        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 999,
  },
  modal: { width: '88%', alignItems: 'center', gap: 12 },
  card: {
    width: '100%', aspectRatio: 0.75,
    borderRadius: 24, overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(124,58,237,0.6)',
  },
  cardContent: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 24, gap: 10,
  },
  cardHeader: {
    position: 'absolute', top: 16, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  brandText: {
    color: 'rgba(167,139,250,0.8)', fontSize: 12,
    fontWeight: '700', letterSpacing: 2,
  },
  brandDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#7C3AED' },
  avatarSection: { marginBottom: 4 },
  cardUsername: {
    color: 'white', fontSize: 28, fontWeight: '900',
    letterSpacing: 1, textAlign: 'center',
  },
  streakBadge: {
    backgroundColor: 'rgba(180,83,9,0.5)',
    borderRadius: 99, paddingHorizontal: 14, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)',
  },
  streakText: { color: '#FDE68A', fontSize: 15, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(13,7,48,0.6)',
    borderRadius: 16, paddingVertical: 12, paddingHorizontal: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    width: '100%', marginTop: 4,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { color: '#F59E0B', fontSize: 20, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)' },
  cosmeticBadge: {
    backgroundColor: 'rgba(124,58,237,0.3)',
    borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)',
  },
  cosmeticText: { color: '#C4B5FD', fontSize: 12 },
  ctaText: {
    position: 'absolute', bottom: 16,
    color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 1,
  },
  shareBtn: {
    width: '100%', height: 54, backgroundColor: '#7C3AED',
    borderRadius: 16, alignItems: 'center', justifyContent: 'center',
  },
  shareBtnText: { color: 'white', fontSize: 17, fontWeight: '800' },
  closeBtn: { padding: 12 },
  closeBtnText: { color: '#4B5563', fontSize: 14 },
});
