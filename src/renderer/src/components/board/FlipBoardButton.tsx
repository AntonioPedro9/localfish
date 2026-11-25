import { FlipVertical2 } from "lucide-react";
import { cn } from "@/utils/cn";

interface FlipBoardButtonProps {
  onFlip: () => void;
  className?: string;
}

export function FlipBoardButton({ onFlip, className }: FlipBoardButtonProps) {
  return (
    <button
      type="button"
      onClick={onFlip}
      title="Inverter tabuleiro (Tecla F)"
      aria-label="Inverter tabuleiro"
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/85 text-muted-foreground shadow-md backdrop-blur-sm transition-all hover:bg-accent hover:text-foreground active:scale-95",
        className
      )}
    >
      <FlipVertical2 className="h-4 w-4" />
    </button>
  );
}
