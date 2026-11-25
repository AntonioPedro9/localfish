import { join } from "node:path";
import { app, BrowserWindow, shell } from "electron";
import { MAIN_WINDOW_CONFIG } from "./constants/mainWindowConstants";
import { registerIpcHandlers } from "./ipc/registerIpcHandlers";
import { StockfishEngineService } from "./services/stockfishEngineService";
import { isAllowedInternalNavigation, isSafeHttpUrl } from "./utils/urlSecurityUtils";

let mainWindow: BrowserWindow | null = null;
const stockfishEngineService = new StockfishEngineService();

app.whenReady().then(() => {
  registerIpcHandlers(stockfishEngineService, getActiveMainWindow);
  mainWindow = createMainWindow();

  app.on("activate", () => {
    if (shouldRecreateMainWindow()) {
      mainWindow = createMainWindow();
    }
  });
});

app.on("before-quit", () => {
  stockfishEngineService.dispose();
});

app.on("window-all-closed", () => {
  stockfishEngineService.dispose();
  if (shouldQuitOnAllWindowsClosed()) {
    app.quit();
  }
});

process.on("SIGINT", () => {
  stockfishEngineService.dispose();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stockfishEngineService.dispose();
  process.exit(0);
});

process.on("exit", () => {
  stockfishEngineService.dispose();
});

function getActiveMainWindow(): BrowserWindow | null {
  const hasUsableWindow = mainWindow !== null && !mainWindow.isDestroyed();
  return hasUsableWindow ? mainWindow : null;
}

function shouldRecreateMainWindow(): boolean {
  return BrowserWindow.getAllWindows().length === 0;
}

function shouldQuitOnAllWindowsClosed(): boolean {
  return process.platform !== "darwin";
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    ...MAIN_WINDOW_CONFIG,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once("ready-to-show", () => {
    window.show();
  });

  window.on("closed", () => {
    if (mainWindow === window) {
      mainWindow = null;
    }
  });

  configureWindowNavigationSecurity(window);
  loadRendererEntry(window);

  return window;
}

function configureWindowNavigationSecurity(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler((details) => {
    openExternalUrlSafely(details.url);
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, targetUrl) => {
    if (isAllowedInternalNavigation(targetUrl)) {
      return;
    }
    event.preventDefault();
    openExternalUrlSafely(targetUrl);
  });
}

function openExternalUrlSafely(rawUrl: string): void {
  if (!isSafeHttpUrl(rawUrl)) {
    return;
  }
  void shell.openExternal(rawUrl);
}

function loadRendererEntry(window: BrowserWindow): void {
  const devServerUrl = process.env.ELECTRON_RENDERER_URL;
  if (devServerUrl) {
    void window.loadURL(devServerUrl);
    return;
  }

  void window.loadFile(join(__dirname, "../renderer/index.html"));
}
