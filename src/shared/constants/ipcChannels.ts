export const IPC_CHANNELS = {
  ENGINE_START_ANALYSIS: "engine:start-analysis",
  ENGINE_STOP_ANALYSIS: "engine:stop-analysis",
  ENGINE_REVIEW_GAME: "engine:review-game",
  ENGINE_STOP_REVIEW: "engine:stop-review",
  ENGINE_ANALYSIS_UPDATE: "engine:analysis-update",
  ENGINE_REVIEW_PROGRESS: "engine:review-progress",
  FILE_OPEN_DIALOG: "file:open-dialog",
} as const;
