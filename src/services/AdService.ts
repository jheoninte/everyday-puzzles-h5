import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { AdMob, AdmobConsentStatus, InterstitialAdPluginEvents, RewardAdPluginEvents } from '@capacitor-community/admob';
import native from '../../config/native.json';
import { DeviceStorage } from './DeviceStorage';
import { acquireNativeActivity } from './NativeActivity';
import { AdFrequency, adOpportunity, canShowInterstitial } from '../core/meta/AdPolicy';

export type RewardPlacement = 'HINT_REWARD';
export interface RewardedAdResult { rewardGranted: boolean; rewardId?: string; }
const frequencyKey = 'everyday-puzzles-h5:ads:frequency';
export const AD_EVENT = 'puzzle-ad-state';
function loadWithTimeout<T>(operation: Promise<T>, milliseconds = 12_000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('The ad request timed out.')), milliseconds);
    operation.then(resolve, reject).finally(() => window.clearTimeout(timer));
  });
}

class AdServiceImpl {
  readonly available = Capacitor.getPlatform() === 'ios';
  readonly testMode = native.adsMode === 'test';
  privacyOptionsRequired = false;
  private ready = false;
  private initializing: Promise<void> | null = null;
  private interstitialReadyAt = 0;
  private preparing = false;

  initialize(consentLockHeld = false): Promise<void> {
    if (!this.available || this.ready) return Promise.resolve();
    if (!this.initializing) this.initializing = this.initializeSdk(consentLockHeld).finally(() => { this.initializing = null; });
    return this.initializing;
  }
  private async initializeSdk(consentLockHeld: boolean): Promise<void> {
    try {
      let info = await loadWithTimeout(AdMob.requestConsentInfo());
      if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) {
        const release = consentLockHeld ? () => {} : acquireNativeActivity();
        if (!release) return;
        try { info = await AdMob.showConsentForm(); } finally { release(); }
      }
      this.privacyOptionsRequired = info.privacyOptionsRequirementStatus === 'REQUIRED';
      if (!info.canRequestAds) return;
      await AdMob.initialize({ initializeForTesting: this.testMode });
      // Do not request ATT. Requests below explicitly ask for non-personalized ads.
      await AdMob.setApplicationMuted({ muted: true });
      this.ready = true;
    } catch { this.ready = false; }
    finally { window.dispatchEvent(new Event(AD_EVENT)); }
  }
  async openPrivacyOptions(): Promise<void> {
    if (!this.available) throw new Error('Ad privacy choices are available in the iPhone app.');
    const release = acquireNativeActivity();
    if (!release) return;
    try {
      await AdMob.showPrivacyOptionsForm();
      this.ready = false;
      this.interstitialReadyAt = 0;
    } finally { release(); }
    await this.initialize();
  }
  private frequency(): AdFrequency {
    try {
      const raw = DeviceStorage.getItem(frequencyKey);
      if (raw === null) return { lastOpportunity: 0, lastShownAt: 0 };
      const value = JSON.parse(raw) as AdFrequency | null;
      if (value && Number.isInteger(value.lastOpportunity) && value.lastOpportunity >= 0 && Number.isFinite(value.lastShownAt) && value.lastShownAt >= 0) return value;
    } catch { /* Malformed frequency never causes an immediate ad. */ }
    return { lastOpportunity: 0, lastShownAt: Date.now() };
  }
  private saveFrequency(value: AdFrequency): boolean {
    try { DeviceStorage.setItem(frequencyKey, JSON.stringify(value)); return true; } catch { return false; }
  }
  async prepareForResult(totalClears: number, removeAds: boolean): Promise<void> {
    if (!this.available || !this.ready || removeAds || totalClears < 5 || this.preparing) return;
    this.preparing = true;
    try {
      await loadWithTimeout(AdMob.prepareInterstitial({ adId: native.admobIosInterstitialId, isTesting: this.testMode, npa: true }));
      this.interstitialReadyAt = Date.now();
    } catch { this.interstitialReadyAt = 0; }
    finally { this.preparing = false; }
  }
  async onResultExit(totalClears: number, removeAds: boolean): Promise<void> {
    if (!this.available || !this.ready || removeAds) return;
    const frequency = this.frequency();
    const opportunity = adOpportunity(totalClears);
    if (opportunity <= frequency.lastOpportunity) return;
    // Consume each cadence slot even if no ad is ready; never keep retrying on the same result.
    if (!this.saveFrequency({ ...frequency, lastOpportunity: opportunity })) return;
    if (!canShowInterstitial(totalClears, frequency, Date.now(), removeAds) || !this.interstitialReadyAt || Date.now() - this.interstitialReadyAt >= 3_600_000) return;
    const release = acquireNativeActivity();
    if (!release) return;
    const handles: PluginListenerHandle[] = [];
    try {
      await new Promise<void>((resolve, reject) => {
        void (async () => {
          handles.push(await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, resolve));
          handles.push(await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => resolve()));
          handles.push(await AdMob.addListener(InterstitialAdPluginEvents.Showed, () => { this.saveFrequency({ lastOpportunity: opportunity, lastShownAt: Date.now() }); }));
          this.interstitialReadyAt = 0;
          await AdMob.showInterstitial({ adId: native.admobIosInterstitialId });
        })().catch(reject);
      });
    } catch { /* Ads never prevent leaving a result. */ }
    finally { await Promise.allSettled(handles.map((handle) => handle.remove())); release(); }
  }
  async showRewardedAd(_placement: RewardPlacement): Promise<RewardedAdResult> {
    if (!this.available) return { rewardGranted: false };
    const release = acquireNativeActivity();
    if (!release) return { rewardGranted: false };
    const handles: PluginListenerHandle[] = [];
    try {
      await this.initialize(true);
      if (!this.ready) return { rewardGranted: false };
      await loadWithTimeout(AdMob.prepareRewardVideoAd({ adId: native.admobIosRewardedId, isTesting: this.testMode, npa: true }));
      // The SDK promise is the single reward source. The Rewarded listener is deliberately unused.
      let dismissed!: () => void;
      const closed = new Promise<void>((resolve) => { dismissed = resolve; });
      handles.push(await AdMob.addListener(RewardAdPluginEvents.Dismissed, dismissed));
      handles.push(await AdMob.addListener(RewardAdPluginEvents.FailedToShow, dismissed));
      await AdMob.showRewardVideoAd({ adId: native.admobIosRewardedId });
      await closed;
      return { rewardGranted: true, rewardId: crypto.randomUUID() };
    } catch { return { rewardGranted: false }; }
    finally { await Promise.allSettled(handles.map((handle) => handle.remove())); release(); }
  }
}
export const AdService = new AdServiceImpl();
