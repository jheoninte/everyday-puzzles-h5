const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

interface VirtualKeyboardProps {
  onLetter: (letter: string) => void;
  onEnter: () => void;
  onDelete: () => void;
  stateMap?: Record<string, string>;
}

const STATE_CLASS: Record<string, string> = {
  CORRECT: 'bg-emerald-500 text-slate-950',
  PRESENT: 'bg-amber-400 text-slate-950',
  ABSENT: 'bg-slate-700 text-slate-300',
  TBD: 'bg-slate-600 text-white',
  EMPTY: 'bg-slate-600 text-white',
};

function getKeyClassName(letter: string, stateMap: Record<string, string>): string {
  const stateClassName = STATE_CLASS[stateMap[letter] || 'EMPTY'];
  return `h-11 min-w-0 flex-1 rounded-md px-0 text-sm font-black ${stateClassName}`;
}

export function VirtualKeyboard({ onLetter, onEnter, onDelete, stateMap = {} }: VirtualKeyboardProps) {
  return (
    <div className="space-y-2 px-2 pb-4">
      {ROWS.map((row) => (
        <div key={row} className="flex items-center justify-center gap-1">
          {row.split('').map((letter) => (
            <button
              key={letter}
              className={getKeyClassName(letter, stateMap)}
              onClick={() => onLetter(letter)}
              type="button"
            >
              {letter}
            </button>
          ))}
        </div>
      ))}
      <div className="flex items-center justify-center gap-1">
        <button className="h-11 rounded-md bg-indigo-500 px-4 text-sm font-black text-white" onClick={onEnter} type="button">
          ENTER
        </button>
        <button className="h-11 rounded-md bg-slate-700 px-4 text-sm font-black text-white" onClick={onDelete} type="button">
          DELETE
        </button>
      </div>
    </div>
  );
}
