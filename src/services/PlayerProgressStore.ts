import { PlayerProgress, PlayStats, createPlayerProgress, countPackClears, PACK_GOALS } from '../core/meta/PlayerProgress';
import { BasePuzzleState } from '../core/games/BasePuzzleEngine';
import { GAME_IDS, PackEntry } from '../core/types/PuzzlePackTypes';
import { loadAppProgress, loadPuzzleState } from './LocalProgressStore';
import { DeviceStorage, getDeviceStorageNotice } from './DeviceStorage';

export const PLAYER_PROGRESS_KEY = 'everyday-puzzles-h5:player:v2';
let memoryProgress: PlayerProgress | null = null;
let storageNotice: string | null = null;
let memoryOnly = false;
let pending: Promise<unknown> = Promise.resolve();

export function getStorageNotice(): string | null {
  return getDeviceStorageNotice() ?? storageNotice;
}

function isStats(value: unknown): value is PlayStats | null {
  if (value === null) return true;
  if (!value || typeof value !== 'object') return false;
  return ['elapsedSeconds', 'mistakeCount', 'hintsUsed'].every((key) => {
    const count = (value as Record<string, unknown>)[key];
    return typeof count === 'number' && Number.isFinite(count) && count >= 0;
  });
}

export function isProgress(value: unknown): value is PlayerProgress {
  if (!value || typeof value !== 'object') return false;
  const profile = value as PlayerProgress;
  return profile.version === 2 && Number.isFinite(profile.totalXp) && profile.totalXp >= 0 &&
    Boolean(profile.records && typeof profile.records === 'object' && !Array.isArray(profile.records) && profile.claimedPackGoals && typeof profile.claimedPackGoals === 'object' &&
      !Array.isArray(profile.claimedPackGoals) && profile.badgeState?.unlocked && typeof profile.badgeState.unlocked === 'object' &&
      !Array.isArray(profile.badgeState.unlocked) && profile.badgeState.stats) &&
    Object.values(profile.badgeState.unlocked).every((badge) => badge && typeof badge.badgeId === 'string' && typeof badge.unlockedAtDate === 'string') &&
    Object.keys(createPlayerProgress().badgeState.stats).every((key) => {
      const count = profile.badgeState.stats[key as keyof typeof profile.badgeState.stats];
      return typeof count === 'number' && Number.isFinite(count) && count >= 0;
    }) &&
    Object.entries(profile.records).every(([id, record]) => record &&
      typeof record.packId === 'string' && GAME_IDS.includes(record.gameId) &&
      id === `${record.packId}-${record.gameId}` && isStats(record.firstClear) && isStats(record.best)) &&
    Object.values(profile.claimedPackGoals).every((goals) => Array.isArray(goals) && goals.every((goal) => [1, 3, 4].includes(goal))) &&
    (profile.lastPlayed === null || Boolean(profile.lastPlayed && typeof profile.lastPlayed.packId === 'string' && GAME_IDS.includes(profile.lastPlayed.gameId)));
}

function readProfile(): PlayerProgress | null {
  if (memoryOnly && memoryProgress) return memoryProgress;
  let raw: string | null;
  try {
    raw = DeviceStorage.getItem(PLAYER_PROGRESS_KEY);
  } catch {
    storageNotice = 'Saving is unavailable in this environment. Progress may be lost when you close this window.';
    return memoryProgress;
  }
  if (raw === null) return null;
  try {
    const profile: unknown = JSON.parse(raw);
    if (!isProgress(profile)) throw new Error('invalid profile');
    return profile;
  } catch {
    throw new Error('Unable to read your saved progress. Your original save is preserved. Check for an app update, or reset progress in Settings.');
  }
}

function persist(profile: PlayerProgress): void {
  memoryProgress = profile;
  try {
    DeviceStorage.setItem(PLAYER_PROGRESS_KEY, JSON.stringify(profile));
    memoryOnly = false;
    storageNotice = null;
  } catch {
    memoryOnly = true;
    storageNotice = 'Unable to save progress. Check available storage and browser settings.';
  }
}

export function loadPlayerProgress(packs: PackEntry[]): PlayerProgress {
  const saved = readProfile();
  if (saved) {
    memoryProgress = saved;
    return saved;
  }
  const profile = createPlayerProgress();
  for (const pack of packs) {
    const legacy = loadAppProgress(pack.id);
    if (!legacy) continue;
    profile.totalXp += legacy.totalXp;
    Object.assign(profile.badgeState.unlocked, legacy.badgeState.unlocked);
    for (const key of Object.keys(profile.badgeState.stats) as Array<keyof typeof profile.badgeState.stats>) {
      profile.badgeState.stats[key] += legacy.badgeState.stats[key] || 0;
    }
    for (const gameId of GAME_IDS) {
      const puzzleId = `${pack.id}-${gameId}`;
      if (!legacy.completedPuzzleIds.includes(puzzleId)) continue;
      const state = loadPuzzleState<BasePuzzleState>(puzzleId);
      const stats: PlayStats | null = state?.status === 'WON' && isStats(state)
        ? { elapsedSeconds: state.elapsedSeconds, hintsUsed: state.hintsUsed, mistakeCount: state.mistakeCount }
        : null;
      profile.records[puzzleId] = { packId: pack.id, gameId, firstClear: stats, best: stats };
    }
    const cleared = countPackClears(profile, pack.id);
    profile.claimedPackGoals[pack.id] = PACK_GOALS.filter((goal) => cleared >= goal.count).map((goal) => goal.count);
  }
  persist(profile);
  return profile;
}

export function updatePlayerProgress(packs: PackEntry[], update: (current: PlayerProgress) => PlayerProgress): Promise<PlayerProgress> {
  return queueOperation(() => {
    const current = loadPlayerProgress(packs);
    const next = update(current);
    if (next !== current) persist(next);
    return next;
  });
}

function queueOperation(run: () => PlayerProgress): Promise<PlayerProgress> {
  const locked = () => typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request(PLAYER_PROGRESS_KEY, run)
    : Promise.resolve(run());
  const operation = pending.then(locked, locked);
  pending = operation.catch(() => {});
  return operation;
}

export function resetPlayerProgress(): Promise<PlayerProgress> {
  return queueOperation(() => {
    try {
      const keys = DeviceStorage.keys().filter((key) =>
        key.startsWith('everyday-puzzles-h5:puzzle:') || key.startsWith('everyday-puzzles-h5:app:') || key.startsWith('everyday-puzzles-h5:attempt:') || key === 'everyday-puzzles-h5:cloud:before-restore',
      );
      keys.forEach((key) => DeviceStorage.removeItem(key));
    } catch {
      storageNotice = 'Unable to reset some saved games. Check your storage settings.';
      throw new Error(storageNotice);
    }
    const profile = createPlayerProgress();
    persist(profile);
    return profile;
  });
}
