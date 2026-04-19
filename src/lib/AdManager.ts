import { Platform } from 'react-native';
import { PlayerPhase } from './PlayerPhase';

// Ad reward amount
const REWARDED_COINS = 10;
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between rewarded ads

class AdManager {
  private lastRewardedTime = 0;
  private initialized = false;
  private nativeAds: any = null;

  async initialize() {
    if (this.initialized) return;
    this.initialized = true;

    // Try to load native ads module (only works in production builds)
    if (Platform.OS !== 'web') {
      try {
        this.nativeAds = require('react-native-google-mobile-ads');
        await this.nativeAds.MobileAds().initialize();
        console.log('AdMob initialized');
      } catch {
        console.log('AdMob not available — using simulated ads');
        this.nativeAds = null;
      }
    }
  }

  isRewardedReady(): boolean {
    const now = Date.now();
    if (now - this.lastRewardedTime < COOLDOWN_MS) return false;
    return true;
  }

  getCooldownRemaining(): number {
    const elapsed = Date.now() - this.lastRewardedTime;
    if (elapsed >= COOLDOWN_MS) return 0;
    return Math.ceil((COOLDOWN_MS - elapsed) / 1000);
  }

  /**
   * Show a rewarded ad. In dev/web mode, simulates a 2-second "ad".
   * Returns true if user earned the reward, false if skipped/failed.
   */
  async showRewarded(): Promise<boolean> {
    if (await PlayerPhase.isPhase1()) return false;
    if (!this.isRewardedReady()) return false;

    // Native ads available — use real AdMob
    if (this.nativeAds) {
      try {
        return await this.showNativeRewarded();
      } catch {
        // Fall through to simulated
      }
    }

    // Simulated ad for dev/web
    return new Promise((resolve) => {
      // Simulate a 2-second ad view
      setTimeout(() => {
        this.lastRewardedTime = Date.now();
        resolve(true);
      }, 2000);
    });
  }

  private async showNativeRewarded(): Promise<boolean> {
    const { RewardedAd, RewardedAdEventType, AdEventType, TestIds } = this.nativeAds;
    const adUnitId = __DEV__ ? TestIds.REWARDED : Platform.select({
      android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // Replace before publish
      ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
    });

    return new Promise((resolve) => {
      const ad = RewardedAd.createForAdRequest(adUnitId!);
      let rewarded = false;

      ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        ad.show();
      });

      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        rewarded = true;
        this.lastRewardedTime = Date.now();
      });

      ad.addAdEventListener(AdEventType.CLOSED, () => {
        resolve(rewarded);
      });

      ad.addAdEventListener(AdEventType.ERROR, () => {
        resolve(false);
      });

      ad.load();

      // Timeout after 15 seconds
      setTimeout(() => resolve(false), 15000);
    });
  }

  /**
   * Show an interstitial ad (no reward). Only for non-Plus users.
   * In dev mode, does nothing.
   */
  async showInterstitial(): Promise<void> {
    if (!(await PlayerPhase.shouldShowAds())) return; // no ads before phase 3
    if (!this.nativeAds) return; // skip in dev
    // Implementation for production builds
  }

  get REWARD_AMOUNT() { return REWARDED_COINS; }
}

export const adManager = new AdManager();
