import { Chess } from "chess.js";
import {
  BASELINE_ACCEPTABLE_CPL,
  CPL_TO_WIN_DROP_SCALE_FACTOR,
  DECISIVE_ADVANTAGE_CPL_BYPASS_CENTIPAWNS,
  DEFAULT_REFERENCE_ELO,
  ELO_LOGISTIC_SCALE_FACTOR,
  EXCESS_CPL_RATING_PENALTY_MULTIPLIER,
  GAME_ACCURACY_ARITHMETIC_WEIGHT,
  GAME_ACCURACY_HARMONIC_FLOOR,
  GAME_ACCURACY_HARMONIC_WEIGHT,
  MAX_BOOK_PLY,
  MAX_CPL_EQUIVALENT_WIN_DROP,
  MAX_ESTIMATED_ELO,
  MAX_SINGLE_GAME_ELO_SHIFT,
  MAX_VALID_ELO,
  MIN_VALID_ELO,
  OPPONENT_ELO_WEIGHT_IN_ANCHOR,
  PEER_ACCURACY_STANDARD_DEVIATION,
  PLAYER_ELO_WEIGHT_IN_ANCHOR,
  RATING_ROUNDING_STEP,
  SAMPLE_SIZE_BENCHMARK_MOVES,
  TACTICAL_IMPACT_MOVE_NORMALIZER_DIVISOR,
} from "../constants/chessConstants";
import {
  type EngineScore,
  type MoveClassification,
  type PlayerColor,
  type PlayerReviewStats,
  type ReviewedMoveAnalysis,
} from "../types/chess";
import {
  calculateCentipawnLoss,
  calculateMoveAccuracy,
  calculateMoverWinPercentage,
  createEmptyClassificationCounts,
  roundToOneDecimal,
  scoreToMoverCentipawns,
} from "../utils/evaluationScoreUtils";
import { isMaterialSacrifice } from "./materialSacrificeDetector";
import { MoveClassificationChain, type MoveClassificationContext } from "./moveClassificationChain";
import { isMoveSequenceInOpeningBook } from "./openingBook";

interface ClassifyEvaluatedMoveParams {
  ply: number;
  moverColor: PlayerColor;
  playedUci: string;
  bestMoveUci: string | null;
  scoreBefore: EngineScore;
  scoreAfter: EngineScore;
  secondBestScoreBefore?: EngineScore | null;
  fenBefore?: string;
  fenAfter?: string;
  previousPlayedUci?: string | null;
  previousMoveClassification?: MoveClassification | null;
  isSacrifice?: boolean;
  isInBook?: boolean;
  playerElo?: number;
}

export function classifyEvaluatedMove(params: ClassifyEvaluatedMoveParams): {
  centipawnLoss: number;
  accuracy: number;
  classification: MoveClassification;
} {
  const {
    ply,
    moverColor,
    playedUci,
    bestMoveUci,
    scoreBefore,
    scoreAfter,
    secondBestScoreBefore,
    fenBefore,
    fenAfter,
    previousPlayedUci,
    previousMoveClassification,
    isSacrifice,
    isInBook,
    playerElo,
  } = params;

  const isExactBestMove = checkIsExactBestMove(playedUci, bestMoveUci);
  const winPercentBefore = calculateMoverWinPercentage(scoreBefore, moverColor, playerElo);
  const winPercentAfter = calculateMoverWinPercentage(scoreAfter, moverColor, playerElo);
  const winPercentDrop = Math.max(0, winPercentBefore - winPercentAfter);
  const secondBestWinPercentGap = calculateSecondBestWinPercentGap(
    winPercentBefore,
    secondBestScoreBefore,
    moverColor,
    playerElo
  );

  const isRecapture = isRecaptureMove(playedUci, previousPlayedUci);
  const legalMovesCount = resolveLegalMovesCount(fenBefore);
  const isForcedMove = legalMovesCount <= 1;

  const resolvedSacrifice =
    isSacrifice ??
    isMaterialSacrifice({
      fenBefore,
      fenAfter,
      playedUci,
    });

  const isBookCandidate = resolveIsBookCandidate({
    isInBook,
    playedUci,
    ply,
  });

  const classification = resolveMoveClassification({
    ply,
    isExactBestMove,
    winPercentBefore,
    winPercentAfter,
    winPercentDrop,
    secondBestWinPercentGap,
    isRecapture,
    isForcedMove,
    isSacrifice: resolvedSacrifice,
    isBookCandidate,
    scoreBefore,
    scoreAfter,
    moverColor,
    playerElo,
    previousMoveClassification,
  });

  const centipawnLoss = resolveReportedCentipawnLoss({
    isExactBestMove,
    classification,
    scoreBefore,
    scoreAfter,
    moverColor,
  });

  const accuracy = resolveReportedAccuracy({
    isExactBestMove,
    classification,
    winPercentDrop,
    centipawnLoss,
    scoreAfter,
    moverColor,
  });

  return {
    centipawnLoss,
    accuracy,
    classification,
  };
}

