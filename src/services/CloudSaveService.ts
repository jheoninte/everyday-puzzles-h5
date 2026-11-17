import { Capacitor, registerPlugin } from '@capacitor/core';
import { DeviceStorage, flushDeviceStorage, restoreCloudSnapshot } from './DeviceStorage';
import { isCloudKey, parseCloudSnapshot } from './CloudSnapshot';

export interface CloudRecord { payload: string | null; revision: string | null; }
interface CloudPlugin {
  read(): Promise<CloudRecord>;
  write(options: { payload: string; revision: string | null }): Promise<CloudRecord>;
  openPrivacyPolicy(): Promise<void>;
}
const plugin = registerPlugin<CloudPlugin>('PuzzleCloud');
const backupKey = 'everyday-puzzles-h5:cloud:before-restore';
function snapshotDevice(): string {
  const values: Record<string, string> = {};
  for (const key of DeviceStorage.keys().filter(isCloudKey)) {
    const value = DeviceStorage.getItem(key);
    if (value !== null) values[key] = value;
  }
  const payload = JSON.stringify({ version: 1, savedAt: new Date().toISOString(), values });
  parseCloudSnapshot(payload);
  return payload;
}
export const CloudSaveService = {
  available: Capacitor.getPlatform() === 'ios',
  hasLocalBackup(): boolean {
    try { return DeviceStorage.getItem(backupKey) !== null; } catch { return false; }
  },
  async read(): Promise<CloudRecord> {
    const record = await plugin.read();
    if (record.payload !== null) parseCloudSnapshot(record.payload);
    return record;
  },
  async backup(revision: string | null): Promise<CloudRecord> {
    await flushDeviceStorage();
    const payload = snapshotDevice();
    return plugin.write({ payload, revision });
  },
  async restore(record: CloudRecord): Promise<void> {
    if (!record.payload) throw new Error('No iCloud save was found.');
    parseCloudSnapshot(record.payload);
    DeviceStorage.setItem(backupKey, snapshotDevice());
    await flushDeviceStorage();
    await restoreCloudSnapshot(record.payload);
    window.location.reload();
  },
  async undoRestore(): Promise<void> {
    const raw = DeviceStorage.getItem(backupKey);
    if (!raw) throw new Error('No backup from before your last restore was found.');
    await restoreCloudSnapshot(raw);
    window.location.reload();
  },
  async openPrivacyPolicy(): Promise<void> {
    if (Capacitor.getPlatform() === 'ios') await plugin.openPrivacyPolicy();
    else window.open('https://www.comino.app/girl-privacy', '_blank', 'noopener,noreferrer');
  },
};
