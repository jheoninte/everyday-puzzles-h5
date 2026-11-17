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
  bonusHints?: number;
  rewardedAdIds?: string[];
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

export function calculatePuzzleReward(state: BasePuzzleState): PuzzleReward {
  if (state.status !== 'WON') return { baseXp: 0, noMistakeBonusXp: 0, speedBonusXp: 0, totalXp: 0, coinsEarned: 0 };
  const baseXp = 50;
  const noMistakeBonusXp = state.mistakeCount === 0 ? 25 : 0;
  const speedBonusXp = state.elapsedSeconds <= 120 ? 15 : 0;
  return { baseXp, noMistakeBonusXp, speedBonusXp, totalXp: baseXp + noMistakeBonusXp + speedBonusXp, coinsEarned: 10 + (state.hintsUsed === 0 ? 5 : 0) };
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

  public getHintsLeft(): number { return Math.max(0, 3 + (this.state.bonusHints ?? 0) - this.state.hintsUsed); }
  public grantRewardedHint(rewardId: string): boolean {
    if (this.state.status !== 'PLAYING' || this.state.rewardedAdIds?.includes(rewardId)) return false;
    this.state.bonusHints = (this.state.bonusHints ?? 0) + 1;
    this.state.rewardedAdIds = [...(this.state.rewardedAdIds ?? []), rewardId];
    this.notify();
    return true;
  }

  public getState(): TState {
    return JSON.parse(JSON.stringify(this.state)) as TState;
  }

  public restoreState(savedState: TState): void {
    this.state = JSON.parse(JSON.stringify(savedState)) as TState;
    // Error notices are transient; older saves may contain text in another language.
    if ('lastError' in this.state) (this.state as TState & { lastError: string | null }).lastError = null;
    this.notify();
  }

  public tickSecond(seconds = 1): void {
    if (this.state.status === 'PLAYING') {
      this.state.elapsedSeconds += Math.max(0, Math.floor(seconds));
      this.notify();
    }
  }

  public calculateReward(): PuzzleReward {
    return calculatePuzzleReward(this.state);
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

