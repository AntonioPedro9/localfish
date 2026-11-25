import {
  ACCURACY_CURVE_MULTIPLIER,
  ACCURACY_CURVE_OFFSET,
  DEFAULT_REFERENCE_ELO,
  ELO_ADJUSTMENT_RATIO_SCALE,
  MATE_CENTIPAWN_EQUIVALENT,
  MAX_ACTIVE_BAR_PERCENTAGE,
  MAX_ESTIMATED_ELO,
  MAX_EVAL_CENTIPAWNS,
  MIN_ACTIVE_BAR_PERCENTAGE,
  MIN_VALID_ELO,
  MOVE_ACCURACY_DECAY_RATE,
  WIN_PROBABILITY_COEFFICIENT,
} from "../constants/chessConstants";
import { type EngineScore, type MoveClassification, type PlayerColor } from "../types/chess";

export function calculateWhiteWinPercentage(score: EngineScore, playerElo?: number): number {
  if (score.type === "mate") {
    if (score.value > 0) return 100;
    if (score.value < 0) return 0;
  }

  const clampedCentipawns = Math.max(-MAX_EVAL_CENTIPAWNS, Math.min(MAX_EVAL_CENTIPAWNS, score.value));
  const coefficient = resolveWinProbabilityCoefficient(playerElo);
  const multiplier = 2 / (1 + Math.exp(coefficient * clampedCentipawns)) - 1;
  return 50 + 50 * multiplier;
}

export function calculateMoverWinPercentage(score: EngineScore, moverColor: PlayerColor, playerElo?: number): number {
  const whiteWinPercentage = calculateWhiteWinPercentage(score, playerElo);
  const isWhiteMover = moverColor === "w";
  return isWhiteMover ? whiteWinPercentage : 100 - whiteWinPercentage;
}

export function resolveBarFillPercentage(score: EngineScore | null, playerElo?: number): number {
  if (!score) {
    return 50;
  }

  if (isDeliveredCheckmate(score)) {
    return score.value > 0 ? 100 : 0;
  }

  if (score.type === "mate") {
    return resolveForcedMateFillPercentage(score.value);
  }

  const whiteWinPercentage = calculateWhiteWinPercentage(score, playerElo);
  return clampActiveGamePercentage(whiteWinPercentage);
}

function isDeliveredCheckmate(score: EngineScore): boolean {
  return score.type === "mate" && Boolean(score.isTerminalMate);
}

function resolveForcedMateFillPercentage(mateMovesDistance: number): number {
  return mateMovesDistance > 0 ? MAX_ACTIVE_BAR_PERCENTAGE : MIN_ACTIVE_BAR_PERCENTAGE;
}

function clampActiveGamePercentage(percentage: number): number {
  return Math.max(MIN_ACTIVE_BAR_PERCENTAGE, Math.min(MAX_ACTIVE_BAR_PERCENTAGE, percentage));
}

export function formatEngineScoreLabel(score: EngineScore | null): string {
  if (!score) {
    return "0.0";
  }

  if (score.type === "mate") {
    if (score.isTerminalMate) {
      return "#";
    }
    if (score.value > 0) {
      return `+M${score.value}`;
    }
    if (score.value < 0) {
      return `-M${Math.abs(score.value)}`;
    }
    return "#";
  }

  const pawns = score.value / 100;
  const formatted = pawns.toFixed(1);

  if (formatted === "0.0" || formatted === "-0.0") {
    return "0.0";
  }

  if (pawns > 0) {
    return `+${formatted}`;
  }

  return formatted;
}

function scoreToWhiteCentipawns(score: EngineScore): number {
  if (score.type === "cp") {
    return score.value;
  }

  const mateDirection = score.value >= 0 ? 1 : -1;
  const mateDistancePenalty = Math.min(Math.abs(score.value), 50) * 50;
  return mateDirection * (MATE_CENTIPAWN_EQUIVALENT - mateDistancePenalty);
}

export function scoreToMoverCentipawns(score: EngineScore, moverColor: PlayerColor): number {
  const perspectiveSign = moverColor === "w" ? 1 : -1;
  return scoreToWhiteCentipawns(score) * perspectiveSign;
}

export function calculateCentipawnLoss(
  scoreBefore: EngineScore,
  scoreAfter: EngineScore,
  moverColor: PlayerColor
): number {
  const moverScoreBefore = scoreToMoverCentipawns(scoreBefore, moverColor);
  const moverScoreAfter = scoreToMoverCentipawns(scoreAfter, moverColor);
  const rawLoss = moverScoreBefore - moverScoreAfter;

  return Math.max(0, Math.round(rawLoss));
}

export function calculateMoveAccuracy(effectiveWinPercentDrop: number): number {
  const rawAccuracy =
    ACCURACY_CURVE_MULTIPLIER * Math.exp(-MOVE_ACCURACY_DECAY_RATE * effectiveWinPercentDrop) - ACCURACY_CURVE_OFFSET;
  const clampedAccuracy = Math.max(0, Math.min(100, rawAccuracy));
  return roundToOneDecimal(clampedAccuracy);
}

export function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function createEmptyClassificationCounts(): Record<MoveClassification, number> {
  return {
    brilliant: 0,
    great: 0,
    book: 0,
    best: 0,
    excellent: 0,
    good: 0,
    inaccuracy: 0,
    mistake: 0,
    miss: 0,
    blunder: 0,
  };
}

function resolveWinProbabilityCoefficient(playerElo?: number): number {
  if (!playerElo || Number.isNaN(playerElo)) {
    return WIN_PROBABILITY_COEFFICIENT;
  }

  const clampedElo = Math.max(MIN_VALID_ELO, Math.min(MAX_ESTIMATED_ELO, playerElo));
  const eloAdjustmentRatio = (clampedElo - DEFAULT_REFERENCE_ELO) / DEFAULT_REFERENCE_ELO;
  return WIN_PROBABILITY_COEFFICIENT * (1 + ELO_ADJUSTMENT_RATIO_SCALE * eloAdjustmentRatio);
}
