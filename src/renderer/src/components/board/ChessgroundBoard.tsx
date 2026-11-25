import { useMemo } from "react";
import { type DrawShape } from "@lichess-org/chessground/draw";
import type * as cg from "@lichess-org/chessground/types";
import {
  type BoardOrientation,
  type EngineAnalysisSnapshot,
  type GameMoveDescriptor,
  type ReviewedMoveAnalysis,
} from "@shared/types/chess";
import { extractTurnOrientationFromFen } from "@shared/utils/chessMoveUtils";
import { useChessground } from "@/hooks/useChessground";
import {
  buildBoardAutoShapes,
  resolveBoardLastMoveTileColor,
  resolveLastMoveSquares,
} from "@/utils/boardShapesBuilder";
import { computeBoardPositionDetails } from "@/utils/chessNotationParser";

interface ChessgroundBoardProps {
  fen: string;
  orientation: BoardOrientation;
  lastMove: GameMoveDescriptor | null;
  explorationLastMove: [string, string] | null;
  reviewedMove: ReviewedMoveAnalysis | null;
  liveSnapshot: EngineAnalysisSnapshot | null;
  onUserMove: (orig: string, dest: string) => boolean;
}

export function ChessgroundBoard({
  fen,
  orientation,
  lastMove,
  explorationLastMove,
  reviewedMove,
  liveSnapshot,
  onUserMove,
}: ChessgroundBoardProps) {
  const turnColor: cg.Color = useMemo(() => extractTurnOrientationFromFen(fen), [fen]);
  const { legalDests, isInCheck } = useMemo(() => computeBoardPositionDetails(fen), [fen]);

  const resolvedLastMove = useMemo<cg.Key[] | undefined>(
    () => resolveLastMoveSquares(explorationLastMove, lastMove),
    [explorationLastMove, lastMove]
  );

  const autoShapes = useMemo<DrawShape[]>(
    () =>
      buildBoardAutoShapes({
        fen,
        liveSnapshot,
        reviewedMove,
        explorationLastMove,
      }),
    [explorationLastMove, fen, liveSnapshot, reviewedMove]
  );

  const isExplorationActive = explorationLastMove !== null;
  const lastMoveTileColor = useMemo(
    () => resolveBoardLastMoveTileColor(reviewedMove, isExplorationActive),
    [reviewedMove, isExplorationActive]
  );

  const { boardContainerRef } = useChessground({
    fen,
    orientation,
    turnColor,
    isInCheck,
    legalDests,
    resolvedLastMove,
    autoShapes,
    onUserMove,
  });

  return (
    <div className="relative flex aspect-square w-full select-none items-center justify-center overflow-hidden rounded-md shadow-md ring-1 ring-border/50">
      <div
        ref={boardContainerRef}
        className="cg-wrap h-full w-full"
        style={
          {
            "--cg-last-move-bg": lastMoveTileColor,
          } as React.CSSProperties
        }
      />
    </div>
  );
}
