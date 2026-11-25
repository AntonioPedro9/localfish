import { Chess, type Move, type PieceSymbol, type Square } from "chess.js";
import { CHESS_PIECE_VALUES } from "../constants/chessConstants";

interface SacrificeDetectionParams {
  fenBefore?: string;
  fenAfter?: string;
  playedUci: string;
}

interface PieceOnSquare {
  square: Square;
  type: PieceSymbol;
  color: "w" | "b";
}

export function isMaterialSacrifice(params: SacrificeDetectionParams): boolean {
  const { fenBefore, fenAfter, playedUci } = params;
  if (!fenBefore || !fenAfter || playedUci.length < 4) {
    return false;
  }

  try {
    const boardBefore = new Chess(fenBefore);
    const boardAfter = new Chess(fenAfter);
    const originSquare = playedUci.slice(0, 2) as Square;
    const destinationSquare = playedUci.slice(2, 4) as Square;

    const movedPiece = boardBefore.get(originSquare);
    if (!movedPiece) {
      return false;
    }

    const movedPieceValue = CHESS_PIECE_VALUES[movedPiece.type] ?? 0;
    const capturedValueOnMove = resolveCapturedValueOnMove(
      boardBefore,
      originSquare,
      destinationSquare,
      movedPiece.type
    );

    const opponentRepliesAfter = boardAfter.moves({ verbose: true });

    const isDirectSacrifice = isDestinationSacrifice({
      boardAfter,
      destinationSquare,
      movedPieceValue,
      capturedValueOnMove,
      opponentReplies: opponentRepliesAfter,
    });

    if (isDirectSacrifice) {
      return true;
    }

    return isDiscoveredOrHangingPieceSacrifice({
      boardBefore,
      boardAfter,
      destinationSquare,
      capturedValueOnMove,
      moverColor: movedPiece.color,
      opponentReplies: opponentRepliesAfter,
    });
  } catch {
    return false;
  }
}

function resolveCapturedValueOnMove(
  boardBefore: Chess,
  origin: Square,
  destination: Square,
  movedPieceType: PieceSymbol
): number {
  const pieceOnDestination = boardBefore.get(destination);
  if (pieceOnDestination) {
    return CHESS_PIECE_VALUES[pieceOnDestination.type] ?? 0;
  }

  const isEnPassantCapture = movedPieceType === "p" && origin[0] !== destination[0];
  if (isEnPassantCapture) {
    return CHESS_PIECE_VALUES.p;
  }

  return 0;
}

function isDestinationSacrifice(params: {
  boardAfter: Chess;
  destinationSquare: Square;
  movedPieceValue: number;
  capturedValueOnMove: number;
  opponentReplies: Move[];
}): boolean {
  const { boardAfter, destinationSquare, movedPieceValue, capturedValueOnMove, opponentReplies } = params;

  const opponentCapturesOnDestination = opponentReplies.filter((reply) => reply.to === destinationSquare);

  if (opponentCapturesOnDestination.length === 0) {
    return false;
  }

  for (const captureMove of opponentCapturesOnDestination) {
    const oppAttackerValue = CHESS_PIECE_VALUES[captureMove.piece] ?? 0;

    const isFavorableAttackerTrade = oppAttackerValue < movedPieceValue;
    if (isFavorableAttackerTrade) {
      const netMaterialLost = movedPieceValue - (capturedValueOnMove + oppAttackerValue);
      if (netMaterialLost >= 1) {
        return true;
      }
    }

    const hasMoverRecapture = checkSquareHasRecapture(boardAfter, captureMove, destinationSquare);
    const netMaterialInvested = movedPieceValue - capturedValueOnMove;
    const isUnprotectedHighValuePiece = !hasMoverRecapture && netMaterialInvested >= 2;

    if (isUnprotectedHighValuePiece) {
      return true;
    }
  }

  return false;
}

function isDiscoveredOrHangingPieceSacrifice(params: {
  boardBefore: Chess;
  boardAfter: Chess;
  destinationSquare: Square;
  capturedValueOnMove: number;
  moverColor: "w" | "b";
  opponentReplies: Move[];
}): boolean {
  const { boardBefore, boardAfter, destinationSquare, capturedValueOnMove, moverColor, opponentReplies } = params;

  const friendlyValuablePieces = extractValuableFriendlyPieces(boardAfter, destinationSquare, moverColor);

  for (const friendlyPiece of friendlyValuablePieces) {
    const pieceValue = CHESS_PIECE_VALUES[friendlyPiece.type] ?? 0;
    const opponentCapturesOnPiece = opponentReplies.filter(
      (reply) => reply.to === friendlyPiece.square && reply.captured
    );

    if (opponentCapturesOnPiece.length === 0) {
      continue;
    }

    const opponentColor = moverColor === "w" ? "b" : "w";
    const wasAlreadyAttackedBefore = isSquareAttackedBefore(boardBefore, friendlyPiece.square, opponentColor);

    if (wasAlreadyAttackedBefore) {
      continue;
    }

    for (const opponentCapture of opponentCapturesOnPiece) {
      const oppAttackerValue = CHESS_PIECE_VALUES[opponentCapture.piece] ?? 0;
      const isFavorableAttackerTrade = oppAttackerValue < pieceValue;

      if (isFavorableAttackerTrade) {
        const netLoss = pieceValue - (capturedValueOnMove + oppAttackerValue);
        if (netLoss >= 1) {
          return true;
        }
      }

      const hasMoverRecapture = checkSquareHasRecapture(boardAfter, opponentCapture, friendlyPiece.square);
      const isUnprotectedPiece = !hasMoverRecapture && pieceValue - capturedValueOnMove >= 2;

      if (isUnprotectedPiece) {
        return true;
      }
    }
  }

  return false;
}

function checkSquareHasRecapture(boardAfter: Chess, opponentCaptureMove: Move, targetSquare: Square): boolean {
  try {
    const simulationBoard = new Chess(boardAfter.fen());
    simulationBoard.move(opponentCaptureMove);
    const moverReplies = simulationBoard.moves({ verbose: true });
    return moverReplies.some((reply) => reply.to === targetSquare);
  } catch {
    return false;
  }
}

function isSquareAttackedBefore(boardBefore: Chess, targetSquare: Square, attackerColor: "w" | "b"): boolean {
  try {
    return boardBefore.isAttacked(targetSquare, attackerColor);
  } catch {
    return false;
  }
}

function extractValuableFriendlyPieces(
  board: Chess,
  excludedSquare: Square,
  friendlyColor: "w" | "b"
): PieceOnSquare[] {
  const pieces: PieceOnSquare[] = [];
  const boardMatrix = board.board();

  for (const row of boardMatrix) {
    for (const squarePiece of row) {
      if (!squarePiece) {
        continue;
      }

      const isSameColor = squarePiece.color === friendlyColor;
      const isExcluded = squarePiece.square === excludedSquare;
      const pieceValue = CHESS_PIECE_VALUES[squarePiece.type] ?? 0;
      const isValuablePiece = pieceValue >= 3;

      if (isSameColor && !isExcluded && isValuablePiece) {
        pieces.push({
          square: squarePiece.square,
          type: squarePiece.type,
          color: squarePiece.color,
        });
      }
    }
  }

  return pieces;
}
