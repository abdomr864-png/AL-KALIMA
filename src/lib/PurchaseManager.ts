let InAppPurchases: any = null;
try {
  InAppPurchases = require('expo-in-app-purchases');
} catch {
  // Not available in Expo Go / dev builds without native module
}

// Product IDs — must match App Store Connect and Google Play Console
export const PRODUCTS = {
  PLUS_MONTHLY: 'kalimat_plus_monthly',
  COINS_100: 'kalimat_coins_100',
  COINS_300: 'kalimat_coins_300',
  COINS_800: 'kalimat_coins_800',
  REMOVE_ADS: 'kalimat_remove_ads',
} as const;

export type PurchaseResult =
  | { success: true; productId: string }
  | { success: false; error: string; cancelled?: boolean };

class PurchaseManager {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized || !InAppPurchases) return;
    try {
      await InAppPurchases.connectAsync();
      this.initialized = true;
      console.log('IAP initialized successfully');
    } catch (error) {
      console.log('IAP init failed (normal in development):', error);
    }
  }

  async getProducts(): Promise<any[]> {
    if (!InAppPurchases) return [];
    try {
      const productIds = Object.values(PRODUCTS);
      const { results } = await InAppPurchases.getProductsAsync(productIds);
      return results ?? [];
    } catch (error) {
      console.log('getProducts failed:', error);
      return [];
    }
  }

  async purchase(productId: string): Promise<PurchaseResult> {
    if (!InAppPurchases) {
      return { success: false, error: 'IAP not available' };
    }
    try {
      await InAppPurchases.purchaseItemAsync(productId);

      return new Promise((resolve) => {
        InAppPurchases.setPurchaseListener(({ responseCode, results, errorCode }: any) => {
          if (responseCode === InAppPurchases.IAPResponseCode.OK && results) {
            const purchase = results.find((r: any) => r.productId === productId);
            if (purchase) {
              if (!purchase.acknowledged) {
                InAppPurchases.finishTransactionAsync(purchase, true);
              }
              resolve({ success: true, productId });
            }
          } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
            resolve({ success: false, error: 'cancelled', cancelled: true });
          } else {
            resolve({ success: false, error: `Purchase failed: ${errorCode}` });
          }
        });
      });
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async restorePurchases(): Promise<string[]> {
    if (!InAppPurchases) return [];
    try {
      const { results } = await InAppPurchases.getPurchaseHistoryAsync();
      return results?.map((r: any) => r.productId) ?? [];
    } catch {
      return [];
    }
  }

  async disconnect(): Promise<void> {
    if (!InAppPurchases) return;
    try {
      await InAppPurchases.disconnectAsync();
      this.initialized = false;
    } catch {}
  }
}

export const purchaseManager = new PurchaseManager();
