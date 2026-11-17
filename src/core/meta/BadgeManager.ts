import { BadgeDefinition, BadgeState } from '../types/MissionAndBadgeTypes';
import { PuzzlePlayEvent } from './MissionEngine';

export const BADGE_CATALOG: BadgeDefinition[] = [
  { id: 'first_step', title: 'First Step', description: 'Solve your first puzzle.', icon: '🌱', tier: 'BRONZE' },
  { id: 'daily_grand_slam', title: 'Pack Master', description: 'Solve all four games in a pack.', icon: '👑', tier: 'GOLD' },
  { id: 'streak_7_days', title: 'A Week of Sparks', description: 'Reach a seven-day playing streak.', icon: '🔥', tier: 'SILVER' },
  { id: 'streak_30_days', title: 'Unstoppable Puzzler', description: 'Reach a 30-day playing streak.', icon: '🌋', tier: 'GOLD' },
  { id: 'sniper_5', title: 'Perfect Aim', description: 'Solve five puzzles without a mistake.', icon: '🎯', tier: 'SILVER' },
  { id: 'lightning_brain', title: 'Lightning Mind', description: 'Solve a puzzle in 60 seconds or less without hints.', icon: '⚡', tier: 'SPECIAL', isSecret: true },
  { id: 'time_traveler', title: 'Archive Explorer', description: 'Solve three puzzles from the archive.', icon: '⏳', tier: 'BRONZE' },
  { id: 'puzzle_centurion', title: 'Puzzle Veteran', description: 'Solve 50 puzzles.', icon: '🏆', tier: 'GOLD' },
];

export class BadgeManager {
  public static createInitialState(): BadgeState {
    return {
      unlocked: {},
      stats: {
        totalPuzzlesCleared: 0,
        perfectNoMistakeClears: 0,
        speedClearsUnder60s: 0,
        archivePuzzlesCleared: 0,
      },
    };
  }

  public static evaluateBadges(
    currentState: BadgeState,
    event: PuzzlePlayEvent,
    currentStreak: number,
    isAllDailyClearedToday: boolean,
  ): { state: BadgeState; newlyUnlockedBadges: BadgeDefinition[] } {
    const state = JSON.parse(JSON.stringify(currentState)) as BadgeState;
    const newlyUnlockedBadges: BadgeDefinition[] = [];

    state.stats.totalPuzzlesCleared += 1;
    if (event.mistakeCount === 0) state.stats.perfectNoMistakeClears += 1;
    if (event.elapsedSeconds <= 60 && event.hintsUsed === 0) state.stats.speedClearsUnder60s += 1;
    if (event.puzzleDate < event.todayDate) state.stats.archivePuzzlesCleared += 1;

    const tryUnlock = (badgeId: string, condition: boolean) => {
      if (!condition || state.unlocked[badgeId]) return;
      state.unlocked[badgeId] = { badgeId, unlockedAtDate: event.todayDate };
      const badge = BADGE_CATALOG.find((entry) => entry.id === badgeId);
      if (badge) newlyUnlockedBadges.push(badge);
    };

    tryUnlock('first_step', state.stats.totalPuzzlesCleared >= 1);
    tryUnlock('daily_grand_slam', isAllDailyClearedToday);
    tryUnlock('streak_7_days', currentStreak >= 7);
    tryUnlock('streak_30_days', currentStreak >= 30);
    tryUnlock('sniper_5', state.stats.perfectNoMistakeClears >= 5);
    tryUnlock('lightning_brain', state.stats.speedClearsUnder60s >= 1);
    tryUnlock('time_traveler', state.stats.archivePuzzlesCleared >= 3);
    tryUnlock('puzzle_centurion', state.stats.totalPuzzlesCleared >= 50);

    return { state, newlyUnlockedBadges };
  }
}

