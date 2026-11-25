import { useEffect, useMemo, useRef } from "react";
import { ArrowLeft, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { type GameMoveDescriptor, type GameReviewReport, type ReviewedMoveAnalysis } from "@shared/types/chess";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MOVE_CLASSIFICATION_META } from "@/constants/moveClassificationMeta";
import { cn } from "@/utils/cn";
import { groupMovesIntoPairs, type MovePairRow } from "@/utils/moveListUtils";
import { EvaluationChart } from "./EvaluationChart";
import { MoveClassificationBadge } from "./MoveClassificationBadge";

interface InteractiveReviewPanelProps {
  moves: GameMoveDescriptor[];
  currentPly: number;
  reviewReport: GameReviewReport | null;
  explorationFen: string | null;
  explorationStepsCount?: number;
  canUndoExploration?: boolean;
  canRedoExploration?: boolean;
  onSelectPly: (ply: number) => void;
  onFirstMove: () => void;
  onPreviousMove: () => void;
  onNextMove: () => void;
  onLastMove: () => void;
  onResetExploration: () => void;
  onShowSummary: () => void;
}

export function InteractiveReviewPanel({
  moves,
  currentPly,
  reviewReport,
  explorationFen,
  explorationStepsCount = 0,
  canUndoExploration = false,
  canRedoExploration = false,
  onSelectPly,
  onFirstMove,
  onPreviousMove,
  onNextMove,
  onLastMove,
  onResetExploration,
  onShowSummary,
}: InteractiveReviewPanelProps) {
  const activeMoveRef = useRef<HTMLButtonElement | null>(null);

  const reviewedByPly = useMemo(() => {
    const map = new Map<number, ReviewedMoveAnalysis>();
    if (!reviewReport) {
      return map;
    }
    for (const item of reviewReport.moves) {
      map.set(item.ply, item);
    }
    return map;
  }, [reviewReport]);

  const movePairs = useMemo<MovePairRow[]>(() => groupMovesIntoPairs(moves), [moves]);

  useEffect(() => {
    activeMoveRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [currentPly]);

  const isAtStart = currentPly === 0 && !canUndoExploration;
  const isAtEnd = currentPly >= moves.length && !canRedoExploration;

  return (
    <div className="flex h-full select-none flex-col overflow-hidden rounded-xl border border-border/80 bg-card shadow-xl">
      {moves.length > 0 && (
        <div className="flex items-center justify-between border-b border-border/60 p-2.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={onShowSummary}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Resumo da Revisão
          </Button>

          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            Lance {currentPly}/{moves.length}
          </span>
        </div>
      )}

      {explorationFen && (
        <ExplorationBanner stepsCount={explorationStepsCount} onResetExploration={onResetExploration} />
      )}

      <ScrollArea className="flex-1 px-3 py-2">
        {movePairs.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-center text-xs text-muted-foreground">
            Nenhum lance registrado. Jogue lances no tabuleiro para analisar.
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {movePairs.map((pair) => {
              const whiteMove = pair.white;
              const blackMove = pair.black;
              const isWhiteSelected = !explorationFen && currentPly === whiteMove?.ply;
              const isBlackSelected = !explorationFen && currentPly === blackMove?.ply;

              return (
                <div
                  key={pair.moveNumber}
                  className="grid grid-cols-[2.25rem_1fr_1fr] items-center gap-1.5 rounded px-2 py-0.5 text-sm odd:bg-muted/30"
                >
                  <span className="select-none font-mono text-xs tabular-nums text-muted-foreground/80">
                    {pair.moveNumber}.
                  </span>

                  {whiteMove ? (
                    <MoveItemButton
                      ref={isWhiteSelected ? activeMoveRef : undefined}
                      move={whiteMove}
                      reviewed={reviewedByPly.get(whiteMove.ply)}
                      isSelected={isWhiteSelected}
                      onSelect={() => onSelectPly(whiteMove.ply)}
                    />
                  ) : (
                    <div />
                  )}

                  {blackMove ? (
                    <MoveItemButton
                      ref={isBlackSelected ? activeMoveRef : undefined}
                      move={blackMove}
                      reviewed={reviewedByPly.get(blackMove.ply)}
                      isSelected={isBlackSelected}
                      onSelect={() => onSelectPly(blackMove.ply)}
                    />
                  ) : (
                    <div />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <div className="border-t border-border/60 bg-muted/20 pt-2">
        {reviewReport && (
          <EvaluationChart reviewedMoves={reviewReport.moves} currentPly={currentPly} onSelectPly={onSelectPly} />
        )}

        <div className="grid grid-cols-4 gap-2 p-3">
          <Button
            variant="secondary"
            size="sm"
            className="h-9 rounded-md hover:bg-accent"
            disabled={isAtStart}
            onClick={onFirstMove}
            title="Posição inicial (Home)"
          >
            <ChevronFirst className="h-4 w-4" />
          </Button>

          <Button
            variant="secondary"
            size="sm"
            className="h-9 rounded-md hover:bg-accent"
            disabled={isAtStart}
            onClick={onPreviousMove}
            title="Lance anterior (Seta Esquerda)"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="secondary"
            size="sm"
            className="h-9 rounded-md hover:bg-accent"
            disabled={isAtEnd}
            onClick={onNextMove}
            title="Próximo lance (Seta Direita)"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="secondary"
            size="sm"
            className="h-9 rounded-md hover:bg-accent"
            disabled={isAtEnd}
            onClick={onLastMove}
            title="Último lance (End)"
          >
            <ChevronLast className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface MoveItemButtonProps {
  ref?: React.Ref<HTMLButtonElement>;
  move: GameMoveDescriptor;
  reviewed?: ReviewedMoveAnalysis;
  isSelected: boolean;
  onSelect: () => void;
}

function MoveItemButton({ ref, move, reviewed, isSelected, onSelect }: MoveItemButtonProps) {
  const isReviewed = reviewed !== undefined;
  const badgeMeta = isReviewed ? MOVE_CLASSIFICATION_META[reviewed.classification] : null;

  return (
    <button
      ref={ref}
      type="button"
      onClick={onSelect}
      className={cn(
        "flex h-7 items-center gap-1.5 rounded px-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        isSelected
          ? "bg-accent font-semibold text-accent-foreground ring-1 ring-primary/40"
          : "font-medium text-foreground/85 hover:bg-accent/60 hover:text-foreground"
      )}
    >
      <div className="flex h-5 w-5 shrink-0 items-center justify-center">
        {reviewed && <MoveClassificationBadge classification={reviewed.classification} size="sm" />}
      </div>

      <span
        className={cn(
          "truncate font-mono text-xs font-semibold tabular-nums",
          badgeMeta ? badgeMeta.textClassName : "text-foreground/95"
        )}
      >
        {move.san}
      </span>
    </button>
  );
}

interface ExplorationBannerProps {
  onResetExploration: () => void;
  stepsCount?: number;
}

function ExplorationBanner({ onResetExploration, stepsCount = 0 }: ExplorationBannerProps) {
  const stepsLabel = stepsCount > 1 ? ` (${stepsCount} lances)` : "";

  return (
    <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-secondary/50 px-4 py-2 text-xs text-foreground">
      <div className="flex items-center gap-2">
        <span className="size-1.5 rounded-full bg-amber-500" />
        <span className="font-medium">Variante livre{stepsLabel}</span>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="h-6 gap-1.5 px-2 text-xs [&_svg]:size-3"
        onClick={onResetExploration}
      >
        <RotateCcw />
        <span>Voltar à partida</span>
      </Button>
    </div>
  );
}
