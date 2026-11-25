import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { dirname } from "node:path";
import { createInterface, type Interface as ReadlineInterface } from "node:readline";
import { Chess } from "chess.js";
import {
  type EngineAnalysisSnapshot,
  type EnginePrincipalVariation,
  type EngineScore,
  type PlayerColor,
} from "@shared/types/chess";
import { extractTurnFromFen, isUciMoveLegalInFen } from "@shared/utils/chessMoveUtils";
import {
  DEFAULT_MULTI_PV,
  DEFAULT_READY_TIMEOUT_MS,
  ENGINE_HASH_SIZE_MB,
  HALT_SEARCH_TIMEOUT_MS,
  MAX_SEARCH_TIMEOUT_MS,
  PROCESS_FORCE_KILL_DELAY_MS,
} from "../constants/stockfishConstants";
import { clampEngineDepth, clampEngineMultiPv, resolveOptimalThreadCount } from "../utils/engineHardwareUtils";
import { resolveStockfishBinary } from "./stockfishBinaryResolver";
import { parseUciBestMoveLine, parseUciInfoLine } from "./uciOutputParser";

export type EngineOperationalState = "uninitialized" | "idle" | "searching" | "stopping" | "disposed";

export interface SearchExecutionParams {
  fen: string;
  depth: number;
  multiPv?: number;
  onUpdate?: (snapshot: EngineAnalysisSnapshot) => void;
}

interface PendingReadyResolver {
  resolve: () => void;
  reject: (error: Error) => void;
  timeoutId: NodeJS.Timeout;
}

interface ActiveSearchSession {
  sessionId: number;
  fen: string;
  turn: PlayerColor;
  linesByMultiPv: Map<number, EnginePrincipalVariation>;
  isCancelled: boolean;
  onUpdate?: (snapshot: EngineAnalysisSnapshot) => void;
  onComplete: (snapshot: EngineAnalysisSnapshot) => void;
}

export class UciEngineClient {
  private process: ChildProcessWithoutNullStreams | null = null;
  private readline: ReadlineInterface | null = null;
  private operationalState: EngineOperationalState = "uninitialized";
  private currentMultiPv: number | null = null;
  private searchCounter = 0;

  private activeSearchSession: ActiveSearchSession | null = null;
  private pendingReadyResolvers: PendingReadyResolver[] = [];
  private pendingStopResolvers: Array<() => void> = [];

  public get state(): EngineOperationalState {
    return this.operationalState;
  }

  public isBusy(): boolean {
    return this.operationalState === "searching" || this.operationalState === "stopping";
  }

  public async ensureStarted(): Promise<void> {
    const isAlreadyRunning =
      this.process !== null && this.operationalState !== "uninitialized" && this.operationalState !== "disposed";
    if (isAlreadyRunning) {
      return;
    }

    const resolution = resolveStockfishBinary();
    if (!resolution.isAvailable) {
      throw new Error(resolution.errorMessage ?? "Binário do Stockfish indisponível.");
    }

    const child = spawn(resolution.binaryPath, [], {
      cwd: dirname(resolution.binaryPath),
      stdio: "pipe",
      windowsHide: true,
    });

    this.process = child;
    this.readline = createInterface({ input: child.stdout });

    this.readline.on("line", (line) => {
      this.handleStdoutLine(line);
    });

    child.on("error", (error) => {
      this.cleanupAfterProcessExit(`Falha na execução do processo Stockfish: ${error.message}`);
    });

    child.on("exit", (code, signal) => {
      this.cleanupAfterProcessExit(
        `Processo do Stockfish encerrado inesperadamente (código: ${code}, sinal: ${signal}).`
      );
    });

    const threadCount = resolveOptimalThreadCount();
    this.sendCommand("uci");
    this.sendCommand(`setoption name Threads value ${threadCount}`);
    this.sendCommand(`setoption name Hash value ${ENGINE_HASH_SIZE_MB}`);
    await this.waitForReadyOk();

    this.operationalState = "idle";
  }

