import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Exercise the real storage/service code with durable native storage and a CloudKit boundary mock.
const persisted = new Map();
let failKey = null;
let remote = { payload: null, revision: null };
let nextRevision = 0;
globalThis.window = new EventTarget();
window.location = { reload() {} };
globalThis.__cloudTest = {
  preferences: {
    async keys() { return { keys: [...persisted.keys()] }; },
    async get({ key }) { return { value: persisted.get(key) ?? null }; },
    async set({ key, value }) { if (key === failKey) throw new Error('disk full'); persisted.set(key, value); },
    async remove({ key }) { persisted.delete(key); },
  },
  plugin: {
    async read() { return { ...remote }; },
    async write({ payload, revision }) {
      if (revision !== remote.revision) throw new Error('CLOUD_CONFLICT');
      remote = { payload, revision: String(++nextRevision) };
      return { ...remote };
    },
  },
};
const bundle = await build({
  stdin: { contents: `export * from './src/services/DeviceStorage';
    export * from './src/services/CloudSaveService';
    export * from './src/services/CloudSnapshot';
    export { createPlayerProgress } from './src/core/meta/PlayerProgress';`, resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, write: false, format: 'esm', platform: 'node',
  plugins: [{ name: 'native-boundaries', setup(builder) {
    builder.onResolve({ filter: /^@capacitor\/(core|preferences)$/ }, ({ path }) => ({ path, namespace: 'mock' }));
    builder.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents: path.endsWith('/core')
      ? `export const Capacitor = { isNativePlatform: () => true, getPlatform: () => 'ios' }; export const registerPlugin = () => globalThis.__cloudTest.plugin;`
      : `export const Preferences = globalThis.__cloudTest.preferences;`, loader: 'js' }));
  } }],
});
const source = Buffer.from(bundle.outputFiles[0].text).toString('base64');
let instance = 0;
async function boot() {
  const api = await import(`data:text/javascript;base64,${source}#${instance++}`);
  await api.initializeDeviceStorage();
  return api;
}
const playerKey = 'everyday-puzzles-h5:player:v2';
const puzzleKey = 'everyday-puzzles-h5:puzzle:pack-sudoku';
const purchaseKey = 'everyday-puzzles-h5:purchase:removeAds';
const adsKey = 'everyday-puzzles-h5:ads:frequency';
let api = await boot();
const original = api.createPlayerProgress();
original.totalXp = 90;
api.DeviceStorage.setItem(playerKey, JSON.stringify(original));
api.DeviceStorage.setItem(puzzleKey, JSON.stringify({ status: 'PLAYING', board: [[0]] }));
api.DeviceStorage.setItem(purchaseKey, 'true');
api.DeviceStorage.setItem(adsKey, '{"lastShownAt":123}');
const first = await api.CloudSaveService.backup(null);
const snapshot = api.parseCloudSnapshot(first.payload);
assert.equal(snapshot.values[purchaseKey], undefined);
assert.equal(snapshot.values[adsKey], undefined);
assert.ok(snapshot.values[puzzleKey]);
await assert.rejects(api.CloudSaveService.backup(null), /CLOUD_CONFLICT/);
assert.equal(api.DeviceStorage.getItem(playerKey), JSON.stringify(original));
console.log('PASS backup excludes purchases/ads; stale revision rejects without modifying local progress');

for (const invalid of [
  { ...snapshot, version: 99 },
  { ...snapshot, savedAt: 'bad date' },
  { ...snapshot, values: { ...snapshot.values, [purchaseKey]: 'true' } },
  { ...snapshot, values: { [playerKey]: '{"version":2}' } },
]) assert.throws(() => api.parseCloudSnapshot(JSON.stringify(invalid)));
assert.throws(() => api.parseCloudSnapshot('x'.repeat(700_001)));
console.log('PASS malformed, unsupported, oversized and entitlement-injecting snapshots reject');

const newer = { ...original, totalXp: 180 };
api.DeviceStorage.setItem(playerKey, JSON.stringify(newer));
await api.CloudSaveService.restore(first);
assert.equal(JSON.parse(api.DeviceStorage.getItem(playerKey)).totalXp, 90);
assert.equal(api.DeviceStorage.getItem(purchaseKey), 'true');
assert.equal(api.DeviceStorage.getItem(adsKey), '{"lastShownAt":123}');
assert.ok(api.CloudSaveService.hasLocalBackup());
await api.CloudSaveService.undoRestore();
assert.equal(JSON.parse(api.DeviceStorage.getItem(playerKey)).totalXp, 180);
console.log('PASS restore replaces without adding XP, preserves purchases/ads and supports undo');

// Simulate termination halfway through replacement, then create a fresh app instance.
failKey = playerKey;
await assert.rejects(api.restoreCloudSnapshot(first.payload), /Restore was interrupted/);
assert.ok(persisted.has('everyday-puzzles-h5:cloud:restore-journal'));
failKey = null;
api = await boot();
assert.equal(JSON.parse(api.DeviceStorage.getItem(playerKey)).totalXp, 90);
assert.equal(persisted.has('everyday-puzzles-h5:cloud:restore-journal'), false);
console.log('PASS interrupted restore resumes from durable journal before rendering');

remote = { payload: '{"broken":true}', revision: 'bad' };
await assert.rejects(api.CloudSaveService.read());
failKey = puzzleKey;
api.DeviceStorage.setItem(puzzleKey, '{}');
await assert.rejects(api.flushDeviceStorage(), /Unable to save/);
await assert.rejects(api.CloudSaveService.backup(first.revision), /Unable to save/);
console.log('PASS corrupt remote and failed durable writes block cloud replacement');
