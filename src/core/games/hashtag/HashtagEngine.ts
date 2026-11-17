import {
  BasePuzzleConfig,
  BasePuzzleEngine,
  BasePuzzleState,
  HintResult,
} from '../BasePuzzleEngine';

export interface HashtagPosition {
  row: number;
  col: number;
}

export interface HashtagConfig extends BasePuzzleConfig {
  gridSize: number;
  solutionGrid: Array<Array<string | null>>;
  maxMoves: number;
  initialGrid?: Array<Array<string | null>>;
}

export interface HashtagState extends BasePuzzleState {
  gridSize: number;
  maxMoves: number;
  moveCount: number;
  currentGrid: Array<Array<string | null>>;
  selectedCell: HashtagPosition | null;
  lastError: string | null;
}

export type HashtagAction =
  | { type: 'SELECT_CELL'; row: number; col: number }
  | { type: 'CLEAR_SELECTION' };

function cloneGrid(grid: Array<Array<string | null>>): Array<Array<string | null>> {
  return grid.map((row) => [...row]);
}

export class HashtagEngine extends BasePuzzleEngine<HashtagConfig, HashtagState, HashtagAction> {
  protected createInitialState(config: HashtagConfig): HashtagState {
    return {
      status: 'PLAYING',
      elapsedSeconds: 0,
      hintsUsed: 0,
      revivesUsed: 0,
      mistakeCount: 0,
      gridSize: config.gridSize,
      maxMoves: config.maxMoves,
      moveCount: 0,
      currentGrid: config.initialGrid ? cloneGrid(config.initialGrid) : this.createScrambledGrid(config.solutionGrid),
      selectedCell: null,
      lastError: null,
    };
  }

  public submitAction(action: HashtagAction): HashtagState {
    if (this.state.status !== 'PLAYING') {
      return this.getState();
    }

    this.state.lastError = null;

    switch (action.type) {
      case 'SELECT_CELL':
        this.handleSelectCell(action.row, action.col);
        break;
      case 'CLEAR_SELECTION':
        this.state.selectedCell = null;
        break;
    }

    this.notify();
    return this.getState();
  }

  public applyHint(): HintResult<HashtagState> {
    if (this.getHintsLeft() <= 0) return { success: false, message: 'You have used all your free hints.', state: this.getState() };
    if (this.state.status !== 'PLAYING') {
      return { success: false, message: 'This puzzle has ended.', state: this.getState() };
    }

    const incorrectPosition = this.findFirstIncorrectPosition();
    if (!incorrectPosition) {
      return { success: false, message: 'Every tile is already in the right place.', state: this.getState() };
    }

    const targetLetter = this.config.solutionGrid[incorrectPosition.row][incorrectPosition.col];
    const swapCandidate = this.findBestSwapCandidate(incorrectPosition, targetLetter);

    if (swapCandidate) {
      this.swapCells(incorrectPosition, swapCandidate);
    } else {
      this.state.currentGrid[incorrectPosition.row][incorrectPosition.col] = targetLetter;
    }

    this.state.hintsUsed += 1;
    this.state.selectedCell = null;
    this.updateStatusAfterMove();
    this.notify();

    return {
      success: true,
      message: `Placed the correct letter at row ${incorrectPosition.row + 1}, column ${incorrectPosition.col + 1}.`,
      state: this.getState(),
    };
  }

  public revive(): boolean {
    if (this.state.status !== 'LOST') {
      return false;
    }

    this.state.status = 'PLAYING';
    this.state.revivesUsed += 1;
    this.state.moveCount = Math.max(0, this.state.moveCount - 2);
    this.state.selectedCell = null;
    this.notify();
    return true;
  }

  private createScrambledGrid(solutionGrid: Array<Array<string | null>>): Array<Array<string | null>> {
    const grid = cloneGrid(solutionGrid);
    const activePositions: HashtagPosition[] = [];
    const letters: string[] = [];

    for (let row = 0; row < solutionGrid.length; row += 1) {
      for (let col = 0; col < solutionGrid[row].length; col += 1) {
        const value = solutionGrid[row][col];
        if (value !== null) {
          activePositions.push({ row, col });
          letters.push(value);
        }
      }
    }

    if (letters.length <= 1) {
      return grid;
    }

    const rotatedLetters = letters.map((_, index) => letters[(index + 3) % letters.length]);
    activePositions.forEach((position, index) => {
      grid[position.row][position.col] = rotatedLetters[index];
    });

    if (this.isSolvedGrid(grid)) {
      const reversed = [...rotatedLetters].reverse();
      activePositions.forEach((position, index) => {
        grid[position.row][position.col] = reversed[index];
      });
    }

    return grid;
  }

