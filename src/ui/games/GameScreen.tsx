import { useMemo } from 'react';
import { DailyPuzzlePack, GameId, PackEntry } from '../../core/types/PuzzlePackTypes';
import { PuzzleFinishedHandler } from '../hooks/usePersistentPuzzle';
import { PasswordView } from './PasswordView';
import { HashtagView } from './HashtagView';
import { AnygramView } from './AnygramView';
import { SudokuView } from './SudokuView';

interface GameScreenProps {
  entry: PackEntry;
  pack: DailyPuzzlePack;
  gameId: GameId;
  onFinished: PuzzleFinishedHandler;
}

export function GameScreen({ entry, pack, gameId, onFinished }: GameScreenProps) {
  const config = useMemo(() => ({ puzzleId: `${entry.id}-${gameId}`, date: pack.date, ...pack.games[gameId] }), [entry.id, gameId, pack]);
  switch (gameId) {
    case 'password': return <PasswordView config={config as Parameters<typeof PasswordView>[0]['config']} onFinished={onFinished} />;
    case 'hashtag': return <HashtagView config={config as Parameters<typeof HashtagView>[0]['config']} onFinished={onFinished} />;
    case 'anygram': return <AnygramView config={config as Parameters<typeof AnygramView>[0]['config']} onFinished={onFinished} />;
    case 'sudoku': return <SudokuView config={config as Parameters<typeof SudokuView>[0]['config']} onFinished={onFinished} />;
  }
}
