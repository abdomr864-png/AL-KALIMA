import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/LanguageContext';
import { IncomingGiftCard } from './SendGiftModal';

interface Gift {
  id: string;
  sender_id: string;
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

export function GiftInboxModal() {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase.from('gifts')
        .select('*, sender:sender_id(username)')
        .eq('recipient_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (!mounted || !data || data.length === 0) return;

      setGifts(data.map((g: any) => ({
        ...g,
        sender_username: g.sender?.username || '?',
      })));
      setVisible(true);
    }
    load();
    return () => { mounted = false; };
  }, []);

  async function handleClaim(gift: Gift) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('gifts').update({ status: 'claimed' }).eq('id', gift.id);

    const { data: profile } = await supabase.from('profiles')
      .select('coins, bronze_tickets, silver_tickets, golden_tickets, streak_freezes, owned_icons')
      .eq('id', user.id).single();

    if (profile) {
      const existingIcons: string[] = Array.isArray(profile.owned_icons) ? profile.owned_icons : [];
      const giftedIcons: string[] = Array.isArray(gift.items) ? gift.items : [];
      const mergedIcons = Array.from(new Set([...existingIcons, ...giftedIcons]));

      await supabase.from('profiles').update({
        coins: (profile.coins || 0) + (gift.coins || 0),
        bronze_tickets: (profile.bronze_tickets || 0) + (gift.bronze_tickets || 0),
        silver_tickets: (profile.silver_tickets || 0) + (gift.silver_tickets || 0),
        golden_tickets: (profile.golden_tickets || 0) + (gift.golden_tickets || 0),
        streak_freezes: (profile.streak_freezes || 0) + (gift.streak_freezes || 0),
        owned_icons: mergedIcons,
      }).eq('id', user.id);
    }

    setGifts(prev => {
      const next = prev.filter(g => g.id !== gift.id);
      if (next.length === 0) setVisible(false);
      return next;
    });
  }

  if (!visible || gifts.length === 0) return null;

  return (
    <Modal transparent animationType="fade" onRequestClose={() => setVisible(false)}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.header}>
            <Text style={{ fontSize: 36 }}>🎁</Text>
            <Text style={s.title}>
              {isArabic ? `لديك ${gifts.length} هدية!` : `You have ${gifts.length} gift${gifts.length > 1 ? 's' : ''}!`}
            </Text>
            <Text style={s.sub}>
              {isArabic ? 'استلم الهدايا التي وصلتك' : 'Claim your pending gifts'}
            </Text>
          </View>

          <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 10 }}>
            {gifts.map(gift => (
              <IncomingGiftCard
                key={gift.id}
                gift={gift}
                onClaim={() => handleClaim(gift)}
                language={language}
              />
            ))}
          </ScrollView>

          <TouchableOpacity onPress={() => setVisible(false)} style={s.closeBtn}>
            <Text style={s.closeTxt}>
              {isArabic ? 'لاحقاً' : 'Later'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  sheet: {
    width: '100%', maxWidth: 420,
    backgroundColor: '#0D0730', borderRadius: 24, padding: 20,
    borderWidth: 1, borderColor: '#F59E0B60',
  },
  header: { alignItems: 'center', gap: 4, marginBottom: 16 },
  title: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  sub: { color: '#9CA3AF', fontSize: 13 },
  closeBtn: {
    marginTop: 14, height: 42,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, backgroundColor: '#1A1A2E',
    borderWidth: 1, borderColor: '#2D2D50',
  },
  closeTxt: { color: '#9CA3AF', fontSize: 14, fontWeight: '700' },
});
