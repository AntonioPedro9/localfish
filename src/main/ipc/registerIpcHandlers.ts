import { type BrowserWindow, ipcMain } from "electron";
import { IPC_CHANNELS } from "@shared/constants/ipcChannels";
import { type GameReviewRequest, type LiveAnalysisRequest } from "@shared/types/chess";
import { openChessFileFromDisk } from "../services/fileImportService";
import { type StockfishEngineService } from "../services/stockfishEngineService";

export function registerIpcHandlers(
  engineService: StockfishEngineService,
  getMainWindow: () => BrowserWindow | null
): void {
  registerSafeIpcHandler(IPC_CHANNELS.ENGINE_START_ANALYSIS, async (event, request: LiveAnalysisRequest) => {
    if (!isValidLiveAnalysisRequest(request)) {
      throw new Error("Parâmetros inválidos para análise em tempo real.");
    }

    await engineService.startLiveAnalysis(request, (snapshot) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send(IPC_CHANNELS.ENGINE_ANALYSIS_UPDATE, snapshot);
      }
    });
  });

  registerSafeIpcHandler(IPC_CHANNELS.ENGINE_STOP_ANALYSIS, async () => {
    await engineService.stopLiveAnalysis();
  });

  registerSafeIpcHandler(IPC_CHANNELS.ENGINE_REVIEW_GAME, async (event, request: GameReviewRequest) => {
    if (!isValidGameReviewRequest(request)) {
      throw new Error("Parâmetros inválidos para revisão da partida.");
    }

    return engineService.reviewGame(request, (progress) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send(IPC_CHANNELS.ENGINE_REVIEW_PROGRESS, progress);
      }
    });
  });

  registerSafeIpcHandler(IPC_CHANNELS.ENGINE_STOP_REVIEW, async () => {
    await engineService.stopGameReview();
  });

  registerSafeIpcHandler(IPC_CHANNELS.FILE_OPEN_DIALOG, async () => {
    return openChessFileFromDisk(getMainWindow());
  });
}

function registerSafeIpcHandler(channel: string, handler: Parameters<typeof ipcMain.handle>[1]): void {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, handler);
}

function isValidLiveAnalysisRequest(request: unknown): request is LiveAnalysisRequest {
  if (!request || typeof request !== "object") {
    return false;
  }

  const candidate = request as Partial<LiveAnalysisRequest>;
  return typeof candidate.fen === "string" && candidate.fen.trim().length > 0;
}

function isValidGameReviewRequest(request: unknown): request is GameReviewRequest {
  if (!request || typeof request !== "object") {
    return false;
  }

  const candidate = request as Partial<GameReviewRequest>;
  const hasValidInitialFen = typeof candidate.initialFen === "string" && candidate.initialFen.trim().length > 0;
  const hasValidMovesArray = Array.isArray(candidate.moves);

  return hasValidInitialFen && hasValidMovesArray;
}
