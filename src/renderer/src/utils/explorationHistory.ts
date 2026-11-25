import { type PromotionChoicePiece } from "@shared/types/chess";

export interface ExplorationStepMemento {
  readonly fen: string;
  readonly lastMove: [string, string];
  readonly san: string;
}

export interface BoardMoveCommand {
  readonly orig: string;
  readonly dest: string;
  readonly promotionPiece?: PromotionChoicePiece;
}

export interface ExplorationHistoryTransitionResult {
  readonly history: ExplorationHistory;
  readonly affectedStep: ExplorationStepMemento | null;
}

export class ExplorationHistory {
  private constructor(
    private readonly pastSteps: readonly ExplorationStepMemento[] = [],
    private readonly futureSteps: readonly ExplorationStepMemento[] = []
  ) {}

  public static empty(): ExplorationHistory {
    return new ExplorationHistory([], []);
  }

  public static of(
    pastSteps: readonly ExplorationStepMemento[],
    futureSteps: readonly ExplorationStepMemento[] = []
  ): ExplorationHistory {
    return new ExplorationHistory(pastSteps, futureSteps);
  }

  public push(memento: ExplorationStepMemento): ExplorationHistory {
    return new ExplorationHistory([...this.pastSteps, memento], []);
  }

  public undo(): ExplorationHistoryTransitionResult {
    if (this.pastSteps.length === 0) {
      return { history: this, affectedStep: null };
    }

    const affectedStep = this.pastSteps[this.pastSteps.length - 1];
    const updatedPast = this.pastSteps.slice(0, -1);
    const updatedFuture = [affectedStep, ...this.futureSteps];

    return {
      history: new ExplorationHistory(updatedPast, updatedFuture),
      affectedStep,
    };
  }

  public redo(): ExplorationHistoryTransitionResult {
    if (this.futureSteps.length === 0) {
      return { history: this, affectedStep: null };
    }

    const affectedStep = this.futureSteps[0];
    const updatedFuture = this.futureSteps.slice(1);
    const updatedPast = [...this.pastSteps, affectedStep];

    return {
      history: new ExplorationHistory(updatedPast, updatedFuture),
      affectedStep,
    };
  }

  public clear(): ExplorationHistory {
    return ExplorationHistory.empty();
  }

  public get currentStep(): ExplorationStepMemento | null {
    if (this.pastSteps.length === 0) {
      return null;
    }
    return this.pastSteps[this.pastSteps.length - 1];
  }

  public get currentFen(): string | null {
    return this.currentStep?.fen ?? null;
  }

  public get currentLastMove(): [string, string] | null {
    return this.currentStep?.lastMove ?? null;
  }

  public get canUndo(): boolean {
    return this.pastSteps.length > 0;
  }

  public get canRedo(): boolean {
    return this.futureSteps.length > 0;
  }

  public get length(): number {
    return this.pastSteps.length;
  }

  public get steps(): readonly ExplorationStepMemento[] {
    return this.pastSteps;
  }
}
