import {
  CAPTURABLE_PIECE_ORDER,
  CHESS_PIECE_VALUES,
  INITIAL_CAPTURABLE_PIECE_COUNTS,
} from "@shared/constants/chessConstants";
import { type ChessPieceType } from "@shared/types/chess";

interface PlayerMaterialStatus {
  captured: ChessPieceType[];
  advantage: number;
}

interface MaterialStatus {
  white: PlayerMaterialStatus;
  black: PlayerMaterialStatus;
}

interface BoardPieceCounts {
  white: Record<ChessPieceType, number>;
  black: Record<ChessPieceType, number>;
}

export function calculateMaterialStatus(fen: string): MaterialStatus {
  if (!fen) {
    return createEmptyMaterialStatus();
  }

  const [piecePlacement] = fen.trim().split(/\s+/);
  if (!piecePlacement) {
    return createEmptyMaterialStatus();
  }

  const currentCounts = countPiecesOnBoard(piecePlacement);

  const whiteCaptured = findCapturedPieces(currentCounts.black);
  const blackCaptured = findCapturedPieces(currentCounts.white);

  const whitePoints = sumMaterialPoints(currentCounts.white);
  const blackPoints = sumMaterialPoints(currentCounts.black);
  const pointDifference = whitePoints - blackPoints;

  return {
    white: {
      captured: whiteCaptured,
      advantage: Math.max(0, pointDifference),
    },
    black: {
      captured: blackCaptured,
      advantage: Math.max(0, -pointDifference),
    },
  };
}

function countPiecesOnBoard(placement: string): BoardPieceCounts {
  const counts: BoardPieceCounts = {
    white: { p: 0, b: 0, n: 0, r: 0, q: 0 },
    black: { p: 0, b: 0, n: 0, r: 0, q: 0 },
  };

  for (const char of placement) {
    const isWhite = char === char.toUpperCase();
    const pieceType = char.toLowerCase() as ChessPieceType;

    if (pieceType in counts.white) {
      const colorKey = isWhite ? "white" : "black";
      counts[colorKey][pieceType] += 1;
    }
  }

  return counts;
}

function findCapturedPieces(remainingOpponentPieces: Record<ChessPieceType, number>): ChessPieceType[] {
  const captured: ChessPieceType[] = [];

  for (const piece of CAPTURABLE_PIECE_ORDER) {
    const initialCount = INITIAL_CAPTURABLE_PIECE_COUNTS[piece];
    const currentCount = remainingOpponentPieces[piece] ?? 0;
    const capturedCount = Math.max(0, initialCount - currentCount);

    for (let index = 0; index < capturedCount; index += 1) {
      captured.push(piece);
    }
  }

  return captured;
}

function sumMaterialPoints(pieceCounts: Record<ChessPieceType, number>): number {
  return CAPTURABLE_PIECE_ORDER.reduce((total, piece) => total + pieceCounts[piece] * CHESS_PIECE_VALUES[piece], 0);
}

function createEmptyMaterialStatus(): MaterialStatus {
  return {
    white: { captured: [], advantage: 0 },
    black: { captured: [], advantage: 0 },
  };
}
