import {
  CHESS_COM_EXPECTED_POINTS_THRESHOLDS,
  CHESS_COM_SPECIAL_MOVE_THRESHOLDS,
  CRUSHING_ADVANTAGE_CENTIPAWNS,
  DEFAULT_REFERENCE_ELO,
} from "../constants/chessConstants";
import { type EngineScore, type MoveClassification, type PlayerColor } from "../types/chess";
import { scoreToMoverCentipawns } from "../utils/evaluationScoreUtils";

export interface MoveClassificationContext {
  ply: number;
  isExactBestMove: boolean;
  winPercentBefore: number;
  winPercentAfter: number;
  winPercentDrop: number;
  secondBestWinPercentGap: number;
  isRecapture: boolean;
  isForcedMove: boolean;
  isSacrifice: boolean;
  isBookCandidate: boolean;
  scoreBefore: EngineScore;
  scoreAfter: EngineScore;
  moverColor: PlayerColor;
  playerElo?: number;
  previousMoveClassification?: MoveClassification | null;
}

export interface MoveClassificationRule {
  classify(context: MoveClassificationContext): MoveClassification | null;
}

export class CheckmateBlunderRule implements MoveClassificationRule {
  public classify(ctx: MoveClassificationContext): MoveClassification | null {
    if (isBlunderByCheckmate(ctx.scoreBefore, ctx.scoreAfter, ctx.moverColor)) {
      return "blunder";
    }
    return null;
  }
}

export class BrilliantMoveRule implements MoveClassificationRule {
  public classify(ctx: MoveClassificationContext): MoveClassification | null {
    if (isBrilliantCandidate(ctx)) {
      return "brilliant";
    }
    return null;
  }
}

export class GreatMoveRule implements MoveClassificationRule {
  public classify(ctx: MoveClassificationContext): MoveClassification | null {
    if (isGreatCandidate(ctx)) {
      return "great";
    }
    return null;
  }
}

export class BookMoveRule implements MoveClassificationRule {
  public classify(ctx: MoveClassificationContext): MoveClassification | null {
    const isOpeningBookSound =
      ctx.isBookCandidate && ctx.winPercentDrop <= CHESS_COM_EXPECTED_POINTS_THRESHOLDS.EXCELLENT;
    if (isOpeningBookSound) {
      return "book";
    }
    return null;
  }
}

export class BestMoveRule implements MoveClassificationRule {
  public classify(ctx: MoveClassificationContext): MoveClassification | null {
    const isBestMove = ctx.isExactBestMove || ctx.winPercentDrop <= 0.0;
    if (isBestMove) {
      return "best";
    }
    return null;
  }
}

export class MissedForcedMateRule implements MoveClassificationRule {
  public classify(ctx: MoveClassificationContext): MoveClassification | null {
    if (checkIsMissedForcedMate(ctx.scoreBefore, ctx.scoreAfter, ctx.moverColor)) {
      return "miss";
    }
    return null;
  }
}

export class ExcellentMoveRule implements MoveClassificationRule {
  public classify(ctx: MoveClassificationContext): MoveClassification | null {
    if (ctx.winPercentDrop <= CHESS_COM_EXPECTED_POINTS_THRESHOLDS.EXCELLENT) {
      return "excellent";
    }
    return null;
  }
}

export class GoodMoveRule implements MoveClassificationRule {
  public classify(ctx: MoveClassificationContext): MoveClassification | null {
    if (ctx.winPercentDrop <= CHESS_COM_EXPECTED_POINTS_THRESHOLDS.GOOD) {
      return "good";
    }
    return null;
  }
}

export class InaccuracyRule implements MoveClassificationRule {
  public classify(ctx: MoveClassificationContext): MoveClassification | null {
    if (ctx.winPercentDrop <= CHESS_COM_EXPECTED_POINTS_THRESHOLDS.INACCURACY) {
      return "inaccuracy";
    }
    return null;
  }
}

export class MissRule implements MoveClassificationRule {
  public classify(ctx: MoveClassificationContext): MoveClassification | null {
    if (isMissCandidate(ctx)) {
      return "miss";
    }
    return null;
  }
}

