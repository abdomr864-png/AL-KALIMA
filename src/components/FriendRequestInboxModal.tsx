import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/LanguageContext';

interface PendingRequest {
  id: string;
  requester_id: string;
  created_at: string;
  requester: {
    username: string;
    avatar_color: string | null;
    active_icon: string | null;
  };
}

export function FriendRequestInboxModal() {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('friendships')
        .select('id, requester_id, created_at, requester:requester_id(username, avatar_color, active_icon)')
        .eq('addressee_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (!mounted || !data || data.length === 0) return;

      setRequests(data as any);
      setVisible(true);
    }
    load();
    return () => { mounted = false; };
  }, []);

  async function handleAccept(req: PendingRequest) {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', req.id);
    setRequests(prev => {
      const next = prev.filter(r => r.id !== req.id);
      if (next.length === 0) setVisible(false);
      return next;
    });
  }

  async function handleReject(req: PendingRequest) {
    await supabase.from('friendships').delete().eq('id', req.id);
    setRequests(prev => {
      const next = prev.filter(r => r.id !== req.id);
      if (next.length === 0) setVisible(false);
      return next;
    });
  }

  if (!visible || requests.length === 0) return null;

  return (
    <Modal transparent animationType="fade" onRequestClose={() => setVisible(false)}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.header}>
            <Text style={{ fontSize: 36 }}>📩</Text>
            <Text style={s.title}>
              {isArabic
                ? `لديك ${requests.length} طلب صداقة`
                : `You have ${requests.length} friend request${requests.length > 1 ? 's' : ''}`}
            </Text>
          </View>

          <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 10 }}>
            {requests.map(req => {
              const r = req.requester || { username: '?', avatar_color: null, active_icon: null };
              return (
                <View key={req.id} style={s.card}>
                  <View style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: r.avatar_color || '#7C3AED',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 20 }}>
                      {r.active_icon || (r.username || '?')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }} numberOfLines={1}>
                      {r.username}
                    </Text>
                    <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
                      {isArabic ? 'يريد إضافتك كصديق' : 'wants to be your friend'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleReject(req)} style={s.rejectBtn}>
                    <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: '900' }}>✕</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleAccept(req)} style={s.acceptBtn}>
                    <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '800' }}>
                      {isArabic ? 'قبول' : 'Accept'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity onPress={() => setVisible(false)} style={s.closeBtn}>
            <Text style={s.closeTxt}>{isArabic ? 'لاحقاً' : 'Later'}</Text>
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
    borderWidth: 1, borderColor: '#7C3AED60',
  },
  header: { alignItems: 'center', gap: 4, marginBottom: 16 },
  title: { color: '#FFF', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#13102B', borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: '#2D2D50',
  },
  rejectBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(239,68,68,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
  },
  acceptBtn: {
    height: 36, paddingHorizontal: 14, borderRadius: 12,
    backgroundColor: '#7C3AED',
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtn: {
    marginTop: 14, height: 42,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, backgroundColor: '#1A1A2E',
    borderWidth: 1, borderColor: '#2D2D50',
  },
  closeTxt: { color: '#9CA3AF', fontSize: 14, fontWeight: '700' },
});
