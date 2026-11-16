export type MissionConditionType =
  | 'PLAY_ANY_GAMES'
  | 'PLAY_SPECIFIC_GAME'
  | 'NO_MISTAKE_CLEAR'
  | 'NO_HINT_CLEAR'
  | 'SPEED_CLEAR_UNDER_90'
  | 'PLAY_ARCHIVE_PUZZLE';

export interface DailyMissionItem {
  id: string;
  title: string;
  description: string;
  conditionType: MissionConditionType;
  targetGameId?: string;
  targetCount: number;
  currentCount: number;
  rewardXp: number;
  rewardCoins: number;
  isClaimed: boolean;
}

export interface DailyMissionState {
  date: string;
  missions: DailyMissionItem[];
  isBonusChestClaimed: boolean;
}

export type BadgeTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'SPECIAL';

export interface BadgeDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  tier: BadgeTier;
  isSecret?: boolean;
}

export interface UnlockedBadgeRecord {
  badgeId: string;
  unlockedAtDate: string;
}

export interface BadgeState {
  unlocked: Record<string, UnlockedBadgeRecord>;
  stats: {
    totalPuzzlesCleared: number;
    perfectNoMistakeClears: number;
    speedClearsUnder60s: number;
    archivePuzzlesCleared: number;
  };
}

