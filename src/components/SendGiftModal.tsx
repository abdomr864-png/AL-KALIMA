import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Animated,
  ActivityIndicator, Modal, Pressable, StyleSheet, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/LanguageContext';
import { useCoins } from '../hooks/useCoins';
import { PROFILE_ICONS, RARITY_COLORS } from '../lib/premiumCosmetics';

function iconGemCost(icon: { currency: string; price: number }) {
  if (icon.currency === 'gems') return icon.price;
  if (icon.currency === 'coins') return Math.max(1, Math.ceil(icon.price / 10));
  return 5;
}

const GIFTABLE_ICONS = PROFILE_ICONS.filter(i => i.currency === 'coins' || i.currency === 'gems');

interface SendGiftModalProps {
  friend: { id: string; username: string; push_token?: string };
  onClose: () => void;
}

export function SendGiftModal({ friend, onClose }: SendGiftModalProps) {
  const { language } = useLanguage();
  const { gems, spendGems } = useCoins();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const isArabic = language === 'ar';

  const totalGems = selectedIds.reduce((sum, id) => {
    const icon = GIFTABLE_ICONS.find(i => i.id === id);
    return sum + (icon ? iconGemCost(icon) : 0);
  }, 0);

  function toggleIcon(id: string) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  const slideAnim = useRef(new Animated.Value(600)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 9, useNativeDriver: true }).start();
  }, []);

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(''), 2500);
  }

  async function sendGift() {
    if (selectedIds.length === 0) {
      showToast(isArabic ? 'اختر شيئاً لإرساله' : 'Pick at least one item', 'error');
      return;
    }
    if (gems < totalGems) {
      showToast(isArabic ? 'جواهرك غير كافية' : 'Not enough gems', 'error');
      return;
    }

    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSending(false); return; }

    const success = await spendGems(totalGems);
    if (!success) {
      showToast(isArabic ? 'جواهرك غير كافية' : 'Not enough gems', 'error');
      setSending(false);
      return;
    }

    const basePayload = {
      sender_id: user.id,
      recipient_id: friend.id,
      tier: 'custom',
      message: message.trim() || null,
      status: 'pending',
    };

    let insertError: any = null;
    let attempt = await supabase.from('gifts').insert({ ...basePayload, items: selectedIds });
    insertError = attempt.error;

    if (insertError && /items/i.test(insertError.message || '')) {
      console.log('gifts.items column missing, retrying without it');
      attempt = await supabase.from('gifts').insert(basePayload);
      insertError = attempt.error;
    }

    if (insertError) {
      console.log('Gift insert error:', JSON.stringify(insertError));
      showToast(
        (isArabic ? 'خطأ: ' : 'Error: ') + (insertError.message || 'unknown'),
        'error'
      );
      setSending(false);
      return;
    }

    if (friend.push_token) {
      const senderUsername = await AsyncStorage.getItem('kalimat_username');
      try {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: friend.push_token,
            title: isArabic ? `🎁 ${senderUsername} أرسل لك هدية!` : `🎁 ${senderUsername} sent you a gift!`,
            body: isArabic
              ? `${selectedIds.length} عناصر${message ? ` · "${message}"` : ''}`
              : `${selectedIds.length} items${message ? ` · "${message}"` : ''}`,
            data: { type: 'gift_received', screen: '/' },
            sound: 'default',
          }),
        });
      } catch { /* push failed silently */ }
    }

    setSending(false);
    setSent(true);
    Animated.spring(successScale, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }).start();
  }

  if (sent) {
    return (
      <Modal transparent animationType="fade" onRequestClose={onClose}>
        <View style={s.overlay}>
          <Animated.View style={[s.successCard, { transform: [{ scale: successScale }] }]}>
            <Text style={{ fontSize: 64 }}>🎁</Text>
            <Text style={s.successTitle}>
              {isArabic ? 'تم إرسال الهدية!' : 'Gift sent!'}
            </Text>
            <Text style={s.successSub}>
              {isArabic ? `${friend.username} سيفرح بهديتك 🎉` : `${friend.username} will love it 🎉`}
            </Text>
            <TouchableOpacity style={s.awesomeBtn} onPress={onClose}>
              <Text style={s.awesomeBtnText}>
                {isArabic ? 'رائع!' : 'Awesome!'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>

          {/* Handle bar */}
          <View style={s.handleBar} />

          {/* Header */}
          <View style={s.header}>
            <Text style={s.headerTitle}>
              {isArabic ? `أرسل هدية لـ ${friend.username}` : `Send gift to ${friend.username}`}
            </Text>
            <Text style={s.headerSub}>
              {isArabic ? 'اختر الهدية المناسبة' : 'Choose a gift'}
            </Text>
          </View>

          <Text style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 8, textAlign: 'center' }}>
            {isArabic
              ? `محفظتك: ${gems}💎 · المجموع: ${totalGems}💎`
              : `Balance: ${gems}💎 · Total: ${totalGems}💎`}
          </Text>

          <ScrollView
            horizontal={false}
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 320 }}
            contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}
          >
            {GIFTABLE_ICONS.map(icon => {
              const selected = selectedIds.includes(icon.id);
              const cost = iconGemCost(icon);
              const rc = RARITY_COLORS[icon.rarity];
              return (
                <TouchableOpacity
                  key={icon.id}
                  onPress={() => toggleIcon(icon.id)}
                  activeOpacity={0.8}
                  style={{
                    width: '30%',
                    backgroundColor: selected ? `${rc.border}25` : '#1A1A2E',
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? rc.border : '#2D2D50',
                    borderRadius: 14, padding: 10,
                    alignItems: 'center', gap: 4,
                  }}
                >
                  <Text style={{ fontSize: 32 }}>{icon.emoji}</Text>
                  <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700', textAlign: 'center' }} numberOfLines={1}>
                    {icon.name}
                  </Text>
                  <Text style={{ color: rc.text, fontSize: 11, fontWeight: '800' }}>
                    {cost}💎
                  </Text>
                  {selected && (
                    <View style={{
                      position: 'absolute', top: 4, right: 4,
                      width: 18, height: 18, borderRadius: 9,
                      backgroundColor: rc.border,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '900' }}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Optional message */}
          <TextInput
            style={s.messageInput}
            placeholder={isArabic ? 'أضف رسالة (اختياري)...' : 'Add a message (optional)...'}
            placeholderTextColor="#4B5563"
            value={message}
            onChangeText={setMessage}
            textAlign={isArabic ? 'right' : 'left'}
            maxLength={100}
          />

          <TouchableOpacity
            style={[s.sendBtn, {
              backgroundColor: selectedIds.length === 0 ? '#374151' : '#7C3AED',
              opacity: sending ? 0.6 : 1,
            }]}
            onPress={sendGift}
            disabled={sending || selectedIds.length === 0}
            activeOpacity={0.85}
          >
            {sending ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Text style={{ fontSize: 18 }}>🎁</Text>
                <Text style={s.sendBtnText}>
                  {isArabic
                    ? `أرسل (${selectedIds.length}) · ${totalGems}💎`
                    : `Send (${selectedIds.length}) · ${totalGems}💎`}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Toast */}
          {toast ? (
            <View style={[s.toast, { backgroundColor: toastType === 'error' ? '#4A1C1C' : '#1C4A1C' }]}>
              <Text style={{ color: toastType === 'error' ? '#EF4444' : '#22C55E', fontSize: 13, fontWeight: '700' }}>
                {toast}
              </Text>
            </View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Incoming Gift Card ───

interface IncomingGift {
  id: string;
  sender_username?: string;
  tier: string;
  message?: string;
  coins?: number;
  bronze_tickets?: number;
  silver_tickets?: number;
  golden_tickets?: number;
  streak_freezes?: number;
  items?: string[];
}

export function IncomingGiftCard({ gift, onClaim, language }: {
  gift: IncomingGift;
  onClaim: (gift: IncomingGift) => void;
  language: string;
}) {
  const isArabic = language === 'ar';
  const items = gift.items || [];
  const iconEntries = items
    .map(id => PROFILE_ICONS.find(i => i.id === id))
    .filter(Boolean) as typeof PROFILE_ICONS;

  return (
    <View style={s.giftCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ fontSize: 32 }}>🎁</Text>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.giftTitle}>
            {isArabic ? `${gift.sender_username} أرسل لك هدية!` : `${gift.sender_username} sent you a gift!`}
          </Text>
          {gift.message ? (
            <Text style={s.giftMsg}>"{gift.message}"</Text>
          ) : null}
        </View>
      </View>

      {iconEntries.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {iconEntries.map(icon => (
            <View key={icon.id} style={{
              backgroundColor: '#1A1A2E', borderRadius: 10,
              paddingHorizontal: 8, paddingVertical: 4,
              flexDirection: 'row', alignItems: 'center', gap: 4,
              borderWidth: 1, borderColor: '#2D2D50',
            }}>
              <Text style={{ fontSize: 16 }}>{icon.emoji}</Text>
              <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>{icon.name}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        {(gift.coins || 0) > 0 && <Text style={s.rewardTag}>🪙 {gift.coins}</Text>}
        {(gift.bronze_tickets || 0) > 0 && <Text style={s.rewardTag}>🎟️ ×{gift.bronze_tickets}</Text>}
        {(gift.silver_tickets || 0) > 0 && <Text style={s.rewardTag}>🎟️ ×{gift.silver_tickets}</Text>}
        {(gift.golden_tickets || 0) > 0 && <Text style={s.rewardTag}>🏮 ×{gift.golden_tickets}</Text>}
        {(gift.streak_freezes || 0) > 0 && <Text style={s.rewardTag}>🛡️ ×{gift.streak_freezes}</Text>}
      </View>

      <TouchableOpacity
        onPress={() => onClaim(gift)}
        activeOpacity={0.85}
        style={s.claimBtn}
      >
        <Text style={{ fontSize: 16 }}>🎁</Text>
        <Text style={s.claimBtnText}>
          {isArabic ? 'استلم الهدية!' : 'Claim gift!'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0D0730', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40, maxHeight: '90%',
  },
  handleBar: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#4B5563',
    alignSelf: 'center', marginBottom: 16,
  },
  header: { alignItems: 'center', gap: 4, marginBottom: 18 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  headerSub: { color: '#6B7280', fontSize: 14 },
  tierRow: {
    borderRadius: 18, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  tierName: { fontSize: 16, fontWeight: '800' },
  tierDesc: { color: '#6B7280', fontSize: 13 },
  tierCost: { fontSize: 16, fontWeight: '900' },
  badge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  checkCircle: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  messageInput: {
    backgroundColor: '#1A1A2E', borderRadius: 14, padding: 14,
    color: '#FFF', fontSize: 15, borderWidth: 1, borderColor: '#2D2D50',
    marginTop: 14,
  },
  sendBtn: {
    height: 54, borderRadius: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 14,
  },
  sendBtnText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  toast: {
    position: 'absolute', bottom: 50, left: 20, right: 20,
    borderRadius: 12, padding: 12, alignItems: 'center',
  },
  // Success card
  successCard: {
    backgroundColor: '#0D0730', borderRadius: 28, padding: 32,
    alignItems: 'center', gap: 12, alignSelf: 'center',
    marginBottom: 100, width: '85%',
    borderWidth: 1, borderColor: '#7C3AED40',
  },
  successTitle: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  successSub: { color: '#9CA3AF', fontSize: 15 },
  awesomeBtn: {
    backgroundColor: '#7C3AED', borderRadius: 14, height: 48,
    paddingHorizontal: 40, alignItems: 'center', justifyContent: 'center',
    marginTop: 8,
  },
  awesomeBtnText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  // Incoming gift card
  giftCard: {
    backgroundColor: '#13102B', borderRadius: 18, padding: 14,
    borderWidth: 1.5, borderColor: '#F59E0B60', gap: 10, marginBottom: 4,
  },
  giftTitle: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  giftMsg: { color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' },
  rewardTag: { color: '#FCD34D', fontSize: 14, fontWeight: '700' },
  claimBtn: {
    height: 46, backgroundColor: '#F59E0B',
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 6,
  },
  claimBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
