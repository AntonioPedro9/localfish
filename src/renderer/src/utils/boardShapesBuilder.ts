import { type DrawShape } from "@lichess-org/chessground/draw";
import type * as cg from "@lichess-org/chessground/types";
import {
  type EngineAnalysisSnapshot,
  type GameMoveDescriptor,
  type MoveClassification,
  type ReviewedMoveAnalysis,
} from "@shared/types/chess";
import { isValidUciMove } from "@shared/utils/chessMoveUtils";
import {
  DEFAULT_BOARD_LAST_MOVE_COLOR,
  MOVE_CLASSIFICATION_META,
  SUBOPTIMAL_MOVE_CLASSIFICATIONS,
} from "@/constants/moveClassificationMeta";
import { getMoveClassificationSvgMarkup } from "@/constants/moveClassificationSvgMarkup";

export class ChessBoardShapesBuilder {
  private readonly shapes: DrawShape[] = [];
  private readonly currentFen: string;

  constructor(currentFen: string) {
    this.currentFen = currentFen;
  }

  public withLiveEngineArrows(liveSnapshot: EngineAnalysisSnapshot | null): this {
    const isSnapshotCurrent = liveSnapshot !== null && liveSnapshot.fen === this.currentFen;
    if (!isSnapshotCurrent) {
      return this;
    }

    const primaryMoveUci = liveSnapshot.bestMoveUci ?? liveSnapshot.lines[0]?.pvUciMoves[0] ?? null;
    if (isValidUciMove(primaryMoveUci)) {
      this.shapes.push({
        orig: primaryMoveUci.slice(0, 2) as cg.Key,
        dest: primaryMoveUci.slice(2, 4) as cg.Key,
        brush: "green",
      });
    }

    const secondaryMoveUci = liveSnapshot.lines[1]?.pvUciMoves[0] ?? null;
    const hasDistinctSecondBestMove = isValidUciMove(secondaryMoveUci) && secondaryMoveUci !== primaryMoveUci;

    if (hasDistinctSecondBestMove) {
      this.shapes.push({
        orig: secondaryMoveUci.slice(0, 2) as cg.Key,
        dest: secondaryMoveUci.slice(2, 4) as cg.Key,
        brush: "blue",
        modifiers: { lineWidth: 7 },
      });
    }

    return this;
  }

  public withReviewedMoveAnnotations(reviewedMove: ReviewedMoveAnalysis | null, isExplorationActive = false): this {
    const shouldRenderAnnotations = reviewedMove !== null && !isExplorationActive;
    if (!shouldRenderAnnotations) {
      return this;
    }

    const destSquare = reviewedMove.playedUci.slice(2, 4) as cg.Key;
    const meta = MOVE_CLASSIFICATION_META[reviewedMove.classification];

    this.shapes.push({
      orig: destSquare,
      customSvg: {
        html: buildMoveClassificationBoardSvg(reviewedMove.classification),
        center: "orig",
      },
    });

    const isSuboptimalMove = SUBOPTIMAL_MOVE_CLASSIFICATIONS.has(reviewedMove.classification);
    const bestMove = reviewedMove.bestMoveUci;

    if (isSuboptimalMove && isValidUciMove(bestMove)) {
      this.shapes.push({
        orig: bestMove.slice(0, 2) as cg.Key,
        dest: bestMove.slice(2, 4) as cg.Key,
        brush: meta.arrowBrush,
        modifiers: { lineWidth: 9 },
      });
    }

    return this;
  }

  public withShape(shape: DrawShape): this {
    this.shapes.push(shape);
    return this;
  }

  public build(): DrawShape[] {
    return [...this.shapes];
  }
}

export function buildBoardAutoShapes(params: {
  fen: string;
  liveSnapshot: EngineAnalysisSnapshot | null;
  reviewedMove: ReviewedMoveAnalysis | null;
  explorationLastMove: [string, string] | null;
}): DrawShape[] {
  const isExplorationActive = params.explorationLastMove !== null;

  return new ChessBoardShapesBuilder(params.fen)
    .withLiveEngineArrows(params.liveSnapshot)
    .withReviewedMoveAnnotations(params.reviewedMove, isExplorationActive)
    .build();
}

function buildMoveClassificationBoardSvg(classification: MoveClassification): string {
  const iconMarkup = getMoveClassificationSvgMarkup(classification);

  return `
    <g transform="translate(64, -7) scale(2)">
      ${iconMarkup}
    </g>
  `;
}

export function resolveBoardLastMoveTileColor(
  reviewedMove: ReviewedMoveAnalysis | null,
  isExplorationActive: boolean = false
): string {
  const isEligibleForClassificationHighlight = reviewedMove !== null && !isExplorationActive;

  if (!isEligibleForClassificationHighlight) {
    return DEFAULT_BOARD_LAST_MOVE_COLOR;
  }

  const presentation = MOVE_CLASSIFICATION_META[reviewedMove.classification];
  return presentation?.boardHighlightColor ?? DEFAULT_BOARD_LAST_MOVE_COLOR;
}

export function resolveLastMoveSquares(
  explorationLastMove: [string, string] | null,
  lastMove: GameMoveDescriptor | null
): cg.Key[] | undefined {
  if (explorationLastMove) {
    return [explorationLastMove[0] as cg.Key, explorationLastMove[1] as cg.Key];
  }
  if (lastMove) {
    return [lastMove.from as cg.Key, lastMove.to as cg.Key];
  }
  return undefined;
}
