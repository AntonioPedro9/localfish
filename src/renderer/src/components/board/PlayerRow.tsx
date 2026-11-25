import { Clock } from "lucide-react";
import { type ChessPieceType } from "@shared/types/chess";
import { cn } from "@/utils/cn";
import { CapturedPieceIcon } from "./CapturedPieceIcon";

interface PlayerRowProps {
  name: string;
  elo?: string;
  capturedPieces: ChessPieceType[];
  advantage?: number;
  clockTime: string;
  isActiveTurn: boolean;
  className?: string;
}

export function PlayerRow({
  name,
  elo,
  capturedPieces,
  advantage,
  clockTime,
  isActiveTurn,
  className,
}: PlayerRowProps) {
  const hasMaterialAdvantage = typeof advantage === "number" && advantage > 0;

  return (
    <div className={cn("flex w-full select-none items-center justify-between gap-3", className)}>
      <div className="flex min-w-0 flex-col justify-center gap-1">
        <div className="flex items-baseline gap-1.5 leading-none">
          <span className="max-w-44 truncate text-base font-semibold leading-none text-foreground sm:max-w-64">
            {name}
          </span>

          {elo && (
            <span className="font-mono text-xs font-normal leading-none tabular-nums text-muted-foreground">
              ({elo})
            </span>
          )}
        </div>

        <div className="flex min-h-5 items-center gap-1.5">
          {capturedPieces.length > 0 && (
            <div className="flex items-center">
              {capturedPieces.map((piece, index) => (
                <CapturedPieceIcon key={`${piece}-${index}`} piece={piece} />
              ))}
            </div>
          )}

          {hasMaterialAdvantage && (
            <span className="select-none font-mono text-xs font-semibold leading-none tabular-nums text-muted-foreground">
              +{advantage}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <ClockBadge clockTime={clockTime} isActiveTurn={isActiveTurn} />
      </div>
    </div>
  );
}

interface ClockBadgeProps {
  clockTime: string;
  isActiveTurn: boolean;
}

function ClockBadge({ clockTime, isActiveTurn }: ClockBadgeProps) {
  return (
    <div
      className={cn(
        "flex h-8 w-24 shrink-0 select-none items-center justify-center gap-1.5 rounded-md border px-2 font-mono text-sm font-semibold leading-none tabular-nums transition-colors",
        isActiveTurn
          ? "border-transparent bg-primary text-primary-foreground shadow-md"
          : "border-border/80 bg-secondary text-muted-foreground shadow-sm"
      )}
      title={isActiveTurn ? "Tempo restante (Vez do jogador)" : "Tempo restante (Aguardando lance)"}
    >
      {isActiveTurn && <Clock className="h-3.5 w-3.5 shrink-0 stroke-[2.5] text-primary-foreground" />}
      <span className="leading-none">{clockTime}</span>
    </div>
  );
}
