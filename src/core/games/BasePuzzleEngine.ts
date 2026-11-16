export type GameStatus = 'IDLE' | 'PLAYING' | 'WON' | 'LOST';

export interface BasePuzzleConfig {
  puzzleId: string;
  date: string;
}

export interface BasePuzzleState {
  status: GameStatus;
  elapsedSeconds: number;
  hintsUsed: number;
  revivesUsed: number;
  mistakeCount: number;
}

export interface HintResult<TState> {
  success: boolean;
  message?: string;
  state: TState;
}

export interface PuzzleReward {
  baseXp: number;
  noMistakeBonusXp: number;
  speedBonusXp: number;
  totalXp: number;
  coinsEarned: number;
}

export abstract class BasePuzzleEngine<
  TConfig extends BasePuzzleConfig,
  TState extends BasePuzzleState,
  TAction,
> {
  protected config: TConfig;
  protected state: TState;
  private listeners: Array<(state: TState) => void> = [];

  constructor(config: TConfig) {
    this.config = config;
    this.state = this.createInitialState(config);
  }

  protected abstract createInitialState(config: TConfig): TState;
  public abstract submitAction(action: TAction): TState;
  public abstract applyHint(): HintResult<TState>;
  public abstract revive(): boolean;

  public getState(): TState {
    return JSON.parse(JSON.stringify(this.state)) as TState;
  }

  public restoreState(savedState: TState): void {
    this.state = JSON.parse(JSON.stringify(savedState)) as TState;
    this.notify();
  }

  public tickSecond(): void {
    if (this.state.status === 'PLAYING') {
      this.state.elapsedSeconds += 1;
      this.notify();
    }
  }

  public calculateReward(): PuzzleReward {
    if (this.state.status !== 'WON') {
      return { baseXp: 0, noMistakeBonusXp: 0, speedBonusXp: 0, totalXp: 0, coinsEarned: 0 };
    }

    const baseXp = 50;
    const noMistakeBonusXp = this.state.mistakeCount === 0 ? 25 : 0;
    const speedBonusXp = this.state.elapsedSeconds <= 120 ? 15 : 0;
    const totalXp = baseXp + noMistakeBonusXp + speedBonusXp;
    const coinsEarned = 10 + (this.state.hintsUsed === 0 ? 5 : 0);

    return { baseXp, noMistakeBonusXp, speedBonusXp, totalXp, coinsEarned };
  }

  public subscribe(listener: (state: TState) => void): () => void {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((current) => current !== listener);
    };
  }

  protected notify(): void {
    const snapshot = this.getState();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

