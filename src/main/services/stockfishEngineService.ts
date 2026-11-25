import { buildPlayerReviewStats, classifyEvaluatedMove } from "@shared/analysis/chessGameAnalyzer";
import { isMoveSequenceInOpeningBook } from "@shared/analysis/openingBook";
import {
  type EngineAnalysisSnapshot,
  type EngineScore,
  type GameReviewProgressEvent,
  type GameReviewReport,
  type GameReviewRequest,
  type LiveAnalysisRequest,
  type PlayerColor,
  type ReviewedMoveAnalysis,
} from "@shared/types/chess";
import { sanitizeAndValidateFen } from "@shared/utils/chessMoveUtils";
import { DEFAULT_MULTI_PV, MAX_GAME_REVIEW_DEPTH, MAX_LIVE_ANALYSIS_DEPTH } from "../constants/stockfishConstants";
import { clampEngineDepth, clampEngineMultiPv } from "../utils/engineHardwareUtils";
import { UciEngineClient } from "./uciEngineClient";

type SnapshotListener = (snapshot: EngineAnalysisSnapshot) => void;

export class StockfishEngineService {
  private readonly client: UciEngineClient;
  private searchCounter = 0;
  private isReviewCancelled = false;
  private liveAnalysisQueue: Promise<void> = Promise.resolve();

  constructor(client?: UciEngineClient) {
    this.client = client ?? new UciEngineClient();
  }

  public async startLiveAnalysis(request: LiveAnalysisRequest, onUpdate: SnapshotListener): Promise<void> {
    const sanitizedFen = sanitizeAndValidateFen(request.fen);
    await this.client.ensureStarted();

    const searchSessionId = ++this.searchCounter;

    this.liveAnalysisQueue = this.liveAnalysisQueue
      .then(async () => {
        if (searchSessionId !== this.searchCounter) {
          return;
        }

        await this.client.stopActiveSearch();

        if (searchSessionId !== this.searchCounter) {
          return;
        }

        const depth = clampEngineDepth(request.depth ?? MAX_LIVE_ANALYSIS_DEPTH);
        const multiPv = clampEngineMultiPv(request.multiPv ?? DEFAULT_MULTI_PV);

        await this.client.executeSearch({
          fen: sanitizedFen,
          depth,
          multiPv,
          onUpdate,
        });
      })
      .catch((error) => {
        console.error("Falha ao executar análise ao vivo no motor:", error);
      });
  }

  public async stopLiveAnalysis(): Promise<void> {
    this.searchCounter += 1;
    await this.client.stopActiveSearch();
  }

  public async stopGameReview(): Promise<void> {
    this.isReviewCancelled = true;
    await this.client.stopActiveSearch();
  }

  public async resetGameEngineState(): Promise<void> {
    await this.client.resetNewGame();
  }

