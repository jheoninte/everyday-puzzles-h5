import { useEffect, useMemo, useRef, useState } from 'react';
import { BasePuzzleState, PuzzleReward } from './core/games/BasePuzzleEngine';
import { BADGE_CATALOG } from './core/meta/BadgeManager';
import { PlayerProgress, compareRecords, countPackClears, createPlayerProgress, PACK_GOALS, recordPlayerClear } from './core/meta/PlayerProgress';
import { DailyPuzzlePack, GAME_IDS, GameId, PackEntry } from './core/types/PuzzlePackTypes';
import { loadPuzzleState, restartPuzzle } from './services/LocalProgressStore';
import { getStorageNotice, loadPlayerProgress, PLAYER_PROGRESS_KEY, resetPlayerProgress, updatePlayerProgress } from './services/PlayerProgressStore';
import { loadPackManifest, loadPuzzlePack } from './services/PuzzlePackLoader';
import { PurchaseService, StoreProduct, PURCHASE_EVENT } from './services/PurchaseService';
import { AdService, AD_EVENT } from './services/AdService';
import { ACTIVITY_EVENT, isNativeBusy } from './services/NativeActivity';
import { flushDeviceStorage } from './services/DeviceStorage';
import { GameScreen } from './ui/games/GameScreen';
import { MobileFrame } from './ui/layouts/MobileFrame';
import { CloudSavePanel } from './ui/components/CloudSavePanel';
import { CloudSaveService } from './services/CloudSaveService';

type Screen = 'home' | 'packs' | 'pack' | 'game' | 'result' | 'records' | 'shop' | 'settings';
interface GameResult { state: BasePuzzleState; earnedXp: number; }
const GAMES: Record<GameId, { title: string; description: string; icon: string }> = {
  password: { title: 'Password', description: 'Find the hidden five-letter word', icon: 'Aa' },
  hashtag: { title: 'Hashtag', description: 'Swap letters to complete the grid', icon: '#' },
  anygram: { title: 'Anygram', description: 'Discover words from six letters', icon: 'Ab' },
  sudoku: { title: 'Sudoku', description: 'A little logic, one number at a time', icon: '4' },
};
const DIFFICULTY = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const RELEASE_BADGES = BADGE_CATALOG.filter((badge) => !['streak_7_days', 'streak_30_days', 'time_traveler'].includes(badge.id));

function formatTime(seconds: number): string {
  return Math.floor(seconds / 60) + 'm ' + seconds % 60 + 's';
}

function localDate(): string {
  const now = new Date();
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
}

