import { type EnginePrincipalVariation, type EngineScore, type PlayerColor } from "@shared/types/chess";
import { isValidUciMove } from "@shared/utils/chessMoveUtils";

const DEPTH_PATTERN = /\bdepth\s+(-?\d+)/;
const MULTIPV_PATTERN = /\bmultipv\s+(-?\d+)/;
const SCORE_PATTERN = /\bscore\s+(cp|mate)\s+(-?\d+)/;
const PV_PATTERN = /\bpv\s+(.+)$/;

interface ParsedBestMoveLine {
  bestMoveUci: string | null;
}

export function parseUciInfoLine(rawLine: string, sideToMove: PlayerColor): EnginePrincipalVariation | null {
  const line = rawLine.trim();
  const isInfoEvaluationLine = line.startsWith("info ") && line.includes(" score ") && line.includes(" pv ");

  if (!isInfoEvaluationLine) {
    return null;
  }

  const depth = extractNumericValue(line, DEPTH_PATTERN);
  if (depth === null) {
    return null;
  }

  const multipv = extractNumericValue(line, MULTIPV_PATTERN) ?? 1;

  const score = extractNormalizedScore(line, sideToMove);
  if (!score) {
    return null;
  }

  const pvUciMoves = extractPrincipalVariationMoves(line);
  if (pvUciMoves.length === 0) {
    return null;
  }

  return {
    multipv,
    depth,
    score,
    pvUciMoves,
  };
}

export function parseUciBestMoveLine(rawLine: string): ParsedBestMoveLine | null {
  const line = rawLine.trim();
  if (!line.startsWith("bestmove ")) {
    return null;
  }

  const tokens = line.split(/\s+/);
  const rawBestMove = tokens[1];
  const hasValidBestMove = Boolean(rawBestMove) && rawBestMove !== "(none)" && rawBestMove !== "0000";

  return {
    bestMoveUci: hasValidBestMove ? rawBestMove : null,
  };
}

function extractNumericValue(line: string, pattern: RegExp): number | null {
  const match = line.match(pattern);
  if (!match) {
    return null;
  }

  const parsedValue = Number.parseInt(match[1], 10);
  return Number.isNaN(parsedValue) ? null : parsedValue;
}

function extractNormalizedScore(line: string, sideToMove: PlayerColor): EngineScore | null {
  const scoreMatch = line.match(SCORE_PATTERN);
  if (!scoreMatch) {
    return null;
  }

  const rawType = scoreMatch[1] as "cp" | "mate";
  const rawValue = Number.parseInt(scoreMatch[2], 10);
  if (Number.isNaN(rawValue)) {
    return null;
  }

  const whitePerspectiveMultiplier = sideToMove === "w" ? 1 : -1;
  const normalizedValue = rawValue * whitePerspectiveMultiplier;

  return {
    type: rawType,
    value: normalizedValue,
  };
}

function extractPrincipalVariationMoves(line: string): string[] {
  const pvMatch = line.match(PV_PATTERN);
  if (!pvMatch) {
    return [];
  }

  return pvMatch[1].trim().split(/\s+/).filter(isValidUciMove);
}
