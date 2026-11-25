import {
  type EngineScore,
  type GameMoveDescriptor,
  type MoveClassification,
  type ReviewedMoveAnalysis,
} from "@shared/types/chess";
import { calculateWhiteWinPercentage, formatEngineScoreLabel } from "@shared/utils/evaluationScoreUtils";
import { HIGHLIGHTED_CHART_CLASSIFICATIONS } from "@/constants/moveClassificationMeta";

export interface MovePairRow {
  moveNumber: number;
  white?: GameMoveDescriptor;
  black?: GameMoveDescriptor;
}

export interface EvaluationChartPoint {
  ply: number;
  whiteWinPercent: number;
  score: EngineScore | null;
  scoreLabel: string;
  san: string;
  moveLabel: string;
  classification: MoveClassification | null;
}

export function groupMovesIntoPairs(moves: GameMoveDescriptor[]): MovePairRow[] {
  const pairs: MovePairRow[] = [];

  for (const move of moves) {
    if (move.color === "w") {
      pairs.push({ moveNumber: move.moveNumber, white: move });
      continue;
    }

    const lastPair = pairs[pairs.length - 1];
    const canAttachBlackToLastPair =
      lastPair !== undefined && lastPair.moveNumber === move.moveNumber && lastPair.black === undefined;

    if (canAttachBlackToLastPair) {
      lastPair.black = move;
    } else {
      pairs.push({ moveNumber: move.moveNumber, black: move });
    }
  }

  return pairs;
}

export function buildEvaluationChartPoints(reviewedMoves: ReviewedMoveAnalysis[]): EvaluationChartPoint[] {
  const initialPoint: EvaluationChartPoint = {
    ply: 0,
    whiteWinPercent: 50,
    score: null,
    scoreLabel: "0.0",
    san: "Início",
    moveLabel: "Posição inicial",
    classification: null,
  };

  const movePoints: EvaluationChartPoint[] = reviewedMoves.map((move) => ({
    ply: move.ply,
    whiteWinPercent: calculateWhiteWinPercentage(move.scoreAfter),
    score: move.scoreAfter,
    scoreLabel: formatEngineScoreLabel(move.scoreAfter),
    san: move.playedSan,
    moveLabel: formatChartMoveLabel(move.ply, move.playedSan),
    classification: move.classification,
  }));

  return [initialPoint, ...movePoints];
}

export function isHighlightedMoveClassification(
  classification: MoveClassification | null
): classification is MoveClassification {
  return classification !== null && HIGHLIGHTED_CHART_CLASSIFICATIONS.has(classification);
}

export function formatChartMoveLabel(ply: number, san: string): string {
  if (ply === 0) {
    return "Posição inicial";
  }

  const moveNumber = Math.ceil(ply / 2);
  const isWhiteMove = ply % 2 === 1;
  const notation = isWhiteMove ? `${moveNumber}. ${san}` : `${moveNumber}... ${san}`;

  return `Lance ${ply} (${notation})`;
}
