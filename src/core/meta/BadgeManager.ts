import { BadgeDefinition, BadgeState } from '../types/MissionAndBadgeTypes';
import { PuzzlePlayEvent } from './MissionEngine';

export const BADGE_CATALOG: BadgeDefinition[] = [
  { id: 'first_step', title: '첫걸음 (First Step)', description: '첫 번째 미니퍼즐을 성공적으로 클리어했습니다.', icon: '🌱', tier: 'BRONZE' },
  { id: 'daily_grand_slam', title: '데일리 그랜드슬램', description: '하루에 준비된 4종의 미니게임을 모두 올클리어했습니다.', icon: '👑', tier: 'GOLD' },
  { id: 'streak_7_days', title: '일주일의 불꽃', description: '7일 연속 플레이 스트릭을 달성했습니다.', icon: '🔥', tier: 'SILVER' },
  { id: 'streak_30_days', title: '불멸의 퍼즐러', description: '30일 연속 플레이 스트릭을 달성했습니다.', icon: '🌋', tier: 'GOLD' },
  { id: 'sniper_5', title: '무결점 스나이퍼', description: '단 한 번의 실수도 없이 퍼즐을 통산 5회 클리어했습니다.', icon: '🎯', tier: 'SILVER' },
  { id: 'lightning_brain', title: '섬광의 두뇌 (Secret)', description: '60초 이내에 힌트 없이 퍼즐을 클리어했습니다.', icon: '⚡', tier: 'SPECIAL', isSecret: true },
  { id: 'time_traveler', title: '아카이브 탐험가', description: '지난 날짜의 퍼즐을 통산 3회 클리어했습니다.', icon: '⏳', tier: 'BRONZE' },
  { id: 'puzzle_centurion', title: '백전노장', description: '누적 50개의 미니퍼즐을 클리어했습니다.', icon: '🏆', tier: 'GOLD' },
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
    if (event.puzzleDate !== event.todayDate) state.stats.archivePuzzlesCleared += 1;

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