export function buildPlayerReviewStats(moves: ReviewedMoveAnalysis[], color: PlayerColor): PlayerReviewStats {
  const playerMoves = moves.filter((move) => move.color === color);
  const emptyCounts = createEmptyClassificationCounts();

  if (playerMoves.length === 0) {
    return {
      accuracy: 100,
      averageCentipawnLoss: 0,
      counts: emptyCounts,
    };
  }

  for (const move of playerMoves) {
    const currentCount = emptyCounts[move.classification] ?? 0;
    emptyCounts[move.classification] = currentCount + 1;
  }

  const combinedAccuracy = calculateCombinedGameAccuracy(playerMoves);
  const totalCpl = playerMoves.reduce((sum, move) => sum + Math.min(move.centipawnLoss, 1000), 0);

  return {
    accuracy: roundToOneDecimal(combinedAccuracy),
    averageCentipawnLoss: Math.round(totalCpl / playerMoves.length),
    counts: emptyCounts,
  };
}

export function estimateGamePerformanceRating(
  stats: PlayerReviewStats,
  playerElo?: string | number | null,
  opponentElo?: string | number | null
): number {
  const effectiveReferenceElo = resolveEffectiveReferenceElo(playerElo, opponentElo);
  const expectedAccuracy = calculateExpectedAccuracyForRating(effectiveReferenceElo);
  const peerAccuracyDelta = calculatePeerAccuracyEloDelta(stats.accuracy, expectedAccuracy);

  const totalMoves = calculateTotalMovesFromCounts(stats.counts);
  const tacticalRatingImpact = calculateTacticalRatingImpact(stats.counts, totalMoves);
  const cplPenalty = calculateCentipawnLossPenalty(stats.averageCentipawnLoss);
  const sampleSizeDampingFactor = calculateSampleSizeDampingFactor(totalMoves);

  const netRatingShift = (peerAccuracyDelta + tacticalRatingImpact - cplPenalty) * sampleSizeDampingFactor;
  const rawRating = effectiveReferenceElo + netRatingShift;

  return clampAndRoundRating(rawRating);
}

const defaultClassificationChain = new MoveClassificationChain();

function resolveMoveClassification(params: MoveClassificationContext): MoveClassification {
  return defaultClassificationChain.classify(params);
}

function resolveIsBookCandidate(params: { isInBook?: boolean; playedUci: string; ply: number }): boolean {
  const { isInBook, playedUci, ply } = params;
  if (isInBook !== undefined) {
    return isInBook;
  }

  const isEarlyPly = ply <= MAX_BOOK_PLY;
  return isEarlyPly && isMoveSequenceInOpeningBook([playedUci]);
}

function checkIsExactBestMove(playedUci: string, bestMoveUci: string | null): boolean {
  if (!bestMoveUci) {
    return false;
  }

  return playedUci.trim().toLowerCase() === bestMoveUci.trim().toLowerCase();
}