export class MistakeRule implements MoveClassificationRule {
  public classify(ctx: MoveClassificationContext): MoveClassification | null {
    if (ctx.winPercentDrop <= CHESS_COM_EXPECTED_POINTS_THRESHOLDS.MISTAKE) {
      return "mistake";
    }
    return null;
  }
}

export class DefaultBlunderRule implements MoveClassificationRule {
  public classify(): MoveClassification {
    return "blunder";
  }
}

export class MoveClassificationChain {
  private readonly rules: MoveClassificationRule[];

  constructor(customRules?: MoveClassificationRule[]) {
    this.rules = customRules ?? [
      new CheckmateBlunderRule(),
      new BrilliantMoveRule(),
      new GreatMoveRule(),
      new BookMoveRule(),
      new BestMoveRule(),
      new MissedForcedMateRule(),
      new ExcellentMoveRule(),
      new GoodMoveRule(),
      new InaccuracyRule(),
      new MissRule(),
      new MistakeRule(),
      new DefaultBlunderRule(),
    ];
  }

  public classify(context: MoveClassificationContext): MoveClassification {
    for (const rule of this.rules) {
      const result = rule.classify(context);
      if (result !== null) {
        return result;
      }
    }
    return "blunder";
  }
}

function isBlunderByCheckmate(scoreBefore: EngineScore, scoreAfter: EngineScore, moverColor: PlayerColor): boolean {
  const moverScoreBefore = scoreToMoverCentipawns(scoreBefore, moverColor);
  const moverScoreAfter = scoreToMoverCentipawns(scoreAfter, moverColor);

  const wasFacingMateBefore = scoreBefore.type === "mate" && moverScoreBefore < 0;
  const isFacingMateAfter = scoreAfter.type === "mate" && moverScoreAfter < 0;
  const walkedIntoAvoidableCheckmate = !wasFacingMateBefore && isFacingMateAfter;

  if (walkedIntoAvoidableCheckmate) {
    return true;
  }

  const hadForcedMateBefore = scoreBefore.type === "mate" && moverScoreBefore > 0;
  const hasForcedMateAfter = scoreAfter.type === "mate" && moverScoreAfter > 0;
  const blunderedIntoLossAfterForcedMate = hadForcedMateBefore && !hasForcedMateAfter && moverScoreAfter < -250;

  return blunderedIntoLossAfterForcedMate;
}

function checkIsMissedForcedMate(scoreBefore: EngineScore, scoreAfter: EngineScore, moverColor: PlayerColor): boolean {
  const moverScoreBefore = scoreToMoverCentipawns(scoreBefore, moverColor);
  const moverScoreAfter = scoreToMoverCentipawns(scoreAfter, moverColor);

  const hadForcedMateBefore = scoreBefore.type === "mate" && moverScoreBefore > 0;
  const hasForcedMateAfter = scoreAfter.type === "mate" && moverScoreAfter > 0;

  const missedMate = hadForcedMateBefore && !hasForcedMateAfter;
  const avoidedBlunderingIntoLoss = moverScoreAfter >= -250;

  return missedMate && avoidedBlunderingIntoLoss;
}

function isMissCandidate(ctx: MoveClassificationContext): boolean {
  if (checkIsMissedForcedMate(ctx.scoreBefore, ctx.scoreAfter, ctx.moverColor)) {
    return true;
  }

  const moverCentipawnsBefore = scoreToMoverCentipawns(ctx.scoreBefore, ctx.moverColor);
  const hadDecisiveAdvantageBefore =
    ctx.winPercentBefore >= CHESS_COM_SPECIAL_MOVE_THRESHOLDS.MISS_MIN_WIN_PERCENT_BEFORE ||
    moverCentipawnsBefore >= CHESS_COM_SPECIAL_MOVE_THRESHOLDS.MISS_MIN_CENTIPAWNS_BEFORE;

  const opponentJustMadeMistake =
    ctx.previousMoveClassification === "blunder" ||
    ctx.previousMoveClassification === "mistake" ||
    ctx.previousMoveClassification === "miss" ||
    ctx.previousMoveClassification === "inaccuracy";

  const hadTacticalOpportunity = hadDecisiveAdvantageBefore || opponentJustMadeMistake;
  const hasSubstantialLoss = ctx.winPercentDrop >= CHESS_COM_EXPECTED_POINTS_THRESHOLDS.INACCURACY;
  const positionNotSelfDestroyed = ctx.winPercentAfter >= CHESS_COM_SPECIAL_MOVE_THRESHOLDS.MISS_MIN_WIN_PERCENT_AFTER;

  return hadTacticalOpportunity && hasSubstantialLoss && positionNotSelfDestroyed;
}

