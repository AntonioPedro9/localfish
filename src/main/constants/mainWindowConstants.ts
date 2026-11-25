export const MAIN_WINDOW_CONFIG = {
  width: 1920,
  height: 1080,
  minWidth: 1080,
  minHeight: 720,
  title: "Localfish",
  backgroundColor: "#09090b",
} as const;

export const ALLOWED_EXTERNAL_PROTOCOLS = new Set(["https:", "http:"]);
