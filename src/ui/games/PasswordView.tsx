import { PasswordConfig, PasswordEngine, TileData } from '../../core/games/password/PasswordEngine';
import { PuzzleFinishedHandler, usePersistentPuzzle } from '../hooks/usePersistentPuzzle';
import { HintButton } from '../components/HintButton';
import { VirtualKeyboard } from '../components/VirtualKeyboard';

interface PasswordViewProps {
  config: PasswordConfig;
  onFinished?: PuzzleFinishedHandler;
}

function getTileClassName(tile: TileData): string {
  const baseClassName = 'flex h-14 items-center justify-center rounded-xl border text-lg font-black uppercase';
  const stateClassMap: Record<TileData['state'], string> = {
    EMPTY: 'border-slate-700 bg-slate-900 text-white',
    TBD: 'border-slate-500 bg-slate-800 text-white',
    CORRECT: 'border-emerald-400 bg-emerald-500 text-slate-950',
    PRESENT: 'border-amber-300 bg-amber-400 text-slate-950',
    ABSENT: 'border-slate-700 bg-slate-700 text-slate-200',
  };

  const hintClassName = tile.isHintRevealed ? ' ring-2 ring-sky-400/70' : '';
  return `${baseClassName} ${stateClassMap[tile.state]}${hintClassName}`;
}

export function PasswordView({ config, onFinished }: PasswordViewProps) {
  const { state, dispatch, hintControls } = usePersistentPuzzle(config, PasswordEngine, onFinished);

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-white">Password</h3>
          <p className="mt-1 text-xs text-slate-400">Guess the hidden word. Tile colors guide your next guess.</p>
        </div>
        <HintButton controls={hintControls} description="Reveal one hidden letter in the answer." />
      </div>

      <div className="grid gap-2">
        {state.board.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${state.wordLength}, minmax(0, 1fr))` }}>
            {row.map((tile, tileIndex) => (
              <div key={`tile-${rowIndex}-${tileIndex}`} className={getTileClassName(tile)}>
                {tile.letter}
              </div>
            ))}
          </div>
        ))}
      </div>

      {state.lastError ? <div className="rounded-xl bg-rose-950 px-3 py-2 text-sm text-rose-300">{state.lastError}</div> : null}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-800 px-4 py-3 text-xs text-slate-200">
        <span>Hints {state.hintsUsed} · {state.elapsedSeconds}s</span>
        <span>Guesses {state.currentRow + (state.status === 'WON' ? 1 : 0)}/{state.maxAttempts}</span>
      </div>

      {state.status === 'WON' ? <div className="text-sm text-emerald-300">You found it!</div> : null}
      {state.status === 'LOST' ? <div className="text-sm text-amber-300">You have used all your guesses.</div> : null}

      <VirtualKeyboard
        onLetter={(letter) => dispatch({ type: 'INPUT_LETTER', letter })}
        onDelete={() => dispatch({ type: 'DELETE_LETTER' })}
        onEnter={() => dispatch({ type: 'SUBMIT_GUESS' })}
        stateMap={state.keyboardState}
      />
    </div>
  );
}
