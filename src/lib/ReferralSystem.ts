import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

function generateReferralCode(userId: string): string {
  const hash = userId.replace(/-/g, '').substring(0, 3).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${hash}${random}`;
}

export interface ReferralStats {
  code: string;
  totalReferrals: number;
  confirmedReferrals: number;
  pendingReferrals: number;
  nextMilestone: { at: number; reward_ar: string; reward_en: string } | null;
}

const MILESTONES = [
  { at: 5,  gems: 50,  goldenTickets: 0, icon: null,         msg_ar: '5 أصدقاء دعوتهم! +50 جوهرة', msg_en: '5 friends referred! +50 gems' },
  { at: 15, gems: 100, goldenTickets: 1, icon: null,         msg_ar: '15 دعوة! +100 جوهرة + تذكرة ذهبية', msg_en: '15 referrals! +100 gems + golden ticket' },
  { at: 50, gems: 300, goldenTickets: 5, icon: 'ambassador', msg_ar: '50 دعوة! أنت سفير كلمات!', msg_en: '50 referrals! You are a Kalimat Ambassador!' },
];

export const ReferralSystem = {

  async getOrCreateCode(userId: string): Promise<string> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('id', userId)
      .single();

    if (profile?.referral_code) return profile.referral_code;

    let code = generateReferralCode(userId);
    let attempts = 0;

    while (attempts < 10) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', code)
        .maybeSingle();

      if (!existing) break;
      code = generateReferralCode(userId + attempts);
      attempts++;
    }

    await supabase.from('profiles')
      .update({ referral_code: code })
      .eq('id', userId);

    return code;
  },

  async applyReferralCode(newPlayerId: string, code: string): Promise<{
    success: boolean;
    message_ar: string;
    message_en: string;
    referrerUsername?: string;
  }> {
    const cleanCode = code.toUpperCase().trim();

    // Find referrer
    const { data: referrer } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('referral_code', cleanCode)
      .single();

    if (!referrer) {
      return { success: false, message_ar: 'كود غير صحيح — تحقق وحاول مجدداً', message_en: 'Invalid code — check and try again' };
    }

    if (referrer.id === newPlayerId) {
      return { success: false, message_ar: 'لا يمكنك استخدام كودك الخاص', message_en: "You can't use your own code" };
    }

    // Check if already used a code
    const { data: self } = await supabase
      .from('profiles')
      .select('referred_by')
      .eq('id', newPlayerId)
      .single();

    if (self?.referred_by) {
      return { success: false, message_ar: 'لقد استخدمت كوداً من قبل', message_en: "You've already used a code" };
    }

    // Check device anti-abuse
    const deviceId = await AsyncStorage.getItem('kalimat_device_id');
    if (deviceId) {
      const { data: deviceCheck } = await supabase
        .from('referrals')
        .select('id')
        .eq('referrer_id', referrer.id)
        .eq('device_id', deviceId)
        .maybeSingle();

      if (deviceCheck) {
        return { success: false, message_ar: 'هذا الكود استُخدم من جهازك مسبقاً', message_en: 'This code was already used from your device' };
      }
    }

    // Record the referral
    await supabase.from('referrals').insert({
      referrer_id: referrer.id,
      referred_id: newPlayerId,
      device_id: deviceId,
      code: cleanCode,
      status: 'pending',
    });

    // Save who referred this player
    await supabase.from('profiles')
      .update({ referred_by: referrer.id })
      .eq('id', newPlayerId);

    // Give new player welcome bonus
    await supabase.rpc('add_gems', { p_user_id: newPlayerId, p_amount: 0 }); // no-op for gems
    // Add 30 coins instead
    await supabase.rpc('add_coins', { amount: 30, reason: 'referral_bonus' });

    return {
      success: true,
      message_ar: 'تم! حصلت على 30 عملة مكافأة الانضمام',
      message_en: 'Done! You got 30 coins as a signup bonus',
      referrerUsername: referrer.username,
    };
  },

  async confirmReferral(referredId: string) {
    // Called after new player completes their first game
    await supabase.from('referrals')
      .update({ status: 'confirmed' })
      .eq('referred_id', referredId)
      .eq('status', 'pending');

    const { data } = await supabase
      .from('referrals')
      .select('referrer_id')
      .eq('referred_id', referredId)
      .single();

    if (data?.referrer_id) {
      await this.checkAndRewardReferrer(data.referrer_id);
    }
  },

  async checkAndRewardReferrer(referrerId: string) {
    const { count } = await supabase
      .from('referrals')
      .select('id', { count: 'exact' })
      .eq('referrer_id', referrerId)
      .eq('status', 'confirmed');

    const total = count || 0;

    for (const milestone of MILESTONES) {
      if (total === milestone.at) {
        // Give gems
        await supabase.rpc('add_gems', { p_user_id: referrerId, p_amount: milestone.gems });

        // Give golden tickets
        if (milestone.goldenTickets > 0) {
          await supabase.rpc('add_golden_tickets', { p_user_id: referrerId, p_amount: milestone.goldenTickets });
        }

        // Give exclusive icon
        if (milestone.icon) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('owned_icons')
            .eq('id', referrerId)
            .single();

          if (prof) {
            const icons = prof.owned_icons || [];
            if (!icons.includes(milestone.icon)) {
              await supabase.from('profiles')
                .update({ owned_icons: [...icons, milestone.icon] })
                .eq('id', referrerId);
            }
          }
        }

        // Send push notification
        const { data: referrer } = await supabase
          .from('profiles')
          .select('push_token')
          .eq('id', referrerId)
          .single();

        if (referrer?.push_token) {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: referrer.push_token,
              title: 'Referral Reward!',
              body: milestone.msg_en,
              data: { screen: '/profile' },
            }),
          }).catch(() => {});
        }
      }
    }
  },

  async getMyStats(userId: string): Promise<ReferralStats> {
    const [code, { count: total }, { count: confirmed }] = await Promise.all([
      this.getOrCreateCode(userId),
      supabase.from('referrals').select('id', { count: 'exact' }).eq('referrer_id', userId),
      supabase.from('referrals').select('id', { count: 'exact' }).eq('referrer_id', userId).eq('status', 'confirmed'),
    ]);

    const confirmedCount = confirmed || 0;
    const milestoneValues = [5, 15, 50];
    const nextAt = milestoneValues.find(m => m > confirmedCount);

    return {
      code,
      totalReferrals: total || 0,
      confirmedReferrals: confirmedCount,
      pendingReferrals: (total || 0) - confirmedCount,
      nextMilestone: nextAt ? {
        at: nextAt,
        reward_ar: nextAt === 5 ? '50 جوهرة' : nextAt === 15 ? '100 جوهرة + تذكرة ذهبية' : '300 جوهرة + أيقونة السفير',
        reward_en: nextAt === 5 ? '50 gems' : nextAt === 15 ? '100 gems + golden ticket' : '300 gems + Ambassador icon',
      } : null,
    };
  },

  async validateCode(code: string): Promise<string | null> {
    if (code.length !== 6) return null;
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('referral_code', code.toUpperCase())
      .maybeSingle();
    return data?.username || null;
  },
};
