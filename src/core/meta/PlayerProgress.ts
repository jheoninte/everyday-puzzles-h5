import { BasePuzzleState, PuzzleReward } from '../games/BasePuzzleEngine';
import { BadgeState } from '../types/MissionAndBadgeTypes';
import { GAME_IDS, GameId } from '../types/PuzzlePackTypes';
import { BadgeManager } from './BadgeManager';

export interface PlayStats {
  elapsedSeconds: number;
  mistakeCount: number;
  hintsUsed: number;
}

export interface PuzzleRecord {
  packId: string;
  gameId: GameId;
  firstClear: PlayStats | null;
  best: PlayStats | null;
}

export interface PlayerProgress {
  version: 2;
  totalXp: number;
  records: Record<string, PuzzleRecord>;
  claimedPackGoals: Record<string, number[]>;
  badgeState: BadgeState;
  lastPlayed: { packId: string; gameId: GameId } | null;
}

export const PACK_GOALS = [
  { count: 1, xp: 30 },
  { count: 3, xp: 50 },
  { count: 4, xp: 80 },
];

export function createPlayerProgress(): PlayerProgress {
  return { version: 2, totalXp: 0, records: {}, claimedPackGoals: {}, badgeState: BadgeManager.createInitialState(), lastPlayed: null };
}

export function countPackClears(progress: PlayerProgress, packId: string): number {
  return GAME_IDS.filter((gameId) => progress.records[`${packId}-${gameId}`]).length;
}

export function compareRecords(left: PlayStats, right: PlayStats): number {
  return Number(left.hintsUsed > 0) - Number(right.hintsUsed > 0) ||
    left.mistakeCount - right.mistakeCount || left.elapsedSeconds - right.elapsedSeconds;
}

export function recordPlayerClear(
  progress: PlayerProgress, packId: string, gameId: GameId,
  state: BasePuzzleState, reward: PuzzleReward, todayDate: string,
): PlayerProgress {
  if (state.status !== 'WON') return progress;
  const puzzleId = `${packId}-${gameId}`;
  const stats: PlayStats = { elapsedSeconds: state.elapsedSeconds, mistakeCount: state.mistakeCount, hintsUsed: state.hintsUsed };
  const existing = progress.records[puzzleId];
  if (existing) {
    if (existing.best && compareRecords(stats, existing.best) >= 0) return progress;
    return { ...progress, records: { ...progress.records, [puzzleId]: { ...existing, best: stats } } };
  }
  const records = { ...progress.records, [puzzleId]: { packId, gameId, firstClear: stats, best: stats } };
  const cleared = countPackClears({ ...progress, records }, packId);
  const previousGoals = progress.claimedPackGoals[packId] ?? [];
  const newGoals = PACK_GOALS.filter((goal) => cleared >= goal.count && !previousGoals.includes(goal.count));
  return {
    ...progress,
    records,
    totalXp: progress.totalXp + reward.totalXp + newGoals.reduce((total, goal) => total + goal.xp, 0),
    claimedPackGoals: { ...progress.claimedPackGoals, [packId]: [...previousGoals, ...newGoals.map((goal) => goal.count)] },
    badgeState: BadgeManager.evaluateBadges(progress.badgeState, {
      gameId, puzzleDate: todayDate, todayDate, ...stats,
    }, 1, cleared === GAME_IDS.length).state,
  };
}
