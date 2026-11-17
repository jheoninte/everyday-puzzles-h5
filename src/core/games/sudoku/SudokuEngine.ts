import {
  BasePuzzleConfig,
  BasePuzzleEngine,
  BasePuzzleState,
  HintResult,
} from '../BasePuzzleEngine';

export interface SudokuPosition {
  row: number;
  col: number;
}

export interface SudokuConfig extends BasePuzzleConfig {
  difficulty: 'easy' | 'medium' | 'hard';
  size: number;
  subgridRows: number;
  subgridCols: number;
  maxMistakes: number;
  hintCount: number;
  givens: number[][];
  solution: number[][];
}

export interface SudokuState extends BasePuzzleState {
  difficulty: 'easy' | 'medium' | 'hard';
  size: number;
  subgridRows: number;
  subgridCols: number;
  maxMistakes: number;
  hintCount: number;
  board: number[][];
  selectedCell: SudokuPosition | null;
  lastError: string | null;
}

export type SudokuAction =
  | { type: 'SELECT_CELL'; row: number; col: number }
  | { type: 'INPUT_VALUE'; value: number }
  | { type: 'CLEAR_CELL' };

function cloneBoard(board: number[][]): number[][] {
  return board.map((row) => [...row]);
}

export class SudokuEngine extends BasePuzzleEngine<SudokuConfig, SudokuState, SudokuAction> {
  protected createInitialState(config: SudokuConfig): SudokuState {
    return {
      status: 'PLAYING',
      elapsedSeconds: 0,
      hintsUsed: 0,
      revivesUsed: 0,
      mistakeCount: 0,
      difficulty: config.difficulty,
      size: config.size,
      subgridRows: config.subgridRows,
      subgridCols: config.subgridCols,
      maxMistakes: config.maxMistakes,
      hintCount: config.hintCount,
      board: cloneBoard(config.givens),
      selectedCell: null,
      lastError: null,
    };
  }

  public submitAction(action: SudokuAction): SudokuState {
    if (this.state.status !== 'PLAYING') {
      return this.getState();
    }

    this.state.lastError = null;

    switch (action.type) {
      case 'SELECT_CELL':
        this.handleSelectCell(action.row, action.col);
        break;
      case 'INPUT_VALUE':
        this.handleInputValue(action.value);
        break;
      case 'CLEAR_CELL':
        this.handleClearCell();
        break;
    }

    this.notify();
    return this.getState();
  }

  public applyHint(): HintResult<SudokuState> {
    if (this.state.status !== 'PLAYING') {
      return { success: false, message: 'This puzzle has ended.', state: this.getState() };
    }

    if (this.getHintsLeft() <= 0) {
      return { success: false, message: 'No hints are left.', state: this.getState() };
    }

    const targetCell = this.getHintTarget();
    if (!targetCell) {
      return { success: false, message: 'There are no empty cells to fill.', state: this.getState() };
    }

    this.state.board[targetCell.row][targetCell.col] = this.config.solution[targetCell.row][targetCell.col];
    this.state.hintsUsed += 1;
    this.state.selectedCell = targetCell;
    this.updateSolvedStatus();
    this.notify();

    return {
      success: true,
      message: `Filled row ${targetCell.row + 1}, column ${targetCell.col + 1}.`,
      state: this.getState(),
    };
  }

  public revive(): boolean {
    if (this.state.status !== 'LOST') {
      return false;
    }

    this.state.status = 'PLAYING';
    this.state.revivesUsed += 1;
    this.state.mistakeCount = Math.max(0, this.state.mistakeCount - 1);
    this.notify();
    return true;
  }

  private handleSelectCell(row: number, col: number): void {
    this.state.selectedCell = { row, col };

    if (this.isGivenCell(row, col)) {
      this.state.lastError = 'Starting numbers cannot be changed.';
    }
  }

  private handleInputValue(value: number): void {
    if (!this.state.selectedCell) {
      this.state.lastError = 'Select a cell first.';
      return;
    }

    if (value < 1 || value > this.config.size) {
      this.state.lastError = 'That number is not valid.';
      return;
    }

    const { row, col } = this.state.selectedCell;
    if (this.isGivenCell(row, col)) {
      this.state.lastError = 'Starting numbers cannot be changed.';
      return;
    }

    const expectedValue = this.config.solution[row][col];
    if (value !== expectedValue) {
      this.state.board[row][col] = 0;
      this.state.mistakeCount += 1;
      this.state.lastError = 'That is not the answer. Try again.';
      if (this.state.mistakeCount >= this.config.maxMistakes) {
        this.state.status = 'LOST';
      }
      return;
    }

    this.state.board[row][col] = value;
    this.updateSolvedStatus();
  }

  private handleClearCell(): void {
    if (!this.state.selectedCell) {
      this.state.lastError = 'Select a cell first.';
      return;
    }

    const { row, col } = this.state.selectedCell;
    if (this.isGivenCell(row, col)) {
      this.state.lastError = 'Starting numbers cannot be changed.';
      return;
    }

    this.state.board[row][col] = 0;
  }

  private getHintTarget(): SudokuPosition | null {
    if (this.state.selectedCell) {
      const { row, col } = this.state.selectedCell;
      if (!this.isGivenCell(row, col) && this.state.board[row][col] === 0) {
        return { row, col };
      }
    }

    for (let row = 0; row < this.config.size; row += 1) {
      for (let col = 0; col < this.config.size; col += 1) {
        if (!this.isGivenCell(row, col) && this.state.board[row][col] === 0) {
          return { row, col };
        }
      }
    }

    return null;
  }

  private updateSolvedStatus(): void {
    for (let row = 0; row < this.config.size; row += 1) {
      for (let col = 0; col < this.config.size; col += 1) {
        if (this.state.board[row][col] !== this.config.solution[row][col]) {
          return;
        }
      }
    }

    this.state.status = 'WON';
  }

  private isGivenCell(row: number, col: number): boolean {
    return this.config.givens[row][col] !== 0;
  }
}
