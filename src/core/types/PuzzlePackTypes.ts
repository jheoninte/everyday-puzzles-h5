export const GAME_IDS = ['password', 'hashtag', 'anygram', 'sudoku'] as const;
export type GameId = typeof GAME_IDS[number];

export interface PackEntry {
  id: string;
  title: string;
  order: number;
  difficulty: 'easy' | 'medium' | 'hard';
  path: string;
  revision: number;
}

export interface PackManifest {
  version: 1;
  packs: PackEntry[];
}

export interface PasswordPuzzleDefinition {
  wordLength: number;
  maxAttempts: number;
  answer: string;
  hint?: string;
  validDictionary?: string[];
}

export interface HashtagPuzzleDefinition {
  gridSize: number;
  solutionGrid: Array<Array<string | null>>;
  maxMoves: number;
  initialGrid?: Array<Array<string | null>>;
}

export interface AnygramPuzzleDefinition {
  baseLetters: string[];
  validWords: string[];
}

export interface SudokuPuzzleDefinition {
  difficulty: 'easy' | 'medium' | 'hard';
  size: number;
  subgridRows: number;
  subgridCols: number;
  maxMistakes: number;
  hintCount: number;
  givens: number[][];
  solution: number[][];
}

export interface DailyPuzzlePack {
  date: string;
  version: number;
  games: {
    password?: PasswordPuzzleDefinition;
    hashtag?: HashtagPuzzleDefinition;
    anygram?: AnygramPuzzleDefinition;
    sudoku?: SudokuPuzzleDefinition;
  };
}
