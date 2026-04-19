import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useUserStore } from '../store/userStore';

const ADS_KEY = 'kalimat_remove_ads';

// ============================================================
// STRIPE PAYMENT LINKS — Replace these with your real Stripe Payment Links
// Create them at: https://dashboard.stripe.com/payment-links
// ============================================================
const PAYMENT_LINKS = {
  kalimat_plus_monthly: 'https://buy.stripe.com/test_14AdR98IDbRSdFRgwm8IU04',
  kalimat_elite_monthly: '',
  kalimat_coins_100: 'https://buy.stripe.com/test_3cIfZh2kf9JK0T56VM8IU02',
  kalimat_coins_300: 'https://buy.stripe.com/test_14AcN5f715tu45heoe8IU01',
  kalimat_coins_800: 'https://buy.stripe.com/test_dRm9AT3ojbRS0T51Bs8IU03',
  kalimat_remove_ads: '',
  // Gem packs — replace with real Stripe Payment Links
  gems_50: '',
  gems_120: '',
  gems_300: '',
  gems_650: '',
  gems_1400: '',
} as Record<string, string>;

export const PRODUCTS = {
  PLUS_MONTHLY: 'kalimat_plus_monthly',
  ELITE_MONTHLY: 'kalimat_elite_monthly',
  COINS_100: 'kalimat_coins_100',
  COINS_300: 'kalimat_coins_300',
  COINS_800: 'kalimat_coins_800',
  REMOVE_ADS: 'kalimat_remove_ads',
  GEMS_50: 'gems_50',
  GEMS_120: 'gems_120',
  GEMS_300: 'gems_300',
  GEMS_650: 'gems_650',
  GEMS_1400: 'gems_1400',
} as const;