function calculateSecondBestWinPercentGap(
  winPercentBefore: number,
  secondBestScoreBefore: EngineScore | null | undefined,
  moverColor: PlayerColor,
  playerElo?: number
): number {
  if (!secondBestScoreBefore) {
    return 0;
  }

  const secondBestWinPercent = calculateMoverWinPercentage(secondBestScoreBefore, moverColor, playerElo);
  return Math.max(0, winPercentBefore - secondBestWinPercent);
}

function isRecaptureMove(playedUci: string, previousUci?: string | null): boolean {
  if (!previousUci || playedUci.length < 4 || previousUci.length < 4) {
    return false;
  }

  const playedDestination = playedUci.slice(2, 4).toLowerCase();
  const previousDestination = previousUci.slice(2, 4).toLowerCase();
  return playedDestination === previousDestination;
}

function resolveLegalMovesCount(fenBefore?: string): number {
  if (!fenBefore) {
    return 20;
  }
  try {
    return new Chess(fenBefore).moves().length;
  } catch {
    return 20;
  }
}

function resolveReportedCentipawnLoss(params: {
  isExactBestMove: boolean;
  classification: MoveClassification;
  scoreBefore: EngineScore;
  scoreAfter: EngineScore;
  moverColor: PlayerColor;
}): number {
  const { isExactBestMove, classification, scoreBefore, scoreAfter, moverColor } = params;

  const isFreeFromLoss =
    isExactBestMove ||
    classification === "best" ||
    classification === "brilliant" ||
    classification === "great" ||
    classification === "book";

  if (isFreeFromLoss) {
    return 0;
  }

  return calculateCentipawnLoss(scoreBefore, scoreAfter, moverColor);
}

function resolveReportedAccuracy(params: {
  isExactBestMove: boolean;
  classification: MoveClassification;
  winPercentDrop: number;
  centipawnLoss: number;
  scoreAfter: EngineScore;
  moverColor: PlayerColor;
}): number {
  const { isExactBestMove, classification, winPercentDrop, centipawnLoss, scoreAfter, moverColor } = params;

  const isPerfectAccuracyMove =
    isExactBestMove ||
    classification === "best" ||
    classification === "brilliant" ||
    classification === "great" ||
    classification === "book";

  if (isPerfectAccuracyMove) {
    return 100;
  }

  const effectiveWinPercentDrop = resolveEffectiveWinPercentDrop({
    winPercentDrop,
    centipawnLoss,
    scoreAfter,
    moverColor,
  });

  return calculateMoveAccuracy(effectiveWinPercentDrop);
}

function resolveEffectiveWinPercentDrop(params: {
  winPercentDrop: number;
  centipawnLoss: number;
  scoreAfter: EngineScore;
  moverColor: PlayerColor;
}): number {
  const { winPercentDrop, centipawnLoss, scoreAfter, moverColor } = params;
  const moverCentipawnsAfter = scoreToMoverCentipawns(scoreAfter, moverColor);
  const isStillDecisivelyWinning = moverCentipawnsAfter >= DECISIVE_ADVANTAGE_CPL_BYPASS_CENTIPAWNS;

  if (isStillDecisivelyWinning) {
    return winPercentDrop;
  }

  const cplEquivalentDrop = Math.min(MAX_CPL_EQUIVALENT_WIN_DROP, centipawnLoss * CPL_TO_WIN_DROP_SCALE_FACTOR);

  return Math.max(winPercentDrop, cplEquivalentDrop);
}

function calculateCombinedGameAccuracy(playerMoves: ReviewedMoveAnalysis[]): number {
  const moveCount = playerMoves.length;
  const totalAccuracy = playerMoves.reduce((sum, move) => sum + move.accuracy, 0);
  const arithmeticMean = totalAccuracy / moveCount;

  const inverseAccuracySum = playerMoves.reduce(
    (sum, move) => sum + 1 / Math.max(GAME_ACCURACY_HARMONIC_FLOOR, move.accuracy),
    0
  );
  const harmonicMean = moveCount / inverseAccuracySum;

  return GAME_ACCURACY_ARITHMETIC_WEIGHT * arithmeticMean + GAME_ACCURACY_HARMONIC_WEIGHT * harmonicMean;
}

