import { Capacitor, registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import native from '../../config/native.json';
import { DeviceStorage } from './DeviceStorage';
import { acquireNativeActivity, ACTIVITY_EVENT, isGameActive } from './NativeActivity';

export interface StoreProduct { id: string; title: string; priceLabel: string; }
interface Entitlement { removeAds: boolean; source: 'cache' | 'storekit'; }
export interface PurchaseResult { status: 'purchased' | 'pending' | 'cancelled'; removeAds?: boolean; }
interface PurchasePlugin {
  getProduct(): Promise<{ product: StoreProduct | null }>;
  getEntitlements(): Promise<Entitlement>;
  purchase(options: { productId: string }): Promise<PurchaseResult>;
  restore(): Promise<Entitlement>;
  addListener(event: 'entitlementsChanged', listener: (value: Entitlement) => void): Promise<PluginListenerHandle>;
}
const plugin = registerPlugin<PurchasePlugin>('PuzzlePurchases');
const cacheKey = 'everyday-puzzles-h5:purchase:removeAds';
export const PURCHASE_EVENT = 'puzzle-purchase';

class PurchaseServiceImpl {
  readonly available = Capacitor.getPlatform() === 'ios';
  private entitled = false;
  private initialized: Promise<void> | null = null;

  get removeAds(): boolean { return this.entitled; }
  private accept(value: { removeAds?: boolean }): void {
    if (typeof value.removeAds !== 'boolean') return;
    this.entitled = value.removeAds;
    try { DeviceStorage.setItem(cacheKey, JSON.stringify(this.entitled)); } catch { /* Native StoreKit also caches verified entitlements. */ }
    window.dispatchEvent(new Event(PURCHASE_EVENT));
  }
  initialize(): Promise<void> {
    if (!this.available) return Promise.resolve();
    if (!this.initialized) this.initialized = (async () => {
      try { this.entitled = DeviceStorage.getItem(cacheKey) === 'true'; } catch { /* Preserve native verification path. */ }
      await plugin.addListener('entitlementsChanged', (value) => this.accept(value));
      window.addEventListener(ACTIVITY_EVENT, () => { if (isGameActive()) void this.refresh(); });
      await this.refresh();
    })().catch(() => { this.initialized = null; });
    return this.initialized;
  }
  async refresh(): Promise<void> {
    if (!this.available) return;
    try { this.accept(await plugin.getEntitlements()); } catch { /* Network/bridge failure never revokes an existing entitlement. */ }
  }
  async getProduct(): Promise<StoreProduct | null> {
    if (!this.available) return null;
    const { product } = await plugin.getProduct();
    return product?.id === native.removeAdsProductId ? product : null;
  }
  async purchase(productId: string): Promise<PurchaseResult> {
    if (!this.available) throw new Error('Purchases are available in the iPhone app.');
    if (productId !== native.removeAdsProductId) throw new Error('The product ID does not match.');
    const release = acquireNativeActivity();
    if (!release) throw new Error('Please finish the current operation and try again.');
    try {
      const result = await plugin.purchase({ productId });
      if (result.status === 'purchased') this.accept(result);
      return result;
    } finally { release(); }
  }
  async restore(): Promise<Entitlement> {
    if (!this.available) throw new Error('Restore purchases in the iPhone app while signed in to the App Store.');
    const release = acquireNativeActivity();
    if (!release) throw new Error('Please finish the current operation and try again.');
    try { const value = await plugin.restore(); this.accept(value); return value; }
    finally { release(); }
  }
}
export const PurchaseService = new PurchaseServiceImpl();
