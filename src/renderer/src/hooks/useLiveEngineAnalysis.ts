import { useCallback, useEffect, useRef, useState } from "react";
import { type EngineAnalysisSnapshot } from "@shared/types/chess";
import { LIVE_ANALYSIS_THROTTLE_MS } from "@/constants/analysisConstants";

interface UseLiveEngineAnalysisParams {
  currentFen: string;
  isGameLoaded: boolean;
  isReviewRunning: boolean;
  isEnabled?: boolean;
  onError: (message: string) => void;
}

export function useLiveEngineAnalysis({
  currentFen,
  isGameLoaded,
  isReviewRunning,
  isEnabled = true,
  onError,
}: UseLiveEngineAnalysisParams) {
  const { liveSnapshot, clearSnapshot } = useThrottledEngineStream();

  useEffect(() => {
    let isSessionActive = true;
    const shouldRunLiveAnalysis = isGameLoaded && !isReviewRunning && isEnabled && Boolean(currentFen);

    if (!shouldRunLiveAnalysis) {
      void stopActiveLiveAnalysis();
      clearSnapshot();
      return;
    }

    requestLiveEngineAnalysis(currentFen).catch((error) => {
      if (!isSessionActive) {
        return;
      }
      const message = error instanceof Error ? error.message : "Erro ao iniciar análise em tempo real.";
      onError(message);
    });

    return () => {
      isSessionActive = false;
    };
  }, [clearSnapshot, currentFen, isEnabled, isGameLoaded, isReviewRunning, onError]);

  useEffect(() => {
    return () => {
      void stopActiveLiveAnalysis();
    };
  }, []);

  return {
    liveSnapshot,
    stopAnalysis: stopActiveLiveAnalysis,
  };
}

function useThrottledEngineStream() {
  const [liveSnapshot, setLiveSnapshot] = useState<EngineAnalysisSnapshot | null>(null);
  const pendingSnapshotRef = useRef<EngineAnalysisSnapshot | null>(null);
  const lastFlushTimeRef = useRef<number>(0);
  const animationFrameIdRef = useRef<number | null>(null);

  const clearSnapshot = useCallback(() => {
    setLiveSnapshot(null);
    pendingSnapshotRef.current = null;
  }, []);

  useEffect(() => {
    const flushThrottledUpdate = () => {
      const currentTime = performance.now();
      const elapsedMilliseconds = currentTime - lastFlushTimeRef.current;
      const hasIntervalElapsed = elapsedMilliseconds >= LIVE_ANALYSIS_THROTTLE_MS;
      const hasPendingSnapshot = pendingSnapshotRef.current !== null;

      if (hasIntervalElapsed && hasPendingSnapshot) {
        setLiveSnapshot(pendingSnapshotRef.current);
        pendingSnapshotRef.current = null;
        lastFlushTimeRef.current = currentTime;
      }

      animationFrameIdRef.current = requestAnimationFrame(flushThrottledUpdate);
    };

    animationFrameIdRef.current = requestAnimationFrame(flushThrottledUpdate);

    const unsubscribe = window.localfishApi.onAnalysisUpdate((incomingSnapshot) => {
      pendingSnapshotRef.current = incomingSnapshot;
    });

    return () => {
      unsubscribe();
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, []);

  return {
    liveSnapshot,
    clearSnapshot,
  };
}

async function stopActiveLiveAnalysis(): Promise<void> {
  await window.localfishApi.stopLiveAnalysis().catch(() => {});
}

async function requestLiveEngineAnalysis(fen: string): Promise<void> {
  await window.localfishApi.startLiveAnalysis({ fen });
}
