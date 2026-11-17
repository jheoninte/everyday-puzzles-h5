import {
  BasePuzzleConfig,
  BasePuzzleEngine,
  BasePuzzleState,
  HintResult,
} from '../BasePuzzleEngine';

export type LetterState = 'EMPTY' | 'TBD' | 'CORRECT' | 'PRESENT' | 'ABSENT';

export interface TileData {
  letter: string;
  state: LetterState;
  isHintRevealed?: boolean;
}

export interface PasswordConfig extends BasePuzzleConfig {
  wordLength: number;
  maxAttempts: number;
  answer: string;
  validDictionary?: string[];
  hint?: string;
}

export interface PasswordState extends BasePuzzleState {
  wordLength: number;
  maxAttempts: number;
  board: TileData[][];
  currentRow: number;
  currentInput: string;
  keyboardState: Record<string, LetterState>;
  revealedIndices: number[];
  lastError: string | null;
}

export type PasswordAction =
  | { type: 'INPUT_LETTER'; letter: string }
  | { type: 'DELETE_LETTER' }
  | { type: 'SUBMIT_GUESS' };

export class PasswordEngine extends BasePuzzleEngine<PasswordConfig, PasswordState, PasswordAction> {
  protected createInitialState(config: PasswordConfig): PasswordState {
    const board = Array.from({ length: config.maxAttempts }, () =>
      Array.from({ length: config.wordLength }, () => ({
        letter: '',
        state: 'EMPTY' as LetterState,
      })),
    );

    return {
      status: 'PLAYING',
      elapsedSeconds: 0,
      hintsUsed: 0,
      revivesUsed: 0,
      mistakeCount: 0,
      wordLength: config.wordLength,
      maxAttempts: config.maxAttempts,
      board,
      currentRow: 0,
      currentInput: '',
      keyboardState: {},
      revealedIndices: [],
      lastError: null,
    };
  }

  public submitAction(action: PasswordAction): PasswordState {
    if (this.state.status !== 'PLAYING') {
      return this.getState();
    }

    this.state.lastError = null;

    switch (action.type) {
      case 'INPUT_LETTER':
        this.handleInputLetter(action.letter.toUpperCase());
        break;
      case 'DELETE_LETTER':
        this.handleDeleteLetter();
        break;
      case 'SUBMIT_GUESS':
        this.handleSubmitGuess();
        break;
    }

    this.notify();
    return this.getState();
  }

  public applyHint(): HintResult<PasswordState> {
    if (this.getHintsLeft() <= 0) return { success: false, message: 'You have used all your free hints.', state: this.getState() };
    if (this.state.status !== 'PLAYING') {
      return { success: false, message: 'This puzzle has ended.', state: this.getState() };
    }

    const hiddenIndex = Array.from({ length: this.state.wordLength }, (_, index) => index).find(
      (index) => !this.state.revealedIndices.includes(index),
    );

    if (hiddenIndex === undefined) {
      return { success: false, message: 'There are no more letters to reveal.', state: this.getState() };
    }

    this.state.revealedIndices.push(hiddenIndex);
    this.state.hintsUsed += 1;
    this.syncCurrentRowWithInput();
    this.notify();

    return {
      success: true,
      message: `Revealed letter ${hiddenIndex + 1}.`,
      state: this.getState(),
    };
  }

  public revive(): boolean {
    if (this.state.status !== 'LOST') {
      return false;
    }

    this.state.status = 'PLAYING';
    this.state.revivesUsed += 1;
    this.state.currentInput = '';
    this.notify();
    return true;
  }

  private handleInputLetter(letter: string): void {
    if (!/^[A-Z]$/.test(letter)) {
      return;
    }

    if (this.state.currentInput.length >= this.state.wordLength) {
      return;
    }

    this.state.currentInput += letter;
    this.syncCurrentRowWithInput();
  }

  private handleDeleteLetter(): void {
    if (this.state.currentInput.length === 0) {
      return;
    }

    this.state.currentInput = this.state.currentInput.slice(0, -1);
    this.syncCurrentRowWithInput();
  }

  private syncCurrentRowWithInput(): void {
    const row = this.state.board[this.state.currentRow];
    for (let index = 0; index < this.state.wordLength; index += 1) {
      const char = this.state.currentInput[index] || '';
      row[index] = {
        letter: char,
        state: char ? 'TBD' : 'EMPTY',
        isHintRevealed: this.state.revealedIndices.includes(index),
      };
    }
  }

  private handleSubmitGuess(): void {
    const guess = this.state.currentInput.toUpperCase();
    const answer = this.config.answer.toUpperCase();

    if (guess.length < this.state.wordLength) {
      this.state.lastError = 'Enter a complete word.';
      return;
    }

    if (this.config.validDictionary?.length && !this.config.validDictionary.includes(guess)) {
      this.state.lastError = 'That word is not in the dictionary.';
      return;
    }

    const evaluation = this.evaluateGuess(guess, answer);
    const currentRowTiles = this.state.board[this.state.currentRow];

    for (let index = 0; index < this.state.wordLength; index += 1) {
      const letter = guess[index];
      const resultState = evaluation[index];
      currentRowTiles[index] = {
        letter,
        state: resultState,
        isHintRevealed: this.state.revealedIndices.includes(index),
      };

      this.updateKeyboardPriority(letter, resultState);
      if (resultState === 'CORRECT' && !this.state.revealedIndices.includes(index)) {
        this.state.revealedIndices.push(index);
      }
    }

    if (guess === answer) {
      this.state.status = 'WON';
      return;
    }

    this.state.mistakeCount += 1;
    if (this.state.currentRow + 1 >= this.state.maxAttempts) {
      this.state.status = 'LOST';
      return;
    }

    this.state.currentRow += 1;
    this.state.currentInput = '';
  }

  private evaluateGuess(guess: string, answer: string): LetterState[] {
    const result: LetterState[] = Array(this.state.wordLength).fill('ABSENT');
    const answerLetterCounts: Record<string, number> = {};

    for (const char of answer) {
      answerLetterCounts[char] = (answerLetterCounts[char] || 0) + 1;
    }

    for (let index = 0; index < this.state.wordLength; index += 1) {
      if (guess[index] === answer[index]) {
        result[index] = 'CORRECT';
        answerLetterCounts[guess[index]] -= 1;
      }
    }

    for (let index = 0; index < this.state.wordLength; index += 1) {
      if (result[index] === 'CORRECT') {
        continue;
      }

      const char = guess[index];
      if ((answerLetterCounts[char] || 0) > 0) {
        result[index] = 'PRESENT';
        answerLetterCounts[char] -= 1;
      }
    }

    return result;
  }

  private updateKeyboardPriority(letter: string, nextState: LetterState): void {
    const currentState = this.state.keyboardState[letter];
    const priority: Record<LetterState, number> = {
      EMPTY: 0,
      TBD: 1,
      ABSENT: 2,
      PRESENT: 3,
      CORRECT: 4,
    };

    if (!currentState || priority[nextState] >= priority[currentState]) {
      this.state.keyboardState[letter] = nextState;
    }
  }
}