function isBrilliantCandidate(ctx: MoveClassificationContext): boolean {
  if (!ctx.isSacrifice || ctx.isBookCandidate || ctx.isRecapture || ctx.isForcedMove) {
    return false;
  }

  const isBestOrNearBest = ctx.isExactBestMove || ctx.winPercentDrop <= 0.5;
  const isSoundSacrifice =
    ctx.winPercentAfter >= CHESS_COM_SPECIAL_MOVE_THRESHOLDS.MIN_BRILLIANT_WIN_PERCENT_AFTER ||
    scoreToMoverCentipawns(ctx.scoreAfter, ctx.moverColor) >= -50;
  const isContestedPosition = !isPositionAlreadyCrushing(ctx.scoreBefore, ctx.moverColor, ctx.winPercentBefore);

  return isBestOrNearBest && isSoundSacrifice && isContestedPosition;
}

function isGreatCandidate(ctx: MoveClassificationContext): boolean {
  if (!ctx.isExactBestMove || ctx.isBookCandidate || ctx.isRecapture || ctx.isForcedMove) {
    return false;
  }

  const isContestedPosition = !isPositionAlreadyCrushing(ctx.scoreBefore, ctx.moverColor, ctx.winPercentBefore);
  if (!isContestedPosition) {
    return false;
  }

  const isLowerRatedPlayer =
    (ctx.playerElo ?? DEFAULT_REFERENCE_ELO) < CHESS_COM_SPECIAL_MOVE_THRESHOLDS.LOWER_ELO_THRESHOLD;
  const requiredGap = isLowerRatedPlayer
    ? CHESS_COM_SPECIAL_MOVE_THRESHOLDS.LOWER_ELO_GREAT_MOVE_GAP
    : CHESS_COM_SPECIAL_MOVE_THRESHOLDS.STANDARD_GREAT_MOVE_GAP;

  const isCriticalOnlyMove = ctx.secondBestWinPercentGap >= requiredGap;

  const isCriticalRescue =
    ctx.winPercentBefore <= CHESS_COM_SPECIAL_MOVE_THRESHOLDS.RESCUE_LOSING_WIN_PERCENT_BEFORE &&
    ctx.winPercentAfter >= CHESS_COM_SPECIAL_MOVE_THRESHOLDS.RESCUE_EQUAL_WIN_PERCENT_AFTER;

  const isCriticalBreakthrough =
    ctx.winPercentBefore >= CHESS_COM_SPECIAL_MOVE_THRESHOLDS.BREAKTHROUGH_MIN_BEFORE &&
    ctx.winPercentBefore <= CHESS_COM_SPECIAL_MOVE_THRESHOLDS.BREAKTHROUGH_MAX_BEFORE &&
    ctx.winPercentAfter >= CHESS_COM_SPECIAL_MOVE_THRESHOLDS.BREAKTHROUGH_WIN_PERCENT_AFTER;

  return isCriticalOnlyMove || isCriticalRescue || isCriticalBreakthrough;
}

function isPositionAlreadyCrushing(score: EngineScore, moverColor: PlayerColor, winPercent: number): boolean {
  const moverScore = scoreToMoverCentipawns(score, moverColor);
  return winPercent >= 98.0 || moverScore >= CRUSHING_ADVANTAGE_CENTIPAWNS;
}