  public async executeSearch(params: SearchExecutionParams): Promise<EngineAnalysisSnapshot> {
    const { fen, depth, multiPv = DEFAULT_MULTI_PV, onUpdate } = params;
    const turn = extractTurnFromFen(fen);

    const terminalSnapshot = buildTerminalPositionSnapshotIfEnded(fen, turn);
    if (terminalSnapshot) {
      onUpdate?.(terminalSnapshot);
      return terminalSnapshot;
    }

    await this.ensureStarted();

    if (this.isBusy()) {
      await this.stopActiveSearch();
    }

    const clampedDepth = clampEngineDepth(depth);
    const clampedMultiPv = clampEngineMultiPv(multiPv);

    if (this.currentMultiPv !== clampedMultiPv) {
      this.sendCommand(`setoption name MultiPV value ${clampedMultiPv}`);
      await this.waitForReadyOk();
      this.currentMultiPv = clampedMultiPv;
    }

    const sessionId = ++this.searchCounter;

    return new Promise<EngineAnalysisSnapshot>((resolve) => {
      let isSettled = false;

      const finishSearch = (snapshot: EngineAnalysisSnapshot) => {
        if (isSettled) {
          return;
        }
        isSettled = true;
        clearTimeout(timeoutTimer);

        if (this.activeSearchSession?.sessionId === sessionId) {
          this.activeSearchSession = null;
          if (this.operationalState === "searching") {
            this.operationalState = "idle";
          }
        }
        resolve(snapshot);
      };

      const session: ActiveSearchSession = {
        sessionId,
        fen,
        turn,
        linesByMultiPv: new Map(),
        isCancelled: false,
        onUpdate,
        onComplete: finishSearch,
      };

      const timeoutTimer = setTimeout(() => {
        if (isSettled) {
          return;
        }
        const fallbackSnapshot = buildSnapshotFromContext(session, null);
        finishSearch(fallbackSnapshot);
      }, MAX_SEARCH_TIMEOUT_MS);

      this.activeSearchSession = session;
      this.operationalState = "searching";

      this.sendCommand(`position fen ${fen}`);
      this.sendCommand(`go depth ${clampedDepth}`);
    });
  }

  public async stopActiveSearch(): Promise<void> {
    if (this.activeSearchSession) {
      this.activeSearchSession.isCancelled = true;
      const fallbackSnapshot = buildSnapshotFromContext(this.activeSearchSession, null);
      this.activeSearchSession.onComplete(fallbackSnapshot);
      this.activeSearchSession = null;
    }

    const isSearchActivelyRunning = this.operationalState === "searching" && this.process !== null;
    if (isSearchActivelyRunning) {
      await this.haltSearchAndDrainOutput();
    }

    if (this.process !== null) {
      try {
        await this.waitForReadyOk();
      } catch {}
    }
  }

  public async resetNewGame(): Promise<void> {
    await this.ensureStarted();
    await this.stopActiveSearch();

    this.sendCommand("ucinewgame");
    await this.waitForReadyOk();
  }

  public dispose(): void {
    if (!this.process) {
      return;
    }

    const activeProcess = this.process;

    try {
      this.sendCommand("quit");
      this.readline?.close();
      activeProcess.kill("SIGTERM");

      const forceKillTimer = setTimeout(() => {
        if (!activeProcess.killed) {
          try {
            activeProcess.kill("SIGKILL");
          } catch {}
        }
      }, PROCESS_FORCE_KILL_DELAY_MS);

      activeProcess.once("exit", () => {
        clearTimeout(forceKillTimer);
      });
    } catch {
      try {
        activeProcess.kill("SIGKILL");
      } catch {}
    } finally {
      this.cleanupAfterProcessExit("Motor Stockfish finalizado pelo encerramento da aplicação.");
    }
  }

  private haltSearchAndDrainOutput(): Promise<void> {
    this.operationalState = "stopping";

    return new Promise<void>((resolve) => {
      let isHalted = false;

      const finishHalt = () => {
        if (isHalted) {
          return;
        }
        isHalted = true;
        clearTimeout(safetyTimer);
        this.pendingStopResolvers = this.pendingStopResolvers.filter((resolver) => resolver !== finishHalt);
        this.operationalState = "idle";
        resolve();
      };

      const safetyTimer = setTimeout(finishHalt, HALT_SEARCH_TIMEOUT_MS);
      this.pendingStopResolvers.push(finishHalt);

      this.sendCommand("stop");
    });
  }

  private handleStdoutLine(rawLine: string): void {
    const line = rawLine.trim();
    if (!line) {
      return;
    }

    if (line === "readyok") {
      this.resolveNextReadyOk();
      return;
    }

    const parsedBestMove = parseUciBestMoveLine(line);
    if (parsedBestMove) {
      this.handleBestMoveEvent(parsedBestMove.bestMoveUci);
      return;
    }

    const currentSession = this.activeSearchSession;
    if (!currentSession || currentSession.isCancelled || this.operationalState !== "searching") {
      return;
    }

    const parsedInfo = parseUciInfoLine(line, currentSession.turn);
    if (parsedInfo) {
      currentSession.linesByMultiPv.set(parsedInfo.multipv, parsedInfo);
      const snapshot = buildSnapshotFromContext(currentSession, null);
      currentSession.onUpdate?.(snapshot);
    }
  }

