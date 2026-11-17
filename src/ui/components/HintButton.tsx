import { useState } from 'react';

interface HintControls {
  remaining: number; canWatchAd: boolean; ended: boolean; notice: string | null; apply: () => Promise<void>;
}
export function HintButton({ controls, description }: { controls: HintControls; description: string }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const exhausted = controls.remaining === 0;
  return <div className="w-28 shrink-0 text-right">
    <button className="min-h-11 w-full rounded-xl bg-amber-400 px-2 py-2 text-xs font-black text-slate-950 disabled:opacity-40" disabled={busy || controls.ended} onClick={() => setConfirm(!confirm)} type="button">{exhausted ? 'Extra hint' : `Hints ${controls.remaining}`}</button>
    {confirm ? <div className="mt-2 space-y-2 rounded-xl bg-slate-800 p-2 text-left text-xs leading-5">
      <p>{description}</p>
      {exhausted ? <p>{controls.canWatchAd ? 'Finish an optional rewarded ad to get one extra hint.' : 'No free hints left. Ads are available in the iPhone app. You can keep solving without hints.'}</p> : <p>This uses one hint.</p>}
      {!exhausted || controls.canWatchAd ? <button className="min-h-11 w-full rounded-lg bg-indigo-500 px-2 font-bold" disabled={busy} onClick={() => {
        setBusy(true);
        void controls.apply().finally(() => { setBusy(false); setConfirm(false); });
      }} type="button">{exhausted ? 'Watch ad for hint' : 'Use hint'}</button> : null}
      <button className="min-h-11 w-full" onClick={() => setConfirm(false)} type="button">Close</button>
    </div> : null}
    {controls.notice ? <p role="status" className="mt-2 text-left text-xs leading-5 text-amber-200">{controls.notice}</p> : null}
  </div>;
}
