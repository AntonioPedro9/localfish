import { useMemo, useState } from "react";
import { extractTurnOrientationFromFen } from "@shared/utils/chessMoveUtils";
import { InteractiveReviewPanel } from "@/components/analysis/InteractiveReviewPanel";
import { ReviewSummaryOverview } from "@/components/analysis/ReviewSummaryOverview";
import { ChessgroundBoard } from "@/components/board/ChessgroundBoard";
import { EvaluationBar } from "@/components/board/EvaluationBar";
import { FlipBoardButton } from "@/components/board/FlipBoardButton";
import { PlayerRow } from "@/components/board/PlayerRow";
import { ImportGameDialog } from "@/components/modals/ImportGameDialog";
import { PromotionDialog } from "@/components/modals/PromotionDialog";
import { useChessReviewSession } from "@/hooks/useChessReviewSession";
import { calculatePlayerClocks } from "@/utils/clockCalculator";
import { calculateMaterialStatus } from "@/utils/materialCalculator";

export function App() {
  const session = useChessReviewSession();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const isWhiteBottom = session.boardOrientation === "white";

  const materialStatus = useMemo(() => calculateMaterialStatus(session.currentFen), [session.currentFen]);

  const playerClocks = useMemo(() => calculatePlayerClocks({ currentPly: session.currentPly }), [session.currentPly]);

  const turnColor = useMemo(() => extractTurnOrientationFromFen(session.currentFen), [session.currentFen]);

  const whitePlayer = {
    name: session.metadata.white,
    elo: session.metadata.whiteElo,
    capturedPieces: materialStatus.white.captured,
    advantage: materialStatus.white.advantage,
    clockTime: playerClocks.whiteClock,
    isActiveTurn: turnColor === "white",
  };

  const blackPlayer = {
    name: session.metadata.black,
    elo: session.metadata.blackElo,
    capturedPieces: materialStatus.black.captured,
    advantage: materialStatus.black.advantage,
    clockTime: playerClocks.blackClock,
    isActiveTurn: turnColor === "black",
  };

  const topPlayer = isWhiteBottom ? blackPlayer : whitePlayer;
  const bottomPlayer = isWhiteBottom ? whitePlayer : blackPlayer;

  const hasCompletedReview = session.reviewReport !== null;

  if (!session.isGameLoaded) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground select-none">
        <ImportGameDialog open isClosable={false} hideOverlay onImport={session.importChessText} />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      {session.errorBanner && (
        <div
          role="alert"
          className="flex items-center justify-between border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive"
        >
          <span>{session.errorBanner}</span>
          <button
            type="button"
            onClick={() => session.setErrorBanner(null)}
            className="font-semibold underline-offset-4 hover:underline focus-visible:outline-none"
          >
            Fechar
          </button>
        </div>
      )}

      <main className="grid flex-1 w-full grid-cols-1 gap-6 overflow-hidden p-4 lg:grid-cols-[1fr_25rem] xl:grid-cols-[1fr_28rem] lg:p-6">
        <section className="relative flex min-h-0 min-w-0 flex-col items-center justify-center p-2">
          <div
            className="relative flex w-full flex-col gap-2"
            style={{ maxWidth: "min(calc(100dvh - 140px), calc(100% - 90px), 700px)" }}
          >
            <PlayerRow {...topPlayer} />

            <div className="relative flex w-full items-stretch gap-2.5">
              <EvaluationBar score={session.displayedScore} orientation={session.boardOrientation} />
              <div className="min-w-0 flex-1">
                <ChessgroundBoard
                  fen={session.currentFen}
                  orientation={session.boardOrientation}
                  lastMove={session.currentMove}
                  explorationLastMove={session.explorationLastMove}
                  reviewedMove={session.currentReviewedMove}
                  liveSnapshot={session.liveSnapshot}
                  onUserMove={session.handleUserBoardMove}
                />
              </div>

              <div className="absolute left-full top-1/2 z-10 ml-2.5 -translate-y-1/2">
                <FlipBoardButton onFlip={session.flipBoard} />
              </div>
            </div>

            <PlayerRow {...bottomPlayer} />
          </div>
        </section>

        <aside className="flex min-h-0 flex-col overflow-hidden">
          {session.reviewViewMode === "summary" ? (
            <ReviewSummaryOverview
              metadata={session.metadata}
              reviewReport={session.reviewReport}
              isReviewRunning={session.isReviewRunning}
              reviewProgress={session.reviewProgress}
              onStartInteractiveReview={session.startInteractiveReview}
              onNewAnalysis={() => {
                void session.cancelReview();
                setIsImportModalOpen(true);
              }}
            />
          ) : (
            <InteractiveReviewPanel
              moves={session.moves}
              currentPly={session.currentPly}
              reviewReport={session.reviewReport}
              explorationFen={session.explorationFen}
              explorationStepsCount={session.explorationSteps.length}
              canUndoExploration={session.canUndoExploration}
              canRedoExploration={session.canRedoExploration}
              onSelectPly={session.goToPly}
              onFirstMove={session.goToFirstMove}
              onPreviousMove={session.goToPreviousMove}
              onNextMove={session.goToNextMove}
              onLastMove={session.goToLastMove}
              onResetExploration={session.resetExploration}
              onShowSummary={session.showSummaryOverview}
            />
          )}
        </aside>
      </main>

      <ImportGameDialog
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onImport={session.importChessText}
        isClosable={hasCompletedReview}
      />

      <PromotionDialog open={Boolean(session.pendingPromotion)} onSelectPiece={session.confirmPendingPromotion} />
    </div>
  );
}
