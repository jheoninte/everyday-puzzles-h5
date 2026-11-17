import { AppProgressState, createAppProgress } from '../core/meta/ProgressManager';
import { BasePuzzleState } from '../core/games/BasePuzzleEngine';
import { DeviceStorage } from './DeviceStorage';

const STORAGE_PREFIX = 'everyday-puzzles-h5';

function getPuzzleStateKey(puzzleId: string): string {
  return `${STORAGE_PREFIX}:puzzle:${puzzleId}`;
}

function getAppProgressKey(date: string): string {
  return `${STORAGE_PREFIX}:app:${date}`;
}

function readJson<T>(key: string): T | null {
  try {
    if (typeof window === 'undefined') return null;
    const rawValue = DeviceStorage.getItem(key);
    return rawValue ? (JSON.parse(rawValue) as T) : null;
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    if (typeof window === 'undefined') return;
    DeviceStorage.setItem(key, JSON.stringify(value));
  } catch {
  }
}

export function loadPuzzleState<TState>(puzzleId: string): TState | null {
  return readJson<TState>(getPuzzleStateKey(puzzleId));
}

export function savePuzzleState<TState>(puzzleId: string, state: TState): void {
  writeJson(getPuzzleStateKey(puzzleId), state);
}

export function clearPuzzleState(puzzleId: string): void {
  removeItem(getPuzzleStateKey(puzzleId));
}

export function loadAttemptHistory(puzzleId: string): { elapsedSeconds: number; mistakeCount: number; hintsUsed: number } {
  const empty = { elapsedSeconds: 0, mistakeCount: 0, hintsUsed: 0 };
  const saved = readJson<typeof empty>(`${STORAGE_PREFIX}:attempt:${puzzleId}`);
  if (!saved || !Object.keys(empty).every((key) => {
    const value = saved[key as keyof typeof empty];
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
  })) return empty;
  return saved;
}

export function restartPuzzle(puzzleId: string): void {
  const state = loadPuzzleState<BasePuzzleState>(puzzleId);
  if (state?.status === 'LOST') {
    const history = loadAttemptHistory(puzzleId);
    writeJson(`${STORAGE_PREFIX}:attempt:${puzzleId}`, {
      elapsedSeconds: history.elapsedSeconds + state.elapsedSeconds,
      mistakeCount: history.mistakeCount + state.mistakeCount,
      hintsUsed: history.hintsUsed + state.hintsUsed,
    });
  } else if (state?.status === 'WON') {
    removeItem(`${STORAGE_PREFIX}:attempt:${puzzleId}`);
  }
  clearPuzzleState(puzzleId);
}

export function loadAppProgress(date: string): AppProgressState | null {
  const saved = readJson<AppProgressState>(getAppProgressKey(date));
  if (!saved || saved.missionState?.date !== date || !Array.isArray(saved.missionState.missions) || !saved.badgeState?.stats || !saved.badgeState.unlocked) return null;

  const defaults = createAppProgress(date);
  const legacyCompleted = ['password', 'hashtag', 'anygram', 'sudoku']
    .map((gameId) => `${date}-${gameId}`)
    .filter((puzzleId) => loadPuzzleState<{ status: string }>(puzzleId)?.status === 'WON')
    .slice(0, Math.max(0, saved.solvedCount || 0));
  const completedPuzzleIds = Array.isArray(saved.completedPuzzleIds)
    ? [...new Set(saved.completedPuzzleIds.filter((puzzleId) => typeof puzzleId === 'string' && puzzleId.startsWith(`${date}-`)))]
    : legacyCompleted;

  return {
    ...defaults,
    ...saved,
    completedPuzzleIds,
    solvedCount: completedPuzzleIds.length,
    totalXp: Number.isFinite(saved.totalXp) ? saved.totalXp : 0,
    coins: Number.isFinite(saved.coins) ? saved.coins : 0,
  };
}

export function saveAppProgress(date: string, progress: AppProgressState): void {
  writeJson(getAppProgressKey(date), progress);
}

export function clearAppProgress(date: string): void {
  removeItem(getAppProgressKey(date));
}

function removeItem(key: string): void {
  try {
    if (typeof window !== 'undefined') DeviceStorage.removeItem(key);
  } catch {
  }
}
