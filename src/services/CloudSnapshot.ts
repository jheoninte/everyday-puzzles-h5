import { isProgress } from './PlayerProgressStore';

export const CLOUD_LIMIT = 700_000;
export interface CloudSnapshot { version: 1; savedAt: string; values: Record<string, string>; }
export function isCloudKey(key: string): boolean {
  return key === 'everyday-puzzles-h5:player:v2' || /^everyday-puzzles-h5:(puzzle|attempt|app):[^\s]{1,150}$/.test(key);
}
export function parseCloudSnapshot(raw: string): CloudSnapshot {
  if (new TextEncoder().encode(raw).length > CLOUD_LIMIT) throw new Error('Your save exceeds the supported iCloud save size.');
  const value = JSON.parse(raw) as CloudSnapshot;
  if (!value || value.version !== 1 || !Number.isFinite(Date.parse(value.savedAt)) || !value.values ||
      typeof value.values !== 'object' || Array.isArray(value.values) || Object.keys(value.values).length > 1500) throw new Error('This save format is not supported.');
  if (!isProgress(JSON.parse(value.values['everyday-puzzles-h5:player:v2'] ?? 'null'))) throw new Error('Unable to validate this player profile.');
  for (const [key, rawValue] of Object.entries(value.values)) {
    if (!isCloudKey(key) || typeof rawValue !== 'string') throw new Error('This save contains an invalid entry.');
    const entry: unknown = JSON.parse(rawValue);
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('This save contains invalid game progress.');
  }
  return value;
}