  public async reviewGame(
    request: GameReviewRequest,
    onProgress: (event: GameReviewProgressEvent) => void
  ): Promise<GameReviewReport> {
    this.searchCounter += 1;
    this.isReviewCancelled = false;

    await this.liveAnalysisQueue.catch(() => {});
    await this.client.stopActiveSearch();
    await this.client.resetNewGame();

    const reviewDepth = clampEngineDepth(request.depth ?? MAX_GAME_REVIEW_DEPTH);
    const totalPlies = request.moves.length;

    if (totalPlies === 0) {
      return createEmptyGameReviewReport();
    }

    if (this.isReviewCancelled) {
      throw new Error("Análise cancelada pelo usuário.");
    }

    const sanitizedInitialFen = sanitizeAndValidateFen(request.initialFen);
    const initialSnapshot = await this.client.executeSearch({
      fen: sanitizedInitialFen,
      depth: reviewDepth,
      multiPv: DEFAULT_MULTI_PV,
    });

    if (this.isReviewCancelled) {
      throw new Error("Análise cancelada pelo usuário.");
    }

    let previousScore: EngineScore = extractPrimaryScore(initialSnapshot);
    let previousSecondBestScore: EngineScore | null = initialSnapshot.lines[1]?.score ?? null;
    let previousBestMoveUci = initialSnapshot.bestMoveUci;

    const reviewedMoves: ReviewedMoveAnalysis[] = [];
    const playedUciMovesSoFar: string[] = [];
    let isGameStillInBook = true;

    for (let index = 0; index < totalPlies; index += 1) {
      if (this.isReviewCancelled) {
        throw new Error("Análise cancelada pelo usuário.");
      }

      const move = request.moves[index];
      onProgress({
        currentPly: move.ply,
        totalPlies,
        percentage: Math.round(((index + 1) / totalPlies) * 100),
        currentMoveSan: move.san,
      });

      playedUciMovesSoFar.push(move.uci);
      if (isGameStillInBook) {
        isGameStillInBook = isMoveSequenceInOpeningBook(playedUciMovesSoFar);
      }

      const sanitizedFenAfter = sanitizeAndValidateFen(move.fenAfter);
      const snapshotAfter = await this.client.executeSearch({
        fen: sanitizedFenAfter,
        depth: reviewDepth,
        multiPv: DEFAULT_MULTI_PV,
      });

      const scoreAfter = extractPrimaryScore(snapshotAfter);
      const previousMove = index > 0 ? request.moves[index - 1] : null;
      const previousReviewedMove = index > 0 ? reviewedMoves[index - 1] : null;

      const validPlayerElo = resolveValidPlayerElo(move.color, request.whiteElo, request.blackElo);

      const evaluation = classifyEvaluatedMove({
        ply: move.ply,
        moverColor: move.color,
        playedUci: move.uci,
        bestMoveUci: previousBestMoveUci,
        scoreBefore: previousScore,
        scoreAfter,
        secondBestScoreBefore: previousSecondBestScore,
        fenBefore: move.fenBefore,
        fenAfter: move.fenAfter,
        previousPlayedUci: previousMove?.uci ?? null,
        previousMoveClassification: previousReviewedMove?.classification ?? null,
        isInBook: isGameStillInBook,
        playerElo: validPlayerElo,
      });

      if (evaluation.classification !== "book") {
        isGameStillInBook = false;
      }

      reviewedMoves.push({
        ply: move.ply,
        color: move.color,
        playedSan: move.san,
        playedUci: move.uci,
        scoreAfter,
        bestMoveUci: previousBestMoveUci,
        centipawnLoss: evaluation.centipawnLoss,
        accuracy: evaluation.accuracy,
        classification: evaluation.classification,
      });

      previousScore = scoreAfter;
      previousSecondBestScore = snapshotAfter.lines[1]?.score ?? null;
      previousBestMoveUci = snapshotAfter.bestMoveUci;
    }

    return {
      moves: reviewedMoves,
      whiteStats: buildPlayerReviewStats(reviewedMoves, "w"),
      blackStats: buildPlayerReviewStats(reviewedMoves, "b"),
    };
  }

  public dispose(): void {
    this.client.dispose();
  }
}

function extractPrimaryScore(snapshot: EngineAnalysisSnapshot): EngineScore {
  const primaryLine = snapshot.lines[0];
  return primaryLine?.score ?? { type: "cp", value: 0 };
}

function createEmptyGameReviewReport(): GameReviewReport {
  return {
    moves: [],
    whiteStats: buildPlayerReviewStats([], "w"),
    blackStats: buildPlayerReviewStats([], "b"),
  };
}

function resolveValidPlayerElo(color: PlayerColor, whiteElo?: string, blackElo?: string): number | undefined {
  const rawPlayerElo = color === "w" ? whiteElo : blackElo;
  if (!rawPlayerElo) {
    return undefined;
  }

  const parsedPlayerElo = Number.parseInt(rawPlayerElo, 10);
  const isValidElo = !Number.isNaN(parsedPlayerElo) && parsedPlayerElo > 0;

  return isValidElo ? parsedPlayerElo : undefined;
}
