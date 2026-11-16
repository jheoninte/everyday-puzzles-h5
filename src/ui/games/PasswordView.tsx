import { useMemo, useState } from 'react';
import { PasswordAction, PasswordEngine, PasswordState } from '../../core/games/password/PasswordEngine';
import { VirtualKeyboard } from '../components/VirtualKeyboard';

interface PasswordViewProps {
  onSolved?: () => void;
}

export function PasswordView({ onSolved }: PasswordViewProps) {
  const engine = useMemo(
    () =>
      new PasswordEngine({
        puzzleId: '2026-11-16-password',
        date: '2026-11-16',
        wordLength: 5,
        maxAttempts: 6,
        answer: 'APPLE',
        validDictionary: ['APPLE', 'ALERT', 'ANGLE', 'AMPLE', 'GRAPE', 'PLANE', 'SMART'],
      }),
    [],
  );
  const [state, setState] = useState<PasswordState>(engine.getState());

  const dispatch = (action: PasswordAction) => {
    const next = engine.submitAction(action);
    setState(next);
    if (next.status === 'WON') onSolved?.();
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid gap-2">
        {state.board.map((row, rowIndex) => (
          <div key={
ow-} className="grid grid-cols-5 gap-2">
            {row.map((tile, tileIndex) => (
              <div
                key={	ile--}
                className={lex h-14 items-center justify-center rounded-xl border text-lg font-black uppercase }
              >
                {tile.letter}
              </div>
            ))}
          </div>
        ))}
      </div>

      {state.lastError ? <div className="rounded-xl bg-rose-950 px-3 py-2 text-sm text-rose-300">{state.lastError}</div> : null}

      <div className="flex items-center justify-between rounded-2xl bg-slate-800 px-4 py-3 text-sm">
        <span>힌트 사용 {state.hintsUsed}회</span>
        <button className="rounded-lg bg-amber-400 px-3 py-2 font-black text-slate-950" onClick={() => setState(engine.applyHint().state)} type="button">
          힌트
        </button>
      </div>

      <VirtualKeyboard
        onLetter={(letter) => dispatch({ type: 'INPUT_LETTER', letter })}
        onDelete={() => dispatch({ type: 'DELETE_LETTER' })}
        onEnter={() => dispatch({ type: 'SUBMIT_GUESS' })}
        stateMap={state.keyboardState}
      />
    </div>
  );
}

