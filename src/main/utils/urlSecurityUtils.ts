import { ALLOWED_EXTERNAL_PROTOCOLS } from "../constants/mainWindowConstants";

export function isSafeHttpUrl(rawUrl: string): boolean {
  try {
    const parsedUrl = new URL(rawUrl);
    return ALLOWED_EXTERNAL_PROTOCOLS.has(parsedUrl.protocol);
  } catch {
    return false;
  }
}

export function isAllowedInternalNavigation(targetUrl: string): boolean {
  const devServerUrl = process.env.ELECTRON_RENDERER_URL;
  const isDevServerNavigation = Boolean(devServerUrl && targetUrl.startsWith(devServerUrl));
  if (isDevServerNavigation) {
    return true;
  }

  return isInternalProductionFileNavigation(targetUrl);
}

function isInternalProductionFileNavigation(targetUrl: string): boolean {
  try {
    const parsedUrl = new URL(targetUrl);
    const isFileProtocol = parsedUrl.protocol === "file:";
    const isRendererEntryPoint =
      parsedUrl.pathname.endsWith("/renderer/index.html") || parsedUrl.pathname.endsWith("/index.html");

    return isFileProtocol && isRendererEntryPoint;
  } catch {
    return false;
  }
}
