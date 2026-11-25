import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type PromotionChoicePiece } from "@shared/types/chess";
import { PROMOTION_DIALOG_TITLE, PROMOTION_PIECE_OPTIONS } from "@/constants/chessPiecePresentation";

interface PromotionDialogProps {
  open: boolean;
  onSelectPiece: (piece: PromotionChoicePiece) => void;
}

export function PromotionDialog({ open, onSelectPiece }: PromotionDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent
        hideCloseButton
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center">{PROMOTION_DIALOG_TITLE}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-6">
          {PROMOTION_PIECE_OPTIONS.map(({ piece, label, symbol }) => (
            <Button
              key={piece}
              type="button"
              variant="outline"
              className="flex h-24 flex-col items-center justify-center"
              onClick={() => onSelectPiece(piece)}
            >
              <span className="text-3xl leading-none">{symbol}</span>
              <span className="text-sm font-semibold">{label}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
