export const MAX_LIVE_ANALYSIS_DEPTH = 18;
export const MAX_GAME_REVIEW_DEPTH = 18;
export const ENGINE_HASH_SIZE_MB = 128;

export const MIN_ENGINE_DEPTH = 4;
export const MAX_ENGINE_DEPTH = 26;
export const MIN_MULTI_PV = 1;
export const MAX_MULTI_PV = 5;
export const DEFAULT_MULTI_PV = 2;
export const MAX_ENGINE_THREADS = 4;

export const POSIX_EXECUTABLE_MODE = 0o755;

export const PLATFORM_STOCKFISH_RELATIVE_PATHS: Record<string, string> = {
  linux: "stockfish/stockfish-linux-x86-64-universal/stockfish/stockfish-linux-x86-64-universal",
  darwin: "stockfish/stockfish-macos-universal/stockfish/stockfish-macos-universal",
  win32: "stockfish/stockfish-windows-x86-64-universal/stockfish/stockfish-windows-x86-64-universal.exe",
};
export const DEFAULT_READY_TIMEOUT_MS = 6000;
export const HALT_SEARCH_TIMEOUT_MS = 2500;
export const MAX_SEARCH_TIMEOUT_MS = 30000;
export const PROCESS_FORCE_KILL_DELAY_MS = 1500;
