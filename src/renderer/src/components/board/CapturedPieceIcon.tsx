import { type ChessPieceType } from "@shared/types/chess";
import { CHESS_PIECE_EMOJIS, CHESS_PIECE_LABELS } from "@/constants/chessPiecePresentation";
import { cn } from "@/utils/cn";

interface CapturedPieceIconProps {
  piece: ChessPieceType;
  className?: string;
}

export function CapturedPieceIcon({ piece, className }: CapturedPieceIconProps) {
  const emoji = CHESS_PIECE_EMOJIS[piece];
  const label = CHESS_PIECE_LABELS[piece];

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-5 w-4 select-none items-center justify-center text-base font-normal leading-none tracking-tight text-foreground/85",
        className
      )}
    >
      {emoji}
    </span>
  );
}
