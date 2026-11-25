import { useCallback, useMemo, useState } from "react";
import { type EngineScore, type ReviewedMoveAnalysis } from "@shared/types/chess";
import { parseImportedChessInput } from "@/utils/chessNotationParser";
import { useChessGame } from "./useChessGame";
import { useChessShortcuts } from "./useChessShortcuts";
import { useGameReview } from "./useGameReview";
import { useLiveEngineAnalysis } from "./useLiveEngineAnalysis";

export type ReviewViewMode = "summary" | "interactive";

export function useChessReviewSession() {
  const [reviewViewMode, setReviewViewMode] = useState<ReviewViewMode>("summary");
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const game = useChessGame();

  const handleGlobalError = useCallback((message: string) => {
    setErrorBanner(message);
  }, []);

  const review = useGameReview({
    onError: handleGlobalError,
  });

  const engine = useLiveEngineAnalysis({
    currentFen: game.currentFen,
    isGameLoaded: game.isGameLoaded,
    isReviewRunning: review.isReviewRunning,
    isEnabled: reviewViewMode === "interactive",
    onError: handleGlobalError,
  });

  useChessShortcuts({
    isEnabled: game.isGameLoaded,
    onGoToPrevious: game.goToPreviousMove,
    onGoToNext: game.goToNextMove,
    onGoToFirst: game.goToFirstMove,
    onGoToLast: game.goToLastMove,
    onFlipBoard: game.flipBoard,
  });

  const currentReviewedMove = useMemo<ReviewedMoveAnalysis | null>(() => {
    const canResolve = review.reviewReport !== null && game.explorationFen === null && game.currentPly > 0;
    if (!canResolve) {
      return null;
    }
    return review.reviewReport?.moves.find((item) => item.ply === game.currentPly) ?? null;
  }, [review.reviewReport, game.explorationFen, game.currentPly]);

  const displayedScore = useMemo<EngineScore | null>(() => {
    if (currentReviewedMove) {
      return currentReviewedMove.scoreAfter;
    }

    const liveSnapshot = engine.liveSnapshot;
    const hasLiveScore = liveSnapshot !== null && liveSnapshot.fen === game.currentFen && liveSnapshot.lines.length > 0;

    if (hasLiveScore) {
      return liveSnapshot.lines[0].score;
    }

    return null;
  }, [currentReviewedMove, engine.liveSnapshot, game.currentFen]);

  const importChessText = useCallback(
    async (rawInput: string) => {
      await engine.stopAnalysis();
      await review.cancelReview();
      const parsed = parseImportedChessInput(rawInput);
      game.loadParsedGame(parsed);
      review.resetReviewState();
      setErrorBanner(null);

      if (parsed.moves.length > 0) {
        setReviewViewMode("summary");
        void review.executeGameReview(parsed.initialFen, parsed.moves, parsed.metadata);
      } else {
        void review.cancelReview();
        setReviewViewMode("interactive");
      }
    },
    [engine, game, review]
  );

  const cancelReview = useCallback(async () => {
    await engine.stopAnalysis();
    await review.cancelReview();
  }, [engine, review]);

  const startInteractiveReview = useCallback(() => {
    setReviewViewMode("interactive");
    const shouldAdvanceToFirstMove = game.currentPly === 0 && game.moves.length > 0;
    if (shouldAdvanceToFirstMove) {
      game.goToPly(1);
    }
  }, [game]);

  const showSummaryOverview = useCallback(() => {
    setReviewViewMode("summary");
  }, []);

  return {
    isGameLoaded: game.isGameLoaded,
    metadata: game.metadata,
    moves: game.moves,
    currentPly: game.currentPly,
    currentFen: game.currentFen,
    currentMove: game.currentMove,
    currentReviewedMove,
    explorationFen: game.explorationFen,
    explorationLastMove: game.explorationLastMove,
    explorationSteps: game.explorationSteps,
    canUndoExploration: game.canUndoExploration,
    canRedoExploration: game.canRedoExploration,
    boardOrientation: game.boardOrientation,
    pendingPromotion: game.pendingPromotion,
    liveSnapshot: engine.liveSnapshot,
    displayedScore,
    reviewReport: review.reviewReport,
    isReviewRunning: review.isReviewRunning,
    reviewProgress: review.reviewProgress,
    reviewViewMode,
    errorBanner,
    setErrorBanner,
    goToPly: game.goToPly,
    goToFirstMove: game.goToFirstMove,
    goToPreviousMove: game.goToPreviousMove,
    goToNextMove: game.goToNextMove,
    goToLastMove: game.goToLastMove,
    resetExploration: game.resetExploration,
    undoExplorationStep: game.undoExplorationStep,
    redoExplorationStep: game.redoExplorationStep,
    handleUserBoardMove: game.handleUserBoardMove,
    confirmPendingPromotion: game.confirmPendingPromotion,
    cancelPendingPromotion: game.cancelPendingPromotion,
    flipBoard: game.flipBoard,
    cancelReview,
    importChessText,
    startInteractiveReview,
    showSummaryOverview,
  };
}
