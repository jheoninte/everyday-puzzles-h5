import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { isCloudKey, parseCloudSnapshot } from './CloudSnapshot';

const native = Capacitor.isNativePlatform();
const prefix = 'everyday-puzzles-h5:';
const cache = new Map<string, string>();
let ready = !native;
let pending: Promise<void> = Promise.resolve();
let notice: string | null = null;
let writeFailed = false;
const restoreKey = prefix + 'cloud:restore-journal';

async function writeRestore(raw: string): Promise<void> {
  const snapshot = parseCloudSnapshot(raw);
  const { keys } = await Preferences.keys();
  for (const key of keys.filter(isCloudKey)) {
    if (!(key in snapshot.values)) await Preferences.remove({ key });
  }
  for (const [key, value] of Object.entries(snapshot.values)) await Preferences.set({ key, value });
  await Preferences.remove({ key: restoreKey });
}

export function getDeviceStorageNotice(): string | null { return notice; }
function enqueue(operation: () => Promise<void>) {
  pending = pending.then(operation).catch(() => {
    writeFailed = true;
    notice = 'Unable to save on this device. Check available storage before closing the app.';
    window.dispatchEvent(new Event('puzzle-storage-error'));
  });
}
export async function initializeDeviceStorage(): Promise<void> {
  if (!native || ready) return;
  const journal = (await Preferences.get({ key: restoreKey })).value;
  if (journal) await writeRestore(journal);
  // Hydrate before rendering. A read failure must not overwrite existing native saves.
  const { keys } = await Preferences.keys();
  const saved = await Promise.all(keys.filter((key) => key.startsWith(prefix)).map(async (key) => [key, (await Preferences.get({ key })).value] as const));
  for (const [key, value] of saved) if (value !== null) cache.set(key, value);
  ready = true;
}
export async function flushDeviceStorage(): Promise<void> {
  await pending;
  if (writeFailed) throw new Error('Unable to save on this device. Check available storage and restart the app.');
}
export async function restoreCloudSnapshot(raw: string): Promise<void> {
  if (!native) throw new Error('iCloud restore is available in the iPhone app.');
  parseCloudSnapshot(raw);
  await flushDeviceStorage();
  // Journal is durable before replacement. A terminated restore resumes before the next render.
  await Preferences.set({ key: restoreKey, value: raw });
  ready = false;
  try { await writeRestore(raw); }
  catch { throw new Error('Restore was interrupted. Check device storage and restart the app to resume restoring.'); }
  cache.clear();
  await initializeDeviceStorage();
}
export const DeviceStorage = {
  getItem(key: string): string | null {
    if (!ready) throw new Error('Device storage is not ready.');
    return native ? cache.get(key) ?? null : window.localStorage.getItem(key);
  },
  setItem(key: string, value: string): void {
    if (!ready) throw new Error('Device storage is not ready.');
    if (!native) { window.localStorage.setItem(key, value); return; }
    cache.set(key, value);
    enqueue(() => Preferences.set({ key, value }));
  },
  removeItem(key: string): void {
    if (!ready) throw new Error('Device storage is not ready.');
    if (!native) { window.localStorage.removeItem(key); return; }
    cache.delete(key);
    enqueue(() => Preferences.remove({ key }));
  },
  keys(): string[] {
    if (!ready) throw new Error('Device storage is not ready.');
    return native ? [...cache.keys()] : Object.keys(window.localStorage);
  },
};