export function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [packs, setPacks] = useState<PackEntry[]>([]);
  const [profile, setProfile] = useState<PlayerProgress>(createPlayerProgress);
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [bootVersion, setBootVersion] = useState(0);
  const [packId, setPackId] = useState<string | null>(null);
  const [gameId, setGameId] = useState<GameId>('password');
  const [loadedPack, setLoadedPack] = useState<{ id: string; data: DailyPuzzlePack } | null>(null);
  const [packError, setPackError] = useState<string | null>(null);
  const [packVersion, setPackVersion] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [storageNotice, setStorageNotice] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [removeAds, setRemoveAds] = useState(PurchaseService.removeAds);
  const [nativeBusy, setNativeBusy] = useState(isNativeBusy);
  const [privacyRequired, setPrivacyRequired] = useState(false);
  const [recordGame, setRecordGame] = useState<GameId>('password');
  const navigationVersion = useRef(0);
  const adTransition = useRef(false);
  const resetDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (confirmReset) resetDialog.current?.showModal();
  }, [confirmReset]);

  useEffect(() => {
    const activity = () => setNativeBusy(isNativeBusy());
    const purchases = () => setRemoveAds(PurchaseService.removeAds);
    const ads = () => setPrivacyRequired(AdService.privacyOptionsRequired);
    const storage = () => setStorageNotice(getStorageNotice());
    window.addEventListener(ACTIVITY_EVENT, activity);
    window.addEventListener(PURCHASE_EVENT, purchases);
    window.addEventListener(AD_EVENT, ads);
    window.addEventListener('puzzle-storage-error', storage);
    void PurchaseService.initialize().then(purchases);
    void AdService.initialize();
    return () => {
      window.removeEventListener(ACTIVITY_EVENT, activity);
      window.removeEventListener(PURCHASE_EVENT, purchases);
      window.removeEventListener(AD_EVENT, ads);
      window.removeEventListener('puzzle-storage-error', storage);
    };
  }, []);

  useEffect(() => {
    let active = true;
    setBooting(true);
    setBootError(null);
    loadPackManifest().then((manifest) => {
      if (!active) return;
      setPacks(manifest.packs);
      setProfile(loadPlayerProgress(manifest.packs));
      setStorageNotice(getStorageNotice());
    }).catch((error: unknown) => {
      if (active) setBootError(error instanceof Error ? error.message : 'Unable to prepare the game.');
    }).finally(() => { if (active) setBooting(false); });
    return () => { active = false; };
  }, [bootVersion]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== PLAYER_PROGRESS_KEY && event.key !== null) return;
      try {
        setProfile(loadPlayerProgress(packs));
        setStorageNotice(getStorageNotice());
      } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to sync your progress.'); }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [packs]);

  const entry = packs.find((candidate) => candidate.id === packId) ?? null;
  useEffect(() => {
    if (!entry) return;
    let active = true;
    setPackError(null);
    setLoadedPack(null);
    loadPuzzlePack(entry).then((data) => {
      if (active) setLoadedPack({ id: entry.id, data });
    }).catch((error: unknown) => {
      if (active) setPackError(error instanceof Error ? error.message : 'Unable to load this pack.');
    });
    return () => { active = false; };
  }, [entry, packVersion]);

  useEffect(() => {
    if (screen !== 'shop') return;
    let active = true;
    PurchaseService.getProduct().then((next) => { if (active) setProduct(next); })
      .catch(() => { if (active) setMessage('Unable to connect to the store. Please try again later.'); });
    return () => { active = false; };
  }, [screen]);

  const go = (next: Screen) => {
    if (adTransition.current) return;
    navigationVersion.current += 1;
    setMessage(null);
    const navigate = () => { setScreen(next); window.scrollTo(0, 0); };
    if (screen === 'result' && result && result.earnedXp > 0) {
      adTransition.current = true;
      void AdService.onResultExit(Object.keys(profile.records).length, PurchaseService.removeAds).finally(() => {
        adTransition.current = false;
        navigate();
      });
    } else navigate();
  };

  const updateProfile = async (update: (current: PlayerProgress) => PlayerProgress) => {
    const next = await updatePlayerProgress(packs, update);
    setProfile(next);
    setStorageNotice(getStorageNotice());
    return next;
  };

  const openPack = (next: PackEntry) => { setPackId(next.id); go('pack'); };
  const openGame = (next: PackEntry, nextGame: GameId) => {
    setPackId(next.id);
    setGameId(nextGame);
    setResult(null);
    go('game');
    void updateProfile((current) => ({ ...current, lastPlayed: { packId: next.id, gameId: nextGame } }))
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Unable to save your progress.'));
  };

  const finishGame = async (state: BasePuzzleState, reward: PuzzleReward) => {
    if (!entry) return;
    const token = navigationVersion.current;
    let earnedXp = 0;
    try {
      if (state.status === 'WON') {
        const updated = await updateProfile((current) => {
          const next = recordPlayerClear(current, entry.id, gameId, state, reward, localDate());
          earnedXp = next.totalXp - current.totalXp;
          return next;
        });
        if (earnedXp > 0) void AdService.prepareForResult(Object.keys(updated.records).length, PurchaseService.removeAds);
      }
      if (token !== navigationVersion.current) return;
      setResult({ state, earnedXp });
      go('result');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save your result.');
    }
  };

  const retryGame = () => {
    if (!entry) return;
    restartPuzzle(entry.id + '-' + gameId);
    openGame(entry, gameId);
  };

  const handleReset = async () => {
    setBusy(true);
    try {
      const next = await resetPlayerProgress();
      await flushDeviceStorage();
      setProfile(next);
      setLoadedPack(null);
      setPackId(null);
      setResult(null);
      setConfirmReset(false);
      setStorageNotice(getStorageNotice());
      setBootVersion((value) => value + 1);
      go('home');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to reset your progress.');
    } finally { setBusy(false); }
  };

  const restorePurchases = async () => {
    setBusy(true);
    try {
      const restored = await PurchaseService.restore();
      setMessage(restored.removeAds ? 'Your Remove Interstitial Ads purchase has been restored.' : 'No Remove Interstitial Ads purchase was found.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to restore purchases.');
    } finally { setBusy(false); }
  };

  const purchaseRemoveAds = async () => {
    if (!product || busy || removeAds) return;
    setBusy(true);
    try {
      const outcome = await PurchaseService.purchase(product.id);
      setMessage(outcome.status === 'cancelled' ? 'Purchase cancelled.' : outcome.status === 'pending' ? 'Your purchase is awaiting approval. It will unlock automatically once approved.' : outcome.removeAds ? 'Interstitial ads have been removed.' : 'Please restore purchases to check your access.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to complete the purchase.'); }
    finally { setBusy(false); }
  };

  const availableIds = new Set(packs.map((candidate) => candidate.id));
  const records = Object.values(profile.records).filter((record) => availableIds.has(record.packId));
  const completedPacks = packs.filter((candidate) => countPackClears(profile, candidate.id) === GAME_IDS.length).length;
  const recommendedPack = packs.find((candidate) => countPackClears(profile, candidate.id) < GAME_IDS.length) ?? packs[0];
  const resumePack = packs.find((candidate) => candidate.id === profile.lastPlayed?.packId);
  const resume = resumePack && profile.lastPlayed && !profile.records[resumePack.id + '-' + profile.lastPlayed.gameId]
    ? { entry: resumePack, game: profile.lastPlayed.gameId }
    : recommendedPack ? { entry: recommendedPack, game: GAME_IDS.find((game) => !profile.records[recommendedPack.id + '-' + game]) ?? 'password' } : null;
  const packReady = entry && loadedPack?.id === entry.id;
  const nextGame = entry ? GAME_IDS.find((game) => !profile.records[entry.id + '-' + game]) : undefined;
  const ranking = useMemo(() => Object.entries(profile.records)
    .filter(([, record]) => record.gameId === recordGame && record.best !== null)
    .sort(([, left], [, right]) => compareRecords(left.best!, right.best!)).slice(0, 10), [profile.records, recordGame]);

  const packCard = (candidate: PackEntry) => {
    const cleared = countPackClears(profile, candidate.id);
    return <button key={candidate.id} className="panel w-full text-left transition-colors hover:border-indigo-400" onClick={() => openPack(candidate)} type="button">
      <div className="flex items-center justify-between gap-2"><span className="eyebrow">PACK {String(candidate.order).padStart(2, '0')}</span><span className="text-xs text-slate-400">{DIFFICULTY[candidate.difficulty]} · {cleared}/4 solved</span></div>
      <h2 className="mt-3 text-lg font-bold">{candidate.title}</h2>
      <div className="mt-4 flex gap-2" aria-label={cleared + ' of 4 puzzles solved'}>
        {GAME_IDS.map((game) => <span key={game} className={'flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold ' + (profile.records[candidate.id + '-' + game] ? 'bg-emerald-400 text-slate-950' : 'bg-slate-800 text-slate-400')}>{profile.records[candidate.id + '-' + game] ? '✓' : GAMES[game].icon}</span>)}
      </div>
    </button>;
  };

  return <MobileFrame>
    <header className="app-header flex items-center justify-between border-b border-slate-800 px-4 pb-4">
      <button className="min-h-11 text-left" onClick={() => go('home')} type="button"><span className="block text-lg font-black">Everyday Puzzles</span><span className="text-xs text-slate-400">A little focus. A little win.</span></button>
      <button className="secondary-button" onClick={() => go('settings')} type="button">Settings</button>
    </header>
    <main className="space-y-5 px-4 pb-32 pt-6">
      {storageNotice ? <div role="status" className="rounded-2xl bg-amber-950 p-4 text-sm text-amber-200">{storageNotice}</div> : null}
      {message ? <div role="status" className="rounded-2xl bg-indigo-950 p-4 text-sm text-indigo-100">{message}</div> : null}
      {booting ? <p role="status" className="text-slate-400">Preparing your puzzles…</p> : bootError ? <div className="panel space-y-4"><p role="alert">{bootError}</p><button className="primary-button" onClick={() => setBootVersion((value) => value + 1)} type="button">Try again</button><button className="secondary-button" onClick={() => setConfirmReset(true)} type="button">Reset game progress</button></div> : <>
        {screen === 'home' ? <>
          <div><p className="eyebrow">YOUR DAILY LITTLE WIN</p><h1 className="mt-3 text-3xl font-black leading-tight">One puzzle today,<br />at your own pace.</h1><p className="mt-3 text-sm leading-6 text-slate-400">Small joys in words and numbers.<br />Start with whichever puzzle you like.</p></div>
          <section className="grid grid-cols-3 gap-2 text-center" aria-label="Overall progress">
            {[['Puzzles solved', records.length + '/' + packs.length * 4], ['Packs finished', completedPacks + '/' + packs.length], ['Total XP', String(profile.totalXp)]].map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-800 px-2 py-4"><div className="text-xl font-black text-white">{value}</div><div className="mt-1 text-[11px] text-slate-400">{label}</div></div>)}
          </section>
          {resume ? <section className="panel border-indigo-400/40 bg-gradient-to-br from-indigo-950 to-slate-900"><p className="eyebrow">{resumePack && resume.entry.id === resumePack.id ? 'CONTINUE PLAYING' : 'UP NEXT'}</p><h2 className="mt-3 text-xl font-bold">{GAMES[resume.game].title}</h2><p className="mt-1 text-sm text-slate-400">{resume.entry.title}</p><button className="primary-button mt-5 w-full" onClick={() => openGame(resume.entry, resume.game)} type="button">Play puzzle →</button></section> : <div className="panel">More puzzles are on the way. Check back after an update.</div>}
          <div className="flex items-center justify-between"><h2 className="font-bold">Puzzle collection</h2><button className="min-h-11 text-sm text-indigo-300" onClick={() => go('packs')} type="button">View all →</button></div>
          {packs.slice(0, 2).map(packCard)}
        </> : null}

        {screen === 'packs' ? <><div><p className="eyebrow">COLLECTION</p><h1 className="mt-2 text-2xl font-black">Pick your next puzzle</h1><p className="mt-2 text-sm text-slate-400">{packs.length} packs · {packs.length * 4} puzzles to play at your own pace.</p></div>{packs.map(packCard)}</> : null}

        {(screen === 'pack' || screen === 'game' || screen === 'result') && entry ? <>
          <button className="min-h-11 text-sm text-slate-400" onClick={() => go(screen === 'pack' ? 'packs' : 'pack')} type="button">← {screen === 'pack' ? 'All packs' : 'Back to pack'}</button>
          <div><p className="eyebrow">PACK {String(entry.order).padStart(2, '0')} · {DIFFICULTY[entry.difficulty]}</p><h1 className="mt-2 text-2xl font-black">{entry.title}</h1></div>
          {packError ? <div className="panel space-y-4"><p role="alert">{packError}</p><button className="primary-button" onClick={() => setPackVersion((value) => value + 1)} type="button">Reload</button></div> : !packReady ? <p role="status" className="text-sm text-slate-400">Loading pack…</p> : <>
            {screen === 'pack' ? <>
              <div className="panel"><h2 className="font-bold">Pack milestones</h2><div className="mt-4 flex gap-2">{PACK_GOALS.map((goal) => <div key={goal.count} className={'flex-1 rounded-xl p-3 text-center text-xs ' + ((profile.claimedPackGoals[entry.id] ?? []).includes(goal.count) ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-800 text-slate-400')}><span className="block font-bold">Solve {goal.count}</span><span className="mt-1 block">+{goal.xp} XP</span></div>)}</div><p className="mt-3 text-xs text-slate-400">Each milestone reward is granted automatically, once per pack.</p></div>
              {GAME_IDS.map((game) => {
                const saved = loadPuzzleState<BasePuzzleState>(entry.id + '-' + game);
                const completed = Boolean(profile.records[entry.id + '-' + game]);
                const status = completed ? 'Solved · Play again' : saved?.status === 'LOST' ? 'Try again' : saved ? 'Continue' : 'Start';
                return <button key={game} className="panel flex w-full items-center gap-4 text-left" onClick={() => openGame(entry, game)} type="button"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/20 text-xl font-black text-indigo-200">{GAMES[game].icon}</span><span className="min-w-0 flex-1"><span className="block font-bold">{GAMES[game].title}</span><span className="mt-1 block text-xs text-slate-400">{GAMES[game].description}</span><span className={'mt-2 block text-xs ' + (completed ? 'text-emerald-300' : 'text-indigo-300')}>{status}</span></span><span aria-hidden="true">→</span></button>;
              })}
            </> : null}
            {screen === 'game' ? <GameScreen key={entry.id + '-' + gameId} entry={entry} pack={loadedPack.data} gameId={gameId} onFinished={(state, reward) => { void finishGame(state, reward); }} /> : null}
            {screen === 'result' && result ? <section className="panel space-y-5 text-center">
              <div className="text-4xl" aria-hidden="true">{result.state.status === 'WON' ? '✦' : '↻'}</div>
              <div><p className="eyebrow">{GAMES[gameId].title}</p><h2 className="mt-2 text-2xl font-black">{result.state.status === 'WON' ? 'Another little win!' : 'Ready for another try?'}</h2></div>
              <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-800 p-4 text-xs text-slate-400"><div>Time<strong className="mt-2 block text-sm text-white">{formatTime(result.state.elapsedSeconds)}</strong></div><div>Mistakes<strong className="mt-2 block text-sm text-white">{result.state.mistakeCount}</strong></div><div>Hints<strong className="mt-2 block text-sm text-white">{result.state.hintsUsed}</strong></div></div>
              <p className="text-lg font-black text-emerald-300">{result.earnedXp > 0 ? '+' + result.earnedXp + ' XP' : result.state.status === 'WON' ? 'Your result has been saved' : 'Your progress has been saved'}</p>
              <p className="text-xs leading-5 text-slate-400">{result.earnedXp > 0 ? 'Includes your first-clear reward and any new pack milestones.' : 'Play again anytime. First-clear rewards are only granted once.'}</p>
              {result.state.status === 'WON' && nextGame ? <button className="primary-button w-full" onClick={() => openGame(entry, nextGame)} type="button">Next puzzle · {GAMES[nextGame].title}</button> : null}
              <button className="secondary-button w-full" onClick={retryGame} type="button">{result.state.status === 'WON' ? 'Practice again' : 'Try again'}</button>
              <button className="secondary-button w-full" onClick={() => go('pack')} type="button">Back to pack</button>
            </section> : null}
          </>}
        </> : null}

        {screen === 'shop' ? <>
          <div><p className="eyebrow">SHOP</p><h1 className="mt-2 text-2xl font-black">A little more focus</h1><p className="mt-2 text-sm text-slate-400">All included puzzles are free to play.</p></div>
          <section className="panel space-y-4"><span className="text-3xl" aria-hidden="true">✦</span><h2 className="text-xl font-bold">Remove Interstitial Ads</h2><p className="text-sm leading-6 text-slate-300">One purchase removes interstitial ads between puzzles. Optional rewarded ads for extra hints remain available.</p><button className="primary-button w-full" disabled={busy || removeAds || !product} onClick={() => { void purchaseRemoveAds(); }} type="button">{removeAds ? 'Interstitial ads removed' : product ? product.priceLabel + ' · Remove ads' : PurchaseService.available ? 'Product unavailable' : 'Available in the iPhone app'}</button><p className="text-xs leading-5 text-slate-400">{PurchaseService.available ? 'One-time purchase. Restore it on devices using the same Apple Account.' : 'Purchases and ads are available in the iPhone app.'}</p>{PurchaseService.available && !product ? <button className="secondary-button w-full" disabled={busy} onClick={() => { void PurchaseService.getProduct().then(setProduct).catch(() => setMessage('Unable to load the store product.')); }} type="button">Reload product</button> : null}<button className="secondary-button w-full" disabled={busy} onClick={() => { void restorePurchases(); }} type="button">Restore purchases</button></section>
        </> : null}

        {screen === 'records' ? <>
          <div><p className="eyebrow">PERSONAL BEST</p><h1 className="mt-2 text-2xl font-black">Your personal bests</h1><p className="mt-2 text-sm text-slate-400">Your best results for each game, saved on this device.</p></div>
          <div className="grid grid-cols-2 gap-2">{GAME_IDS.map((game) => <button key={game} className={recordGame === game ? 'primary-button' : 'secondary-button'} onClick={() => setRecordGame(game)} type="button">{GAMES[game].title}</button>)}</div>
          <p className="text-xs leading-5 text-slate-400">Sorted by no hints, fewer mistakes, then faster time. These are your personal records across puzzles, not global rankings.</p>
          {ranking.length === 0 ? <div className="panel text-sm text-slate-400">Solve your first puzzle to start your collection of records.</div> : ranking.map(([id, record], index) => <div key={id} className="panel flex items-center gap-4"><span className="text-xl font-black text-indigo-300">{index + 1}</span><div><h2 className="font-bold">{packs.find((candidate) => candidate.id === record.packId)?.title ?? 'Previous collection'}</h2><p className="mt-1 text-xs text-slate-400">{formatTime(record.best!.elapsedSeconds)} · Mistakes {record.best!.mistakeCount} · Hints {record.best!.hintsUsed}</p></div></div>)}
        </> : null}

        {screen === 'settings' ? <>
          <div><p className="eyebrow">YOUR SPACE</p><h1 className="mt-2 text-2xl font-black">Your puzzle space</h1></div>
          {privacyRequired ? <button className="secondary-button w-full" onClick={() => { void AdService.openPrivacyOptions().catch(() => setMessage('Unable to open ad privacy choices. Please try again.')); }} type="button">Ad privacy choices</button> : null}
          <section className="panel"><h2 className="font-bold">Your badges</h2><div className="mt-4 space-y-3">{RELEASE_BADGES.map((badge) => {
            const unlocked = Boolean(profile.badgeState.unlocked[badge.id]);
            return <div key={badge.id} className={'flex gap-3 rounded-2xl p-3 ' + (unlocked ? 'bg-indigo-500/15' : 'bg-slate-800')}><span className="text-2xl" aria-hidden="true">{unlocked || !badge.isSecret ? badge.icon : '?'}</span><div><h3 className="text-sm font-bold">{unlocked || !badge.isSecret ? badge.title : 'Secret badge'}</h3><p className="mt-1 text-xs text-slate-400">{unlocked || !badge.isSecret ? badge.description : 'Keep playing to discover this badge.'}</p></div></div>;
          })}</div></section>
          <CloudSavePanel profile={profile} />
          <button className="secondary-button w-full" type="button" onClick={() => { void CloudSaveService.openPrivacyPolicy().catch(() => setMessage('Unable to open the privacy policy. Please try again.')); }}>Privacy Policy</button>
          <section className="panel space-y-3"><h2 className="font-bold">About your saved progress</h2><p className="text-sm leading-6 text-slate-400">Progress saves automatically on this device. Deleting the app or browser data may erase local progress. In the iPhone app, you can manually save and restore progress with iCloud.</p><button className="secondary-button w-full" onClick={() => setConfirmReset(true)} type="button">Reset game progress</button><p className="text-xs text-slate-500">Purchases are managed separately. Resetting local progress keeps your iCloud save.</p></section>
        </> : null}
      </>}
      {confirmReset ? <dialog ref={resetDialog} onCancel={() => setConfirmReset(false)} aria-labelledby="reset-title" className="panel fixed inset-0 z-30 m-auto w-[calc(100%-2rem)] max-w-sm space-y-4 border-rose-500/50 text-white backdrop:bg-black/70"><h2 id="reset-title" className="font-bold">Reset all game progress?</h2><p className="text-sm leading-6 text-slate-300">This deletes all local boards, XP, completion records, badges, and the backup from your last restore. This cannot be undone. Purchases and your iCloud save are kept.</p><button className="primary-button w-full" disabled={busy} onClick={() => { void handleReset(); }} type="button">Delete all local progress</button><button className="secondary-button w-full" disabled={busy} onClick={() => setConfirmReset(false)} type="button">Cancel</button></dialog> : null}
    </main>
    {screen !== 'game' ? <nav className="app-navigation fixed bottom-0 left-1/2 z-20 grid w-full max-w-md -translate-x-1/2 grid-cols-4 border-t border-slate-700 bg-slate-950/95 px-2 pt-2 backdrop-blur" aria-label="Main navigation">
      {([{ id: 'home', label: 'Home' }, { id: 'packs', label: 'Packs' }, { id: 'records', label: 'Records' }, { id: 'shop', label: 'Shop' }] as const).map((item) => <button key={item.id} className={'min-h-12 rounded-xl text-xs font-bold ' + (screen === item.id ? 'bg-indigo-500/20 text-indigo-200' : 'text-slate-400')} onClick={() => go(item.id)} type="button">{item.label}</button>)}
    </nav> : null}
    {nativeBusy ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-6" role="status" aria-live="polite"><p className="rounded-2xl bg-slate-800 p-6 text-center text-sm">Connecting…</p></div> : null}
  </MobileFrame>;
}
