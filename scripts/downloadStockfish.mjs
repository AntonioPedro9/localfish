import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const STOCKFISH_DIR = path.resolve(PROJECT_ROOT, "stockfish");
const VERSION_RECORD_FILE = path.resolve(STOCKFISH_DIR, ".stockfish-version.json");

const TARGET_PLATFORMS = [
  {
    key: "linux",
    label: "Linux (x86_64)",
    assetPattern: /^stockfish-linux-x86-64-universal\.tar\.gz$/,
    archiveType: "tar.gz",
    relativeDir: "stockfish-linux-x86-64-universal",
    executableSubpath: "stockfish/stockfish-linux-x86-64-universal",
    isExecutable: true,
  },
  {
    key: "darwin",
    label: "macOS (Universal)",
    assetPattern: /^stockfish-macos-universal\.tar\.gz$/,
    archiveType: "tar.gz",
    relativeDir: "stockfish-macos-universal",
    executableSubpath: "stockfish/stockfish-macos-universal",
    isExecutable: true,
  },
  {
    key: "win32",
    label: "Windows (x86_64)",
    assetPattern: /^stockfish-windows-x86-64-universal\.zip$/,
    archiveType: "zip",
    relativeDir: "stockfish-windows-x86-64-universal",
    executableSubpath: "stockfish/stockfish-windows-x86-64-universal.exe",
    isExecutable: false,
  },
];

async function main() {
  const args = process.argv.slice(2);
  const isForce = args.includes("--force");
  const platformArg = extractArg(args, "--platform");

  const requestedPlatforms = resolveRequestedPlatforms(platformArg);

  console.log("🎣 [Localfish] Buscando release mais recente do Stockfish no GitHub...");
  const release = await fetchLatestStockfishRelease();
  console.log(`📦 Versão encontrada: ${release.tagName} (${release.name})\n`);

  const currentRecords = readExistingVersionRecords();

  for (const platform of requestedPlatforms) {
    const targetDir = path.resolve(STOCKFISH_DIR, platform.relativeDir);
    const finalExecutablePath = path.resolve(targetDir, platform.executableSubpath);

    const alreadyInstalled =
      !isForce && fs.existsSync(finalExecutablePath) && currentRecords[platform.key]?.version === release.tagName;

    if (alreadyInstalled) {
      console.log(`✅ [${platform.label}] Já instalado e atualizado na versão ${release.tagName}. (Pulei)`);
      continue;
    }

    const asset = release.assets.find((a) => platform.assetPattern.test(a.name));
    if (!asset) {
      console.warn(`⚠️ [${platform.label}] Asset correspondente não encontrado na release.`);
      continue;
    }

    await downloadAndExtractPlatform({
      platform,
      asset,
      targetDir,
      finalExecutablePath,
      releaseTagName: release.tagName,
    });

    currentRecords[platform.key] = {
      version: release.tagName,
      asset: asset.name,
      downloadedAt: new Date().toISOString(),
    };
  }

  saveVersionRecords(currentRecords);
  cleanUnusedSourceDirectories();
  console.log("\n🎉 Processo de download do Stockfish concluído com sucesso!");
}

async function fetchLatestStockfishRelease() {
  const apiUrl = "https://api.github.com/repos/official-stockfish/Stockfish/releases/latest";
  const response = await fetch(apiUrl, {
    headers: {
      "User-Agent": "localfish-downloader",
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error(`Erro ao consultar GitHub API: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return {
    tagName: data.tag_name,
    name: data.name,
    assets: data.assets.map((asset) => ({
      name: asset.name,
      downloadUrl: asset.browser_download_url,
      size: asset.size,
    })),
  };
}

async function downloadAndExtractPlatform({ platform, asset, targetDir, finalExecutablePath, releaseTagName }) {
  console.log(`⬇️ [${platform.label}] Baixando ${asset.name} (${(asset.size / (1024 * 1024)).toFixed(1)} MB)...`);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "stockfish-dl-"));
  const tempArchive = path.join(tempDir, asset.name);

  try {
    const downloadRes = await fetch(asset.downloadUrl);
    if (!downloadRes.ok) {
      throw new Error(`Falha ao baixar asset: ${downloadRes.status} ${downloadRes.statusText}`);
    }

    const buffer = Buffer.from(await downloadRes.arrayBuffer());
    fs.writeFileSync(tempArchive, buffer);

    console.log(`📦 [${platform.label}] Extraindo binário...`);
    fs.mkdirSync(targetDir, { recursive: true });

    extractArchive(tempArchive, targetDir, platform.archiveType);

    if (platform.isExecutable && fs.existsSync(finalExecutablePath)) {
      fs.chmodSync(finalExecutablePath, 0o755);
    }

    console.log(`✨ [${platform.label}] Instalado com sucesso: ${path.relative(PROJECT_ROOT, finalExecutablePath)}`);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function extractArchive(archivePath, targetDir, archiveType) {
  if (archiveType === "tar.gz") {
    execSync(`tar -xzf "${archivePath}" -C "${targetDir}"`, { stdio: "pipe" });
  } else if (archiveType === "zip") {
    if (process.platform === "win32") {
      execSync(`tar -xf "${archivePath}" -C "${targetDir}"`, { stdio: "pipe" });
    } else {
      execSync(`unzip -o -q "${archivePath}" -d "${targetDir}"`, { stdio: "pipe" });
    }
  }
}

function resolveRequestedPlatforms(platformArg) {
  if (!platformArg || platformArg === "all") {
    return TARGET_PLATFORMS;
  }

  if (platformArg === "current") {
    const currentPlatform = process.platform;
    const match = TARGET_PLATFORMS.find((p) => p.key === currentPlatform);
    if (!match) {
      throw new Error(`Plataforma atual (${currentPlatform}) não suportada.`);
    }
    return [match];
  }

  const match = TARGET_PLATFORMS.find((p) => p.key === platformArg);
  if (!match) {
    throw new Error(`Plataforma informada (${platformArg}) inválida. Opções: all, current, linux, darwin, win32.`);
  }
  return [match];
}

function extractArg(args, flagName) {
  const directIndex = args.indexOf(flagName);
  if (directIndex !== -1 && args[directIndex + 1]) {
    return args[directIndex + 1];
  }

  const prefixMatch = args.find((a) => a.startsWith(`${flagName}=`));
  if (prefixMatch) {
    return prefixMatch.split("=")[1];
  }

  return null;
}

function readExistingVersionRecords() {
  try {
    if (fs.existsSync(VERSION_RECORD_FILE)) {
      return JSON.parse(fs.readFileSync(VERSION_RECORD_FILE, "utf-8"));
    }
  } catch {}
  return {};
}

function saveVersionRecords(records) {
  fs.mkdirSync(STOCKFISH_DIR, { recursive: true });
  fs.writeFileSync(VERSION_RECORD_FILE, JSON.stringify(records, null, 2), "utf-8");
}

function cleanUnusedSourceDirectories() {
  const subDirsToClean = ["src", "wiki", "scripts"];
  for (const platform of TARGET_PLATFORMS) {
    const platformBase = path.resolve(STOCKFISH_DIR, platform.relativeDir, "stockfish");
    for (const sub of subDirsToClean) {
      const fullPath = path.resolve(platformBase, sub);
      if (fs.existsSync(fullPath)) {
        try {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } catch {}
      }
    }
  }
}

main().catch((err) => {
  console.error("❌ Erro durante o download do Stockfish:", err.message);
  process.exit(1);
});
