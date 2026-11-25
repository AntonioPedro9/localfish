import { type BoardOrientation, type EngineScore } from "@shared/types/chess";
import { formatEngineScoreLabel, resolveBarFillPercentage } from "@shared/utils/evaluationScoreUtils";
import { cn } from "@/utils/cn";

interface EvaluationBarProps {
  score: EngineScore | null;
  orientation: BoardOrientation;
}

export function EvaluationBar({ score, orientation }: EvaluationBarProps) {
  const whiteFillPercent = resolveBarFillPercentage(score);
  const formattedLabel = formatEngineScoreLabel(score);

  const isWhiteAdvantage = !score || score.value >= 0;
  const isFlippedForBlack = orientation === "black";

  return (
    <div
      className={cn(
        "relative flex h-full w-6 select-none overflow-hidden rounded-md bg-secondary shadow-sm ring-1 ring-border/50",
        isFlippedForBlack ? "flex-col" : "flex-col-reverse"
      )}
      title={`Avaliação Stockfish: ${resolveEvaluationTooltip(formattedLabel)}`}
    >
      <div
        className="w-full bg-primary transition-[height] duration-300 ease-out"
        style={{ height: `${whiteFillPercent}%` }}
      />

      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />

      <span
        className={cn(
          "pointer-events-none absolute inset-x-0 px-0.5 text-center font-mono text-2xs font-bold leading-none tracking-tighter tabular-nums",
          resolveScoreLabelPositionClassName(isWhiteAdvantage, isFlippedForBlack)
        )}
      >
        {formattedLabel}
      </span>
    </div>
  );
}

function resolveEvaluationTooltip(formattedLabel: string): string {
  if (formattedLabel === "#") {
    return "Xeque-mate";
  }
  return formattedLabel;
}

function resolveScoreLabelPositionClassName(isWhiteAdvantage: boolean, isFlippedForBlack: boolean): string {
  if (isWhiteAdvantage) {
    return isFlippedForBlack ? "top-1.5 text-primary-foreground" : "bottom-1.5 text-primary-foreground";
  }

  return isFlippedForBlack ? "bottom-1.5 text-secondary-foreground" : "top-1.5 text-secondary-foreground";
}