  private handleBestMoveEvent(bestMoveUci: string | null): void {
    const isStoppingSearch = this.operationalState === "stopping" || this.pendingStopResolvers.length > 0;
    if (isStoppingSearch) {
      this.operationalState = "idle";
      this.flushStopResolvers();
      return;
    }

    const currentSession = this.activeSearchSession;
    if (!currentSession || currentSession.isCancelled) {
      return;
    }

    const isMoveApplicable = isUciMoveApplicableToPosition(currentSession.fen, bestMoveUci);
    if (!isMoveApplicable) {
      return;
    }

    this.activeSearchSession = null;
    this.operationalState = "idle";

    const finalSnapshot = buildSnapshotFromContext(currentSession, bestMoveUci);
    currentSession.onUpdate?.(finalSnapshot);
    currentSession.onComplete(finalSnapshot);
  }

  private waitForReadyOk(timeoutMs = DEFAULT_READY_TIMEOUT_MS): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const resolverIndex = this.pendingReadyResolvers.findIndex((entry) => entry.timeoutId === timeoutId);
        if (resolverIndex !== -1) {
          this.pendingReadyResolvers.splice(resolverIndex, 1);
        }
        reject(new Error("Timeout aguardando 'readyok' da engine UCI Stockfish."));
      }, timeoutMs);

      this.pendingReadyResolvers.push({
        resolve,
        reject,
        timeoutId,
      });

      this.sendCommand("isready");
    });
  }

  private resolveNextReadyOk(): void {
    const nextResolver = this.pendingReadyResolvers.shift();
    if (nextResolver) {
      clearTimeout(nextResolver.timeoutId);
      nextResolver.resolve();
    }
  }

  private flushStopResolvers(): void {
    const resolvers = [...this.pendingStopResolvers];
    this.pendingStopResolvers = [];
    for (const resolver of resolvers) {
      resolver();
    }
  }

  private cleanupAfterProcessExit(reason: string): void {
    this.process = null;
    this.readline = null;
    this.operationalState = "disposed";
    this.currentMultiPv = null;

    this.flushStopResolvers();
    this.rejectAllPendingReadyResolvers(reason);

    if (this.activeSearchSession) {
      const fallback = buildSnapshotFromContext(this.activeSearchSession, null);
      this.activeSearchSession.onComplete(fallback);
      this.activeSearchSession = null;
    }
  }

  private rejectAllPendingReadyResolvers(reason: string): void {
    const pending = [...this.pendingReadyResolvers];
    this.pendingReadyResolvers = [];
    const error = new Error(reason);

    for (const entry of pending) {
      clearTimeout(entry.timeoutId);
      entry.reject(error);
    }
  }

  private sendCommand(command: string): void {
    const stdin = this.process?.stdin;
    if (stdin?.writable) {
      stdin.write(`${command}\n`);
    }
  }
}

function buildSnapshotFromContext(context: ActiveSearchSession, bestMoveUci: string | null): EngineAnalysisSnapshot {
  const sortedLines = Array.from(context.linesByMultiPv.values()).sort(
    (first, second) => first.multipv - second.multipv
  );
  const topLine = sortedLines[0];
  const resolvedBestMove = bestMoveUci ?? topLine?.pvUciMoves[0] ?? null;

  return {
    fen: context.fen,
    bestMoveUci: resolvedBestMove,
    lines: sortedLines,
  };
}

function buildTerminalPositionSnapshotIfEnded(fen: string, turn: PlayerColor): EngineAnalysisSnapshot | null {
  try {
    const chess = new Chess(fen);
    if (!chess.isGameOver()) {
      return null;
    }

    const isCheckmate = chess.isCheckmate();
    const score: EngineScore = isCheckmate
      ? { type: "mate", value: turn === "w" ? -1 : 1, isTerminalMate: true }
      : { type: "cp", value: 0 };

    return {
      fen,
      bestMoveUci: null,
      lines: [
        {
          multipv: 1,
          depth: 0,
          score,
          pvUciMoves: [],
        },
      ],
    };
  } catch {
    return null;
  }
}

function isUciMoveApplicableToPosition(fen: string, bestMoveUci: string | null): boolean {
  if (bestMoveUci === null) {
    return true;
  }
  return isUciMoveLegalInFen(fen, bestMoveUci);
}
