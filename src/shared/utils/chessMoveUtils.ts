import { Chess } from "chess.js";
import { type BoardOrientation, type PlayerColor } from "../types/chess";

const UCI_COORDINATE_MOVE_PATTERN = /^[a-h][1-8][a-h][1-8][qrbn]?$/i;

export function extractTurnFromFen(fen: string): PlayerColor {
  const parts = fen.trim().split(/\s+/);
  const turnToken = parts[1];
  return turnToken === "b" ? "b" : "w";
}

export function extractTurnOrientationFromFen(fen: string): BoardOrientation {
  return extractTurnFromFen(fen) === "b" ? "black" : "white";
}

export function isValidUciMove(uciMove: string | null | undefined): uciMove is string {
  return typeof uciMove === "string" && UCI_COORDINATE_MOVE_PATTERN.test(uciMove.trim());
}

export function isLikelyFenString(input: string): boolean {
  const hasMultipleLines = input.includes("\n");
  if (hasMultipleLines) {
    return false;
  }

  const tokens = input.trim().split(/\s+/);
  const rankSegments = tokens[0]?.split("/") ?? [];
  const hasEightRanks = rankSegments.length === 8;
  const hasValidTokenCount = tokens.length >= 2 && tokens.length <= 6;

  return hasEightRanks && hasValidTokenCount;
}

export function sanitizeAndValidateFen(rawFen: string): string {
  if (typeof rawFen !== "string") {
    throw new Error("Posição FEN deve ser uma string válida.");
  }

  const cleanedFen = rawFen.replace(/[\r\n]+/g, " ").trim();
  if (!isLikelyFenString(cleanedFen)) {
    throw new Error("Formato FEN inválido.");
  }

  return cleanedFen;
}

export function isUciMoveLegalInFen(fen: string, uciMove: string): boolean {
  if (!isValidUciMove(uciMove) || uciMove.length < 4) {
    return false;
  }
  try {
    const chess = new Chess(fen);
    const from = uciMove.slice(0, 2);
    const to = uciMove.slice(2, 4);
    const promotion = uciMove.length > 4 ? uciMove[4] : undefined;
    const moveResult = chess.move({ from, to, promotion });
    return moveResult !== null;
  } catch {
    return false;
  }
}

export function normalizeFenString(rawFen: string): string {
  const tokens = rawFen.trim().split(/\s+/);
  if (tokens.length === 6) {
    return tokens.join(" ");
  }

  const board = tokens[0] ?? "";
  const turn = tokens[1] ?? "w";
  const castling = tokens[2] ?? "-";
  const enPassant = tokens[3] ?? "-";
  const halfMove = tokens[4] ?? "0";
  const fullMove = tokens[5] ?? "1";

  return `${board} ${turn} ${castling} ${enPassant} ${halfMove} ${fullMove}`;
}
