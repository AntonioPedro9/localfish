import { useCallback, useEffect, useState } from "react";
import { type GameMoveDescriptor, type GameReviewProgressEvent, type GameReviewReport } from "@shared/types/chess";
import { type GameMetadata } from "@/utils/chessNotationParser";

interface UseGameReviewParams {
  onError: (message: string) => void;
}

export function useGameReview({ onError }: UseGameReviewParams) {
  const [reviewReport, setReviewReport] = useState<GameReviewReport | null>(null);
  const [isReviewRunning, setIsReviewRunning] = useState<boolean>(false);
  const [reviewProgress, setReviewProgress] = useState<GameReviewProgressEvent | null>(null);

  useEffect(() => {
    const unsubscribeProgress = window.localfishApi.onReviewProgress((progress) => {
      setReviewProgress(progress);
    });

    return () => {
      unsubscribeProgress();
    };
  }, []);

  const executeGameReview = useCallback(
    async (targetInitialFen: string, targetMoves: GameMoveDescriptor[], targetMetadata: GameMetadata) => {
      if (targetMoves.length === 0) {
        return;
      }

      setIsReviewRunning(true);
      setReviewProgress({
        currentPly: 0,
        totalPlies: targetMoves.length,
        percentage: 0,
        currentMoveSan: targetMoves[0]?.san ?? "",
      });

      try {
        const report = await window.localfishApi.reviewGame({
          initialFen: targetInitialFen,
          moves: targetMoves,
          whiteElo: targetMetadata.whiteElo,
          blackElo: targetMetadata.blackElo,
        });
        setReviewReport(report);
      } catch (error) {
        const isCancelledByUser = error instanceof Error && error.message.toLowerCase().includes("cancelada");

        if (!isCancelledByUser) {
          const message = error instanceof Error ? error.message : "Não foi possível concluir a revisão da partida.";
          onError(message);
        }
      } finally {
        setIsReviewRunning(false);
        setReviewProgress(null);
      }
    },
    [onError]
  );

  const cancelReview = useCallback(async () => {
    try {
      await window.localfishApi.stopGameReview();
    } catch {
    } finally {
      setIsReviewRunning(false);
      setReviewProgress(null);
    }
  }, []);

  const resetReviewState = useCallback(() => {
    setReviewReport(null);
    setReviewProgress(null);
  }, []);

  return {
    reviewReport,
    isReviewRunning,
    reviewProgress,
    executeGameReview,
    cancelReview,
    resetReviewState,
  };
}
