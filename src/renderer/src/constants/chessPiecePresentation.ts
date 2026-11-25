import { type ChessPieceType, type PromotionChoicePiece } from "@shared/types/chess";
import { PROMOTION_PIECE_CHOICES } from "@shared/constants/chessConstants";

export const CHESS_PIECE_EMOJIS: Record<ChessPieceType, string> = {
  p: "♙",
  b: "♗",
  n: "♘",
  r: "♖",
  q: "♕",
};

export const CHESS_PIECE_LABELS: Record<ChessPieceType, string> = {
  p: "Peão",
  b: "Bispo",
  n: "Cavalo",
  r: "Torre",
  q: "Dama",
};

export interface PromotionPieceOption {
  readonly piece: PromotionChoicePiece;
  readonly label: string;
  readonly symbol: string;
}

export const PROMOTION_PIECE_OPTIONS: readonly PromotionPieceOption[] = PROMOTION_PIECE_CHOICES.map((piece) => ({
  piece,
  label: CHESS_PIECE_LABELS[piece],
  symbol: CHESS_PIECE_EMOJIS[piece],
}));

export const PROMOTION_DIALOG_TITLE = "Promover Peão";
