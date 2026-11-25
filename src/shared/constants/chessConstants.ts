import { type ChessPieceType, type MoveClassification, type PromotionChoicePiece } from "../types/chess";

export const PROMOTION_PIECE_CHOICES: readonly PromotionChoicePiece[] = ["q", "n", "r", "b"];

export const CHESS_PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export const CAPTURABLE_PIECE_ORDER: ChessPieceType[] = ["p", "b", "n", "r", "q"];

export const INITIAL_CAPTURABLE_PIECE_COUNTS: Record<ChessPieceType, number> = {
  p: 8,
  b: 2,
  n: 2,
  r: 2,
  q: 1,
};

export const DEFAULT_PLAYER_NAMES = {
  white: "Brancas",
  black: "Pretas",
} as const;

export const MATE_CENTIPAWN_EQUIVALENT = 10000;
export const MAX_EVAL_CENTIPAWNS = 1500;
export const WIN_PROBABILITY_COEFFICIENT = -0.00368208;
export const ELO_ADJUSTMENT_RATIO_SCALE = 0.25;
export const MOVE_ACCURACY_DECAY_RATE = 0.048;
export const ACCURACY_CURVE_MULTIPLIER = 103.1668;
export const ACCURACY_CURVE_OFFSET = 3.1669;
export const CPL_TO_WIN_DROP_SCALE_FACTOR = 0.085;
export const MAX_CPL_EQUIVALENT_WIN_DROP = 45;
export const DECISIVE_ADVANTAGE_CPL_BYPASS_CENTIPAWNS = 600;
export const GAME_ACCURACY_ARITHMETIC_WEIGHT = 0.395;
export const GAME_ACCURACY_HARMONIC_WEIGHT = 0.605;
export const GAME_ACCURACY_HARMONIC_FLOOR = 17.2;
export const MAX_BOOK_PLY = 8;
export const CRUSHING_ADVANTAGE_CENTIPAWNS = 500;

export const DEFAULT_REFERENCE_ELO = 1500;
export const MIN_VALID_ELO = 400;
export const MAX_VALID_ELO = 3500;
export const MAX_ESTIMATED_ELO = 3200;

export const MIN_ACTIVE_BAR_PERCENTAGE = 4;
export const MAX_ACTIVE_BAR_PERCENTAGE = 96;

export const ELO_LOGISTIC_SCALE_FACTOR = 173.717;
export const PEER_ACCURACY_STANDARD_DEVIATION = 7.0;
export const MAX_SINGLE_GAME_ELO_SHIFT = 600;
export const SAMPLE_SIZE_BENCHMARK_MOVES = 12;
export const RATING_ROUNDING_STEP = 50;
export const PLAYER_ELO_WEIGHT_IN_ANCHOR = 0.75;
export const OPPONENT_ELO_WEIGHT_IN_ANCHOR = 0.25;
export const BASELINE_ACCEPTABLE_CPL = 45;
export const EXCESS_CPL_RATING_PENALTY_MULTIPLIER = 1.3;
export const TACTICAL_IMPACT_MOVE_NORMALIZER_DIVISOR = 20;

export const CHESS_COM_EXPECTED_POINTS_THRESHOLDS = {
  EXCELLENT: 2.0,
  GOOD: 5.0,
  INACCURACY: 10.0,
  MISTAKE: 20.0,
} as const;

export const CHESS_COM_SPECIAL_MOVE_THRESHOLDS = {
  MIN_BRILLIANT_WIN_PERCENT_AFTER: 50.0,
  MAX_CRUSHING_WIN_PERCENT_BEFORE: 88.0,
  MAX_CRUSHING_CENTIPAWNS_BEFORE: 450,
  STANDARD_GREAT_MOVE_GAP: 10.0,
  LOWER_ELO_GREAT_MOVE_GAP: 8.0,
  LOWER_ELO_THRESHOLD: 1200,
  RESCUE_LOSING_WIN_PERCENT_BEFORE: 35.0,
  RESCUE_EQUAL_WIN_PERCENT_AFTER: 48.0,
  BREAKTHROUGH_MIN_BEFORE: 40.0,
  BREAKTHROUGH_MAX_BEFORE: 60.0,
  BREAKTHROUGH_WIN_PERCENT_AFTER: 72.0,
  MISS_MIN_WIN_PERCENT_BEFORE: 60.0,
  MISS_MIN_CENTIPAWNS_BEFORE: 180,
  MISS_MIN_WIN_PERCENT_AFTER: 35.0,
} as const;

export const MOVE_CLASSIFICATION_ORDER: MoveClassification[] = [
  "brilliant",
  "great",
  "book",
  "best",
  "excellent",
  "good",
  "inaccuracy",
  "mistake",
  "miss",
  "blunder",
];
