import { availableParallelism, cpus } from "node:os";
import {
  MAX_ENGINE_DEPTH,
  MAX_ENGINE_THREADS,
  MAX_MULTI_PV,
  MIN_ENGINE_DEPTH,
  MIN_MULTI_PV,
} from "../constants/stockfishConstants";

export function clampEngineDepth(depth: number): number {
  return Math.max(MIN_ENGINE_DEPTH, Math.min(MAX_ENGINE_DEPTH, Math.round(depth)));
}

export function clampEngineMultiPv(multiPv: number): number {
  return Math.max(MIN_MULTI_PV, Math.min(MAX_MULTI_PV, Math.round(multiPv)));
}

export function resolveOptimalThreadCount(): number {
  const hardwareThreads = typeof availableParallelism === "function" ? availableParallelism() : cpus().length;
  const safeThreads = Math.max(1, Math.floor(hardwareThreads / 2));
  return Math.min(MAX_ENGINE_THREADS, safeThreads);
}
