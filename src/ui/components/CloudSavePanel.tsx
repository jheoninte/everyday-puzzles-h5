import { useState } from 'react';
import { CloudSaveService, CloudRecord } from '../../services/CloudSaveService';
import { parseCloudSnapshot } from '../../services/CloudSnapshot';
import { PlayerProgress } from '../../core/meta/PlayerProgress';
import { acquireNativeActivity } from '../../services/NativeActivity';

export function CloudSavePanel({ profile }: { profile: PlayerProgress }) {
  const [record, setRecord] = useState<CloudRecord | undefined>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [choice, setChoice] = useState<'backup' | 'restore' | 'undo' | null>(null);
  if (!CloudSaveService.available) return null;
  const run = async (operation: () => Promise<void>) => {
    const release = acquireNativeActivity();
    if (!release) return;
    setBusy(true);
    setMessage('');
    try { await operation(); }
    catch (error) {
      setRecord(undefined);
      setMessage(error instanceof Error ? error.message : 'The iCloud operation failed. Please check again.');
    } finally { setBusy(false); setChoice(null); release(); }
  };
  const snapshot = record?.payload ? parseCloudSnapshot(record.payload) : null;
  const remote = snapshot ? JSON.parse(snapshot.values['everyday-puzzles-h5:player:v2']) as PlayerProgress : null;
  return <section className="panel space-y-3">
    <h2 className="font-bold">iCloud saves</h2>
    <p className="text-sm leading-6 text-slate-400">Progress saves automatically on this device. Use the buttons below to manually save or restore with iCloud. Use the same Apple Account on each device.</p>
    <p className="text-sm">This device: {Object.keys(profile.records).length} solved · {profile.totalXp} XP</p>
    <fieldset disabled={busy} className="space-y-3 disabled:opacity-60">
      <button className="secondary-button w-full" type="button" onClick={() => { void run(async () => { setRecord(await CloudSaveService.read()); }); }}>Check iCloud save</button>
      {record !== undefined ? <>
        <p className="text-sm">{remote && snapshot ? `iCloud: ${Object.keys(remote.records).length} solved · ${remote.totalXp} XP (${new Date(snapshot.savedAt).toLocaleString('en-US')})` : 'There is no iCloud save yet.'}</p>
        <button className="secondary-button w-full" type="button" onClick={() => setChoice('backup')}>Save this device to iCloud</button>
        {remote ? <button className="secondary-button w-full" type="button" onClick={() => setChoice('restore')}>Restore iCloud save to this device</button> : null}
      </> : null}
      {CloudSaveService.hasLocalBackup() ? <button className="secondary-button w-full" type="button" onClick={() => setChoice('undo')}>Undo last restore</button> : null}
        {choice ? <div className="space-y-3 rounded-xl border border-amber-500/50 p-3">
          <p className="text-sm">{choice === 'backup' ? 'This replaces your entire iCloud save with progress from this device.' : choice === 'undo' ? 'This replaces local progress with the backup from before your last restore. The app will reload.' : 'This replaces all local progress with the iCloud save shown above. The app will reload.'} Progress and rewards will not be combined. Continue?</p>
          <button className="primary-button w-full" type="button" onClick={() => { void run(async () => {
            if (choice === 'undo') await CloudSaveService.undoRestore();
            else if (record && choice === 'backup') { setRecord(await CloudSaveService.backup(record.revision)); setMessage('Saved to iCloud.'); }
            else if (record) await CloudSaveService.restore(record);
          }); }}>Confirm {choice === 'backup' ? 'save' : 'restore'}</button>
          <button className="secondary-button w-full" type="button" onClick={() => setChoice(null)}>Cancel</button>
        </div> : null}
    </fieldset>
    {busy || message ? <p className="text-sm text-indigo-200" role="status">{busy ? 'Connecting to iCloud…' : message}</p> : null}
    <p className="text-xs leading-5 text-slate-500">Saves exclude purchases and ad settings. Restore purchases in the Shop.</p>
  </section>;
}
