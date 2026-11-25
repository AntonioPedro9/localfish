import { useEffect, useRef } from "react";
import { Chessground } from "@lichess-org/chessground";
import { type Api as ChessgroundApi } from "@lichess-org/chessground/api";
import { type Config as ChessgroundConfig } from "@lichess-org/chessground/config";
import { type DrawShape } from "@lichess-org/chessground/draw";
import type * as cg from "@lichess-org/chessground/types";
import { type BoardOrientation } from "@shared/types/chess";

interface UseChessgroundParams {
  fen: string;
  orientation: BoardOrientation;
  turnColor: cg.Color;
  isInCheck: boolean;
  legalDests: Map<cg.Key, cg.Key[]>;
  resolvedLastMove: cg.Key[] | undefined;
  autoShapes: DrawShape[];
  onUserMove: (orig: string, dest: string) => boolean;
}

export function useChessground({
  fen,
  orientation,
  turnColor,
  isInCheck,
  legalDests,
  resolvedLastMove,
  autoShapes,
  onUserMove,
}: UseChessgroundParams) {
  const boardContainerRef = useRef<HTMLDivElement | null>(null);
  const cgApiRef = useRef<ChessgroundApi | null>(null);

  const onUserMoveRef = useRef(onUserMove);
  onUserMoveRef.current = onUserMove;

  const canonicalFenRef = useRef(fen);
  canonicalFenRef.current = fen;

  useEffect(() => {
    const container = boardContainerRef.current;
    if (!container) {
      return;
    }

    const initialConfig = createInitialChessgroundConfig({
      fen,
      orientation,
      turnColor,
      isInCheck,
      resolvedLastMove,
      legalDests,
      autoShapes,
      onMove: (orig, dest) => {
        const isMoveAccepted = onUserMoveRef.current(orig, dest);
        if (!isMoveAccepted) {
          revertBoardPositionToCanonical(cgApiRef.current, canonicalFenRef.current);
        }
      },
    });

    const api = Chessground(container, initialConfig);
    cgApiRef.current = api;

    return () => {
      api.destroy();
      cgApiRef.current = null;
    };
  }, []);

  useEffect(() => {
    synchronizeBoardConfiguration(cgApiRef.current, {
      fen,
      orientation,
      turnColor,
      isInCheck,
      resolvedLastMove,
      legalDests,
    });
  }, [fen, isInCheck, legalDests, orientation, resolvedLastMove, turnColor]);

  useEffect(() => {
    cgApiRef.current?.setAutoShapes(autoShapes);
  }, [autoShapes]);

  useContainerResizeObserver(boardContainerRef, () => {
    cgApiRef.current?.redrawAll();
  });

  return {
    boardContainerRef,
  };
}

interface InitialChessgroundConfigParams {
  fen: string;
  orientation: BoardOrientation;
  turnColor: cg.Color;
  isInCheck: boolean;
  resolvedLastMove: cg.Key[] | undefined;
  legalDests: Map<cg.Key, cg.Key[]>;
  autoShapes: DrawShape[];
  onMove: (orig: string, dest: string) => void;
}

function createInitialChessgroundConfig({
  fen,
  orientation,
  turnColor,
  isInCheck,
  resolvedLastMove,
  legalDests,
  autoShapes,
  onMove,
}: InitialChessgroundConfigParams): ChessgroundConfig {
  return {
    fen,
    orientation,
    turnColor,
    check: isInCheck,
    lastMove: resolvedLastMove,
    coordinates: true,
    animation: {
      enabled: true,
      duration: 180,
    },
    highlight: {
      lastMove: true,
      check: true,
    },
    movable: {
      free: false,
      color: turnColor,
      dests: legalDests,
      showDests: true,
      rookCastle: true,
      events: {
        after: onMove,
      },
    },
    drawable: {
      enabled: true,
      visible: true,
      autoShapes,
    },
  };
}

interface BoardSyncParams {
  fen: string;
  orientation: BoardOrientation;
  turnColor: cg.Color;
  isInCheck: boolean;
  resolvedLastMove: cg.Key[] | undefined;
  legalDests: Map<cg.Key, cg.Key[]>;
}

function synchronizeBoardConfiguration(api: ChessgroundApi | null, params: BoardSyncParams): void {
  if (!api) {
    return;
  }

  api.set({
    fen: params.fen,
    orientation: params.orientation,
    turnColor: params.turnColor,
    check: params.isInCheck,
    lastMove: params.resolvedLastMove,
    movable: {
      free: false,
      color: params.turnColor,
      dests: params.legalDests,
      showDests: true,
      rookCastle: true,
    },
  });
}

function revertBoardPositionToCanonical(api: ChessgroundApi | null, canonicalFen: string): void {
  api?.set({ fen: canonicalFen });
}

function useContainerResizeObserver(targetRef: React.RefObject<HTMLDivElement | null>, onResize: () => void): void {
  useEffect(() => {
    const container = targetRef.current;
    if (!container || typeof ResizeObserver === "undefined") {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      onResize();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [targetRef, onResize]);
}
