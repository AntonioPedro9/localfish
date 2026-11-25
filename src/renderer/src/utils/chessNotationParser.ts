import { Chess, DEFAULT_POSITION, validateFen } from "chess.js";
import type * as cg from "@lichess-org/chessground/types";
import { DEFAULT_PLAYER_NAMES } from "@shared/constants/chessConstants";
import { type ChessFormat, type GameMoveDescriptor } from "@shared/types/chess";
import { isLikelyFenString, normalizeFenString } from "@shared/utils/chessMoveUtils";

export interface GameMetadata {
  white: string;
  black: string;
  whiteElo?: string;
  blackElo?: string;
}

export interface ParsedChessGame {
  format: ChessFormat;
  initialFen: string;
  moves: GameMoveDescriptor[];
  metadata: GameMetadata;
}

export function parseImportedChessInput(rawInput: string): ParsedChessGame {
  const trimmedInput = rawInput.trim();
  if (!trimmedInput) {
    throw new Error("Insira um código PGN ou uma posição FEN válida.");
  }

  if (isLikelyFenString(trimmedInput)) {
    return parseFenPosition(trimmedInput);
  }

  return parsePgnGame(trimmedInput);
}

interface BoardPositionDetails {
  legalDests: cg.Dests;
  isInCheck: boolean;
}

export function computeBoardPositionDetails(fen: string): BoardPositionDetails {
  const destSetByOrigin = new Map<cg.Key, Set<cg.Key>>();

  try {
    const chess = new Chess(fen);
    const legalMoves = chess.moves({ verbose: true });

    for (const move of legalMoves) {
      const originKey = move.from as cg.Key;
      const destKey = move.to as cg.Key;

      let destinationSet = destSetByOrigin.get(originKey);
      if (!destinationSet) {
        destinationSet = new Set<cg.Key>();
        destSetByOrigin.set(originKey, destinationSet);
      }
      destinationSet.add(destKey);
    }

    const legalDests: cg.Dests = new Map();
    for (const [originKey, destinationSet] of destSetByOrigin.entries()) {
      legalDests.set(originKey, Array.from(destinationSet));
    }

    return {
      legalDests,
      isInCheck: chess.inCheck(),
    };
  } catch {
    return {
      legalDests: new Map(),
      isInCheck: false,
    };
  }
}

function parseFenPosition(fenInput: string): ParsedChessGame {
  const normalizedFen = normalizeFenString(fenInput);
  const validation = validateFen(normalizedFen);

  if (!validation.ok) {
    throw new Error(`FEN inválido: ${validation.error ?? "formato incorreto"}`);
  }

  const chess = new Chess(normalizedFen);

  return {
    format: "fen",
    initialFen: chess.fen(),
    moves: [],
    metadata: { ...DEFAULT_PLAYER_NAMES },
  };
}

function parsePgnGame(pgnInput: string): ParsedChessGame {
  const chess = new Chess();

  try {
    chess.loadPgn(pgnInput.trim(), { strict: false });
  } catch {
    throw new Error("Não foi possível interpretar o PGN fornecido. Verifique a notação dos lances.");
  }

  const headers = chess.header();
  const verboseHistory = chess.history({ verbose: true });

  const isEmptyUntaggedInput = verboseHistory.length === 0 && Object.keys(headers).length === 0;
  if (isEmptyUntaggedInput) {
    throw new Error("Nenhum lance ou cabeçalho PGN válido foi encontrado no texto informado.");
  }

  const initialFen = verboseHistory[0]?.before || headers.FEN || DEFAULT_POSITION;

  const moves: GameMoveDescriptor[] = verboseHistory.map((historyMove, index) => ({
    ply: index + 1,
    moveNumber: Math.floor(index / 2) + 1,
    color: historyMove.color,
    san: historyMove.san,
    uci: historyMove.lan,
    from: historyMove.from,
    to: historyMove.to,
    promotion: historyMove.promotion,
    fenBefore: historyMove.before,
    fenAfter: historyMove.after,
  }));

  return {
    format: "pgn",
    initialFen,
    moves,
    metadata: {
      white: headers.White || DEFAULT_PLAYER_NAMES.white,
      black: headers.Black || DEFAULT_PLAYER_NAMES.black,
      whiteElo: resolveOptionalEloHeader(headers.WhiteElo),
      blackElo: resolveOptionalEloHeader(headers.BlackElo),
    },
  };
}

function resolveOptionalEloHeader(rawElo?: string | null): string | undefined {
  if (!rawElo || rawElo === "?") {
    return undefined;
  }
  return rawElo;
}
