import { chmodSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { app } from "electron";
import { PLATFORM_STOCKFISH_RELATIVE_PATHS, POSIX_EXECUTABLE_MODE } from "../constants/stockfishConstants";

interface StockfishBinaryResolution {
  isAvailable: boolean;
  binaryPath: string;
  platform: NodeJS.Platform;
  errorMessage?: string;
}

export function resolveStockfishBinary(targetPlatform: NodeJS.Platform = process.platform): StockfishBinaryResolution {
  const relativeBinaryPath = PLATFORM_STOCKFISH_RELATIVE_PATHS[targetPlatform];

  if (!relativeBinaryPath) {
    return {
      isAvailable: false,
      binaryPath: "",
      platform: targetPlatform,
      errorMessage: `Plataforma não suportada para o Stockfish local: ${targetPlatform}`,
    };
  }

  const candidateRoots = getCandidateBaseDirectories();

  for (const rootDir of candidateRoots) {
    const candidatePath = resolve(rootDir, relativeBinaryPath);
    if (!existsSync(candidatePath)) {
      continue;
    }

    ensureExecutablePermissionOnPosix(candidatePath, targetPlatform);

    return {
      isAvailable: true,
      binaryPath: candidatePath,
      platform: targetPlatform,
    };
  }

  const fallbackPath = resolve(process.cwd(), relativeBinaryPath);
  return {
    isAvailable: false,
    binaryPath: fallbackPath,
    platform: targetPlatform,
    errorMessage: `Binário do Stockfish não encontrado em: ${fallbackPath}`,
  };
}

function getCandidateBaseDirectories(): string[] {
  const directories = new Set<string>([process.cwd()]);

  try {
    if (typeof app?.getAppPath === "function") {
      const appPath = app.getAppPath();
      directories.add(appPath);
      directories.add(resolve(appPath, ".."));
      directories.add(resolve(appPath, "../.."));
    }
  } catch {}

  const hasCustomResourcesPath = typeof process.resourcesPath === "string" && process.resourcesPath.length > 0;
  if (hasCustomResourcesPath) {
    directories.add(process.resourcesPath);
  }

  return Array.from(directories);
}

function ensureExecutablePermissionOnPosix(binaryPath: string, platform: NodeJS.Platform): void {
  const isPosixPlatform = platform === "linux" || platform === "darwin";
  if (!isPosixPlatform) {
    return;
  }

  try {
    chmodSync(binaryPath, POSIX_EXECUTABLE_MODE);
  } catch {}
}