function resolveEffectiveReferenceElo(
  playerElo?: string | number | null,
  opponentElo?: string | number | null
): number {
  const validPlayerElo = parseValidElo(playerElo);
  const validOpponentElo = parseValidElo(opponentElo);

  const hasNoPlayerElo = validPlayerElo === null;
  if (hasNoPlayerElo) {
    return DEFAULT_REFERENCE_ELO;
  }

  const hasNoOpponentElo = validOpponentElo === null;
  if (hasNoOpponentElo) {
    return validPlayerElo;
  }

  const blendedElo = validPlayerElo * PLAYER_ELO_WEIGHT_IN_ANCHOR + validOpponentElo * OPPONENT_ELO_WEIGHT_IN_ANCHOR;

  return Math.round(blendedElo);
}

function parseValidElo(rawElo?: string | number | null): number | null {
  const isNil = rawElo === null || rawElo === undefined;
  if (isNil) {
    return null;
  }

  const parsedElo = typeof rawElo === "number" ? rawElo : Number.parseInt(rawElo, 10);
  const isValidElo = Number.isFinite(parsedElo) && parsedElo >= MIN_VALID_ELO && parsedElo <= MAX_VALID_ELO;

  return isValidElo ? parsedElo : null;
}

function calculateExpectedAccuracyForRating(rating: number): number {
  const peerGroupOffset = -(rating - 1300) / 600;
  return 50 + 45 / (1 + Math.exp(peerGroupOffset));
}

function calculatePeerAccuracyEloDelta(accuracy: number, expectedAccuracy: number): number {
  const accuracyGap = accuracy - expectedAccuracy;
  const logisticSlope = ELO_LOGISTIC_SCALE_FACTOR / PEER_ACCURACY_STANDARD_DEVIATION;
  const rawDelta = accuracyGap * logisticSlope;

  return MAX_SINGLE_GAME_ELO_SHIFT * Math.tanh(rawDelta / MAX_SINGLE_GAME_ELO_SHIFT);
}

function calculateTotalMovesFromCounts(counts: Record<MoveClassification, number>): number {
  return Object.values(counts).reduce((total, count) => total + count, 0);
}

function calculateTacticalRatingImpact(counts: Record<MoveClassification, number>, totalMoves: number): number {
  const brilliantBonus = (counts.brilliant ?? 0) * 35;
  const greatBonus = (counts.great ?? 0) * 15;
  const totalBonus = brilliantBonus + greatBonus;

  const blunderPenalty = (counts.blunder ?? 0) * 55;
  const missPenalty = (counts.miss ?? 0) * 25;
  const mistakePenalty = (counts.mistake ?? 0) * 20;
  const inaccuracyPenalty = (counts.inaccuracy ?? 0) * 8;
  const totalPenalty = blunderPenalty + missPenalty + mistakePenalty + inaccuracyPenalty;

  const moveNormalizer = Math.max(1, totalMoves / TACTICAL_IMPACT_MOVE_NORMALIZER_DIVISOR);
  return (totalBonus - totalPenalty) / moveNormalizer;
}

function calculateCentipawnLossPenalty(averageCentipawnLoss: number): number {
  const excessCpl = Math.max(0, averageCentipawnLoss - BASELINE_ACCEPTABLE_CPL);
  return excessCpl * EXCESS_CPL_RATING_PENALTY_MULTIPLIER;
}

function calculateSampleSizeDampingFactor(totalMoves: number): number {
  const isNegligibleSample = totalMoves <= 0;
  if (isNegligibleSample) {
    return 0.5;
  }

  const sampleRatio = totalMoves / SAMPLE_SIZE_BENCHMARK_MOVES;
  return Math.max(0.5, Math.min(1.0, Math.sqrt(sampleRatio)));
}

function clampAndRoundRating(rawRating: number): number {
  const roundedRating = Math.round(rawRating / RATING_ROUNDING_STEP) * RATING_ROUNDING_STEP;
  return Math.max(MIN_VALID_ELO, Math.min(MAX_ESTIMATED_ELO, roundedRating));
}
