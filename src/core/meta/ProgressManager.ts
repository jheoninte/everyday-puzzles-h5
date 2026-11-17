import { BasePuzzleState, PuzzleReward } from '../games/BasePuzzleEngine';
import { BadgeState, DailyMissionState } from '../types/MissionAndBadgeTypes';
import { BadgeManager } from './BadgeManager';
import { MissionEngine, PuzzlePlayEvent } from './MissionEngine';

export interface AppProgressState {
  solvedCount: number;
  completedPuzzleIds: string[];
  totalXp: number;
  coins: number;
  missionState: DailyMissionState;
  badgeState: BadgeState;
}

export function createAppProgress(date: string): AppProgressState {
  return {
    solvedCount: 0,
    completedPuzzleIds: [],
    totalXp: 0,
    coins: 0,
    missionState: MissionEngine.generateDailyMissions(date),
    badgeState: BadgeManager.createInitialState(),
  };
}

export function recordPuzzleClear(
  progress: AppProgressState,
  event: PuzzlePlayEvent,
  state: BasePuzzleState,
  reward: PuzzleReward,
): AppProgressState {
  const puzzleId = `${event.puzzleDate}-${event.gameId}`;
  if (state.status !== 'WON' || progress.missionState.date !== event.puzzleDate || progress.completedPuzzleIds.includes(puzzleId)) {
    return progress;
  }

  const completedPuzzleIds = [...progress.completedPuzzleIds, puzzleId];
  const allDailyCleared = event.puzzleDate === event.todayDate &&
    ['password', 'hashtag', 'anygram', 'sudoku'].every((gameId) => completedPuzzleIds.includes(`${event.puzzleDate}-${gameId}`));

  return {
    ...progress,
    completedPuzzleIds,
    solvedCount: completedPuzzleIds.length,
    totalXp: progress.totalXp + reward.totalXp,
    coins: progress.coins + reward.coinsEarned,
    missionState: MissionEngine.evaluateOnPuzzleClear(progress.missionState, event).state,
    badgeState: BadgeManager.evaluateBadges(progress.badgeState, event, 1, allDailyCleared).state,
  };
}

export function claimProgressReward(progress: AppProgressState, missionId?: string): AppProgressState {
  const result = missionId === undefined
    ? MissionEngine.claimBonusChest(progress.missionState)
    : MissionEngine.claimMissionReward(progress.missionState, missionId);
  if (!result.success) return progress;

  return {
    ...progress,
    missionState: result.state,
    totalXp: progress.totalXp + result.rewardXp,
    coins: progress.coins + result.rewardCoins,
  };
}
