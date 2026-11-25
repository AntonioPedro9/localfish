import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "@shared/constants/ipcChannels";
import {
  type EngineAnalysisSnapshot,
  type GameReviewProgressEvent,
  type GameReviewRequest,
  type LiveAnalysisRequest,
  type LocalfishApi,
} from "@shared/types/chess";

const localfishApi: LocalfishApi = {
  startLiveAnalysis: (request: LiveAnalysisRequest) => ipcRenderer.invoke(IPC_CHANNELS.ENGINE_START_ANALYSIS, request),

  stopLiveAnalysis: () => ipcRenderer.invoke(IPC_CHANNELS.ENGINE_STOP_ANALYSIS),

  reviewGame: (request: GameReviewRequest) => ipcRenderer.invoke(IPC_CHANNELS.ENGINE_REVIEW_GAME, request),

  stopGameReview: () => ipcRenderer.invoke(IPC_CHANNELS.ENGINE_STOP_REVIEW),

  openChessFileDialog: () => ipcRenderer.invoke(IPC_CHANNELS.FILE_OPEN_DIALOG),

  onAnalysisUpdate: (listener: (snapshot: EngineAnalysisSnapshot) => void) =>
    subscribeToChannel(IPC_CHANNELS.ENGINE_ANALYSIS_UPDATE, listener),

  onReviewProgress: (listener: (progress: GameReviewProgressEvent) => void) =>
    subscribeToChannel(IPC_CHANNELS.ENGINE_REVIEW_PROGRESS, listener),
};

contextBridge.exposeInMainWorld("localfishApi", localfishApi);

function subscribeToChannel<T>(channel: string, listener: (payload: T) => void): () => void {
  const wrappedListener = (_event: Electron.IpcRendererEvent, payload: T) => {
    listener(payload);
  };

  ipcRenderer.on(channel, wrappedListener);
  return () => {
    ipcRenderer.removeListener(channel, wrappedListener);
  };
}
