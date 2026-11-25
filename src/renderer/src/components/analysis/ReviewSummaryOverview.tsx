import { Loader2, Plus } from "lucide-react";
import { estimateGamePerformanceRating } from "@shared/analysis/chessGameAnalyzer";
import { MOVE_CLASSIFICATION_ORDER } from "@shared/constants/chessConstants";
import { type GameReviewProgressEvent, type GameReviewReport } from "@shared/types/chess";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MOVE_CLASSIFICATION_META } from "@/constants/moveClassificationMeta";
import { MoveClassificationBadge } from "./MoveClassificationBadge";
import { type GameMetadata } from "@/utils/chessNotationParser";
import { cn } from "@/utils/cn";

interface ReviewSummaryOverviewProps {
  metadata: GameMetadata;
  reviewReport: GameReviewReport | null;
  isReviewRunning: boolean;
  reviewProgress: GameReviewProgressEvent | null;
  onStartInteractiveReview: () => void;
  onNewAnalysis?: () => void;
}

const SUMMARY_COMPARISON_GRID_CLASS = "grid grid-cols-[7rem_1fr_2rem_1fr] items-center gap-2";

export function ReviewSummaryOverview({
  metadata,
  reviewReport,
  isReviewRunning,
  reviewProgress,
  onStartInteractiveReview,
  onNewAnalysis,
}: ReviewSummaryOverviewProps) {
  const isAwaitingReviewReport = isReviewRunning || !reviewReport;

  if (isAwaitingReviewReport) {
    const percentage = reviewProgress?.percentage ?? 0;

    return (
      <div className="flex h-full select-none flex-col justify-between gap-4 rounded-xl border border-border/80 bg-card p-5 shadow-xl">
        <SummaryPlayersHeader metadata={metadata} />

        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-10 text-center">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-foreground">Analisando partida com Stockfish...</p>
            {reviewProgress && (
              <p className="font-mono text-xs tabular-nums text-muted-foreground">
                Lance {reviewProgress.currentPly} de {reviewProgress.totalPlies} ({reviewProgress.currentMoveSan}) —{" "}
                {percentage}%
              </p>
            )}
          </div>
          <div className="w-full max-w-xs">
            <Progress value={percentage} />
          </div>
        </div>

        {onNewAnalysis && (
          <Button
            variant="ghost"
            className="w-full shrink-0 text-xs font-semibold text-muted-foreground"
            onClick={onNewAnalysis}
          >
            <Plus />
            Realizar Nova Análise
          </Button>
        )}
      </div>
    );
  }

  const whiteGameRating = estimateGamePerformanceRating(reviewReport.whiteStats, metadata.whiteElo, metadata.blackElo);
  const blackGameRating = estimateGamePerformanceRating(reviewReport.blackStats, metadata.blackElo, metadata.whiteElo);

  return (
    <div className="flex h-full select-none flex-col justify-between gap-4 overflow-hidden rounded-xl border border-border/80 bg-card p-5 shadow-xl">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-0.5">
        <SummaryPlayersHeader metadata={metadata} />

        <PlayerMetricComparisonRow
          label="Precisão"
          whiteValue={`${reviewReport.whiteStats.accuracy.toFixed(1)}%`}
          blackValue={`${reviewReport.blackStats.accuracy.toFixed(1)}%`}
        />

        <PlayerMetricComparisonRow label="Game Rating" whiteValue={whiteGameRating} blackValue={blackGameRating} />

        <div className="h-px shrink-0 bg-border/60" />

        <div className="flex flex-col gap-1">
          {MOVE_CLASSIFICATION_ORDER.map((classificationKey) => {
            const meta = MOVE_CLASSIFICATION_META[classificationKey];
            const whiteCount = reviewReport.whiteStats.counts?.[classificationKey] ?? 0;
            const blackCount = reviewReport.blackStats.counts?.[classificationKey] ?? 0;

            return (
              <div
                key={classificationKey}
                className={cn(SUMMARY_COMPARISON_GRID_CLASS, "rounded-md px-1 py-0.5 odd:bg-muted/25")}
              >
                <span className="text-xs font-medium text-foreground/90">{meta.label}</span>

                <span className={cn("text-center font-mono text-sm font-bold tabular-nums", meta.textClassName)}>
                  {whiteCount}
                </span>

                <div className="flex items-center justify-center">
                  <MoveClassificationBadge classification={classificationKey} size="md" />
                </div>

                <span className={cn("text-center font-mono text-sm font-bold tabular-nums", meta.textClassName)}>
                  {blackCount}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2">
        <Button size="lg" className="w-full font-semibold shadow-md" onClick={onStartInteractiveReview}>
          Iniciar Revisão
        </Button>

        {onNewAnalysis && (
          <Button
            variant="ghost"
            className="w-full text-xs font-semibold text-muted-foreground"
            onClick={onNewAnalysis}
          >
            <Plus />
            Realizar Nova Análise
          </Button>
        )}
      </div>
    </div>
  );
}

interface SummaryPlayersHeaderProps {
  metadata: GameMetadata;
}

function SummaryPlayersHeader({ metadata }: SummaryPlayersHeaderProps) {
  return (
    <div className={SUMMARY_COMPARISON_GRID_CLASS}>
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Jogadores</span>
      <div className="flex min-w-0 items-center justify-center text-center">
        <span className="w-full truncate text-sm font-semibold text-foreground">{metadata.white}</span>
      </div>
      <div aria-hidden="true" />
      <div className="flex min-w-0 items-center justify-center text-center">
        <span className="w-full truncate text-sm font-semibold text-foreground">{metadata.black}</span>
      </div>
    </div>
  );
}

interface PlayerMetricComparisonRowProps {
  label: string;
  whiteValue: string | number;
  blackValue: string | number;
}

function PlayerMetricComparisonRow({ label, whiteValue, blackValue }: PlayerMetricComparisonRowProps) {
  return (
    <div className={SUMMARY_COMPARISON_GRID_CLASS}>
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex justify-center">
        <span className="inline-flex min-w-16 items-center justify-center rounded-md border border-border bg-primary px-2.5 py-1 font-mono text-sm font-bold tabular-nums text-primary-foreground shadow-sm">
          {whiteValue}
        </span>
      </div>
      <div aria-hidden="true" />
      <div className="flex justify-center">
        <span className="inline-flex min-w-16 items-center justify-center rounded-md border border-border bg-secondary px-2.5 py-1 font-mono text-sm font-bold tabular-nums text-secondary-foreground shadow-sm">
          {blackValue}
        </span>
      </div>
    </div>
  );
}
