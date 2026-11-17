export interface AdFrequency { lastOpportunity: number; lastShownAt: number; }
export function adOpportunity(totalClears: number): number { return Math.max(0, Math.floor((totalClears - 2) / 3)); }
export function canShowInterstitial(totalClears: number, frequency: AdFrequency, now: number, removeAds: boolean): boolean {
  return !removeAds && adOpportunity(totalClears) > frequency.lastOpportunity &&
    (frequency.lastShownAt === 0 || now - frequency.lastShownAt >= 180_000);
}