  private handleSelectCell(row: number, col: number): void {
    if (!this.isPlayableCell(row, col)) {
      this.state.lastError = 'Choose a letter tile.';
      return;
    }

    const selectedCell = this.state.selectedCell;
    if (!selectedCell) {
      this.state.selectedCell = { row, col };
      return;
    }

    if (selectedCell.row === row && selectedCell.col === col) {
      this.state.selectedCell = null;
      return;
    }

    const beforeCorrectCount = this.countCorrectTiles();
    this.swapCells(selectedCell, { row, col });
    this.state.selectedCell = null;
    this.state.moveCount += 1;

    const afterCorrectCount = this.countCorrectTiles();
    if (afterCorrectCount <= beforeCorrectCount && !this.isSolved()) {
      this.state.mistakeCount += 1;
    }

    this.updateStatusAfterMove();
  }

  private updateStatusAfterMove(): void {
    if (this.isSolved()) {
      this.state.status = 'WON';
      return;
    }

    if (this.state.moveCount >= this.state.maxMoves) {
      this.state.status = 'LOST';
    }
  }

  private isSolved(): boolean {
    return this.isSolvedGrid(this.state.currentGrid);
  }

  private isSolvedGrid(grid: Array<Array<string | null>>): boolean {
    for (let row = 0; row < this.config.gridSize; row += 1) {
      for (let col = 0; col < this.config.gridSize; col += 1) {
        if (grid[row][col] !== this.config.solutionGrid[row][col]) {
          return false;
        }
      }
    }

    return true;
  }

  private countCorrectTiles(): number {
    let correctCount = 0;
    for (let row = 0; row < this.config.gridSize; row += 1) {
      for (let col = 0; col < this.config.gridSize; col += 1) {
        const current = this.state.currentGrid[row][col];
        const solution = this.config.solutionGrid[row][col];
        if (current !== null && current === solution) {
          correctCount += 1;
        }
      }
    }

    return correctCount;
  }

  private findFirstIncorrectPosition(): HashtagPosition | null {
    for (let row = 0; row < this.config.gridSize; row += 1) {
      for (let col = 0; col < this.config.gridSize; col += 1) {
        const current = this.state.currentGrid[row][col];
        const solution = this.config.solutionGrid[row][col];
        if (current !== null && current !== solution) {
          return { row, col };
        }
      }
    }

    return null;
  }

  private findBestSwapCandidate(targetPosition: HashtagPosition, targetLetter: string | null): HashtagPosition | null {
    if (!targetLetter) {
      return null;
    }

    for (let row = 0; row < this.config.gridSize; row += 1) {
      for (let col = 0; col < this.config.gridSize; col += 1) {
        if (row === targetPosition.row && col === targetPosition.col) {
          continue;
        }

        if (this.state.currentGrid[row][col] !== targetLetter) {
          continue;
        }

        if (this.config.solutionGrid[row][col] !== targetLetter) {
          return { row, col };
        }
      }
    }

    for (let row = 0; row < this.config.gridSize; row += 1) {
      for (let col = 0; col < this.config.gridSize; col += 1) {
        if (row === targetPosition.row && col === targetPosition.col) {
          continue;
        }

        if (this.state.currentGrid[row][col] === targetLetter) {
          return { row, col };
        }
      }
    }

    return null;
  }

  private swapCells(first: HashtagPosition, second: HashtagPosition): void {
    const firstValue = this.state.currentGrid[first.row][first.col];
    const secondValue = this.state.currentGrid[second.row][second.col];
    this.state.currentGrid[first.row][first.col] = secondValue;
    this.state.currentGrid[second.row][second.col] = firstValue;
  }

  private isPlayableCell(row: number, col: number): boolean {
    return this.state.currentGrid[row][col] !== null;
  }
}
