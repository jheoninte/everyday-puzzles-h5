import { AnygramConfig, AnygramEngine } from '../../core/games/anygram/AnygramEngine';
import { PuzzleFinishedHandler, usePersistentPuzzle } from '../hooks/usePersistentPuzzle';
import { HintButton } from '../components/HintButton';

interface AnygramViewProps {
  config: AnygramConfig;
  onFinished?: PuzzleFinishedHandler;
}

export function AnygramView({ config, onFinished }: AnygramViewProps) {
  const { state, dispatch, hintControls } = usePersistentPuzzle(config, AnygramEngine, onFinished);

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-white">Anygram</h3>
          <p className="mt-1 text-xs text-slate-400">Use the letters to find every word in this puzzle.</p>
        </div>
        <HintButton controls={hintControls} description="Reveal the next letter of a word you have not found." />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-center">
        <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-500">Current Word</div>
        <div className="mt-2 min-h-8 text-2xl font-black tracking-[0.3em] text-white">{state.currentInput || '—'}</div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {state.shuffledLetters.map((letter, index) => (
          <button
            key={`anygram-letter-${index}-${letter}`}
            className="flex h-14 items-center justify-center rounded-2xl border border-indigo-300/40 bg-indigo-500/20 text-xl font-black text-white"
            onClick={() => dispatch({ type: 'ADD_LETTER', index })}
            type="button"
          >
            {letter}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button className="flex-1 rounded-xl bg-slate-800 px-3 py-2 text-sm font-black text-white" onClick={() => dispatch({ type: 'DELETE_LETTER' })} type="button">
          Delete
        </button>
        <button className="flex-1 rounded-xl bg-slate-800 px-3 py-2 text-sm font-black text-white" onClick={() => dispatch({ type: 'CLEAR_INPUT' })} type="button">
          Clear
        </button>
        <button className="flex-1 rounded-xl bg-indigo-500 px-3 py-2 text-sm font-black text-white" onClick={() => dispatch({ type: 'SHUFFLE_LETTERS' })} type="button">
          Shuffle
        </button>
      </div>

      <button className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950" onClick={() => dispatch({ type: 'SUBMIT_WORD' })} type="button">
        Submit Word
      </button>

      <div className="rounded-2xl bg-slate-800 px-4 py-3 text-sm text-slate-200">
        Words found {state.foundWords.length}/{state.remainingWords.length} · Mistakes {state.mistakeCount} · {state.elapsedSeconds}s
      </div>

      {state.lastError ? <div className="rounded-xl bg-rose-950 px-3 py-2 text-sm text-rose-300">{state.lastError}</div> : null}
      {state.status === 'WON' ? <div className="rounded-xl bg-emerald-950 px-3 py-2 text-sm text-emerald-300">You found every word!</div> : null}

      <div className="grid gap-2 sm:grid-cols-2">
        {state.remainingWords.map((word) => {
          const isFound = state.foundWords.includes(word);
          return (
            <div
              key={word}
              className={[
                'rounded-xl border px-3 py-2 text-sm font-bold',
                isFound ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300' : 'border-slate-700 bg-slate-900/70 text-slate-500',
              ].join(' ')}
            >
              {isFound ? word : `${'•'.repeat(word.length)} (${word.length})`}
            </div>
          );
        })}
      </div>
    </div>
  );
}
