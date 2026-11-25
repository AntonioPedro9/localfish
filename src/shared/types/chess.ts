export type PlayerColor = "w" | "b";

export type BoardOrientation = "white" | "black";

export type ChessFormat = "pgn" | "fen";

export type ChessPieceType = "p" | "b" | "n" | "r" | "q";

export type PromotionChoicePiece = "q" | "n" | "r" | "b";

export type MoveClassification =
  "brilliant" | "great" | "book" | "best" | "excellent" | "good" | "inaccuracy" | "mistake" | "miss" | "blunder";

export interface EngineScore {
  type: "cp" | "mate";
  value: number;
  isTerminalMate?: boolean;
}

export interface EnginePrincipalVariation {
  multipv: number;
  depth: number;
  score: EngineScore;
  pvUciMoves: string[];
}

export interface EngineAnalysisSnapshot {
  fen: string;
  bestMoveUci: string | null;
  lines: EnginePrincipalVariation[];
}

export interface LiveAnalysisRequest {
  fen: string;
  depth?: number;
  multiPv?: number;
}

export interface GameMoveDescriptor {
  ply: number;
  moveNumber: number;
  color: PlayerColor;
  san: string;
  uci: string;
  from: string;
  to: string;
  promotion?: string;
  fenBefore: string;
  fenAfter: string;
}

export interface ReviewedMoveAnalysis {
  ply: number;
  color: PlayerColor;
  playedSan: string;
  playedUci: string;
  scoreAfter: EngineScore;
  bestMoveUci: string | null;
  centipawnLoss: number;
  accuracy: number;
  classification: MoveClassification;
}

export interface PlayerReviewStats {
  accuracy: number;
  averageCentipawnLoss: number;
  counts: Record<MoveClassification, number>;
}

export interface GameReviewReport {
  moves: ReviewedMoveAnalysis[];
  whiteStats: PlayerReviewStats;
  blackStats: PlayerReviewStats;
}

export interface GameReviewRequest {
  initialFen: string;
  moves: GameMoveDescriptor[];
  depth?: number;
  whiteElo?: string;
  blackElo?: string;
}

export interface GameReviewProgressEvent {
  currentPly: number;
  totalPlies: number;
  percentage: number;
  currentMoveSan: string;
}

export interface ImportedFileResult {
  canceled: boolean;
  fileName?: string;
  content?: string;
  errorMessage?: string;
}

export interface LocalfishApi {
  startLiveAnalysis: (request: LiveAnalysisRequest) => Promise<void>;
  stopLiveAnalysis: () => Promise<void>;
  reviewGame: (request: GameReviewRequest) => Promise<GameReviewReport>;
  stopGameReview: () => Promise<void>;
  openChessFileDialog: () => Promise<ImportedFileResult>;
  onAnalysisUpdate: (listener: (snapshot: EngineAnalysisSnapshot) => void) => () => void;
  onReviewProgress: (listener: (progress: GameReviewProgressEvent) => void) => () => void;
}
