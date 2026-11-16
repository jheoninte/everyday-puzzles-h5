export type RewardPlacement = 'HINT_REWARD' | 'REVIVE_REWARD';

export interface RewardedAdResult {
  rewardGranted: boolean;
}

class AdServiceImpl {
  async showRewardedAd(_placement: RewardPlacement, _isVip = false): Promise<RewardedAdResult> {
    return { rewardGranted: true };
  }
}

export const AdService = new AdServiceImpl();

