import {
  BasePuzzleConfig,
  BasePuzzleEngine,
  BasePuzzleState,
  HintResult,
} from '../BasePuzzleEngine';

export interface AnygramConfig extends BasePuzzleConfig {
  baseLetters: string[];
  validWords: string[];
}

export interface AnygramState extends BasePuzzleState {
  baseLetters: string[];
  currentInput: string;
  foundWords: string[];
  remainingWords: string[];
  shuffledLetters: string[];
  lastError: string | null;
}

export type AnygramAction =
  | { type: 'ADD_LETTER'; index: number }
  | { type: 'DELETE_LETTER' }
  | { type: 'CLEAR_INPUT' }
  | { type: 'SHUFFLE_LETTERS' }
  | { type: 'SUBMIT_WORD' };

function cloneLetters(letters: string[]): string[] {
  return [...letters];
}

export class AnygramEngine extends BasePuzzleEngine<AnygramConfig, AnygramState, AnygramAction> {
  protected createInitialState(config: AnygramConfig): AnygramState {
    const normalizedWords = config.validWords.map((word) => word.toUpperCase());
    return {
      status: 'PLAYING',
      elapsedSeconds: 0,
      hintsUsed: 0,
      revivesUsed: 0,
      mistakeCount: 0,
      baseLetters: config.baseLetters.map((letter) => letter.toUpperCase()),
      currentInput: '',
      foundWords: [],
      remainingWords: normalizedWords,
      shuffledLetters: this.createShuffledLetters(config.baseLetters),
      lastError: null,
    };
  }

  public submitAction(action: AnygramAction): AnygramState {
    if (this.state.status !== 'PLAYING') {
      return this.getState();
    }

    this.state.lastError = null;

    switch (action.type) {
      case 'ADD_LETTER':
        this.handleAddLetter(action.index);
        break;
      case 'DELETE_LETTER':
        this.state.currentInput = this.state.currentInput.slice(0, -1);
        break;
      case 'CLEAR_INPUT':
        this.state.currentInput = '';
        break;
      case 'SHUFFLE_LETTERS':
        this.state.shuffledLetters = this.shuffleLetters(this.state.shuffledLetters);
        break;
      case 'SUBMIT_WORD':
        this.handleSubmitWord();
        break;
    }

    this.notify();
    return this.getState();
  }

  public applyHint(): HintResult<AnygramState> {
    if (this.getHintsLeft() <= 0) return { success: false, message: 'You have used all your free hints.', state: this.getState() };
    if (this.state.status !== 'PLAYING') {
      return { success: false, message: 'This puzzle has ended.', state: this.getState() };
    }

    const nextWord = this.state.remainingWords.find((word) => !this.state.foundWords.includes(word));
    if (!nextWord) {
      return { success: false, message: 'There are no more words to reveal.', state: this.getState() };
    }

    if (this.state.currentInput === nextWord) {
      return { success: false, message: 'Try submitting your current word.', state: this.getState() };
    }
    const prefixLength = nextWord.startsWith(this.state.currentInput) ? this.state.currentInput.length + 1 : 1;
    this.state.hintsUsed += 1;
    this.state.currentInput = nextWord.slice(0, prefixLength);
    this.notify();

    return {
      success: true,
      message: `Hint: the next word starts with ${this.state.currentInput}.`,
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

  private handleAddLetter(index: number): void {
    const letter = this.state.shuffledLetters[index];
    if (!letter) {
      return;
    }

    if (!this.canBuildWordWithInput(this.state.currentInput + letter)) {
      this.state.lastError = 'You have used all available letters.';
      return;
    }

    this.state.currentInput += letter;
  }

  private handleSubmitWord(): void {
    const submittedWord = this.state.currentInput.toUpperCase();
    if (submittedWord.length < 2) {
      this.state.lastError = 'Enter a word with at least two letters.';
      return;
    }

    if (!this.canBuildWordWithInput(submittedWord)) {
      this.state.lastError = 'Use only the letters provided.';
      this.state.mistakeCount += 1;
      return;
    }

    if (!this.state.remainingWords.includes(submittedWord)) {
      this.state.lastError = 'That word is not in this puzzle.';
      this.state.mistakeCount += 1;
      return;
    }

    if (this.state.foundWords.includes(submittedWord)) {
      this.state.lastError = 'You have already found that word.';
      return;
    }

    this.state.foundWords = [...this.state.foundWords, submittedWord].sort((left, right) => right.length - left.length || left.localeCompare(right));
    this.state.currentInput = '';

    if (this.state.foundWords.length >= this.state.remainingWords.length) {
      this.state.status = 'WON';
    }
  }

  private canBuildWordWithInput(word: string): boolean {
    const availableCounts = this.countLetters(this.state.baseLetters);
    const inputCounts = this.countLetters(word.split(''));

    return Object.entries(inputCounts).every(([letter, count]) => count <= (availableCounts[letter] || 0));
  }

  private countLetters(letters: string[]): Record<string, number> {
    return letters.reduce<Record<string, number>>((acc, letter) => {
      const normalized = letter.toUpperCase();
      acc[normalized] = (acc[normalized] || 0) + 1;
      return acc;
    }, {});
  }

  private createShuffledLetters(letters: string[]): string[] {
    return this.shuffleLetters(letters.map((letter) => letter.toUpperCase()));
  }

  private shuffleLetters(letters: string[]): string[] {
    const shuffled = cloneLetters(letters);
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const targetIndex = (index * 7 + 3) % (index + 1);
      [shuffled[index], shuffled[targetIndex]] = [shuffled[targetIndex], shuffled[index]];
    }

    return shuffled;
  }
}
