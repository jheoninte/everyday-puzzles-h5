import { DailyMissionItem, DailyMissionState } from '../types/MissionAndBadgeTypes';

export interface PuzzlePlayEvent {
  gameId: string;
  puzzleDate: string;
  todayDate: string;
  mistakeCount: number;
  hintsUsed: number;
  elapsedSeconds: number;
}

export class MissionEngine {
  public static generateDailyMissions(todayDate: string): DailyMissionState {
    const daySeed = this.hashDate(todayDate);

    const easyPool: Omit<DailyMissionItem, 'currentCount' | 'isClaimed'>[] = [
      {
        id: ${todayDate}-m1,
        title: '오늘의 두뇌 워밍업',
        description: '아무 미니게임이나 1판 클리어하기',
        conditionType: 'PLAY_ANY_GAMES',
        targetCount: 1,
        rewardXp: 30,
        rewardCoins: 15,
      },
      {
        id: ${todayDate}-m1,
        title: '단어 추론가',
        description: 'Password 미니게임 1판 클리어하기',
        conditionType: 'PLAY_SPECIFIC_GAME',
        targetGameId: 'password',
        targetCount: 1,
        rewardXp: 35,
        rewardCoins: 15,
      },
      {
        id: ${todayDate}-m1,
        title: '와플 마스터',
        description: 'Hashtag 미니게임 1판 클리어하기',
        conditionType: 'PLAY_SPECIFIC_GAME',
        targetGameId: 'hashtag',
        targetCount: 1,
        rewardXp: 35,
        rewardCoins: 15,
      },
    ];

    const skillPool: Omit<DailyMissionItem, 'currentCount' | 'isClaimed'>[] = [
      {
        id: ${todayDate}-m2,
        title: '완벽주의자',
        description: '실수 없이 퍼즐 1판 클리어하기',
        conditionType: 'NO_MISTAKE_CLEAR',
        targetCount: 1,
        rewardXp: 50,
        rewardCoins: 25,
      },
      {
        id: ${todayDate}-m2,
        title: '자력 해결사',
        description: '힌트를 쓰지 않고 퍼즐 2판 클리어하기',
        conditionType: 'NO_HINT_CLEAR',
        targetCount: 2,
        rewardXp: 60,
        rewardCoins: 30,
      },
      {
        id: ${todayDate}-m2,
        title: '번개 같은 두뇌',
        description: '90초 이내에 퍼즐 1판 클리어하기',
        conditionType: 'SPEED_CLEAR_UNDER_90',
        targetCount: 1,
        rewardXp: 55,
        rewardCoins: 25,
      },
    ];

    const challengePool: Omit<DailyMissionItem, 'currentCount' | 'isClaimed'>[] = [
      {
        id: ${todayDate}-m3,
        title: '데일리 그랜드슬램',
        description: '오늘 미니게임 3판 이상 클리어하기',
        conditionType: 'PLAY_ANY_GAMES',
        targetCount: 3,
        rewardXp: 80,
        rewardCoins: 40,
      },
      {
        id: ${todayDate}-m3,
        title: '시간 여행자',
        description: '지난 날짜 아카이브 퍼즐 1판 클리어하기',
        conditionType: 'PLAY_ARCHIVE_PUZZLE',
        targetCount: 1,
        rewardXp: 70,
        rewardCoins: 35,
      },
    ];

    const selected = [
      easyPool[daySeed % easyPool.length],
      skillPool[(daySeed >> 2) % skillPool.length],
      challengePool[(daySeed >> 4) % challengePool.length],
    ];

    return {
      date: todayDate,
      missions: selected.map((mission) => ({ ...mission, currentCount: 0, isClaimed: false })),
      isBonusChestClaimed: false,
    };
  }

  public static evaluateOnPuzzleClear(
    currentState: DailyMissionState,
    event: PuzzlePlayEvent,
  ): { state: DailyMissionState; newlyCompletedMissions: DailyMissionItem[] } {
    const state = JSON.parse(JSON.stringify(currentState)) as DailyMissionState;
    const newlyCompletedMissions: DailyMissionItem[] = [];

    for (const mission of state.missions) {
      if (mission.currentCount >= mission.targetCount) continue;
      let matched = false;

      switch (mission.conditionType) {
        case 'PLAY_ANY_GAMES':
          matched = true;
          break;
        case 'PLAY_SPECIFIC_GAME':
          matched = event.gameId === mission.targetGameId;
          break;
        case 'NO_MISTAKE_CLEAR':
          matched = event.mistakeCount === 0;
          break;
        case 'NO_HINT_CLEAR':
          matched = event.hintsUsed === 0;
          break;
        case 'SPEED_CLEAR_UNDER_90':
          matched = event.elapsedSeconds <= 90;
          break;
        case 'PLAY_ARCHIVE_PUZZLE':
          matched = event.puzzleDate !== event.todayDate;
          break;
      }

      if (!matched) continue;

      mission.currentCount = Math.min(mission.targetCount, mission.currentCount + 1);
      if (mission.currentCount >= mission.targetCount) {
        newlyCompletedMissions.push(mission);
      }
    }

    return { state, newlyCompletedMissions };
  }

  public static claimMissionReward(
    currentState: DailyMissionState,
    missionId: string,
  ): { success: boolean; rewardXp: number; rewardCoins: number; state: DailyMissionState } {
    const state = JSON.parse(JSON.stringify(currentState)) as DailyMissionState;
    const target = state.missions.find((mission) => mission.id === missionId);

    if (!target || target.isClaimed || target.currentCount < target.targetCount) {
      return { success: false, rewardXp: 0, rewardCoins: 0, state };
    }

    target.isClaimed = true;
    return { success: true, rewardXp: target.rewardXp, rewardCoins: target.rewardCoins, state };
  }

  public static claimBonusChest(
    currentState: DailyMissionState,
  ): { success: boolean; rewardXp: number; rewardCoins: number; state: DailyMissionState } {
    const state = JSON.parse(JSON.stringify(currentState)) as DailyMissionState;
    const allClaimed = state.missions.every((mission) => mission.isClaimed);

    if (!allClaimed || state.isBonusChestClaimed) {
      return { success: false, rewardXp: 0, rewardCoins: 0, state };
    }

    state.isBonusChestClaimed = true;
    return { success: true, rewardXp: 50, rewardCoins: 50, state };
  }

  private static hashDate(value: string): number {
    return value.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  }
}

