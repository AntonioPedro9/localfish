import { useEffect } from "react";
import { isUserFocusingInputElement } from "@/utils/domUtils";

interface UseChessShortcutsParams {
  isEnabled: boolean;
  onGoToPrevious: () => void;
  onGoToNext: () => void;
  onGoToFirst: () => void;
  onGoToLast: () => void;
  onFlipBoard: () => void;
}

export function useChessShortcuts({
  isEnabled,
  onGoToPrevious,
  onGoToNext,
  onGoToFirst,
  onGoToLast,
  onFlipBoard,
}: UseChessShortcutsParams): void {
  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isUserFocusingInputElement()) {
        return;
      }

      const isFlipShortcut = event.key === "f" || event.key === "F";

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onGoToPrevious();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onGoToNext();
      } else if (event.key === "Home") {
        event.preventDefault();
        onGoToFirst();
      } else if (event.key === "End") {
        event.preventDefault();
        onGoToLast();
      } else if (isFlipShortcut) {
        event.preventDefault();
        onFlipBoard();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEnabled, onFlipBoard, onGoToFirst, onGoToLast, onGoToNext, onGoToPrevious]);
}
