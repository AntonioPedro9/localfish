import { useCallback, useMemo, useState } from "react";
import { Chess, DEFAULT_POSITION, type PieceSymbol, type Square } from "chess.js";
import { DEFAULT_PLAYER_NAMES } from "@shared/constants/chessConstants";
import { type BoardOrientation, type GameMoveDescriptor, type PromotionChoicePiece } from "@shared/types/chess";
import { type GameMetadata, type ParsedChessGame } from "@/utils/chessNotationParser";
import { ExplorationHistory, type BoardMoveCommand, type ExplorationStepMemento } from "@/utils/explorationHistory";

const DEFAULT_METADATA: GameMetadata = {
  ...DEFAULT_PLAYER_NAMES,
};

interface PendingPromotionState {
  orig: string;
  dest: string;
  color: "w" | "b";
}

export function useChessGame() {
  const [isGameLoaded, setIsGameLoaded] = useState<boolean>(false);
  const [metadata, setMetadata] = useState<GameMetadata>(DEFAULT_METADATA);
  const [initialFen, setInitialFen] = useState<string>(DEFAULT_POSITION);
  const [moves, setMoves] = useState<GameMoveDescriptor[]>([]);
  const [currentPly, setCurrentPly] = useState<number>(0);
  const [explorationHistory, setExplorationHistory] = useState<ExplorationHistory>(ExplorationHistory.empty());
  const [boardOrientation, setBoardOrientation] = useState<BoardOrientation>("white");
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotionState | null>(null);

  const explorationFen = explorationHistory.currentFen;
  const explorationLastMove = explorationHistory.currentLastMove;

  const currentMove = useMemo(() => {
    const isPlyOutOfBounds = currentPly <= 0 || currentPly > moves.length;
    if (isPlyOutOfBounds) {
      return null;
    }
    return moves[currentPly - 1] ?? null;
  }, [currentPly, moves]);

  const currentFen = useMemo(() => {
    if (explorationFen) {
      return explorationFen;
    }
    if (currentMove) {
      return currentMove.fenAfter;
    }
    return initialFen;
  }, [explorationFen, currentMove, initialFen]);

  const goToPly = useCallback(
    (targetPly: number) => {
      const clampedPly = Math.max(0, Math.min(moves.length, targetPly));
      setExplorationHistory(ExplorationHistory.empty());
      setPendingPromotion(null);
      setCurrentPly(clampedPly);
    },
    [moves.length]
  );

  const goToFirstMove = useCallback(() => goToPly(0), [goToPly]);

  const undoExplorationStep = useCallback(() => {
    setExplorationHistory((previousHistory) => previousHistory.undo().history);
    setPendingPromotion(null);
  }, []);

  const redoExplorationStep = useCallback(() => {
    setExplorationHistory((previousHistory) => previousHistory.redo().history);
    setPendingPromotion(null);
  }, []);

  const goToPreviousMove = useCallback(() => {
    if (explorationHistory.canUndo) {
      undoExplorationStep();
      return;
    }
    goToPly(currentPly - 1);
  }, [currentPly, explorationHistory.canUndo, goToPly, undoExplorationStep]);

  const goToNextMove = useCallback(() => {
    if (explorationHistory.canRedo) {
      redoExplorationStep();
      return;
    }
    goToPly(currentPly + 1);
  }, [currentPly, explorationHistory.canRedo, goToPly, redoExplorationStep]);

  const goToLastMove = useCallback(() => goToPly(moves.length), [goToPly, moves.length]);

  const flipBoard = useCallback(() => {
    setBoardOrientation((previousOrientation) => (previousOrientation === "white" ? "black" : "white"));
  }, []);

  const resetExploration = useCallback(() => {
    setExplorationHistory(ExplorationHistory.empty());
    setPendingPromotion(null);
  }, []);

  const executeMoveCommand = useCallback(
    (command: BoardMoveCommand): boolean => {
      try {
        const chess = new Chess(currentFen);
        const moveResult = chess.move({
          from: command.orig,
          to: command.dest,
          promotion: command.promotionPiece,
        });

        if (!moveResult) {
          return false;
        }

        const isFirstMoveInEmptyPosition = moves.length === 0 && explorationHistory.length === 0;
        if (isFirstMoveInEmptyPosition) {
          const newMove = createGameMoveDescriptor(1, moveResult, currentFen, chess.fen());
          setMoves([newMove]);
          setCurrentPly(1);
          return true;
        }

        const stepMemento: ExplorationStepMemento = {
          fen: chess.fen(),
          lastMove: [command.orig, command.dest],
          san: moveResult.san,
        };

        setExplorationHistory((previousHistory) => previousHistory.push(stepMemento));
        return true;
      } catch {
        return false;
      }
    },
    [currentFen, explorationHistory.length, moves.length]
  );

  const applyMoveOnBoard = useCallback(
    (orig: string, dest: string, promotionPiece?: PromotionChoicePiece): boolean => {
      const command: BoardMoveCommand = { orig, dest, promotionPiece };
      return executeMoveCommand(command);
    },
    [executeMoveCommand]
  );

  const handleUserBoardMove = useCallback(
    (orig: string, dest: string): boolean => {
      const isExploring = explorationHistory.length > 0;
      const nextGameMove = !isExploring ? moves[currentPly] : undefined;
      const isNextGameMoveInSequence = nextGameMove && nextGameMove.from === orig && nextGameMove.to === dest;

      if (isNextGameMoveInSequence) {
        goToPly(currentPly + 1);
        return true;
      }

      const pendingPromotionAttempt = detectPawnPromotionAttempt(currentFen, orig, dest);
      if (pendingPromotionAttempt) {
        setPendingPromotion(pendingPromotionAttempt);
        return true;
      }

      return applyMoveOnBoard(orig, dest);
    },
    [applyMoveOnBoard, currentFen, currentPly, explorationHistory.length, goToPly, moves]
  );

  const confirmPendingPromotion = useCallback(
    (promotionPiece: PromotionChoicePiece) => {
      if (!pendingPromotion) {
        return;
      }
      const { orig, dest } = pendingPromotion;
      setPendingPromotion(null);
      applyMoveOnBoard(orig, dest, promotionPiece);
    },
    [applyMoveOnBoard, pendingPromotion]
  );

  const cancelPendingPromotion = useCallback(() => {
    setPendingPromotion(null);
  }, []);

  const loadParsedGame = useCallback((parsed: ParsedChessGame) => {
    setMetadata(parsed.metadata);
    setInitialFen(parsed.initialFen);
    setMoves(parsed.moves);
    setCurrentPly(0);
    setExplorationHistory(ExplorationHistory.empty());
    setPendingPromotion(null);
    setIsGameLoaded(true);
  }, []);

  return {
    isGameLoaded,
    metadata,
    initialFen,
    moves,
    currentPly,
    currentFen,
    currentMove,
    explorationFen,
    explorationLastMove,
    explorationSteps: explorationHistory.steps,
    canUndoExploration: explorationHistory.canUndo,
    canRedoExploration: explorationHistory.canRedo,
    boardOrientation,
    pendingPromotion,
    goToPly,
    goToFirstMove,
    goToPreviousMove,
    goToNextMove,
    goToLastMove,
    flipBoard,
    resetExploration,
    undoExplorationStep,
    redoExplorationStep,
    handleUserBoardMove,
    confirmPendingPromotion,
    cancelPendingPromotion,
    loadParsedGame,
  };
}