export function useSubscription() {
  const { user, updateCoins } = useUserStore();
  const setUser = useUserStore((s) => s.setUser);
  const [hasRemovedAds, setHasRemovedAds] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPlus = user?.isPlus ?? false;
  const isElite = (user as any)?.isElite ?? false;
  const coins = user?.coins ?? 0;

  useEffect(() => {
    AsyncStorage.getItem(ADS_KEY).then((v) => {
      if (v === 'true') setHasRemovedAds(true);
    });
  }, []);

  async function setPlus(value: boolean) {
    if (!user) return;
    setUser({ ...user, isPlus: value });
    try {
      if (user.id !== 'offline') {
        await supabase.from('profiles').update({ is_plus: value }).eq('id', user.id);
      }
    } catch {}
  }

  async function setElite(value: boolean) {
    if (!user) return;
    setUser({ ...user, isElite: value, isPlus: value ? true : user.isPlus });
    try {
      if (user.id !== 'offline') {
        await supabase.from('profiles').update({
          is_elite: value,
          is_plus: value ? true : user.isPlus,
          elite_since: value ? new Date().toISOString() : null,
        }).eq('id', user.id);
      }
    } catch {}
  }

  async function deliverMonthlyEliteGems() {
    const lastDelivery = await AsyncStorage.getItem('kalimat_elite_gems_delivered');
    const thisMonth = new Date().toISOString().substring(0, 7);
    if (lastDelivery === thisMonth) return;
    if (!isElite) return;

    const updateGems = useUserStore.getState().updateGems;
    updateGems(80);
    supabase.rpc('add_gems', { amount: 80, reason: 'elite_monthly' }).then(() => {});
    await AsyncStorage.setItem('kalimat_elite_gems_delivered', thisMonth);
  }

  async function handlePurchaseSuccess(productId: string) {
    const updateGems = useUserStore.getState().updateGems;
    switch (productId) {
      case PRODUCTS.ELITE_MONTHLY:
        await setElite(true);
        break;
      case PRODUCTS.PLUS_MONTHLY:
        await setPlus(true);
        break;
      case PRODUCTS.REMOVE_ADS:
        setHasRemovedAds(true);
        await AsyncStorage.setItem(ADS_KEY, 'true');
        break;
      case PRODUCTS.COINS_100:
        updateCoins(100);
        supabase.rpc('add_coins', { amount: 100, reason: 'daily_reward' }).then(() => {});
        break;
      case PRODUCTS.COINS_300:
        updateCoins(300);
        supabase.rpc('add_coins', { amount: 300, reason: 'daily_reward' }).then(() => {});
        break;
      case PRODUCTS.COINS_800:
        updateCoins(800);
        supabase.rpc('add_coins', { amount: 500, reason: 'daily_reward' }).then(() => {});
        supabase.rpc('add_coins', { amount: 300, reason: 'daily_reward' }).then(() => {});
        break;
      case PRODUCTS.GEMS_50:
        updateGems(50);
        supabase.rpc('add_gems', { amount: 50, reason: 'iap_purchase' }).then(() => {});
        break;
      case PRODUCTS.GEMS_120:
        updateGems(120 + 20);
        supabase.rpc('add_gems', { amount: 140, reason: 'iap_purchase' }).then(() => {});
        break;
      case PRODUCTS.GEMS_300:
        updateGems(300 + 80);
        supabase.rpc('add_gems', { amount: 380, reason: 'iap_purchase' }).then(() => {});
        break;
      case PRODUCTS.GEMS_650:
        updateGems(650 + 200);
        supabase.rpc('add_gems', { amount: 850, reason: 'iap_purchase' }).then(() => {});
        break;
      case PRODUCTS.GEMS_1400:
        updateGems(1400 + 500);
        supabase.rpc('add_gems', { amount: 1900, reason: 'iap_purchase' }).then(() => {});
        break;
    }
  }

  async function purchaseProduct(productId: string): Promise<{ success: boolean; message: string }> {
    setLoading(true);
    setError(null);

    try {
      const paymentUrl = PAYMENT_LINKS[productId];
      if (!paymentUrl || paymentUrl.includes('YOUR_')) {
        // No real Stripe link configured — show error
        setLoading(false);
        Alert.alert(
          'إعداد الدفع مطلوب',
          'يجب إضافة روابط الدفع من Stripe في الكود.\n\nاذهب إلى dashboard.stripe.com/payment-links وأنشئ روابط الدفع ثم أضفها في useSubscription.ts'
        );
        return { success: false, message: 'روابط الدفع غير مُعدّة' };
      }

      // Open Stripe payment page in browser
      const result = await WebBrowser.openBrowserAsync(paymentUrl, {
        dismissButtonStyle: 'cancel',
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      });

      // If user completed (didn't cancel the browser)
      if (result.type === 'cancel' || result.type === 'dismiss') {
        // Ask if payment was completed
        const completed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'هل تم الدفع؟',
            'هل أتممت عملية الدفع بنجاح؟',
            [
              { text: 'لا', style: 'cancel', onPress: () => resolve(false) },
              { text: 'نعم، تم الدفع', onPress: () => resolve(true) },
            ],
            { cancelable: false }
          );
        });

        if (completed) {
          await handlePurchaseSuccess(productId);
          setLoading(false);
          return { success: true, message: getSuccessMessage(productId) };
        } else {
          setLoading(false);
          return { success: false, message: 'تم الإلغاء' };
        }
      }

      setLoading(false);
      return { success: false, message: 'تم الإلغاء' };
    } catch (err: any) {
      setLoading(false);
      setError(err.message);
      return { success: false, message: 'حدث خطأ. حاول مجدداً' };
    }
  }

  function getSuccessMessage(productId: string): string {
    switch (productId) {
      case PRODUCTS.ELITE_MONTHLY: return 'مرحباً بك في Kalimat Elite! 👑';
      case PRODUCTS.PLUS_MONTHLY: return 'مرحباً بك في كلمات بلس! 🎉';
      case PRODUCTS.REMOVE_ADS: return 'تم إزالة الإعلانات للأبد ✓';
      case PRODUCTS.COINS_100: return 'تم إضافة 100 عملة ✓';
      case PRODUCTS.COINS_300: return 'تم إضافة 300 عملة ✓';
      case PRODUCTS.COINS_800: return 'تم إضافة 800 عملة ✓';
      case PRODUCTS.GEMS_50: return 'تم إضافة 50 جوهرة ✓';
      case PRODUCTS.GEMS_120: return 'تم إضافة 140 جوهرة ✓';
      case PRODUCTS.GEMS_300: return 'تم إضافة 380 جوهرة ✓';
      case PRODUCTS.GEMS_650: return 'تم إضافة 850 جوهرة ✓';
      case PRODUCTS.GEMS_1400: return 'تم إضافة 1900 جوهرة ✓';
      default: return 'تم الشراء بنجاح ✓';
    }
  }

  async function restorePurchases() {
    setLoading(true);
    try {
      const adsVal = await AsyncStorage.getItem(ADS_KEY);
      if (adsVal === 'true') setHasRemovedAds(true);
      if (isPlus || adsVal === 'true') {
        Alert.alert('تم', 'تم استعادة مشترياتك بنجاح');
      } else {
        Alert.alert('تنبيه', 'لا توجد مشتريات سابقة');
      }
    } catch {}
    setLoading(false);
  }

  return {
    isPlus,
    isElite,
    hasRemovedAds,
    coins,
    loading,
    error,
    purchaseProduct,
    restorePurchases,
    deliverMonthlyEliteGems,
    PRODUCTS,
  };
}
