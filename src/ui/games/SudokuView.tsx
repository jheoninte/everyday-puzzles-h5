import { SudokuConfig, SudokuEngine, SudokuPosition } from '../../core/games/sudoku/SudokuEngine';
import { PuzzleFinishedHandler, usePersistentPuzzle } from '../hooks/usePersistentPuzzle';
import { HintButton } from '../components/HintButton';

interface SudokuViewProps {
  config: SudokuConfig;
  onFinished?: PuzzleFinishedHandler;
}

function isSelected(position: SudokuPosition | null, row: number, col: number): boolean {
  return Boolean(position && position.row === row && position.col === col);
}

export function SudokuView({ config, onFinished }: SudokuViewProps) {
  const { state, dispatch, hintControls } = usePersistentPuzzle(config, SudokuEngine, onFinished);

  const getCellClassName = (row: number, col: number): string => {
    const value = state.board[row][col];
    const given = config.givens[row][col] !== 0;
    const selected = isSelected(state.selectedCell, row, col);
    const baseClassName = 'flex aspect-square items-center justify-center rounded-xl border text-xl font-black transition-all';

    return [
      baseClassName,
      given ? 'border-slate-600 bg-slate-700 text-white' : 'border-slate-700 bg-slate-900 text-sky-100',
      value !== 0 && value === config.solution[row][col] && !given ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300' : '',
      selected ? 'ring-2 ring-sky-300 ring-offset-2 ring-offset-slate-900 scale-[1.02]' : '',
    ].join(' ');
  };

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-white">Sudoku</h3>
          <p className="mt-1 text-xs text-slate-400">Fill each row, column, and 2×2 box with 1–4, without repeats.</p>
        </div>
        <HintButton controls={hintControls} description="Fill the selected empty cell, or the next empty cell if none is selected." />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-800 px-4 py-3 text-xs text-slate-200">
        <span>{state.difficulty.toUpperCase()} · {state.elapsedSeconds}s</span>
        <span>Mistakes {state.mistakeCount}/{state.maxMistakes}</span>
        <span>Hints {hintControls.remaining} left</span>
      </div>

      <div className="mx-auto grid w-full max-w-xs grid-cols-4 gap-2">
        {state.board.map((row, rowIndex) =>
          row.map((value, colIndex) => (
            <button
              key={`sudoku-${rowIndex}-${colIndex}`}
              className={getCellClassName(rowIndex, colIndex)}
              aria-label={`Row ${rowIndex + 1}, column ${colIndex + 1}, ${value === 0 ? 'empty' : value}`}
              aria-pressed={isSelected(state.selectedCell, rowIndex, colIndex)}
              onClick={() => dispatch({ type: 'SELECT_CELL', row: rowIndex, col: colIndex })}
              type="button"
            >
              {value === 0 ? '' : value}
            </button>
          )),
        )}
      </div>

      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4].map((value) => (
          <button
            key={`sudoku-input-${value}`}
            className="flex h-12 items-center justify-center rounded-xl border border-indigo-300/40 bg-indigo-500/20 text-lg font-black text-white"
            onClick={() => dispatch({ type: 'INPUT_VALUE', value })}
            type="button"
          >
            {value}
          </button>
        ))}
        <button className="flex h-12 items-center justify-center rounded-xl bg-slate-700 px-3 text-sm font-black text-white" onClick={() => dispatch({ type: 'CLEAR_CELL' })} type="button">
          Clear
        </button>
      </div>

      {state.lastError ? <div className="rounded-xl bg-rose-950 px-3 py-2 text-sm text-rose-300">{state.lastError}</div> : null}
      {state.status === 'WON' ? <div className="rounded-xl bg-emerald-950 px-3 py-2 text-sm text-emerald-300">Sudoku complete!</div> : null}
      {state.status === 'LOST' ? <div className="rounded-xl bg-amber-950 px-3 py-2 text-sm text-amber-300">You have reached the mistake limit.</div> : null}
    </div>
  );
}
