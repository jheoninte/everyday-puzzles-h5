import { HashtagConfig, HashtagEngine, HashtagPosition } from '../../core/games/hashtag/HashtagEngine';
import { PuzzleFinishedHandler, usePersistentPuzzle } from '../hooks/usePersistentPuzzle';
import { HintButton } from '../components/HintButton';

interface HashtagViewProps {
  config: HashtagConfig;
  onFinished?: PuzzleFinishedHandler;
}

function isSameCell(first: HashtagPosition | null, row: number, col: number): boolean {
  return Boolean(first && first.row === row && first.col === col);
}

export function HashtagView({ config, onFinished }: HashtagViewProps) {
  const { state, dispatch, hintControls } = usePersistentPuzzle(config, HashtagEngine, onFinished);

  const handleSelect = (row: number, col: number) => dispatch({ type: 'SELECT_CELL', row, col });

  const getCellClassName = (row: number, col: number): string => {
    const value = state.currentGrid[row][col];
    if (value === null) {
      return 'invisible aspect-square w-full';
    }

    const selected = isSameCell(state.selectedCell, row, col);
    const isCorrect = value === config.solutionGrid[row][col];

    return [
      'flex aspect-square w-full items-center justify-center rounded-xl border text-lg font-black uppercase transition-all',
      isCorrect ? 'border-emerald-400 bg-emerald-500 text-slate-950' : 'border-amber-300 bg-amber-400 text-slate-950',
      selected ? 'ring-2 ring-sky-300 ring-offset-2 ring-offset-slate-900 scale-105' : '',
    ].join(' ');
  };

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-white">Hashtag</h3>
          <p className="mt-1 text-xs text-slate-400">Tap two tiles to swap their letters and complete the word grid.</p>
        </div>
        <HintButton controls={hintControls} description="Swap misplaced letters into the correct positions." />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-800 px-4 py-3 text-xs text-slate-200">
        <span>Moves {state.moveCount}/{state.maxMoves}</span>
        <span>Mistakes {state.mistakeCount} · {state.elapsedSeconds}s</span>
      </div>

      <div className="mx-auto grid w-full max-w-xs gap-2" style={{ gridTemplateColumns: `repeat(${state.gridSize}, minmax(0, 1fr))` }}>
        {state.currentGrid.map((row, rowIndex) =>
          row.map((cell, colIndex) =>
            cell === null ? (
              <div key={`hashtag-gap-${rowIndex}-${colIndex}`} className="aspect-square w-full" />
            ) : (
              <button
                key={`hashtag-cell-${rowIndex}-${colIndex}`}
                className={getCellClassName(rowIndex, colIndex)}
                aria-label={`Row ${rowIndex + 1}, column ${colIndex + 1}, ${cell}`}
                aria-pressed={isSameCell(state.selectedCell, rowIndex, colIndex)}
                onClick={() => handleSelect(rowIndex, colIndex)}
                type="button"
              >
                {cell}
              </button>
            ),
          ),
        )}
      </div>

      {state.lastError ? <div className="rounded-xl bg-rose-950 px-3 py-2 text-sm text-rose-300">{state.lastError}</div> : null}
      {state.status === 'WON' ? <div className="rounded-xl bg-emerald-950 px-3 py-2 text-sm text-emerald-300">Puzzle complete!</div> : null}
      {state.status === 'LOST' ? <div className="rounded-xl bg-amber-950 px-3 py-2 text-sm text-amber-300">You have used all your moves.</div> : null}
    </div>
  );
}
