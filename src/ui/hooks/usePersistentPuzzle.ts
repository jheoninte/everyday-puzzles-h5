import { useEffect, useMemo, useRef, useState } from 'react';
import { BasePuzzleConfig, BasePuzzleEngine, BasePuzzleState, PuzzleReward, calculatePuzzleReward } from '../../core/games/BasePuzzleEngine';
import { loadAttemptHistory, loadPuzzleState, savePuzzleState } from '../../services/LocalProgressStore';
import { ACTIVITY_EVENT, isGameActive } from '../../services/NativeActivity';
import { AdService } from '../../services/AdService';

export type PuzzleFinishedHandler = (state: BasePuzzleState, reward: PuzzleReward) => void;

export function usePersistentPuzzle<Config extends BasePuzzleConfig, State extends BasePuzzleState, Action>(
  config: Config,
  Engine: new (config: Config) => BasePuzzleEngine<Config, State, Action>,
  onFinished?: PuzzleFinishedHandler,
) {
  const session = useMemo(() => {
    const engine = new Engine(config);
    const saved = loadPuzzleState<State>(config.puzzleId);
    const initial = engine.getState();
    if (saved && ['PLAYING', 'WON', 'LOST'].includes(saved.status) &&
      ['elapsedSeconds', 'hintsUsed', 'revivesUsed', 'mistakeCount'].every((field) => {
        const value = saved[field as keyof State];
        return typeof value === 'number' && Number.isFinite(value) && value >= 0;
      }) && (saved.bonusHints === undefined || Number.isInteger(saved.bonusHints) && saved.bonusHints >= 0) &&
      (saved.rewardedAdIds === undefined || Array.isArray(saved.rewardedAdIds) && saved.rewardedAdIds.every((id) => typeof id === 'string')) &&
      Object.keys(initial).every((field) => field in saved)) {
      engine.restoreState(saved);
    }
    return { engine, reported: false, started: JSON.stringify(engine.getState()) !== JSON.stringify(initial) };
  }, [config, Engine]);
  const [state, setState] = useState(session.engine.getState());
  const [hintNotice, setHintNotice] = useState<string | null>(null);
  const hintPending = useRef(false);
  const finishedHandler = useRef(onFinished);
  const flushTime = useRef(() => {});

  useEffect(() => {
    finishedHandler.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    const { engine } = session;
    const unsubscribe = engine.subscribe((next) => {
      setState(next);
      savePuzzleState(config.puzzleId, next);
      if (!session.reported && (next.status === 'WON' || next.status === 'LOST')) {
        session.reported = true;
        const history = loadAttemptHistory(config.puzzleId);
        const total = { ...next, elapsedSeconds: next.elapsedSeconds + history.elapsedSeconds, mistakeCount: next.mistakeCount + history.mistakeCount, hintsUsed: next.hintsUsed + history.hintsUsed };
        finishedHandler.current?.(total, calculatePuzzleReward(total));
      }
    });
    let previousTime = performance.now();
    let wasVisible = isGameActive();
    flushTime.current = () => {
      const now = performance.now();
      const seconds = Math.floor((now - previousTime) / 1000);
      if (session.started && wasVisible && seconds > 0) {
        previousTime += seconds * 1000;
        engine.tickSecond(seconds);
      } else if (!session.started || !wasVisible) {
        previousTime = now;
      }
    };
    const visibilityChanged = () => {
      flushTime.current();
      wasVisible = isGameActive();
      previousTime = performance.now();
    };
    const timer = window.setInterval(() => flushTime.current(), 1000);
    const saveBeforeLeaving = () => flushTime.current();
    document.addEventListener('visibilitychange', visibilityChanged);
    window.addEventListener(ACTIVITY_EVENT, visibilityChanged);
    window.addEventListener('pagehide', saveBeforeLeaving);
    return () => {
      flushTime.current();
      unsubscribe();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', visibilityChanged);
      window.removeEventListener(ACTIVITY_EVENT, visibilityChanged);
      window.removeEventListener('pagehide', saveBeforeLeaving);
    };
  }, [config.puzzleId, session]);

  const act = (operation: () => void) => {
    flushTime.current();
    session.started = true;
    operation();
  };

  return {
    state,
    dispatch: (action: Action) => act(() => { session.engine.submitAction(action); }),
    hintControls: {
      remaining: session.engine.getHintsLeft(),
      canWatchAd: AdService.available,
      ended: state.status !== 'PLAYING',
      notice: hintNotice,
      apply: async () => {
        if (hintPending.current || session.engine.getState().status !== 'PLAYING') return;
        hintPending.current = true;
        setHintNotice(null);
        try {
          if (session.engine.getHintsLeft() <= 0) {
            const result = await AdService.showRewardedAd('HINT_REWARD');
            if (!result.rewardGranted || !result.rewardId) { setHintNotice('The ad was not completed. No hint was used.'); return; }
            if (!session.engine.grantRewardedHint(result.rewardId)) return;
          }
          act(() => {
            const result = session.engine.applyHint();
            setHintNotice(result.message ?? null);
          });
        } finally { hintPending.current = false; }
      },
    },
  };
}