function createGameMoveDescriptor(
  ply: number,
  moveResult: {
    color: "w" | "b";
    san: string;
    from: string;
    to: string;
    promotion?: string;
  },
  fenBefore: string,
  fenAfter: string
): GameMoveDescriptor {
  const moveNumber = Math.ceil(ply / 2);
  const uci = `${moveResult.from}${moveResult.to}${moveResult.promotion ?? ""}`;

  return {
    ply,
    moveNumber,
    color: moveResult.color,
    san: moveResult.san,
    uci,
    from: moveResult.from,
    to: moveResult.to,
    promotion: moveResult.promotion,
    fenBefore,
    fenAfter,
  };
}

function detectPawnPromotionAttempt(
  currentFen: string,
  origin: string,
  destination: string
): PendingPromotionState | null {
  try {
    const chess = new Chess(currentFen);
    const movingPiece = chess.get(origin as Square);

    if (!isPromotionTargetPiece(movingPiece, destination)) {
      return null;
    }

    const hasLegalPromotionMove = checkLegalPromotionMoveExists(chess, origin, destination);
    if (!hasLegalPromotionMove) {
      return null;
    }

    return {
      orig: origin,
      dest: destination,
      color: movingPiece.color,
    };
  } catch {
    return null;
  }
}

function isPromotionTargetPiece(
  piece: { type: PieceSymbol; color: "w" | "b" } | undefined,
  destination: string
): piece is { type: PieceSymbol; color: "w" | "b" } {
  if (!piece || piece.type !== "p") {
    return false;
  }

  const isWhitePromoting = piece.color === "w" && destination[1] === "8";
  const isBlackPromoting = piece.color === "b" && destination[1] === "1";

  return isWhitePromoting || isBlackPromoting;
}

function checkLegalPromotionMoveExists(chess: Chess, origin: string, destination: string): boolean {
  const legalMoves = chess.moves({ verbose: true });
  return legalMoves.some(
    (candidateMove) =>
      candidateMove.from === origin && candidateMove.to === destination && Boolean(candidateMove.promotion)
  );
}
